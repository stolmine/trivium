# Quick Reference: Sidebar Progress Update Issue

## The Problem
Sidebar percentages don't update immediately when marking/unmarking text in the reading view, but do update after a hard refresh (adding new article).

## Root Cause in One Sentence
The progress hook uses a **60-second non-reactive cache** with no mechanism to notify components when the cache is cleared.

## Key Files

### Where the Issue Lives
1. **Cache System** → `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts:4-6`
   - Lines 4-6: `progressCache` and `folderProgressCache` Maps
   - Line 6: `CACHE_DURATION_MS = 60000` (60 seconds)

2. **Sidebar Display** → `/Users/why/repos/trivium/src/components/library/TextNode.tsx:20`
   - Line 20: `const { progress } = useTextProgress(text.id);`
   - Line 70-74: Shows percentage if progress > 0

3. **Attempted Fix** → `/Users/why/repos/trivium/src/lib/stores/reading.ts:99,114`
   - Line 99: `invalidateProgressCache(textId);` in markRangeAsRead
   - Line 114: `invalidateProgressCache(textId);` in unmarkRangeAsRead

### Execution Flow
```
User marks text (Ctrl+M)
  ↓
TextSelectionMenu.handleToggleRead() [TextSelectionMenu.tsx:23]
  ↓
useReadingStore.markRangeAsRead() [reading.ts:94]
  ├→ Backend API call [reading.rs]
  ├→ Fetch updated ranges
  ├→ Calculate progress
  └→ Call invalidateProgressCache() [reading.ts:99]
       └→ Delete from Map [useTextProgress.ts:80]
            └→ BUT: Components still have stale useState value!
                   └→ useEffect([textId]) didn't re-run!
  ↓
Sidebar TextNode still shows old progress % [TextNode.tsx:70-74]
  ├→ Hook only has useEffect([textId])
  ├→ Since textId didn't change, effect doesn't re-run
  └→ Component still has stale state.progress value from before
```

## Why Hard Refresh Works
When you add a new article:
1. LibraryTree calls loadLibrary() [LibraryTree.tsx:37]
2. New Text objects created in library store
3. TextNode components remount with new objects
4. useTextProgress effect runs with NEW textId reference
5. Either: cache expired OR new article has no cache entry
6. Fresh progress fetched and displayed

## The 0% Display Requirement
**Status: WORKING CORRECTLY** ✓

Both TextNode and FolderNode check `progress > 0` before displaying percentage:
- TextNode.tsx:70 - `{progress !== null && progress > 0 && ...}`
- FolderNode.tsx:93 - `{progress !== null && progress > 0 && ...}`

Result: 0% articles don't show percentage (correct behavior)

## Minimal Fix
Change the progress hook to use Zustand (reactive) instead of plain Map (non-reactive):

```typescript
// BEFORE: Non-reactive Map cache
const progressCache = new Map();
invalidateProgressCache(textId) { progressCache.delete(textId); } // No notification!

// AFTER: Reactive Zustand store
const useProgressStore = create((set) => ({
  progress: new Map(),
  invalidate: (textId) => set(state => {
    const newMap = new Map(state.progress);
    newMap.delete(textId);
    return { progress: newMap };
  })
}));
```

Then in useTextProgress hook:
```typescript
// OLD
const cached = progressCache.get(textId);

// NEW  
const { progress: progressMap } = useProgressStore();
const cached = progressMap.get(textId);
```

This way, when `invalidate()` is called, all components using the store re-render.

## Files to Investigate/Modify

| Priority | File | Lines | Action |
|----------|------|-------|--------|
| 1 | `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts` | 4-86 | Refactor cache system to be reactive |
| 2 | `/Users/why/repos/trivium/src/lib/stores/reading.ts` | 99, 114 | Update to use new cache system |
| 3 | `/Users/why/repos/trivium/src/components/library/TextNode.tsx` | 20 | No changes needed (just check after fixing hook) |
| 4 | `/Users/why/repos/trivium/src/components/library/FolderNode.tsx` | 25 | No changes needed (just check after fixing hook) |

## Testing Checklist After Fix

- [ ] Mark text → Sidebar percentage updates immediately
- [ ] Unmark text → Sidebar percentage updates immediately  
- [ ] Mark text in folder → Folder percentage updates immediately
- [ ] Unmark text in folder → Folder percentage updates immediately
- [ ] Navigate to new article → Progress shows correctly
- [ ] 0% articles don't show percentage
- [ ] 1-99% articles show percentage
- [ ] 100% articles show percentage
- [ ] Hard refresh still works (adding new article)
- [ ] Cache still works (no unnecessary API calls within same session)

## Performance Note
Cache is important! Progress calculation is expensive:
1. Query text content length
2. Calculate excluded character count (regex)
3. Calculate header character count (regex)
4. Query all read_ranges from database
5. Merge overlapping ranges
6. Calculate percentage

60-second cache prevents hammering the backend. The fix should maintain caching while fixing reactivity.
