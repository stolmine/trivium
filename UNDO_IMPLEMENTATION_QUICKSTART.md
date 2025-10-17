# Undo/Redo Implementation Quickstart Guide

**For**: Developers implementing the undo/redo feature
**Time**: 14-20 hours total
**Difficulty**: Intermediate

---

## Prerequisites

Before starting, ensure you understand:
- ✓ Zustand state management
- ✓ TypeScript interfaces and union types
- ✓ Async/await and Promise handling
- ✓ React hooks and effects
- ✓ The current inline editing system (Phase 14)

**Required Reading**:
1. `/Users/why/repos/trivium/UNDO_STACK_IMPLEMENTATION_PLAN.md` (comprehensive plan)
2. `/Users/why/repos/trivium/UNDO_STACK_ARCHITECTURE.md` (visual diagrams)
3. `/Users/why/repos/trivium/src/lib/stores/reading.ts` (existing store)
4. `/Users/why/repos/trivium/src/lib/utils/markPositions.ts` (mark tracking utility)

---

## Phase 1: Create History Store (Day 1, 2-3 hours)

### Step 1.1: Create the file

Create `/Users/why/repos/trivium/src/lib/stores/readingHistory.ts`

### Step 1.2: Add type definitions

```typescript
import { create } from 'zustand';
import type { ClozeNote } from '../types/flashcard';
import type { ReadRange } from '../types/reading';

// Base action interface
interface HistoryAction {
  id: string;
  timestamp: number;
  type: 'text_edit' | 'mark' | 'unmark';
}

// Text edit action
interface TextEditAction extends HistoryAction {
  type: 'text_edit';
  editRegion: {
    start: number;
    end: number;
  };
  previousContent: string;
  newContent: string;
  editedText: string;
  originalText: string;
  marksBeforeEdit: ClozeNote[];
  marksAfterEdit: ClozeNote[];
  cursorPosition?: number;
}

// Mark as read action
interface MarkAction extends HistoryAction {
  type: 'mark';
  range: {
    start: number;
    end: number;
  };
  rangeId?: number;
  contentSnapshot: string;
  markedText: string;
}

// Unmark as read action
interface UnmarkAction extends HistoryAction {
  type: 'unmark';
  range: {
    start: number;
    end: number;
  };
  previousReadRanges: ReadRange[];
  contentSnapshot: string;
  unmarkedText: string;
}

// Union type
type Action = TextEditAction | MarkAction | UnmarkAction;

// State interface
interface HistoryState {
  past: Action[];
  future: Action[];
  maxHistorySize: number;
  currentTextId: number | null;
  isUndoRedoInProgress: boolean;
}

// Store interface
interface ReadingHistoryStore extends HistoryState {
  recordTextEdit: (action: Omit<TextEditAction, 'id' | 'timestamp' | 'type'>) => void;
  recordMark: (action: Omit<MarkAction, 'id' | 'timestamp' | 'type'>) => void;
  recordUnmark: (action: Omit<UnmarkAction, 'id' | 'timestamp' | 'type'>) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  resetForText: (textId: number) => void;
  _applyAction: (action: Action) => Promise<void>;
  _revertAction: (action: Action) => Promise<void>;
}
```

### Step 1.3: Create the store with basic functions

```typescript
// Helper to generate unique action ID
function generateActionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useReadingHistoryStore = create<ReadingHistoryStore>((set, get) => ({
  // Initial state
  past: [],
  future: [],
  maxHistorySize: 50,
  currentTextId: null,
  isUndoRedoInProgress: false,

  // Record text edit action
  recordTextEdit: (action) => {
    const state = get();

    // Skip if undo/redo in progress
    if (state.isUndoRedoInProgress) {
      return;
    }

    const fullAction: TextEditAction = {
      ...action,
      type: 'text_edit',
      id: generateActionId(),
      timestamp: Date.now()
    };

    console.log('[History] Recording text edit:', {
      editRegion: fullAction.editRegion,
      originalLength: fullAction.originalText.length,
      newLength: fullAction.editedText.length
    });

    let newPast = [...state.past, fullAction];

    // Trim if exceeds max size
    if (newPast.length > state.maxHistorySize) {
      newPast = newPast.slice(newPast.length - state.maxHistorySize);
    }

    set({
      past: newPast,
      future: [] // Clear future on new action
    });
  },

  // Record mark action
  recordMark: (action) => {
    const state = get();

    if (state.isUndoRedoInProgress) {
      return;
    }

    const fullAction: MarkAction = {
      ...action,
      type: 'mark',
      id: generateActionId(),
      timestamp: Date.now()
    };

    console.log('[History] Recording mark:', {
      range: fullAction.range,
      markedText: fullAction.markedText.substring(0, 50)
    });

    let newPast = [...state.past, fullAction];

    if (newPast.length > state.maxHistorySize) {
      newPast = newPast.slice(newPast.length - state.maxHistorySize);
    }

    set({
      past: newPast,
      future: []
    });
  },

  // Record unmark action
  recordUnmark: (action) => {
    const state = get();

    if (state.isUndoRedoInProgress) {
      return;
    }

    const fullAction: UnmarkAction = {
      ...action,
      type: 'unmark',
      id: generateActionId(),
      timestamp: Date.now()
    };

    console.log('[History] Recording unmark:', {
      range: fullAction.range,
      unmarkedText: fullAction.unmarkedText.substring(0, 50)
    });

    let newPast = [...state.past, fullAction];

    if (newPast.length > state.maxHistorySize) {
      newPast = newPast.slice(newPast.length - state.maxHistorySize);
    }

    set({
      past: newPast,
      future: []
    });
  },

  // Query functions
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  // Clear history
  clearHistory: () => {
    console.log('[History] Clearing history');
    set({ past: [], future: [] });
  },

  // Reset for new text
  resetForText: (textId) => {
    console.log('[History] Resetting for text:', textId);
    set({
      past: [],
      future: [],
      currentTextId: textId
    });
  },

  // Placeholders (implement in Phase 2 & 3)
  undo: async () => {
    throw new Error('Undo not yet implemented');
  },
  redo: async () => {
    throw new Error('Redo not yet implemented');
  },
  _applyAction: async () => {
    throw new Error('_applyAction not yet implemented');
  },
  _revertAction: async () => {
    throw new Error('_revertAction not yet implemented');
  }
}));
```

### Step 1.4: Test compilation

```bash
npx tsc --noEmit
```

Should compile without errors.

### Step 1.5: Test in browser console

```javascript
// Import and test
import { useReadingHistoryStore } from './lib/stores/readingHistory';

const store = useReadingHistoryStore.getState();

// Should work
store.canUndo(); // false
store.canRedo(); // false

// Record a test action
store.recordMark({
  range: { start: 0, end: 10 },
  contentSnapshot: 'test content',
  markedText: 'test'
});

// Should work
store.canUndo(); // true
store.past.length; // 1
```

---

## Phase 2: Implement Undo Logic (Day 1-2, 3-4 hours)

### Step 2.1: Import API utilities

Add to top of `readingHistory.ts`:

```typescript
import { api } from '../utils/tauri';
```

### Step 2.2: Implement `_revertAction`

Replace the placeholder:

```typescript
_revertAction: async (action: Action) => {
  const state = get();

  if (!state.currentTextId) {
    throw new Error('No current text ID set');
  }

  console.log('[History] Reverting action:', action.type, action.id);

  switch (action.type) {
    case 'text_edit': {
      // Restore previous content
      console.log('[History] Restoring previous content');
      await api.texts.updateContent(state.currentTextId, action.previousContent);
      break;
    }

    case 'mark': {
      // Unmark the range
      console.log('[History] Unmarking range:', action.range);
      await api.reading.unmarkRangeAsRead(
        state.currentTextId,
        action.range.start,
        action.range.end
      );
      break;
    }

    case 'unmark': {
      // Re-mark the range
      console.log('[History] Re-marking range:', action.range);
      await api.reading.markRangeAsRead(
        state.currentTextId,
        action.range.start,
        action.range.end
      );
      break;
    }

    default:
      const exhaustive: never = action;
      throw new Error(`Unknown action type: ${(action as Action).type}`);
  }
},
```

### Step 2.3: Implement `undo`

Replace the placeholder:

```typescript
undo: async () => {
  const state = get();

  if (state.past.length === 0) {
    console.warn('[History] No actions to undo');
    return;
  }

  if (state.isUndoRedoInProgress) {
    console.warn('[History] Undo already in progress');
    return;
  }

  const action = state.past[state.past.length - 1];
  console.log('[History] Undoing action:', action.type, action.id);

  set({ isUndoRedoInProgress: true });

  try {
    // Revert the action
    await get()._revertAction(action);

    // Update stacks only after success
    set({
      past: state.past.slice(0, -1),
      future: [...state.future, action],
      isUndoRedoInProgress: false
    });

    console.log('[History] Undo successful');
  } catch (error) {
    console.error('[History] Undo failed:', error);
    set({ isUndoRedoInProgress: false });
    throw new Error(
      'Failed to undo: ' + (error instanceof Error ? error.message : 'Unknown error')
    );
  }
},
```

### Step 2.4: Test undo (manual)

In browser console:

```javascript
// Record a mark
const store = useReadingHistoryStore.getState();
store.resetForText(1); // Set current text ID

store.recordMark({
  range: { start: 0, end: 10 },
  contentSnapshot: 'test',
  markedText: 'test'
});

// Try undo
await store.undo();

// Should see console logs and backend call
```

---

## Phase 3: Implement Redo Logic (Day 2, 2-3 hours)

### Step 3.1: Implement `_applyAction`

Replace the placeholder:

```typescript
_applyAction: async (action: Action) => {
  const state = get();

  if (!state.currentTextId) {
    throw new Error('No current text ID set');
  }

  console.log('[History] Applying action:', action.type, action.id);

  switch (action.type) {
    case 'text_edit': {
      // Apply new content
      console.log('[History] Applying new content');
      await api.texts.updateContent(state.currentTextId, action.newContent);
      break;
    }

    case 'mark': {
      // Re-mark the range
      console.log('[History] Marking range:', action.range);
      await api.reading.markRangeAsRead(
        state.currentTextId,
        action.range.start,
        action.range.end
      );
      break;
    }

    case 'unmark': {
      // Re-unmark the range
      console.log('[History] Unmarking range:', action.range);
      await api.reading.unmarkRangeAsRead(
        state.currentTextId,
        action.range.start,
        action.range.end
      );
      break;
    }

    default:
      const exhaustive: never = action;
      throw new Error(`Unknown action type: ${(action as Action).type}`);
  }
},
```

### Step 3.2: Implement `redo`

Replace the placeholder:

```typescript
redo: async () => {
  const state = get();

  if (state.future.length === 0) {
    console.warn('[History] No actions to redo');
    return;
  }

  if (state.isUndoRedoInProgress) {
    console.warn('[History] Redo already in progress');
    return;
  }

  const action = state.future[state.future.length - 1];
  console.log('[History] Redoing action:', action.type, action.id);

  set({ isUndoRedoInProgress: true });

  try {
    // Apply the action
    await get()._applyAction(action);

    // Update stacks only after success
    set({
      past: [...state.past, action],
      future: state.future.slice(0, -1),
      isUndoRedoInProgress: false
    });

    console.log('[History] Redo successful');
  } catch (error) {
    console.error('[History] Redo failed:', error);
    set({ isUndoRedoInProgress: false });
    throw new Error(
      'Failed to redo: ' + (error instanceof Error ? error.message : 'Unknown error')
    );
  }
},
```

### Step 3.3: Test redo (manual)

```javascript
// Record, undo, then redo
const store = useReadingHistoryStore.getState();

// Record
store.recordMark({ range: { start: 0, end: 10 }, contentSnapshot: 'test', markedText: 'test' });

// Undo
await store.undo();
store.canRedo(); // true

// Redo
await store.redo();
store.canUndo(); // true
store.canRedo(); // false
```

---

## Phase 4: Integrate with Mark Operations (Day 2-3, 2 hours)

### Step 4.1: Modify reading store

In `/Users/why/repos/trivium/src/lib/stores/reading.ts`, add import:

```typescript
import { useReadingHistoryStore } from './readingHistory';
```

### Step 4.2: Update `markRangeAsRead`

Find the function and modify:

```typescript
markRangeAsRead: async (textId: number, startPosition: number, endPosition: number) => {
  try {
    // Check if this is an undo/redo operation
    const historyStore = useReadingHistoryStore.getState();
    const isUndoRedo = historyStore.isUndoRedoInProgress;

    // Capture state before mark (only if not undo/redo)
    let contentSnapshot = '';
    let markedText = '';

    if (!isUndoRedo) {
      contentSnapshot = get().currentText?.content || '';
      markedText = contentSnapshot.substring(startPosition, endPosition);
    }

    // Call backend
    await api.reading.markRangeAsRead(textId, startPosition, endPosition);

    // Update local state
    await get().getReadRanges(textId);
    await get().calculateProgress(textId);
    invalidateProgressCache(textId);

    // Record in history ONLY if not undo/redo
    if (!isUndoRedo) {
      historyStore.recordMark({
        range: { start: startPosition, end: endPosition },
        contentSnapshot,
        markedText
      });
    }

    const currentText = get().currentText;
    if (currentText?.folderId) {
      invalidateFolderProgressCache(currentText.folderId);
    }
  } catch (error) {
    console.error('Failed to mark range as read:', error);
    set({
      error: error instanceof Error ? error.message : 'Failed to mark range as read'
    });
    throw error;
  }
},
```

### Step 4.3: Update `unmarkRangeAsRead`

Similar modification:

```typescript
unmarkRangeAsRead: async (textId: number, startPosition: number, endPosition: number) => {
  try {
    // Check if this is an undo/redo operation
    const historyStore = useReadingHistoryStore.getState();
    const isUndoRedo = historyStore.isUndoRedoInProgress;

    // Capture state before unmark (only if not undo/redo)
    let previousReadRanges: ReadRange[] = [];
    let contentSnapshot = '';
    let unmarkedText = '';

    if (!isUndoRedo) {
      previousReadRanges = [...get().readRanges];
      contentSnapshot = get().currentText?.content || '';
      unmarkedText = contentSnapshot.substring(startPosition, endPosition);
    }

    // Call backend
    await api.reading.unmarkRangeAsRead(textId, startPosition, endPosition);

    // Update local state
    await get().getReadRanges(textId);
    await get().calculateProgress(textId);
    invalidateProgressCache(textId);

    // Record in history ONLY if not undo/redo
    if (!isUndoRedo) {
      historyStore.recordUnmark({
        range: { start: startPosition, end: endPosition },
        previousReadRanges,
        contentSnapshot,
        unmarkedText
      });
    }

    const currentText = get().currentText;
    if (currentText?.folderId) {
      invalidateFolderProgressCache(currentText.folderId);
    }
  } catch (error) {
    console.error('Failed to unmark range as read:', error);
    set({
      error: error instanceof Error ? error.message : 'Failed to unmark range as read'
    });
    throw error;
  }
},
```

### Step 4.4: Test mark/unmark recording

Mark some text in the app, then check console:

```javascript
useReadingHistoryStore.getState().past
// Should see MarkAction recorded

// Try undo
await useReadingHistoryStore.getState().undo()
// Text should be unmarked
```

---

## Phase 5: Integrate with Text Edit Operations (Day 3, 2-3 hours)

### Step 5.1: Import utilities in ReadPage

In `/Users/why/repos/trivium/src/routes/read/[id].tsx`, add:

```typescript
import { detectEditRegion } from '@/lib/utils/markdownEdit';
import { updateMarkPositions } from '@/lib/utils/markPositions';
import { useReadingHistoryStore } from '@/lib/stores/readingHistory';
```

### Step 5.2: Modify `handleSaveInlineEdit`

Find the function (around line 204) and replace:

```typescript
const handleSaveInlineEdit = async () => {
  console.log('[ReadPage] handleSaveInlineEdit called', {
    hasCurrentText: !!currentText,
    editingContentLength: editingContent.length,
    currentTextContentLength: currentText?.content.length,
    areEqual: editingContent === currentText?.content
  });

  if (!currentText || editingContent === currentText.content) {
    console.log('[ReadPage] No changes, just deactivating');
    setInlineEditActive(false);
    return;
  }

  try {
    console.log('[ReadPage] Changes detected, processing...');

    // Detect what changed
    const editRegion = detectEditRegion(currentText.content, editingContent);
    console.log('[ReadPage] Edit region detected:', editRegion);

    // Capture marks before edit
    const marksBeforeEdit = [...marks];

    // Calculate marks after edit
    const { marks: marksAfterEdit } = updateMarkPositions(
      marksBeforeEdit,
      {
        start: editRegion.start,
        end: editRegion.end,
        originalText: editRegion.deletedText
      },
      editRegion.insertedText
    );
    console.log('[ReadPage] Marks updated:', {
      before: marksBeforeEdit.length,
      after: marksAfterEdit.length
    });

    // Save content
    console.log('[ReadPage] Saving content update...');
    await api.texts.updateContent(currentText.id, editingContent);

    console.log('[ReadPage] Reloading text and marks...');
    await loadText(currentText.id);
    await loadMarks(currentText.id);

    // Record in history
    const historyStore = useReadingHistoryStore.getState();
    if (!historyStore.isUndoRedoInProgress) {
      console.log('[ReadPage] Recording text edit in history');
      historyStore.recordTextEdit({
        editRegion: { start: editRegion.start, end: editRegion.end },
        previousContent: currentText.content,
        newContent: editingContent,
        editedText: editRegion.insertedText,
        originalText: editRegion.deletedText,
        marksBeforeEdit,
        marksAfterEdit
      });
    }

    console.log('[ReadPage] Deactivating inline edit');
    setInlineEditActive(false);
  } catch (error) {
    console.error('[ReadPage] Failed to save:', error);
    alert('Failed to save: ' + (error instanceof Error ? error.message : String(error)));
  }
};
```

### Step 5.3: Test text edit recording

Make a text edit in the app, save, then check:

```javascript
useReadingHistoryStore.getState().past
// Should see TextEditAction recorded

// Try undo
await useReadingHistoryStore.getState().undo()
// Text should revert to previous content
```

---

## Phase 6: Add UI Feedback (Day 3-4, 1-2 hours)

### Step 6.1: Add undo/redo handlers to ReadPage

In `/Users/why/repos/trivium/src/routes/read/[id].tsx`, add state:

```typescript
const [isUndoing, setIsUndoing] = useState(false);
const [isRedoing, setIsRedoing] = useState(false);
```

### Step 6.2: Get history store in ReadPage

```typescript
const { undo, redo, canUndo, canRedo, resetForText } = useReadingHistoryStore();
```

### Step 6.3: Add handlers

```typescript
const handleUndo = async () => {
  if (!currentText || isUndoing) return;

  console.log('[ReadPage] Undo requested');
  setIsUndoing(true);

  try {
    await undo();

    // Reload all state
    console.log('[ReadPage] Reloading state after undo');
    await loadText(currentText.id);
    await loadMarks(currentText.id);
    await getReadRanges(currentText.id);
    await calculateProgress(currentText.id);

    console.log('[ReadPage] Undo complete');
  } catch (error) {
    console.error('[ReadPage] Undo failed:', error);
    alert('Failed to undo: ' + (error instanceof Error ? error.message : String(error)));
  } finally {
    setIsUndoing(false);
  }
};

const handleRedo = async () => {
  if (!currentText || isRedoing) return;

  console.log('[ReadPage] Redo requested');
  setIsRedoing(true);

  try {
    await redo();

    // Reload all state
    console.log('[ReadPage] Reloading state after redo');
    await loadText(currentText.id);
    await loadMarks(currentText.id);
    await getReadRanges(currentText.id);
    await calculateProgress(currentText.id);

    console.log('[ReadPage] Redo complete');
  } catch (error) {
    console.error('[ReadPage] Redo failed:', error);
    alert('Failed to redo: ' + (error instanceof Error ? error.message : String(error)));
  } finally {
    setIsRedoing(false);
  }
};
```

### Step 6.4: Add keyboard shortcuts

Find the keyboard shortcut effect (around line 412) and add:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // ... existing shortcuts ...

    // Undo: Ctrl+Z / Cmd+Z (only when not in edit mode)
    if (
      (e.ctrlKey || e.metaKey) &&
      !e.shiftKey &&
      e.key === 'z' &&
      !isEditMode &&
      !inlineEditActive &&
      !editRegion &&
      !inlineEditRegion
    ) {
      e.preventDefault();
      if (canUndo() && !isUndoing) {
        console.log('[ReadPage] Ctrl+Z pressed - undoing');
        handleUndo();
      }
    }

    // Redo: Ctrl+Shift+Z / Cmd+Shift+Z (only when not in edit mode)
    if (
      (e.ctrlKey || e.metaKey) &&
      e.shiftKey &&
      e.key === 'z' &&
      !isEditMode &&
      !inlineEditActive &&
      !editRegion &&
      !inlineEditRegion
    ) {
      e.preventDefault();
      if (canRedo() && !isRedoing) {
        console.log('[ReadPage] Ctrl+Shift+Z pressed - redoing');
        handleRedo();
      }
    }

    // ... rest of shortcuts ...
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [
  // ... existing dependencies ...
  canUndo,
  canRedo,
  isUndoing,
  isRedoing,
  handleUndo,
  handleRedo
]);
```

### Step 6.5: Reset history when switching texts

Add effect:

```typescript
// Reset history when switching texts
useEffect(() => {
  if (currentText) {
    const historyStore = useReadingHistoryStore.getState();

    if (historyStore.currentTextId !== currentText.id) {
      console.log('[ReadPage] Resetting history for new text:', currentText.id);
      historyStore.resetForText(currentText.id);
    }
  }
}, [currentText?.id]);
```

### Step 6.6: Test keyboard shortcuts

1. Make a text edit
2. Press Ctrl+Z (should undo)
3. Press Ctrl+Shift+Z (should redo)
4. Mark some text
5. Press Ctrl+Z (should unmark)
6. Press Ctrl+Shift+Z (should re-mark)

---

## Phase 7: Testing (Day 4, 2-3 hours)

### Step 7.1: Manual Testing Checklist

Go through each scenario from the plan:

- [ ] Basic text edit undo/redo
- [ ] Basic mark undo/redo
- [ ] Mixed operations
- [ ] Edit then mark same region
- [ ] Mark then edit marked region
- [ ] Multiple edits
- [ ] Error handling
- [ ] History limit (60 actions)
- [ ] Switch between texts
- [ ] Concurrent operations

### Step 7.2: Edge Case Testing

- [ ] Undo during inline edit (should be disabled)
- [ ] Redo after new action (future cleared)
- [ ] Overlapping marks
- [ ] Very long text
- [ ] Many marks
- [ ] Rapid undo/redo

### Step 7.3: Console Verification

For each test, check console logs:

```
[History] Recording text edit: ...
[ReadPage] Ctrl+Z pressed - undoing
[History] Undoing action: text_edit ...
[History] Restoring previous content
[History] Undo successful
[ReadPage] Reloading state after undo
[ReadPage] Undo complete
```

### Step 7.4: State Verification

After each operation:

```javascript
const store = useReadingHistoryStore.getState();
console.log('Past:', store.past.length);
console.log('Future:', store.future.length);
console.log('Can undo:', store.canUndo());
console.log('Can redo:', store.canRedo());
```

---

## Troubleshooting

### Issue: Undo doesn't work

**Check**:
1. Is `currentTextId` set in history store?
2. Are there items in past stack?
3. Check browser console for errors
4. Verify backend API is responding

**Debug**:
```javascript
const store = useReadingHistoryStore.getState();
console.log('Current text ID:', store.currentTextId);
console.log('Past stack:', store.past);
console.log('Is undo in progress:', store.isUndoRedoInProgress);
```

### Issue: Marks not restored after undo

**Check**:
1. Are marks being recorded in TextEditAction?
2. Is `loadMarks()` being called after undo?
3. Check backend - are marks actually restored?

**Debug**:
```javascript
// Before undo
console.log('Marks before:', marks);

// After undo
await handleUndo();
console.log('Marks after:', marks);
```

### Issue: TypeScript errors

**Check**:
1. All types imported correctly?
2. Action types match interface?
3. Omit<> used correctly in record functions?

**Fix**:
```bash
# Recompile to see errors
npx tsc --noEmit
```

### Issue: History not cleared when switching texts

**Check**:
1. Is `resetForText()` effect added?
2. Is it in the dependency array correctly?
3. Is `currentText?.id` changing?

**Debug**:
```javascript
// Add to effect
console.log('Current text changed:', currentText?.id);
```

---

## Success Checklist

Before considering implementation complete:

- [ ] All TypeScript compiles without errors
- [ ] Undo/redo works for text edits
- [ ] Undo/redo works for mark operations
- [ ] Mixed sequences work correctly
- [ ] Keyboard shortcuts work (Ctrl+Z, Ctrl+Shift+Z)
- [ ] History clears when switching texts
- [ ] Marks restore correctly after undo
- [ ] Error messages appear on failure
- [ ] Console logs are helpful for debugging
- [ ] All 10 manual test scenarios pass
- [ ] All edge cases tested
- [ ] Performance is acceptable (< 500ms)

---

## Next Steps After Completion

### Documentation
1. Update main README with undo/redo feature
2. Add keyboard shortcuts to user documentation
3. Document new store in architecture docs

### Optimization (Optional)
1. Add undo/redo buttons to toolbar
2. Show action description in UI
3. Add history panel (list of actions)
4. Persist history to database

### Future Enhancements
1. Branch history (undo → edit → maintain branch)
2. Collaborative undo (multi-user)
3. Granular text edit tracking (per keystroke)

---

## Getting Help

If stuck:

1. Read the comprehensive plan: `UNDO_STACK_IMPLEMENTATION_PLAN.md`
2. Check architecture diagrams: `UNDO_STACK_ARCHITECTURE.md`
3. Review existing code:
   - Reading store: `src/lib/stores/reading.ts`
   - Mark positions: `src/lib/utils/markPositions.ts`
   - Markdown edit: `src/lib/utils/markdownEdit.ts`
4. Check console logs (add more if needed)
5. Test in isolation (use browser console to call store functions directly)

---

## Completion Time Estimate

- **Phase 1**: 2-3 hours (Day 1)
- **Phase 2**: 3-4 hours (Day 1-2)
- **Phase 3**: 2-3 hours (Day 2)
- **Phase 4**: 2 hours (Day 2-3)
- **Phase 5**: 2-3 hours (Day 3)
- **Phase 6**: 1-2 hours (Day 3-4)
- **Phase 7**: 2-3 hours (Day 4)

**Total**: 14-20 hours over 4 days

Good luck! 🚀
