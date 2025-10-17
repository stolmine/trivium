# Undo Stack Architecture - Visual Guide

This document provides visual diagrams and examples to complement the implementation plan.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Reading View UI                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ReadPage Component (src/routes/read/[id].tsx)           │  │
│  │                                                            │  │
│  │  Keyboard Shortcuts:                                      │  │
│  │    Ctrl+Z → handleUndo()                                  │  │
│  │    Ctrl+Shift+Z → handleRedo()                            │  │
│  │    Ctrl+E → handleSaveInlineEdit() [records to history]   │  │
│  │    Ctrl+M → handleMarkSelectionRead() [records to history]│  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓ ↑                                   │
└────────────────────────────┼─┼───────────────────────────────────┘
                             ↓ ↑
                    ┌────────┴─┴────────┐
                    │  History Store    │
                    │  (Zustand)        │
                    └────────┬─┬────────┘
                             ↓ ↑
         ┌───────────────────┴─┴────────────────────┐
         │         Reading History Store             │
         │   (src/lib/stores/readingHistory.ts)      │
         │                                            │
         │  State:                                    │
         │    past: Action[]        ←── Undo stack   │
         │    future: Action[]      ←── Redo stack   │
         │    currentTextId: number                   │
         │    isUndoRedoInProgress: boolean          │
         │                                            │
         │  Actions:                                  │
         │    recordTextEdit()                        │
         │    recordMark()                            │
         │    recordUnmark()                          │
         │    undo() → _revertAction()               │
         │    redo() → _applyAction()                │
         └───────────────┬─┬──────────────────────────┘
                         ↓ ↑
         ┌───────────────┴─┴──────────────────────────┐
         │         Reading Store                       │
         │   (src/lib/stores/reading.ts)               │
         │                                             │
         │    markRangeAsRead() ──→ records history   │
         │    unmarkRangeAsRead() ─→ records history  │
         └────────────────┬─┬───────────────────────────┘
                          ↓ ↑
         ┌────────────────┴─┴───────────────────────────┐
         │              Backend API                      │
         │         (Tauri + Rust)                        │
         │                                               │
         │    api.texts.updateContent()                  │
         │    api.reading.markRangeAsRead()              │
         │    api.reading.unmarkRangeAsRead()            │
         └───────────────────────────────────────────────┘
```

---

## Action Types Hierarchy

```
HistoryAction (base)
├── id: string
├── timestamp: number
└── type: 'text_edit' | 'mark' | 'unmark'

├─→ TextEditAction
│   ├── type: 'text_edit'
│   ├── editRegion: { start, end }
│   ├── previousContent: string
│   ├── newContent: string
│   ├── editedText: string
│   ├── originalText: string
│   ├── marksBeforeEdit: ClozeNote[]
│   ├── marksAfterEdit: ClozeNote[]
│   └── cursorPosition?: number

├─→ MarkAction
│   ├── type: 'mark'
│   ├── range: { start, end }
│   ├── rangeId?: number
│   ├── contentSnapshot: string
│   └── markedText: string

└─→ UnmarkAction
    ├── type: 'unmark'
    ├── range: { start, end }
    ├── previousReadRanges: ReadRange[]
    ├── contentSnapshot: string
    └── unmarkedText: string
```

---

## Undo/Redo State Machine

```
Initial State:
  past: []
  future: []

After Action 1 (Mark):
  past: [Mark1]
  future: []

After Action 2 (Edit):
  past: [Mark1, Edit1]
  future: []

After Undo (undo Edit1):
  past: [Mark1]
  future: [Edit1]

After Undo (undo Mark1):
  past: []
  future: [Edit1, Mark1]

After Redo (redo Mark1):
  past: [Mark1]
  future: [Edit1]

After New Action (Edit2):
  past: [Mark1, Edit2]
  future: []  ← Future cleared!
```

---

## Example: Text Edit with Mark Position Tracking

### Before Edit

```
Content: "The quick brown fox jumps over the lazy dog."
         ^                              ^
         0                              45

Marks: [
  {
    id: 1,
    startPosition: 10,  ← "brown fox jumps"
    endPosition: 25,
    originalText: "brown fox jumps"
  }
]
```

### User Edits "brown" → "red"

```
Edit Region:
  start: 10
  end: 15
  originalText: "brown"
  editedText: "red"
```

### After Edit

```
Content: "The quick red fox jumps over the lazy dog."
         ^                            ^
         0                            43

Marks: [
  {
    id: 1,
    startPosition: 10,  ← Still starts at 10
    endPosition: 23,    ← Shifted: 25 - 2 = 23
    originalText: "red fox jumps",
    status: "needs_review",  ← Flagged because overlap
    notes: "Text was edited in marked region"
  }
]
```

### TextEditAction Recorded

```typescript
{
  type: 'text_edit',
  editRegion: { start: 10, end: 15 },
  previousContent: "The quick brown fox jumps over the lazy dog.",
  newContent: "The quick red fox jumps over the lazy dog.",
  editedText: "red",
  originalText: "brown",
  marksBeforeEdit: [
    { id: 1, startPosition: 10, endPosition: 25, ... }
  ],
  marksAfterEdit: [
    { id: 1, startPosition: 10, endPosition: 23, status: "needs_review", ... }
  ]
}
```

### On Undo

1. Call `api.texts.updateContent(textId, previousContent)`
2. Backend restores: "The quick brown fox jumps over the lazy dog."
3. Call `loadText()` and `loadMarks()` to refresh from backend
4. Mark is restored to original position: `{ startPosition: 10, endPosition: 25 }`

---

## Example: Mark Operation Sequence

### Initial State

```
Content: "Hello world. This is a test."
         ^            ^
         0            28

ReadRanges: []
```

### User Marks "Hello world"

```
MarkAction:
{
  type: 'mark',
  range: { start: 0, end: 11 },
  contentSnapshot: "Hello world. This is a test.",
  markedText: "Hello world"
}

ReadRanges: [
  { id: 1, startPosition: 0, endPosition: 11 }
]
```

### User Marks "This is a test"

```
MarkAction:
{
  type: 'mark',
  range: { start: 13, end: 27 },
  contentSnapshot: "Hello world. This is a test.",
  markedText: "This is a test"
}

ReadRanges: [
  { id: 1, startPosition: 0, endPosition: 11 },
  { id: 2, startPosition: 13, endPosition: 27 }
]
```

### User Undoes (Second Mark)

```
Call: api.reading.unmarkRangeAsRead(textId, 13, 27)

ReadRanges: [
  { id: 1, startPosition: 0, endPosition: 11 }
]

Future: [MarkAction2]  ← Available for redo
```

### User Undoes (First Mark)

```
Call: api.reading.unmarkRangeAsRead(textId, 0, 11)

ReadRanges: []

Future: [MarkAction2, MarkAction1]  ← Both available for redo
```

---

## Sequence Diagram: Undo Flow

```
User              ReadPage          HistoryStore        ReadingStore      Backend
 │                   │                   │                   │              │
 │   Press Ctrl+Z    │                   │                   │              │
 ├──────────────────→│                   │                   │              │
 │                   │   undo()          │                   │              │
 │                   ├──────────────────→│                   │              │
 │                   │                   │ Pop action from   │              │
 │                   │                   │ past stack        │              │
 │                   │                   │                   │              │
 │                   │                   │ _revertAction()   │              │
 │                   │                   ├──────────────────→│              │
 │                   │                   │                   │ API call     │
 │                   │                   │                   ├─────────────→│
 │                   │                   │                   │              │
 │                   │                   │                   │ Success      │
 │                   │                   │                   │←─────────────┤
 │                   │                   │   Success         │              │
 │                   │                   │←──────────────────┤              │
 │                   │                   │                   │              │
 │                   │                   │ Push action to    │              │
 │                   │                   │ future stack      │              │
 │                   │                   │                   │              │
 │                   │   Success         │                   │              │
 │                   │←──────────────────┤                   │              │
 │                   │                   │                   │              │
 │                   │ loadText()        │                   │              │
 │                   ├──────────────────────────────────────→│              │
 │                   │                   │                   │              │
 │                   │ loadMarks()       │                   │              │
 │                   ├──────────────────────────────────────→│              │
 │                   │                   │                   │              │
 │  UI Updated       │                   │                   │              │
 │←──────────────────┤                   │                   │              │
 │                   │                   │                   │              │
```

---

## Sequence Diagram: Text Edit Recording

```
User         InlineEditor      ReadPage        HistoryStore     ReadingStore   Backend
 │                │                │                │                │           │
 │ Edit text      │                │                │                │           │
 ├───────────────→│                │                │                │           │
 │                │                │                │                │           │
 │ Press Ctrl+S   │                │                │                │           │
 ├───────────────→│                │                │                │           │
 │                │ onSave()       │                │                │           │
 │                ├───────────────→│                │                │           │
 │                │                │ detectEditRegion()                │           │
 │                │                ├──────────┐     │                │           │
 │                │                │          │     │                │           │
 │                │                │←─────────┘     │                │           │
 │                │                │                │                │           │
 │                │                │ updateMarkPositions()           │           │
 │                │                ├──────────┐     │                │           │
 │                │                │          │     │                │           │
 │                │                │←─────────┘     │                │           │
 │                │                │                │                │           │
 │                │                │ updateContent()│                │           │
 │                │                ├───────────────────────────────→│           │
 │                │                │                │                │  API call │
 │                │                │                │                ├──────────→│
 │                │                │                │                │           │
 │                │                │                │                │  Success  │
 │                │                │                │                │←──────────┤
 │                │                │                │                │           │
 │                │                │ recordTextEdit()                │           │
 │                │                ├───────────────→│                │           │
 │                │                │                │ Store action   │           │
 │                │                │                │ in past stack  │           │
 │                │                │                │                │           │
 │                │                │ loadText()     │                │           │
 │                │                ├───────────────────────────────→│           │
 │                │                │                │                │           │
 │  UI Updated    │                │                │                │           │
 │←───────────────┴────────────────┤                │                │           │
 │                                 │                │                │           │
```

---

## Data Flow: Mark Position Updates During Text Edit

```
Step 1: User edits text
┌─────────────────────────────────────────────────────┐
│ Before:                                             │
│ "The quick brown fox" (positions 0-20)              │
│                                                     │
│ Mark: { start: 10, end: 20 }  ← "brown fox"       │
└─────────────────────────────────────────────────────┘

Step 2: Edit "brown" → "red" (positions 10-15)
┌─────────────────────────────────────────────────────┐
│ detectEditRegion():                                 │
│   start: 10                                         │
│   end: 15                                           │
│   deletedText: "brown"                              │
│   insertedText: "red"                               │
│   lengthDelta: -2                                   │
└─────────────────────────────────────────────────────┘

Step 3: updateMarkPositions() analyzes each mark
┌─────────────────────────────────────────────────────┐
│ Mark { start: 10, end: 20 } vs Edit { start: 10, end: 15 }
│                                                     │
│ Overlap detected! (mark overlaps edit region)      │
│                                                     │
│ Result:                                             │
│   New mark: { start: 10, end: 18 }  ← shifted      │
│   Status: "needs_review"                            │
│   Notes: "Text was edited in marked region"        │
└─────────────────────────────────────────────────────┘

Step 4: Record in TextEditAction
┌─────────────────────────────────────────────────────┐
│ TextEditAction {                                    │
│   marksBeforeEdit: [                                │
│     { start: 10, end: 20, status: "active" }       │
│   ],                                                │
│   marksAfterEdit: [                                 │
│     { start: 10, end: 18, status: "needs_review" } │
│   ]                                                 │
│ }                                                   │
└─────────────────────────────────────────────────────┘

Step 5: On undo, restore previousContent
┌─────────────────────────────────────────────────────┐
│ Backend restores full text:                         │
│ "The quick brown fox" (original)                    │
│                                                     │
│ Backend automatically restores marks:               │
│ { start: 10, end: 20, status: "active" }           │
│                                                     │
│ Frontend calls loadMarks() to sync                  │
└─────────────────────────────────────────────────────┘
```

---

## Edge Case Handling Matrix

| Scenario | Challenge | Solution | Test Case |
|----------|-----------|----------|-----------|
| Edit then Mark | Mark positions in new space | Mark uses current state, undo independent | Edit text → Mark edited region → Undo mark → Undo edit |
| Mark then Edit | Edit may invalidate mark | Record mark state before/after, restore on undo | Mark region → Edit marked region → Undo edit |
| Multiple edits | Only final saved | Use detectEditRegion for actual diff | Edit 3 times → Save → Undo restores original |
| Backend failure | State inconsistency | Don't update stacks on error, show message | Simulate API failure → Undo → Verify state unchanged |
| Switch texts | Wrong history context | Reset history on text change | Edit text A → Switch to B → Verify can't undo A |
| Undo during edit | Unclear behavior | Disable global undo in edit mode | Start edit → Press Ctrl+Z → Should undo local, not global |
| Overlapping marks | Backend merges ranges | Store exact range, backend handles merge/split | Mark A → Mark B (overlap) → Undo B |
| Large history | Memory consumption | Trim to maxHistorySize (50) | Perform 60 actions → Verify only last 50 kept |
| Cursor position | Where to place cursor | Don't restore cursor, let user click | Undo edit → User clicks to position cursor |
| Dependent marks | Marks shift with edit | Store marks in TextEditAction, backend restores | Edit shifts marks → Undo → Marks return to original |

---

## Performance Considerations

### Memory Usage Estimation

```
Single TextEditAction:
  - Strings (previousContent + newContent): ~10 KB average
  - Mark arrays (before + after): ~2 KB average
  - Metadata: ~1 KB
  - Total: ~13 KB per action

Max History (50 actions):
  - 50 × 13 KB = ~650 KB
  - Acceptable for browser memory

Single MarkAction:
  - Strings (contentSnapshot + markedText): ~10 KB
  - Metadata: ~1 KB
  - Total: ~11 KB per action

Mixed History (25 edits + 25 marks):
  - ~12 KB average × 50 = ~600 KB
  - Still acceptable
```

### Timing Estimates

```
Record Action:
  - Create action object: < 1ms
  - Add to past stack: < 1ms
  - Clear future stack: < 1ms
  - Total: < 5ms (negligible overhead)

Undo Text Edit:
  - API call: 50-200ms (backend update)
  - loadText(): 50-100ms (fetch updated content)
  - loadMarks(): 50-100ms (fetch updated marks)
  - Total: 150-400ms (acceptable)

Undo Mark:
  - API call: 50-200ms (backend update)
  - getReadRanges(): 50-100ms (fetch updated ranges)
  - Total: 100-300ms (acceptable)
```

---

## Testing Checklist

### Unit Tests (readingHistory.test.ts)

- [ ] Action recording
  - [ ] Creates unique ID
  - [ ] Adds timestamp
  - [ ] Adds to past stack
  - [ ] Clears future stack
- [ ] canUndo/canRedo
  - [ ] Returns false when empty
  - [ ] Returns true when has actions
- [ ] History limits
  - [ ] Trims when exceeds max
  - [ ] Keeps most recent
- [ ] Text switching
  - [ ] Clears stacks
  - [ ] Updates currentTextId

### Integration Tests (Manual)

- [ ] Scenario 1: Basic text edit undo/redo
- [ ] Scenario 2: Basic mark undo/redo
- [ ] Scenario 3: Mixed operations (edit + mark + undo all)
- [ ] Scenario 4: Edit then mark same region
- [ ] Scenario 5: Mark then edit marked region
- [ ] Scenario 6: Multiple edits with single undo
- [ ] Scenario 7: Backend error handling
- [ ] Scenario 8: History limit (60 actions)
- [ ] Scenario 9: Switch between texts
- [ ] Scenario 10: Concurrent operations

### Edge Cases

- [ ] Undo during active inline edit (should be disabled)
- [ ] Redo after new action (future should be cleared)
- [ ] Overlapping mark ranges
- [ ] Mark entire text then edit
- [ ] Edit entire text then undo
- [ ] Very long text (10,000+ chars)
- [ ] Many marks (50+)
- [ ] Rapid undo/redo (spam Ctrl+Z)

---

## Implementation Progress Tracking

```
Phase 1: History Store [████████████████████░░░░] 80%
  ✓ Type definitions
  ✓ Store creation
  ✓ Record functions
  ✓ Query functions
  ⧗ Unit tests

Phase 2: Undo Logic [████████████░░░░░░░░░░░░] 50%
  ✓ _revertAction skeleton
  ⧗ Text edit revert
  ⧗ Mark revert
  ⧗ Error handling
  ☐ Testing

Phase 3: Redo Logic [░░░░░░░░░░░░░░░░░░░░░░░░] 0%
  ☐ _applyAction
  ☐ redo() function
  ☐ Testing

Phase 4: Mark Integration [░░░░░░░░░░░░░░░░░░░░░░░░] 0%
  ☐ Modify markRangeAsRead
  ☐ Modify unmarkRangeAsRead
  ☐ Testing

Phase 5: Text Edit Integration [░░░░░░░░░░░░░░░░░░░░░░░░] 0%
  ☐ Modify handleSaveInlineEdit
  ☐ Add detectEditRegion
  ☐ Testing

Phase 6: UI Feedback [░░░░░░░░░░░░░░░░░░░░░░░░] 0%
  ☐ Keyboard shortcuts
  ☐ Loading states
  ☐ Error messages

Phase 7: Testing [░░░░░░░░░░░░░░░░░░░░░░░░] 0%
  ☐ Unit tests
  ☐ Integration tests
  ☐ Edge cases

Legend:
  ✓ Complete
  ⧗ In Progress
  ☐ Not Started
```

---

## Quick Reference Commands

### Testing Commands

```bash
# Run unit tests for history store
npx vitest run src/lib/stores/__tests__/readingHistory.test.ts

# Run all tests
npx vitest

# Type check
npx tsc --noEmit

# Build
npm run build
```

### Console Commands (Dev Tools)

```javascript
// Get history state
useReadingHistoryStore.getState()

// Check if can undo
useReadingHistoryStore.getState().canUndo()

// Check past stack
useReadingHistoryStore.getState().past

// Check future stack
useReadingHistoryStore.getState().future

// Clear history
useReadingHistoryStore.getState().clearHistory()
```

---

## Additional Resources

- Main Implementation Plan: `/Users/why/repos/trivium/UNDO_STACK_IMPLEMENTATION_PLAN.md`
- Reading Store: `/Users/why/repos/trivium/src/lib/stores/reading.ts`
- Mark Positions Utility: `/Users/why/repos/trivium/src/lib/utils/markPositions.ts`
- Markdown Edit Utility: `/Users/why/repos/trivium/src/lib/utils/markdownEdit.ts`
- Phase 14 Documentation: `/Users/why/repos/trivium/PHASE_14_INLINE_EDITING.md`
