# Trivium - Feature List

## Reading & Organization
- Hierarchical library with unlimited nested folders
- Drag-and-drop folder management
- Granular reading progress (mark any text selection)
- Character-by-character progress tracking
- Real-time library search (titles, folders, content)
- In-document text search with highlighting
- Wikipedia article import with automatic parsing
- Links sidebar with intelligent deduplication
- Scroll position preservation across navigation

## Text Editing
- Truly inline text editing in reading view
- Smart boundary detection (sentence/paragraph)
- Context dimming during edits
- Dual markdown modes (styled/literal)
- Automatic mark position preservation
- Unified undo/redo system (Ctrl+Z / Ctrl+Shift+Z)
- 50-action history per text
- Typewriter/focus mode (sentence isolation)
- Full UTF-16/Unicode support (emoji, CJK, etc.)
- Intelligent abbreviation detection (70+ patterns)

## Flashcard Creation
- Cloze deletion format with multiple deletions
- Q&A card format
- Flashcard Creation Hub (dedicated workspace)
- Scope selection (Library/Folder/Text)
- Skip marks (temporary)
- Bury marks (permanent 0-card)
- Live card preview
- Automatic context extraction (~200 chars)
- Session tracking with created cards list
- Auto-enumerated card numbers (Card #1, #2, #3...)
- Batch mark processing
- Keyboard-first workflow

## Spaced Repetition System
- FSRS-5 scheduling algorithm
- Four-button grading (Again/Hard/Good/Easy)
- Review undo/redo (Ctrl+Z / Ctrl+Shift+Z)
- Card burying (Shift+B)
- Flexible filtering (Library/Folder/Text/Global)
- Random or creation order
- Daily review limits (separate new/review caps)
- 1000+ card session capacity
- Cross-platform keyboard shortcuts (Ctrl/Cmd aware)
- Session progress tracking
- Buried card filtering

## Statistics & Analytics
- Comprehensive analytics dashboard (3 tabs)
- Review statistics (total reviews, retention rate)
- Study streak tracking
- 7-day forecast (new/learning/review cards)
- Daily answer breakdown (Again/Hard/Good/Easy %)
- Hourly performance distribution
- Reading progress by folder
- Session tracking (review + reading)
- Light/Dark theme support for visualizations
- Date range filtering

## User Interface
- Theme system (Light/Dark/Adaptive)
- 300ms smooth theme transitions
- Persistent sidebar state
- Sticky page headers
- Intelligent dropdown positioning
- Expand/collapse all folders (Ctrl+Shift+E)
- macOS Finder-style keyboard navigation
- Arrow key navigation (Up/Down/Left/Right/Enter)
- Auto-scroll selected items into view
- Icon-based navigation (no emoji clutter)

## Settings & Data Management
- Settings page with tabbed sections (Ctrl/Cmd+6)
- Default link visibility toggle
- Database size display (human-readable)
- Database export (backup)
- Database import (restore)
- Scoped reset operations (Library/Folder/Text)
- Reset reading progress by scope
- Reset flashcards by scope
- Reset all data by scope
- Settings persistence (localStorage)

## Keyboard Shortcuts (60+)
- **Global Navigation**: Ctrl+1 (Dashboard), Ctrl+2 (Reading), Ctrl+3 (Review), Ctrl+4 (Create Cards), Ctrl+5 (Ingest), Ctrl+6 (Settings), Ctrl+7 (Stats)
- **Reading**: Ctrl+E (Edit mode), Ctrl+F (Search), Ctrl+L (Toggle links), Ctrl+Z (Undo), Ctrl+Shift+Z (Redo)
- **Review**: 1-4 (Grading), Shift+B (Bury), Ctrl+Z (Undo), Ctrl+Shift+Z (Redo)
- **Library**: Ctrl+Shift+N (New folder), Ctrl+Shift+E (Expand/collapse all), Shift+Cmd/Ctrl+F (Library search)
- **Flashcard Hub**: Space (Skip mark), Shift+B (Bury), Arrows (Navigate), Ctrl+K/J (Navigate), Shift+Enter (Create card)
- **Ingest**: Shift+Enter (Quick submit), Ctrl+5 (Open ingest)
- **Modal Dialogs**: Enter (Confirm), Escape (Cancel)
- Platform-aware (Cmd on macOS, Ctrl on Windows/Linux)

## Validation & Safety
- Unique folder naming (within same parent)
- Unique text naming (within same folder)
- Case-insensitive duplicate validation
- Real-time validation feedback
- Red error text for conflicts
- Shift+Enter respects validation
- Folder click to expand/collapse
- Auto-load library data for validation

## Technical Features
- Native Rust backend (Tauri)
- React 18 + TypeScript frontend
- SQLite database with SQLx
- Zustand state management
- Tailwind CSS v4
- Sub-50ms database queries
- < 200ms card creation
- < 500ms page load
- Optimized rendering (React.memo, virtual lists)
- UTF-16 code unit position tracking
- Database migration system
- Compile-time query verification
- Cross-platform (macOS/Windows/Linux)
- Native desktop performance
- Local-first (no cloud dependencies)

## Data Integrity
- Automatic mark position updates on edits
- Overlap detection for mark deletion
- Warning dialogs before destructive actions
- Flashcard preservation (ON DELETE SET NULL)
- Read range cleanup on text edits
- Position-safe undo/redo
- Backend-synced operations
- Database export for backups
- Migration safety checks
- No data sent to cloud/servers

## Accessibility
- Complete keyboard navigation
- Mouse-free workflows
- Screen reader friendly (WCAG compliant)
- Platform-appropriate shortcuts
- Accessible form controls
- Clear focus indicators
- High contrast dark mode
- Reduced motion support

## Performance Optimizations
- Debounced search (300ms)
- Smart RAF timing for scroll restoration
- Direct Zustand store reads (no excess re-renders)
- Pagination for large card lists (auto-load)
- Indexed database queries
- Cached folder/text data
- Optimized mark overlap detection (O(n))
- Efficient text filtering (80% noise reduction)
- Virtual scrolling for long lists

## Developer Features
- Comprehensive documentation (60 files, ~53,800 lines)
- Automated testing (Vitest)
- Migration safety guides
- SQLx compile-time verification
- TypeScript strict mode
- Detailed phase implementation docs
- Architecture documentation
- Debug guides
- Lessons learned documentation
