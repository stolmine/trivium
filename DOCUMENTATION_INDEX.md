# Documentation Index

> **Note to AI Agents**: This index must be kept up to date. Whenever you create, modify, or delete .md files in this repository, please update this index accordingly. Include the file path, a brief description, and the last edit date.

Last Updated: 2025-10-21 (Phase 24 Card Hub Improvements - Pagination, review filters, mark coexistence fix, and UI enhancements)

---

## Core Specification Documents

### `/Users/why/repos/trivium/README.md`
**Description**: Project readme with overview, features, technology stack, and Phase 14 inline editing highlights
**Last Updated**: 2025-10-17

### `/Users/why/repos/trivium/core.md`
**Description**: Core application specification defining the four main features: text ingestion, incremental reading, flashcard creation, and spaced repetition system (SRS)
**Last Updated**: 2025-10-12

### `/Users/why/repos/trivium/UI-function.md`
**Description**: UI/UX specifications detailing the application's five main sections: Ingest, Reading, Flashcard creation, Study, and Stats. Emphasizes accessibility and keyboard/mouse navigation flexibility.
**Last Updated**: 2025-10-12

---

## Architecture & Design

### `/Users/why/repos/trivium/architecture-backend.md`
**Description**: Comprehensive backend architecture documentation covering technology stack (Rust/Tauri/SQLite), complete database schema (10+ tables), all command modules (including Wikipedia integration - Phase 6.5), models, services (FSRS-5 algorithm, Wikipedia HTML parsing, text parsing with Unicode handling), and complete project structure. Includes Phase 8 whitespace/Unicode bug investigation findings
**Last Updated**: 2025-10-16

### `/Users/why/repos/trivium/architecture-frontend.md`
**Description**: Frontend architecture specifications with React/TypeScript/Zustand stack, complete state management patterns, component hierarchies for all major features (reading, flashcards, folders, stats), Wikipedia integration implementation (Phase 6.5), Phase 14 inline editing components (InlineRegionEditor, InlineToolbar, EditableContent, MarkdownRenderer), Tauri API wrappers, keyboard shortcuts system, and text selection handling with UTF-16 character position considerations
**Last Updated**: 2025-10-17

### `/Users/why/repos/trivium/ARCHITECTURE_GAP_ANALYSIS.md`
**Description**: Detailed gap analysis between UI specifications and current implementation. Identifies critical new requirements (folder system, granular read/unread tracking, paragraph detection, resizable layouts) with database schema changes and implementation priorities across 6 phases
**Last Updated**: 2025-10-12

### `/Users/why/repos/trivium/FRONTEND_STRUCTURE.md`
**Description**: Directory structure overview for the frontend, including components (ui, reading, flashcard, editor), stores (reading, flashcard, review), utilities (tauri IPC, selection, keyboard), and types. Lists all files as placeholder implementations with complete type definitions
**Last Updated**: 2025-10-12

### `/Users/why/repos/trivium/GUI_REDESIGN_PLAN.md`
**Description**: Complete GUI redesign implementation plan transforming page-based navigation into unified application with persistent sidebar, polymorphic main area (Dashboard/Reading/Review/Ingest), hierarchical library tree with drag-and-drop, and professional visual polish. Includes 5-phase timeline (3-4 weeks), detailed mockups, and technical specifications
**Last Updated**: 2025-10-14

### `/Users/why/repos/trivium/GUI_REDESIGN_COMPLETE.md`
**Description**: Comprehensive completion report for the GUI redesign project documenting all 5 phases successfully completed (Shell & Navigation, Dashboard View, Hierarchical Library Tree, Adapted Views, Visual Polish & UX). Includes implementation statistics, build metrics, success criteria verification, known issues, migration notes, and post-launch Tailwind CSS v4 configuration fixes
**Last Updated**: 2025-10-14

---

## Project Planning & Progress

### `/Users/why/repos/trivium/PROGRESS.md`
**Description**: Comprehensive development progress tracker showing completed phases (Phase 0: Foundation, Phase 1: Core Reading, Phase 2: Flashcard Creation, Phase 3: Review System with FSRS-5, Phase 4: GUI Redesign, Phase 5/5.5: UI Touch-ups & Progress Tracking, Phase 6: Review Filtering & Settings, Phase 6.5: Wikipedia Article Parsing Integration + 11 Critical Bug Fixes, Phase 8: Polish & Unicode Bug Fixes - ALL 4 Unicode BUGS + 9 UX POLISH FIXES COMPLETE, **Phase 9: Text Search Feature** 🔍, **Phase 10: Library Search + Folder Selection in Ingest** 📚📁, **Phase 11: Sidebar UI Improvements + Validation Polish** ✨✅, **Phase 11.5: Quick Import Dashboard Tile** 🚀, **Phase 12: Flashcard Creation Hub + Post-Phase Improvements** 🎴🔧, **Phase 13: Selection-Based Inline Editing** 📝✨, **Phase 14: Truly Inline Text Editing** ✨📝, **Phase 15: Unified Undo/Redo System** ↩️↪️, **Phase 16: Mark and Read Range Deletion on Edit** 🗑️✨, **Phase 17: Global UI Update** 🧭✨, **Phase 17+: Navigation & Layout Refinements** 🎨🧭, **Phase 17++: OS-Appropriate Tooltip Improvements** 💡🖥️, **Phase 18: UI Overhaul** 🎨, **Phase 19: Settings Menu** ⚙️, **Phase 20: Statistics & Analytics** 📊, **Phase 21: Links Sidebar + Reading View Touchups** 🔗📖, **Phase 22: Typewriter/Focus Mode** 📖✨, **Phase 23: UI Polish** 🎨, **Phase 24: Card Hub Improvements** 🎴✨), current capabilities (100+ user-facing features including card hub pagination with auto-load, doubled creation limits, review limit fixes with separated filters, mark coexistence fix with ReadHighlighter merge logic, reading header intelligent collapsing, typewriter/focus mode with sentence navigation, links sidebar with intelligent deduplication, and complete keyboard support), upcoming phases, detailed bug fix documentation including all phase improvements. **Backend uses UTF-16 code units throughout to match JavaScript behavior**
**Last Updated**: 2025-10-21

### `/Users/why/repos/trivium/PHASE_9_TEXT_SEARCH.md`
**Description**: Complete implementation documentation for Phase 9 text search feature. Covers real-time in-document search with match highlighting (yellow/orange), keyboard shortcuts (Ctrl+F, Enter, Shift+Enter), next/previous navigation with wraparound, case-sensitive and whole-word options, UTF-16 awareness for emoji/CJK support, smooth scrolling to matches, debounced input (300ms), auto-select on focus, sub-segment highlighting precision, and seamless integration with existing read/unread highlighting system. Includes architecture details, 4 files created, 2 files modified, performance optimizations (50-80% fewer searches, React.memo), 4 critical bug fixes (lag, scroll, highlighting, auto-select), position space handling, and comprehensive testing checklist. Implementation time: 2 hours with parallel agents
**Last Updated**: 2025-10-16 (Updated with optimizations and bug fixes)

### `/Users/why/repos/trivium/PHASE_10_LIBRARY_SEARCH.md`
**Description**: Comprehensive implementation plan and completion documentation for Phase 10 library search and folder selection features. **Library Search**: Real-time search through article/text titles and folder names, tree filtering with debounced input (300ms), case-sensitive and whole-word options, yellow highlighting of matching text, keyboard shortcuts (Shift+Cmd/Ctrl+F), match counter, keyboard navigation (Arrow Up/Down, Enter to open), blue ring visual indicator for selected match, auto-scroll to keep selected visible. **Folder Selection in Ingest**: Optional folder picker during text import with hierarchical dropdown, scrollable max-height (300px), proper display of folder names (not UUIDs), visual indentation with arrows for nested folders. **Post-Phase 10 Improvements**: Review configuration updated to use hierarchical FolderSelect component (consistent with ingest modal), multi-level arrow indicators based on nesting depth (→, →→, →→→). Architectural decisions: frontend filtering (no backend queries), separate components (LibrarySearchBar, FolderSelect), new librarySearch store, recursive tree filtering, SQLx query cache updated for folder_id field. Files: 5 created (LibrarySearchBar, FolderSelect, librarySearch store/utils, SQLx cache), 9 modified (Sidebar, LibraryTree, FolderNode, TextNode, read route, ingest route, article types, text models/commands). Implementation time: 6-7 hours with parallel agents
**Last Updated**: 2025-10-16 (Completed with all features, bug fixes, and post-phase improvements)

### `/Users/why/repos/trivium/PHASE_11_SIDEBAR_UI.md`
**Description**: Complete implementation documentation for Phase 11 sidebar UI improvements + post-phase validation polish. **8 Major Features**: (1) Expand all/collapse all toggle button replacing dropdown with single Ctrl+Shift+E hotkey, (2) Fixed dropdown positioning globally - all dropdowns now appear directly under trigger buttons, (3) New ingest button in library header with FilePlus icon, (4) New folder keyboard shortcut (Ctrl+Shift+N), (5) Unique naming enforcement for folders (within same parent) and texts (within same folder) with case-insensitive validation, (6) Folder click to expand/collapse - entire folder row is clickable, (7) macOS Finder-style keyboard navigation with arrow keys (Up/Down navigate, Right expands, Left collapses, Enter opens), auto-scroll selected items into view, disabled during search. **5 Validation Improvements**: (1) Cross-platform hotkey support (Ctrl+Shift+N and Cmd+Shift+N), (2) Real-time duplicate validation feedback in ingest modal with red error text, (3) Real-time duplicate validation feedback in folder creation dialog, (4) Shift+Enter respects validation rules, (5) loadLibrary() call ensures validation data available. Technical details: getFlattenedVisibleNodes() helper function, new store methods, keyboard event handling, validation pattern with useMemo. Files modified: 10 components + 3 additional for validation polish. Implementation time: 8 hours (Phase 11) + 1 hour (validation polish)
**Last Updated**: 2025-10-16 (Updated with validation improvements)

### `/Users/why/repos/trivium/PHASE_12_FLASHCARD_CREATION_HUB.md`
**Description**: Complete implementation documentation for Phase 12 Flashcard Creation Hub. **Overview**: Dedicated workspace for efficiently creating flashcards from previously marked text (cloze notes) with skip/bury workflow. **Backend**: Database migration adding workflow tracking to cloze_notes (status, last_seen_at, session_count, notes columns), flashcard_hub.rs commands module with 5 commands (get_hub_marks, skip_mark, bury_mark, create_card_from_mark, get_hub_stats), context extraction (~200 chars before/after), status workflow integration. **Frontend**: Hub types (MarkWithContext, HubStats, CreatedCard), cardCreation Zustand store, 5 core components (ScopeSelector, MarkNavigation, MarkContext, CardCreator, CreatedCardsList), main /create route (17KB), dashboard tile integration, sidebar navigation with Sparkles icon. **Features**: Library/Folder/Text scope selection, skip marks (temporary - Space key), bury marks (permanent 0-card - Shift+B), mark navigation (arrows/Ctrl+K/J), Q&A card creation with live preview (Shift+Enter), session tracking with created cards list, complete keyboard support (Ctrl+4 global access), real-time statistics. **Post-Phase 12 Improvements (2025-10-16)**: 5 critical bug fixes (folder recursive detection with CTE, scopeId type mismatch, scope selection triggering, premature loadMarks, React hooks dependencies) + 1 new feature (text filtering by marks with 80% noise reduction). **Files**: 18 created (3 backend, 12 frontend, 3 docs), 16 modified total (8 original + 8 post-phase). **Performance**: Sub-second queries, < 200ms card creation, < 500ms page load, ~5ms text filtering. Implementation time: ~6 hours (initial) + ~4 hours (post-phase improvements)
**Last Updated**: 2025-10-16 (Updated with post-phase improvements section: 5 bug fixes + text filtering feature)

### `/Users/why/repos/trivium/PHASE_18_UI_OVERHAUL.md`
**Description**: Complete implementation documentation for Phase 18 comprehensive UI overhaul. **Core Changes**: (1) Icon system standardization - replaced all emoji with lucide-react icons (BookOpen, Brain, Sparkles, Zap, Activity, ArrowLeft) for visual consistency and accessibility, (2) Navigation improvements - moved back to reading button from dashboard to create cards header for better UX hierarchy, (3) Persistent flashcard sidebar state using localStorage, (4) Terminology standardization - "import" → "ingest" throughout UI, (5) Sticky page headers for better orientation during scrolling. **Attempted Feature (REVERTED)**: Alt+click link navigation to ingest page - reverted in commit 2930950 because it interfered with native text selection behavior. Documents lessons learned about not overriding browser defaults. **Files**: 15 modified (5 dashboard components, 5 page routes, 1 library component, 3 utilities/stores). **Performance**: No measurable impact, CSS-only sticky positioning, localStorage < 1ms. **Testing**: Manual cross-platform validation, all visual/UX improvements verified. Implementation time: ~4 hours
**Last Updated**: 2025-10-18

### `/Users/why/repos/trivium/PHASE_19_SETTINGS_MENU.md`
**Description**: Complete implementation documentation for Phase 19 Settings Menu (MVP Complete + Phase 4 Theme + Comprehensive Dark Mode). **Status**: Phases 1-4 fully implemented with complete dark mode coverage. **Backend**: Database migration adding settings table (key-value store), settings.rs commands module with commands for get_settings, update_setting, get_database_size, export_database, import_database, and scoped reset operations. **Frontend**: Settings page with tab-based sections (Defaults, Database, Reset, Theme), settings store with localStorage persistence, Switch component integration, human-readable file size formatting, scope selector for resets (Library/Folder/Text). **Features**: Toggle default links visibility (Ctrl+L, functionality needs verification), view database size in human-readable format, export database to backup file, **import database from backup file** (restore functionality), **scoped reset operations** (reset reading progress, reset flashcards, reset all data - all with Library/Folder/Text scope support), **complete theme system** (Light/Dark/Adaptive modes, system theme detection, auto-switching, localStorage persistence, 300ms transitions, comprehensive dark mode styling across 22 components), keyboard shortcut Ctrl+6 / Cmd+6 for settings navigation. **Dark Mode Coverage**: All modals/dialogs (6 files), flashcard sidebar, marked text highlighting with improved contrast (gray-700/gray-100), context menus, created cards list, plus original 13 components. **Critical CSS Bugs Fixed**: (1) Incorrect `@variant` syntax - changed from `@variant dark (.dark &);` to `@variant dark (&:where(.dark, .dark *));`, (2) CSS variable cascade order - reordered `:root` before `.dark` in index.css, (3) Missing dark mode utilities - added `bg-background`, `text-foreground`, `border-border` throughout app. **Post-Phase Bug Fixes**: UI refresh after reset operations (cache clearing race condition fix). **Files**: 17 created (1 migration, 1 backend module, 3 SQLx queries, 8 frontend components, 3 types/utils, 2 docs), 30 modified (8 original + 13 initial dark mode + 9 comprehensive dark mode). **Performance**: Sub-100ms settings queries, instant localStorage sync, smooth theme transitions. Implementation time: ~8 hours
**Last Updated**: 2025-10-19

### `/Users/why/repos/trivium/PHASE_20_STATISTICS.md`
**Description**: Complete implementation documentation for Phase 20 Statistics & Analytics System with known issues and migration fixes. **Overview**: Comprehensive statistics dashboard modeled after Anki, providing review analytics, reading progress, and study time tracking. **Backend**: 3 database migrations (activate reading_sessions with views, review stats indexes with hourly/daily/forecast views, session tracking with review_sessions table), plus schema fix migration (20251019140000_fix_reading_sessions_id_type.sql) addressing migration schema inconsistencies, statistics.rs commands module with 5 commands (get_review_statistics, get_7day_forecast, get_daily_review_breakdown, get_hourly_distribution, get_reading_stats_by_folder), session_id tracking added to review_history and read_ranges. **Frontend**: Statistics page at /stats with Ctrl/Cmd+7 shortcut, 3 tabs (Overview, Review Performance, Reading Progress), stats store with date range filtering, HTML/CSS visualizations (recharts optional), review timing instrumentation (duration tracking from answer reveal to grade), reading session lifecycle management (start on mount, end on unmount/5min inactivity). **Features**: 7-day review forecast showing new/learning/review cards, daily review breakdown with answer button distribution, hourly performance distribution heatmap, reading progress by folder with character/word counts, study time tracking, current streak calculation. **Known Issues**: Reading statistics chart not displaying data (sessions not being created during actual reading operations - investigation ongoing with debugging infrastructure from commit f352d42), stat timeframe selection needs verification. **Working Features**: All review statistics, 7-day forecast, daily breakdown, hourly distribution, and statistics page infrastructure confirmed working. **Documentation**: READING_SESSION_TRACKING_IMPLEMENTATION.md and TESTING_SESSION_TRACKING.md created for troubleshooting. **Architecture**: Existing tables leveraged (review_history, flashcards, read_ranges), new review_sessions table for aggregation, database views for efficient queries, sub-50ms query performance. **Files**: 4 migrations (3 original + 1 schema fix), 1 backend commands module (14 SQLx queries), 7 frontend components (3 tabs, 4 charts), 2 stores (stats + review timing), 1 types file. Implementation time: ~6 hours
**Last Updated**: 2025-10-19

### `/Users/why/repos/trivium/SETTINGS_QUICK_REFERENCE.md`
**Description**: Quick reference guide for Settings Menu providing condensed overview for developers. Includes settings structure (key-value pairs), available settings list (show_links_by_default), keyboard shortcuts (Ctrl+6 navigation, Ctrl+L toggle), backend commands reference, frontend components overview, and common usage patterns. Designed as companion to full Phase 19 documentation for rapid lookups during development
**Last Updated**: 2025-10-18

### `/Users/why/repos/trivium/ROADMAP.md`
**Description**: Detailed 9-10 week implementation roadmap breaking down all 7 phases with task breakdowns, time estimates, dependencies, risk assessment, and success metrics. Includes critical path, alternative approaches (MVP in 4 weeks vs feature-rich in 12 weeks), and technical milestones
**Last Updated**: 2025-10-12

### `/Users/why/repos/trivium/PHASE_3_IMPLEMENTATION_PLAN.md`
**Description**: Extensive Phase 3 implementation plan (2000+ lines) for the Review System with FSRS-5 algorithm. Includes manual FSRS implementation to avoid dependency conflicts, complete backend commands (get_due_cards, grade_card), frontend UI components with keyboard shortcuts, testing strategy, and deployment checklist
**Last Updated**: 2025-10-14

---

## Setup & Configuration

### `/Users/why/repos/trivium/PROJECT_SETUP_COMPLETE.md`
**Description**: Project initialization summary documenting complete structure setup including frontend (React 18 + TypeScript + Vite + Zustand + Lexical + shadcn/ui + Tailwind CSS v4) and backend (Rust/Tauri/SQLite/SQLx), database schema with FSRS state fields, and development workflow
**Last Updated**: 2025-10-12

### `/Users/why/repos/trivium/DATABASE_SETUP.md`
**Description**: SQLx and SQLite configuration documentation covering migration file creation, Database module implementation, app initialization via Tauri setup hook, .env configuration, compile-time verification setup, and database file locations per platform
**Last Updated**: 2025-10-12

### `/Users/why/repos/trivium/SQLX_MIGRATION_GUIDE.md`
**Description**: Comprehensive SQLx migration best practices guide preventing compilation errors and migration panics. Documents the golden rule (never modify applied migrations), proper schema change workflow, type mismatch solutions, datetime comparison fixes, recovery procedures for modified migrations, dev vs production database strategies, and real-world example from Trivium's migration checksum panic fix. Includes step-by-step checklist and quick reference commands
**Last Updated**: 2025-10-15

### `/Users/why/repos/trivium/FRONTEND_SETUP.md`
**Description**: Frontend dependencies installation documentation detailing Zustand (5.0), Lexical (0.37), shadcn/ui with Tailwind CSS v4, configuration files (components.json, tsconfig.json, vite.config.ts, index.css), CSS-based theme configuration using @theme directive, and path aliases setup
**Last Updated**: 2025-10-12

### Database Migrations

#### `/Users/why/repos/trivium/src-tauri/migrations/20251017000000_add_cloze_notes_positions.sql`
**Description**: Database migration adding start_pos and end_pos columns to cloze_notes table for UTF-16 position tracking. Enables inline text editing with mark preservation by storing exact character positions of highlighted text
**Last Updated**: 2025-10-17

---

## Feature-Specific Documentation

### Flashcard System

#### `/Users/why/repos/trivium/FLASHCARD_CREATION_HUB_DESIGN.md`
**Description**: Complete design specification for the Flashcard Creation Hub feature (Phase 12). Covers UI/UX design with detailed mockups, component architecture (ScopeSelector, MarkNavigation, MarkContext, CardCreator, CreatedCardsList), keyboard shortcuts system (Ctrl+4, arrows, Space, Shift+B, Shift+Enter), state management patterns, backend integration requirements, accessibility considerations, performance targets, and success metrics. Includes visual hierarchy diagrams, interaction flows, design system compliance (Inter/Charter fonts, Tailwind v4, shadcn/ui), and comprehensive implementation checklist across 5 phases (Core Infrastructure, UI Components, Integration, Polish, Testing). Serves as primary design contract for the feature
**Last Updated**: 2025-10-16

#### `/Users/why/repos/trivium/FLASHCARD_HUB_QUICK_REFERENCE.md`
**Description**: Quick reference guide for Flashcard Creation Hub providing condensed overview for rapid lookups. Includes at-a-glance keyboard shortcuts table, visual layout comparisons, component architecture diagram with data flow, common workflows and usage patterns, file structure reference, and testing checklist. Designed as companion to the full design specification for developers needing quick answers during implementation
**Last Updated**: 2025-10-16

#### `/Users/why/repos/trivium/FLASHCARD_HUB_VISUAL_STATES.md`
**Description**: Visual mockups document for Flashcard Creation Hub containing 14 high-fidelity ASCII mockups illustrating all major UI states. Covers initial state, loading states, success states, error states, empty states, mark navigation states (skip/bury/create), edit mode, completion state, and mobile adaptation. Each mockup includes color references for light/dark modes and annotations explaining interaction patterns. Provides visual design contract complementing the text-based design specification
**Last Updated**: 2025-10-16

#### `/Users/why/repos/trivium/CARD_ENUMERATION_DESIGN.md`
**Description**: Comprehensive 933-line design document analyzing the card enumeration problem (duplicate card numbers across sessions) and recommending solution: auto-incrementing display_index column. Includes problem illustrations with scenarios, 4 design options analysis, detailed implementation plan across 7 phases with SQL migrations, Rust models, TypeScript updates, edge case handling, and performance considerations
**Last Updated**: 2025-10-13

#### `/Users/why/repos/trivium/CARD_ENUMERATION_CHECKLIST.md`
**Description**: Quick reference implementation checklist for display_index feature covering 7 phases: database migration, Rust backend models/commands, TypeScript types/components, testing (unit/integration/manual/UI), documentation, pre-release checks, and deployment with rollback plan. Includes success criteria and estimated 4.5-hour timeline
**Last Updated**: 2025-10-13

#### `/Users/why/repos/trivium/CARD_ENUMERATION_EXAMPLES.md`
**Description**: Visual examples illustrating card enumeration problem and solution through concrete scenarios showing how current system creates duplicate card numbers ("Card #1" appearing multiple times) and how display_index solves it with sequential unique numbers. Includes deletion handling, multi-text scenarios, and edge cases
**Last Updated**: 2025-10-13

### Inline Text Editing (Phase 13)

#### `/Users/why/repos/trivium/CONTENTEDITABLE_RESEARCH.md`
**Description**: Research and implementation documentation for Phase 13-14 inline editing features. Covers contenteditable approach exploration, position space challenges, multiple architectural iterations (overlay system vs conditional rendering), selection-based editing design (Phase 13), and truly inline editing with dual markdown modes (Phase 14). Includes Phase 14 implementation summary with final architecture, technical solutions, lessons learned, and performance metrics
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/layout-guide.md`
**Description**: Layout architecture guide documenting the reading view structure, component hierarchy, and position space conversions for inline editing. Details the conditional rendering approach with ReadHighlighter and InlineRegionEditor components (Phase 14), state management patterns, mark preservation strategy, smart boundary detection, context dimming, and dual markdown modes. Updated with Phase 14 implementation status
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/src/lib/utils/utf16.ts`
**Description**: UTF-16 position tracking utilities for contenteditable. Handles emoji and surrogate pairs correctly. Functions: isHighSurrogate, isLowSurrogate, getCharacterLength, adjustPositionToBoundary, getNextBoundary, getPreviousBoundary, countCodeUnits. Essential for accurate position tracking with multi-byte characters
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/src/lib/utils/domPosition.ts`
**Description**: DOM selection to UTF-16 position conversion utilities. Functions: getAbsolutePosition, getSelectionRange, setSelectionRange, findNodeAtPosition, getTextContent. Converts between DOM tree positions and linear UTF-16 character offsets for inline editing
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/src/lib/utils/markPositions.ts`
**Description**: Mark position adjustment utilities for inline editing. Handles mark position updates when text content changes, including position shifts and mark flagging for review. Integrates with UTF-16 position tracking system
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/src/lib/utils/sentenceBoundary.ts`
**Description**: Sentence boundary detection utilities for text editing and context extraction. Functions for finding sentence starts/ends, detecting punctuation, and extracting complete sentences around selections. Used for mark context display and smart editing
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/src/lib/utils/platform.ts`
**Description**: Platform detection utilities for cross-platform keyboard shortcut support. Functions: isMac, getModifierKey, getModifierSymbol, getAltKey, getAltSymbol, formatShortcut, formatShortcutSymbol. Enables dynamic tooltip generation showing Cmd on macOS and Ctrl on Windows/Linux
**Last Updated**: 2025-10-18

#### `/Users/why/repos/trivium/src/lib/components/reading/InlineEditor.tsx`
**Description**: ContentEditable-based inline text editor component for selection-based editing. Activated via Ctrl+E or Edit button. Features: plain text editing, paste sanitization, auto-focus, visual state transitions, save/cancel operations. Uses conditional rendering with ReadHighlighter
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/src/lib/components/reading/SelectionEditor.tsx`
**Description**: Selection-based editor component for inline text editing. Manages editing mode state, selection range tracking, and text content updates. Coordinates with InlineEditor for user interactions
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/src/lib/components/reading/SelectionToolbar.tsx`
**Description**: Toolbar component for inline editing actions. Displays edit controls near text selection with buttons for saving, canceling, and managing edited content. Positioned dynamically relative to user selection
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/src/lib/components/reading/TextEditor.tsx`
**Description**: Text editor component providing basic editing functionality. Handles text input, change events, and content synchronization. Part of the inline editing system infrastructure
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/src/lib/components/reading/HighlightOverlay.tsx`
**Description**: Transparent overlay system for displaying highlights without interfering with contenteditable. Segments text and renders mark tags with z-index layering. Created during development but not used in final conditional rendering approach
**Last Updated**: 2025-10-17

---

### Truly Inline Text Editing (Phase 14)

#### `/Users/why/repos/trivium/PHASE_14_INLINE_EDITING.md`
**Description**: Complete implementation documentation for Phase 14 truly inline text editing. Comprehensive guide covering smart boundary detection (sentence/paragraph), context dimming (40% opacity), dual markdown modes (styled/literal), inline toolbar, mark position preservation, marker-based cursor tracking, and complete component architecture. Includes 26 passing automated tests, performance benchmarks, keyboard shortcuts, integration guide, and migration notes. Features the dual-document model for position mapping between source markdown and rendered view.
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/INLINE_EDITING_DESIGN.md`
**Description**: UX/UI design specification for inline text editing system (created by ui-design-architect agent)
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/INLINE_EDITING_VISUALS.md`
**Description**: ASCII mockups and visual reference for all inline editing states
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/STYLED_MODE_IMPLEMENTATION.md`
**Description**: Technical documentation for styled mode markdown rendering system
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/INLINE_EDITING_USAGE.md`
**Description**: Usage guide and integration instructions for inline editing components
**Last Updated**: 2025-10-17

---

### Undo/Redo System (Phase 15)

#### `/Users/why/repos/trivium/UNDO_RESEARCH_SUMMARY.md`
**Description**: Executive summary of undo/redo research covering key findings from codebase analysis, proposed unified history stack architecture, implementation plan overview with 7 phases, key files identified (1 created, 2 modified), edge cases and solutions (10 identified), testing strategy, success criteria, and recommendations for implementation
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/UNDO_IMPLEMENTATION_QUICKSTART.md`
**Description**: Step-by-step implementation guide for undo/redo system with prerequisites checklist, phase-by-phase instructions with complete copy-paste ready code snippets, testing steps after each phase, troubleshooting guide, success checklist, time estimates, and next steps. Practical guide for developers implementing the feature
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/UNDO_STACK_ARCHITECTURE.md`
**Description**: Visual guide for undo/redo system architecture including system diagrams, action types hierarchy, state machine visualizations, complete examples (text edit with mark tracking, mark operation sequences), sequence diagrams (undo flow, edit recording), data flow diagrams, edge case handling matrix, performance considerations, testing checklist, and quick reference commands
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/UNDO_STACK_IMPLEMENTATION_PLAN.md`
**Description**: Comprehensive implementation plan for unified undo/redo system (800+ lines). Covers current state analysis, proposed architecture, complete TypeScript interfaces for data structures, exact integration points with code locations, 7 implementation phases with detailed tasks, 10 edge cases and solutions, testing strategy with scenarios, success metrics, questions for clarification, file structure, and complete implementation checklist. Main reference document for implementation
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/src/lib/stores/readingHistory.ts`
**Description**: Unified history store for reading view undo/redo functionality. Manages chronological stack of actions (text edits, mark operations, unmark operations) with 50-action limit, per-text history tracking, backend-synced operations, position-safe mark tracking, and page isolation. Implements undo/redo with Ctrl+Z/Ctrl+Shift+Z keyboard shortcuts
**Last Updated**: 2025-10-17

---

### Mark and Read Range Deletion (Phase 16)

#### `/Users/why/repos/trivium/PHASE_16_MARK_DELETION_ON_EDIT.md`
**Description**: Complete implementation documentation for Phase 16 mark and read range deletion on edit with flashcard preservation. Covers automatic cleanup of marks/read ranges when text is edited, warning dialog before deletion, database migration (ON DELETE SET NULL for flashcards), overlap detection algorithm, coordinate space conversion fixes, and complete undo/redo support. Includes 31 passing unit tests, architectural decisions, performance metrics, known limitations, and future enhancements. Solves critical data integrity issue where marks persisted after referenced text was modified
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/src/lib/utils/markOverlap.ts`
**Description**: Overlap detection utilities for marks and read ranges during text editing. Functions: detectMarkOverlap, detectReadRangeOverlap. Uses exclusive boundary algorithm (O(n) complexity) to identify which marks/ranges overlap an edit region and should be deleted. Returns overlapping items, safe items, and IDs to delete
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/src/lib/utils/__tests__/markOverlap.test.ts`
**Description**: Comprehensive unit test suite for overlap detection utilities. 31 tests covering: no overlap cases, full containment, partial overlap, exact boundaries, edge cases (empty lists, zero-width regions), and multiple mark scenarios. 100% passing test rate
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/src/lib/components/reading/MarkDeletionWarning.tsx`
**Description**: User confirmation dialog component displayed before deleting marks and read ranges during text edits. Shows count and list of affected items, clear messaging about flashcard preservation, accessible keyboard navigation (Enter/Escape), and cancel/confirm actions
**Last Updated**: 2025-10-17

#### `/Users/why/repos/trivium/src-tauri/migrations/20251017215100_preserve_flashcards_on_mark_delete.sql`
**Description**: Database migration changing flashcards.cloze_note_id foreign key constraint from ON DELETE CASCADE to ON DELETE SET NULL. Preserves flashcards when source marks are deleted, preventing loss of user study progress while maintaining data integrity
**Last Updated**: 2025-10-17

---

### Links Sidebar (Phase 21)

#### `/Users/why/repos/trivium/LINKS_SIDEBAR_DESIGN.md`
**Description**: Complete design specification for Links Sidebar feature. Covers intelligent Wikipedia link deduplication, dual-mode sidebar (Cards/Links), unified design system integration, component architecture with TypeScript interfaces, state management patterns, user interaction flows, accessibility requirements (WCAG compliant), performance benchmarks, 3-phase implementation plan, and comprehensive testing strategy. 23,000+ word specification serving as primary design contract
**Last Updated**: 2025-10-20

#### `/Users/why/repos/trivium/LINKS_SIDEBAR_SUMMARY.md`
**Description**: Executive summary for Links Sidebar feature providing condensed overview for rapid understanding. Covers problem statement, solution overview, key features (intelligent deduplication, Wikipedia filtering), visual mockups, technical architecture, user flows, implementation phases with time estimates, risk assessment, and success metrics. Designed as companion to full specification for stakeholders and developers
**Last Updated**: 2025-10-20

---

## User Reference

### `/Users/why/repos/trivium/KEYBOARD_SHORTCUTS.md`
**Description**: Comprehensive keyboard shortcuts reference organized by feature area (Global Navigation, Reading View, Review Session, Create Cards, Ingest, Library Navigation, Modal Dialogs). Documents all 60+ keyboard shortcuts with Windows/Linux and macOS variants, conflict resolution notes (Ctrl+1-4 vs Alt+1-3), platform consistency guidelines, accessibility features, and troubleshooting tips. Includes version history tracking shortcut changes
**Last Updated**: 2025-10-19

---

## Design System

### `/Users/why/repos/trivium/src/lib/design-system.md`
**Description**: Complete design system specification for Trivium covering typography (Inter/Charter fonts), color system with WCAG AA compliance, spacing/layout guidelines, shadow system, animation principles with reduced motion support, component guidelines, accessibility standards, and responsive design breakpoints
**Last Updated**: 2025-10-14

---

## Debugging & Troubleshooting

### `/Users/why/repos/trivium/DEBUG_GUIDE.md`
**Description**: Debug logging guide for read highlighting issue with comprehensive console log analysis workflow. Documents added logging in ReadHighlighter component, reading store, and ReadPage component to diagnose data flow, segment computation, and CSS styling issues. Includes step-by-step browser DevTools usage
**Last Updated**: 2025-10-13

### `/Users/why/repos/trivium/DEBUGGING_SUMMARY.md`
**Description**: Summary of debugging changes for read highlighting styling issue. Lists modifications to ReadHighlighter (logs, inline styles, data attributes), reading store (markRangeAsRead/getReadRanges logging), and ReadPage (state change logging). Explains what will be discovered: data flow issues, logic issues, and styling issues
**Last Updated**: 2025-10-13

### `/Users/why/repos/trivium/BROWSER_CHECKLIST.md`
**Description**: Step-by-step browser debugging checklist for testing read highlighting feature. Provides decision tree for diagnosing issues (data loading, range computation, segment rendering, CSS application) with common issues, fixes, and cleanup instructions after debugging complete
**Last Updated**: 2025-10-13

### `/Users/why/repos/trivium/TRIPLE_CLICK_AND_CLOZE_DEBUGGING.md`
**Description**: Comprehensive debugging documentation for triple-click paragraph selection and mark-as-read position calculation bugs. **Status: REVERTED** - Experimental refactor broke rendering. Fixed DOM position calculation using start + totalTextLength approach. Documents synthetic newline discovery, element offset semantics, sibling-walking logic, and boundary mismatch between DOM (rendered) and cleanedContent (markdown) position spaces. Core issue remains: visual highlight boundaries don't match exact selections due to position space conversion
**Last Updated**: 2025-10-18

### `/Users/why/repos/trivium/MARK_AS_READ_DEBUGGING_LESSONS_LEARNED.md`
**Description**: Lessons learned from mark-as-read debugging efforts. Documents failed approaches (dual paragraph arrays, triple-click handler), successful fixes (duplicate ranges fix in TextSelectionMenu, cloze notes backend positions, black background CSS, DOM position calculation improvements), and root causes (position space mismatch between DOM textContent and cleanedContent markdown). Includes revert strategy and minimal fix recommendations. Current status: reverted to clean state with important fixes preserved
**Last Updated**: 2025-10-18

---

## Unicode & Text Processing

### `/Users/why/repos/trivium/docs/unicode-bug-fixes.md`
**Description**: Critical Unicode character handling bug analysis documenting 4 major bugs in the reading progress system. **Status: ALL 4 BUGS FIXED in Phase 8!** 🎉 (excluded character counting, header character counting, paragraph detection, and UTF-16/Unicode mismatch all fixed using `.encode_utf16().count()` throughout backend). Backend now uses UTF-16 code units to match JavaScript `.length` behavior. Includes detailed fix implementations, code examples, comprehensive test suite (11 new tests), severity assessments, and migration notes
**Last Updated**: 2025-10-16 (Updated with Bug 4 fix completion)

### `/Users/why/repos/trivium/docs/unicode-bug-examples.md`
**Description**: Visual demonstrations and concrete examples illustrating the Unicode bugs through test cases with emoji, Chinese/Japanese text, and multi-byte characters. Shows byte vs character counting differences, progress calculation errors, paragraph boundary issues, and UTF-16/Unicode position mismatches with real-world impact scenarios and validation test cases
**Last Updated**: 2025-10-16

### `/Users/why/repos/trivium/docs/whitespace-handling-analysis.md`
**Description**: Comprehensive technical analysis of whitespace handling in reading progress calculations, documenting how spaces, newlines, tabs, and other non-visible characters are counted throughout the system. Analyzes consistency across content length storage, read range measurement, progress calculation, and frontend display. **Confirmed: Whitespace IS counted consistently throughout the system**
**Last Updated**: 2025-10-16

### `/Users/why/repos/trivium/docs/whitespace-investigation-summary.md`
**Description**: Executive summary of whitespace handling investigation confirming that ALL whitespace characters ARE counted in reading progress. **Documents successful fix of ALL 4 critical Unicode bugs in Phase 8** 🎉, provides impact assessment, recommendations, and completion status. Backend now uses UTF-16 code units throughout to match JavaScript behavior. Includes comprehensive fix status and migration notes
**Last Updated**: 2025-10-16 (Updated with Bug 4 completion)

---

## Statistics

**Total Documentation Files**: 60 markdown files
**Total Lines of Documentation**: ~53,800+ lines
**Documentation Categories**:
- Core Specification: 3 files
- Architecture & Design: 6 files
- Project Planning: 11 files (includes Phase 9 text search + Phase 10 library search + Phase 11 sidebar UI + Phase 11.5 quick import + Phase 12 flashcard hub + Phase 18 UI overhaul + Phase 19 settings menu + Phase 20 statistics + settings quick reference)
- Setup & Configuration: 5 files (includes SQLx guide + database migration)
- Feature-Specific: 30 files (includes 4 flashcard hub docs + 11 Phase 13 inline editing files + 5 Phase 14 inline editing docs + 4 Phase 15 undo/redo docs + 5 Phase 16 mark deletion docs + 2 Phase 21 links sidebar docs + 1 history store implementation)
- User Reference: 1 file
- Design System: 1 file
- Debugging: 4 files (includes triple-click debugging)
- Unicode & Text Processing: 4 files

---

## Documentation Maintenance Guidelines

### When Creating New Documentation
1. Add entry to this index with absolute path
2. Provide clear 1-2 sentence description
3. Include creation date
4. Categorize appropriately

### When Modifying Documentation
1. Update "Last Updated" date in this index
2. Update description if major content changes
3. Keep descriptions concise but informative

### When Deleting Documentation
1. Remove entry from this index
2. Document reason in git commit message
3. Update any cross-references in other docs

### Best Practices
- Use absolute paths for all file references
- Keep descriptions under 2-3 sentences
- Update this index in the same commit as doc changes
- Review this index monthly for accuracy
- Link related documents using absolute paths

---

**Index Maintained By**: AI Agents and Contributors
**Index Version**: 1.1
**Next Review**: 2025-11-15
