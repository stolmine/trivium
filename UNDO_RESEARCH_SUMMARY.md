# Undo/Redo Implementation Research Summary

**Date**: 2025-10-17
**Research Time**: 2 hours
**Status**: Complete - Ready for Implementation

---

## Research Objectives Completed

✅ **Research Current Implementation**: Found and analyzed all relevant code
✅ **Understand Mark Operations**: Identified how marks are created/removed
✅ **Understand Mark Data Structures**: Analyzed position tracking and types
✅ **Review Inline Editing**: Understood Phase 14 inline editing system
✅ **Identify Key Files**: Mapped out all files that need changes
✅ **Design Solution**: Created unified undo/redo architecture
✅ **Create Implementation Plan**: Detailed 7-phase plan with code examples
✅ **Address Edge Cases**: Identified and solved 10 edge cases
✅ **Create Testing Strategy**: Comprehensive test plan with scenarios

---

## Key Findings

### 1. Current State of Undo/Redo

**Exists but Unused**:
- There is a `useTextHistory` hook at `/Users/why/repos/trivium/src/hooks/useTextHistory.ts`
- It only handles text content changes for textarea/input fields
- **NOT used in the reading view**
- **NOT suitable for our needs** (no mark operations, no complex state)

**Conclusion**: Build new history system from scratch

### 2. Text Editing System (Phase 14)

**Fully Functional Inline Editing**:
- Component: `InlineRegionEditor.tsx`
- Dual modes: Styled (rendered markdown) and Literal (raw markdown)
- Smart boundary detection (sentence/paragraph)
- Context dimming with editable region
- Mark-aware editing with position tracking

**Integration Point**:
- Save handler in ReadPage component (`handleSaveInlineEdit`)
- Calls `api.texts.updateContent()` to persist
- Already uses `detectEditRegion()` utility
- Can easily add history recording here

### 3. Mark Operations System

**Two Operations**:
1. `markRangeAsRead(textId, startPos, endPos)` - Mark text as read
2. `unmarkRangeAsRead(textId, startPos, endPos)` - Unmark text

**Store Location**: `/Users/why/repos/trivium/src/lib/stores/reading.ts`

**Data Flow**:
```
SelectionToolbar (Ctrl+M) →
ReadPage.handleMarkSelectionRead() →
reading.markRangeAsRead() →
api.reading.markRangeAsRead() →
Backend database →
reading.getReadRanges() →
UI updates
```

**Integration Point**:
- Can add history recording in `markRangeAsRead()` and `unmarkRangeAsRead()`
- Use `isUndoRedoInProgress` flag to prevent recursive recording

### 4. Mark Position Tracking

**Utility**: `/Users/why/repos/trivium/src/lib/utils/markPositions.ts`

**Function**: `updateMarkPositions(marks, editRegion, editedText)`

**Purpose**: Updates mark positions when text is edited

**Returns**:
```typescript
{
  marks: ClozeNote[],          // Updated mark positions
  flaggedForReview: number[],  // Marks that overlap edit
  shifted: number[]            // Marks that were moved
}
```

**How It Works**:
- Marks before edit region: unchanged
- Marks after edit region: shifted by length delta
- Marks overlapping edit region: flagged for review

**Integration**: Already used in `SelectionEditor.tsx`, can reuse for history

### 5. Content Position Tracking

**Two Coordinate Spaces**:
1. **Rendered space**: DOM textContent (what user sees, links rendered)
2. **Cleaned space**: Markdown source (what's stored, includes `[text](url)`)

**Utilities**:
- `parseExcludedRanges()`: Converts content → rendered + cleaned
- `renderedPosToCleanedPos()`: Maps positions between spaces
- `detectEditRegion()`: Finds actual changed region in text

**Why This Matters**:
- Mark operations use rendered positions (user selection)
- Text edits use cleaned positions (markdown source)
- History needs to store in cleaned space for consistency

### 6. Backend API

**Text Operations**:
- `api.texts.updateContent(textId, newContent)` - Update text content
- `api.texts.get(textId)` - Get text with content

**Reading Operations**:
- `api.reading.markRangeAsRead(textId, startPos, endPos)` - Mark range
- `api.reading.unmarkRangeAsRead(textId, startPos, endPos)` - Unmark range
- `api.reading.getReadRanges(textId)` - Get all read ranges

**Flashcard Operations**:
- `api.flashcards.getMarksForText(textId)` - Get marks (highlights)
- Returns mark positions that may need updating after edits

**Backend is Source of Truth**:
- All undo operations must call backend APIs
- Frontend state is reloaded from backend after undo/redo
- This ensures consistency across app

---

## Proposed Solution Architecture

### Core Concept

**Unified History Stack** with three action types:
1. `TextEditAction` - Records text content changes
2. `MarkAction` - Records mark-as-read operations
3. `UnmarkAction` - Records unmark operations

### Key Features

1. **Single Ordered History**: All operations in one chronological stack
2. **Backend-Synced**: Undo/redo calls backend APIs to maintain consistency
3. **Position-Safe**: Stores all positions at time of action
4. **Mark-Aware**: Text edits track mark position changes
5. **Optimistic Updates**: UI updates immediately, backend syncs async
6. **Per-Text History**: Each text has separate history (cleared on switch)

### Data Flow

```
User Action → Record in History → Backend API Call → Update Local State
                                                          ↓
User Presses Ctrl+Z → Pop from Past → Revert via Backend → Reload State
```

### State Machine

```
Initial: past=[], future=[]

After Action: past=[action], future=[]
After Undo: past=[], future=[action]
After Redo: past=[action], future=[]
After New Action: past=[action, newAction], future=[] ← cleared!
```

---

## Implementation Plan Overview

### Phase 1: History Store (2-3 hours)
- Create new Zustand store: `src/lib/stores/readingHistory.ts`
- Define action type interfaces
- Implement record functions
- Implement query functions (canUndo, canRedo)

### Phase 2: Undo Logic (3-4 hours)
- Implement `_revertAction()` for each action type
- Implement `undo()` function
- Add error handling
- Add `isUndoRedoInProgress` flag

### Phase 3: Redo Logic (2-3 hours)
- Implement `_applyAction()` for each action type
- Implement `redo()` function
- Add error handling

### Phase 4: Mark Integration (2 hours)
- Modify `markRangeAsRead()` in reading store
- Modify `unmarkRangeAsRead()` in reading store
- Add check for undo/redo in progress

### Phase 5: Text Edit Integration (2-3 hours)
- Modify `handleSaveInlineEdit()` in ReadPage
- Use `detectEditRegion()` to find changes
- Use `updateMarkPositions()` to track marks
- Record text edit actions

### Phase 6: UI Feedback (1-2 hours)
- Add undo/redo handlers in ReadPage
- Add keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
- Add loading states
- Add error messages

### Phase 7: Testing (2-3 hours)
- Manual testing (10 scenarios)
- Edge case testing (10 cases)
- Console verification
- State verification

**Total Time**: 14-20 hours over 4 days

---

## Key Files Identified

### Files to Create (1 file)

```
src/lib/stores/readingHistory.ts          [NEW] Main history store
```

### Files to Modify (2 files)

```
src/lib/stores/reading.ts                 [MODIFY] Add history recording to marks
src/routes/read/[id].tsx                  [MODIFY] Add undo/redo handlers
```

### Files to Use (No Changes, 6 files)

```
src/lib/utils/markPositions.ts            [USE] updateMarkPositions()
src/lib/utils/markdownEdit.ts             [USE] detectEditRegion()
src/lib/types/flashcard.ts                [USE] ClozeNote type
src/lib/types/reading.ts                  [USE] ReadRange type
src/lib/utils/tauri.ts                    [USE] API functions
src/hooks/useTextHistory.ts               [REFERENCE] Similar pattern
```

---

## Edge Cases Identified and Solved

### 1. Edit Then Mark Same Region
**Challenge**: Mark positions in new text space
**Solution**: Mark uses current state, undo works independently

### 2. Mark Then Edit Marked Region
**Challenge**: Edit may invalidate mark
**Solution**: Record mark state before/after, restore on undo

### 3. Multiple Edits in Quick Succession
**Challenge**: Only final edit saved
**Solution**: Use `detectEditRegion` to find actual difference

### 4. Backend Failure During Undo
**Challenge**: State becomes inconsistent
**Solution**: Don't update stacks on error, throw exception

### 5. Switching Between Texts
**Challenge**: History should be per-text
**Solution**: Reset history when `currentText.id` changes

### 6. Undo/Redo During Active Edit
**Challenge**: Local vs global undo
**Solution**: Disable global undo when in edit mode

### 7. Mark Overlapping Previously Marked
**Challenge**: Backend merges ranges
**Solution**: Store exact range, backend handles split/merge

### 8. Very Large History Stack
**Challenge**: Memory consumption
**Solution**: Implement `maxHistorySize` limit (50 actions)

### 9. Cursor Position After Undo
**Challenge**: Where to place cursor
**Solution**: Don't restore, let user click

### 10. Undo Text Edit with Dependent Marks
**Challenge**: Marks need to be restored
**Solution**: Backend restores marks with text content

---

## Testing Strategy

### Unit Tests

Create `/Users/why/repos/trivium/src/lib/stores/__tests__/readingHistory.test.ts`

**Test Cases**:
- Action recording (unique IDs, timestamps)
- canUndo/canRedo queries
- History limits (trimming)
- Text switching (reset)

### Integration Tests (Manual)

**10 Test Scenarios**:
1. Basic text edit undo/redo
2. Basic mark undo/redo
3. Mixed operations
4. Edit then mark
5. Mark then edit
6. Multiple edits
7. Error handling
8. History limit
9. Switch texts
10. Concurrent operations

### Console Verification

All operations should log:
```
[History] Recording text edit: ...
[History] Undoing action: ...
[History] Undo successful
```

---

## Success Criteria

### Functional
- ✓ Undo any text edit with Ctrl+Z
- ✓ Undo any mark operation with Ctrl+Z
- ✓ Redo with Ctrl+Shift+Z
- ✓ Mixed sequences work correctly
- ✓ History cleared when switching texts
- ✓ Marks restored after undo
- ✓ Backend stays in sync

### Performance
- ✓ Undo/redo completes in < 500ms
- ✓ History recording adds < 10ms overhead
- ✓ Memory usage < 5MB for 50 actions

### Code Quality
- ✓ All TypeScript types properly defined
- ✓ No compilation errors
- ✓ Follows existing patterns
- ✓ Proper error handling
- ✓ Console logging for debugging

---

## Documents Produced

### 1. UNDO_STACK_IMPLEMENTATION_PLAN.md (Main Document)
**Size**: ~800 lines
**Contents**:
- Current state analysis
- Proposed architecture
- Data structures (complete TypeScript interfaces)
- Integration points (exact code locations and modifications)
- Implementation phases (7 phases with detailed tasks)
- Edge cases and solutions (10 cases)
- Testing strategy
- Success metrics
- Questions for clarification
- File structure
- Complete checklist

**Purpose**: Comprehensive reference for implementation

### 2. UNDO_STACK_ARCHITECTURE.md (Visual Guide)
**Size**: ~600 lines
**Contents**:
- System architecture diagram
- Action types hierarchy
- State machine visualization
- Example: Text edit with mark tracking
- Example: Mark operation sequence
- Sequence diagrams (undo flow, edit recording)
- Data flow diagrams
- Edge case handling matrix
- Performance considerations
- Testing checklist
- Progress tracking template
- Quick reference commands

**Purpose**: Visual understanding and reference

### 3. UNDO_IMPLEMENTATION_QUICKSTART.md (Step-by-Step Guide)
**Size**: ~700 lines
**Contents**:
- Prerequisites checklist
- Phase-by-phase instructions
- Complete code snippets (copy-paste ready)
- Testing steps after each phase
- Troubleshooting guide
- Success checklist
- Time estimates
- Next steps after completion

**Purpose**: Practical implementation guide

### 4. UNDO_RESEARCH_SUMMARY.md (This Document)
**Size**: ~400 lines
**Contents**:
- Research objectives completed
- Key findings from codebase
- Proposed solution overview
- Implementation plan overview
- Key files identified
- Edge cases summary
- Testing strategy summary
- Success criteria
- Documents produced

**Purpose**: Executive summary of research

---

## Recommendations

### Start With
1. Read this summary document first (you're here!)
2. Skim the implementation plan for overview
3. Use the quickstart guide for actual coding
4. Reference architecture document for visuals/examples

### Implementation Order
1. **Phase 1**: History store (foundational)
2. **Phase 2**: Undo logic (core functionality)
3. **Phase 3**: Redo logic (complete the cycle)
4. **Phase 4**: Mark integration (first user-facing feature)
5. **Phase 5**: Text edit integration (second user-facing feature)
6. **Phase 6**: UI feedback (polish)
7. **Phase 7**: Testing (validation)

### Don't Skip
- Error handling in undo/redo
- `isUndoRedoInProgress` flag (prevents infinite loops)
- History reset when switching texts
- Console logging (essential for debugging)
- Testing all 10 scenarios

### Can Defer
- Undo/redo buttons in toolbar (keyboard shortcuts sufficient)
- History panel UI (list of actions)
- Persistent history (save to database)
- Advanced features (branching history, collaboration)

---

## Risk Assessment

### Low Risk
- **Architecture**: Well-defined, follows existing patterns
- **Scope**: Clear boundaries, no feature creep
- **Dependencies**: All utilities already exist
- **Testing**: Comprehensive test plan provided

### Medium Risk
- **Complexity**: Multiple action types, position tracking
- **Backend Integration**: Must stay in sync
- **Edge Cases**: Several to handle correctly

### Mitigation
- Start with simple cases, add complexity gradually
- Test frequently at each phase
- Use console logs extensively
- Follow the quickstart guide exactly

---

## Next Steps

### For Implementation
1. Create feature branch: `git checkout -b feature/undo-redo`
2. Follow quickstart guide Phase 1
3. Test after each phase
4. Commit frequently with descriptive messages
5. Create PR when complete

### For Review
1. Check all success criteria met
2. Verify all 10 test scenarios pass
3. Review code quality (TypeScript, patterns)
4. Test performance (< 500ms, < 5MB)
5. Update documentation

### For Deployment
1. Merge to main branch
2. Update user documentation with Ctrl+Z, Ctrl+Shift+Z
3. Add release notes mentioning undo/redo
4. Monitor for issues in production

---

## Conclusion

This research has identified all necessary components for implementing a unified undo/redo system that handles both text edits and mark operations in the reading view.

**Key Strengths**:
- ✅ Complete architecture designed
- ✅ All integration points identified
- ✅ Edge cases anticipated and solved
- ✅ Comprehensive testing strategy
- ✅ Detailed implementation guide
- ✅ Clear success criteria

**Ready for Implementation**: Yes

**Estimated Time**: 14-20 hours

**Risk Level**: Low

**Expected Outcome**: Production-ready undo/redo system that seamlessly integrates with existing inline editing and mark operations

---

## Questions?

If you have questions during implementation:

1. Check the quickstart guide first
2. Reference the implementation plan for details
3. Look at architecture diagrams for visualization
4. Review existing code files
5. Use console logs to debug
6. Test in isolation (browser console)

All answers should be in one of the four documents produced.

**Good luck with implementation!** 🚀
