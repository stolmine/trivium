# Text Selection Issues in ReadHighlighter - Root Cause Analysis

## Executive Summary

The text selection issues in the reading view are caused by a **fragmented DOM structure** created by the `ReadHighlighter` component. The component splits content into multiple `<span>` elements (segments) and renders each with `dangerouslySetInnerHTML`, creating nested inline elements that interfere with browser selection behavior.

## Investigation Findings

### 1. Current DOM Structure

#### How ReadHighlighter Works

The `ReadHighlighter` component (`/Users/why/repos/trivium/src/lib/components/reading/ReadHighlighter.tsx`) creates segments based on:
- Read ranges (text marked as read vs. unread)
- Excluded ranges (text marked as excluded)
- Search matches (highlighted search results)

Each segment is rendered as a separate `<span>` element with `dangerouslySetInnerHTML`:

```tsx
{renderableSegments.map((segment) => {
  return (
    <span
      key={segment.key}
      className={classNames.join(' ')}
      dangerouslySetInnerHTML={{ __html: renderTextWithLinks(segment.text, linksEnabled) }}
    />
  )
})}
```

#### Example DOM Output

For content like: `"Before text [first link](url1) middle text [second link](url2) after text"`

With segments created based on read ranges, the actual DOM becomes:

```html
<div id="article-content">
  <span class="">
    Before text
    <a href="url1" class="clickable-link" data-url="url1" tabindex="0">first link</a>
     middle
  </span>
  <span class="read-text">
    text
    <a href="url2" class="clickable-link" data-url="url2" tabindex="0">second link</a>
     after
  </span>
  <span class="">text</span>
</div>
```

#### Text Node Fragmentation

This creates a **highly fragmented text node structure**:

```
<div id="article-content">
  <span>                          ← Segment boundary
    #text: "Before text "
    <a>                           ← Link element boundary
      #text: "first link"
    </a>
    #text: " middle "
  </span>                         ← Segment boundary
  <span class="read-text">        ← Segment boundary + styling boundary
    #text: "text "
    <a>                           ← Link element boundary
      #text: "second link"
    </a>
    #text: " after "
  </span>                         ← Segment boundary
  <span>                          ← Segment boundary
    #text: "text"
  </span>
</div>
```

### 2. Root Causes of Each Symptom

#### Symptom 1: Selections Snap to Link Boundaries

**Cause**: Browser's native text selection behavior with `<a>` elements.

- Browsers have built-in heuristics for selecting text within links
- When dragging across link boundaries, browsers try to be "smart" about whether the user wants:
  - To select text (horizontal drag)
  - To drag the link (vertical-ish drag)
  - To activate the link (click)
- The `tabindex="0"` attribute makes links focusable, which adds another layer of interaction priority
- Browsers may snap selections to element boundaries to maintain clean selection rectangles

**Evidence**:
- Mozilla bug #378775 documents Opera's behavior for selecting text inside links and link drag-and-drop
- Firefox requires modifier keys to select text inside links in some cases
- Block-level anchor elements make text selection nearly impossible without starting outside the element

#### Symptom 2: Double-Click Word Selection Disappears Visually

**Cause**: React re-rendering interference combined with fragmented DOM.

**The sequence of events**:
1. User double-clicks a word
2. Browser creates native selection (works correctly)
3. The selection data is captured by `getSelectionRange()` (lines 127-154 in `/Users/why/repos/trivium/src/lib/utils/domPosition.ts`)
4. The `handleTextSelection` callback (line 385 in `/Users/why/repos/trivium/src/routes/read/[id].tsx`) updates React state
5. **However**, the visual selection is lost because:
   - The double-click selection happens across text nodes that are fragmented by `<span>` and `<a>` boundaries
   - React 19.2.0 may trigger micro-updates when state changes
   - The `dangerouslySetInnerHTML` creates a brittle relationship between the browser's selection API and the actual DOM

**Why the data is correct but visual is wrong**:
- `window.getSelection()` correctly returns the Range object
- `getAbsolutePosition()` correctly walks the TreeWalker and calculates positions
- The marks are created with the correct data
- But the **visual rendering** of the selection highlight is lost because the browser's selection system gets confused by the fragmented DOM structure

**Evidence from web research**:
- React re-rendering can interrupt double-click selections (GitHub issue #9678)
- When React re-renders a native element during selection, the second click is NOT recognized as a double-click
- `dangerouslySetInnerHTML` makes this worse because any re-render replaces the entire innerHTML

#### Symptom 3: Triple-Click Crosses Paragraph Boundaries

**Cause**: Lack of proper paragraph-level DOM structure.

- Triple-click in browsers selects the entire "block"
- Currently, `ReadHighlighter` uses `<div id="article-content">` with `whitespace-pre-wrap`
- There are no `<p>` elements or block-level boundaries
- All content is inline `<span>` elements
- Browser interprets the entire `<div>` as one block

**Current structure**:
```tsx
<div id="article-content" className="whitespace-pre-wrap not-prose">
  <span>...</span><span>...</span><span>...</span>
</div>
```

**Why newlines don't create boundaries**:
- Newlines (`\n`) in text nodes create visual line breaks with `whitespace-pre-wrap`
- But they don't create **selection boundaries** (no block-level elements)
- Triple-click selects the entire containing block (the `<div>`)

#### Symptom 4: Visual Rendering Broken but Memory Correct

**Root cause summary**:
- **Data layer**: Works perfectly (TreeWalker, position calculations, Range API)
- **Presentation layer**: Breaks due to:
  1. Fragmented DOM (multiple `<span>` boundaries)
  2. Nested inline elements (`<a>` inside `<span>`)
  3. React re-rendering with `dangerouslySetInnerHTML`
  4. CSS styling differences (`.read-text` with black background)

### 3. Technical Analysis of `renderTextWithLinks()`

**Location**: `/Users/why/repos/trivium/src/lib/components/reading/ReadHighlighter.tsx`, lines 45-74

**What it does**:
1. Formats Wikipedia-style headers: `=== Header ===` → `<strong>Header</strong>`
2. Removes empty markdown links: `[](url)` → empty string
3. Converts markdown links to HTML:
   - `[text](url)` → `<a href="url" class="clickable-link" data-url="url" tabindex="0">text</a>`
4. Converts standalone URLs to clickable links

**Problems this creates**:
- Returns an HTML string (not React elements)
- Must be rendered with `dangerouslySetInnerHTML`
- Creates nested elements that fragment text nodes
- No control over React reconciliation
- Can't use React event handlers on generated `<a>` elements (must use event delegation)

### 4. Browser Selection Behavior Research

#### How Browser Selection Works

1. **Selection API**: `window.getSelection()` returns a `Selection` object containing zero or more `Range` objects
2. **Range boundaries**: Each Range has a `startContainer`, `startOffset`, `endContainer`, `endOffset`
3. **Text nodes**: Selection works at the text node level
4. **Visual rendering**: Browser paints selection highlight across text nodes

#### Issues with Fragmented DOM

**Normal (good) structure**:
```html
<p>This is a paragraph with a <a>link</a> in the middle.</p>
```
- Text nodes: 3 total ("This is a paragraph with a ", "link", " in the middle.")
- Selection can flow smoothly across boundaries
- Browser maintains visual selection highlight

**Fragmented (bad) structure**:
```html
<div>
  <span>This is </span>
  <span>a paragraph <a>link</a> in </span>
  <span>the middle.</span>
</div>
```
- Text nodes: 5+ total, fragmented by unnecessary `<span>` boundaries
- Selection API still works (data is correct)
- But visual rendering gets confused
- Double-click word selection may not cross span boundaries properly
- Browser may prioritize link interaction over text selection

## Solution Options

### Option 1: Use React Elements Instead of dangerouslySetInnerHTML

**Approach**: Parse markdown in `renderTextWithLinks()` and return React elements.

**Implementation**:
```tsx
function renderTextWithLinks(text: string, linksEnabled: boolean): React.ReactNode[] {
  const elements: React.ReactNode[] = []

  // Parse text and create React elements
  let lastIndex = 0
  const linkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g
  let match

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before link
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index))
    }

    // Add link element
    elements.push(
      <a
        key={`link-${match.index}`}
        href={match[2]}
        className="clickable-link"
        data-url={match[2]}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {match[1]}
      </a>
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex))
  }

  return elements
}

// In render:
<span className={classNames.join(' ')}>
  {renderTextWithLinks(segment.text, linksEnabled)}
</span>
```

**Pros**:
- Proper React reconciliation
- Can use React event handlers directly
- Better performance (React can optimize re-renders)
- Safer (no XSS risk from dangerouslySetInnerHTML)

**Cons**:
- More complex parsing logic
- Need to handle edge cases (nested formatting, etc.)
- Still have the segment boundary fragmentation issue
- Doesn't solve the core "too many spans" problem

**Impact on selection**: Minor improvement. Eliminates some re-rendering issues but doesn't fix the fundamental fragmentation problem.

---

### Option 2: Flatten DOM Structure with CSS-Only Styling

**Approach**: Render all content in a single container and use CSS to style read/excluded ranges.

**Implementation**:
```tsx
// Strategy: Use CSS custom properties and pseudo-elements
// Or use a single contenteditable-style approach

<div
  id="article-content"
  className="reading-content"
  dangerouslySetInnerHTML={{ __html: renderCompleteContent() }}
  style={{
    '--read-ranges': JSON.stringify(readRanges),
    '--excluded-ranges': JSON.stringify(excludedRanges)
  }}
/>

// Problem: CSS can't style arbitrary text ranges
// Would need JavaScript to insert <mark> elements or similar
```

**Alternative - Use single pass with mark elements**:
```tsx
function renderWithAllRanges(content, readRanges, excludedRanges, links) {
  // Single pass: parse content and insert <mark> elements for ranges
  // Use CSS classes on <mark> elements for styling
  // This reduces segment fragmentation
}
```

**Pros**:
- Reduces DOM fragmentation
- Better selection behavior
- Simpler structure

**Cons**:
- Complex implementation (merging ranges, handling overlaps)
- Still need some element boundaries for styling
- May not completely eliminate the issue

**Impact on selection**: Moderate improvement. Reduces fragmentation but still has some element boundaries.

---

### Option 3: Remove Segment Boundaries (Recommended)

**Approach**: Render content as a continuous flow with inline styling elements only where needed.

**Key insight**: The current implementation creates segment boundaries unnecessarily. Each segment becomes a `<span>`, but this fragmentation is purely a rendering artifact.

**Implementation**:

```tsx
// Current (fragmented):
<div id="article-content">
  <span className="read-text">segment 1</span>
  <span className="">segment 2</span>
  <span className="read-text">segment 3</span>
</div>

// Proposed (continuous with styling elements):
<div id="article-content">
  <mark className="read-range">segment 1</mark>
  segment 2
  <mark className="read-range">segment 3</mark>
</div>
```

**Better yet - use semantic elements**:
```tsx
// Use <p> for paragraphs, <mark> for ranges
function renderContent(content, readRanges, excludedRanges, linksEnabled) {
  // 1. Split content by double newlines into paragraphs
  const paragraphs = content.split('\n\n')

  return paragraphs.map((para, idx) => (
    <p key={idx}>
      {renderParagraphWithRanges(para, readRanges, excludedRanges, linksEnabled)}
    </p>
  ))
}

function renderParagraphWithRanges(text, ranges, excludedRanges, linksEnabled) {
  // Insert <mark> elements only where ranges exist
  // Parse links into React <a> elements
  // Return continuous text flow with minimal element boundaries
}
```

**Key changes**:
1. **Add paragraph structure**: Split by `\n\n`, render as `<p>` elements
2. **Use `<mark>` for ranges**: Instead of wrapping entire segments in `<span>`
3. **Minimize boundaries**: Only insert elements where absolutely necessary
4. **React elements**: Parse markdown into React elements (not HTML strings)

**Detailed example**:

```tsx
// Input text:
"First paragraph with [link](url).\n\nSecond paragraph here."

// With read range: characters 0-20
// Current output (fragmented):
<div id="article-content">
  <span className="read-text">First paragraph wit</span>
  <span>h <a href="url">link</a>.</span>
  <span>

Second paragraph here.</span>
</div>

// Proposed output (structured):
<div id="article-content">
  <p>
    <mark className="read-range">First paragraph wit</mark>
    h <a href="url">link</a>.
  </p>
  <p>Second paragraph here.</p>
</div>
```

**Pros**:
- **Proper semantic structure**: `<p>` elements for paragraphs
- **Minimal fragmentation**: Only elements where needed (`<mark>`, `<a>`)
- **Triple-click works correctly**: Selects one `<p>` element
- **Better selection behavior**: Fewer element boundaries to cross
- **More maintainable**: Clearer relationship between structure and content
- **Accessibility**: Better for screen readers

**Cons**:
- **Significant refactoring**: Need to rewrite rendering logic
- **Complex range handling**: Must split/merge ranges across paragraph boundaries
- **Position calculations**: May need to adjust `renderedPosToCleanedPos()` logic
- **Edge cases**: Must handle ranges that span paragraphs

**Impact on selection**: **Major improvement**. Fixes all four symptoms:
1. ✅ Fewer link boundaries to snap to
2. ✅ Continuous text flow for double-click selection
3. ✅ Proper paragraph boundaries for triple-click
4. ✅ Visual rendering matches data structure

---

### Option 4: CSS-Only Fix for Visual Selection

**Approach**: Keep current structure, fix visual rendering with CSS.

**Implementation**:
```css
/* Ensure selection highlights render properly across boundaries */
.read-text, .read-text a {
  /* Force selection to render */
  position: relative;
  z-index: 1;
}

/* Make sure ::selection works across all elements */
#article-content *::selection {
  background-color: rgba(66, 153, 225, 0.5) !important;
  color: inherit !important;
}

/* Prevent link interaction hints that interfere with selection */
.clickable-link {
  cursor: text; /* Instead of pointer, to hint that text selection is primary */
  user-select: text; /* Explicitly allow selection */
}

.clickable-link:hover {
  cursor: pointer; /* Change to pointer on hover */
}
```

**Remove tabindex to reduce interaction priority**:
```tsx
// In renderTextWithLinks, change:
'<a href="$2" class="clickable-link" data-url="$2" tabindex="0">$1</a>'
// To:
'<a href="$2" class="clickable-link" data-url="$2">$1</a>'
```

**Pros**:
- **Quick fix**: Minimal code changes
- **Low risk**: Doesn't change core logic
- **May improve visual rendering**: CSS selection hints to browser

**Cons**:
- **Doesn't fix root cause**: DOM still fragmented
- **Limited effectiveness**: CSS can't fix all selection issues
- **Workaround**: Band-aid solution, not a real fix

**Impact on selection**: Minor improvement. May help with visual rendering but won't fix snapping or paragraph boundaries.

## Recommendation

**Implement Option 3: Remove Segment Boundaries with Proper Semantic Structure**

### Why this is the best solution:

1. **Fixes all symptoms**: Addresses root cause, not just symptoms
2. **Better architecture**: Aligns DOM structure with content semantics
3. **Improved UX**: Text selection works naturally
4. **Accessibility**: Proper semantic HTML for screen readers
5. **Future-proof**: Makes the codebase more maintainable

### Implementation plan:

#### Phase 1: Add paragraph structure (solves symptom 3)
- Split content by `\n\n` into paragraphs
- Render each paragraph as `<p>` element
- Triple-click will now select single paragraph

#### Phase 2: Minimize segment boundaries (solves symptoms 1 & 2)
- Replace `<span>` segment wrappers with `<mark>` elements only where ranges exist
- Parse links into React `<a>` elements (not HTML strings)
- Reduce total number of element boundaries

#### Phase 3: Update position calculations (maintain data accuracy)
- Adjust `renderedPosToCleanedPos()` for new structure
- Update `getSelectionRange()` if needed
- Test mark creation still works correctly

### Migration strategy:

1. **Create new component**: `ReadHighlighterV2.tsx` alongside existing one
2. **Feature flag**: Add toggle to switch between old/new renderer
3. **Test thoroughly**: Ensure all selection, marking, and reading features work
4. **Gradual rollout**: Default to new renderer, fallback available
5. **Remove old code**: Once stable, delete old `ReadHighlighter`

### Code structure:

```tsx
// New component structure
export const ReadHighlighter = memo(({ content, readRanges, ... }) => {
  const paragraphs = useMemo(() =>
    parseContentIntoParagraphs(content, readRanges, excludedRanges)
  , [content, readRanges, excludedRanges])

  return (
    <div id="article-content" className="prose">
      {paragraphs.map((para, idx) => (
        <Paragraph
          key={idx}
          content={para.text}
          ranges={para.ranges}
          linksEnabled={linksEnabled}
        />
      ))}
    </div>
  )
})

const Paragraph = memo(({ content, ranges, linksEnabled }) => {
  // Render single paragraph with minimal element boundaries
  const elements = useMemo(() =>
    renderParagraphElements(content, ranges, linksEnabled)
  , [content, ranges, linksEnabled])

  return <p>{elements}</p>
})
```

## Additional Quick Wins (While Planning Option 3)

These can be implemented immediately:

### Quick Win 1: Remove `tabindex="0"` from links
```tsx
// In renderTextWithLinks, line 55:
'<a href="$2" class="clickable-link" data-url="$2">$1</a>'
```
- Reduces link interaction priority
- May improve selection snapping behavior

### Quick Win 2: Increase debounce delay
```tsx
// In handleTextSelection, line 414:
}, 250) // Increase from 150ms to 250ms
```
- Gives browser more time to stabilize selection
- Reduces interference from React updates

### Quick Win 3: Use `selectionchange` event instead of `mouseup`
```tsx
// Better event for tracking selection
useEffect(() => {
  document.addEventListener('selectionchange', handleTextSelection)
  return () => document.removeEventListener('selectionchange', handleTextSelection)
}, [handleTextSelection])
```
- More accurate than mouseup
- Captures all selection changes (mouse, keyboard, programmatic)

## Conclusion

The text selection issues stem from a **fundamental DOM architecture problem**: excessive fragmentation caused by segment-based rendering. While quick fixes can improve the symptoms, only a proper refactor to semantic, paragraph-based structure will fully resolve the issues.

**Recommended path forward**:
1. Implement quick wins immediately (remove tabindex, adjust delays)
2. Plan and execute Option 3 refactor for long-term fix
3. Use feature flags to ensure safe migration
4. Test thoroughly with various content types and selection patterns

This will result in a reading experience where text selection behaves naturally, matching user expectations from other reading applications.
