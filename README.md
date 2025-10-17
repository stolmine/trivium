# Trivium

A powerful reading and spaced repetition application designed for deep learning and knowledge retention.

## Features

### Reading & Organization
- **Hierarchical Library**: Organize texts in nested folders with drag-and-drop support
- **Granular Progress Tracking**: Mark arbitrary text selections as read with visual highlighting
- **Smart Search**: Real-time search across library and within documents
- **Wikipedia Integration**: Auto-fetch and parse Wikipedia articles
- **Truly Inline Text Editing**: Edit text directly in the reading view with smart boundary detection, dual markdown modes (styled/literal), and automatic mark position preservation
- **Unified Undo/Redo**: Undo text edits and mark operations with Ctrl+Z, redo with Ctrl+Shift+Z

### Flashcard Creation & Study
- **Cloze Deletion Cards**: Create flashcards with multiple cloze deletions
- **Q&A Cards**: Question-and-answer format with context display
- **Flashcard Creation Hub**: Dedicated workspace for batch processing marked text
- **FSRS-5 Algorithm**: Advanced spaced repetition scheduling
- **Flexible Review Sessions**: Filter by folder, text, or global scope

### Statistics & Analytics
- **Progress Tracking**: Reading progress by folder and text
- **Performance Metrics**: Card retention, review counts, and learning trends
- **Session Statistics**: Track study sessions and daily limits

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite + Zustand + Tailwind CSS v4
- **Backend**: Rust + Tauri 2.0 + SQLite + SQLx
- **Rich Text**: Unified/Remark for markdown processing
- **Testing**: Vitest for automated testing

## Recent Developments (Phase 15)

The latest update brings unified undo/redo capabilities to the reading view:

- **Unified History Stack**: Single undo/redo system for text edits, mark operations, and unmark operations
- **Page Isolation**: Undo/redo only active on reading page, preventing unintended actions
- **Per-Text History**: Separate history for each text with 50-action limit
- **Backend-Synced**: All operations synchronized with backend for data consistency
- **Keyboard Shortcuts**: Ctrl+Z to undo, Ctrl+Shift+Z to redo
- **Position-Safe**: Automatic mark position tracking when undoing text edits

### Previous Update (Phase 14)

Truly inline text editing capabilities:
- Smart boundary detection (sentence/paragraph)
- Dual markdown modes (styled/literal)
- Context preservation with dimming
- Automatic mark position updates
- Cursor tracking through transformations
- UTF-16 position tracking for all Unicode

## Current Status

All core features implemented and stable. See `PROGRESS.md` for detailed development history.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run tauri dev

# Build production app
npm run tauri build
```

## Documentation

- `PROGRESS.md` - Development progress and feature history
- `documentation_index.md` - Complete documentation index
- `PHASE_14_INLINE_EDITING.md` - Comprehensive inline editing guide
- `architecture-frontend.md` - Frontend architecture
- `architecture-backend.md` - Backend architecture