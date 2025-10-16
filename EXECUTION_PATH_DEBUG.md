# Mark Text as Read - Complete Execution Path Analysis

## Overview
When a user marks text as read (either via context menu click or Ctrl+M keyboard shortcut), the following execution chain occurs. This document provides exact file paths and line numbers for debugging purposes.

---

## 1. MARK ACTION TRIGGER

### Entry Points: TextSelectionMenu Component
**File:** `/Users/why/repos/trivium/src/lib/components/reading/TextSelectionMenu.tsx`

#### A. Context Menu Click Handler
- **Location:** Lines 106-109 (Menu Item)
- **Trigger:** User clicks "Toggle Read" in context menu
- **Handler Function:** `handleToggleRead()` - Lines 23-69

#### B. Keyboard Shortcut Handler
- **Location:** Lines 83-97 (useEffect hook)
- **Keyboard:** Ctrl+M (or Cmd+M on Mac)
- **Handler:** `handleKeyDown()` function - Lines 84-93

Line 85-87: if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
Line 86: e.preventDefault()
Line 87: handleToggleRead()

### handleToggleRead() Function Details
**Lines 23-69**

**Flow:**
1. Line 24: Check if `currentText` exists (early return if not)
2. Line 26-27: Get browser selection (early return if collapsed)
3. Line 29-30: Get article element (early return if not found)
4. Line 32: Get DOM range from selection
5. Line 34-36: Calculate text position before selection
6. Line 38-39: Get selected text content
7. Line 41-42: Calculate startPosition and endPosition
8. Lines 44-54: DEBUG LOGGING (already in code!)
9. Line 56-60: Check if range is excluded (early return if yes)
10. Line 62-66: KEY DECISION POINT:
    - If already read: calls `unmarkRangeAsRead(currentText.id, startPosition, endPosition)`
    - If not read: calls `markRangeAsRead(currentText.id, startPosition, endPosition)`
11. Line 68: Clear selection

---

## 2. READING STORE MARK FUNCTION

### File: `/Users/why/repos/trivium/src/lib/stores/reading.ts`

#### Import Statement
**Line 4:**
import { invalidateProgressCache } from '../hooks/useTextProgress';

#### markRangeAsRead() Function
**Lines 94-107**

markRangeAsRead: async (textId: number, startPosition: number, endPosition: number) => {
  try {
    await api.reading.markRangeAsRead(textId, startPosition, endPosition);  // Line 96
    await get().getReadRanges(textId);                                      // Line 97
    await get().calculateProgress(textId);                                  // Line 98
    invalidateProgressCache(textId);                                         // Line 99 **CRITICAL**
  } catch (error) {
    console.error('Failed to mark range as read:', error);
    throw error;
  }
}

**Execution Order:**
1. Line 96: Call Tauri API to persist mark in database
2. Line 97: Fetch updated read ranges from backend
3. Line 98: Recalculate progress in store
4. **Line 99: INVALIDATE CACHE - Notify subscribers**

#### unmarkRangeAsRead() Function
**Lines 109-122**

Same structure with invalidateProgressCache at Line 114

---

## 3. CACHE INVALIDATION CALL

### File: `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts`

#### invalidateProgressCache() Function
**Lines 114-117**

export function invalidateProgressCache(textId: number) {
  progressCache.delete(textId);        // Line 115
  notifyCacheInvalidation();           // Line 116
}

#### notifyCacheInvalidation() Function
**Lines 12-15**

function notifyCacheInvalidation() {
  cacheVersion++;                                          // Line 13
  cacheVersionListeners.forEach(listener => listener());  // Line 14
}

**Global State:**
- Line 9: let cacheVersion = 0;
- Line 10: const cacheVersionListeners = new Set<() => void>();
- Line 4: const progressCache = new Map<number, { progress: number; timestamp: number }>();

**What Happens:**
1. progressCache entry for the textId is deleted (Line 115)
2. cacheVersion is incremented (Line 13)
3. ALL subscribers are notified by calling their listener functions (Line 14)

---

## 4. HOOK SUBSCRIPTION VERIFICATION

### File: `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts`

#### useTextProgress() Hook
**Lines 24-67**

**Subscription Setup (Lines 29-35):**

useEffect(() => {
  const unsubscribe = subscribeToCacheInvalidation(() => {
    setRefreshTrigger(prev => prev + 1);
  });
  return unsubscribe;
}, []);  // <-- EMPTY DEPENDENCY ARRAY: Runs ONCE on mount

**Key Points:**
- This effect has NO dependencies → runs once when component mounts
- Creates a closure over setRefreshTrigger
- Returns cleanup function to unsubscribe on unmount

#### subscribeToCacheInvalidation() Function
**Lines 17-22**

function subscribeToCacheInvalidation(listener: () => void) {
  cacheVersionListeners.add(listener);           // Line 18
  return () => {
    cacheVersionListeners.delete(listener);      // Line 20
  };
}

**What Happens:**
- When a hook is created, its callback is added to the global Set (Line 18)
- When component unmounts, the callback is removed from the Set (Line 20)

#### Progress Fetch Effect (Lines 37-64)

useEffect(() => {
  if (textId === null) {
    setProgress(null);
    return;  // Line 40: Early return if textId is null
  }

  const cached = progressCache.get(textId);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
    setProgress(cached.progress);
    return;  // Line 48: Early return if cache valid
  }

  setIsLoading(true);

  api.reading
    .calculateProgress(textId)
    .then((calculatedProgress) => {
      progressCache.set(textId, { progress: calculatedProgress, timestamp: now });
      setProgress(calculatedProgress);
      setIsLoading(false);
    })
    .catch((error) => {
      console.error('Failed to calculate progress:', error);
      setIsLoading(false);
    });
}, [textId, refreshTrigger]);  // Line 64: Dependencies

**Execution:**
- Dependency: [textId, refreshTrigger]
- When invalidateProgressCache() is called:
  1. Cache entry is deleted
  2. cacheVersionListeners.forEach(listener => listener())
  3. Each listener calls setRefreshTrigger(prev => prev + 1)
  4. This triggers this effect because refreshTrigger changed
  5. Cache is empty, so it fetches fresh data from API
  6. New progress is cached and displayed

---

## 5. COMPONENT RENDERING WITH useTextProgress

### File: `/Users/why/repos/trivium/src/components/library/TextNode.tsx`

**Lines 17-20:**

export function TextNode({ text, depth, collapsed = false }: TextNodeProps) {
  const navigate = useNavigate();
  const { selectedItemId, selectItem } = useLibraryStore();
  const { progress } = useTextProgress(text.id);  // Line 20

**What Happens:**
- Each TextNode component calls useTextProgress(text.id)
- This creates a subscription to cache invalidation
- When marking text as read, cache is invalidated
- All TextNode instances with that textId receive the refresh
- Progress display updates (Lines 70-73)

{progress !== null && progress > 0 && (
  <span className="text-xs text-muted-foreground ml-auto pl-2 flex-shrink-0">
    {Math.round(progress)}%
  </span>
)}

### File: `/Users/why/repos/trivium/src/components/library/FolderNode.tsx`

**Line 25:**
const { progress } = useFolderProgress(folder.id);

Similar pattern for folder progress (Lines 112-116).

---

## 6. CACHE INVALIDATION CALL CHAIN

**Step 1: markRangeAsRead (reading.ts:99)**
- Calls invalidateProgressCache(textId)

**Step 2: invalidateProgressCache (useTextProgress.ts:114-117)**
export function invalidateProgressCache(textId: number) {
  progressCache.delete(textId);           // Remove from cache
  notifyCacheInvalidation();              // Notify all listeners
}

**Step 3: notifyCacheInvalidation (useTextProgress.ts:12-15)**
function notifyCacheInvalidation() {
  cacheVersion++;                                          // Increment version
  cacheVersionListeners.forEach(listener => listener());  // Call ALL listeners
}

**Step 4: Each Listener Fires**
- Every component using useTextProgress() or useFolderProgress() receives the notification
- Their listener is: () => setRefreshTrigger(prev => prev + 1)
- This triggers the progress fetch effect (Line 64 dependency: [textId, refreshTrigger])

**Step 5: Progress Recalculated**
- API is called to fetch new progress (Line 54)
- Component re-renders with new progress value

---

## 7. POSSIBLE FAILURE POINTS & DEBUGGING

### Failure Point 1: Cache Invalidation Not Called
Check Lines:
- /Users/why/repos/trivium/src/lib/stores/reading.ts:99 (markRangeAsRead)
- /Users/why/repos/trivium/src/lib/stores/reading.ts:114 (unmarkRangeAsRead)

### Failure Point 2: Listeners Not Called
Check Lines:
- /Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts:10 (cacheVersionListeners size)
- /Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts:14 (forEach execution)

### Failure Point 3: Hook Effect Not Running
Check Lines:
- /Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts:30-35 (subscription useEffect)
- /Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts:37-64 (fetch useEffect)

### Failure Point 4: No TextNode Components Mounted
Check:
- Are TextNode components rendered in the library view?
- Are they remounted when navigating?

---

## 8. SUMMARY TABLE: File Locations & Line Numbers

| Step | File | Lines | Function | Purpose |
|------|------|-------|----------|---------|
| 1 | TextSelectionMenu.tsx | 83-97 | useEffect | Listen for Ctrl+M |
| 1 | TextSelectionMenu.tsx | 106-109 | JSX | Render menu item |
| 2 | TextSelectionMenu.tsx | 23-69 | handleToggleRead | Trigger marking |
| 3 | TextSelectionMenu.tsx | 65 | markRangeAsRead | Call store function |
| 4 | reading.ts | 4 | import | Import cache invalidation |
| 4 | reading.ts | 94-107 | markRangeAsRead | Mark and invalidate |
| 4 | reading.ts | 99 | invalidateProgressCache | KEY LINE |
| 5 | useTextProgress.ts | 114-117 | invalidateProgressCache | Delete cache entry |
| 5 | useTextProgress.ts | 12-15 | notifyCacheInvalidation | Notify listeners |
| 6 | useTextProgress.ts | 17-22 | subscribeToCacheInvalidation | Register listener |
| 6 | useTextProgress.ts | 29-35 | useEffect | Subscribe in hook |
| 6 | useTextProgress.ts | 37-64 | useEffect | Fetch on refresh |
| 7 | TextNode.tsx | 20 | useTextProgress hook | Display progress |
| 8 | TextNode.tsx | 70-74 | JSX | Show percentage |

---

## 9. CONSOLE LOG RECOMMENDATIONS

To debug the complete chain, add these console.logs:

**File: reading.ts - Line 99 (in markRangeAsRead)**
console.log('[reading.ts:99] Invalidating cache for textId:', textId);

**File: reading.ts - Line 114 (in unmarkRangeAsRead)**
console.log('[reading.ts:114] Invalidating cache for textId:', textId);

**File: useTextProgress.ts - Line 14 (in notifyCacheInvalidation)**
console.log('[useTextProgress.ts:14] notifyCacheInvalidation firing. Listeners:', cacheVersionListeners.size);

**File: useTextProgress.ts - Line 32 (in subscription callback)**
console.log('[useTextProgress.ts:32] Cache invalidation listener fired');

**File: useTextProgress.ts - Line 37 (in fetch effect)**
console.log('[useTextProgress.ts:37] Progress fetch effect: textId=', textId, 'refreshTrigger=', refreshTrigger);

**File: useTextProgress.ts - Line 54 (API call)**
console.log('[useTextProgress.ts:54] Fetching progress from API for textId:', textId);

**File: TextNode.tsx - Line 20 (after hook call)**
console.log('[TextNode.tsx:20] Progress updated:', progress);

---

## 10. EXPECTED EXECUTION TRACE

When user presses Ctrl+M and marks text as read:

1. TextSelectionMenu.tsx:84-87: Keyboard event caught
2. TextSelectionMenu.tsx:23-69: handleToggleRead() called
3. TextSelectionMenu.tsx:65: markRangeAsRead() called with (textId, start, end)
4. reading.ts:96: API call to backend (ASYNC)
5. reading.ts:97: Fetch read ranges (ASYNC)
6. reading.ts:98: Calculate progress in store (ASYNC)
7. reading.ts:99: invalidateProgressCache(textId) called (SYNC)
8. useTextProgress.ts:115: progressCache.delete(textId)
9. useTextProgress.ts:116: notifyCacheInvalidation() called
10. useTextProgress.ts:13: cacheVersion++
11. useTextProgress.ts:14: For each listener in cacheVersionListeners:
    - Call listener() → setRefreshTrigger(prev => prev + 1)
12. For each TextNode/FolderNode:
    - useTextProgress.ts:64: useEffect triggered (refreshTrigger changed)
    - useTextProgress.ts:54: API call to fetch new progress
    - useTextProgress.ts:57: Cache updated with new progress
    - setProgress(calculatedProgress) → component re-renders
13. TextNode.tsx:70-73: Progress percentage updates on screen

---

## 11. QUICK VERIFICATION CHECKLIST

To verify everything is wired correctly:

1. [ ] TextSelectionMenu.tsx has keyboard handler (Line 85)
2. [ ] handleToggleRead calls markRangeAsRead (Line 65)
3. [ ] reading.ts imports invalidateProgressCache (Line 4)
4. [ ] markRangeAsRead calls invalidateProgressCache (Line 99)
5. [ ] unmarkRangeAsRead calls invalidateProgressCache (Line 114)
6. [ ] invalidateProgressCache deletes cache entry (Line 115)
7. [ ] invalidateProgressCache calls notifyCacheInvalidation (Line 116)
8. [ ] notifyCacheInvalidation increments cacheVersion (Line 13)
9. [ ] notifyCacheInvalidation calls all listeners (Line 14)
10. [ ] useTextProgress has subscription effect (Lines 29-35)
11. [ ] useTextProgress has fetch effect (Lines 37-64)
12. [ ] Fetch effect depends on refreshTrigger (Line 64)
13. [ ] TextNode calls useTextProgress (Line 20)
14. [ ] FolderNode calls useFolderProgress (Line 25)
15. [ ] Both components display progress (TextNode:70-74, FolderNode:112-116)

