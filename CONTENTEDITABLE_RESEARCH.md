# ContentEditable UTF-16 Position Tracking: Technical Research Analysis

**Date:** 2025-10-17
**Context:** Inline text editor for spaced repetition app with preserved text selection markers

---

## Executive Summary

Implementing contenteditable-based inline editing with UTF-16 position tracking is **technically feasible but complex**. The primary challenges stem from:

1. Browser inconsistencies in DOM manipulation and text representation
2. UTF-16 surrogate pairs (emoji) requiring special handling
3. Multiple text nodes and dynamic DOM structure
4. Cross-browser compatibility issues

**Recommendation:** Consider a hybrid approach using a transparent overlay for highlights while keeping contenteditable for plain text editing, or evaluate existing editor frameworks (ProseMirror/Lexical) if complexity warrants it.

---

## 1. ContentEditable Cursor Position Tracking

### Challenge Overview
Getting cursor position in UTF-16 code units requires navigating the DOM Range API, which operates on text nodes with varying offsets.

### Core APIs

**window.getSelection() + Range API**
```javascript
// Get current cursor position
const selection = window.getSelection();
const range = selection.getRangeAt(0);
const offset = range.startOffset; // Offset within current node
```

**Key Concept:** When the container is a CharacterData node (Text, Comment), the offset represents 16-bit units of the UTF-16 encoded string. This is critical for surrogate pair handling.

### Getting Character Offset from Start

The standard approach involves creating a range from the start of the contenteditable to the cursor:

```javascript
function getCaretCharacterOffset(element) {
  let caretOffset = 0;
  const doc = element.ownerDocument || element.document;
  const win = doc.defaultView || doc.parentWindow;
  const sel = win.getSelection();

  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    caretOffset = preCaretRange.toString().length;
  }

  return caretOffset;
}
```

**Important:** `toString()` on a Range returns text but may not handle newlines correctly in all browsers.

### Setting Cursor Position

```javascript
function setCaretPosition(element, offset) {
  const range = document.createRange();
  const sel = window.getSelection();

  // Find the text node and offset
  const {node, nodeOffset} = findNodeAtOffset(element, offset);

  range.setStart(node, nodeOffset);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function findNodeAtOffset(element, targetOffset) {
  let currentOffset = 0;

  function traverse(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent.length;
      if (currentOffset + length >= targetOffset) {
        return {
          node: node,
          nodeOffset: targetOffset - currentOffset
        };
      }
      currentOffset += length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === 'BR') {
        currentOffset += 1; // BR counts as 1 character
        if (currentOffset > targetOffset) {
          return {node: node.parentNode, nodeOffset: 0};
        }
      }
      for (let child of node.childNodes) {
        const result = traverse(child);
        if (result) return result;
      }
    }
    return null;
  }

  return traverse(element) || {node: element, nodeOffset: 0};
}
```

### Browser Quirks
- **Chrome/Safari:** May split long text nodes automatically during editing
- **Firefox:** Different behavior with text node splitting
- **All browsers:** Range boundaries become invalid when nodes are removed/modified

---

## 2. UTF-16 Boundary Preservation

### The Surrogate Pair Problem

JavaScript strings use UTF-16 encoding. Characters with code points above U+FFFF (including most emoji) require **surrogate pairs** - two 16-bit units:

- **High surrogate:** U+D800 to U+DBFF
- **Low surrogate:** U+DC00 to U+DFFF

```javascript
"👋".length // Returns 2, not 1!
"abc😀".split('') // ["a", "b", "c", "�", "�"] - broken emoji
```

### Detection and Safe Handling

```javascript
function isHighSurrogate(charCode) {
  return charCode >= 0xD800 && charCode <= 0xDBFF;
}

function isLowSurrogate(charCode) {
  return charCode >= 0xDC00 && charCode <= 0xDFFF;
}

function isSurrogatePair(str, index) {
  return index < str.length - 1 &&
         isHighSurrogate(str.charCodeAt(index)) &&
         isLowSurrogate(str.charCodeAt(index + 1));
}

// Prevent cursor from landing inside surrogate pair
function adjustOffsetForSurrogates(text, offset) {
  if (offset > 0 && offset < text.length) {
    if (isLowSurrogate(text.charCodeAt(offset))) {
      // We're in the middle of a pair, move back
      return offset - 1;
    }
  }
  return offset;
}
```

### Modern ES6+ Solutions

```javascript
// Use codePointAt instead of charCodeAt
const emoji = "👋";
emoji.codePointAt(0); // Returns full code point

// Use String iterator for proper character iteration
for (const char of "Hello 👋 World") {
  console.log(char); // Correctly iterates over emoji as single character
}

// Array.from also respects code points
Array.from("abc👋"); // ["a", "b", "c", "👋"]

// Regex pattern for surrogate pairs
const surrogatePairRegex = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
```

### Browser Cursor Handling

**Good news:** Modern browsers generally handle cursor movement correctly around emoji at the UI level. The issue is when you programmatically set positions.

**Solution:** Always validate offsets before setting cursor position:

```javascript
function safeSetCursor(element, offset) {
  const text = element.textContent;
  const safeOffset = adjustOffsetForSurrogates(text, offset);
  setCaretPosition(element, safeOffset);
}
```

### CJK Character Handling

CJK characters (Chinese, Japanese, Korean) are mostly in the Basic Multilingual Plane (BMP) and don't require surrogate pairs. However, some rare characters do:

```javascript
// Most CJK are single code units
"你好".length // 2 (2 characters, each 1 unit)

// But some rare ones need pairs
"𠮷野家".length // 4 (first character is 2 units)
```

### Known Browser Issues

- **Mobile Safari (iOS):** Historical issues with cursor positioning after emoji. Users couldn't move cursor to the right of emoji or delete it. Mostly resolved in iOS 5+ but edge cases remain.
- **Firefox:** Had bug (1068979) where backspacing over pasted supplementary-plane characters could break surrogate pairs. Largely fixed but worth testing.

---

## 3. Edit Detection

### Event Options Comparison

| Event | Timing | Cancelable | Data Available | Browser Support |
|-------|--------|------------|----------------|-----------------|
| `beforeinput` | Before change | Yes (mostly) | Rich (inputType, data, dataTransfer) | Chrome/Safari/Edge (NOT Firefox) |
| `input` | After change | No | Basic (data, inputType) | All modern browsers |
| `MutationObserver` | After DOM mutation | No | DOM changes | All modern browsers |

### Recommended: beforeinput Event

The `beforeinput` event (part of Input Events Level 2 spec) provides the best information:

```javascript
element.addEventListener('beforeinput', (e) => {
  console.log('Input type:', e.inputType);
  console.log('Data:', e.data);
  console.log('Data transfer:', e.dataTransfer);
  console.log('Target ranges:', e.getTargetRanges());

  // Can prevent the edit
  if (shouldPreventEdit(e)) {
    e.preventDefault();
  }
});
```

### Complete inputType Values

**Text Insertion:**
- `insertText` - Typed plain text
- `insertLineBreak` - Line break
- `insertParagraph` - Paragraph break
- `insertFromPaste` - Paste from clipboard
- `insertFromDrop` - Drag and drop
- `insertReplacementText` - Autocorrect/spell check replacement
- `insertCompositionText` - IME composition (NOT cancelable during composition)

**Text Deletion:**
- `deleteContentBackward` - Backspace
- `deleteContentForward` - Delete key
- `deleteWordBackward` - Ctrl+Backspace
- `deleteWordForward` - Ctrl+Delete
- `deleteSoftLineBackward` - Delete to visual line start
- `deleteSoftLineForward` - Delete to visual line end
- `deleteHardLineBackward` - Delete to block element start
- `deleteHardLineForward` - Delete to block element end
- `deleteByCut` - Cut operation
- `deleteByDrag` - Drag to remove

**Formatting (if not disabled):**
- `formatBold`, `formatItalic`, `formatUnderline`, `formatStrikethrough`
- `formatRemove` - Remove formatting
- Many others...

**History:**
- `historyUndo` - Undo
- `historyRedo` - Redo

### Getting Target Ranges

```javascript
element.addEventListener('beforeinput', (e) => {
  const ranges = e.getTargetRanges();
  if (ranges.length > 0) {
    const range = ranges[0];
    const startOffset = getOffsetFromRange(range.startContainer, range.startOffset);
    const endOffset = getOffsetFromRange(range.endContainer, range.endOffset);

    console.log(`Edit will affect: ${startOffset} to ${endOffset}`);
  }
});
```

### Fallback: input Event + MutationObserver

For Firefox and broader compatibility:

```javascript
let previousText = element.textContent;
let previousCursorPos = getCaretCharacterOffset(element);

element.addEventListener('input', (e) => {
  const newText = element.textContent;
  const newCursorPos = getCaretCharacterOffset(element);

  // Calculate what changed
  const change = calculateDiff(previousText, newText);
  console.log('Changed:', change);

  previousText = newText;
  previousCursorPos = newCursorPos;
});

function calculateDiff(oldText, newText) {
  // Simple diff: find first and last difference
  let start = 0;
  while (start < oldText.length &&
         start < newText.length &&
         oldText[start] === newText[start]) {
    start++;
  }

  let oldEnd = oldText.length;
  let newEnd = newText.length;
  while (oldEnd > start &&
         newEnd > start &&
         oldText[oldEnd - 1] === newText[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }

  return {
    start,
    oldEnd,
    newEnd,
    removed: oldText.slice(start, oldEnd),
    added: newText.slice(start, newEnd)
  };
}
```

### MutationObserver for DOM Changes

```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'characterData') {
      console.log('Text changed in node:', mutation.target);
      console.log('Old value:', mutation.oldValue);
    } else if (mutation.type === 'childList') {
      console.log('Nodes added:', mutation.addedNodes);
      console.log('Nodes removed:', mutation.removedNodes);
    }
  });
});

observer.observe(element, {
  characterData: true,
  characterDataOldValue: true,
  childList: true,
  subtree: true
});
```

**Note:** MutationObserver fires after changes, can't prevent them.

### Handling Paste Operations

Special handling needed for paste, which can insert HTML, newlines, etc:

```javascript
element.addEventListener('paste', (e) => {
  e.preventDefault();

  // Get plain text only
  const text = e.clipboardData.getData('text/plain');

  // Insert at cursor
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
  }
});
```

**Modern approach:** Use `contenteditable="plaintext-only"` to automatically strip formatting:

```html
<div contenteditable="plaintext-only">
  Plain text only - formatting stripped automatically
</div>
```

**Browser support:** Chrome 58+, Safari 11+. Not supported in Firefox.

---

## 4. Text Extraction from ContentEditable

### The textContent vs innerText Dilemma

```javascript
// Given: <div contenteditable>foo<br>bar</div>

element.textContent  // "foobar" - no newline!
element.innerText    // "foo\nbar" - has newline

// Given: <div contenteditable>foo  bar</div> (multiple spaces)

element.textContent  // "foo  bar" - preserves spaces
element.innerText    // "foo bar" - collapses spaces
```

**Key differences:**
- `textContent` is raw text content, includes all whitespace
- `innerText` approximates rendered text, includes newlines for block elements and `<br>`
- `innerText` triggers reflow (slower)

### The BR Tag Problem

```javascript
// How many characters is this?
const el = document.createElement('div');
el.innerHTML = 'Hello<br>World';

el.textContent.length // 10 ("HelloWorld" - BR ignored)
el.innerText.length   // 11 or 12 depending on browser ("Hello\nWorld" or "Hello\r\nWorld")
```

**Solution:** Use `innerText` for position calculations that need to match visual layout, or implement custom traversal.

### Custom Text Extraction with Correct Linebreaks

```javascript
function getPlainText(element) {
  let text = '';
  let isOnFreshLine = true;

  function traverse(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
      isOnFreshLine = false;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName;

      // BR always creates a newline
      if (tagName === 'BR') {
        text += '\n';
        isOnFreshLine = true;
      }
      // Block elements create newlines before (if not fresh) and after
      else if (['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName)) {
        if (!isOnFreshLine && text.length > 0) {
          text += '\n';
        }

        // Process children
        for (const child of node.childNodes) {
          traverse(child);
        }

        if (text.length > 0 && !text.endsWith('\n')) {
          text += '\n';
        }
        isOnFreshLine = true;
        return; // Don't traverse children again
      }

      // Regular inline elements - just traverse children
      for (const child of node.childNodes) {
        traverse(child);
      }
    }
  }

  traverse(element);
  return text;
}
```

### Position Mapping: DOM to UTF-16

```javascript
function getUTF16PositionFromRange(element, range) {
  let position = 0;
  let found = false;

  function traverse(node) {
    if (found) return;

    if (node === range.startContainer) {
      position += range.startOffset;
      found = true;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      position += node.textContent.length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === 'BR') {
        position += 1;
      }

      for (const child of node.childNodes) {
        traverse(child);
        if (found) return;
      }
    }
  }

  traverse(element);
  return position;
}
```

### Whitespace Normalization

Browsers normalize whitespace in contenteditable:
- Multiple spaces may become single space
- Leading/trailing whitespace on lines may be removed
- Tab characters may be converted to spaces

**Solution:** If exact whitespace preservation matters, consider using `white-space: pre-wrap` CSS:

```css
[contenteditable] {
  white-space: pre-wrap;
}
```

---

## 5. Partial Content Editing

### Use Case
Editing a portion of a large text while only making part of it editable.

### Approach 1: Extract Portion to Separate Element

```javascript
function enablePartialEdit(fullText, startPos, endPos) {
  const portion = fullText.substring(startPos, endPos);

  // Create editable element with just this portion
  const editableDiv = document.createElement('div');
  editableDiv.contentEditable = true;
  editableDiv.textContent = portion;

  return {
    element: editableDiv,
    onSave: () => {
      const editedPortion = editableDiv.textContent;
      const newFullText =
        fullText.substring(0, startPos) +
        editedPortion +
        fullText.substring(endPos);
      return newFullText;
    }
  };
}
```

### Approach 2: Make Full Text Editable, Restrict Editing

This is complex and not recommended. Better to extract the portion.

### Calculating Offset of Edited Portion

```javascript
// If editing from position 1000-1500 of a 5000 character text
const offset = 1000;
const editorText = "edited text here";

// Merge back
const newFullText =
  originalText.substring(0, offset) +
  editorText +
  originalText.substring(offset + originalPortionLength);
```

### Challenges

1. **Cursor position doesn't map:** Cursor position 10 in editor is actually position 1010 in full text
2. **Marks outside range:** Need to track marks in non-editable portions separately
3. **UX confusion:** Users may not understand why they can't edit certain parts

**Recommendation:** Only use partial editing if truly necessary. Otherwise, make full text editable.

---

## 6. Mark Position Updates

### The Core Problem

Given:
- Original text with marks at positions 100-150, 500-600, 1000-1200
- User edits text from position 400-800
- How to update mark positions?

### Edit Detection

```javascript
function detectEdit(oldText, newText, cursorPos) {
  const diff = calculateDiff(oldText, newText);

  return {
    start: diff.start,
    oldEnd: diff.oldEnd,
    newEnd: diff.newEnd,
    lengthDelta: diff.newEnd - diff.oldEnd
  };
}

function calculateDiff(oldText, newText) {
  // Find common prefix
  let start = 0;
  const minLength = Math.min(oldText.length, newText.length);
  while (start < minLength && oldText[start] === newText[start]) {
    start++;
  }

  // Find common suffix
  let oldEnd = oldText.length;
  let newEnd = newText.length;
  while (oldEnd > start &&
         newEnd > start &&
         oldText[oldEnd - 1] === newText[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }

  return {start, oldEnd, newEnd};
}
```

### Update Mark Positions

```javascript
function updateMarks(marks, edit) {
  const {start, oldEnd, lengthDelta} = edit;

  return marks.map(mark => {
    // Mark is completely before edit - no change
    if (mark.end <= start) {
      return mark;
    }

    // Mark is completely after edit - shift by delta
    if (mark.start >= oldEnd) {
      return {
        ...mark,
        start: mark.start + lengthDelta,
        end: mark.end + lengthDelta
      };
    }

    // Mark overlaps with edit - handle carefully
    if (mark.start < start && mark.end > oldEnd) {
      // Edit is completely inside mark
      return {
        ...mark,
        end: mark.end + lengthDelta
      };
    }

    if (mark.start >= start && mark.end <= oldEnd) {
      // Mark is completely inside edit - invalidate or adjust
      return {
        ...mark,
        invalid: true // Mark content was edited
      };
    }

    // Partial overlap - need to decide on behavior
    if (mark.start < start && mark.end > start && mark.end <= oldEnd) {
      // Edit cuts off end of mark
      return {
        ...mark,
        end: start // Truncate mark
      };
    }

    if (mark.start >= start && mark.start < oldEnd && mark.end > oldEnd) {
      // Edit cuts off start of mark
      return {
        ...mark,
        start: start + lengthDelta,
        end: mark.end + lengthDelta
      };
    }

    return mark; // Shouldn't reach here
  });
}
```

### Example

```javascript
// Original text: "The quick brown fox jumps"
// Marks: [{start: 4, end: 9, text: "quick"}]
// User inserts "very " before "quick"
// New text: "The very quick brown fox jumps"

const edit = {
  start: 4,
  oldEnd: 4,
  newEnd: 9,
  lengthDelta: 5
};

const updatedMarks = updateMarks(marks, edit);
// Result: [{start: 9, end: 14, text: "quick"}]
```

### Detecting Mark Overlap

```javascript
function doesEditOverlapMark(edit, mark) {
  const {start, oldEnd} = edit;

  // Edit range: [start, oldEnd)
  // Mark range: [mark.start, mark.end)

  return !(mark.end <= start || mark.start >= oldEnd);
}
```

### Policy Decisions

You need to decide:

1. **Invalidate on overlap?** If user edits inside a mark, mark it as invalid/deleted?
2. **Adjust boundaries?** Try to preserve marks by adjusting start/end?
3. **Notify user?** Show warning when editing near marks?

**Recommendation:** Invalidate marks that are substantially edited, preserve marks that are just shifted.

### Showing Mark Highlights in ContentEditable

**Challenge:** Modifying DOM to add `<span>` highlights breaks cursor position and creates editing issues.

**Solution 1: Transparent Overlay (Recommended)**

```html
<div style="position: relative;">
  <!-- Highlight layer -->
  <div id="highlights" style="position: absolute; top: 0; left: 0; pointer-events: none;">
    <!-- Positioned highlight spans -->
  </div>

  <!-- Editable layer -->
  <div contenteditable="true" style="color: rgba(0,0,0,0.9); caret-color: black;">
    Editable text here
  </div>
</div>
```

Update highlights on scroll/resize:

```javascript
function updateHighlights(text, marks) {
  const highlights = document.getElementById('highlights');
  highlights.innerHTML = '';

  marks.forEach(mark => {
    // Calculate pixel positions using Range API
    const range = document.createRange();
    const textNode = findTextNodeAtPosition(text, mark.start);
    range.setStart(textNode, mark.start);
    range.setEnd(textNode, mark.end);

    const rects = range.getClientRects();
    for (const rect of rects) {
      const span = document.createElement('span');
      span.style.position = 'absolute';
      span.style.left = rect.left + 'px';
      span.style.top = rect.top + 'px';
      span.style.width = rect.width + 'px';
      span.style.height = rect.height + 'px';
      span.style.backgroundColor = 'yellow';
      span.style.opacity = '0.3';
      highlights.appendChild(span);
    }
  });
}
```

**Solution 2: CSS Highlight API (Experimental)**

```javascript
// Create highlight
const highlight = new Highlight();
CSS.highlights.set('mark-1', highlight);

// Add range to highlight
const range = document.createRange();
range.setStart(textNode, markStart);
range.setEnd(textNode, markEnd);
highlight.add(range);
```

```css
::highlight(mark-1) {
  background-color: yellow;
  color: black;
}
```

**Browser support:** Chrome 105+, Safari 17.2+. Not in Firefox yet.

---

## 7. Cross-Browser Compatibility

### ContentEditable Support

Basic `contenteditable` is supported in all modern browsers (since ~2013), but implementation details vary significantly.

### Known Browser Quirks

#### Safari/WebKit

**User Selection Issue:**
```css
/* Required for contenteditable to work properly in Safari */
[contenteditable] {
  -webkit-user-select: text;
  user-select: text;
}
```

**WebKit-specific property:**
```css
[contenteditable] {
  -webkit-user-modify: read-write-plaintext-only; /* Plain text only */
}
```

**Focus behavior:** Safari sets focus on clicked elements differently than Chrome.

#### Firefox

**User-select inside contenteditable:** CSS `user-select` instructions work inside contenteditable in Firefox but not in Chrome/Edge/Opera.

**Bug with contenteditable:** If there's a contenteditable element on page, you can select but can't copy content on non-contenteditable elements.

**Paragraph creation:** As of Firefox 60+, Firefox wraps lines in `<div>` like other browsers, but previously used `<br>` tags.

**Empty lines:** Firefox wraps `<br>` in `<div>` for empty lines, which `innerText` interprets as two newlines instead of one.

**Fix:**
```javascript
document.execCommand('defaultParagraphSeparator', false, 'br');
```

#### Mobile Safari (iOS)

**Historical issues (mostly resolved):**
- contenteditable added in iOS 5 beta 2
- iOS 7 had major issues where keyboard appeared but editing didn't work
- Required `-webkit-user-select: text` workaround through iOS 10

**Current status:** Works well in iOS 12+, but still test thoroughly on real devices.

**Keyboard behavior:** Virtual keyboard may cover content, require scrolling adjustment.

#### Mobile Chrome/Android

**IME/Composition:** Asian language input (Chinese, Japanese, Korean) uses composition events. The `insertCompositionText` inputType is NOT cancelable during active composition.

**Touch selection:** Selection handles behave differently than desktop.

### beforeinput Event Support

**Supported:**
- Chrome 60+
- Safari 10.1+
- Edge 79+

**NOT Supported:**
- Firefox (all versions as of 2025)

**Fallback:** Use `input` event + diff calculation for Firefox.

### contenteditable="plaintext-only"

**Supported:**
- Chrome 58+
- Safari 11+

**NOT Supported:**
- Firefox

**Fallback:** Use paste event handler to strip HTML.

### CSS Highlight API

**Supported:**
- Chrome 105+
- Safari 17.2+

**NOT Supported:**
- Firefox

**Fallback:** Use absolute positioned overlay divs.

### Testing Strategy

1. **Desktop Browsers:** Chrome, Firefox, Safari, Edge
2. **Mobile Browsers:** iOS Safari, Chrome Mobile, Samsung Internet
3. **IME Input:** Test with Chinese/Japanese/Korean input methods
4. **Emoji:** Test pasting and typing emoji
5. **Long content:** Test with 10,000+ character texts
6. **Undo/Redo:** Verify browser undo stack works

### Recommended Feature Detection

```javascript
const features = {
  hasBeforeInput: 'onbeforeinput' in document.createElement('div'),
  hasPlaintextOnly: (() => {
    const div = document.createElement('div');
    div.contentEditable = 'plaintext-only';
    return div.contentEditable === 'plaintext-only';
  })(),
  hasCSSHighlight: 'highlights' in CSS,
  hasInputEvent: 'InputEvent' in window
};

console.log('Browser features:', features);
```

---

## 8. Libraries and Tools

### Major Rich Text Editor Frameworks

#### ProseMirror

**Pros:**
- Battle-tested, mature (2015+)
- Best-in-class collaborative editing support
- Strong document model with schema validation
- Excellent MutationObserver logic
- Pure decorations (styling without document modification)
- Well-documented

**Cons:**
- Steep learning curve
- Complex architecture
- May be overkill for plain text

**Best for:** Applications needing collaborative editing or complex document structures.

**Built on ProseMirror:** Tiptap, Remirror, BlockNote

#### Lexical

**Pros:**
- Modern (2022+, from Meta, replacing Draft.js)
- React-friendly
- Good performance
- Mutable state (simpler than immutable)

**Cons:**
- Lacks pure decorations (styling mutates document)
- Collaboration implementation has limitations
- Less mature than ProseMirror
- Steeper learning curve

**Best for:** React apps needing modern editor with good performance.

#### Slate

**Pros:**
- React-centric
- Good plugin architecture
- Customizable

**Cons:**
- Poor CJK (Chinese/Japanese/Korean) and Android support
- No built-in collaboration
- Can be buggy with complex scenarios

**Best for:** React apps with primarily English text, no mobile support needed.

#### Draft.js

**Status:** Abandoned/unmaintained. Do not use for new projects.

### Simpler Alternatives

For plain text editing with highlights, a **custom solution** may be simpler than these frameworks.

#### Lightweight Libraries

**rangy** - Selection and range utilities
- Handles cross-browser range manipulation
- SelectionSaveRestoreModule for position saving
- May be overkill if only handling modern browsers

**dom-seek** - Text traversal for HTML documents
- Helps with UTF-16 position mapping
- Lightweight

### Recommendation

**For your use case (plain text with marks):**

1. **If marks are read-only during editing:** Use transparent overlay approach with vanilla contenteditable
2. **If marks need interaction:** Consider ProseMirror (via Tiptap for easier API)
3. **If React is core tech:** Lexical or custom solution with React

**Don't use a framework unless:**
- You need collaborative editing
- You need complex formatting
- You're building a full rich text editor

---

## 9. Potential Gotchas and Workarounds

### 1. Cursor Jumps to Start After innerHTML Change

**Problem:** Setting `innerHTML` resets cursor to position 0.

**Workaround:**
```javascript
const cursorPos = getCaretCharacterOffset(element);
element.innerHTML = newContent; // This resets cursor
setCaretPosition(element, cursorPos); // Restore cursor
```

**Better:** Don't modify innerHTML during editing. Use beforeinput to prevent unwanted changes instead.

### 2. Browser Inserts Unwanted HTML

**Problem:** Pressing Enter inserts `<div>`, `<p>`, or `<br>` depending on browser.

**Workaround:**
```javascript
element.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.execCommand('insertText', false, '\n');
  }
});
```

Or use `contenteditable="plaintext-only"` where supported.

### 3. Paste Includes Formatting

**Problem:** Pasting from Word/websites includes HTML.

**Workaround:** See "Plain Text Only" section above.

### 4. Undo Stack Breaks

**Problem:** Modifying `innerHTML` or `textContent` clears browser's undo history.

**Workaround:** Never modify content directly. Use `document.execCommand('insertText')` or manual Range manipulation to preserve undo stack.

**Note:** `execCommand` is deprecated but still works. For future-proof code, manipulate Range objects directly:

```javascript
function insertTextAtCursor(text) {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
  }
}
```

### 5. Multiple Text Nodes

**Problem:** Browser splits text into multiple text nodes, making position calculation complex.

**Workaround:** Normalize after edits:
```javascript
element.normalize(); // Merges adjacent text nodes
```

**Caution:** This can break cursor position temporarily.

### 6. Empty Element Becomes Un-editable

**Problem:** If contenteditable element becomes empty, cursor disappears and it's hard to focus.

**Workaround:**
```javascript
function ensureEditable(element) {
  if (element.childNodes.length === 0) {
    element.appendChild(document.createElement('br'));
  }
}
```

### 7. Position Calculation Slow on Large Texts

**Problem:** Traversing DOM for every keystroke is slow with 10,000+ character texts.

**Workaround:**
- Debounce position calculations
- Cache text node positions
- Only recalculate when necessary

```javascript
let positionCache = null;

function getCaretPositionCached(element) {
  if (!positionCache) {
    positionCache = buildPositionCache(element);
  }
  return getCaretPositionFromCache(positionCache);
}

element.addEventListener('input', () => {
  positionCache = null; // Invalidate cache
});
```

### 8. Mobile Keyboard Covers Content

**Problem:** Virtual keyboard obscures contenteditable on mobile.

**Workaround:**
```javascript
element.addEventListener('focus', () => {
  // Scroll element into view above keyboard
  setTimeout(() => {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }, 300); // Wait for keyboard animation
});
```

### 9. IME Composition Issues

**Problem:** Asian language input uses composition, fires multiple events.

**Workaround:**
```javascript
let isComposing = false;

element.addEventListener('compositionstart', () => {
  isComposing = true;
});

element.addEventListener('compositionend', () => {
  isComposing = false;
  // Now safe to process input
  processInput();
});

element.addEventListener('beforeinput', (e) => {
  if (e.inputType === 'insertCompositionText') {
    // Don't process until composition ends
    return;
  }
});
```

### 10. Range Becomes Invalid After DOM Changes

**Problem:** Saved Range objects become invalid when nodes are removed.

**Workaround:** Store positions as character offsets, not Range objects:
```javascript
// Instead of:
const savedRange = selection.getRangeAt(0); // May become invalid

// Use:
const savedPosition = getCaretCharacterOffset(element); // Always valid
```

---

## 10. UTF-16 Specific Considerations

### String Length Mismatch

```javascript
// Visual length vs UTF-16 length
"Hello 👋".length        // 8 (6 chars + 2 for emoji)
Array.from("Hello 👋").length  // 7 (actual character count)
```

**Implication:** Your marks store UTF-16 positions, but users think in characters.

### Emoji Families

Some emoji are even more complex:

```javascript
"👨‍👩‍👧‍👦".length // 11! (family emoji with zero-width joiners)

Array.from("👨‍👩‍👧‍👦") // ["👨", "‍", "👩", "‍", "👧", "‍", "👦"] - still broken
```

**Solution:** Use a proper grapheme cluster library for accurate character counting:

```javascript
// Using Intl.Segmenter (modern browsers)
const segmenter = new Intl.Segmenter('en', {granularity: 'grapheme'});
const segments = Array.from(segmenter.segment("👨‍👩‍👧‍👦"));
segments.length // 1 - correct!
```

**Browser support:** Chrome 87+, Safari 14.1+, Firefox 125+ (2024)

### Mark Position Storage

**Recommendation:** Store marks as UTF-16 positions (JavaScript native) but provide utilities for conversion:

```javascript
// Storage format (UTF-16)
const mark = {
  id: 'mark-1',
  start: 0,      // UTF-16 code units
  end: 10,       // UTF-16 code units
  text: 'Hello 👋' // For reference
};

// Display format
function getVisualLength(text) {
  if ('Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('en', {granularity: 'grapheme'});
    return Array.from(segmenter.segment(text)).length;
  }
  // Fallback: rough approximation
  return Array.from(text).length;
}
```

### Regex Considerations

```javascript
// Incorrect - splits surrogate pairs
"abc👋def".split(/./)  // ["a","b","c","�","�","d","e","f"]

// Correct - uses Unicode flag
"abc👋def".split(/./u) // ["a","b","c","👋","d","e","f"]
```

Always use `/u` flag in regex when dealing with emoji.

### Finding Position of Emoji

```javascript
// Wrong - may land in middle of surrogate pair
const pos = text.indexOf('👋');  // Returns position of high surrogate

// Use this to validate
function findSafePosition(text, searchString) {
  const pos = text.indexOf(searchString);
  if (pos === -1) return -1;

  // Ensure we're not in the middle of a surrogate pair
  return adjustOffsetForSurrogates(text, pos);
}
```

### Character Iteration Best Practices

```javascript
// Bad - breaks surrogate pairs
for (let i = 0; i < text.length; i++) {
  const char = text[i]; // May be half an emoji
}

// Good - respects code points
for (const char of text) {
  // char is a full character/emoji
}

// Also good - Array.from
Array.from(text).forEach(char => {
  // char is a full character/emoji
});

// Best - grapheme clusters
const segmenter = new Intl.Segmenter('en', {granularity: 'grapheme'});
for (const segment of segmenter.segment(text)) {
  const char = segment.segment; // True visual character
}
```

---

## 11. Feasibility Assessment

### Is ContentEditable with UTF-16 Tracking Viable?

**YES**, with significant caveats:

### Complexity Rating: 7/10

**Simple aspects:**
- Basic text editing works out of the box
- Getting/setting cursor position has established patterns
- Modern browsers handle emoji reasonably well

**Complex aspects:**
- Cross-browser inconsistencies require extensive testing
- Surrogate pair handling needs careful attention
- Mark position updating requires robust diff algorithm
- Showing highlights without breaking editing is tricky

### Development Time Estimate

**Minimal viable implementation:** 2-3 weeks
- Basic contenteditable
- Cursor position tracking
- Simple mark position updates
- No highlight display

**Production-ready implementation:** 6-8 weeks
- Cross-browser testing and fixes
- Proper surrogate pair handling
- Mark highlighting with overlay
- Paste handling
- Mobile support
- Undo/redo preservation
- Edge case handling

**Using a framework (ProseMirror):** 4-6 weeks
- Learning curve
- Integration
- Custom mark handling
- Styling

### Risk Factors

**High Risk:**
- Mobile browser compatibility (especially Android/CJK)
- Complex emoji (families, flags, skin tones)
- Very long texts (10,000+ characters)

**Medium Risk:**
- Cross-browser edge cases
- Undo/redo stack maintenance
- Mark position accuracy during rapid editing

**Low Risk:**
- Basic text editing
- Simple emoji (single surrogate pairs)
- Short to medium texts (< 5,000 characters)

### Recommended Approach

**Phase 1: Proof of Concept (1 week)**
- Basic contenteditable with cursor position tracking
- Simple mark position update (no display)
- Test with emoji and long text
- Evaluate complexity

**Phase 2: Core Features (2-3 weeks)**
- beforeinput/input event handling
- Robust diff algorithm for mark updates
- Basic mark highlighting (overlay approach)
- Plain text paste handling

**Phase 3: Polish (2-3 weeks)**
- Cross-browser testing and fixes
- Mobile browser support
- Surrogate pair edge cases
- Performance optimization

**Phase 4: Production Hardening (1-2 weeks)**
- Extensive testing
- Error handling
- Fallbacks for unsupported browsers
- Documentation

### Alternative: Use Existing Framework

**If you choose ProseMirror (via Tiptap):**

**Pros:**
- Proven solution
- Better long-term maintainability
- Collaborative editing possible later
- Active community

**Cons:**
- Larger bundle size (~100kb)
- Learning curve
- May be overkill for plain text

**Timeline:** Similar total time, but more front-loaded learning.

### Minimum Browser Targets

**Recommended:**
- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- iOS Safari 14+
- Chrome Mobile 90+

**With polyfills/fallbacks:**
- Chrome/Edge 79+
- Safari 12+
- Firefox 68+
- iOS Safari 12+

---

## 12. Code Examples

### Complete Minimal Implementation

```javascript
class ContentEditableMarkEditor {
  constructor(element, initialText, marks) {
    this.element = element;
    this.text = initialText;
    this.marks = marks;
    this.setup();
  }

  setup() {
    this.element.contentEditable = true;
    this.element.textContent = this.text;

    // Use beforeinput if available, otherwise input
    if ('onbeforeinput' in this.element) {
      this.element.addEventListener('beforeinput', this.onBeforeInput.bind(this));
    }
    this.element.addEventListener('input', this.onInput.bind(this));

    // Plain text paste
    this.element.addEventListener('paste', this.onPaste.bind(this));

    // Prevent formatting
    this.element.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  onBeforeInput(e) {
    // Prevent formatting commands
    if (e.inputType.startsWith('format')) {
      e.preventDefault();
      return;
    }

    console.log('Before input:', e.inputType, e.data);
  }

  onInput(e) {
    const newText = this.element.textContent;
    const diff = this.calculateDiff(this.text, newText);

    console.log('Edit:', diff);

    // Update marks
    this.marks = this.updateMarks(this.marks, diff);

    // Update stored text
    this.text = newText;

    // Trigger callback
    this.onChange && this.onChange(this.text, this.marks);
  }

  onPaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');

    // Insert plain text at cursor
    document.execCommand('insertText', false, text);
  }

  onKeyDown(e) {
    // Prevent bold, italic, etc.
    if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }

    // Handle Enter as newline, not paragraph
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  }

  calculateDiff(oldText, newText) {
    let start = 0;
    const minLength = Math.min(oldText.length, newText.length);

    while (start < minLength && oldText[start] === newText[start]) {
      start++;
    }

    let oldEnd = oldText.length;
    let newEnd = newText.length;

    while (oldEnd > start &&
           newEnd > start &&
           oldText[oldEnd - 1] === newText[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }

    return {
      start,
      oldEnd,
      newEnd,
      lengthDelta: newEnd - oldEnd,
      removed: oldText.slice(start, oldEnd),
      added: newText.slice(start, newEnd)
    };
  }

  updateMarks(marks, diff) {
    const {start, oldEnd, lengthDelta} = diff;

    return marks.map(mark => {
      if (mark.end <= start) {
        return mark;
      }

      if (mark.start >= oldEnd) {
        return {
          ...mark,
          start: mark.start + lengthDelta,
          end: mark.end + lengthDelta
        };
      }

      // Mark overlaps edit - mark as invalid
      return {
        ...mark,
        invalid: true
      };
    }).filter(mark => !mark.invalid);
  }

  getCaretPosition() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return 0;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this.element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    return preCaretRange.toString().length;
  }

  setCaretPosition(offset) {
    // Adjust for surrogate pairs
    offset = this.adjustOffsetForSurrogates(this.text, offset);

    const range = document.createRange();
    const selection = window.getSelection();

    let currentOffset = 0;
    let found = false;

    const walk = (node) => {
      if (found) return;

      if (node.nodeType === Node.TEXT_NODE) {
        const length = node.textContent.length;
        if (currentOffset + length >= offset) {
          range.setStart(node, offset - currentOffset);
          range.collapse(true);
          found = true;
          return;
        }
        currentOffset += length;
      } else {
        for (const child of node.childNodes) {
          walk(child);
          if (found) return;
        }
      }
    };

    walk(this.element);

    if (found) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  adjustOffsetForSurrogates(text, offset) {
    if (offset > 0 && offset < text.length) {
      const charCode = text.charCodeAt(offset);
      // If we're at a low surrogate, move back to high surrogate
      if (charCode >= 0xDC00 && charCode <= 0xDFFF) {
        return offset - 1;
      }
    }
    return offset;
  }
}

// Usage
const editor = new ContentEditableMarkEditor(
  document.getElementById('editor'),
  'The quick brown fox',
  [{start: 4, end: 9, text: 'quick'}]
);

editor.onChange = (text, marks) => {
  console.log('Text changed:', text);
  console.log('Updated marks:', marks);
};
```

### Mark Highlighting with Overlay

```javascript
class HighlightOverlay {
  constructor(editableElement) {
    this.editable = editableElement;
    this.container = this.createContainer();
    this.highlights = this.createHighlightLayer();
    this.marks = [];
  }

  createContainer() {
    const container = document.createElement('div');
    container.style.position = 'relative';

    // Wrap editable element
    this.editable.parentNode.insertBefore(container, this.editable);
    container.appendChild(this.editable);

    return container;
  }

  createHighlightLayer() {
    const layer = document.createElement('div');
    layer.style.position = 'absolute';
    layer.style.top = '0';
    layer.style.left = '0';
    layer.style.pointerEvents = 'none';
    layer.style.zIndex = '0';

    this.container.insertBefore(layer, this.editable);

    // Make editable element transparent but keep caret
    this.editable.style.position = 'relative';
    this.editable.style.zIndex = '1';
    this.editable.style.background = 'transparent';
    this.editable.style.caretColor = 'black';

    return layer;
  }

  updateHighlights(marks) {
    this.marks = marks;
    this.highlights.innerHTML = '';

    const text = this.editable.textContent;

    marks.forEach(mark => {
      if (mark.invalid) return;

      const range = this.createRangeForMark(text, mark);
      if (!range) return;

      const rects = range.getClientRects();
      const containerRect = this.container.getBoundingClientRect();

      for (const rect of rects) {
        const span = document.createElement('span');
        span.style.position = 'absolute';
        span.style.left = (rect.left - containerRect.left) + 'px';
        span.style.top = (rect.top - containerRect.top) + 'px';
        span.style.width = rect.width + 'px';
        span.style.height = rect.height + 'px';
        span.style.backgroundColor = 'yellow';
        span.style.opacity = '0.3';
        this.highlights.appendChild(span);
      }
    });
  }

  createRangeForMark(text, mark) {
    const range = document.createRange();

    // Find text node and offset for start
    const start = this.findNodeAndOffset(mark.start);
    const end = this.findNodeAndOffset(mark.end);

    if (!start || !end) return null;

    try {
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      return range;
    } catch (e) {
      console.error('Invalid range:', e);
      return null;
    }
  }

  findNodeAndOffset(targetOffset) {
    let currentOffset = 0;

    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const length = node.textContent.length;
        if (currentOffset + length >= targetOffset) {
          return {
            node: node,
            offset: targetOffset - currentOffset
          };
        }
        currentOffset += length;
      } else {
        for (const child of node.childNodes) {
          const result = walk(child);
          if (result) return result;
        }
      }
      return null;
    };

    return walk(this.editable);
  }
}

// Usage
const editor = new ContentEditableMarkEditor(/*...*/);
const overlay = new HighlightOverlay(editor.element);

editor.onChange = (text, marks) => {
  overlay.updateHighlights(marks);
};

// Initial render
overlay.updateHighlights(editor.marks);
```

---

## 13. Conclusion

### Summary of Findings

1. **ContentEditable is functional** but requires careful handling of edge cases
2. **UTF-16 position tracking** works well with proper surrogate pair handling
3. **Cross-browser compatibility** is achievable with fallbacks
4. **Mark position updates** require robust diff algorithms
5. **Highlighting marks** best done with overlay approach

### Key Recommendations

1. **Use beforeinput event** where available (Chrome/Safari), fallback to input event (Firefox)
2. **Handle surrogate pairs** explicitly using helper functions
3. **Use overlay technique** for mark highlights to avoid DOM manipulation issues
4. **Store positions as UTF-16 offsets** (native JavaScript string indexing)
5. **Test extensively** on mobile browsers and with emoji
6. **Consider ProseMirror** if complexity grows or collaboration is needed

### Go/No-Go Decision

**GO** if:
- You're comfortable with moderate complexity
- You can allocate 6-8 weeks for production-ready implementation
- You can test on multiple browsers and devices
- You're willing to handle edge cases iteratively

**NO-GO** (use framework) if:
- You need collaborative editing
- You need rich text formatting
- You have limited time for custom development
- You need guaranteed mobile/CJK support

### Next Steps

1. **Build proof of concept** (1 week)
2. **Test with your actual data** (mark positions, text samples)
3. **Evaluate complexity** vs. framework approach
4. **Make final decision** on custom vs. ProseMirror/Lexical
5. **Start phased implementation** if going custom

---

## Resources

### Documentation
- [MDN: contenteditable](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable)
- [MDN: beforeinput event](https://developer.mozilla.org/en-US/docs/Web/API/Element/beforeinput_event)
- [MDN: Range API](https://developer.mozilla.org/en-US/docs/Web/API/Range)
- [W3C Input Events Spec](https://w3c.github.io/input-events/)

### Libraries
- [ProseMirror](https://prosemirror.net/)
- [Tiptap](https://tiptap.dev/) (ProseMirror wrapper)
- [Lexical](https://lexical.dev/)
- [Slate](https://docs.slatejs.org/)

### Articles
- [Stephen Haney: Get contenteditable plaintext with correct linebreaks](https://stephenhaney.com/2020/get-contenteditable-plaintext-with-correct-linebreaks/)
- [WebKit Blog: Enhanced Editing with Input Events](https://webkit.org/blog/7358/enhanced-editing-with-input-events/)
- [What every JavaScript developer should know about Unicode](https://dmitripavlutin.com/what-every-javascript-developer-should-know-about-unicode/)

### Tools
- [Can I Use: contenteditable](https://caniuse.com/contenteditable)
- [Can I Use: beforeinput](https://caniuse.com/mdn-api_htmlelement_beforeinput_event)
- [Intl.Segmenter Browser Support](https://caniuse.com/mdn-javascript_builtins_intl_segmenter)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-17
**Author:** Research compiled from MDN, W3C specs, Stack Overflow, and technical blogs
