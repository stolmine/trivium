# Mark Deletion on Edit - Implementation Plan

## Executive Summary

This document outlines the implementation plan for:
1. Removing highlight styling from the inline editor view
2. Warning users when editing regions containing marks
3. Deleting affected marks from all systems (backend, card hub, reading view)

## Current System Analysis

### 1. Mark Rendering System

**Location**: `/Users/why/repos/trivium/src/lib/components/reading/MarkdownRenderer.tsx`

**Current Behavior**:
- Lines 69-70, 119-120, 140, 148: Marks are highlighted with `backgroundColor: '#fef08a'` (yellow)
- This highlighting is applied to both normal reading view AND inline editor
- Marks are passed as props and rendered via `getMarkAtPosition()` function

**Problem**:
- When InlineRegionEditor is active, marks within the edit region are still highlighted
- This creates visual confusion between "text being edited" and "marked text"

### 2. Inline Editing Components

**InlineRegionEditor** (`/Users/why/repos/trivium/src/lib/components/reading/InlineRegionEditor.tsx`):
- Lines 58-67: Filters marks to only those within edit region
- Lines 190-198: Passes filtered marks to EditableContent
- **Does NOT hide highlight styling** - this is the issue

**EditableContent** (`/Users/why/repos/trivium/src/lib/components/reading/EditableContent.tsx`):
- Lines 57-67: In styled mode, delegates rendering to MarkdownRenderer
- Lines 12, 21: Accepts marks prop and passes it through

**MarkdownRenderer** (`/Users/why/repos/trivium/src/lib/components/reading/MarkdownRenderer.tsx`):
- Lines 54-123: Renders text nodes with background color if mark exists
- Lines 126-158: Renders link nodes with background color if mark exists

### 3. Mark Storage System

**Frontend Storage**:
- Type definition: `/Users/why/repos/trivium/src/lib/types/flashcard.ts` (lines 24-37)
- ClozeNote interface includes: id, textId, originalText, startPosition, endPosition, status, notes

**Backend Storage**:
- Database: SQLite with `cloze_notes` table
- Schema: `/Users/why/repos/trivium/src-tauri/migrations/20251013000000_add_cloze_notes.sql`
- Foreign key: `text_id REFERENCES texts(id) ON DELETE CASCADE`
- Workflow tracking: `/Users/why/repos/trivium/src-tauri/migrations/20251015000003_add_cloze_note_workflow_tracking.sql`
  - Status: 'pending', 'converted', 'skipped', 'buried', 'needs_review'

**Associated Flashcards**:
- Flashcards reference cloze_notes via `cloze_note_id`
- Cascade delete: `REFERENCES cloze_notes(id) ON DELETE CASCADE`
- This means deleting a cloze_note will automatically delete associated flashcards

### 4. Mark Update System

**Current Smart Mark Logic** (`/Users/why/repos/trivium/src-tauri/src/commands/texts.rs`, lines 284-451):
- Function: `update_text_with_smart_marks`
- Behavior when marks overlap edit region:
  - Sets status to 'needs_review'
  - Adds notes: 'Text edited in marked region'
  - **Does NOT delete marks** - only flags them

**Frontend Mark Position Updates** (`/Users/why/repos/trivium/src/lib/utils/markPositions.ts`):
- Function: `updateMarkPositions`
- Handles three cases:
  1. Before edit: no change
  2. After edit: shift positions
  3. Overlapping edit: flag for review (status='needs_review')
- **Does NOT delete marks** - only flags

### 5. Card Creation Hub

**Location**: `/Users/why/repos/trivium/src/lib/stores/cardCreation.ts`

**Current Behavior**:
- Loads marks with `api.hub.getMarksForScope()`
- Backend: `/Users/why/repos/trivium/src-tauri/src/commands/flashcard_hub.rs`
- Filters marks by status: shows 'pending' and 'skipped' marks without cards
- If marks are deleted, they will automatically disappear from hub queries

### 6. Undo/Redo System

**Location**: `/Users/why/repos/trivium/src/lib/stores/readingHistory.ts`

**Current Text Edit Recording** (lines 87-117):
- Records: editRegion, previousContent, newContent, marksBeforeEdit, marksAfterEdit
- Undo: restores previousContent (line 215)
- **Does NOT track mark deletions separately**

**Issue**:
- If we delete marks on edit, undo will restore content but NOT the deleted marks
- Need to extend history to track mark deletions

## Proposed Architecture

### Phase 1: Remove Highlights from Inline Editor

**Goal**: Hide mark highlighting when InlineRegionEditor is active

**Implementation Strategy**: CSS-based conditional rendering

**Files to Modify**:

1. **MarkdownRenderer.tsx** (lines 54-158)
   - Add new prop: `suppressMarkHighlighting?: boolean`
   - Modify `renderTextNode()` to check this prop before applying backgroundColor
   - Modify `renderLinkNode()` to check this prop before applying backgroundColor

2. **EditableContent.tsx** (lines 57-67)
   - Pass `suppressMarkHighlighting={true}` to MarkdownRenderer when in edit mode

3. **InlineRegionEditor.tsx** (lines 190-198)
   - Pass marks to EditableContent (already done)
   - EditableContent will suppress highlighting automatically

**Code Changes**:

```typescript
// MarkdownRenderer.tsx - Update interface
interface MarkdownRendererProps {
  ast: Root
  markdown: string
  onTextEdit: (newMarkdown: string) => void
  editableRange?: { start: number; end: number }
  marks?: ClozeNote[]
  mode: 'styled' | 'literal'
  suppressMarkHighlighting?: boolean  // NEW
}

// MarkdownRenderer.tsx - Update renderTextNode (line 69-70)
function renderTextNode(...) {
  const position = getNodePosition(node)
  if (!position) {
    return <span key={key}>{node.value}</span>
  }

  const mark = getMarkAtPosition(position.start, marks)
  const backgroundColor = (mark && !suppressMarkHighlighting) ? '#fef08a' : undefined  // MODIFIED

  // ... rest of function
}

// MarkdownRenderer.tsx - Update renderLinkNode (line 148)
function renderLinkNode(...) {
  // ...
  return (
    <span key={key} style={{
      backgroundColor: (mark && !suppressMarkHighlighting) ? '#fef08a' : undefined  // MODIFIED
    }}>
      <EditableLink ... />
    </span>
  )
}

// EditableContent.tsx - Pass suppressMarkHighlighting (line 59)
if (mode === 'styled' && ast) {
  return (
    <MarkdownRenderer
      ast={ast}
      markdown={markdown}
      onTextEdit={handleContentChange}
      editableRange={editableRange}
      marks={marks}
      mode={mode}
      suppressMarkHighlighting={true}  // NEW - always suppress in edit mode
    />
  )
}
```

**Testing**:
- Open InlineRegionEditor on text with marks
- Verify highlights are hidden in editor
- Exit editor - verify highlights reappear in normal view

---

### Phase 2: Detect Overlapping Marks

**Goal**: Identify which marks overlap with the edit region

**Implementation Strategy**: Create utility function to find overlapping marks

**Files to Create/Modify**:

1. **New file**: `/Users/why/repos/trivium/src/lib/utils/markOverlap.ts`

```typescript
import type { ClozeNote } from '@/lib/types/flashcard';

export interface OverlapResult {
  overlappingMarks: ClozeNote[];
  safeMarks: ClozeNote[];
  deletedMarkIds: number[];
}

/**
 * Detect which marks overlap with an edit region
 *
 * A mark overlaps if:
 * - mark.startPosition < editRegion.end AND
 * - mark.endPosition > editRegion.start
 *
 * This catches all cases:
 * - Mark completely inside edit region
 * - Mark partially overlapping (either side)
 * - Mark completely containing edit region
 *
 * Edge cases:
 * - Mark ends exactly at edit start (mark.end === edit.start): NO overlap
 * - Mark starts exactly at edit end (mark.start === edit.end): NO overlap
 */
export function detectMarkOverlap(
  marks: ClozeNote[],
  editRegion: { start: number; end: number }
): OverlapResult {
  const overlappingMarks: ClozeNote[] = [];
  const safeMarks: ClozeNote[] = [];
  const deletedMarkIds: number[] = [];

  for (const mark of marks) {
    // Check for overlap
    const overlaps =
      mark.startPosition < editRegion.end &&
      mark.endPosition > editRegion.start;

    if (overlaps) {
      overlappingMarks.push(mark);
      deletedMarkIds.push(mark.id);
    } else {
      safeMarks.push(mark);
    }
  }

  return { overlappingMarks, safeMarks, deletedMarkIds };
}

/**
 * Format mark information for warning dialog
 */
export function formatMarkForWarning(mark: ClozeNote): string {
  const preview = mark.originalText.length > 50
    ? mark.originalText.substring(0, 50) + '...'
    : mark.originalText;

  return `"${preview}" (${mark.startPosition}-${mark.endPosition})`;
}
```

**Testing**:
- Test with mark completely inside edit region
- Test with mark partially overlapping (start)
- Test with mark partially overlapping (end)
- Test with mark completely containing edit region
- Test with mark adjacent but not overlapping
- Test with multiple marks

---

### Phase 3: Warning Dialog Component

**Goal**: Show a confirmation dialog when user tries to save an edit that affects marks

**Implementation Strategy**: Create reusable dialog component

**Files to Create**:

1. **New file**: `/Users/why/repos/trivium/src/lib/components/reading/MarkDeletionWarning.tsx`

```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button
} from '@/lib/components/ui';
import type { ClozeNote } from '@/lib/types/flashcard';
import { formatMarkForWarning } from '@/lib/utils/markOverlap';

interface MarkDeletionWarningProps {
  open: boolean;
  marks: ClozeNote[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function MarkDeletionWarning({
  open,
  marks,
  onConfirm,
  onCancel
}: MarkDeletionWarningProps) {
  const markCount = marks.length;
  const hasCards = marks.some(m => m.status === 'converted');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Delete {markCount} {markCount === 1 ? 'Mark' : 'Marks'}?
          </DialogTitle>
          <DialogDescription>
            This edit overlaps with {markCount} marked {markCount === 1 ? 'region' : 'regions'}.
            {hasCards && ' Some marks have flashcards that will also be deleted.'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto space-y-2 py-4">
          {marks.map((mark) => (
            <div
              key={mark.id}
              className="text-sm p-2 bg-muted rounded border-l-4 border-destructive/50"
            >
              <div className="font-mono text-xs text-muted-foreground mb-1">
                Position: {mark.startPosition}-{mark.endPosition}
                {mark.status === 'converted' && (
                  <span className="ml-2 text-destructive">• Has flashcards</span>
                )}
              </div>
              <div className="italic">{formatMarkForWarning(mark)}</div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel Edit
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete {markCount === 1 ? 'Mark' : 'Marks'} and Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Testing**:
- Display dialog with 1 mark
- Display dialog with multiple marks
- Display dialog with marks that have flashcards
- Test cancel button
- Test confirm button
- Test escape key to close

---

### Phase 4: Backend Mark Deletion

**Goal**: Create backend command to delete marks and associated flashcards

**Implementation Strategy**: Add new Tauri command with transaction support

**Files to Modify/Create**:

1. **Add to `/Users/why/repos/trivium/src-tauri/src/commands/flashcards.rs`**:

```rust
#[tauri::command]
pub async fn delete_marks(
    mark_ids: Vec<i64>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<DeleteMarksResult, String> {
    let db = db.lock().await;
    let pool = db.pool();

    if mark_ids.is_empty() {
        return Ok(DeleteMarksResult {
            deleted_marks: 0,
            deleted_flashcards: 0,
        });
    }

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Count flashcards before deletion (for reporting)
    let placeholders = mark_ids
        .iter()
        .map(|_| "?")
        .collect::<Vec<_>>()
        .join(",");

    let query_str = format!(
        "SELECT COUNT(*) as count FROM flashcards WHERE cloze_note_id IN ({})",
        placeholders
    );

    let mut query = sqlx::query(&query_str);
    for id in &mark_ids {
        query = query.bind(id);
    }

    let flashcard_count: i64 = query
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| format!("Failed to count flashcards: {}", e))?
        .try_get("count")
        .unwrap_or(0);

    // Delete marks (cascades to flashcards)
    let delete_query_str = format!(
        "DELETE FROM cloze_notes WHERE id IN ({})",
        placeholders
    );

    let mut delete_query = sqlx::query(&delete_query_str);
    for id in &mark_ids {
        delete_query = delete_query.bind(id);
    }

    let result = delete_query
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to delete marks: {}", e))?;

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(DeleteMarksResult {
        deleted_marks: result.rows_affected() as i64,
        deleted_flashcards: flashcard_count,
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteMarksResult {
    pub deleted_marks: i64,
    pub deleted_flashcards: i64,
}
```

2. **Register command in `/Users/why/repos/trivium/src-tauri/src/main.rs`**:

```rust
// Add to invoke_handler list
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    delete_marks,
])
```

3. **Add to frontend API** (`/Users/why/repos/trivium/src/lib/utils/tauri.ts`, around line 250):

```typescript
export const api = {
  // ... existing api groups ...

  flashcards: {
    // ... existing flashcard methods ...

    deleteMarks: async (markIds: number[]): Promise<{
      deletedMarks: number;
      deletedFlashcards: number;
    }> => {
      return await invoke('delete_marks', { markIds });
    },
  },
};
```

**Testing**:
- Delete single mark without flashcards
- Delete single mark with flashcards
- Delete multiple marks
- Verify flashcards are cascade deleted
- Verify transaction rollback on error

---

### Phase 5: Integrate Warning into InlineRegionEditor

**Goal**: Show warning before saving edits that overlap marks

**Implementation Strategy**: Add warning state and check on save

**Files to Modify**:

1. **InlineRegionEditor.tsx** (lines 126-144):

```typescript
import { detectMarkOverlap } from '@/lib/utils/markOverlap';
import { MarkDeletionWarning } from './MarkDeletionWarning';
import { api } from '@/lib/utils/tauri';

// Add state for warning dialog
const [showMarkDeletionWarning, setShowMarkDeletionWarning] = useState(false);
const [marksToDelete, setMarksToDelete] = useState<ClozeNote[]>([]);

const handleSave = async () => {
  if (!hasChanges) {
    onCancel();
    return;
  }

  // Detect overlapping marks
  const { overlappingMarks, deletedMarkIds } = detectMarkOverlap(
    marks || [],
    editRegion
  );

  // If marks will be affected, show warning
  if (overlappingMarks.length > 0) {
    console.log('[InlineRegionEditor] Edit overlaps with marks:', {
      count: overlappingMarks.length,
      ids: deletedMarkIds
    });

    setMarksToDelete(overlappingMarks);
    setShowMarkDeletionWarning(true);
    return; // Wait for user confirmation
  }

  // No marks affected, proceed with save
  await performSave();
};

const performSave = async () => {
  setIsSaving(true);

  try {
    // Delete marks if any were flagged
    if (marksToDelete.length > 0) {
      const deletedMarkIds = marksToDelete.map(m => m.id);
      console.log('[InlineRegionEditor] Deleting marks:', deletedMarkIds);

      const result = await api.flashcards.deleteMarks(deletedMarkIds);
      console.log('[InlineRegionEditor] Deleted:', result);
    }

    // Merge and save content
    const mergedText =
      content.substring(0, editRegion.start) +
      editedContent +
      content.substring(editRegion.end);

    await onSave(mergedText);

    // Reset warning state
    setShowMarkDeletionWarning(false);
    setMarksToDelete([]);
  } finally {
    setIsSaving(false);
  }
};

const handleCancelWarning = () => {
  setShowMarkDeletionWarning(false);
  setMarksToDelete([]);
};

const handleConfirmDeletion = async () => {
  setShowMarkDeletionWarning(false);
  await performSave();
};

// Add warning dialog to render
return (
  <div className="relative">
    {/* ... existing editor UI ... */}

    <MarkDeletionWarning
      open={showMarkDeletionWarning}
      marks={marksToDelete}
      onConfirm={handleConfirmDeletion}
      onCancel={handleCancelWarning}
    />
  </div>
);
```

**Testing**:
- Edit region with no marks - no warning, saves directly
- Edit region with 1 mark - shows warning with mark details
- Edit region with multiple marks - shows warning with all marks
- Cancel warning - edit continues, no save
- Confirm warning - marks deleted, edit saved
- Verify marks disappear from reading view after save
- Verify marks disappear from card creation hub

---

### Phase 6: Extend Undo/Redo for Mark Deletions

**Goal**: Allow undoing mark deletions when undoing text edits

**Implementation Strategy**: Track deleted marks in history actions

**Files to Modify**:

1. **readingHistory.ts** (lines 12-25):

```typescript
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
  deletedMarks?: ClozeNote[];  // NEW - track deleted marks
  cursorPosition?: number;
}
```

2. **readingHistory.ts** - Update `_revertAction` (lines 203-242):

```typescript
_revertAction: async (action: Action) => {
  const state = get();

  if (!state.currentTextId) {
    throw new Error('No current text ID set');
  }

  console.log('[History] Reverting action:', action.type, action.id);

  switch (action.type) {
    case 'text_edit': {
      console.log('[History] Restoring previous content');
      await api.texts.updateContent(state.currentTextId, action.previousContent);

      // Restore deleted marks if any
      if (action.deletedMarks && action.deletedMarks.length > 0) {
        console.log('[History] Restoring deleted marks:', action.deletedMarks.length);

        // Recreate marks via backend
        for (const mark of action.deletedMarks) {
          await api.flashcards.createMark(
            mark.textId,
            mark.originalText,
            mark.startPosition,
            mark.endPosition
          );
        }
      }
      break;
    }
    // ... rest of cases
  }
}
```

3. **readingHistory.ts** - Update `_applyAction` (lines 286-325):

```typescript
_applyAction: async (action: Action) => {
  const state = get();

  if (!state.currentTextId) {
    throw new Error('No current text ID set');
  }

  console.log('[History] Applying action:', action.type, action.id);

  switch (action.type) {
    case 'text_edit': {
      console.log('[History] Applying new content');
      await api.texts.updateContent(state.currentTextId, action.newContent);

      // Re-delete marks if any were deleted
      if (action.deletedMarks && action.deletedMarks.length > 0) {
        console.log('[History] Re-deleting marks:', action.deletedMarks.length);
        const markIds = action.deletedMarks.map(m => m.id);
        await api.flashcards.deleteMarks(markIds);
      }
      break;
    }
    // ... rest of cases
  }
}
```

4. **read/[id].tsx** - Update history recording (lines 886-929):

```typescript
// Inside onSave handler for InlineRegionEditor
const historyStore = useReadingHistoryStore.getState();
if (!historyStore.isUndoRedoInProgress) {
  console.log('[ReadPage] Recording inline region edit in history');

  // Detect which marks were deleted
  const { overlappingMarks } = detectMarkOverlap(marks, editRegion);

  historyStore.recordTextEdit({
    editRegion: { start: editRegion.start, end: editRegion.end },
    previousContent: currentText.content,
    newContent: mergedContent,
    editedText: editRegion.insertedText,
    originalText: editRegion.deletedText,
    marksBeforeEdit,
    marksAfterEdit,
    deletedMarks: overlappingMarks.length > 0 ? overlappingMarks : undefined  // NEW
  });
}
```

**Testing**:
- Edit text with marks, confirm deletion
- Undo - verify text reverts AND marks reappear
- Redo - verify text re-applies AND marks deleted again
- Multiple undo/redo cycles
- Verify marks have same IDs after restoration (may need to handle ID regeneration)

---

### Phase 7: Update Other Edit Paths

**Goal**: Apply mark deletion logic to all edit paths

**Other Edit Components to Update**:

1. **Global Inline Edit** (`read/[id].tsx`, lines 223-294, `handleSaveInlineEdit`)
   - Add mark overlap detection
   - Show warning dialog
   - Delete marks on confirm
   - Track deletions in history

2. **Selection Editor** (`SelectionEditor.tsx` - need to locate and analyze)
   - Add mark overlap detection
   - Show warning dialog
   - Delete marks on confirm

3. **Text Editor** (full-text editor - less critical, marks already flagged)
   - Current behavior is to flag marks as 'needs_review'
   - Could optionally add deletion option

**Implementation Priority**:
- High: InlineRegionEditor (Phase 5)
- High: Global inline edit
- Medium: Selection Editor
- Low: TextEditor (current flagging behavior is acceptable)

---

## Edge Cases and Solutions

### Edge Case 1: Partial Mark Overlap

**Scenario**: User edits middle of a long mark

**Current Behavior**: Mark flagged for review

**Proposed Behavior**: Entire mark deleted (safer than trying to preserve partial mark)

**Rationale**:
- Partial marks have unclear semantics
- User intention is ambiguous
- Better to delete and let user re-mark if needed

### Edge Case 2: Multiple Adjacent Marks

**Scenario**: User edits region containing 5 consecutive marks

**Solution**:
- Warning dialog shows all 5 marks
- All 5 deleted on confirm
- Single undo restores all 5

### Edge Case 3: Mark with Multiple Flashcards

**Scenario**: Mark has 3 flashcards (multi-cloze note)

**Solution**:
- Warning dialog indicates "Has flashcards"
- All flashcards cascade deleted with mark
- Undo recreates mark but NOT flashcards (flashcard recreation is complex)

**Alternative** (Future Enhancement):
- Store flashcard data in history
- Recreate flashcards on undo
- Requires storing cloze parsing, card scheduling state, etc.

### Edge Case 4: Edit at Mark Boundary

**Scenario**: User edits text immediately after a mark (mark.end === edit.start)

**Solution**:
- No overlap detected (boundary is exclusive)
- Mark unaffected
- This is correct behavior - mark is clearly separate

### Edge Case 5: User Cancels Warning

**Scenario**: User sees warning and clicks "Cancel"

**Solution**:
- Editor stays open
- No save occurs
- User can continue editing or press Escape to close

### Edge Case 6: Undo After Mark Deletion

**Scenario**: User deletes marks via edit, then undos

**Solution**:
- Text reverts to previous state
- Marks are recreated via `createMark` API
- **Note**: Recreated marks will have new IDs
- History stores original mark data (originalText, positions)

**Limitation**:
- Flashcards are NOT restored on undo (too complex for initial version)
- Future enhancement: store full mark + flashcard state

### Edge Case 7: Network Error During Deletion

**Scenario**: Backend deletion fails mid-transaction

**Solution**:
- Transaction rollback ensures atomicity
- Error message shown to user
- Edit not saved
- Editor remains open for retry

### Edge Case 8: Marks in Card Creation Hub

**Scenario**: User has mark in hub queue, then edits overlapping text

**Solution**:
- Mark deleted from database
- Hub query automatically excludes deleted marks
- Next hub session won't show deleted mark
- No special hub invalidation needed (query-based, not cached)

---

## Testing Strategy

### Unit Tests

**File**: `/Users/why/repos/trivium/src/lib/utils/__tests__/markOverlap.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { detectMarkOverlap } from '../markOverlap';
import type { ClozeNote } from '@/lib/types/flashcard';

const createMark = (id: number, start: number, end: number): ClozeNote => ({
  id,
  textId: 1,
  userId: 1,
  originalText: `mark${id}`,
  parsedSegments: '[]',
  clozeCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  startPosition: start,
  endPosition: end,
  status: 'pending'
});

describe('detectMarkOverlap', () => {
  it('detects mark completely inside edit region', () => {
    const marks = [createMark(1, 10, 20)];
    const editRegion = { start: 5, end: 25 };

    const result = detectMarkOverlap(marks, editRegion);

    expect(result.overlappingMarks).toHaveLength(1);
    expect(result.overlappingMarks[0].id).toBe(1);
    expect(result.safeMarks).toHaveLength(0);
  });

  it('detects mark partially overlapping at start', () => {
    const marks = [createMark(1, 5, 15)];
    const editRegion = { start: 10, end: 20 };

    const result = detectMarkOverlap(marks, editRegion);

    expect(result.overlappingMarks).toHaveLength(1);
  });

  it('detects mark partially overlapping at end', () => {
    const marks = [createMark(1, 15, 25)];
    const editRegion = { start: 10, end: 20 };

    const result = detectMarkOverlap(marks, editRegion);

    expect(result.overlappingMarks).toHaveLength(1);
  });

  it('detects mark completely containing edit region', () => {
    const marks = [createMark(1, 5, 30)];
    const editRegion = { start: 10, end: 20 };

    const result = detectMarkOverlap(marks, editRegion);

    expect(result.overlappingMarks).toHaveLength(1);
  });

  it('does not detect mark before edit region', () => {
    const marks = [createMark(1, 0, 5)];
    const editRegion = { start: 10, end: 20 };

    const result = detectMarkOverlap(marks, editRegion);

    expect(result.overlappingMarks).toHaveLength(0);
    expect(result.safeMarks).toHaveLength(1);
  });

  it('does not detect mark after edit region', () => {
    const marks = [createMark(1, 25, 30)];
    const editRegion = { start: 10, end: 20 };

    const result = detectMarkOverlap(marks, editRegion);

    expect(result.overlappingMarks).toHaveLength(0);
    expect(result.safeMarks).toHaveLength(1);
  });

  it('does not detect mark ending at edit start (exclusive boundary)', () => {
    const marks = [createMark(1, 0, 10)];
    const editRegion = { start: 10, end: 20 };

    const result = detectMarkOverlap(marks, editRegion);

    expect(result.overlappingMarks).toHaveLength(0);
  });

  it('does not detect mark starting at edit end (exclusive boundary)', () => {
    const marks = [createMark(1, 20, 30)];
    const editRegion = { start: 10, end: 20 };

    const result = detectMarkOverlap(marks, editRegion);

    expect(result.overlappingMarks).toHaveLength(0);
  });

  it('handles multiple marks correctly', () => {
    const marks = [
      createMark(1, 0, 5),    // before
      createMark(2, 12, 18),  // overlapping
      createMark(3, 25, 30),  // after
      createMark(4, 8, 22),   // overlapping
    ];
    const editRegion = { start: 10, end: 20 };

    const result = detectMarkOverlap(marks, editRegion);

    expect(result.overlappingMarks).toHaveLength(2);
    expect(result.overlappingMarks.map(m => m.id).sort()).toEqual([2, 4]);
    expect(result.safeMarks).toHaveLength(2);
    expect(result.deletedMarkIds).toEqual([2, 4]);
  });
});
```

### Integration Tests

**Manual Testing Checklist**:

- [ ] **Highlight Removal**
  - [ ] Open InlineRegionEditor on text with marks
  - [ ] Verify highlights are NOT visible in editor
  - [ ] Cancel editor
  - [ ] Verify highlights ARE visible in normal view

- [ ] **Warning Dialog - No Overlaps**
  - [ ] Edit region with no marks
  - [ ] Save
  - [ ] Verify no warning shown
  - [ ] Verify save succeeds

- [ ] **Warning Dialog - Single Mark**
  - [ ] Edit region overlapping 1 mark
  - [ ] Save
  - [ ] Verify warning shows mark details
  - [ ] Cancel
  - [ ] Verify editor still open, no changes saved
  - [ ] Save again, confirm
  - [ ] Verify mark deleted
  - [ ] Verify edit saved

- [ ] **Warning Dialog - Multiple Marks**
  - [ ] Edit region overlapping 3 marks
  - [ ] Save
  - [ ] Verify warning shows all 3 marks
  - [ ] Confirm
  - [ ] Verify all 3 marks deleted

- [ ] **Mark Deletion - Database**
  - [ ] Create mark
  - [ ] Edit overlapping text, confirm deletion
  - [ ] Query database: verify mark deleted
  - [ ] Reload page: verify mark doesn't reappear

- [ ] **Mark Deletion - Cascades**
  - [ ] Create mark with flashcards
  - [ ] Edit overlapping text, confirm deletion
  - [ ] Query database: verify flashcards also deleted
  - [ ] Check card creation hub: verify mark gone

- [ ] **Undo/Redo - Basic**
  - [ ] Edit text, delete mark
  - [ ] Undo
  - [ ] Verify text reverted
  - [ ] Verify mark recreated
  - [ ] Redo
  - [ ] Verify text re-applied
  - [ ] Verify mark deleted again

- [ ] **Undo/Redo - Multiple Marks**
  - [ ] Edit text, delete 3 marks
  - [ ] Undo
  - [ ] Verify all 3 marks recreated
  - [ ] Redo
  - [ ] Verify all 3 marks deleted

- [ ] **Edge Cases**
  - [ ] Edit at mark boundary (mark.end === edit.start)
  - [ ] Verify no overlap detected
  - [ ] Edit partially overlapping mark
  - [ ] Verify entire mark deleted (not partial)

- [ ] **Card Creation Hub**
  - [ ] Create marks in hub queue
  - [ ] Edit text to delete one mark
  - [ ] Open hub
  - [ ] Verify deleted mark not shown
  - [ ] Verify other marks still present

- [ ] **Error Handling**
  - [ ] Simulate backend error during deletion
  - [ ] Verify error message shown
  - [ ] Verify edit not saved
  - [ ] Verify editor remains open

---

## Performance Considerations

### 1. Mark Overlap Detection

**Algorithm Complexity**: O(n) where n = number of marks
**Typical Scale**: 10-100 marks per text
**Performance**: Negligible (<1ms)

**Optimization Opportunities**:
- If needed: Use spatial index (R-tree) for 1000+ marks
- Current linear scan is sufficient for expected scale

### 2. Warning Dialog Rendering

**Issue**: Rendering 100+ marks in warning dialog
**Solution**: Virtual scrolling if needed
**Current**: max-h-64 with overflow-y-auto (simple, sufficient)

### 3. Database Deletion

**Current**: Single DELETE with IN clause
**Performance**: Good for up to ~100 marks
**Transaction**: Ensures atomicity

**Optimization** (if needed):
- Batch deletions in chunks of 100
- Use prepared statements for repeated deletions

### 4. Undo/Redo Mark Recreation

**Issue**: Recreating 100 marks individually = 100 API calls
**Current Solution**: Sequential recreation in loop
**Future Enhancement**: Batch creation API

---

## Implementation Phases Summary

### Phase 1: Highlight Removal ✓
- **Effort**: 1 hour
- **Risk**: Low
- **Files**: 3 modified
- **Lines**: ~20

### Phase 2: Overlap Detection ✓
- **Effort**: 2 hours
- **Risk**: Low
- **Files**: 1 new, 1 test
- **Lines**: ~150

### Phase 3: Warning Dialog ✓
- **Effort**: 2 hours
- **Risk**: Low
- **Files**: 1 new
- **Lines**: ~100

### Phase 4: Backend Deletion ✓
- **Effort**: 3 hours
- **Risk**: Medium (database transaction)
- **Files**: 2 modified
- **Lines**: ~100

### Phase 5: InlineRegionEditor Integration ✓
- **Effort**: 3 hours
- **Risk**: Medium (integration complexity)
- **Files**: 1 modified
- **Lines**: ~80

### Phase 6: Undo/Redo Extension ✓
- **Effort**: 4 hours
- **Risk**: High (history system complexity)
- **Files**: 2 modified
- **Lines**: ~100

### Phase 7: Other Edit Paths
- **Effort**: 4 hours
- **Risk**: Medium
- **Files**: 2-3 modified
- **Lines**: ~150

### Total Estimated Effort: 19 hours

---

## Key Architectural Decisions

### Decision 1: Delete Entire Overlapping Marks

**Rationale**:
- Simpler than trying to preserve partial marks
- Clearer user expectation (edit affects mark completely)
- Matches existing "needs_review" behavior (entire mark flagged, not partial)

**Alternative Considered**: Split marks into non-overlapping segments
**Rejected Because**: Complex, unclear semantics, rare use case

### Decision 2: Cascade Delete Flashcards

**Rationale**:
- Flashcards without parent marks are orphaned and meaningless
- Database schema already supports cascade (ON DELETE CASCADE)
- User expects deleting marked text to delete associated cards

**Alternative Considered**: Orphan flashcards with null cloze_note_id
**Rejected Because**: Orphaned cards have no context, can't be reviewed properly

### Decision 3: Show Warning Before Save

**Rationale**:
- User needs to know marks will be deleted
- Deleting marks is destructive and should be explicit
- Prevents accidental mark deletion

**Alternative Considered**: Delete silently, show toast notification
**Rejected Because**: Too easy to accidentally delete important marks

### Decision 4: Undo Recreates Marks (Without Flashcards)

**Rationale**:
- Recreating marks is straightforward (just position + text)
- Recreating flashcards is complex (need cloze parsing, scheduling state)
- User can regenerate flashcards if needed

**Alternative Considered**: Store full flashcard state in history
**Rejected Because**: Too complex for initial version, rare use case

### Decision 5: No Partial Mark Preservation

**Rationale**:
- Unclear what "partial mark" means semantically
- User intention ambiguous when editing middle of mark
- Safer to delete and let user re-mark

**Alternative Considered**: Preserve non-overlapping portions as new marks
**Rejected Because**: Complex logic, unclear UX, fragmented marks

---

## Future Enhancements

### Enhancement 1: Batch Mark Creation API

**Problem**: Undo recreates marks one-by-one
**Solution**: `createMarks(marks: ClozeNote[])`
**Benefit**: Faster undo with many deleted marks

### Enhancement 2: Full Undo with Flashcards

**Problem**: Undo doesn't restore flashcards
**Solution**: Store flashcard data + scheduling state in history
**Benefit**: Complete undo/redo for power users

### Enhancement 3: Mark Trimming Instead of Deletion

**Problem**: Deleting entire mark when only edge is edited
**Solution**: Detect if edit is at mark boundary, trim mark instead of delete
**Benefit**: Preserve marks when edit is minor adjustment

**Example**:
```
Mark: "The quick brown fox" (pos 10-30)
Edit: Add period at end (pos 30-30, insert ".")
Result: Trim mark to "The quick brown fox" (pos 10-30) - unchanged
```

### Enhancement 4: Mark Merge Suggestions

**Problem**: User edits between two marks, creating gap
**Solution**: After edit, suggest merging adjacent marks
**Benefit**: Maintain marking continuity

### Enhancement 5: Markdown-Aware Mark Boundaries

**Problem**: Marks may include markdown syntax (links, bold)
**Solution**: Parse markdown, snap mark boundaries to rendered text
**Benefit**: Cleaner mark boundaries, better UX

---

## Conclusion

This implementation plan provides a comprehensive solution for:

1. **Hiding highlights** in inline editor (Phase 1) - simple CSS change
2. **Detecting overlaps** (Phase 2) - utility function with thorough edge case handling
3. **Warning users** (Phase 3) - clear, informative dialog
4. **Deleting marks** (Phase 4) - transaction-safe backend command
5. **Integration** (Phase 5) - seamless flow in InlineRegionEditor
6. **Undo support** (Phase 6) - extends existing history system
7. **Complete coverage** (Phase 7) - all edit paths handled

The architecture is:
- **Safe**: Warnings prevent accidental deletion
- **Atomic**: Transactions ensure consistency
- **Reversible**: Undo/redo support (marks, not flashcards)
- **Performant**: O(n) algorithms, efficient queries
- **Maintainable**: Clean separation of concerns, well-tested

Total implementation effort: ~19 hours across 7 phases.
