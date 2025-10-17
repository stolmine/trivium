# Trivium

A powerful reading and spaced repetition application designed for deep learning and knowledge retention.

## Features

### Reading & Organization
- **Hierarchical Library**: Organize texts in nested folders with drag-and-drop support
- **Granular Progress Tracking**: Mark arbitrary text selections as read with visual highlighting
- **Smart Search**: Real-time search across library and within documents
- **Wikipedia Integration**: Auto-fetch and parse Wikipedia articles
- **Truly Inline Text Editing**: Edit text directly in the reading view with smart boundary detection, dual markdown modes (styled/literal), and automatic mark position preservation

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

## Recent Developments (Phase 14)

The latest update brings truly inline text editing capabilities:

- **Smart Boundary Detection**: Automatically expands to sentence or paragraph boundaries
- **Dual Markdown Modes**: Switch between styled rendering and raw markdown syntax
- **Context Preservation**: Dimmed before/after context for focused editing
- **Mark Position Updates**: Automatic repositioning of highlights when text changes
- **Cursor Tracking**: Marker-based system preserves cursor position through mode switches
- **UTF-16 Position Tracking**: Accurate handling of emoji, CJK, and all Unicode characters

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