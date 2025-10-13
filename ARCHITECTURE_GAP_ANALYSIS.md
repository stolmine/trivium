# Architecture Gap Analysis: UI Specifications vs Current Implementation

This document identifies all changes needed to align the current architecture with the detailed UI specifications in `ui-function.md`.

## Executive Summary

The UI specifications introduce significantly more detailed requirements not covered in the current architecture, particularly around:
- **Folder-based organization** with tree navigation
- **Granular read/unread tracking** at paragraph level (not just single position)
- **Multi-dimensional filtering** for study sessions and statistics
- **Advanced UI patterns** (resizable panels, context menus, keyboard navigation)

**Good News**: The foundation is solid. Technology choices and overall architecture are appropriate. Changes are **additive** rather than requiring rewrites.

## Critical New Requirements

### 1. Folder System (NOT in current architecture)
- Tree-based hierarchical folder navigation
- Drag-and-drop organization
- Folder-based study filtering
- Folder-based statistics

**Impact**: Requires new database tables, backend commands, and major UI component.

### 2. Granular Read/Unread Tracking
**Current**: Single `current_position` field (linear reading only)
**Needed**: Multiple read ranges per text (nonlinear reading support)

- Mark arbitrary selections as read via context menu/hotkey
- Paragraph-level detection and navigation
- Visual highlighting of read vs unread sections

**Impact**: Major database schema change, new backend logic, reading UI overhaul.

### 3. Paragraph Detection & Navigation
- Automatic paragraph boundary detection
- Keyboard navigation through paragraphs
- Paragraph-aware progress tracking

**Impact**: New parsing logic, database table, navigation UI components.

### 4. Resizable Panel Layout
- Three-section layout: tree nav | reading | flashcard sidebar
- Horizontal resizing for tree navigation
- Collapsible flashcard sidebar

**Impact**: New layout components, state management for panel sizes.

### 5. Study Session Filtering
**Current**: Simple FSRS-based scheduling
**Needed**: Filter by folder, tag, article, or schedule + daily limits

**Impact**: Complex query logic, filter UI, limits enforcement.

### 6. Statistics Dashboard
Multi-dimensional aggregation:
- Reading progress: by article/tag/folder/total
- Flashcard scores: by article/tag/folder/total
- Separate stats page/section

**Impact**: New aggregation queries, charting components, stats page.

### 7. MLA Bibliography Metadata
**Current**: Generic JSON `metadata` field
**Needed**: Structured MLA fields (author, publisher, date, DOI, ISBN, etc.)

**Impact**: Database schema changes, metadata input UI.

## Database Schema Changes Required

### New Tables Needed

#### 1. `folders` - Hierarchical folder structure
```sql
CREATE TABLE folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);
```

#### 2. `text_folders` - Many-to-many relationship
```sql
CREATE TABLE text_folders (
    text_id INTEGER NOT NULL,
    folder_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (text_id, folder_id),
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);
```

#### 3. `read_ranges` - Replaces simple position tracking
```sql
CREATE TABLE read_ranges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    start_position INTEGER NOT NULL,
    end_position INTEGER NOT NULL,
    marked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE
);
```

#### 4. `paragraphs` - Detected paragraph boundaries
```sql
CREATE TABLE paragraphs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_id INTEGER NOT NULL,
    paragraph_index INTEGER NOT NULL,
    start_position INTEGER NOT NULL,
    end_position INTEGER NOT NULL,
    character_count INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE,
    UNIQUE(text_id, paragraph_index)
);
```

#### 5. `study_limits` - Daily review/new card limits
```sql
CREATE TABLE study_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    daily_new_cards INTEGER NOT NULL DEFAULT 20,
    daily_reviews INTEGER NOT NULL DEFAULT 200,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);
```

### Tables to Modify

#### `texts` - Add MLA bibliography fields
```sql
ALTER TABLE texts ADD COLUMN author TEXT;
ALTER TABLE texts ADD COLUMN publication_date TEXT;
ALTER TABLE texts ADD COLUMN publisher TEXT;
ALTER TABLE texts ADD COLUMN access_date TEXT;
ALTER TABLE texts ADD COLUMN doi TEXT;
ALTER TABLE texts ADD COLUMN isbn TEXT;
```

#### `reading_progress` - Keep for backward compatibility
- Current table tracks last access and total time
- New `read_ranges` table handles actual progress
- Both tables serve different purposes

## Backend Changes Required

### New Command Files

#### `commands/folders.rs` (NEW)
- `create_folder(name, parent_id)`
- `get_folder_tree()`
- `move_folder(folder_id, new_parent_id)`
- `delete_folder(folder_id)`
- `add_text_to_folder(text_id, folder_id)`
- `remove_text_from_folder(text_id, folder_id)`
- `get_texts_in_folder(folder_id)`

#### `commands/stats.rs` (NEW)
- `get_reading_stats_by_folder(folder_id)`
- `get_reading_stats_by_tag(tag_id)`
- `get_reading_stats_by_text(text_id)`
- `get_flashcard_stats_by_folder(folder_id)`
- `get_flashcard_stats_by_tag(tag_id)`
- `get_flashcard_stats_by_text(text_id)`
- `get_overall_stats()`

### Updates to Existing Commands

#### `commands/reading.rs` (MAJOR ADDITIONS)
- `mark_range_as_read(text_id, start_pos, end_pos)`
- `get_read_ranges(text_id)`
- `get_most_recently_read_text(text_id)`
- `calculate_text_progress(text_id)`
- `get_paragraphs(text_id)`
- `get_next_unread_paragraph(text_id, current_pos)`
- `get_previous_paragraph(text_id, current_pos)`

#### `commands/review.rs` (ADDITIONS)
- `get_due_cards_by_folder(folder_id)`
- `get_due_cards_by_tag(tag_id)`
- `get_due_cards_by_text(text_id)`
- `get_study_session(filter, include_new, include_due)`
- `set_daily_limits(new_cards, reviews)`
- `get_todays_progress()`

### New Models

#### `models/folder.rs` (NEW)
```rust
pub struct Folder {
    pub id: i64,
    pub name: String,
    pub parent_id: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub struct FolderNode {
    pub folder: Folder,
    pub children: Vec<FolderNode>,
    pub text_count: i64,
}
```

#### `models/read_range.rs` (NEW)
```rust
pub struct ReadRange {
    pub id: i64,
    pub text_id: i64,
    pub user_id: i64,
    pub start_position: i64,
    pub end_position: i64,
    pub marked_at: DateTime<Utc>,
}
```

#### `models/paragraph.rs` (NEW)
```rust
pub struct Paragraph {
    pub id: i64,
    pub text_id: i64,
    pub paragraph_index: i64,
    pub start_position: i64,
    pub end_position: i64,
    pub character_count: i64,
    pub is_read: bool,
}
```

### New Services

#### `services/range_calculator.rs` (NEW)
- `calculate_read_characters(ranges)` - Merge overlapping ranges
- `is_position_read(position, ranges)` - Check if position is read
- `get_unread_ranges(total_length, read_ranges)` - Get unread sections

#### `services/parser.rs` (ADDITIONS)
- `detect_paragraphs(content)` - Detect paragraph boundaries
- `parse_mla_metadata(mla_string)` - Parse MLA bibliography format

## Frontend Changes Required

### New Component Structure

```
src/lib/components/
├── layout/
│   ├── MainLayout.tsx          # NEW - Three-panel layout
│   ├── ResizablePanel.tsx      # NEW - Resizable panel wrapper
│   ├── TreeNavigation.tsx      # NEW - Left sidebar
│   └── FlashcardSidebar.tsx    # NEW - Right sidebar
├── folders/
│   ├── FolderTree.tsx          # NEW - Tree component
│   ├── FolderNode.tsx          # NEW - Individual node
│   ├── FolderContextMenu.tsx   # NEW - Right-click menu
│   └── CreateFolderDialog.tsx  # NEW - Create folder modal
├── reading/
│   ├── ArticleViewer.tsx       # EXISTS - needs updates
│   ├── TextSelectionMenu.tsx   # NEW - Mark as read menu
│   ├── ParagraphNavigator.tsx  # NEW - Keyboard navigation
│   └── ReadUnreadHighlighter.tsx # NEW - Visual highlighting
├── study/
│   ├── StudyFilterDialog.tsx   # NEW - Filter selection
│   └── DailyLimitsSettings.tsx # NEW - Configure limits
└── stats/
    ├── StatsLayout.tsx         # NEW - Stats page
    ├── ReadingStatsPanel.tsx   # NEW - Reading charts
    ├── FlashcardStatsPanel.tsx # NEW - Flashcard charts
    └── FilterSelector.tsx      # NEW - Filter by folder/tag
```

### New Stores

```typescript
// stores/folder.ts (NEW)
interface FolderState {
  folderTree: FolderNode[];
  selectedFolderId: number | null;
  expandedFolders: Set<number>;
  loadFolderTree: () => Promise<void>;
  createFolder: (name: string, parentId?: number) => Promise<void>;
  // ... more folder operations
}

// stores/reading.ts (MAJOR UPDATES)
interface ReadingState {
  currentArticle: Article | null;
  readRanges: ReadRange[];           // NEW
  paragraphs: Paragraph[];            // NEW
  currentParagraphIndex: number;      // NEW
  mostRecentlyRead: string | null;    // NEW
  markRangeAsRead: (start, end) => Promise<void>;  // NEW
  navigateToNextParagraph: () => Promise<void>;    // NEW
  // ... existing + new methods
}

// stores/study.ts (NEW)
interface StudyState {
  currentFilter: StudyFilter;
  dailyLimits: DailyLimits;
  todaysProgress: DailyProgress;
  availableCards: Flashcard[];
  // ... study session management
}

// stores/stats.ts (NEW)
interface StatsState {
  readingStats: ReadingStats | null;
  flashcardStats: FlashcardStats | null;
  currentFilter: StatsFilter;
  loadStats: (filter: StatsFilter) => Promise<void>;
}
```

### New UI Patterns to Implement

1. **Resizable Panels**: Use `react-resizable-panels` library
2. **Context Menus**: Use `@radix-ui/react-context-menu` (already available)
3. **Drag and Drop**: Use `@dnd-kit/core` for folder/text organization
4. **Keyboard Navigation**: Comprehensive shortcut system

### New Routes

```typescript
const routes = [
  { path: '/', component: LibraryView },      // Folder tree + reading
  { path: '/read/:id', component: ReadingView },
  { path: '/study', component: StudyView },
  { path: '/stats', component: StatsView },   // NEW
];
```

## Implementation Priority

### Phase 1: Core Reading (Weeks 1-2) - CRITICAL
1. Database migration: folders, read_ranges, paragraphs
2. Backend: folder management commands
3. Backend: read range tracking
4. Backend: paragraph detection
5. UI: Folder tree component
6. UI: Mark text as read functionality

**Deliverable**: Users can organize texts and mark sections as read.

### Phase 2: Enhanced Navigation (Week 3) - HIGH
1. UI: Resizable panel layout
2. UI: Keyboard paragraph navigation
3. UI: Visual highlighting of read/unread
4. Backend: Progress calculation with read ranges

**Deliverable**: Full reading experience with keyboard navigation.

### Phase 3: Flashcard Integration (Week 4) - HIGH
1. UI: Flashcard sidebar
2. Backend: "Most recently read" tracking
3. UI: Cloze creation from sidebar

**Deliverable**: Seamless flashcard creation from reading.

### Phase 4: Study Filtering (Week 5) - MEDIUM
1. Backend: Study session filtering
2. Backend: Daily limits system
3. UI: Study filter dialog
4. UI: Full-screen study mode

**Deliverable**: Flexible study sessions.

### Phase 5: Statistics (Week 6) - MEDIUM
1. Backend: Stats calculation queries
2. UI: Stats page and charts
3. UI: Filter-based stats views

**Deliverable**: Analytics dashboard.

### Phase 6: Polish (Week 7) - LOW
1. Drag-and-drop
2. MLA metadata parsing
3. PDF/EPUB import
4. Performance optimization

## What Doesn't Need to Change

### Technology Stack ✅
- React + TypeScript + Vite
- Tauri 2.0 with Rust
- SQLite with SQLx
- FSRS algorithm
- Zustand state management
- shadcn/ui components

### Core Architecture ✅
- Three-layer backend design
- Tauri IPC pattern
- Database migration system
- Project structure

### Existing Tables (mostly) ✅
- `flashcards` - No changes needed
- `review_history` - No changes needed
- `tags` and `text_tags` - No changes needed

## Migration Strategy

**Recommendation**: Create single comprehensive migration now (no user data exists yet).

New migration: `20241012100000_add_folders_and_ranges.sql`

Include:
- New tables: folders, text_folders, read_ranges, paragraphs, study_limits
- ALTER statements for texts table (add MLA fields)
- All necessary indexes

## Open Questions

1. **Folder depth**: Maximum nesting level?
2. **Multiple folders**: Can text be in multiple folders simultaneously?
3. **Paragraph definition**: Double newline? Single newline? Indentation?
4. **Daily limit reset time**: Midnight? User-configurable?
5. **Study mode**: Separate window or overlay?
6. **MLA fields**: Which are required vs optional?

## Risk Assessment

### High Risk
- **Read range calculation**: Performance with many overlapping ranges
  - *Mitigation*: Merge ranges on insert, use interval tree for queries

- **Paragraph detection**: May not work for all formats
  - *Mitigation*: Allow manual override, test diverse content

### Medium Risk
- **Resizable panels**: Complex state management
  - *Mitigation*: Use proven library (react-resizable-panels)

- **Statistics performance**: Large datasets may be slow
  - *Mitigation*: Proper indexing, consider caching

## Next Steps

1. ✅ Complete this gap analysis
2. Update architecture documents with new requirements
3. Create comprehensive database migration
4. Implement folder system (backend + frontend)
5. Implement read range tracking
6. Build updated reading UI

---

**Estimated Total Effort**: 6-7 weeks for full implementation
