# Undo Stack Implementation Plan: Mark/Unmark Operations + Inline Text Edits

**Date**: 2025-10-17
**Status**: Planning Phase
**Objective**: Add mark/unmark operations to a unified undo/redo stack that also handles inline text edits

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Proposed Architecture](#proposed-architecture)
3. [Data Structures](#data-structures)
4. [Integration Points](#integration-points)
5. [Implementation Phases](#implementation-phases)
6. [Edge Cases and Solutions](#edge-cases-and-solutions)
7. [Testing Strategy](#testing-strategy)

---

## Current State Analysis

### What Exists Now

#### 1. **Inline Text Editing (Phase 14)**
- **Location**: `/Users/why/repos/trivium/src/lib/components/reading/InlineRegionEditor.tsx`
- **Mechanism**:
  - User selects text → Press Ctrl+E → Opens inline editor
  - Three-region layout: dimmed context before/after + editable region
  - Dual modes: Styled (rendered markdown) and Literal (raw markdown)
  - On save: Calls `onSave(mergedContent)` which updates via `api.texts.updateContent()`
- **Current State**: NO undo/redo support for edits
- **Data Flow**:
  ```
  InlineRegionEditor → onSave callback → ReadPage.handleSaveInlineEdit →
  api.texts.updateContent → Backend → loadText → currentText updated
  ```

#### 2. **Mark/Unmark Operations**
- **Location**:
  - Store: `/Users/why/repos/trivium/src/lib/stores/reading.ts`
  - UI: `/Users/why/repos/trivium/src/routes/read/[id].tsx` (handleMarkSelectionRead)
- **Mechanism**:
  - User selects text → Press Ctrl+M or click "Mark Read"
  - Calls `markRangeAsRead(textId, startPos, endPos)` or `unmarkRangeAsRead()`
  - Backend persists to database, updates progress
- **Current State**: NO undo/redo support for marks
- **Data Flow**:
  ```
  SelectionToolbar → handleMarkSelectionRead →
  api.reading.markRangeAsRead → Backend → getReadRanges → readRanges updated
  ```

#### 3. **Existing Undo Infrastructure**
- **Location**: `/Users/why/repos/trivium/src/hooks/useTextHistory.ts`
- **Usage**: Currently UNUSED in reading view
- **Features**:
  - Text-only undo/redo for textarea/input fields
  - Debounced history snapshots (500ms default)
  - Cursor position restoration
  - Max history size limit (100 default)
- **Limitations**:
  - Only handles text content changes
  - No support for mark operations
  - Designed for single textarea, not complex document state

#### 4. **Mark Position Tracking**
- **Location**: `/Users/why/repos/trivium/src/lib/utils/markPositions.ts`
- **Function**: `updateMarkPositions(marks, editRegion, editedText)`
- **Purpose**: Updates mark positions when text is edited
- **Returns**: `{ marks, flaggedForReview, shifted }`
- **Used In**: SelectionEditor (old modal-based editor)

### What's Missing

1. **No unified action history** tracking both text edits and mark operations
2. **No undo/redo UI** in reading view (Ctrl+Z, Ctrl+Shift+Z shortcuts)
3. **No optimistic state updates** with rollback capability
4. **No mark position restoration** after undo
5. **No coordination** between text content state and read ranges state

---

## Proposed Architecture

### Core Concept: Unified History Stack

Create a **single, ordered history stack** that records both:
- Text edit operations (content changes)
- Mark operations (mark/unmark read ranges)

Each operation is **reversible** and contains all data needed to:
1. Apply the change (do)
2. Revert the change (undo)
3. Reapply the change (redo)

### Key Design Principles

1. **Immutable History**: Each history entry is read-only after creation
2. **Position-Safe**: All positions stored are in the coordinate space at the time of the action
3. **Backend-Synced**: Undo/redo calls backend APIs to maintain consistency
4. **Optimistic Updates**: UI updates immediately, backend syncs asynchronously
5. **Mark-Aware Editing**: Text edits automatically track mark position changes

---

## Data Structures

### 1. History Action Types

```typescript
// Base action interface
interface HistoryAction {
  id: string;                    // Unique action ID (timestamp + random)
  timestamp: number;             // When action was performed
  type: 'text_edit' | 'mark' | 'unmark';
}

// Text edit action
interface TextEditAction extends HistoryAction {
  type: 'text_edit';

  // Edit region in the ORIGINAL text (before edit)
  editRegion: {
    start: number;               // Start position (UTF-16)
    end: number;                 // End position (UTF-16)
  };

  // Content changes
  previousContent: string;       // Full text before edit
  newContent: string;            // Full text after edit
  editedText: string;            // Just the changed portion
  originalText: string;          // Original text in edit region

  // Mark state at time of edit
  marksBeforeEdit: ClozeNote[];  // Marks before edit (for restoration)
  marksAfterEdit: ClozeNote[];   // Marks after edit (with updated positions)

  // Cursor state (for restoration)
  cursorPosition?: number;       // Cursor position after edit
}

// Mark as read action
interface MarkAction extends HistoryAction {
  type: 'mark';

  // Range that was marked
  range: {
    start: number;               // Start position (UTF-16)
    end: number;                 // End position (UTF-16)
  };

  // Backend ID (for API calls)
  rangeId?: number;              // ID returned from backend (if available)

  // Text content at time of mark (for verification)
  contentSnapshot: string;       // Full text content
  markedText: string;            // Text that was marked
}

// Unmark as read action
interface UnmarkAction extends HistoryAction {
  type: 'unmark';

  // Range that was unmarked
  range: {
    start: number;               // Start position (UTF-16)
    end: number;                 // End position (UTF-16)
  };

  // Previous read ranges (for restoration)
  previousReadRanges: ReadRange[];

  // Text content at time of unmark
  contentSnapshot: string;
  unmarkedText: string;
}

// Union type
type Action = TextEditAction | MarkAction | UnmarkAction;
```

### 2. History State

```typescript
interface HistoryState {
  // Action stacks
  past: Action[];                // Actions that have been done
  future: Action[];              // Actions that have been undone (for redo)

  // Limits
  maxHistorySize: number;        // Maximum past actions to keep

  // Current state tracking
  currentTextId: number | null;  // Which text we're tracking history for
  isUndoRedoInProgress: boolean; // Flag to prevent recursive actions
}
```

### 3. Store Interface

```typescript
interface ReadingHistoryStore extends HistoryState {
  // Record actions
  recordTextEdit: (action: Omit<TextEditAction, 'id' | 'timestamp'>) => void;
  recordMark: (action: Omit<MarkAction, 'id' | 'timestamp'>) => void;
  recordUnmark: (action: Omit<UnmarkAction, 'id' | 'timestamp'>) => void;

  // Undo/redo operations
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  // Query state
  canUndo: () => boolean;
  canRedo: () => boolean;

  // History management
  clearHistory: () => void;
  resetForText: (textId: number) => void;

  // Internal helpers
  _applyAction: (action: Action) => Promise<void>;
  _revertAction: (action: Action) => Promise<void>;
}
```

---

## Integration Points

### 1. Reading Store (`src/lib/stores/reading.ts`)

**Current Functions to Modify:**

```typescript
// Mark as read - ADD history recording
markRangeAsRead: async (textId: number, startPosition: number, endPosition: number) => {
  try {
    // NEW: Get current state for history
    const contentSnapshot = get().currentText?.content || '';
    const markedText = contentSnapshot.substring(startPosition, endPosition);

    // Existing: Call backend
    await api.reading.markRangeAsRead(textId, startPosition, endPosition);

    // Existing: Update local state
    await get().getReadRanges(textId);
    await get().calculateProgress(textId);

    // NEW: Record in history
    useReadingHistoryStore.getState().recordMark({
      type: 'mark',
      range: { start: startPosition, end: endPosition },
      contentSnapshot,
      markedText
    });
  } catch (error) {
    // Error handling
  }
}

// Unmark as read - ADD history recording
unmarkRangeAsRead: async (textId: number, startPosition: number, endPosition: number) => {
  try {
    // NEW: Capture state before unmark
    const previousReadRanges = [...get().readRanges];
    const contentSnapshot = get().currentText?.content || '';
    const unmarkedText = contentSnapshot.substring(startPosition, endPosition);

    // Existing: Call backend
    await api.reading.unmarkRangeAsRead(textId, startPosition, endPosition);

    // Existing: Update local state
    await get().getReadRanges(textId);
    await get().calculateProgress(textId);

    // NEW: Record in history
    useReadingHistoryStore.getState().recordUnmark({
      type: 'unmark',
      range: { start: startPosition, end: endPosition },
      previousReadRanges,
      contentSnapshot,
      unmarkedText
    });
  } catch (error) {
    // Error handling
  }
}
```

### 2. ReadPage Component (`src/routes/read/[id].tsx`)

**Add Undo/Redo Handlers:**

```typescript
// NEW: Undo/redo handlers
const { undo, redo, canUndo, canRedo } = useReadingHistoryStore();

const handleUndo = async () => {
  try {
    await undo();
    // Reload text and marks to reflect undo
    if (currentText) {
      await loadText(currentText.id);
      await loadMarks(currentText.id);
      await getReadRanges(currentText.id);
      await calculateProgress(currentText.id);
    }
  } catch (error) {
    console.error('[ReadPage] Undo failed:', error);
  }
};

const handleRedo = async () => {
  try {
    await redo();
    // Reload text and marks to reflect redo
    if (currentText) {
      await loadText(currentText.id);
      await loadMarks(currentText.id);
      await getReadRanges(currentText.id);
      await calculateProgress(currentText.id);
    }
  } catch (error) {
    console.error('[ReadPage] Redo failed:', error);
  }
};

// NEW: Keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Existing shortcuts...

    // NEW: Undo (Ctrl+Z / Cmd+Z)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      if (canUndo()) {
        handleUndo();
      }
    }

    // NEW: Redo (Ctrl+Shift+Z / Cmd+Shift+Z)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
      e.preventDefault();
      if (canRedo()) {
        handleRedo();
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [canUndo, canRedo]);
```

**Modify Save Inline Edit Handler:**

```typescript
// MODIFY: Record text edit in history
const handleSaveInlineEdit = async () => {
  if (!currentText || editingContent === currentText.content) {
    setInlineEditActive(false);
    return;
  }

  try {
    // NEW: Detect edit region
    const editRegion = detectEditRegion(currentText.content, editingContent);

    // NEW: Capture marks before edit
    const marksBeforeEdit = [...marks];

    // NEW: Calculate marks after edit
    const { marks: marksAfterEdit } = updateMarkPositions(
      marksBeforeEdit,
      editRegion,
      editRegion.insertedText
    );

    // Existing: Save content
    await api.texts.updateContent(currentText.id, editingContent);
    await loadText(currentText.id);
    await loadMarks(currentText.id);

    // NEW: Record in history
    useReadingHistoryStore.getState().recordTextEdit({
      type: 'text_edit',
      editRegion: { start: editRegion.start, end: editRegion.end },
      previousContent: currentText.content,
      newContent: editingContent,
      editedText: editRegion.insertedText,
      originalText: editRegion.deletedText,
      marksBeforeEdit,
      marksAfterEdit
    });

    setInlineEditActive(false);
  } catch (error) {
    console.error('[ReadPage] Failed to save:', error);
  }
};
```

### 3. InlineRegionEditor Component

**Modify Save Handler:**

```typescript
// MODIFY: Record text edit in history
const handleSave = async () => {
  if (!hasChanges) {
    onCancel();
    return;
  }

  const mergedText =
    content.substring(0, editRegion.start) +
    editedContent +
    content.substring(editRegion.end);

  // NEW: Calculate mark position changes
  const marksBeforeEdit = marks || [];
  const { marks: marksAfterEdit } = updateMarkPositions(
    marksBeforeEdit,
    { start: editRegion.start, end: editRegion.end, originalText: originalEditedContent },
    editedContent
  );

  setIsSaving(true);

  try {
    // Call save callback (which will handle recording)
    await onSave(mergedText, {
      editRegion: { start: editRegion.start, end: editRegion.end },
      originalText: originalEditedContent,
      editedText: editedContent,
      marksBeforeEdit,
      marksAfterEdit
    });
  } finally {
    setIsSaving(false);
  }
};
```

---

## Implementation Phases

### Phase 1: Create History Store (2-3 hours)

**File**: `/Users/why/repos/trivium/src/lib/stores/readingHistory.ts`

**Tasks**:
1. Define TypeScript types for all action types
2. Create Zustand store with history state
3. Implement `recordTextEdit`, `recordMark`, `recordUnmark` functions
4. Add `canUndo()` and `canRedo()` query functions
5. Add `clearHistory()` and `resetForText()` management functions
6. Add basic validation (e.g., check textId matches)

**Success Criteria**:
- Store compiles without TypeScript errors
- Actions can be recorded to past stack
- Query functions return correct boolean values
- History can be cleared

**Code Structure**:
```typescript
import { create } from 'zustand';
import type { ReadRange, ClozeNote } from '../types';

// Type definitions here...

export const useReadingHistoryStore = create<ReadingHistoryStore>((set, get) => ({
  past: [],
  future: [],
  maxHistorySize: 50,
  currentTextId: null,
  isUndoRedoInProgress: false,

  recordTextEdit: (action) => {
    // Implementation
  },

  recordMark: (action) => {
    // Implementation
  },

  recordUnmark: (action) => {
    // Implementation
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clearHistory: () => {
    set({ past: [], future: [] });
  },

  resetForText: (textId) => {
    set({
      past: [],
      future: [],
      currentTextId: textId
    });
  },

  // Undo/redo will be implemented in Phase 2
  undo: async () => {},
  redo: async () => {},
  _applyAction: async () => {},
  _revertAction: async () => {}
}));
```

### Phase 2: Implement Undo Logic (3-4 hours)

**Tasks**:
1. Implement `_revertAction` for each action type
2. Implement `undo()` function that:
   - Pops action from past
   - Reverts the action (calls backend)
   - Pushes action to future
   - Updates local state
3. Add error handling and rollback
4. Add `isUndoRedoInProgress` flag to prevent recursion

**Undo Logic by Action Type**:

```typescript
async _revertAction(action: Action): Promise<void> {
  const state = get();

  switch (action.type) {
    case 'text_edit': {
      // Restore previous content
      await api.texts.updateContent(
        state.currentTextId!,
        action.previousContent
      );

      // Restore previous mark positions
      // (marks are loaded from backend after text update)
      break;
    }

    case 'mark': {
      // Unmark the range
      await api.reading.unmarkRangeAsRead(
        state.currentTextId!,
        action.range.start,
        action.range.end
      );
      break;
    }

    case 'unmark': {
      // Re-mark the range
      await api.reading.markRangeAsRead(
        state.currentTextId!,
        action.range.start,
        action.range.end
      );
      break;
    }
  }
}

async undo(): Promise<void> {
  const state = get();

  if (state.past.length === 0) {
    console.warn('[History] No actions to undo');
    return;
  }

  if (state.isUndoRedoInProgress) {
    console.warn('[History] Undo already in progress');
    return;
  }

  set({ isUndoRedoInProgress: true });

  try {
    // Pop most recent action
    const action = state.past[state.past.length - 1];

    // Revert the action
    await get()._revertAction(action);

    // Update stacks
    set({
      past: state.past.slice(0, -1),
      future: [...state.future, action]
    });
  } catch (error) {
    console.error('[History] Undo failed:', error);
    throw error;
  } finally {
    set({ isUndoRedoInProgress: false });
  }
}
```

### Phase 3: Implement Redo Logic (2-3 hours)

**Tasks**:
1. Implement `_applyAction` for each action type
2. Implement `redo()` function that:
   - Pops action from future
   - Applies the action (calls backend)
   - Pushes action to past
   - Updates local state
3. Add error handling

**Redo Logic by Action Type**:

```typescript
async _applyAction(action: Action): Promise<void> {
  const state = get();

  switch (action.type) {
    case 'text_edit': {
      // Apply new content
      await api.texts.updateContent(
        state.currentTextId!,
        action.newContent
      );

      // Marks are loaded from backend after text update
      break;
    }

    case 'mark': {
      // Re-mark the range
      await api.reading.markRangeAsRead(
        state.currentTextId!,
        action.range.start,
        action.range.end
      );
      break;
    }

    case 'unmark': {
      // Re-unmark the range
      await api.reading.unmarkRangeAsRead(
        state.currentTextId!,
        action.range.start,
        action.range.end
      );
      break;
    }
  }
}

async redo(): Promise<void> {
  const state = get();

  if (state.future.length === 0) {
    console.warn('[History] No actions to redo');
    return;
  }

  if (state.isUndoRedoInProgress) {
    console.warn('[History] Redo already in progress');
    return;
  }

  set({ isUndoRedoInProgress: true });

  try {
    // Pop most recent undone action
    const action = state.future[state.future.length - 1];

    // Apply the action
    await get()._applyAction(action);

    // Update stacks
    set({
      past: [...state.past, action],
      future: state.future.slice(0, -1)
    });
  } catch (error) {
    console.error('[History] Redo failed:', error);
    throw error;
  } finally {
    set({ isUndoRedoInProgress: false });
  }
}
```

### Phase 4: Integrate with Mark Operations (2 hours)

**Tasks**:
1. Modify `markRangeAsRead` in reading store to record history
2. Modify `unmarkRangeAsRead` in reading store to record history
3. Ensure history recording happens AFTER successful backend call
4. Clear future stack when new mark operation is performed

**Code Changes**:

In `/Users/why/repos/trivium/src/lib/stores/reading.ts`:

```typescript
import { useReadingHistoryStore } from './readingHistory';

// Modify markRangeAsRead
markRangeAsRead: async (textId: number, startPosition: number, endPosition: number) => {
  try {
    // Check if this is an undo/redo operation
    const historyStore = useReadingHistoryStore.getState();
    const isUndoRedo = historyStore.isUndoRedoInProgress;

    // Capture state before mark
    const contentSnapshot = get().currentText?.content || '';
    const markedText = contentSnapshot.substring(startPosition, endPosition);

    // Call backend
    await api.reading.markRangeAsRead(textId, startPosition, endPosition);

    // Update local state
    await get().getReadRanges(textId);
    await get().calculateProgress(textId);
    invalidateProgressCache(textId);

    // Record in history ONLY if not undo/redo
    if (!isUndoRedo) {
      historyStore.recordMark({
        type: 'mark',
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
    throw error;
  }
}
```

### Phase 5: Integrate with Text Edit Operations (2-3 hours)

**Tasks**:
1. Add `detectEditRegion` utility to detect changed region
2. Modify save handlers in ReadPage and InlineRegionEditor
3. Record text edit actions with mark position tracking
4. Ensure proper error handling

**New Utility Function**:

Add to `/Users/why/repos/trivium/src/lib/utils/markdownEdit.ts`:

```typescript
// This function already exists! Just import it.
export { detectEditRegion } from './markdownEdit';
```

**Code Changes**:

In `/Users/why/repos/trivium/src/routes/read/[id].tsx`:

```typescript
import { detectEditRegion } from '@/lib/utils/markdownEdit';
import { updateMarkPositions } from '@/lib/utils/markPositions';
import { useReadingHistoryStore } from '@/lib/stores/readingHistory';

const handleSaveInlineEdit = async () => {
  if (!currentText || editingContent === currentText.content) {
    setInlineEditActive(false);
    return;
  }

  try {
    // Detect what changed
    const editRegion = detectEditRegion(currentText.content, editingContent);

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

    // Save content
    await api.texts.updateContent(currentText.id, editingContent);
    await loadText(currentText.id);
    await loadMarks(currentText.id);

    // Record in history
    const historyStore = useReadingHistoryStore.getState();
    if (!historyStore.isUndoRedoInProgress) {
      historyStore.recordTextEdit({
        type: 'text_edit',
        editRegion: { start: editRegion.start, end: editRegion.end },
        previousContent: currentText.content,
        newContent: editingContent,
        editedText: editRegion.insertedText,
        originalText: editRegion.deletedText,
        marksBeforeEdit,
        marksAfterEdit
      });
    }

    setInlineEditActive(false);
  } catch (error) {
    console.error('[ReadPage] Failed to save:', error);
  }
};
```

### Phase 6: Add UI Feedback (1-2 hours)

**Tasks**:
1. Add keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
2. Add undo/redo buttons to toolbar (optional)
3. Add visual feedback for undo/redo actions
4. Add loading states during undo/redo

**Code Changes**:

In `/Users/why/repos/trivium/src/routes/read/[id].tsx`:

```typescript
const { undo, redo, canUndo, canRedo } = useReadingHistoryStore();
const [isUndoing, setIsUndoing] = useState(false);
const [isRedoing, setIsRedoing] = useState(false);

const handleUndo = async () => {
  if (!currentText || isUndoing) return;

  setIsUndoing(true);
  try {
    await undo();
    // Reload state
    await loadText(currentText.id);
    await loadMarks(currentText.id);
    await getReadRanges(currentText.id);
    await calculateProgress(currentText.id);
  } catch (error) {
    console.error('[ReadPage] Undo failed:', error);
    alert('Failed to undo: ' + (error instanceof Error ? error.message : String(error)));
  } finally {
    setIsUndoing(false);
  }
};

const handleRedo = async () => {
  if (!currentText || isRedoing) return;

  setIsRedoing(true);
  try {
    await redo();
    // Reload state
    await loadText(currentText.id);
    await loadMarks(currentText.id);
    await getReadRanges(currentText.id);
    await calculateProgress(currentText.id);
  } catch (error) {
    console.error('[ReadPage] Redo failed:', error);
    alert('Failed to redo: ' + (error instanceof Error ? error.message : String(error)));
  } finally {
    setIsRedoing(false);
  }
};

// Add to existing keyboard shortcuts effect
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // ... existing shortcuts ...

    // Undo: Ctrl+Z / Cmd+Z
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z' && !isEditMode && !inlineEditActive) {
      e.preventDefault();
      if (canUndo() && !isUndoing) {
        handleUndo();
      }
    }

    // Redo: Ctrl+Shift+Z / Cmd+Shift+Z
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z' && !isEditMode && !inlineEditActive) {
      e.preventDefault();
      if (canRedo() && !isRedoing) {
        handleRedo();
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [/* ... dependencies including canUndo, canRedo, isUndoing, isRedoing */]);
```

### Phase 7: Testing and Edge Cases (2-3 hours)

**Tasks**:
1. Test undo/redo for text edits
2. Test undo/redo for mark operations
3. Test mixed sequences (edit → mark → undo → redo)
4. Test error cases (backend failures)
5. Test history limits
6. Test switching between texts

---

## Edge Cases and Solutions

### 1. **Edit Then Mark Same Region**

**Scenario**: User edits text, then marks the edited region as read

**Challenge**: Mark positions are in new text space

**Solution**:
- Mark operation uses current text state
- Undo of mark works independently
- Undo of edit shifts mark back automatically (backend handles this)

### 2. **Mark Then Edit Marked Region**

**Scenario**: User marks text as read, then edits that region

**Challenge**: Edit may invalidate the mark

**Solution**:
- Text edit records mark state before/after
- Undo of edit restores marks to previous positions
- Marks may be flagged as "needs_review" if edit overlaps

### 3. **Multiple Edits in Quick Succession**

**Scenario**: User makes several edits without saving

**Challenge**: Only final edit is saved

**Solution**:
- Each save creates ONE history entry
- Use `detectEditRegion` to find actual difference between original and final
- This matches current behavior (no intermediate states)

### 4. **Backend Failure During Undo**

**Scenario**: Backend API call fails during undo

**Challenge**: State becomes inconsistent

**Solution**:
```typescript
async undo(): Promise<void> {
  const state = get();
  const action = state.past[state.past.length - 1];

  try {
    set({ isUndoRedoInProgress: true });

    // Try to revert
    await get()._revertAction(action);

    // Only update stacks if successful
    set({
      past: state.past.slice(0, -1),
      future: [...state.future, action]
    });
  } catch (error) {
    // Don't update stacks on failure
    console.error('[History] Undo failed, state unchanged:', error);

    // Show user feedback
    throw new Error('Failed to undo: ' + (error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    set({ isUndoRedoInProgress: false });
  }
}
```

### 5. **Switching Between Texts**

**Scenario**: User switches to different text

**Challenge**: History should be per-text

**Solution**:
```typescript
// In ReadPage component
useEffect(() => {
  if (currentText) {
    const historyStore = useReadingHistoryStore.getState();

    // Reset history when switching texts
    if (historyStore.currentTextId !== currentText.id) {
      historyStore.resetForText(currentText.id);
    }
  }
}, [currentText?.id]);
```

### 6. **Undo/Redo During Active Edit**

**Scenario**: User is in inline edit mode and presses Ctrl+Z

**Challenge**: Should undo global action or local edit?

**Solution**:
- Disable global undo/redo when in edit mode
- Add check in keyboard handler:
```typescript
if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
  // Don't handle if in edit mode
  if (inlineEditActive || isEditMode || editRegion || inlineEditRegion) {
    return; // Let contentEditable handle it
  }

  e.preventDefault();
  handleUndo();
}
```

### 7. **Mark Overlapping Previously Marked Region**

**Scenario**: User marks overlapping regions

**Challenge**: Backend merges ranges, undo should unmark only new portion

**Solution**:
- Store exact range that was marked in action
- Undo calls `unmarkRangeAsRead` with exact same range
- Backend handles range splitting/merging

### 8. **Very Large History Stack**

**Scenario**: User performs hundreds of operations

**Challenge**: Memory consumption

**Solution**:
- Implement `maxHistorySize` limit (default 50)
- When adding new action, remove oldest if limit reached:
```typescript
recordAction: (action: Action) => {
  const state = get();

  let newPast = [...state.past, action];

  // Trim if exceeds limit
  if (newPast.length > state.maxHistorySize) {
    newPast = newPast.slice(newPast.length - state.maxHistorySize);
  }

  set({
    past: newPast,
    future: [] // Clear future on new action
  });
}
```

### 9. **Cursor Position After Undo**

**Scenario**: User undoes text edit, where should cursor be?

**Challenge**: Cursor position may not be meaningful after undo

**Solution**:
- Don't try to restore cursor position
- Let user's next click/selection set cursor
- Alternative: Store cursor in TextEditAction and restore to `action.cursorPosition`

### 10. **Undo Text Edit with Dependent Marks**

**Scenario**: User edits text, which causes marks to shift. Then undoes.

**Challenge**: Marks need to be restored to original positions

**Solution**:
- TextEditAction stores `marksBeforeEdit` and `marksAfterEdit`
- On undo, marks are automatically restored from backend after text content is restored
- Backend stores mark positions with text, so reverting text reverts marks

---

## Testing Strategy

### Unit Tests

**File**: `/Users/why/repos/trivium/src/lib/stores/__tests__/readingHistory.test.ts`

**Test Cases**:

1. **Action Recording**
   - Records text edit action correctly
   - Records mark action correctly
   - Records unmark action correctly
   - Assigns unique IDs and timestamps
   - Clears future stack on new action

2. **Undo/Redo State**
   - `canUndo()` returns false when past is empty
   - `canUndo()` returns true when past has actions
   - `canRedo()` returns false when future is empty
   - `canRedo()` returns true when future has actions

3. **History Limits**
   - Trims past stack when exceeds maxHistorySize
   - Keeps most recent actions
   - Removes oldest actions

4. **Text Switching**
   - `resetForText()` clears history stacks
   - Updates currentTextId
   - Preserves maxHistorySize

### Integration Tests

**Manual Testing Scenarios**:

1. **Basic Text Edit Undo/Redo**
   - Make a text edit → Save → Undo → Verify original text restored → Redo → Verify edit restored

2. **Basic Mark Undo/Redo**
   - Mark text as read → Undo → Verify unmarked → Redo → Verify marked

3. **Mixed Operations**
   - Mark text → Edit text → Mark different text → Undo → Undo → Undo → Verify all restored

4. **Edit Then Mark**
   - Edit text region → Mark same region → Undo mark → Undo edit → Verify both restored

5. **Mark Then Edit**
   - Mark text → Edit marked region → Undo edit → Verify mark still present → Undo mark

6. **Multiple Edits**
   - Edit → Save → Edit again → Save → Undo → Verify first edit → Undo → Verify original

7. **Error Handling**
   - Simulate backend failure → Attempt undo → Verify error message → Verify state unchanged

8. **History Limit**
   - Perform 60 actions → Verify only last 50 in history → Undo 50 times → Verify stops

9. **Switch Texts**
   - Edit text A → Switch to text B → Verify can't undo text A actions → Switch back → Verify history cleared

10. **Concurrent Operations**
    - Mark text → Start edit (don't save) → Mark different text → Save edit → Verify both actions recorded

### Console Logging for Debugging

Add console logs in development mode:

```typescript
recordTextEdit: (action) => {
  const fullAction = {
    ...action,
    id: generateActionId(),
    timestamp: Date.now()
  };

  console.log('[History] Recording text edit:', {
    editRegion: fullAction.editRegion,
    originalLength: fullAction.originalText.length,
    newLength: fullAction.editedText.length,
    marksAffected: fullAction.marksAfterEdit.length
  });

  // ... rest of implementation
}
```

---

## Implementation Checklist

### Phase 1: History Store ✓
- [ ] Create `/Users/why/repos/trivium/src/lib/stores/readingHistory.ts`
- [ ] Define Action type interfaces (TextEditAction, MarkAction, UnmarkAction)
- [ ] Define HistoryState interface
- [ ] Define ReadingHistoryStore interface
- [ ] Create Zustand store with initial state
- [ ] Implement `recordTextEdit`
- [ ] Implement `recordMark`
- [ ] Implement `recordUnmark`
- [ ] Implement `canUndo` and `canRedo`
- [ ] Implement `clearHistory`
- [ ] Implement `resetForText`
- [ ] Add TypeScript compilation test
- [ ] Add basic unit tests

### Phase 2: Undo Logic ✓
- [ ] Implement `_revertAction` for text_edit
- [ ] Implement `_revertAction` for mark
- [ ] Implement `_revertAction` for unmark
- [ ] Implement `undo()` function
- [ ] Add `isUndoRedoInProgress` flag
- [ ] Add error handling with rollback
- [ ] Test undo for each action type

### Phase 3: Redo Logic ✓
- [ ] Implement `_applyAction` for text_edit
- [ ] Implement `_applyAction` for mark
- [ ] Implement `_applyAction` for unmark
- [ ] Implement `redo()` function
- [ ] Add error handling
- [ ] Test redo for each action type

### Phase 4: Mark Integration ✓
- [ ] Import history store in `/Users/why/repos/trivium/src/lib/stores/reading.ts`
- [ ] Modify `markRangeAsRead` to record history
- [ ] Modify `unmarkRangeAsRead` to record history
- [ ] Add check for `isUndoRedoInProgress` flag
- [ ] Test mark/unmark with history recording
- [ ] Test undo/redo of marks

### Phase 5: Text Edit Integration ✓
- [ ] Import utilities in `/Users/why/repos/trivium/src/routes/read/[id].tsx`
- [ ] Modify `handleSaveInlineEdit` to record history
- [ ] Modify `handleSaveSelectionEdit` to record history (if still used)
- [ ] Use `detectEditRegion` to find changes
- [ ] Use `updateMarkPositions` to track mark changes
- [ ] Test text edit with history recording
- [ ] Test undo/redo of text edits

### Phase 6: UI Feedback ✓
- [ ] Add `handleUndo` function in ReadPage
- [ ] Add `handleRedo` function in ReadPage
- [ ] Add Ctrl+Z keyboard shortcut
- [ ] Add Ctrl+Shift+Z keyboard shortcut
- [ ] Add loading states (isUndoing, isRedoing)
- [ ] Add error messages for failed undo/redo
- [ ] Test keyboard shortcuts
- [ ] (Optional) Add undo/redo buttons to toolbar

### Phase 7: Testing ✓
- [ ] Write unit tests for history store
- [ ] Test all 10 manual testing scenarios
- [ ] Test edge cases (1-10 listed above)
- [ ] Add console logging for debugging
- [ ] Performance test with large history
- [ ] Test on different browsers
- [ ] Update documentation

---

## Success Metrics

### Functional Requirements
- ✓ Users can undo any text edit with Ctrl+Z
- ✓ Users can undo any mark/unmark operation with Ctrl+Z
- ✓ Users can redo with Ctrl+Shift+Z
- ✓ Undo/redo work correctly in mixed sequences
- ✓ History is cleared when switching texts
- ✓ Marks are restored correctly after undo
- ✓ Backend stays in sync with frontend

### Performance Requirements
- ✓ Undo/redo completes in < 500ms
- ✓ History recording adds < 10ms overhead
- ✓ Memory usage stays reasonable (< 5MB for 50 actions)

### Code Quality Requirements
- ✓ All TypeScript types are properly defined
- ✓ No TypeScript compilation errors
- ✓ All unit tests pass
- ✓ Code follows existing project patterns
- ✓ Proper error handling with user feedback
- ✓ Console logging for debugging (dev mode only)

---

## Future Enhancements

### Not in Initial Implementation

1. **Persistent History** (save to database)
   - Store history across sessions
   - Restore history when reopening text
   - Sync history across devices

2. **Undo/Redo Buttons in UI**
   - Add buttons to toolbar
   - Show tooltips with action descriptions
   - Visual feedback for disabled state

3. **History Panel**
   - Show list of recent actions
   - Click to undo/redo to specific point
   - Show action descriptions

4. **Branching History**
   - Allow undo → edit → maintain branch
   - Switch between history branches
   - More complex than linear undo/redo

5. **Granular Text Edit Tracking**
   - Record each keystroke (like Google Docs)
   - Allow scrubbing through edit history
   - Requires different architecture

6. **Collaborative Undo**
   - Multi-user editing
   - Track who made each change
   - Conflict resolution

---

## Appendix: File Structure

### New Files to Create

```
src/lib/stores/
  readingHistory.ts              (NEW - main history store)
  __tests__/
    readingHistory.test.ts       (NEW - unit tests)
```

### Files to Modify

```
src/lib/stores/
  reading.ts                     (MODIFY - add history recording to mark operations)

src/routes/read/
  [id].tsx                       (MODIFY - add undo/redo handlers and keyboard shortcuts)

src/lib/components/reading/
  InlineRegionEditor.tsx         (MODIFY - record history on save)
```

### Files to Reference (No Changes)

```
src/lib/utils/
  markPositions.ts               (USE - updateMarkPositions function)
  markdownEdit.ts                (USE - detectEditRegion function)

src/lib/types/
  flashcard.ts                   (USE - ClozeNote type)
  reading.ts                     (USE - ReadRange type)

src/hooks/
  useTextHistory.ts              (REFERENCE - similar pattern, but not reused)
```

---

## Questions for Clarification

Before implementing, consider:

1. **History Persistence**: Should history be saved to database or just in-memory?
   - Recommendation: Start with in-memory, add persistence later if needed

2. **History Per-Text vs Global**: Should each text have separate history or one global?
   - Recommendation: Per-text (clearer UX, matches current design)

3. **Max History Size**: What's reasonable limit?
   - Recommendation: 50 actions (balances usability with memory)

4. **Undo During Edit**: Should Ctrl+Z work inside inline editor?
   - Recommendation: No - let contentEditable handle it

5. **Visual Feedback**: Toast notification on undo/redo?
   - Recommendation: Optional - add in Phase 6 if time permits

6. **Debouncing**: Should rapid actions be grouped?
   - Recommendation: No - each save/mark is atomic

---

## Summary

This implementation plan provides a **complete, production-ready undo/redo system** for the reading view that handles both text edits and mark operations in a unified history stack.

**Key Features**:
- ✓ Unified history for all operations
- ✓ Backend-synced for consistency
- ✓ Mark-aware text editing
- ✓ Proper error handling
- ✓ Per-text history isolation
- ✓ Memory-efficient with limits
- ✓ Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)

**Estimated Implementation Time**: 14-20 hours total across all phases

**Dependencies**: None - all required utilities and types already exist

**Risk Assessment**: Low - builds on existing patterns, well-defined scope, comprehensive edge case handling

**Next Steps**:
1. Review this plan with team
2. Create feature branch
3. Implement Phase 1 (History Store)
4. Test and iterate through remaining phases
