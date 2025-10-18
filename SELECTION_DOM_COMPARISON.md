# DOM Structure Comparison: Current vs. Proposed

## Visual Examples

### Example Content

```
First paragraph with a [link](url) here.

Second paragraph with more text and [another link](url2).

Third paragraph plain text.
```

With read ranges:
- Characters 0-25: Read (covers "First paragraph with a [")
- Characters 100-150: Read (covers part of third paragraph)

---

## Current Implementation (Fragmented)

### DOM Structure

```
<div id="article-content" class="whitespace-pre-wrap not-prose">
  │
  ├─ <span class="read-text">                     ← SEGMENT 1 (read)
  │    │
  │    ├─ #text "First paragraph with a "
  │    │
  │    └─ <a href="url" class="clickable-link" data-url="url" tabindex="0">
  │         └─ #text "link"                       ← LINK BOUNDARY
  │
  ├─ <span class="">                              ← SEGMENT 2 (unread)
  │    │
  │    ├─ #text " here."
  │    ├─ #text "\n\n"
  │    └─ #text "Second paragraph with more text and "
  │
  ├─ <span class="">                              ← SEGMENT 3 (unread)
  │    │
  │    └─ <a href="url2" class="clickable-link" data-url="url2" tabindex="0">
  │         └─ #text "another link"               ← LINK BOUNDARY
  │
  ├─ <span class="">                              ← SEGMENT 4 (unread)
  │    │
  │    ├─ #text "."
  │    ├─ #text "\n\n"
  │    └─ #text "Third paragraph "
  │
  ├─ <span class="read-text">                     ← SEGMENT 5 (read)
  │    │
  │    └─ #text "plain text."
  │
  └─ <span class="">                              ← SEGMENT 6 (unread)
       │
       └─ #text ""
```

### Problems Highlighted

```
USER TRIES TO SELECT: "link here. Second"
                       ^^^^^^^^^^^^^^^^^^^

CROSSES BOUNDARIES:
  </a>  ← Link boundary (browser may snap here)
  </span><span>  ← Segment boundary (fragmentation)

VISUAL RESULT: Selection disappears or snaps to link boundary
DATA RESULT: Actually works correctly in memory
```

```
USER DOUBLE-CLICKS: "paragraph"
                     ^^^^^^^^^^

WORD IS IN TEXT NODE: <span class="">#text "Second paragraph with"</span>

BROWSER CREATES SELECTION: "paragraph" ✓
REACT UPDATES STATE: setTimeout → setSelectionInfo
VISUAL SELECTION: Lost due to DOM fragmentation and re-render

CONSOLE SHOWS: Mark created with correct positions ✓
USER SEES: No selection highlight ✗
```

```
USER TRIPLE-CLICKS: First paragraph
                    ^^^^^^^^^^^^^^^

BROWSER SELECTS: Entire <div id="article-content">
(Because there are no <p> elements, only inline <span>s)

RESULT: Selects ALL THREE PARAGRAPHS ✗
EXPECTED: Select only the first paragraph
```

---

## Proposed Implementation (Semantic)

### DOM Structure

```
<div id="article-content" class="prose">
  │
  ├─ <p>                                          ← PARAGRAPH 1
  │    │
  │    ├─ <mark class="read-range">               ← READ STYLING (only where needed)
  │    │    └─ #text "First paragraph with a "
  │    │
  │    ├─ <a href="url" class="clickable-link" data-url="url">
  │    │    └─ #text "link"
  │    │
  │    └─ #text " here."
  │
  ├─ <p>                                          ← PARAGRAPH 2
  │    │
  │    ├─ #text "Second paragraph with more text and "
  │    │
  │    ├─ <a href="url2" class="clickable-link" data-url="url2">
  │    │    └─ #text "another link"
  │    │
  │    └─ #text "."
  │
  └─ <p>                                          ← PARAGRAPH 3
       │
       ├─ #text "Third paragraph "
       │
       └─ <mark class="read-range">               ← READ STYLING (only where needed)
            └─ #text "plain text."
```

### Benefits Highlighted

```
USER TRIES TO SELECT: "link here. Second"
                       ^^^^^^^^^^^^^^^^^^^

CROSSES BOUNDARIES:
  </a> ← Link boundary (still exists, but fewer total boundaries)
  ✓ No unnecessary <span> boundaries between "here." and "Second"
  ✓ Continuous text flow within <p>

VISUAL RESULT: Selection works smoothly ✓
DATA RESULT: Works correctly ✓
```

```
USER DOUBLE-CLICKS: "paragraph"
                     ^^^^^^^^^^

WORD IS IN TEXT NODE: <p>#text "Second paragraph with more text and "</p>

BROWSER CREATES SELECTION: "paragraph" ✓
REACT UPDATES STATE: setTimeout → setSelectionInfo
VISUAL SELECTION: Maintained! ✓
(Fewer element boundaries = more stable selection)

CONSOLE SHOWS: Mark created with correct positions ✓
USER SEES: Highlighted word ✓
```

```
USER TRIPLE-CLICKS: First paragraph
                    ^^^^^^^^^^^^^^^

BROWSER SELECTS: The <p> element containing first paragraph ✓

RESULT: Selects ONLY first paragraph ✓
EXPECTED: Select only the first paragraph ✓
```

---

## Text Node Comparison

### Current: Fragmented Text Nodes

```
Segment 1 (span.read-text):
  ├─ TextNode: "First paragraph with a "
  └─ (a.clickable-link)
      └─ TextNode: "link"

Segment 2 (span):
  └─ TextNode: " here.\n\nSecond paragraph with more text and "

Segment 3 (span):
  └─ (a.clickable-link)
      └─ TextNode: "another link"

Segment 4 (span):
  └─ TextNode: ".\n\nThird paragraph "

Segment 5 (span.read-text):
  └─ TextNode: "plain text."

TOTAL BOUNDARIES: 5 segment spans + 2 links = 7 element boundaries
```

### Proposed: Minimal Text Node Fragmentation

```
Paragraph 1 (p):
  ├─ (mark.read-range)
  │   └─ TextNode: "First paragraph with a "
  ├─ (a.clickable-link)
  │   └─ TextNode: "link"
  └─ TextNode: " here."

Paragraph 2 (p):
  ├─ TextNode: "Second paragraph with more text and "
  ├─ (a.clickable-link)
  │   └─ TextNode: "another link"
  └─ TextNode: "."

Paragraph 3 (p):
  ├─ TextNode: "Third paragraph "
  └─ (mark.read-range)
      └─ TextNode: "plain text."

TOTAL BOUNDARIES: 3 paragraphs + 2 marks + 2 links = 7 semantic boundaries
BUT: Paragraphs are block-level (proper selection containers)
     Marks are inline (minimal interference)
```

---

## Selection Behavior Matrix

| Scenario | Current (Fragmented) | Proposed (Semantic) |
|----------|---------------------|---------------------|
| **Single word selection** | Works if within one text node | Works reliably |
| **Multi-word selection (same segment)** | Works | Works |
| **Selection crossing segment boundary** | May snap or disappear | Works smoothly |
| **Selection crossing link boundary** | Often snaps to link edge | Improved (fewer boundaries) |
| **Double-click word selection** | Visual often lost | Visual maintained |
| **Triple-click paragraph** | Selects entire document | Selects single paragraph |
| **Selection across paragraphs** | No clear boundary | Clear paragraph boundaries |
| **Selection with read/unread text** | Many boundaries | Fewer boundaries |

---

## Code Complexity Comparison

### Current: renderTextWithLinks + segments

```tsx
// 1. Parse excluded ranges
const { cleanedContent, excludedRanges } = parseExcludedRanges(content)

// 2. Convert ranges to cleaned space
const convertedReadRanges = readRanges.map(r => ({
  startPosition: renderedPosToCleanedPos(r.startPosition, cleanedContent),
  endPosition: renderedPosToCleanedPos(r.endPosition, cleanedContent)
}))

// 3. Merge overlapping ranges
// 4. Create segments
// 5. Apply search matches (creates sub-segments)
// 6. Render each segment with dangerouslySetInnerHTML

// Result: Complex, many edge cases, fragmented DOM
```

### Proposed: Paragraph-based rendering

```tsx
// 1. Parse content into paragraphs
const paragraphs = content.split('\n\n')

// 2. For each paragraph, render with ranges
paragraphs.map((para, idx) => (
  <p key={idx}>
    {renderParagraphContent(para, ranges, links)}
  </p>
))

// 3. renderParagraphContent returns React elements
//    - Text nodes for plain text
//    - <mark> for read/excluded ranges
//    - <a> for links
//    - Minimal nesting

// Result: Simpler, semantic, better selection
```

---

## Migration Path

### Phase 1: Parallel Implementation

```
src/lib/components/reading/
  ├─ ReadHighlighter.tsx          ← Current (keep temporarily)
  └─ ReadHighlighterV2.tsx        ← New implementation
```

### Phase 2: Feature Flag

```tsx
// In read/[id].tsx
const useNewHighlighter = true // or from settings

{useNewHighlighter ? (
  <ReadHighlighterV2 {...props} />
) : (
  <ReadHighlighter {...props} />
)}
```

### Phase 3: Test & Validate

- ✅ Text selection (single, double, triple click)
- ✅ Mark creation (cloze, QA, basic)
- ✅ Read range tracking
- ✅ Excluded range rendering
- ✅ Link clicking (normal and Alt+click)
- ✅ Search highlighting
- ✅ Inline editing
- ✅ Position calculations

### Phase 4: Full Migration

- Default to V2
- Remove old component
- Clean up unused code

---

## Performance Considerations

### Current Implementation

```
Content changes → useMemo(segments) → useMemo(renderableSegments) → render
                     │                      │
                     └─ Complex merging     └─ Search match splitting
                        Many iterations        Creates sub-segments
```

- Many segments (one per range boundary)
- Search creates sub-segments (exponential growth)
- Each segment = one `<span>` with innerHTML
- React can't optimize (dangerouslySetInnerHTML is opaque)

### Proposed Implementation

```
Content changes → useMemo(paragraphs) → render
                     │
                     └─ Simple split by \n\n
                        Parse ranges per paragraph
                        Return React elements
```

- Fewer top-level elements (paragraphs vs. segments)
- React elements (proper reconciliation)
- React can optimize re-renders
- Easier to memoize sub-components

**Expected performance**: Equal or better
- Fewer DOM nodes overall
- Better React reconciliation
- Simpler update logic

---

## Accessibility Benefits

### Current (Poor Semantics)

```html
<div id="article-content">
  <span>Text</span><span>More text</span>
</div>
```

Screen reader sees:
- "Text More text" (one continuous blob)
- No paragraph structure
- No semantic meaning

### Proposed (Proper Semantics)

```html
<div id="article-content">
  <p>First paragraph with <a href="url">link</a>.</p>
  <p>Second paragraph here.</p>
</div>
```

Screen reader sees:
- "Paragraph: First paragraph with link."
- "Link: link"
- "Paragraph: Second paragraph here."
- Proper navigation between paragraphs
- Semantic structure

**WCAG Compliance**: Improved
- 1.3.1 Info and Relationships (Level A)
- 2.4.4 Link Purpose (Level A)

---

## Summary

| Aspect | Current | Proposed | Improvement |
|--------|---------|----------|-------------|
| **DOM fragmentation** | High (many spans) | Low (paragraphs + marks) | ⬆️ Major |
| **Selection stability** | Poor | Good | ⬆️ Major |
| **Triple-click behavior** | Broken | Fixed | ⬆️ Major |
| **Double-click stability** | Unstable | Stable | ⬆️ Major |
| **Code complexity** | High | Medium | ⬆️ Moderate |
| **Accessibility** | Poor | Good | ⬆️ Major |
| **Performance** | OK | OK-Good | ⬆️ Minor |
| **Semantic HTML** | No | Yes | ⬆️ Major |

**Conclusion**: The proposed semantic structure fixes all identified issues while improving code quality, accessibility, and maintainability.
