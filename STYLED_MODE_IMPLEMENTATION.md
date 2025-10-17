# Styled Mode Rendering System Implementation

This document describes the implementation of the styled mode rendering system for inline markdown editing.

## Files Created

### 1. `/Users/why/repos/trivium/src/lib/utils/markdownEdit.ts`
**Purpose:** Core utilities for updating markdown source when users edit in styled mode.

**Functions:**
- `updateLinkText()` - Updates link text while preserving URL in markdown syntax
- `replaceTextAtPosition()` - Replaces text at a specific position range
- `detectEditRegion()` - Detects what changed between old and new text

**Key Features:**
- Position-based text replacement
- Link syntax preservation
- Error handling for invalid positions

### 2. `/Users/why/repos/trivium/src/lib/components/reading/EditableLink.tsx`
**Purpose:** Handles link editing in styled mode - users can edit link text but URL is preserved.

**Props:**
- `text` - Link display text
- `url` - Link URL
- `isEditable` - Whether link is in editable region
- `sourcePosition` - Position in source markdown
- `onLinkTextChange` - Callback when text changes

**Key Features:**
- Contenteditable span for editable links
- Regular anchor tag for non-editable links
- Plain text paste only (strips HTML)
- Prevents link navigation while editing
- Uses `clickable-link` class for consistent styling
- Dotted underline for editable links to indicate editability

### 3. `/Users/why/repos/trivium/src/lib/components/reading/MarkdownRenderer.tsx`
**Purpose:** Main styled mode renderer that converts markdown AST to React elements with contenteditable support.

**Props:**
- `ast` - Markdown AST (Root node from mdast)
- `markdown` - Source markdown string
- `onTextEdit` - Callback when content changes
- `editableRange` - Which positions are editable
- `marks` - ClozeNote highlights to apply
- `mode` - 'styled' or 'literal' (for future extension)

**Architecture Decisions:**

1. **Position Tracking:**
   - Uses mdast position offsets (character positions in source)
   - Each node has `position.start.offset` and `position.end.offset`
   - Positions map directly to markdown source indices
   - Mark highlights use these positions to apply yellow backgrounds

2. **Editable Regions:**
   - Only nodes within `editableRange` are contenteditable
   - Text nodes become editable spans
   - Links become EditableLink components
   - Position checks determine editability per-node

3. **Mark Highlights:**
   - Yellow background (`#fef08a`) applied to marked ranges
   - Checks if node position overlaps with any ClozeNote
   - Highlights work for both text and links

4. **Node Rendering:**
   - Supports: Text, Link, Paragraph nodes
   - Unsupported nodes show `[unsupported: type]`
   - Can be extended to support more mdast node types

5. **Event Handling:**
   - `onInput` - Updates markdown source via `replaceTextAtPosition`
   - `onPaste` - Strips HTML, inserts plain text only
   - Uses `document.execCommand('insertText')` for compatibility

**Edge Cases Handled:**
- Empty AST shows "Empty content" message
- Missing position info shows fallback content
- Type guards ensure correct node types before rendering

### 4. `/Users/why/repos/trivium/src/lib/components/reading/EditableContent.tsx`
**Purpose:** Mode-aware container that wraps either styled or literal mode content.

**Props:**
- `mode` - 'styled' or 'literal'
- `markdown` - Source markdown
- `ast` - Optional AST (required for styled mode)
- `marks` - Optional ClozeNote highlights
- `editableRange` - Editable position range
- `onContentChange` - Callback with updated markdown

**Key Features:**

1. **Mode Switching:**
   - Styled mode: Uses MarkdownRenderer with AST
   - Literal mode: Simple contenteditable div with raw markdown

2. **Debouncing:**
   - 300ms debounce on content changes
   - Prevents excessive re-renders
   - Updates local state immediately for responsiveness
   - Notifies parent after debounce

3. **State Management:**
   - Local markdown state for immediate updates
   - Syncs with prop changes via useEffect
   - Cleanup on unmount to cancel pending timers

4. **Styling:**
   - Charter font for reading text
   - 1.25rem font size, 1.7 line height
   - Focus ring with primary color
   - Consistent with ReadHighlighter component

## Integration Example

```typescript
import { EditableContent } from './lib/components/reading/EditableContent'
import { parseMarkdownWithPositions } from './lib/utils/markdownParser'

function InlineEditor() {
  const [markdown, setMarkdown] = useState('Text with [link](url)')
  const ast = parseMarkdownWithPositions(markdown)

  return (
    <EditableContent
      mode="styled"
      markdown={markdown}
      ast={ast}
      marks={clozeNotes}
      editableRange={{ start: 0, end: markdown.length }}
      onContentChange={setMarkdown}
    />
  )
}
```

## Position Tracking Flow

### AST to DOM
1. mdast parser creates AST with position offsets
2. MarkdownRenderer reads `position.start.offset` and `position.end.offset`
3. These offsets are character indices in the source markdown string
4. React renders DOM with contenteditable spans at those positions

### DOM to AST (When User Edits)
1. User types in contenteditable span
2. `onInput` event fires with new text content
3. Component knows the source position range from node.position
4. `replaceTextAtPosition()` updates source markdown at that range
5. Parent re-parses markdown to new AST
6. MarkdownRenderer re-renders with updated content

### Mark Highlights
1. ClozeNote has `startPosition` and `endPosition` (source indices)
2. For each rendered node, check if node position overlaps mark position
3. If overlap: apply yellow background to that node
4. Works across text and link nodes

## Design System Integration

**Fonts:**
- Charter for reading content (matches ReadHighlighter)
- Inter for UI elements (system default)

**Colors:**
- Mark highlights: `#fef08a` (yellow-200)
- Links: `hsl(217, 91%, 60%)` (from clickable-link class)
- Focus: primary color with 20% opacity ring

**Classes:**
- `clickable-link` - For all links (existing in index.css)
- `editable-link` - Added class for editable links
- `not-prose` - Prevents prose typography conflicts
- `whitespace-pre-wrap` - Preserves whitespace like ReadHighlighter

## Performance Optimizations

1. **Memoization:**
   - MarkdownRenderer wrapped in `memo()`
   - `useMemo` for renderedContent computation
   - Only re-renders when props actually change

2. **Debouncing:**
   - 300ms debounce on content updates
   - Reduces parent re-renders
   - Balances responsiveness with efficiency

3. **Key Strategy:**
   - Stable keys based on node index: `node-${idx}`
   - Child keys: `${parentKey}-child-${idx}`
   - Helps React optimize reconciliation

## Limitations & Edge Cases

### Current Limitations:
1. **Node Type Support:** Only Text, Link, Paragraph nodes fully supported
   - Headings, lists, code blocks show as unsupported
   - Can be extended by adding render functions

2. **Link Editing:** Users edit text only, not URLs
   - URL changes require literal mode
   - Could add URL editing in future

3. **Nested Structures:** Limited nesting support
   - Works for paragraph > text/link
   - Deep nesting may need additional logic

4. **Position Sync:** Assumes AST positions match source
   - Parser must provide accurate offsets
   - Misaligned positions cause incorrect edits

### Edge Cases Handled:
- Empty AST: Shows "Empty content" message
- Missing positions: Falls back to text display
- Plain text paste: Strips HTML formatting
- Focus management: Escape key blurs editor
- Debounce cleanup: Timer cancelled on unmount

## Testing Considerations

**Unit Tests:**
- `markdownEdit.ts` functions with various inputs
- Position calculation edge cases
- Link text extraction and replacement

**Integration Tests:**
- Styled vs literal mode switching
- Mark highlights rendering correctly
- Content updates propagating to parent
- Debouncing behavior

**E2E Tests:**
- User typing in editable regions
- Link text editing preserves URLs
- Copy/paste plain text only
- Focus and blur interactions

## Future Enhancements

1. **Extended Node Support:**
   - Headings with proper styling
   - Lists (ordered/unordered)
   - Code blocks with syntax highlighting
   - Images with alt text editing

2. **Advanced Link Editing:**
   - Click to edit URL
   - Link creation from selection
   - Link removal

3. **Performance:**
   - Virtual scrolling for long documents
   - Incremental parsing for large files
   - Web Worker for heavy parsing

4. **UX Improvements:**
   - Visual indicators for editable regions
   - Inline toolbar for formatting
   - Undo/redo support
   - Keyboard shortcuts

## Dependencies

**Required npm packages:**
- `unified` - Markdown processing framework
- `remark-parse` - Markdown to AST parser
- `remark-stringify` - AST to markdown serializer
- `@types/mdast` - TypeScript types for mdast
- `unist-util-visit` - AST traversal utility

**Status:** Dependencies added to package.json, awaiting `npm install` completion.

## Integration Points

This system integrates with:
- **InlineRegionEditor** (Task 3) - Uses EditableContent component
- **markdownParser.ts** (Task 1) - Provides AST with positions
- **ReadHighlighter** - Shares styling and font choices
- **ClozeNote system** - Applies mark highlights

## Summary

The styled mode rendering system provides a sophisticated way to edit markdown with visual styling while maintaining source fidelity. The architecture separates concerns cleanly:

- **MarkdownRenderer**: AST to DOM with editability
- **EditableLink**: Specialized link editing
- **EditableContent**: Mode-aware container with debouncing
- **markdownEdit**: Source markdown manipulation utilities

The system follows existing patterns from ReadHighlighter, uses the project's design system, and provides a solid foundation for inline markdown editing with visual feedback.
