/**
 * DOM selection and UTF-16 position conversion utilities
 *
 * Converts between DOM selections (node + offset) and absolute UTF-16 character positions.
 * Critical for inline editing where we need to track cursor positions in contenteditable elements.
 *
 * UTF-16 positions match JavaScript string indices (.length, .substring, etc.)
 */

/**
 * Helper to get the first text node within a node
 */
function getFirstTextNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return node;
  }

  for (let i = 0; i < node.childNodes.length; i++) {
    const result = getFirstTextNode(node.childNodes[i]);
    if (result) return result;
  }

  return null;
}

/**
 * Helper to get the last text node within a node
 */
function getLastTextNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return node;
  }

  for (let i = node.childNodes.length - 1; i >= 0; i--) {
    const result = getLastTextNode(node.childNodes[i]);
    if (result) return result;
  }

  return null;
}

/**
 * Get absolute UTF-16 character position of a node+offset within container
 *
 * Walks the DOM tree counting text content until reaching the target node,
 * then adds the offset to get the absolute position from container start.
 *
 * @param container - Container element to calculate position within
 * @param node - Target node (usually a Text node)
 * @param offset - Character offset within the target node
 * @param isEnd - Whether this is the end position of a selection range (affects ELEMENT node handling)
 * @returns Absolute UTF-16 character position from container start
 *
 * @example
 * const container = document.getElementById('editor');
 * const selection = window.getSelection();
 * const range = selection.getRangeAt(0);
 * const pos = getAbsolutePosition(container, range.startContainer, range.startOffset);
 */
export function getAbsolutePosition(
  container: HTMLElement,
  node: Node,
  offset: number,
  isEnd: boolean = false
): number {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let position = 0;
  let currentNode: Node | null;
  let nodeCount = 0;

  while ((currentNode = walker.nextNode())) {
    nodeCount++;
    if (currentNode === node) {
      const result = position + offset;
      console.log('[getAbsolutePosition] Found node:', {
        nodeName: node.nodeName,
        nodeType: node.nodeType,
        textContent: node.textContent?.substring(0, 50) + '...',
        offset,
        positionBeforeNode: position,
        finalPosition: result,
        nodeIndex: nodeCount,
      });
      return result;
    }

    const textContent = currentNode.textContent || '';
    position += textContent.length;
  }

  // Node not found - this is the BUG!
  // When node is not found, we return the document end position
  // This causes triple-click selections to appear collapsed at the end

  // Special case: If the node is an Element node (not Text), this can happen with triple-click
  // In this case, the offset is the child index, not a character offset
  if (node.nodeType === Node.ELEMENT_NODE) {
    console.warn('[getAbsolutePosition] Node is ELEMENT, not TEXT - handling element selection', {
      nodeName: node.nodeName,
      nodeType: node.nodeType,
      offset,
      childCount: node.childNodes.length,
      isEnd,
      isContainer: node === container,
      parentNode: node.parentNode?.nodeName,
      textWalkerReachedPosition: position,
    });

    // For element nodes, offset represents the child index
    // offset = 0 means "before the first child"
    // offset = childNodes.length means "after the last child"

    // For element nodes, offset represents position BETWEEN children:
    // - offset 0: before child[0] (start of element)
    // - offset N: after child[N-1], before child[N]
    // - offset childNodes.length: after last child (end of element)

    if (offset === 0) {
      // Before first child = start of element
      // CRITICAL: When endContainer is an element at offset 0, we need to find
      // the position RIGHT BEFORE this element starts, which might include
      // whitespace text nodes between elements!

      // Log the element's previous sibling to understand structure
      if (node.previousSibling) {
        console.log('[getAbsolutePosition] Element has previous sibling:', {
          siblingType: node.previousSibling.nodeType,
          siblingName: node.previousSibling.nodeName,
          siblingContent: node.previousSibling.textContent?.substring(0, 50),
          siblingLength: node.previousSibling.textContent?.length,
        });

        // When endContainer is an element at offset 0, the selection ends
        // RIGHT BEFORE this element starts, which means AFTER the previous sibling ends!
        if (isEnd) {
          if (node.previousSibling.nodeType === Node.TEXT_NODE) {
            // Previous sibling is text (like whitespace) - use its END
            const prevTextLength = node.previousSibling.textContent?.length || 0;
            console.log('[getAbsolutePosition] Using END of previous text sibling');
            const result = getAbsolutePosition(container, node.previousSibling, prevTextLength, isEnd);
            console.log('[getAbsolutePosition] Result from previous sibling end:', result);
            return result;
          } else {
            // Previous sibling is an element (like a paragraph DIV) - use its last text node's END
            const lastTextNode = getLastTextNode(node.previousSibling);
            console.log('[getAbsolutePosition] Searched for last text node in previous element:', {
              found: !!lastTextNode,
              textContent: lastTextNode?.textContent?.substring(0, 50),
              textLength: lastTextNode?.textContent?.length,
            });
            if (lastTextNode) {
              const textLength = lastTextNode.textContent?.length || 0;
              console.log('[getAbsolutePosition] Using END of previous element sibling');
              const result = getAbsolutePosition(container, lastTextNode, textLength, isEnd);
              console.log('[getAbsolutePosition] Result from previous element sibling end:', result);
              return result;
            } else {
              console.warn('[getAbsolutePosition] Previous sibling element has no text nodes - might be empty wrapper');

              // The previous sibling might be an empty wrapper.
              // Walk through the parent's children to find the node that comes
              // right before the current node, skipping empty wrappers.
              // This handles: ...text/element... [optional whitespace] [empty wrapper] [current node]

              const parentNode = node.parentNode;
              if (parentNode) {
                // Find current node's index in parent's children
                const siblings = Array.from(parentNode.childNodes);
                const currentIndex = siblings.indexOf(node as ChildNode);

                console.log('[getAbsolutePosition] Looking for last text before current node:', {
                  currentIndex,
                  totalSiblings: siblings.length,
                });

                // Walk backwards from current node to find last text content
                // IMPORTANT: We need to find the ABSOLUTE last position before the current node,
                // which might be a text node (newline) between elements!
                for (let i = currentIndex - 1; i >= 0; i--) {
                  const sibling = siblings[i];
                  const isTextNode = sibling.nodeType === Node.TEXT_NODE;
                  const isElementNode = sibling.nodeType === Node.ELEMENT_NODE;

                  console.log(`[getAbsolutePosition] Checking sibling ${i}:`, {
                    nodeType: sibling.nodeType,
                    nodeName: sibling.nodeName,
                    textContent: isTextNode ? JSON.stringify(sibling.textContent) : sibling.textContent?.substring(0, 50),
                    textLength: sibling.textContent?.length,
                    hasContent: !!sibling.textContent && sibling.textContent.length > 0,
                  });

                  if (isTextNode) {
                    // Even if it's just whitespace, it counts!
                    if (sibling.textContent && sibling.textContent.length > 0) {
                      console.log('[getAbsolutePosition] Found text node (including whitespace) before current node');
                      const textLength = sibling.textContent.length;
                      const result = getAbsolutePosition(container, sibling, textLength, isEnd);
                      console.log('[getAbsolutePosition] Using END of text sibling:', result);
                      return result;
                    }
                  } else if (isElementNode) {
                    // CRITICAL FIX: Don't use getLastTextNode() because it finds the last node in tree order,
                    // which might not be the highest position (e.g., a standalone period after a link).
                    // Instead, we need to find the HIGHEST position within this element.
                    // Since we don't have easy access to that, use the element's total textContent length
                    // and calculate from the element's start position.

                    const elementTextLength = sibling.textContent?.length || 0;
                    if (elementTextLength > 0) {
                      // Find the first text node of this element to get its start position
                      const firstText = getFirstTextNode(sibling);
                      if (firstText) {
                        const startPos = getAbsolutePosition(container, firstText, 0, false);
                        const endPos = startPos + elementTextLength;
                        console.log('[getAbsolutePosition] Found element - calculating end from start + length:', {
                          elementStart: startPos,
                          elementLength: elementTextLength,
                          elementEnd: endPos,
                        });
                        return endPos;
                      }
                    }
                    console.log('[getAbsolutePosition] Element sibling is empty, continuing...');
                  }
                }
              }
            }
          }
        }
      }

      const firstTextNode = getFirstTextNode(node);
      if (firstTextNode) {
        console.log('[getAbsolutePosition] Offset 0 in element - using first text node', {
          elementNode: node.nodeName,
          firstTextNodeContent: firstTextNode.textContent?.substring(0, 50),
          textWalkerPosition: position,
        });
        const result = getAbsolutePosition(container, firstTextNode, 0, isEnd);
        console.log('[getAbsolutePosition] Result from first text node:', result);
        return result;
      }
    } else if (offset === node.childNodes.length) {
      // After last child = end of element
      const lastTextNode = getLastTextNode(node);
      if (lastTextNode) {
        const textLength = lastTextNode.textContent?.length || 0;
        console.log('[getAbsolutePosition] Offset at end of element - using last text node');
        return getAbsolutePosition(container, lastTextNode, textLength, isEnd);
      }
    } else if (offset > 0 && offset < node.childNodes.length) {
      // Between children - use END of previous child
      const prevChild = node.childNodes[offset - 1];
      if (prevChild) {
        if (prevChild.nodeType === Node.TEXT_NODE) {
          const textLength = prevChild.textContent?.length || 0;
          console.log('[getAbsolutePosition] Offset between children - using END of previous text node');
          return getAbsolutePosition(container, prevChild, textLength, isEnd);
        } else {
          // Previous child is element - get its last text node
          const lastTextNode = getLastTextNode(prevChild);
          if (lastTextNode) {
            const textLength = lastTextNode.textContent?.length || 0;
            console.log('[getAbsolutePosition] Offset between children - using END of previous element');
            return getAbsolutePosition(container, lastTextNode, textLength, isEnd);
          }
        }
      }
    }
  }

  console.error('[getAbsolutePosition] BUG: Node not found in tree walk!', {
    targetNode: {
      nodeName: node.nodeName,
      nodeType: node.nodeType,
      textContent: node.textContent?.substring(0, 100),
      parentNode: node.parentNode?.nodeName,
      parentElement: (node.parentNode as Element)?.id || (node.parentNode as Element)?.className,
    },
    offset,
    finalPosition: position,
    containerTextLength: container.textContent?.length,
    totalNodesWalked: nodeCount,
    containerInfo: {
      id: container.id,
      className: container.className,
      isContained: container.contains(node),
    }
  });

  // Return the end position as fallback (this is the bug causing zero-width selections)
  return position;
}

/**
 * Find text node and offset at absolute UTF-16 position
 *
 * Walks the DOM tree counting text content until we reach the target position.
 * Returns the text node containing that position and the offset within it.
 *
 * @param container - Container element to search within
 * @param position - Absolute UTF-16 character position from container start
 * @returns Object with node and offset, or null if position not found
 *
 * @example
 * const container = document.getElementById('editor');
 * const location = findNodeAtPosition(container, 42);
 * if (location) {
 *   const range = document.createRange();
 *   range.setStart(location.node, location.offset);
 * }
 */
function findNodeAtPosition(
  container: HTMLElement,
  position: number
): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentPos = 0;
  let node: Node | null;
  let lastNode: Node | null = null;

  while ((node = walker.nextNode())) {
    lastNode = node;
    const textContent = node.textContent || '';
    const nodeLength = textContent.length;

    if (currentPos + nodeLength >= position) {
      return {
        node,
        offset: position - currentPos
      };
    }

    currentPos += nodeLength;
  }

  if (lastNode) {
    return {
      node: lastNode,
      offset: (lastNode.textContent || '').length
    };
  }

  return null;
}

/**
 * Get current selection as UTF-16 positions within container
 *
 * Converts the browser's DOM selection to absolute UTF-16 character positions.
 * Returns null if there's no selection or if selection is outside container.
 *
 * @param container - Container element to calculate positions within
 * @returns Object with start and end positions, or null if no valid selection
 *
 * @example
 * const container = document.getElementById('editor');
 * const range = getSelectionRange(container);
 * if (range) {
 *   console.log(`Selected characters ${range.start} to ${range.end}`);
 *   const text = container.textContent.substring(range.start, range.end);
 * }
 */
export function getSelectionRange(
  container: HTMLElement
): { start: number; end: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    console.log('[getSelectionRange] No selection or no ranges');
    return null;
  }

  const range = selection.getRangeAt(0);

  // Log raw browser selection details
  console.log('[getSelectionRange] Raw browser selection:', {
    selectionString: selection.toString(),
    selectionLength: selection.toString().length,
    rangeCount: selection.rangeCount,
    isCollapsed: selection.isCollapsed,
    startContainer: range.startContainer.nodeName,
    startOffset: range.startOffset,
    endContainer: range.endContainer.nodeName,
    endOffset: range.endOffset,
    commonAncestor: range.commonAncestorContainer.nodeName,
  });

  if (!container.contains(range.commonAncestorContainer)) {
    console.log('[getSelectionRange] Selection is outside container');
    return null;
  }

  const containerTextLength = container.textContent?.length || 0;
  console.log('[getSelectionRange] Container text length:', containerTextLength);

  const start = getAbsolutePosition(
    container,
    range.startContainer,
    range.startOffset,
    false  // isEnd = false for start position
  );

  const end = getAbsolutePosition(
    container,
    range.endContainer,
    range.endOffset,
    true  // isEnd = true for end position
  );

  console.log('[getSelectionRange] Calculated positions:', {
    start,
    end,
    length: end - start,
    containerTextLength,
    isCollapsed: start === end,
  });

  // Check if positions look suspicious
  if (start === end && selection.toString().length > 0) {
    console.warn('[getSelectionRange] WARNING: Selection has text but start === end!', {
      selectionText: selection.toString(),
      selectionLength: selection.toString().length,
    });
  }

  if (start === containerTextLength && end === containerTextLength) {
    console.warn('[getSelectionRange] WARNING: Both positions at document end!', {
      containerTextLength,
      selectionText: selection.toString(),
    });
  }

  return { start, end };
}

/**
 * Set selection to UTF-16 positions within container
 *
 * Creates a DOM selection spanning the specified UTF-16 character positions.
 * Useful for restoring selection after text modifications.
 *
 * @param container - Container element to set selection within
 * @param start - Start position (inclusive) in UTF-16 code units
 * @param end - End position (exclusive) in UTF-16 code units
 *
 * @example
 * const container = document.getElementById('editor');
 * setSelectionRange(container, 10, 20);
 */
export function setSelectionRange(
  container: HTMLElement,
  start: number,
  end: number
): void {
  const startLoc = findNodeAtPosition(container, start);
  const endLoc = findNodeAtPosition(container, end);

  if (!startLoc || !endLoc) return;

  const range = document.createRange();
  range.setStart(startLoc.node, startLoc.offset);
  range.setEnd(endLoc.node, endLoc.offset);

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Get plain text content from element
 *
 * Extracts text content from an HTML element, preserving whitespace and line breaks.
 * Handles contenteditable HTML by returning the plain text representation.
 *
 * @param element - Element to extract text from
 * @returns Plain text content as a string
 *
 * @example
 * const editor = document.getElementById('editor');
 * const text = getTextContent(editor);
 * console.log(`Editor contains ${text.length} UTF-16 code units`);
 */
export function getTextContent(element: HTMLElement): string {
  return element.textContent || '';
}

/**
 * Extract text from DOM at specified positions
 *
 * CRITICAL: Use this for text extraction when you have DOM-space positions.
 * DO NOT use content.substring() with DOM positions - that will extract wrong text!
 *
 * With the paragraph-based rendering structure:
 * - DOM positions are in textContent space (NO markdown syntax, NO \n\n separators)
 * - cleanedContent has markdown syntax ([text](url)) and \n\n separators
 * - Using DOM positions on cleanedContent extracts WRONG text with markdown leakage
 *
 * @param start - Start position in DOM space (from getSelectionRange)
 * @param end - End position in DOM space (from getSelectionRange)
 * @param containerId - ID of container element (default: 'article-content')
 * @returns Extracted text from DOM, or empty string if extraction fails
 *
 * @example
 * // ✅ CORRECT - Extract text from DOM with DOM positions
 * const range = getSelectionRange(container);
 * const text = extractTextFromDOM(range.start, range.end);
 *
 * @example
 * // ❌ WRONG - Using markdown content with DOM positions
 * const range = getSelectionRange(container);
 * const text = cleanedContent.substring(range.start, range.end);  // Contains markdown!
 */
export function extractTextFromDOM(
  start: number,
  end: number,
  containerId: string = 'article-content'
): string {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[extractTextFromDOM] Container #${containerId} not found`);
    return '';
  }

  const domText = container.textContent || '';

  if (start < 0 || end > domText.length || start > end) {
    console.error(`[extractTextFromDOM] Invalid range: start=${start}, end=${end}, textLength=${domText.length}`);
    return '';
  }

  return domText.substring(start, end);
}
