# Text Selection Quick Fixes

## Implementation Guide for Immediate Improvements

These changes can be implemented right now to improve selection behavior while planning the full refactor.

---

## Quick Fix 1: Remove `tabindex="0"` from Links

### Location
`/Users/why/repos/trivium/src/lib/components/reading/ReadHighlighter.tsx`, line 55

### Current Code
```tsx
processed = textWithoutEmptyLinks.replace(/\[([^\]]+)\]\(([^\)]+)\)/g,
  '<a href="$2" class="clickable-link" data-url="$2" tabindex="0">$1</a>'
)
```

### New Code
```tsx
processed = textWithoutEmptyLinks.replace(/\[([^\]]+)\]\(([^\)]+)\)/g,
  '<a href="$2" class="clickable-link" data-url="$2">$1</a>'
)
```

### Also Update Line 70
```tsx
// Current:
return `<a href="${url}" class="clickable-link" data-url="${url}" tabindex="0">${url}</a>`

// New:
return `<a href="${url}" class="clickable-link" data-url="${url}">${url}</a>`
```

### Why This Helps
- `<a>` elements with `href` are already focusable by default
- Explicit `tabindex="0"` increases interaction priority
- Browsers may prioritize link interaction (drag/drop) over text selection
- Removing it makes text selection feel more natural

### Expected Impact
- **Minor improvement** in selection snapping behavior
- Links still fully keyboard accessible
- Links still clickable and focusable
- Text selection becomes slightly more prioritized

---

## Quick Fix 2: Increase Selection Debounce Delay

### Location
`/Users/why/repos/trivium/src/routes/read/[id].tsx`, line 414

### Current Code
```tsx
const handleTextSelection = useCallback(() => {
  // Delay state update to avoid re-renders during active selection
  setTimeout(() => {
    const selection = window.getSelection()
    // ... rest of function
  }, 150) // 150ms debounce
}, [])
```

### New Code
```tsx
const handleTextSelection = useCallback(() => {
  // Delay state update to avoid re-renders during active selection
  setTimeout(() => {
    const selection = window.getSelection()
    // ... rest of function
  }, 250) // 250ms debounce - give browser more time to stabilize
}, [])
```

### Why This Helps
- Gives browser more time to complete selection before React state update
- Reduces interference from React re-renders during selection
- Particularly helps with double-click selection stability

### Expected Impact
- **Minor improvement** in double-click selection visual stability
- Slight delay before toolbar appears (100ms more)
- Better for slower systems or complex selections

---

## Quick Fix 3: Add CSS Selection Hints

### Location
`/Users/why/repos/trivium/src/index.css`, after line 411

### Add This CSS
```css
/* Improved text selection behavior in reading view */
#article-content {
  /* Ensure text selection is encouraged */
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  cursor: text;
}

/* Links should allow text selection */
.clickable-link {
  /* Default cursor is text, changes to pointer on hover */
  cursor: text;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
}

.clickable-link:hover {
  cursor: pointer;
}

/* Ensure selection rendering doesn't break across boundaries */
#article-content span {
  /* Allow selection to flow naturally */
  user-select: text;
}

/* Force selection visibility across all nested elements */
#article-content *::selection {
  background-color: rgba(66, 153, 225, 0.5) !important;
  color: inherit !important;
}

#article-content *::-moz-selection {
  background-color: rgba(66, 153, 225, 0.5) !important;
  color: inherit !important;
}

/* Read text needs higher contrast selection */
.read-text::selection,
.read-text *::selection {
  background-color: rgba(96, 165, 250, 0.7) !important;
  color: white !important;
}

.read-text::-moz-selection,
.read-text *::-moz-selection {
  background-color: rgba(96, 165, 250, 0.7) !important;
  color: white !important;
}
```

### Why This Helps
- Explicitly tells browser that text selection is primary interaction
- Cursor hints: `text` by default, `pointer` on hover over links
- Ensures selection highlighting renders across all nested elements
- Forces consistent selection colors

### Expected Impact
- **Minor to moderate improvement** in visual selection rendering
- Better visual feedback for users
- More consistent behavior across browsers
- Links still fully functional

---

## Quick Fix 4: Use `selectionchange` Event

### Location
`/Users/why/repos/trivium/src/routes/read/[id].tsx`

### Current Approach
```tsx
// Lines 1155-1156
<div
  id="article-content"
  onMouseUp={handleTextSelection}
  onKeyUp={handleTextSelection}
>
```

### New Approach

#### Step 1: Update the handler to not need debounce in the function itself
```tsx
// Around line 385
const handleTextSelection = useCallback(() => {
  // Remove setTimeout from here - we'll debounce the event instead
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) {
    setSelectionInfo(null)
    return
  }

  const container = document.getElementById('article-content')
  if (!container) return

  const range = getSelectionRange(container)
  if (!range) return

  const rect = selection.getRangeAt(0).getBoundingClientRect()

  setSelectionInfo({
    text: selection.toString(),
    start: range.start,
    end: range.end,
    position: {
      x: rect.right,
      y: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    }
  })
}, [])
```

#### Step 2: Add debounced selectionchange listener
```tsx
// Add this new effect somewhere after handleTextSelection definition
useEffect(() => {
  let timeoutId: number | null = null

  const debouncedSelectionHandler = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => {
      handleTextSelection()
    }, 250)
  }

  document.addEventListener('selectionchange', debouncedSelectionHandler)

  return () => {
    document.removeEventListener('selectionchange', debouncedSelectionHandler)
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}, [handleTextSelection])
```

#### Step 3: Remove old event handlers from JSX
```tsx
// Lines 1155-1156 - remove onMouseUp and onKeyUp
<div id="article-content">
  <ReadHighlighter
    content={currentText.content}
    readRanges={readRanges}
    linksEnabled={linksEnabled}
    searchMatches={matches}
    activeSearchIndex={currentIndex}
    onNavigateToIngest={handleNavigateToIngest}
  />
</div>
```

### Why This Helps
- `selectionchange` fires for ALL selection changes (mouse, keyboard, programmatic)
- More accurate than `mouseup` (which misses keyboard selection)
- More accurate than `keyup` (which fires for non-selection keys)
- Event is debounced, so we don't process every intermediate state
- Captures double-click and triple-click selections properly

### Expected Impact
- **Moderate improvement** in capturing all selection types
- Better support for keyboard-based selection
- More reliable double-click and triple-click detection
- Slight performance improvement (fewer unnecessary handler calls)

---

## Quick Fix 5: Prevent React Re-renders During Selection

### Location
`/Users/why/repos/trivium/src/lib/components/reading/ReadHighlighter.tsx`

### Add This Optimization

```tsx
// Add at the top of the file, around line 252
const ReadHighlighterComponent = ({
  content,
  readRanges,
  className,
  linksEnabled = false,
  searchMatches = [],
  activeSearchIndex = -1,
  onNavigateToIngest
}: ReadHighlighterProps) => {
  // Add ref to track if user is currently selecting
  const isSelectingRef = useRef(false)

  useEffect(() => {
    const handleSelectionStart = () => {
      isSelectingRef.current = true
    }

    const handleSelectionEnd = () => {
      // Wait a bit before allowing re-renders
      setTimeout(() => {
        isSelectingRef.current = false
      }, 300)
    }

    document.addEventListener('mousedown', handleSelectionStart)
    document.addEventListener('mouseup', handleSelectionEnd)
    document.addEventListener('touchstart', handleSelectionStart)
    document.addEventListener('touchend', handleSelectionEnd)

    return () => {
      document.removeEventListener('mousedown', handleSelectionStart)
      document.removeEventListener('mouseup', handleSelectionEnd)
      document.removeEventListener('touchstart', handleSelectionStart)
      document.removeEventListener('touchend', handleSelectionEnd)
    }
  }, [])

  // Rest of component...
```

### Why This Helps
- Tracks when user is actively making a selection
- Could be used to defer non-critical updates during selection
- Reduces React re-render interference

### Expected Impact
- **Minor improvement** - mostly preventative
- Better for future optimizations
- Minimal code complexity

---

## Testing Checklist

After implementing these quick fixes, test the following scenarios:

### Single-Click Text Selection
- [ ] Click and drag across plain text
- [ ] Click and drag across text with links
- [ ] Click and drag from before link to after link
- [ ] Click and drag starting inside a link
- [ ] Selection highlight is visible
- [ ] Selection doesn't snap unexpectedly

### Double-Click Word Selection
- [ ] Double-click a word in plain text
- [ ] Double-click a word inside a link
- [ ] Double-click a word next to a link
- [ ] Visual selection highlight appears
- [ ] Selection remains stable (doesn't disappear)
- [ ] Mark creation works with double-click selection

### Triple-Click Paragraph Selection
- [ ] Triple-click in first paragraph
- [ ] Triple-click in middle paragraph
- [ ] Triple-click in last paragraph
- [ ] Expected: Still selects entire content (until full refactor)
- [ ] Visual selection highlight appears

### Link Interaction
- [ ] Links still clickable
- [ ] Alt+click navigation to ingest still works
- [ ] Links still keyboard accessible (Tab to focus, Enter to activate)
- [ ] Link hover shows pointer cursor
- [ ] Link default shows text cursor

### Mark Creation
- [ ] Create cloze mark from selection
- [ ] Create Q&A mark from selection
- [ ] Create basic mark from selection
- [ ] Console shows correct positions
- [ ] Marks appear in sidebar

---

## Expected Results

| Issue | Before | After Quick Fixes | After Full Refactor |
|-------|--------|-------------------|---------------------|
| Selection snaps to links | Frequent | Less frequent | Rare |
| Double-click disappears | Often | Sometimes | Never |
| Triple-click paragraph | Selects all | Selects all | Selects one paragraph |
| Visual rendering broken | Common | Less common | Never |
| Link interaction | Works | Works better | Works perfectly |

---

## Rollback Plan

If any quick fix causes issues:

### Fix 1 (tabindex): Revert lines 55, 70 in ReadHighlighter.tsx
```bash
git diff src/lib/components/reading/ReadHighlighter.tsx
git checkout src/lib/components/reading/ReadHighlighter.tsx  # if needed
```

### Fix 2 (debounce): Change 250 back to 150 in read/[id].tsx

### Fix 3 (CSS): Remove added CSS from index.css

### Fix 4 (selectionchange):
- Remove the useEffect with selectionchange listener
- Re-add onMouseUp and onKeyUp to the div

### Fix 5 (re-render prevention): Remove the useRef and useEffect

---

## Implementation Order

Recommend implementing in this order:

1. **Fix 1** (remove tabindex) - Safest, smallest change
2. **Fix 3** (CSS) - Purely presentational, easy to test
3. **Fix 2** (debounce) - Small change, easy to adjust
4. **Fix 4** (selectionchange) - More involved, test thoroughly
5. **Fix 5** (re-render prevention) - Most complex, implement if others help

Test after each fix to isolate any issues.

---

## Next Steps

After implementing quick fixes:

1. **Monitor user feedback** - Do the quick fixes improve the experience?
2. **Plan full refactor** - See `SELECTION_ISSUE_INVESTIGATION.md` for Option 3
3. **Create feature flag** - For A/B testing new implementation
4. **Implement paragraph structure** - The long-term solution

Quick fixes buy time and improve UX while planning the proper architectural fix.
