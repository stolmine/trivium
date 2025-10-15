# Documentation Index

> **Note to AI Agents**: This index must be kept up to date. Whenever you create, modify, or delete .md files in this repository, please update this index accordingly. Include the file path, a brief description, and the last edit date.

Last Updated: 2025-10-15 (Phase 6 Complete + Critical Bug Fixes + SQLx Migration Repair)

---

## Core Specification Documents

### `/Users/why/repos/trivium/README.md`
**Description**: Project readme (currently minimal placeholder)
**Last Updated**: 2025-10-12

### `/Users/why/repos/trivium/core.md`
**Description**: Core application specification defining the four main features: text ingestion, incremental reading, flashcard creation, and spaced repetition system (SRS)
**Last Updated**: 2025-10-12

### `/Users/why/repos/trivium/UI-function.md`
**Description**: UI/UX specifications detailing the application's five main sections: Ingest, Reading, Flashcard creation, Study, and Stats. Emphasizes accessibility and keyboard/mouse navigation flexibility.
**Last Updated**: 2025-10-12

---

## Architecture & Design

### `/Users/why/repos/trivium/architecture-backend.md`
**Description**: Comprehensive backend architecture documentation covering technology stack (Rust/Tauri/SQLite), complete database schema (10+ tables), all command modules, models, services, and FSRS algorithm integration details
**Last Updated**: 2025-10-12

### `/Users/why/repos/trivium/architecture-frontend.md`
**Description**: Frontend architecture specifications with React/TypeScript/Zustand stack, complete state management patterns, component hierarchies for all major features (reading, flashcards, folders, stats), and keyboard shortcuts system
**Last Updated**: 2025-10-12

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
**Description**: Comprehensive development progress tracker showing completed phases (Phase 0: Foundation, Phase 1: Core Reading, Phase 2: Flashcard Creation, Phase 3: Review System with FSRS-5, Phase 4: GUI Redesign, Phase 5/5.5: UI Touch-ups & Progress Tracking, Phase 6: Review Filtering & Settings + Critical Bug Fixes), current capabilities, upcoming phases, detailed bug fix documentation (6 major issues resolved), testing status, and next actions
**Last Updated**: 2025-10-15

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

---

## Feature-Specific Documentation

### Flashcard System

#### `/Users/why/repos/trivium/CARD_ENUMERATION_DESIGN.md`
**Description**: Comprehensive 933-line design document analyzing the card enumeration problem (duplicate card numbers across sessions) and recommending solution: auto-incrementing display_index column. Includes problem illustrations with scenarios, 4 design options analysis, detailed implementation plan across 7 phases with SQL migrations, Rust models, TypeScript updates, edge case handling, and performance considerations
**Last Updated**: 2025-10-13

#### `/Users/why/repos/trivium/CARD_ENUMERATION_CHECKLIST.md`
**Description**: Quick reference implementation checklist for display_index feature covering 7 phases: database migration, Rust backend models/commands, TypeScript types/components, testing (unit/integration/manual/UI), documentation, pre-release checks, and deployment with rollback plan. Includes success criteria and estimated 4.5-hour timeline
**Last Updated**: 2025-10-13

#### `/Users/why/repos/trivium/CARD_ENUMERATION_EXAMPLES.md`
**Description**: Visual examples illustrating card enumeration problem and solution through concrete scenarios showing how current system creates duplicate card numbers ("Card #1" appearing multiple times) and how display_index solves it with sequential unique numbers. Includes deletion handling, multi-text scenarios, and edge cases
**Last Updated**: 2025-10-13

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

---

## Statistics

**Total Documentation Files**: 24 markdown files
**Total Lines of Documentation**: ~18,000+ lines
**Documentation Categories**:
- Core Specification: 3 files
- Architecture & Design: 6 files
- Project Planning: 3 files
- Setup & Configuration: 4 files (includes SQLx guide)
- Feature-Specific: 3 files
- Design System: 1 file
- Debugging: 3 files

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
