# Mark Text as Read - Debugging Summary

This folder contains comprehensive documentation for debugging the "mark text as read" feature execution path.

## Documents Included

1. **EXECUTION_PATH_DEBUG.md** - Comprehensive 13-section analysis
   - Complete execution chain with file paths and line numbers
   - Detailed explanation of each component
   - Failure point analysis
   - Testing checklist

2. **EXECUTION_CHAIN_DIAGRAM.md** - Quick reference visual guide
   - ASCII flow diagram of execution
   - Critical functions table
   - Global state variables
   - Debugging decision tree
   - Async vs sync breakdown

3. **DEBUG_CONSOLE_LOGS.md** - Practical debugging guide
   - Copy-paste ready console.log statements
   - Exact file locations and line numbers
   - Expected console output
   - Troubleshooting specific issues

## Quick Start

### To Verify the Feature Works:
1. Open a text in the app
2. Select some text and press Ctrl+M (or use context menu)
3. Check browser console (F12) for the logs already present in TextSelectionMenu.tsx

### To Debug Issues:

1. **Progress doesn't update?**
   - Check EXECUTION_CHAIN_DIAGRAM.md section "If Progress Doesn't Update"
   - Add console logs from DEBUG_CONSOLE_LOGS.md
   - Run through the debugging checklist

2. **Keyboard shortcut doesn't work?**
   - Check EXECUTION_CHAIN_DIAGRAM.md section "If Keyboard Shortcut Doesn't Work"
   - Verify Ctrl+M is being caught (should see logs in console)
   - Check if selection exists on page

3. **Cache not invalidating?**
   - Add logs to reading.ts:99 and useTextProgress.ts:14
   - Verify notifyCacheInvalidation is called
   - Check how many listeners are registered

## Key Files & Line Numbers

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Keyboard Trigger | TextSelectionMenu.tsx | 85-87 | Listen for Ctrl+M |
| Mark Handler | TextSelectionMenu.tsx | 23-69 | Calculate positions & call store |
| Store Function | reading.ts | 94-107 | Persist & invalidate cache |
| **CRITICAL** | reading.ts | 99, 114 | Call invalidateProgressCache |
| Cache Clear | useTextProgress.ts | 114-117 | Delete cache entry |
| Notify | useTextProgress.ts | 12-15 | Call all listeners |
| Subscribe | useTextProgress.ts | 29-35 | Setup listener on hook mount |
| Fetch | useTextProgress.ts | 37-64 | Re-fetch on refreshTrigger change |
| Display | TextNode.tsx | 20, 70-74 | Show progress % |
| Display | FolderNode.tsx | 25, 112-116 | Show folder progress % |

## Execution Flow Summary

```
User Action (Ctrl+M or Click)
    ↓
TextSelectionMenu:handleToggleRead()
    ↓
reading:markRangeAsRead() [ASYNC API call]
    ↓
reading:invalidateProgressCache() [SYNC - LINE 99]
    ↓
useTextProgress:notifyCacheInvalidation() [SYNC]
    ↓
Call all listeners [SYNC]
    ↓
setRefreshTrigger++ [SYNC]
    ↓
useTextProgress hook effect triggered [useEffect]
    ↓
api.reading.calculateProgress() [ASYNC]
    ↓
Component re-render with new progress
```

## Already Present Debug Logging

TextSelectionMenu.tsx already has excellent debug logging at lines 44-54:
```typescript
console.log('=== TextSelectionMenu: handleToggleRead ===')
console.log('Article DOM length:', articleElement.textContent?.length)
console.log('Article innerHTML sample (first 200 chars):', ...)
console.log('Article textContent sample (first 200 chars):', ...)
console.log('Selected text:', ...)
console.log('Selected text length:', ...)
console.log('Calculated positions:', { startPosition, endPosition })
console.log('Text at positions in DOM:', ...)
console.log('Does selected text match DOM text at positions?', ...)
```

This helps verify position calculation is correct.

## Most Likely Issues

1. **API call fails silently**
   - Check Network tab in DevTools
   - Check Tauri backend logs
   - Add error logging to api.reading.markRangeAsRead()

2. **No listeners subscribed**
   - TextNode components not rendering in library
   - useTextProgress not being called
   - Components unmounting during invalidation

3. **Position calculation wrong**
   - Check TextSelectionMenu logs (already present)
   - Verify article element's textContent matches browser selection
   - Check if HTML parsing is affecting positions

4. **Cache not being invalidated**
   - reading.ts line 99 not being reached
   - Exception being thrown and caught
   - invalidateProgressCache import broken

## Testing Procedure

### Manual Test:
1. Go to /read/{textId}
2. Select some text (visible in TextSelectionMenu logs)
3. Press Ctrl+M
4. Check console for TextSelectionMenu logs
5. Check if progress % updates in library view

### Automated Verification:
1. Run TypeScript compiler: `tsc --noEmit`
2. Check all imports resolve
3. Verify line numbers haven't shifted
4. Check hook dependency arrays

### With Debug Logs Added:
1. Follow procedure in DEBUG_CONSOLE_LOGS.md
2. Mark some text
3. Verify ALL console logs appear in expected order
4. Check for any error messages

## Common Debugging Mistakes

1. **Checking wrong location in store**
   - Make sure checking reading.ts, not another store file

2. **Assuming hooks always run**
   - useTextProgress must be called in a rendered component
   - Component must be visible in DOM

3. **Cache timing issues**
   - Cache has 60 second TTL (CACHE_DURATION_MS)
   - Rapid marks might use cached value

4. **Scope issues with closure**
   - Listener callbacks capture textId in closure
   - Make sure correct textId passed to functions

## Related Files

These files are NOT directly involved but might be related:
- `/Users/why/repos/trivium/src/lib/utils/tauri.ts` - API wrapper
- `/Users/why/repos/trivium/src/lib/components/reading/index.ts` - Component exports
- `/Users/why/repos/trivium/src/lib/stores/index.ts` - Store exports
- `/Users/why/repos/trivium/src/routes/read/index.tsx` - Reading route context

## Version Information

This documentation reflects the codebase state after Phase 8 Polish commit.
Core logic has been stable since Phase 6 with cache invalidation system.

## Questions to Answer When Debugging

1. Is handleToggleRead being called?
2. Is invalidateProgressCache being called?
3. Are listeners being notified?
4. Is the progress fetch effect running?
5. Is the API call succeeding?
6. Is setProgress being called with new value?
7. Are components re-rendering?
8. Is the new progress visible in UI?

Answer these 8 questions in order and you'll find the issue.

