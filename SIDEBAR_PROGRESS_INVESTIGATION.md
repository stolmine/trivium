# Reading Progress Update Investigation Report

## Executive Summary
The sidebar article progress percentages don't update immediately after mark/unmark actions in the reading view due to a **60-second client-side cache** combined with the **progress hook only being triggered on component mount** (not on data changes). When a new article is added, it forces a library reload, which invalidates the cache and refreshes the component, causing the display to update.

## Problem Analysis

### Issue 1: Progress Display Not Updating Immediately

**Root Cause:** 60-second client-side cache with no invalidation on mark/unmark

**Data Flow for Mark/Unmark Action:**
1. User marks/unmarks text in reading view
2. `TextSelectionMenu.handleToggleRead()` triggered (line 23-68)
3. Calls `markRangeAsRead()` or `unmarkRangeAsRead()` from reading store
4. Backend updates database with mark/unmark ranges
5. Reading store invalidates cache via `invalidateProgressCache(textId)` (line 99, 114)
6. BUT: The sidebar component that shows the progress percentage reads from a DIFFERENT cache

**Current Cache Mechanism:**

File: `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts`

```typescript
const progressCache = new Map<number, { progress: number; timestamp: number }>();
const folderProgressCache = new Map<string, { progress: number; timestamp: number }>();
const CACHE_DURATION_MS = 60000; // 60 seconds!

export function useTextProgress(textId: number | null) {
  const [progress, setProgress] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (textId === null) {
      setProgress(null);
      return;
    }

    const cached = progressCache.get(textId);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
      setProgress(cached.progress); // Returns stale cache!
      return;
    }
    
    // Only fetches if cache is expired (60 seconds old)
    setIsLoading(true);
    api.reading
      .calculateProgress(textId)
      .then((calculatedProgress) => {
        progressCache.set(textId, { progress: calculatedProgress, timestamp: now });
        setProgress(calculatedProgress);
        setIsLoading(false);
      })
  }, [textId]); // Only depends on textId!

  return { progress, isLoading };
}

export function invalidateProgressCache(textId: number) {
  progressCache.delete(textId); // Called but not affecting sidebar!
}
```

### Issue 2: Sidebar Component Not Re-rendering on Mark/Unmark

**Problem:** The sidebar progress updates are triggered in reading store but the sidebar components don't re-render

**Data Flow:**

1. **Reading View** (`/Users/why/repos/trivium/src/routes/read/[id].tsx`):
   - Uses `useReadingStore()` to access reading progress
   - Calls `markRangeAsRead()` / `unmarkRangeAsRead()` 
   - These call `invalidateProgressCache(textId)` (line 99, 114 in reading.ts)

2. **Sidebar Components** (`TextNode` and `FolderNode`):
   - Use `useTextProgress(text.id)` hook
   - Hook only refetches on `textId` change (dependency array: `[textId]`)
   - Since `textId` doesn't change, effect doesn't re-run
   - Component displays stale cached progress

### Issue 3: Why It Works After Hard Refresh

When you add a new article or navigate between articles:
1. `loadLibrary()` is called in LibraryTree.tsx (line 37)
2. This fetches fresh text list from backend
3. All texts are new objects in memory
4. TextNode components re-render with new Text objects
5. `useTextProgress` hook runs again (dependency: textId)
6. Since textId changed or is new, cache is accessed fresh
7. OR cache was cleared during that time

## Data Flow Diagram: Complete Mark/Unmark Lifecycle

```
READING VIEW (User Action)
├─ User selects text and presses Ctrl+M or right-click → "Toggle Read"
├─ Location: /Users/why/repos/trivium/src/lib/components/reading/TextSelectionMenu.tsx:23-69
│
└─→ TextSelectionMenu.handleToggleRead()
    ├─ Gets selection from DOM
    ├─ Calculates startPosition and endPosition in rendered text
    ├─ Checks if range is excluded or already marked
    │
    └─→ useReadingStore.markRangeAsRead() OR unmarkRangeAsRead()
        │ Location: /Users/why/repos/trivium/src/lib/stores/reading.ts:94-122
        │
        ├─→ api.reading.markRangeAsRead(textId, startPos, endPos)
        │   │ Tauri Bridge: /Users/why/repos/trivium/src/lib/utils/tauri.ts:68-74
        │   │
        │   └─→ Backend Command: mark_range_as_read()
        │       │ Location: /Users/why/repos/trivium/src-tauri/src/commands/reading.rs:11-39
        │       │
        │       └─ Database: INSERT INTO read_ranges VALUES (...)
        │
        ├─→ get().getReadRanges(textId)
        │   └─ Fetches updated read ranges from database
        │
        ├─→ get().calculateProgress(textId)
        │   └─ Updates store.totalProgress (shown in header)
        │
        └─→ invalidateProgressCache(textId)
            │ Location: /Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts:80-82
            │
            └─ progressCache.delete(textId)
               └─ ISSUE: This cache is separate from sidebar cache!

═════════════════════════════════════════════════════════════════════════════════

SIDEBAR (Should Update But Doesn't)
├─ LibraryTree Component
│  └─ Location: /Users/why/repos/trivium/src/components/library/LibraryTree.tsx:33-134
│
├─→ TextNode (for articles)
│   ├─ Location: /Users/why/repos/trivium/src/components/library/TextNode.tsx
│   ├─ Line 20: const { progress } = useTextProgress(text.id)
│   │
│   ├─→ useTextProgress Hook Called
│   │   │ Location: /Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts:8-42
│   │   │
│   │   └─ useEffect([textId]) runs ONLY if textId changes
│   │       └─ textId hasn't changed! Still the same article
│   │
│   └─ Line 70-74: Displays progress percentage (if progress > 0)
│      └─ Shows STALE value from progressCache
│
└─→ FolderNode (for folders)
    ├─ Location: /Users/why/repos/trivium/src/components/library/FolderNode.tsx
    ├─ Line 25: const { progress } = useFolderProgress(folder.id)
    │
    ├─→ useFolderProgress Hook Called
    │   │ Location: /Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts:44-78
    │   │
    │   └─ useEffect([folderId]) runs ONLY if folderId changes
    │       └─ folderId hasn't changed! Still the same folder
    │
    └─ Line 93-97: Displays progress percentage (if progress > 0)
       └─ Shows STALE value from folderProgressCache
```

## Code Locations - Detailed Breakdown

### 1. Progress Cache System
**File:** `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts`

| Line | Code | Purpose |
|------|------|---------|
| 4 | `const progressCache = new Map<number, { progress: number; timestamp: number }>();` | Main progress cache for articles |
| 5 | `const folderProgressCache = new Map<string, { progress: number; timestamp: number }>();` | Progress cache for folders |
| 6 | `const CACHE_DURATION_MS = 60000;` | Cache expiration: 60 seconds |
| 8-42 | `export function useTextProgress(textId)` | Hook to fetch/cache text progress |
| 18-23 | Cache lookup logic | Returns stale cache if exists and not expired |
| 80-82 | `export function invalidateProgressCache(textId)` | Manually invalidate specific article cache |
| 84-86 | `export function invalidateFolderProgressCache(folderId)` | Manually invalidate specific folder cache |

### 2. Mark/Unmark Trigger Points

**File:** `/Users/why/repos/trivium/src/lib/components/reading/TextSelectionMenu.tsx`

| Line | Code | Purpose |
|------|------|---------|
| 23 | `const handleToggleRead = () => {` | Main mark/unmark handler |
| 26-42 | Selection processing | Gets DOM selection and calculates positions |
| 62-66 | Toggle logic | Calls unmarkRangeAsRead or markRangeAsRead |

**File:** `/Users/why/repos/trivium/src/lib/stores/reading.ts`

| Line | Code | Purpose |
|------|------|---------|
| 94-107 | `markRangeAsRead()` | Marks range as read, invalidates cache |
| 99 | `invalidateProgressCache(textId);` | Attempts to invalidate cache |
| 109-122 | `unmarkRangeAsRead()` | Unmarks range, invalidates cache |
| 114 | `invalidateProgressCache(textId);` | Attempts to invalidate cache |

**File:** `/Users/why/repos/trivium/src/lib/utils/tauri.ts`

| Line | Code | Purpose |
|------|------|---------|
| 68-80 | `markRangeAsRead` / `unmarkRangeAsRead` | Tauri bridge to backend |

**File:** `/Users/why/repos/trivium/src-tauri/src/commands/reading.rs`

| Line | Code | Purpose |
|------|------|---------|
| 11-39 | `mark_range_as_read()` | Inserts into read_ranges table |
| 284-315 | `unmark_range_as_read()` | Deletes from read_ranges table |
| 75-128 | `calculate_text_progress()` | Calculates progress percentage |

### 3. Sidebar Progress Display

**File:** `/Users/why/repos/trivium/src/components/library/TextNode.tsx`

| Line | Code | Purpose |
|------|------|---------|
| 9 | `import { useTextProgress } from '../../lib/hooks/useTextProgress';` | Import progress hook |
| 20 | `const { progress } = useTextProgress(text.id);` | Fetch progress for article |
| 70-74 | `{progress !== null && progress > 0 && (` | Conditionally render percentage |

**File:** `/Users/why/repos/trivium/src/components/library/FolderNode.tsx`

| Line | Code | Purpose |
|------|------|---------|
| 8 | `import { useFolderProgress } from '../../lib/hooks/useTextProgress';` | Import progress hook |
| 25 | `const { progress } = useFolderProgress(folder.id);` | Fetch progress for folder |
| 93-97 | `{progress !== null && progress > 0 && (` | Conditionally render percentage |

### 4. Reading View Progress Display

**File:** `/Users/why/repos/trivium/src/routes/read/[id].tsx`

| Line | Code | Purpose |
|------|------|---------|
| 32-43 | Store setup | Gets reading store with progress data |
| 38 | `totalProgress` | Current article progress |
| 172-174 | Header display | Shows `{totalProgress.toFixed(0)}%` |

### 5. Backend Progress Calculation

**File:** `/Users/why/repos/trivium/src-tauri/src/commands/reading.rs`

| Line | Code | Purpose |
|------|------|---------|
| 75-128 | `calculate_text_progress()` | Main progress calculation |
| 83-93 | Query text | Get content_length from database |
| 96-98 | Calculate exclusions | Remove excluded and header chars from total |
| 104-122 | Query read ranges | Fetch all read ranges for article |
| 124-125 | Calculate progress | (read_chars / countable_chars) * 100 |

### 6. Backend Mark/Unmark

**File:** `/Users/why/repos/trivium/src-tauri/src/commands/reading.rs`

| Line | Code | Purpose |
|------|------|---------|
| 11-39 | `mark_range_as_read()` | INSERT into read_ranges |
| 284-315 | `unmark_range_as_read()` | DELETE from read_ranges (with overlap check) |
| 295-314 | Overlap detection | `WHERE start_position < ? AND end_position > ?` |

## Issue 4: 0% Progress Display Requirement

**Current Implementation:**

File: `/Users/why/repos/trivium/src/components/library/TextNode.tsx`
```typescript
{progress !== null && progress > 0 && (
  <span className="text-xs text-muted-foreground ml-auto pl-2 flex-shrink-0">
    {Math.round(progress)}%
  </span>
)}
```

File: `/Users/why/repos/trivium/src/components/library/FolderNode.tsx`
```typescript
{progress !== null && progress > 0 && (
  <span className="text-xs text-muted-foreground ml-auto pl-2 flex-shrink-0">
    {Math.round(progress)}%
  </span>
)}
```

**Status:** ✓ CORRECT - Articles at 0% completion do NOT display a percentage

The condition `progress > 0` ensures that:
- Unread articles (0% progress): No percentage shown
- Articles with any progress (>0%): Percentage shown

This is working as designed.

## Root Cause Summary

The issue occurs because:

1. **Cache is not reactive** - `progressCache` is a plain Map, not a Zustand store
2. **Hook dependency is too narrow** - `useTextProgress` only depends on `textId`
3. **Cache invalidation doesn't trigger re-render** - Calling `progressCache.delete()` doesn't notify React components
4. **Components don't re-render without store update** - Since the hook doesn't use a reactive store, sidebar doesn't know cache was cleared
5. **Sidebar and reading store use different caches** - Progress hook has its own cache separate from reading store

## Why Hard Refresh Works

When you add a new article or perform a hard refresh:
1. `LibraryTree.loadLibrary()` is called (line 37)
2. Backend fetches fresh text list
3. Library store updates with new text objects
4. TextNode components remount (different text object reference)
5. `useTextProgress` hook runs again because `textId` changed
6. Either cache expired (60 seconds) or new article has no cache entry
7. Fresh progress is fetched and displayed

## Recommended Fixes

### Fix 1: Immediate (Workaround)
After `invalidateProgressCache(textId)`, force a manual refetch in the sidebar components.

### Fix 2: Short-term (Better)
Create a Zustand store for progress that's reactive and shared across all components:
```typescript
const useProgressStore = create((set) => ({
  progress: new Map(),
  setProgress: (textId, value) => set(state => 
    new Map(state.progress).set(textId, value)
  ),
  invalidate: (textId) => set(state => {
    const newMap = new Map(state.progress);
    newMap.delete(textId);
    return { progress: newMap };
  })
}));
```

### Fix 3: Long-term (Best)
Use a subscription/event system where:
1. Invalidating cache publishes an event
2. Components subscribe to progress cache invalidation events
3. Components re-fetch on invalidation rather than waiting for cache expiry

### Fix 4: Alternative
After mark/unmark, also update the library store's text objects, which triggers TextNode re-render.

## Summary Table

| Component | File | Lines | Status |
|-----------|------|-------|--------|
| TextNode | `/Users/why/repos/trivium/src/components/library/TextNode.tsx` | 20, 70-74 | ISSUE: Shows stale progress |
| FolderNode | `/Users/why/repos/trivium/src/components/library/FolderNode.tsx` | 25, 93-97 | ISSUE: Shows stale progress |
| useTextProgress Hook | `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts` | 8-42 | ROOT CAUSE: Non-reactive cache |
| useFolderProgress Hook | `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts` | 44-78 | ROOT CAUSE: Non-reactive cache |
| Reading Store | `/Users/why/repos/trivium/src/lib/stores/reading.ts` | 94-122 | ATTEMPTS FIX: Calls invalidateProgressCache |
| TextSelectionMenu | `/Users/why/repos/trivium/src/lib/components/reading/TextSelectionMenu.tsx` | 23-69 | TRIGGER POINT: User action |
| ReadPage | `/Users/why/repos/trivium/src/routes/read/[id].tsx` | 172-174 | WORKS CORRECTLY: Uses reading store |
| Backend: reading.rs | `/Users/why/repos/trivium/src-tauri/src/commands/reading.rs` | 11-315 | WORKING: DB operations correct |
| Cache system | `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts` | 4-6 | PROBLEMATIC: 60s cache, no notification |

