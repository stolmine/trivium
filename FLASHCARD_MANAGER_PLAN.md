# Flashcard Manager Feature - Implementation Plan

**Status**: Planning Phase
**Date**: 2025-11-14
**Estimated Time**: 56-76 hours (2-3 weeks)

---

## Executive Summary

Create an advanced Flashcard Manager feature that provides a powerful, Excel-like interface for managing flashcards. The feature will be implemented as a new dedicated page accessible from the main menu, following existing patterns in the application (similar to the Library page dual-pane layout).

## Research Findings

### Current Flashcard Implementation

**Database Schema (flashcards table):**
- id, text_id, user_id
- original_text, cloze_text, cloze_index, cloze_number
- created_at, updated_at, due, last_review
- FSRS fields: stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state
- display_index (for ordering within a text)
- cloze_note_id (links to parent cloze note)
- buried_until (for temporarily hiding cards)

**Related Tables:**
- cloze_notes: Stores parsed cloze deletion notes that can generate multiple flashcards
- review_history: Tracks all card reviews with ratings and timing
- texts: Source material for flashcards
- folders: Hierarchical organization

**Existing Commands:**
- get_flashcards_by_text
- create_flashcard_from_cloze
- delete_flashcard
- get_due_cards / get_due_cards_filtered
- grade_card, bury_card, undo_review
- Various filtering and stats commands

**Frontend Patterns:**
- Dual-pane layout with resizable panels (Library page)
- Zustand for state management
- TailwindCSS with shadcn/ui components
- Context menus for actions
- Batch operations (BatchMoveDialog, BatchDeleteDialog, ExportDialog)
- Multi-select patterns with SelectionToolbar

## Architecture Plan

### 1. UI Architecture

**Implementation Approach: Dedicated Page (Not Separate Window)**
- New route: `/flashcard-manager`
- Reason: Simpler implementation, consistent with app architecture, better state sharing
- Layout: Dual-pane design similar to Library page

**Page Structure:**
```
/flashcard-manager route
├── FlashcardManagerLayout.tsx (main layout with resizable panes)
├── LeftPane.tsx
│   ├── FlashcardManagerHeader (title, actions, view controls)
│   ├── FilterToolbar (scope, state, due date filters)
│   ├── FlashcardTable (main table component)
│   └── BulkActionToolbar (visible when rows selected)
└── RightPane.tsx
    ├── CardDetailView (single card selected)
    ├── MultiSelectInfoView (multiple cards selected)
    └── EmptyState (nothing selected)
```

### 2. Table Implementation

**Library Choice: TanStack Table v8**
- Headless UI - fits perfectly with existing shadcn/ui patterns
- Full TypeScript support
- Built-in sorting, filtering, row selection
- Highly performant with virtualization support
- Already using React/TypeScript stack

**Table Features:**
- Column sorting (multi-column)
- Column filtering (text, date range, number range)
- Column visibility toggle
- Column resizing
- Row selection (single/multi with Cmd/Ctrl+Click)
- Inline editing for specific fields
- Excel-style keyboard navigation (arrow keys, Tab, Enter)
- Context menu on right-click
- Pagination (with configurable page size)
- Row virtualization for large datasets (>1000 cards)

**Columns to Display:**
1. Select (checkbox)
2. ID (sortable, read-only)
3. Text Source (sortable, filterable, read-only, clickable link)
4. Cloze Content (editable in modal, preview with ellipsis)
5. Original Text / Context (editable in modal, preview)
6. Due Date (sortable, filterable by date range, editable)
7. Reps (sortable, filterable, read-only)
8. Difficulty (sortable, filterable, editable)
9. Stability (sortable, filterable, read-only)
10. State (sortable, filterable - New/Learning/Review/Relearning)
11. Created At (sortable, filterable, read-only)
12. Last Review (sortable, filterable, read-only)
13. Lapses (sortable, filterable, read-only)
14. Scheduled Days (sortable, read-only)
15. Buried Until (sortable, filterable, editable)
16. Actions (quick actions dropdown)

### 3. Backend Changes Needed

**New Commands to Add:**

```rust
// Get all flashcards with flexible filtering and pagination
#[tauri::command]
pub async fn get_all_flashcards_paginated(
    filter: FlashcardFilter,
    sort: Vec<SortField>,
    offset: i64,
    limit: i64,
    db: State<'_, Arc<Mutex<Database>>>
) -> Result<FlashcardsPage, String>

// Batch update flashcards
#[tauri::command]
pub async fn batch_update_flashcards(
    updates: Vec<FlashcardUpdate>,
    db: State<'_, Arc<Mutex<Database>>>
) -> Result<Vec<Flashcard>, String>

// Batch delete flashcards
#[tauri::command]
pub async fn batch_delete_flashcards(
    flashcard_ids: Vec<i64>,
    db: State<'_, Arc<Mutex<Database>>>
) -> Result<i64, String>

// Duplicate flashcard(s)
#[tauri::command]
pub async fn duplicate_flashcards(
    flashcard_ids: Vec<i64>,
    db: State<'_, Arc<Mutex<Database>>>
) -> Result<Vec<Flashcard>, String>

// Update single flashcard field
#[tauri::command]
pub async fn update_flashcard_field(
    flashcard_id: i64,
    field: String,
    value: serde_json::Value,
    db: State<'_, Arc<Mutex<Database>>>
) -> Result<Flashcard, String>

// Export flashcards to JSON/CSV
#[tauri::command]
pub async fn export_flashcards(
    flashcard_ids: Vec<i64>,
    format: String, // "json" or "csv"
    db: State<'_, Arc<Mutex<Database>>>
) -> Result<String, String>
```

**New Rust Types:**

```rust
#[derive(Debug, Deserialize)]
pub struct FlashcardFilter {
    pub text_id: Option<i64>,
    pub folder_id: Option<String>,
    pub state: Option<Vec<i64>>, // 0=New, 1=Learning, 2=Review, 3=Relearning
    pub due_before: Option<DateTime<Utc>>,
    pub due_after: Option<DateTime<Utc>>,
    pub min_reps: Option<i64>,
    pub max_reps: Option<i64>,
    pub min_difficulty: Option<f64>,
    pub max_difficulty: Option<f64>,
    pub search_text: Option<String>, // search in cloze_text or original_text
    pub is_buried: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct SortField {
    pub column: String,
    pub direction: String, // "asc" or "desc"
}

#[derive(Debug, Serialize)]
pub struct FlashcardsPage {
    pub flashcards: Vec<FlashcardWithTextInfo>,
    pub total_count: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct FlashcardWithTextInfo {
    // All flashcard fields
    // Plus:
    pub text_title: String,
    pub text_folder_id: Option<String>,
    pub folder_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FlashcardUpdate {
    pub id: i64,
    pub field: String,
    pub value: serde_json::Value,
}
```

### 4. Frontend Components Structure

**New Components:**

```
src/components/flashcard-manager/
├── FlashcardTable.tsx (main table using TanStack Table)
├── FlashcardTableColumns.tsx (column definitions)
├── FlashcardTableToolbar.tsx (filters, search, column visibility)
├── FlashcardDetailView.tsx (right pane detail view)
├── FlashcardEditModal.tsx (full-screen editor for long content)
├── ClozePreview.tsx (renders cloze deletion with highlighting)
├── BulkActionToolbar.tsx (batch operations)
├── FlashcardFilterPanel.tsx (advanced filtering)
├── ColumnVisibilityMenu.tsx (show/hide columns)
└── ExportFlashcardsDialog.tsx (export to JSON/CSV)

src/routes/flashcard-manager/
├── index.tsx (main page)
├── LeftPane.tsx
└── RightPane.tsx

src/lib/stores/
└── flashcardManager.ts (Zustand store for manager state)

src/lib/hooks/
└── useFlashcardManager.ts (data fetching and mutations)
```

**State Management (Zustand Store):**

```typescript
interface FlashcardManagerStore {
  // Filters
  filters: FlashcardFilter;
  setFilter: (key: keyof FlashcardFilter, value: any) => void;
  clearFilters: () => void;

  // Sorting
  sorting: SortField[];
  setSorting: (sorting: SortField[]) => void;

  // Selection
  selectedIds: Set<number>;
  setSelectedIds: (ids: Set<number>) => void;
  toggleSelection: (id: number) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Pagination
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Column visibility
  hiddenColumns: Set<string>;
  toggleColumn: (column: string) => void;

  // Editing
  editingCardId: number | null;
  setEditingCard: (id: number | null) => void;
}
```

### 5. Key Features Implementation

**Inline Editing:**
- Click on editable cells to edit
- Press Enter to save, Esc to cancel
- Only allow editing of: due date, difficulty, original_text, cloze_text, buried_until
- Use debounced auto-save for field changes
- Show validation errors inline

**Excel-Style Editing Modal:**
- Large textarea/editor for overflowing content (cloze_text, original_text)
- Triggered by double-click or dedicated button
- Full-screen or large modal
- Syntax highlighting for cloze deletions
- Live preview of rendered card
- Save/Cancel buttons

**Batch Operations:**
- Delete selected cards (with confirmation)
- Duplicate selected cards (creates copies with reset FSRS data)
- Bury until date (batch set buried_until)
- Reset FSRS stats (reset difficulty, stability, reps, etc.)
- Change state (e.g., mark as New)
- Move to different text (change text_id)

**Filtering:**
- Quick filters in toolbar (State, Due Today, Due This Week, Overdue)
- Advanced filter panel (collapsible)
- Text search across cloze_text and original_text
- Date range pickers for due/created/last_review
- Number range inputs for reps, difficulty, stability
- Folder/Text dropdowns
- Buried status toggle

**Sorting:**
- Click column header to sort
- Shift+Click for multi-column sort
- Visual indicators for sort direction
- Persist sort preferences in local storage

**Keyboard Shortcuts:**
- Arrow keys: Navigate cells
- Enter: Edit cell / Confirm edit
- Esc: Cancel edit / Clear selection
- Cmd/Ctrl+A: Select all
- Cmd/Ctrl+D: Duplicate selected
- Delete/Backspace: Delete selected (with confirmation)
- Cmd/Ctrl+F: Focus search
- Display keyboard shortcuts in help modal (consistent with CLAUDE.md requirement)

### 6. UX Design

**Menu Access:**
- Add "Flashcard Manager" menu item in main navigation
- Icon: Table/Grid icon from lucide-react
- Route: /flashcard-manager
- Keyboard shortcut: Cmd/Ctrl+8

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Trivium - Flashcard Manager                                     │
├─────────────────────────────────┬───────────────────────────────┤
│ Left Pane (70%)                 │ Right Pane (30%)              │
│ ┌─────────────────────────────┐ │ ┌───────────────────────────┐ │
│ │ Header                      │ │ │ Card Detail               │ │
│ │ [+ New] [Delete] [Duplicate]│ │ │                           │ │
│ ├─────────────────────────────┤ │ │ Due: 2025-11-15           │ │
│ │ Filters & Search            │ │ │ Reps: 5                   │ │
│ │ [Search...] [Filters ▼]     │ │ │ Difficulty: 0.45          │ │
│ ├─────────────────────────────┤ │ │                           │ │
│ │ Table                       │ │ │ Cloze Content:            │ │
│ │ ┌───┬────┬──────┬────┬────┐│ │ │ [Preview]                 │ │
│ │ │☑ │ID  │Source│Due │Reps││ │ │                           │ │
│ │ ├───┼────┼──────┼────┼────┤│ │ │ Original Text:            │ │
│ │ │☑ │123 │Art...│Nov │12  ││ │ │ [Preview]                 │ │
│ │ │☐ │124 │Sci...│Dec │8   ││ │ │                           │ │
│ │ └───┴────┴──────┴────┴────┘│ │ │ [Edit Card]               │ │
│ │                             │ │ └───────────────────────────┘ │
│ └─────────────────────────────┘ │                               │
│ Bulk Actions (when selected)    │                               │
│ [Delete 2 Cards] [Duplicate]    │                               │
└─────────────────────────────────┴───────────────────────────────┘
```

**Right Pane Views:**
1. Empty State: "Select a card to view details"
2. Single Card: Full card details with edit button
3. Multi-Select: Summary stats and bulk actions

### 7. Database Migration

**No schema changes needed!** All required fields already exist in the flashcards table.

Optional future enhancements (not in initial implementation):
- Add tags table for flashcard categorization
- Add notes field for user annotations

### 8. Technical Considerations and Risks

**Performance Risks:**
- Loading thousands of cards at once
- **Mitigation:** Pagination (50-100 cards per page), virtualization for large tables

**Data Integrity Risks:**
- Batch operations could corrupt FSRS scheduling
- **Mitigation:** Validation on backend, confirmation dialogs for destructive operations

**UX Complexity:**
- Too many features could overwhelm users
- **Mitigation:** Progressive disclosure, sensible defaults, keyboard shortcuts help

**State Management:**
- Managing complex filter/sort/selection state
- **Mitigation:** Use Zustand with clear state structure, persist to localStorage

**Tauri Window Management:**
- Considered separate window but rejected
- **Mitigation:** Use dedicated page route instead for simplicity

## Implementation Phases

### Phase 1: Core Table (Week 1)
**Time Estimate:** 12-16 hours

**Tasks:**
- Install @tanstack/react-table dependency
- Create backend `get_all_flashcards_paginated` command
- Create basic route structure (/flashcard-manager)
- Implement FlashcardTable component with TanStack Table
- Add all 16 columns (read-only for now)
- Basic pagination (50 items per page)
- Basic styling matching app theme
- Add menu item and navigation

**Deliverables:**
- Functional table displaying all flashcards
- Pagination working
- Navigation from main menu

### Phase 2: Filtering & Sorting (Week 1-2)
**Time Estimate:** 8-12 hours

**Tasks:**
- Implement filter logic in backend query
- Create FlashcardTableToolbar component
- Add text search input
- Add quick filter buttons (State, Due Today, etc.)
- Create FlashcardFilterPanel for advanced filters
- Implement column header sorting
- Add multi-column sort with Shift+Click
- State management for filters and sorting
- Persist filters/sort to localStorage

**Deliverables:**
- Working filters for all filter types
- Multi-column sorting
- Persistent preferences

### Phase 3: Selection & Batch Operations (Week 2)
**Time Estimate:** 10-14 hours

**Tasks:**
- Implement row selection (checkbox + Cmd/Ctrl+Click)
- Create BulkActionToolbar component
- Backend: `batch_delete_flashcards` command
- Backend: `duplicate_flashcards` command
- Backend: `batch_update_flashcards` command
- Create confirmation dialogs for destructive operations
- Implement select all / clear selection
- Add keyboard shortcuts (Ctrl+A, Delete)

**Deliverables:**
- Multi-select working
- Batch delete with confirmation
- Batch duplicate
- Batch operations (bury, reset stats)

### Phase 4: Inline & Modal Editing (Week 2-3)
**Time Estimate:** 12-16 hours

**Tasks:**
- Backend: `update_flashcard_field` command
- Implement inline editing for editable cells
- Create FlashcardEditModal component
- Add syntax highlighting for cloze deletions
- Implement live preview in modal
- Add validation for field changes
- Debounced auto-save for inline edits
- Error handling and display
- Keyboard navigation (Enter to edit, Esc to cancel)

**Deliverables:**
- Inline editing for due date, difficulty, buried_until
- Full-screen modal for cloze_text and original_text
- Validation and error handling

### Phase 5: Right Pane Detail View (Week 3)
**Time Estimate:** 6-8 hours

**Tasks:**
- Create FlashcardDetailView component
- Create ClozePreview component
- Implement empty state
- Implement multi-select summary view
- Add "Edit Card" button linking to modal
- Display all card metadata
- Show text source with clickable link
- Format dates properly

**Deliverables:**
- Functional detail view for single card
- Summary view for multi-select
- Empty state when nothing selected

### Phase 6: Polish & Keyboard Shortcuts (Week 3-4)
**Time Estimate:** 8-10 hours

**Tasks:**
- Backend: `export_flashcards` command (JSON/CSV)
- Create ExportFlashcardsDialog component
- Create ColumnVisibilityMenu component
- Implement all keyboard shortcuts
- Add keyboard shortcut help modal
- Update KEYBOARD_SHORTCUTS.md
- Performance optimization (React.memo, useMemo)
- Add loading states
- Add error states
- Polish animations and transitions
- Final testing and bug fixes

**Deliverables:**
- Export functionality
- Column visibility toggle
- Complete keyboard navigation
- Performance optimized
- Production-ready

## Testing Strategy

### Unit Tests
- Filter logic functions
- Sort logic functions
- Batch operation functions
- Validation functions

### Integration Tests
- Backend commands with database
- Frontend table interactions
- Filter combinations
- Sort combinations

### Manual Testing
- Keyboard navigation flows
- Large dataset performance (1000+ cards)
- Batch operations with various selections
- Filter combinations
- Edge cases:
  - Empty states (no cards)
  - Single card
  - All cards selected
  - No selection
  - Extreme values (very high reps, very old/new dates)

## Future Enhancements (Post-MVP)

1. **Flashcard Tagging System**
   - Add tags table
   - Tag management UI
   - Filter by tags

2. **Saved Filter Presets**
   - Save common filter combinations
   - Quick access to saved filters

3. **Column Reordering**
   - Drag-drop column headers to reorder

4. **Custom Views/Workspaces**
   - Save different table configurations
   - Switch between views

5. **Advanced Search**
   - Regex support
   - Fuzzy search

6. **Bulk Import**
   - Import cards from CSV/JSON
   - Template support

7. **Card Templates**
   - Predefined card formats
   - Template library

8. **Suspend/Unsuspend**
   - Different from bury
   - Remove from review rotation

9. **Per-Card FSRS Parameters**
   - Override global FSRS settings
   - Custom scheduling per card

10. **Statistics Dashboard Integration**
    - Link to stats page
    - Inline mini-stats

## Dependencies to Add

```json
{
  "@tanstack/react-table": "^8.20.5"
}
```

## Files to Create/Modify

### New Files (21)

**Backend (2 files):**
1. `src-tauri/src/commands/flashcard_manager.rs` - All new commands
2. `src-tauri/src/models/flashcard_manager.rs` - New types

**Frontend Routes (3 files):**
3. `src/routes/flashcard-manager/index.tsx` - Main page
4. `src/routes/flashcard-manager/LeftPane.tsx` - Table pane
5. `src/routes/flashcard-manager/RightPane.tsx` - Detail pane

**Frontend Components (10 files):**
6. `src/components/flashcard-manager/FlashcardTable.tsx`
7. `src/components/flashcard-manager/FlashcardTableColumns.tsx`
8. `src/components/flashcard-manager/FlashcardTableToolbar.tsx`
9. `src/components/flashcard-manager/FlashcardDetailView.tsx`
10. `src/components/flashcard-manager/FlashcardEditModal.tsx`
11. `src/components/flashcard-manager/ClozePreview.tsx`
12. `src/components/flashcard-manager/BulkActionToolbar.tsx`
13. `src/components/flashcard-manager/FlashcardFilterPanel.tsx`
14. `src/components/flashcard-manager/ColumnVisibilityMenu.tsx`
15. `src/components/flashcard-manager/ExportFlashcardsDialog.tsx`

**Frontend State & Types (3 files):**
16. `src/lib/stores/flashcardManager.ts` - Zustand store
17. `src/lib/hooks/useFlashcardManager.ts` - Data fetching hooks
18. `src/lib/types/flashcardManager.ts` - TypeScript types

**Documentation (3 files):**
19. `FLASHCARD_MANAGER_PLAN.md` - This document
20. `FLASHCARD_MANAGER_DESIGN.md` - UX/UI design specification
21. `FLASHCARD_MANAGER_IMPLEMENTATION.md` - Implementation guide

### Modified Files (6)

1. `src/App.tsx` - Add /flashcard-manager route
2. `src/components/shell/Sidebar.tsx` or main menu - Add menu item
3. `src-tauri/src/lib.rs` - Register new commands
4. `src-tauri/src/commands/mod.rs` - Export new module
5. `src-tauri/src/models/mod.rs` - Export new module
6. `package.json` - Add @tanstack/react-table dependency
7. `KEYBOARD_SHORTCUTS.md` - Document new shortcuts
8. `DOCUMENTATION_INDEX.md` - Add new documentation files

## Success Criteria

### MVP Success Criteria
- [ ] Table displays all flashcards with pagination
- [ ] All 16 columns visible and sortable
- [ ] Text search works across cloze and original text
- [ ] Filters work for all field types
- [ ] Multi-select works with Cmd/Ctrl+Click
- [ ] Batch delete with confirmation works
- [ ] Batch duplicate creates new cards
- [ ] Inline editing works for editable fields
- [ ] Modal editor works for long content
- [ ] Right pane shows card details
- [ ] Keyboard shortcuts work
- [ ] Export to JSON/CSV works
- [ ] Performance acceptable with 1000+ cards
- [ ] No data loss or corruption

### Quality Criteria
- [ ] TypeScript types complete with no 'any'
- [ ] All components follow existing patterns
- [ ] Consistent styling with app theme
- [ ] Responsive layout works on different screen sizes
- [ ] Error handling for all operations
- [ ] Loading states for async operations
- [ ] Accessible keyboard navigation
- [ ] Documentation complete
- [ ] Code reviewed and tested

## Timeline Summary

**Total Estimated Time:** 56-76 hours (2-3 weeks)

**Week 1:** Phases 1-2 (Core Table + Filtering/Sorting) - 20-28 hours
**Week 2:** Phases 3-4 (Selection/Batch Ops + Editing) - 22-30 hours
**Week 3-4:** Phases 5-6 (Detail View + Polish) - 14-18 hours

## Conclusion

This comprehensive plan provides a roadmap for implementing an Excel-like flashcard management interface that fits seamlessly into Trivium's existing architecture. The phased approach allows for incremental development and testing, with clear deliverables at each stage. The use of TanStack Table ensures a powerful, type-safe foundation for the feature while maintaining consistency with the existing UI patterns and technology stack.

---

**Documentation Version**: 1.0
**Last Updated**: 2025-11-14
**Author**: Claude Code (Planning Agent)
