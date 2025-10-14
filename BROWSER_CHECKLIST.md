# Browser Debugging Checklist

## Quick Reference for Testing Read Highlighting

### Step 1: Start the Application
```bash
npm run tauri dev
```

### Step 2: Open DevTools
- Press **F12** or **Cmd+Option+I** (Mac) or **Ctrl+Shift+I** (Windows/Linux)
- Go to the **Console** tab

### Step 3: Navigate to a Text Document
- Click on any text in your library
- Or go directly to `/read/1` (or another text ID)

### Step 4: Check Initial Load Logs

Look for these logs in order:
- [ ] `[ReadPage] Loading text and ranges for textId: X`
- [ ] `[Store] getReadRanges called for textId: X`
- [ ] `[Store] Loaded read ranges: { count: N, ... }`
- [ ] `[ReadPage] readRanges in state changed: { count: N, ... }`
- [ ] `[ReadHighlighter] readRanges changed: { count: N, ... }`

**What to check:**
- Is the count > 0? (If yes, data is loading)
- Do the ranges look correct? (Check startPosition/endPosition)

### Step 5: Select and Mark Text as Read

1. Select some text with your mouse
2. Click "Mark as Read" from the context menu

Look for these logs:
- [ ] `[Store] markRangeAsRead called: { textId: X, startPosition: Y, endPosition: Z }`
- [ ] `[Store] API call successful, fetching updated ranges...`
- [ ] `[Store] Loaded read ranges: { count: N+1, ... }`
- [ ] `[Store] markRangeAsRead completed successfully`

**What to check:**
- Did the API call succeed?
- Did the count increase?
- Are the new ranges showing up?

### Step 6: Check Segment Computation

After marking text as read, look for:
- [ ] `[ReadHighlighter] Computing segments...`
- [ ] `[ReadHighlighter] Processing N read ranges`
- [ ] `[ReadHighlighter] Generated segments: { totalSegments: X, readSegments: Y, ... }`

**What to check:**
- Is `readSegments > 0`?
- Do the segment positions match your selection?
- Check the `segments` array details for correct `isRead` values

### Step 7: Check Rendering

Look for these logs (there will be one per segment):
- [ ] `[ReadHighlighter] Rendering segment 0: { isRead: true/false, ... }`
- [ ] `[ReadHighlighter] Rendering segment 1: { isRead: true/false, ... }`

**What to check:**
- Are segments with `isRead: true` being rendered?
- Do they have the correct classes: `"bg-black text-white dark:bg-white dark:text-black"`?
- Do they have inline styles: `{ backgroundColor: 'black', color: 'white' }`?

### Step 8: Inspect the DOM

1. Go to the **Elements** tab in DevTools
2. Find `<div id="article-content">`
3. Expand to see the `<span>` elements

**Check each span:**
- [ ] Does it have `data-is-read="true"` or `data-is-read="false"`?
- [ ] Does it have `data-segment-index="N"`?
- [ ] For `data-is-read="true"` spans:
  - [ ] Class: `bg-black text-white` (or dark variant)
  - [ ] Inline style: `background-color: black; color: white;`

### Step 9: Check Computed Styles

1. Right-click on a span with `data-is-read="true"`
2. Choose "Inspect"
3. Look at the **Styles** tab
4. Look at the **Computed** tab

**In the Styles tab:**
- [ ] Are the classes listed (`bg-black`, `text-white`)?
- [ ] Are any styles crossed out (indicating they're overridden)?
- [ ] Is the inline style visible?

**In the Computed tab:**
- [ ] What is the `background-color`? (Should be `rgb(0, 0, 0)` for black)
- [ ] What is the `color`? (Should be `rgb(255, 255, 255)` for white)
- [ ] If these are wrong, click the arrow to see which rule is setting them

### Step 10: Test the Visual Result

**Question: Can you SEE the highlighting?**

- **YES, I can see black background with white text:**
  - Success! The highlighting is working
  - Remove the debug logs (see cleanup section below)

- **NO, but inline styles are in the DOM:**
  - There's a CSS override
  - Look for `!important` rules
  - Check if parent containers have `background-color` set
  - Check if `.prose` styles are conflicting

- **NO, and inline styles aren't in the DOM:**
  - The segments aren't being rendered correctly
  - Check the segment computation logs
  - Are `readSegments > 0`?

- **NO, and no segments with `isRead: true`:**
  - The ranges aren't being computed into segments
  - Check if ranges are within the content bounds
  - Check the range positions vs content length

## Quick Diagnostic Decision Tree

```
Can you see highlighting?
├─ YES → Success! Remove debug logs
│
└─ NO
   ├─ Are inline styles in the DOM?
   │  ├─ YES → CSS specificity issue
   │  │         → Check for overrides
   │  │         → Use inline styles permanently
   │  │
   │  └─ NO → Rendering issue
   │     ├─ Are segments with isRead:true being rendered?
   │     │  ├─ YES → Style attribute not being set
   │     │  │         → Check React rendering
   │     │  │
   │     │  └─ NO → Segment computation issue
   │     │     ├─ Are readSegments > 0?
   │     │     │  ├─ YES → Filtering issue
   │     │     │  │         → Check map function
   │     │     │  │
   │     │     │  └─ NO → Range computation issue
   │     │     │     ├─ Are ranges loaded?
   │     │     │     │  ├─ YES → Check positions
   │     │     │     │  │         → vs content length
   │     │     │     │  │
   │     │     │     │  └─ NO → Data loading issue
   │     │     │     │            → Check API/database
```

## Common Issues and Fixes

### Issue: Inline styles work, but classes don't
**Diagnosis:** Tailwind configuration issue
**Fix:**
1. Keep the inline styles as the solution
2. Or fix `tailwind.config.js` to include the component files

### Issue: Nothing works, even inline styles
**Diagnosis:** CSS override with `!important` or parent container issue
**Fix:**
1. Search for `background-color` in CSS with `!important`
2. Check if `.prose` or `article` has forced styles
3. Try adding `!important` to inline styles:
   ```tsx
   style={segment.isRead ? {
     backgroundColor: 'black !important',
     color: 'white !important'
   } : {}}
   ```

### Issue: Ranges loaded but readSegments: 0
**Diagnosis:** Range positions outside content bounds
**Fix:**
1. Log `content.length` and compare to range positions
2. Check if ranges are from a different version of the text
3. Clear and recreate the read ranges

### Issue: Console shows errors
**Diagnosis:** JavaScript/React error preventing rendering
**Fix:**
1. Look for red error messages in console
2. Fix the error (likely in ReadHighlighter.tsx)
3. Check if there are type mismatches

## Cleanup After Debugging

Once the issue is fixed, remove debug logs:

```bash
# Search for debug logs
grep -r "console.log.*\[ReadPage\]" src/
grep -r "console.log.*\[ReadHighlighter\]" src/
grep -r "console.log.*\[Store\]" src/
```

Remove:
1. All `console.log` statements added for debugging
2. Optionally keep `data-is-read` and `data-segment-index` for testing
3. Remove inline styles if Tailwind classes are working
4. Remove this checklist and debug docs if no longer needed

## Files Modified

- `/Users/why/repos/trivium/src/lib/components/reading/ReadHighlighter.tsx`
- `/Users/why/repos/trivium/src/lib/stores/reading.ts`
- `/Users/why/repos/trivium/src/routes/read/[id].tsx`

## Related Documentation

- `DEBUG_GUIDE.md` - Detailed debugging instructions
- `DEBUGGING_SUMMARY.md` - Summary of changes and what they reveal
