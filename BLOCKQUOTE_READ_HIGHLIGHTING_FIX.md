# Blockquote + Read Highlighting Fix

## Status

✅ **Implementation Complete**
✅ **Build Successful** (no errors or warnings)
✅ **Ready for Testing**

## Problem Statement

When marking a partial segment of a multi-line blockquote as read, that segment got removed from the blockquote visual structure. The blockquote would break into multiple separate blockquotes.

### Root Cause

Each segment independently called `formatBlockquotes()` which converts `> text` to `<blockquote>text</blockquote>`. When a multi-line blockquote was split across read/unread segments:

```
Segment 1 (unread): > Line 1 → <blockquote>Line 1</blockquote>
Segment 2 (read):   > Line 2 → <blockquote>Line 2</blockquote> (wrapped in read span)
Segment 3 (unread): > Line 3 → <blockquote>Line 3</blockquote>
```

This created THREE separate blockquotes instead of ONE continuous blockquote.

## Solution

### Approach: Format Blockquotes ONCE, Then Apply Highlighting

Instead of formatting blockquotes per segment, we:

1. **Render each segment** with links and headers processed, but NOT blockquotes
2. **Concatenate all segments** with their read/excluded styling applied via `<mark>` tags
3. **Format blockquotes ONCE** on the complete result

This ensures the blockquote markdown (`> text`) is converted to HTML as a single unit, maintaining continuous visual structure.

### Key Changes

#### File: `/Users/why/repos/trivium/src/lib/components/reading/ReadHighlighter.tsx`

1. **Removed** `renderTextWithLinks()` function that formatted blockquotes per segment

2. **Added** `renderTextSegmentWithoutBlockquoteFormatting()` function:
   - Processes headers via `formatWikipediaHeaders()`
   - Processes markdown links
   - **Does NOT** call `formatBlockquotes()`
   - Returns HTML with links and headers formatted, but blockquote markers (`>`) preserved

3. **Updated** `finalHtml` useMemo:
   ```typescript
   const finalHtml = useMemo(() => {
     let result = ''

     // Render each segment WITHOUT blockquote formatting
     for (const segment of renderableSegments) {
       const segmentHtml = renderTextSegmentWithoutBlockquoteFormatting(segment.text, linksEnabled)

       // Apply read/excluded styling
       if (segment.isRead) {
         result += `<mark class="read-range">${segmentHtml}</mark>`
       } else {
         result += segmentHtml
       }
     }

     // Format blockquotes ONCE on entire result
     return formatBlockquotes(result)
   }, [renderableSegments, linksEnabled])
   ```

#### File: `/Users/why/repos/trivium/src/index.css`

Added styling for `mark.read-range` and `mark.read-range-auto`:

```css
/* Manual read ranges - solid styling */
mark.read-range {
  background-color: black;
  color: white;
  border-radius: 2px;
  padding: 0 2px;
}

/* Auto-completed read ranges - lighter styling */
mark.read-range-auto {
  background-color: rgb(156 163 175); /* gray-400 */
  color: rgb(55 65 81); /* gray-700 */
  border-radius: 2px;
  padding: 0 2px;
  opacity: 0.7;
}
```

## Benefits

1. **Blockquote visual continuity** - Multi-line blockquotes remain as single visual blocks
2. **Read highlighting works** - `<mark>` tags are inline and don't break block structure
3. **Performance** - `formatBlockquotes()` runs once instead of per-segment
4. **Cleaner HTML** - Single blockquote element instead of fragmented ones

## Example

### Before (Broken)

```html
<blockquote>Line 1</blockquote>
<span class="bg-black text-white">
  <blockquote>Line 2</blockquote>
</span>
<blockquote>Line 3</blockquote>
```

Renders as: **3 separate blockquotes**

### After (Fixed)

```html
<blockquote>
  Line 1<br>
  <mark class="read-range">Line 2</mark><br>
  Line 3
</blockquote>
```

Renders as: **1 continuous blockquote** with Line 2 highlighted

## Testing

See `/Users/why/repos/trivium/TEST_BLOCKQUOTE.md` for test instructions.

### Test Case

1. Create a multi-line blockquote:
   ```
   > Line 1
   > Line 2
   > Line 3
   ```

2. Mark only Line 2 as read

3. Verify:
   - ✅ All three lines appear as ONE blockquote
   - ✅ Line 2 has black background / white text
   - ✅ Lines 1 and 3 have normal blockquote styling
   - ✅ Border-left is continuous (not broken)

## Related Files

- `/Users/why/repos/trivium/src/lib/components/reading/ReadHighlighter.tsx` - Main implementation
- `/Users/why/repos/trivium/src/index.css` - Styling for `<mark>` tags
- `/Users/why/repos/trivium/TEST_BLOCKQUOTE.md` - Test document

## Notes

- The fix uses `<mark>` tags which are semantic HTML for highlighting
- `<mark>` is inline and doesn't break block-level structures like `<blockquote>`
- Auto-completed ranges use lighter styling (gray) vs manual ranges (black/white)
- Search highlighting still works and overrides read styling when present
