# Trivium - Implementation Roadmap

## Overview

This document outlines the complete development roadmap for Trivium, a learning application combining incremental reading with spaced repetition flashcards.

**Total Estimated Timeline**: 9-10 weeks
**Current Status**: Phase 1 Complete
**Last Updated**: 2025-10-12

---

## Phase Summary

| Phase | Focus | Duration | Status | Priority |
|-------|-------|----------|--------|----------|
| Phase 0 | Foundation | 1 week | ✅ Complete | Critical |
| Phase 1 | Core Reading | 1 week | ✅ Complete | Critical |
| Phase 2 | Flashcard Creation | 2 weeks | 🔄 Next | Critical |
| Phase 3 | Review System | 1 week | 📋 Planned | Critical |
| Phase 4 | Folder Organization | 1 week | 📋 Planned | High |
| Phase 5 | Study Filtering | 1 week | 📋 Planned | Medium |
| Phase 6 | Statistics | 1 week | 📋 Planned | Medium |
| Phase 7 | Polish | 2 weeks | 📋 Planned | Low |

---

## Detailed Phase Breakdown

### ✅ Phase 0: Foundation (Week 1) - COMPLETE

**Goal**: Get basic text into the app and display it

**Why This First?**:
- Establishes complete vertical slice
- Tests entire stack end-to-end
- Provides immediate visual progress
- Unblocks all future development

**Backend Deliverables**:
- [x] Text model with MLA bibliography fields
- [x] `create_text`, `list_texts`, `get_text` commands
- [x] Paragraph detection service
- [x] Database initialization and state management

**Frontend Deliverables**:
- [x] Type definitions and API wrappers
- [x] Zustand store for state management
- [x] IngestModal for text import
- [x] Library view and reading view
- [x] React Router navigation

**Success Criteria**:
- [x] Can paste text into app
- [x] Text appears in library
- [x] Can view full content
- [x] Paragraphs auto-detected
- [x] No compilation errors

**Completed**: 2025-10-12

---

### ✅ Phase 1: Core Reading Experience (Week 2) - COMPLETE

**Goal**: Make reading functional with progress tracking

**Why This Second?**:
- Completes primary use case (reading)
- Provides immediate user value
- Sets up for flashcard creation
- Relatively low risk

**Backend Deliverables**:
- [x] ReadRange and Paragraph models
- [x] RangeCalculator service for merging overlapping ranges
- [x] `mark_range_as_read`, `get_read_ranges`, `calculate_text_progress`
- [x] `get_paragraphs`, `get_next_unread_paragraph`, `get_previous_paragraph`
- [x] `get_most_recently_read_text`

**Frontend Deliverables**:
- [x] Text selection context menu
- [x] Read/unread visual highlighting
- [x] Keyboard shortcuts (Ctrl+M)
- [x] Progress percentage display
- [x] Updated reading store with range tracking

**Success Criteria**:
- [x] Can mark sections as read
- [x] Visual highlighting works
- [x] Progress accurate
- [x] Keyboard navigation
- [x] Ranges merge correctly

**Completed**: 2025-10-12

---

### 🔄 Phase 2: Flashcard Creation (Weeks 3-4) - NEXT

**Goal**: Enable users to create flashcards from reading

**Why This Third?**:
- Completes reading → retention pipeline
- High user value (core feature)
- Requires read tracking to be functional
- Moderate complexity

**Backend Tasks** (5-6 days):
1. **Day 1-2**: Flashcard model and cloze parsing
   - [ ] Update `models/flashcard.rs` with complete struct
   - [ ] Implement cloze deletion parser (regex for {{c1::text}})
   - [ ] Validate cloze syntax

2. **Day 3-4**: Flashcard commands
   - [ ] `create_flashcard` command with cloze parsing
   - [ ] `get_flashcards_by_text` command
   - [ ] `update_flashcard` command
   - [ ] `delete_flashcard` command
   - [ ] Store with initial FSRS state (all fields = 0)

3. **Day 5-6**: Most recently read integration
   - [ ] Verify `get_most_recently_read_text` works
   - [ ] Test flashcard creation flow
   - [ ] Handle edge cases (no read ranges, etc.)

**Frontend Tasks** (5-6 days):
1. **Day 1**: Types and API wrappers
   - [ ] Update flashcard types
   - [ ] Add flashcard API wrappers
   - [ ] Update stores

2. **Day 2-3**: Flashcard sidebar
   - [ ] Create FlashcardSidebar component
   - [ ] Display "most recently read" text
   - [ ] Auto-update when marking text as read
   - [ ] Collapsible/expandable functionality

3. **Day 4-5**: Cloze editor
   - [ ] Create ClozeEditor component
   - [ ] Text selection within recently read section
   - [ ] Add cloze markup (c1, c2, c3...)
   - [ ] Visual preview of cloze
   - [ ] Multiple cloze support

4. **Day 6**: Resizable layout
   - [ ] Install react-resizable-panels
   - [ ] Implement 3-column layout
   - [ ] Persist panel sizes
   - [ ] Test responsiveness

**Success Criteria**:
- [ ] Can create cloze deletions
- [ ] Multiple clozes supported (c1, c2, c3)
- [ ] Flashcards stored correctly
- [ ] "Most recently read" updates automatically
- [ ] Sidebar is collapsible
- [ ] Preview before creation works

**Technical Considerations**:
- Cloze regex: `/\{\{c(\d+)::(.*?)\}\}/g`
- Support multiple clozes in one card
- Preserve context (full sentence)
- Auto-save to database

**Risk**: Medium-High (cloze editor complexity)

---

### 📋 Phase 3: Review System (Week 5)

**Goal**: Enable spaced repetition review

**Critical Blocker**: FSRS dependency conflict must be resolved first

**Backend Tasks** (4-5 days):
1. **Day 1-2**: FSRS Integration
   - [ ] **CRITICAL**: Resolve FSRS dependency conflict
     - Option A: Manual FSRS implementation (~3 days extra)
     - Option B: Switch to rusqlite (~2 days extra)
     - Option C: Find compatible crate version (~1 day extra)
   - [ ] Implement FSRS algorithm
   - [ ] Test scheduling calculations

2. **Day 3-4**: Review commands
   - [ ] `get_due_cards` command (filter by due date)
   - [ ] `grade_card` command with FSRS updates
   - [ ] `get_review_count` command
   - [ ] Update flashcard state fields

3. **Day 5**: Review history
   - [ ] Track all reviews in review_history table
   - [ ] Calculate retention statistics
   - [ ] Test review flow

**Frontend Tasks** (3-4 days):
1. **Day 1**: Review session UI
   - [ ] Create StudySession component
   - [ ] Full-screen mode (no distractions)
   - [ ] Display card with cloze hidden
   - [ ] "Show answer" button (Space key)

2. **Day 2**: Grading interface
   - [ ] 4-button grading (Again/Hard/Good/Easy)
   - [ ] Show next review interval for each grade
   - [ ] Keyboard shortcuts (1, 2, 3, 4)
   - [ ] Visual feedback on grade

3. **Day 3**: Session management
   - [ ] Progress display (X/Y cards)
   - [ ] Estimated time remaining
   - [ ] Session complete screen
   - [ ] Statistics summary

4. **Day 4**: Polish
   - [ ] Smooth transitions between cards
   - [ ] Undo last grade
   - [ ] Exit confirmation
   - [ ] Keyboard-only workflow

**Success Criteria**:
- [ ] FSRS algorithm working correctly
- [ ] Card queue generated by due date
- [ ] Grading updates intervals properly
- [ ] Review history tracked
- [ ] Keyboard-only workflow functional
- [ ] No bugs in scheduling

**Risk**: High (FSRS dependency conflict)

**Decision Point**: Choose FSRS resolution approach at start of phase

---

### 📁 Phase 4: Folder Organization (Week 6)

**Goal**: Enable text organization

**Backend Tasks** (3-4 days):
1. **Day 1**: Folder models and tree logic
   - [ ] Implement Folder and FolderNode models
   - [ ] Recursive tree building algorithm
   - [ ] Validate no circular references

2. **Day 2-3**: Folder commands
   - [ ] `create_folder` with parent_id support
   - [ ] `get_folder_tree` (recursive query)
   - [ ] `move_folder` with validation
   - [ ] `delete_folder` (cascade delete)

3. **Day 4**: Text-folder relationship
   - [ ] `add_text_to_folder` command
   - [ ] `remove_text_from_folder` command
   - [ ] `get_texts_in_folder` command
   - [ ] Support multiple folders per text

**Frontend Tasks** (2-3 days):
1. **Day 1**: Folder tree UI
   - [ ] Create FolderTree component
   - [ ] Expand/collapse nodes
   - [ ] Visual hierarchy (indentation)
   - [ ] Show text count per folder

2. **Day 2**: Folder operations
   - [ ] Context menu (create/delete/rename)
   - [ ] Create folder dialog
   - [ ] Delete confirmation
   - [ ] Filter texts by folder

3. **Day 3**: Integration
   - [ ] Add folder selector to ingest modal
   - [ ] Move texts between folders (context menu)
   - [ ] Update library view to show folder filter
   - [ ] Persist expanded state

**Success Criteria**:
- [ ] Can create nested folders
- [ ] Can organize texts in folders
- [ ] Folder tree renders correctly
- [ ] Filter by folder works
- [ ] No performance issues with large trees

**Optional** (defer to Phase 7):
- Drag-and-drop folder/text movement
- Keyboard navigation in tree

**Risk**: Low

---

### 🎯 Phase 5: Study Filtering & Limits (Week 7)

**Goal**: Enable targeted study sessions

**Backend Tasks** (3 days):
1. **Day 1**: Study filters
   - [ ] Implement StudyFilter enum
   - [ ] `get_study_session` with filter parameter
   - [ ] Filter by folder (join with text_folders)
   - [ ] Filter by tag (join with text_tags)
   - [ ] Filter by text

2. **Day 2**: Daily limits
   - [ ] `set_daily_limits` command
   - [ ] `get_todays_progress` command
   - [ ] Enforce limits in card selection
   - [ ] Track new vs review separately

3. **Day 3**: Testing and optimization
   - [ ] Test all filter combinations
   - [ ] Optimize queries
   - [ ] Handle edge cases

**Frontend Tasks** (2-3 days):
1. **Day 1**: Filter UI
   - [ ] Create StudyFilterDialog component
   - [ ] Radio/dropdown for filter type
   - [ ] Populate folder/tag/text lists
   - [ ] Include new/due toggles

2. **Day 2**: Daily limits UI
   - [ ] Create DailyLimitsSettings component
   - [ ] Number inputs for limits
   - [ ] Display progress toward limits
   - [ ] "Limits reached" screen

3. **Day 3**: Integration
   - [ ] Add filter button to study view
   - [ ] Show active filter in header
   - [ ] Persist filter preference
   - [ ] Test all scenarios

**Success Criteria**:
- [ ] Can filter by folder/tag/text/schedule
- [ ] Daily limits enforced
- [ ] Progress tracking accurate
- [ ] Filter UI intuitive

**Risk**: Low

---

### 📊 Phase 6: Statistics Dashboard (Week 8)

**Goal**: Provide progress visibility and motivation

**Backend Tasks** (3-4 days):
1. **Day 1-2**: Reading statistics
   - [ ] `get_reading_stats_by_folder` with aggregation
   - [ ] `get_reading_stats_by_tag`
   - [ ] `get_reading_stats_by_text`
   - [ ] Calculate: total chars, read chars, %, time

2. **Day 3**: Flashcard statistics
   - [ ] `get_flashcard_stats_by_folder`
   - [ ] `get_flashcard_stats_by_tag`
   - [ ] `get_flashcard_stats_by_text`
   - [ ] Calculate: total cards, retention, intervals

3. **Day 4**: Overall stats and optimization
   - [ ] `get_overall_stats` command
   - [ ] Optimize aggregation queries (indexes)
   - [ ] Consider caching for large datasets
   - [ ] Performance testing

**Frontend Tasks** (3-4 days):
1. **Day 1**: Stats page layout
   - [ ] Create StatsLayout component
   - [ ] Filter selector (folder/tag/text/total)
   - [ ] Grid layout for panels

2. **Day 2**: Reading stats panel
   - [ ] Display total/read characters
   - [ ] Progress bar
   - [ ] Time spent reading
   - [ ] Completion percentage

3. **Day 3**: Flashcard stats panel
   - [ ] Display card counts by state
   - [ ] Average retention rate
   - [ ] Average interval
   - [ ] Review count

4. **Day 4**: Visualizations (optional)
   - [ ] Progress over time chart
   - [ ] Retention heatmap
   - [ ] Export to CSV

**Success Criteria**:
- [ ] Stats calculate correctly
- [ ] Filtering works across dimensions
- [ ] Performance < 500ms for complex queries
- [ ] Visual presentation clear

**Risk**: Low

---

### ✨ Phase 7: Polish & Enhancement (Weeks 9-10)

**Goal**: Production-ready polish and nice-to-have features

**Priority Features** (Week 9):
1. **Wikipedia Integration** (2 days)
   - [ ] Implement Wikipedia API fetching
   - [ ] Auto-parse title and content
   - [ ] Extract metadata
   - [ ] Handle errors gracefully

2. **Keyboard Shortcuts** (1 day)
   - [ ] Implement Ctrl+J/K for paragraph navigation
   - [ ] Add keyboard shortcut help overlay (?)
   - [ ] Document all shortcuts
   - [ ] Test conflicts

3. **UX Polish** (2 days)
   - [ ] Loading states everywhere
   - [ ] Error messages user-friendly
   - [ ] Smooth transitions
   - [ ] Visual feedback on actions

**Secondary Features** (Week 10):
1. **Import Formats** (3 days)
   - [ ] PDF parsing (pdf.js or similar)
   - [ ] EPUB parsing
   - [ ] Plain text file upload
   - [ ] Handle encoding issues

2. **MLA Metadata** (1 day)
   - [ ] Parse MLA citation string
   - [ ] Auto-fill metadata fields
   - [ ] Validate format

3. **Advanced Features** (3 days)
   - [ ] Drag-and-drop for folders
   - [ ] Card browsing/editing interface
   - [ ] Undo in review sessions
   - [ ] Export/backup functionality
   - [ ] Dark mode (if not already)

4. **Performance** (1 day)
   - [ ] Profile and optimize slow queries
   - [ ] Implement virtualization for long lists
   - [ ] Lazy loading for large texts
   - [ ] Bundle size optimization

**Success Criteria**:
- [ ] Wikipedia auto-fetch working
- [ ] At least 2 import formats supported
- [ ] Professional polish throughout
- [ ] No major UX friction
- [ ] Performance targets met

**Risk**: Low

---

## Critical Path & Dependencies

```
Phase 0 (Foundation)
    ↓
Phase 1 (Core Reading)
    ↓
Phase 2 (Flashcard Creation) ←─────┐
    ↓                              │
Phase 3 (Review System)            │
    ↓                              │
Phase 4 (Folders) ─────────────────┘
    ↓
Phase 5 (Study Filtering)
    ↓
Phase 6 (Statistics)
    ↓
Phase 7 (Polish)
```

**Note**: Phase 4 (Folders) can be developed in parallel with Phases 2-3 if desired, as it's independent of the flashcard system.

---

## Risk Assessment

### High Risk Items
1. **FSRS Integration** (Phase 3)
   - Dependency conflict identified
   - May require manual implementation
   - Budget 2-3 extra days

2. **Cloze Editor** (Phase 2)
   - Complex UI component
   - Multiple edge cases
   - Budget extra testing time

### Medium Risk Items
1. **Read Range Performance** (Phase 1) - ✅ Resolved
2. **Paragraph Detection** (Phase 0/1) - ✅ Working well
3. **PDF/EPUB Parsing** (Phase 7)
   - Format variations
   - Encoding issues

### Low Risk Items
1. Folder organization
2. Statistics calculation
3. Study filtering
4. Wikipedia API

---

## Alternative Paths

### Fast Track (MVP in 4 weeks)
Focus on core learning loop only:
- ✅ Phase 0: Foundation (1 week)
- ✅ Phase 1: Core Reading (1 week)
- Phase 2: Flashcard Creation (1 week - simplified)
- Phase 3: Review System (1 week - basic)
- **Ship MVP**, iterate based on feedback

### Feature-Rich (12 weeks)
Add all nice-to-haves:
- All 7 phases
- Full drag-and-drop
- Advanced statistics with charts
- Multiple import formats
- Extensive keyboard shortcuts
- Mobile responsive UI

### Current Plan (10 weeks)
Balanced approach with core features + organization + basic polish

---

## Success Metrics

### User Value Milestones
- ✅ **Phase 0**: Can store and read content
- ✅ **Phase 1**: Can track reading progress
- **Phase 2**: Can create study materials
- **Phase 3**: Can review with spaced repetition
- **Phase 4**: Can organize content
- **Phase 5**: Can customize study sessions
- **Phase 6**: Can see learning progress
- **Phase 7**: Production-ready app

### Technical Milestones
- ✅ Database schema complete
- ✅ Tauri IPC working
- ✅ State management functional
- ✅ Read tracking accurate
- [ ] FSRS algorithm working
- [ ] All core features functional
- [ ] Performance targets met

---

## Next Steps

### Immediate (This Week)
1. ✅ Complete Phase 1
2. ✅ Test read tracking thoroughly
3. Decide: Phase 2 or quick enhancements?

### Short Term (Next 2 Weeks)
1. Start Phase 2 (Flashcard creation)
2. Implement flashcard sidebar
3. Build cloze editor
4. Test flashcard creation flow

### Medium Term (Next Month)
1. Complete Phases 2-3 (core learning loop)
2. Resolve FSRS dependency
3. Begin Phase 4 (folders)

### Long Term (Next 2 Months)
1. Complete all 7 phases
2. User testing and feedback
3. Production deployment
4. Documentation and onboarding

---

## Resources & Support

**Documentation**:
- `PROGRESS.md` - Current progress and status
- `architecture-backend.md` - Backend implementation details
- `architecture-frontend.md` - Frontend implementation details
- `ARCHITECTURE_GAP_ANALYSIS.md` - Requirements analysis

**External Resources**:
- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs-rs)
- [Tauri Documentation](https://v2.tauri.app/)
- [SQLx Documentation](https://docs.rs/sqlx/)
- [Lexical Editor](https://lexical.dev)

---

**Roadmap Version**: 1.0
**Last Updated**: 2025-10-12
**Next Review**: After Phase 2 completion
