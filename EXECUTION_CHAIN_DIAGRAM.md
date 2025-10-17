# Mark Text as Read - Quick Reference Execution Chain

## Visual Execution Flow

```
USER INTERACTION (Click or Ctrl+M)
         |
         v
TextSelectionMenu.tsx:85-87 (Keyboard Handler)
     or TextSelectionMenu.tsx:106 (Menu Click)
         |
         v
TextSelectionMenu.tsx:23-69 (handleToggleRead)
     |
     +---> Check currentText exists (Line 24)
     +---> Get browser selection (Line 26-27)
     +---> Get article element (Line 29-30)
     +---> Calculate positions (Line 41-42)
     +---> Check if excluded (Line 56-60)
     |
     +---> IS ALREADY READ? (Line 62)
            |                    |
            NO                   YES
            |                    |
            v                    v
    Line 65                  Line 63
    markRangeAsRead()    unmarkRangeAsRead()
         |                    |
         +--------------------+
                    |
                    v
        reading.ts:94-107 (markRangeAsRead)
            |
            +---> api.reading.markRangeAsRead() [ASYNC] (Line 96)
            +---> get().getReadRanges() [ASYNC] (Line 97)
            +---> get().calculateProgress() [ASYNC] (Line 98)
            |
            v
        reading.ts:99 **CRITICAL**
        invalidateProgressCache(textId)
            |
            v
useTextProgress.ts:114-117 (invalidateProgressCache)
    |
    +---> progressCache.delete(textId) (Line 115)
    +---> notifyCacheInvalidation() (Line 116)
         |
         v
    useTextProgress.ts:12-15 (notifyCacheInvalidation)
         |
         +---> cacheVersion++ (Line 13)
         +---> cacheVersionListeners.forEach(listener => listener()) (Line 14)
              |
              |--- For each TextNode/FolderNode using useTextProgress:
              |
              v
         useTextProgress.ts:32 (listener callback)
         |
         +---> setRefreshTrigger(prev => prev + 1)
              |
              v
         useTextProgress.ts:37-64 (Progress Fetch Effect)
              |
              +---> Effect dependency [textId, refreshTrigger] triggers
              +---> progressCache.get(textId) is EMPTY (Line 43)
              +---> api.reading.calculateProgress(textId) [ASYNC] (Line 54)
              |
              v
         useTextProgress.ts:57 (Promise resolution)
              |
              +---> progressCache.set(textId, progress) (Line 56)
              +---> setProgress(calculatedProgress) (Line 57)
              |
              v
         Component Re-render
              |
              v
        TextNode.tsx:70-74 (Display Progress)
         Progress % shows updated value

        FolderNode.tsx:112-116 (Display Progress)
         Folder % shows updated value
```

---

## File Locations Quick Reference

### Trigger Points
- **Keyboard:** `/Users/why/repos/trivium/src/lib/components/reading/TextSelectionMenu.tsx:85`
- **Menu Click:** `/Users/why/repos/trivium/src/lib/components/reading/TextSelectionMenu.tsx:106`

### Core Logic
- **Mark Function:** `/Users/why/repos/trivium/src/lib/components/reading/TextSelectionMenu.tsx:23-69`
- **Store Mark:** `/Users/why/repos/trivium/src/lib/stores/reading.ts:94-107`
- **Cache Invalidation:** `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts:114-117`

### Notification System
- **Notify Listeners:** `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts:12-15`
- **Subscribe:** `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts:17-22`
- **Hook Setup:** `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts:29-35`

### Display Updates
- **TextNode:** `/Users/why/repos/trivium/src/components/library/TextNode.tsx:20, 70-74`
- **FolderNode:** `/Users/why/repos/trivium/src/components/library/FolderNode.tsx:25, 112-116`

---

## Critical Functions & Line Numbers

| Function | File | Lines | Key Purpose |
|----------|------|-------|-------------|
| `handleToggleRead` | TextSelectionMenu.tsx | 23-69 | Initiates mark action |
| `markRangeAsRead` | reading.ts | 94-107 | Persists and invalidates |
| `unmarkRangeAsRead` | reading.ts | 109-122 | Removes mark and invalidates |
| `invalidateProgressCache` | useTextProgress.ts | 114-117 | Clears cache & notifies |
| `notifyCacheInvalidation` | useTextProgress.ts | 12-15 | Calls all listeners |
| `subscribeToCacheInvalidation` | useTextProgress.ts | 17-22 | Adds listener to Set |
| `useTextProgress` | useTextProgress.ts | 24-67 | Hook that subscribes & fetches |
| `useFolderProgress` | useTextProgress.ts | 69-112 | Folder-level hook |

---

## Global State Variables

| Variable | File | Line | Purpose |
|----------|------|------|---------|
| `cacheVersion` | useTextProgress.ts | 9 | Version counter |
| `cacheVersionListeners` | useTextProgress.ts | 10 | Set of listener callbacks |
| `progressCache` | useTextProgress.ts | 4 | Map of cached progress values |
| `folderProgressCache` | useTextProgress.ts | 5 | Map of cached folder progress |

---

## Dependency Chain for Debugging

### If Progress Doesn't Update:
1. Check: `markRangeAsRead` called? (reading.ts:96 should have API call)
2. Check: Line 99 reached? (invalidateProgressCache must be called)
3. Check: `notifyCacheInvalidation` executed? (Line 14 should call listeners)
4. Check: Listeners exist? (cacheVersionListeners.size > 0)
5. Check: setRefreshTrigger called? (Should increment refreshTrigger)
6. Check: Progress effect triggered? (Line 64 dependency should change)
7. Check: API call made? (Line 54 in useTextProgress)
8. Check: Component renders? (TextNode/FolderNode should show new %)

### If Keyboard Shortcut Doesn't Work:
1. Check: Event listener added? (TextSelectionMenu.tsx:95)
2. Check: Keyboard handler matches? (Line 85: Ctrl+M or Cmd+M)
3. Check: handleToggleRead fires? (Line 87)
4. Check: currentText exists? (Line 24 check)
5. Check: Selection exists? (Line 26-27 check)
6. Check: Article element found? (Line 29-30 check)

---

## Async vs Sync Execution

### SYNCHRONOUS (Immediate):
- Cache invalidation (Line 99)
- progressCache.delete() (Line 115)
- cacheVersion++ (Line 13)
- Listener callbacks (Line 14)
- setRefreshTrigger() (Line 32)

### ASYNCHRONOUS (Delayed):
- api.reading.markRangeAsRead() (Line 96)
- get().getReadRanges() (Line 97)
- get().calculateProgress() (Line 98)
- api.reading.calculateProgress() (Line 54)
- Component re-render (after setProgress)

---

## Testing Strategy

### Step 1: Mark Some Text
- Open any text
- Select text range
- Press Ctrl+M or click "Toggle Read"

### Step 2: Monitor Console
Expected log sequence:
```
TextSelectionMenu: handleToggleRead === (Line 45)
invalidateProgressCache called (custom log at 99)
notifyCacheInvalidation firing (custom log at 14)
Cache invalidation listener fired (custom log at 32) [repeats for each listener]
Progress fetch effect: textId=X refreshTrigger=Y (custom log at 37)
Fetching progress from API for textId: X (custom log at 54)
```

### Step 3: Check UI
- Library view should update progress %
- Progress bar should show in TextNode or FolderNode

### Step 4: Verify Cache
In DevTools console:
```javascript
// Check if cache was invalidated
// Cache should be empty or refreshed
```

