# Investigation Complete: Sidebar Progress Update Issue

## Executive Summary
The investigation has identified the root cause of why sidebar article progress percentages don't update immediately after mark/unmark actions in the reading view.

**Root Cause:** Non-reactive 60-second cache combined with narrow hook dependencies.

**Status:** 
- Progress display at 0% requirement: ✓ WORKING CORRECTLY
- Immediate updates on mark/unmark: ✗ NOT WORKING

## Investigation Findings

### 1. The Issue
- User marks/unmarks text in reading view
- Backend correctly updates database
- Reading view header updates immediately (correct)
- **Sidebar percentages do NOT update**
- After hard refresh (adding new article), sidebar updates (shows it's a caching issue)

### 2. Root Cause Identified
The progress hook (`useTextProgress.ts`) uses:
- A plain JavaScript `Map` for caching (non-reactive)
- 60-second cache duration
- `useEffect([textId])` dependency (only runs on textId change)

When mark/unmark happens:
1. Cache is cleared with `invalidateProgressCache(textId)`
2. But React components don't know the cache was cleared
3. Components still have stale `useState` value
4. No re-render happens because `textId` didn't change

### 3. Data Flow Analysis

**Mark/Unmark Request Flow:**
```
TextSelectionMenu.tsx:23
  → handleToggleRead()
    → useReadingStore.markRangeAsRead() [reading.ts:94]
      → api.reading.markRangeAsRead() [Tauri bridge to backend]
        → reading.rs:11-39 [Backend: INSERT into read_ranges]
      → get().calculateProgress() [Fetch new progress]
      → invalidateProgressCache(textId) [reading.ts:99]
        → progressCache.delete(textId) [useTextProgress.ts:80]
          ✗ Components don't re-render!
```

**Sidebar Display Flow:**
```
LibraryTree.tsx
  → TextNode.tsx:20 [useTextProgress(text.id)]
    → useTextProgress Hook [useTextProgress.ts:8]
      → useEffect([textId])
        → Check progressCache for cached value
        → If found AND not expired → Return stale cache!
        → If not found OR expired → Fetch fresh value
      → Line 18-23: Returns STALE cache (60 seconds old)
```

### 4. Why Hard Refresh Works
```
Add new article
  → LibraryTree.loadLibrary() [LibraryTree.tsx:37]
    → Fetch new text list from backend
    → Library store updates with NEW Text objects
    → TextNode components remount (new object references)
    → useTextProgress([textId]) effect runs again
    → textId changed! → Effect executes
    → New progress fetched from backend (or cache expired)
    → Display updates ✓
```

## File Locations Summary

### Critical Files

| File | Lines | Issue |
|------|-------|-------|
| `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts` | 4-6 | **ROOT CAUSE**: Non-reactive Map cache, 60s duration |
| `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts` | 8-42 | Non-reactive hook, narrow dependency |
| `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts` | 44-78 | Folder progress (same issue) |
| `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts` | 80-86 | Cache invalidation (doesn't notify components) |
| `/Users/why/repos/trivium/src/lib/stores/reading.ts` | 99 | Attempts to invalidate but ineffective |
| `/Users/why/repos/trivium/src/lib/stores/reading.ts` | 114 | Attempts to invalidate but ineffective |
| `/Users/why/repos/trivium/src/components/library/TextNode.tsx` | 20 | Uses stale progress from hook |
| `/Users/why/repos/trivium/src/components/library/TextNode.tsx` | 70-74 | Displays progress (0% check WORKS correctly) |
| `/Users/why/repos/trivium/src/components/library/FolderNode.tsx` | 25 | Uses stale progress from hook |
| `/Users/why/repos/trivium/src/components/library/FolderNode.tsx` | 93-97 | Displays progress (0% check WORKS correctly) |

### Supporting Files

| File | Lines | Purpose |
|------|-------|---------|
| `/Users/why/repos/trivium/src/lib/components/reading/TextSelectionMenu.tsx` | 23-69 | Triggers mark/unmark action |
| `/Users/why/repos/trivium/src/routes/read/[id].tsx` | 172-174 | Shows correct progress in header |
| `/Users/why/repos/trivium/src-tauri/src/commands/reading.rs` | 11-39 | Backend mark operation (correct) |
| `/Users/why/repos/trivium/src-tauri/src/commands/reading.rs` | 284-315 | Backend unmark operation (correct) |
| `/Users/why/repos/trivium/src-tauri/src/commands/reading.rs` | 75-128 | Backend progress calculation (correct) |

## Implementation Details

### Cache System (Non-Reactive)
```typescript
// /Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts:4-6
const progressCache = new Map<number, { progress: number; timestamp: number }>();
const folderProgressCache = new Map<string, { progress: number; timestamp: number }>();
const CACHE_DURATION_MS = 60000; // 60 seconds

// Line 18-23: Returns stale cache if exists and not expired
if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
  setProgress(cached.progress); // STALE!
  return;
}

// Line 80-82: Invalidation doesn't notify React
export function invalidateProgressCache(textId: number) {
  progressCache.delete(textId); // Deletes but no re-render!
}
```

### Hook Dependencies (Too Narrow)
```typescript
// /Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts:8-42
useEffect(() => {
  // ... fetch progress ...
}, [textId]); // ONLY depends on textId!
            // If textId doesn't change, effect doesn't run
            // Even though cache was cleared!
```

### Sidebar Display (0% Requirement - WORKING)
```typescript
// /Users/why/repos/trivium/src/components/library/TextNode.tsx:70-74
{progress !== null && progress > 0 && (
  <span className="text-xs text-muted-foreground ml-auto pl-2 flex-shrink-0">
    {Math.round(progress)}%
  </span>
)}

// Result:
// - progress === 0 → NO percentage shown ✓
// - progress > 0 → percentage shown ✓
// - progress === null → NO percentage shown ✓
```

## Verification Steps

The investigation included:

1. ✓ Located cache system at `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts`
2. ✓ Found 60-second cache duration (line 6)
3. ✓ Traced mark/unmark flow through TextSelectionMenu → reading.ts → backend
4. ✓ Found cache invalidation attempts (reading.ts:99, 114)
5. ✓ Verified sidebar uses same hook but doesn't re-render
6. ✓ Confirmed 0% articles don't display percentage (correct)
7. ✓ Verified reading view header updates immediately (uses reading store directly)
8. ✓ Confirmed hard refresh works (library reload forces TextNode remount)
9. ✓ Traced backend operations (all working correctly)

## Solution Approach

To fix this issue, the progress cache system needs to become **reactive**:

### Option 1: Zustand Store (Recommended)
Convert the Map-based cache to a Zustand store so all components subscribe to changes.

### Option 2: Event System
Publish invalidation events that components can subscribe to.

### Option 3: Direct State Update
After invalidating cache, also update library store to trigger TextNode re-render.

### Performance Consideration
The 60-second cache is important for performance. The solution should maintain caching while fixing reactivity.

## Additional Notes

- Reading view header shows correct progress (uses reading store directly) ✓
- Backend operations are working correctly ✓
- Database updates are occurring (cache invalidation proves this) ✓
- Folder progress has the same issue (uses same hook)
- All position calculations use UTF-16 code units (matching JavaScript behavior) ✓

## Documentation Files Created

1. **SIDEBAR_PROGRESS_INVESTIGATION.md** - Detailed investigation with data flows and code locations
2. **QUICK_REFERENCE_PROGRESS_ISSUE.md** - Quick reference for developers
3. **INVESTIGATION_COMPLETE.md** - This file (summary and verification)

All documents are in: `/Users/why/repos/trivium/`
