# Console Logs to Add for Debugging Mark Text as Read

This document provides copy-paste ready console log statements to add at specific locations to trace the complete execution path.

---

## File 1: TextSelectionMenu.tsx

### Location 1: Inside handleToggleRead, after Line 99
Add these logs to confirm invalidation was called:

```typescript
// File: /Users/why/repos/trivium/src/lib/stores/reading.ts
// In markRangeAsRead function, add BEFORE line 99:

console.log('[reading.ts] markRangeAsRead called:', { textId, startPosition, endPosition });
console.log('[reading.ts] About to invalidate cache for textId:', textId);

// Add AFTER line 99:

console.log('[reading.ts] Cache invalidated for textId:', textId);
```

### Location 2: Inside unmarkRangeAsRead, after Line 114
```typescript
// File: /Users/why/repos/trivium/src/lib/stores/reading.ts
// In unmarkRangeAsRead function, add BEFORE line 114:

console.log('[reading.ts] unmarkRangeAsRead called:', { textId, startPosition, endPosition });
console.log('[reading.ts] About to invalidate cache for textId:', textId);

// Add AFTER line 114:

console.log('[reading.ts] Cache invalidated for textId:', textId);
```

---

## File 2: useTextProgress.ts

### Location 1: Inside notifyCacheInvalidation, replace lines 12-15
Current code:
```typescript
function notifyCacheInvalidation() {
  cacheVersion++;
  cacheVersionListeners.forEach(listener => listener());
}
```

Replace with:
```typescript
function notifyCacheInvalidation() {
  const previousVersion = cacheVersion;
  cacheVersion++;
  console.log('[useTextProgress.ts] notifyCacheInvalidation firing');
  console.log('[useTextProgress.ts] cacheVersion:', previousVersion, '->', cacheVersion);
  console.log('[useTextProgress.ts] Number of listeners to notify:', cacheVersionListeners.size);
  
  let listenerIndex = 0;
  cacheVersionListeners.forEach(listener => {
    console.log('[useTextProgress.ts] Calling listener', listenerIndex++);
    listener();
  });
  
  console.log('[useTextProgress.ts] All listeners notified');
}
```

### Location 2: Inside useTextProgress subscription effect, add at line 31
Current code (lines 29-35):
```typescript
useEffect(() => {
  const unsubscribe = subscribeToCacheInvalidation(() => {
    setRefreshTrigger(prev => prev + 1);
  });
  return unsubscribe;
}, []);
```

Replace with:
```typescript
useEffect(() => {
  console.log('[useTextProgress.ts] Setting up cache invalidation subscription');
  const unsubscribe = subscribeToCacheInvalidation(() => {
    console.log('[useTextProgress.ts] Cache invalidation listener fired for textId:', textId);
    console.log('[useTextProgress.ts] Incrementing refreshTrigger');
    setRefreshTrigger(prev => {
      console.log('[useTextProgress.ts] refreshTrigger updated:', prev, '->', prev + 1);
      return prev + 1;
    });
  });
  
  return () => {
    console.log('[useTextProgress.ts] Cleaning up cache invalidation subscription');
    unsubscribe();
  };
}, []);
```

### Location 3: Inside useTextProgress fetch effect, replace lines 37-64

Current code starts:
```typescript
useEffect(() => {
  if (textId === null) {
    setProgress(null);
    return;
  }
```

Replace entire effect with:
```typescript
useEffect(() => {
  console.log('[useTextProgress.ts] Progress fetch effect triggered');
  console.log('[useTextProgress.ts] Dependencies: textId=', textId, 'refreshTrigger=', refreshTrigger);
  
  if (textId === null) {
    console.log('[useTextProgress.ts] textId is null, clearing progress');
    setProgress(null);
    return;
  }

  const cached = progressCache.get(textId);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
    console.log('[useTextProgress.ts] Using cached progress:', cached.progress);
    console.log('[useTextProgress.ts] Cache age:', now - cached.timestamp, 'ms');
    setProgress(cached.progress);
    return;
  }

  console.log('[useTextProgress.ts] Cache miss or expired, fetching from API');
  console.log('[useTextProgress.ts] Fetching progress for textId:', textId);
  setIsLoading(true);

  api.reading
    .calculateProgress(textId)
    .then((calculatedProgress) => {
      console.log('[useTextProgress.ts] API returned progress:', calculatedProgress);
      console.log('[useTextProgress.ts] Caching and setting progress');
      progressCache.set(textId, { progress: calculatedProgress, timestamp: now });
      setProgress(calculatedProgress);
      setIsLoading(false);
      console.log('[useTextProgress.ts] Progress state updated:', calculatedProgress);
    })
    .catch((error) => {
      console.error('[useTextProgress.ts] API call failed:', error);
      console.log('[useTextProgress.ts] Failed to calculate progress for textId:', textId);
      setIsLoading(false);
    });
}, [textId, refreshTrigger]);
```

### Location 4: Inside useFolderProgress fetch effect (lines 82-109)

Similar pattern as above, just change textId to folderId:

```typescript
useEffect(() => {
  console.log('[useFolderProgress] Progress fetch effect triggered');
  console.log('[useFolderProgress] Dependencies: folderId=', folderId, 'refreshTrigger=', refreshTrigger);
  
  if (folderId === null) {
    console.log('[useFolderProgress] folderId is null, clearing progress');
    setProgress(null);
    return;
  }

  const cached = folderProgressCache.get(folderId);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
    console.log('[useFolderProgress] Using cached progress:', cached.progress);
    setProgress(cached.progress);
    return;
  }

  console.log('[useFolderProgress] Cache miss or expired, fetching from API');
  setIsLoading(true);

  api.folders
    .calculateProgress(folderId)
    .then((calculatedProgress) => {
      console.log('[useFolderProgress] API returned progress:', calculatedProgress);
      folderProgressCache.set(folderId, { progress: calculatedProgress, timestamp: now });
      setProgress(calculatedProgress);
      setIsLoading(false);
    })
    .catch((error) => {
      console.error('[useFolderProgress] Failed to calculate folder progress:', error);
      setIsLoading(false);
    });
}, [folderId, refreshTrigger]);
```

---

## File 3: TextNode.tsx

### Location: After line 20 (after calling useTextProgress hook)

```typescript
// After: const { progress } = useTextProgress(text.id);
console.log('[TextNode] Rendered with textId:', text.id, 'progress:', progress);
```

---

## File 4: FolderNode.tsx

### Location: After line 25 (after calling useFolderProgress hook)

```typescript
// After: const { progress } = useFolderProgress(folder.id);
console.log('[FolderNode] Rendered with folderId:', folder.id, 'progress:', progress);
```

---

## Testing the Execution Path

### Step 1: Add all logs above

### Step 2: Open DevTools Console (F12)

### Step 3: Navigate to a text item

You should see console logs like:
```
[useTextProgress] Setting up cache invalidation subscription
[TextNode] Rendered with textId: 42 progress: null
[useTextProgress] Progress fetch effect triggered
[useTextProgress] Dependencies: textId= 42 refreshTrigger= 0
[useTextProgress] Cache miss or expired, fetching from API
[useTextProgress] Fetching progress for textId: 42
[useTextProgress] API returned progress: 0
[TextNode] Rendered with textId: 42 progress: 0
```

### Step 4: Select some text and press Ctrl+M

You should see a sequence like:
```
=== TextSelectionMenu: handleToggleRead ===
Article DOM length: 5234
Article innerHTML sample (first 200 chars): <p>Lorem...
Article textContent sample (first 200 chars): Lorem...
Selected text: "Lorem ipsum"
Selected text length: 11
Calculated positions: { startPosition: 145, endPosition: 156 }
Text at positions in DOM: "Lorem ipsum"
Does selected text match DOM text at positions? true
=========================================
[reading.ts] markRangeAsRead called: { textId: 42, startPosition: 145, endPosition: 156 }
[reading.ts] About to invalidate cache for textId: 42
[reading.ts] Cache invalidated for textId: 42
[useTextProgress] notifyCacheInvalidation firing
[useTextProgress] cacheVersion: 0 -> 1
[useTextProgress] Number of listeners to notify: 1
[useTextProgress] Calling listener 0
[useTextProgress] Cache invalidation listener fired for textId: 42
[useTextProgress] Incrementing refreshTrigger
[useTextProgress] refreshTrigger updated: 0 -> 1
[useTextProgress] Progress fetch effect triggered
[useTextProgress] Dependencies: textId= 42 refreshTrigger= 1
[useTextProgress] Cache miss or expired, fetching from API
[useTextProgress] Fetching progress for textId: 42
[useTextProgress] API returned progress: 2.1
[useTextProgress] Caching and setting progress
[useTextProgress] Progress state updated: 2.1
[TextNode] Rendered with textId: 42 progress: 2.1
```

### Step 5: Analyze the Output

Key things to verify:
1. All functions are called in the right order
2. Cache invalidation fires
3. Listeners are notified (should show listener count > 0)
4. refreshTrigger increments
5. API call is made
6. Progress updates
7. Component re-renders with new progress

---

## Debugging Specific Issues

### Issue: Mark action doesn't update progress

Check these logs in order:
```
1. [reading.ts] markRangeAsRead called - Did this appear?
2. [reading.ts] Cache invalidated - Did this appear?
3. [useTextProgress] notifyCacheInvalidation firing - Did this appear?
4. [useTextProgress] Number of listeners to notify - Is this > 0?
5. [useTextProgress] Cache invalidation listener fired - Did this appear?
6. [useTextProgress] Progress fetch effect triggered - Did this appear?
7. [useTextProgress] API returned progress - Did this appear?
```

### Issue: Progress shows but doesn't update

Check:
```
1. Progress fetch effect appears but API call never fires
   → Check if textId is null (should not be)
   
2. API call fires but result never shows
   → Check if promise resolution logs appear
   → Check browser Network tab for API response
   
3. API result appears but component doesn't re-render
   → Check if [TextNode] Rendered log appears
   → Check if new progress value is different
```

### Issue: Keyboard shortcut doesn't work

Check TextSelectionMenu logs:
```
1. Does "handleToggleRead ===" appear?
   → If not, keyboard handler not firing
   → Check if focus is on article element
   → Check if selection exists
   
2. If handleToggleRead appears but nothing else:
   → Check if currentText is null (Line 24)
   → Check if selection is collapsed (Line 26-27)
   → Check if article element found (Line 29-30)
```

---

## Removing Debug Logs

Once you're done debugging, you can remove all console.log statements or use Find & Replace:

```
Find: console.log\(\'\[.*?\]\s
Replace: (empty)
```

This regex will remove all our debug logs that start with `[filename]`.

