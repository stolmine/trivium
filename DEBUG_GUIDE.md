# Debug Logging Guide for Read Highlighting Issue

## Overview
Debug logging has been added throughout the read highlighting system to help diagnose why the styling isn't showing up.

## Files Modified

### 1. `/Users/why/repos/trivium/src/lib/components/reading/ReadHighlighter.tsx`
**Logging Added:**
- `useEffect` to log when `readRanges` prop changes (logs count, ranges, and content length)
- Console logs in `useMemo` when computing segments:
  - When no read ranges exist
  - Processing and sorting ranges
  - Merged ranges after overlaps are combined
  - Generated segments with detailed info (total, read, unread counts + preview)
- `useEffect` to log rendering info
- Console log for each segment during render (isRead, text length, preview, classes, inline styles)
- Added inline styles as fallback: `style={segment.isRead ? { backgroundColor: 'black', color: 'white' } : {}}`
- Added data attributes: `data-is-read` and `data-segment-index` for DOM inspection

### 2. `/Users/why/repos/trivium/src/lib/stores/reading.ts`
**Logging Added:**
- `markRangeAsRead`: Logs when called (textId, positions), API success, and completion
- `getReadRanges`: Logs when called, loaded ranges (count, ranges, textId), and state update

### 3. `/Users/why/repos/trivium/src/routes/read/[id].tsx`
**Logging Added:**
- Initial load: Logs textId being loaded
- After text load: Logs when fetching ranges and paragraphs
- `useEffect` to log when `readRanges` state changes
- Pre-render log: Shows readRanges being passed to component

## How to Use This Debug Info

### Step 1: Open Browser DevTools Console
Open the application and navigate to a text that has been read. Open the browser's developer console (F12 or Cmd+Option+I).

### Step 2: Check the Console Logs in Order

Look for this sequence of logs:

1. **Page Load:**
   ```
   [ReadPage] Loading text and ranges for textId: X
   [ReadPage] Text loaded, fetching ranges and paragraphs...
   ```

2. **Store Fetching Data:**
   ```
   [Store] getReadRanges called for textId: X
   [Store] Loaded read ranges: { count: N, ranges: [...], textId: X }
   [Store] State updated with read ranges
   ```

3. **State Update:**
   ```
   [ReadPage] readRanges in state changed: { count: N, ranges: [...] }
   ```

4. **Component Rendering:**
   ```
   [ReadPage] Rendering with readRanges: { count: N, ranges: [...], contentLength: XXX }
   [ReadHighlighter] readRanges changed: { count: N, ranges: [...], contentLength: XXX }
   [ReadHighlighter] Computing segments...
   [ReadHighlighter] Processing N read ranges
   [ReadHighlighter] Sorted ranges: [...]
   [ReadHighlighter] Merged ranges: [...]
   [ReadHighlighter] Generated segments: { totalSegments: X, readSegments: Y, unreadSegments: Z, segments: [...] }
   [ReadHighlighter] Rendering with segments: { totalSegments: X, readSegments: Y, unreadSegments: Z }
   [ReadHighlighter] Rendering segment 0: { isRead: false/true, textLength: X, textPreview: "...", classes: "...", style: {...} }
   ...
   ```

### Step 3: Verify the Data Flow

**Check each stage:**

1. **Are ranges being loaded?**
   - Look for `[Store] Loaded read ranges` - does it show ranges?
   - If count is 0, the data isn't in the database

2. **Are ranges reaching the component?**
   - Look for `[ReadHighlighter] readRanges changed` - does it show the same ranges?
   - If not, there's a prop passing issue

3. **Are segments being computed correctly?**
   - Look for `[ReadHighlighter] Generated segments` - does it show `readSegments > 0`?
   - Check the segment details to see if `isRead: true` is set correctly

4. **Are segments being rendered?**
   - Look for multiple `[ReadHighlighter] Rendering segment X` logs
   - Check if segments with `isRead: true` show the correct classes and inline styles

### Step 4: Inspect the DOM

In DevTools, use the Elements inspector:

1. **Find the article-content div:**
   ```html
   <div id="article-content" class="whitespace-pre-wrap not-prose">
   ```

2. **Look for span elements:**
   - Each segment should be a `<span>` element
   - Check the `data-is-read` attribute
   - Check the `data-segment-index` attribute

3. **Inspect a "read" segment:**
   - Should have `data-is-read="true"`
   - Should have class: `bg-black text-white dark:bg-white dark:text-black`
   - Should have inline style: `background-color: black; color: white;`

4. **Check computed styles:**
   - Right-click a span with `data-is-read="true"` → Inspect
   - Look at the "Computed" tab
   - Check if `background-color` is black and `color` is white
   - If not, check the "Styles" tab for CSS conflicts

### Step 5: Check for CSS Issues

**Possible issues:**

1. **Tailwind classes not generated:**
   - If inline styles work but classes don't, Tailwind isn't generating these utilities
   - Check if `tailwind.config.js` includes the component files

2. **CSS specificity conflict:**
   - Another style might be overriding the background
   - Look for any `.prose` or article-specific styles
   - Check if `not-prose` is working

3. **Dark mode detection:**
   - The classes use `dark:` variants
   - Check if dark mode is active when it shouldn't be (or vice versa)

### Step 6: Test the Inline Styles Workaround

The component now includes inline styles as a fallback:
```typescript
style={segment.isRead ? { backgroundColor: 'black', color: 'white' } : {}}
```

- If the inline styles work, it's a CSS class issue (Tailwind config or specificity)
- If the inline styles don't work, there's a more fundamental CSS problem (maybe `!important` overrides)

## Common Issues to Look For

### Issue 1: No Read Ranges in Database
**Symptoms:** `[Store] Loaded read ranges: { count: 0, ranges: [], textId: X }`
**Solution:** Make sure you've selected text and marked it as read

### Issue 2: Ranges Not Computing Segments
**Symptoms:** `readSegments: 0` in generated segments
**Solution:** Check the range positions are within the content length

### Issue 3: Tailwind Not Generating Classes
**Symptoms:** Inline styles work, but classes don't
**Solution:** Check `tailwind.config.js` content paths include the component

### Issue 4: CSS Override
**Symptoms:** Styles appear in DevTools but are crossed out
**Solution:** Remove conflicting styles or increase specificity

### Issue 5: Wrong Dark Mode
**Symptoms:** Using dark variant when in light mode (or vice versa)
**Solution:** Check dark mode detection logic

## Next Steps After Debugging

Based on what you find:

1. **If data isn't loading:** Check the backend API and database
2. **If segments aren't computing:** Fix the range calculation logic
3. **If classes aren't applying:** Fix Tailwind configuration
4. **If CSS is conflicting:** Adjust specificity or remove conflicts
5. **If inline styles work:** Remove Tailwind classes and use inline styles

## Removing Debug Logs

Once the issue is fixed, search for these prefixes to remove logs:
- `console.log('[ReadPage]`
- `console.log('[ReadHighlighter]`
- `console.log('[Store]`

You can also remove:
- The inline `style` attributes (keep only classes)
- The `data-is-read` and `data-segment-index` attributes (unless you want to keep them for testing)
