/**
 * DOM selection and UTF-16 position conversion utilities
 *
 * Converts between DOM selections (node + offset) and absolute UTF-16 character positions.
 * Critical for inline editing where we need to track cursor positions in contenteditable elements.
 *
 * UTF-16 positions match JavaScript string indices (.length, .substring, etc.)
 */

/**
 * Get absolute UTF-16 character position of a node+offset within container
 *
 * Walks the DOM tree counting text content until reaching the target node,
 * then adds the offset to get the absolute position from container start.
 *
 * @param container - Container element to calculate position within
 * @param node - Target node (usually a Text node)
 * @param offset - Character offset within the target node
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
  offset: number
): number {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let position = 0;
  let currentNode: Node | null;

  while ((currentNode = walker.nextNode())) {
    if (currentNode === node) {
      return position + offset;
    }

    const textContent = currentNode.textContent || '';
    position += textContent.length;
  }

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
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!container.contains(range.commonAncestorContainer)) {
    return null;
  }

  const start = getAbsolutePosition(
    container,
    range.startContainer,
    range.startOffset
  );

  const end = getAbsolutePosition(
    container,
    range.endContainer,
    range.endOffset
  );

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
