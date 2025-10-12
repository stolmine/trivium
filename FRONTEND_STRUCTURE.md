# Trivium Frontend Structure

## Overview

The frontend has been organized following a clean architecture pattern with clear separation of concerns.

## Directory Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components (placeholder for now)
│   │   ├── reading/         # Reading interface components
│   │   │   ├── ArticleViewer.tsx
│   │   │   ├── ReadingProgress.tsx
│   │   │   └── index.ts
│   │   ├── flashcard/       # Flashcard components
│   │   │   ├── FlashcardDisplay.tsx
│   │   │   ├── ReviewButtons.tsx
│   │   │   └── index.ts
│   │   └── editor/          # Cloze editor components
│   │       ├── ClozeEditor.tsx
│   │       └── index.ts
│   ├── stores/              # State management
│   │   ├── reading.ts
│   │   ├── flashcard.ts
│   │   ├── review.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── tauri.ts         # IPC wrappers for Tauri backend
│   │   ├── selection.ts     # Text selection utilities
│   │   ├── keyboard.ts      # Keyboard shortcuts manager
│   │   └── index.ts
│   ├── types/               # TypeScript types
│   │   ├── article.ts       # Article and reading position types
│   │   ├── flashcard.ts     # Flashcard and review types
│   │   ├── progress.ts      # Statistics and progress types
│   │   └── index.ts
│   └── index.ts
├── routes/                  # Pages/views
│   ├── read/
│   │   └── index.tsx        # Reading interface page
│   ├── review/
│   │   └── index.tsx        # Spaced repetition review page
│   └── library/
│       └── index.tsx        # Article library/management page
└── main.tsx (existing)
```

## File Descriptions

### Types (`lib/types/`)

#### article.ts
- **Article**: Complete article with content and metadata
- **ArticleMetadata**: Article metadata without full content
- **ReadingPosition**: Track user's current reading position

#### flashcard.ts
- **Flashcard**: Complete flashcard with SM-2 spaced repetition data
- **ClozeData**: Data structure for cloze deletion
- **ReviewResult**: Result of a single review session
- **ReviewQuality**: Quality rating (0-5) for SM-2 algorithm

#### progress.ts
- **DailyProgress**: Daily reading and review statistics
- **ReadingStats**: Aggregate reading statistics
- **ReviewStats**: Aggregate review statistics
- **UserProgress**: Complete user progress data

### Utils (`lib/utils/`)

#### tauri.ts
Wrappers for Tauri IPC commands:
- Article management (load, save, delete, list)
- Flashcard operations (create, get for review)
- Review submission
- Reading position tracking

#### selection.ts
Text selection utilities:
- `getTextSelection()`: Get current text selection with offset info
- `getContextAroundSelection()`: Extract context around selected text
- `clearSelection()`: Clear current selection

#### keyboard.ts
Keyboard shortcut manager:
- `KeyboardManager`: Class for managing global keyboard shortcuts
- Registration/unregistration of shortcuts
- Event handling with modifier key support

### Stores (`lib/stores/`)

State management for three main features:

#### reading.ts
- Current article state
- Reading position tracking
- Loading/error states

#### flashcard.ts
- Flashcard creation state
- Current cloze data
- Creation flow management

#### review.ts
- Review queue management
- Current flashcard display
- Session statistics
- SM-2 algorithm integration

### Components (`lib/components/`)

#### reading/
- **ArticleViewer**: Main article reading component with selection support
- **ReadingProgress**: Progress indicator with stats

#### flashcard/
- **FlashcardDisplay**: Display flashcard with cloze deletion
- **ReviewButtons**: Quality rating buttons (0-5) for SM-2

#### editor/
- **ClozeEditor**: Interface for creating/editing cloze deletions

#### ui/
Placeholder for shadcn/ui components to be added

### Routes (`routes/`)

#### read/
Reading interface page - article display with cloze creation

#### review/
Spaced repetition review session page

#### library/
Article library/management page

## Implementation Status

All files are currently **placeholder implementations** with:
- Complete TypeScript type definitions
- Function signatures and interfaces
- Descriptive comments explaining intended functionality
- Export/import structure for clean module usage

## Next Steps

1. Install shadcn/ui and add base UI components
2. Implement state management (consider Zustand or Jotai)
3. Implement component functionality one module at a time
4. Connect frontend to Tauri backend IPC
5. Add routing (React Router or similar)
6. Implement keyboard shortcuts
7. Add tests for utilities and components

## Notes

- All placeholder components return `null` - this is intentional
- Store functions are placeholders - actual state management library needs to be chosen
- UI component library (shadcn/ui) needs to be installed and configured
- Tauri IPC commands need to match backend implementation
