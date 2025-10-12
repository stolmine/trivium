# Trivium - Project Setup Complete

## Overview

The Trivium learning application project structure has been fully implemented with both frontend and backend architectures in place. The project is ready for feature implementation.

## Project Structure

```
trivium/
├── src/                          # Frontend (React + TypeScript)
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── reading/         # Reading interface
│   │   │   ├── flashcard/       # Flashcard display
│   │   │   └── editor/          # Cloze editor
│   │   ├── stores/              # Zustand state management
│   │   │   ├── reading.ts
│   │   │   ├── flashcard.ts
│   │   │   └── review.ts
│   │   ├── utils/               # Utilities
│   │   │   ├── tauri.ts         # IPC wrappers
│   │   │   ├── selection.ts     # Text selection
│   │   │   └── keyboard.ts      # Keyboard shortcuts
│   │   └── types/               # TypeScript definitions
│   │       ├── article.ts
│   │       ├── flashcard.ts
│   │       └── progress.ts
│   ├── routes/                  # Pages
│   │   ├── read/               # Reading interface
│   │   ├── review/             # Review session
│   │   └── library/            # Article library
│   ├── index.css               # Tailwind CSS v4 styles
│   └── main.tsx                # Entry point
├── src-tauri/                   # Backend (Rust)
│   ├── src/
│   │   ├── commands/            # Tauri commands
│   │   │   ├── texts.rs
│   │   │   ├── reading.rs
│   │   │   ├── flashcards.rs
│   │   │   └── review.rs
│   │   ├── models/              # Data models
│   │   │   ├── text.rs
│   │   │   ├── flashcard.rs
│   │   │   └── progress.rs
│   │   ├── services/            # Business logic
│   │   │   ├── srs.rs          # FSRS algorithm
│   │   │   ├── wikipedia.rs    # Wikipedia API
│   │   │   └── parser.rs       # Text parsing
│   │   ├── db/                  # Database
│   │   │   └── mod.rs          # SQLx setup
│   │   ├── lib.rs              # Tauri app setup
│   │   └── main.rs             # Entry point
│   ├── migrations/              # Database migrations
│   │   └── 20241012000000_initial_schema.sql
│   ├── Cargo.toml              # Rust dependencies
│   └── .env                    # Database URL
├── components.json              # shadcn/ui config
├── package.json                # npm dependencies
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
└── tailwind.config.js          # Tailwind CSS v4
```

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript 5.8
- **Build Tool**: Vite 7.0
- **State Management**: Zustand 5.0
- **Rich Text Editor**: Lexical 0.37
- **UI Components**: shadcn/ui (New York style)
- **Styling**: Tailwind CSS v4
- **Icons**: lucide-react

### Backend
- **Language**: Rust (latest stable)
- **Framework**: Tauri v2
- **Database**: SQLite with SQLx
- **HTTP Client**: reqwest (for Wikipedia API)
- **Async Runtime**: Tokio
- **SRS**: FSRS algorithm (to be integrated)

## Database Schema

### Tables Implemented
1. **texts** - Ingested articles with metadata
2. **reading_progress** - Per-user reading position tracking
3. **reading_sessions** - Detailed session logging
4. **flashcards** - Cloze deletion cards with FSRS state
5. **review_history** - Review tracking for analytics
6. **tags** + **text_tags** - Flexible tagging system

### FSRS State Fields
Each flashcard includes:
- `due` - Next review date
- `stability` - Memory stability
- `difficulty` - Card difficulty
- `state` - Learning state (New/Learning/Review/Relearning)
- `reps` - Number of repetitions
- `lapses` - Number of lapses

## Key Features Ready

### ✅ Completed
- [x] Tauri project initialization
- [x] Complete backend module structure
- [x] Complete frontend component structure
- [x] Database schema with migrations
- [x] SQLx configuration and setup
- [x] Frontend dependencies installed
- [x] shadcn/ui with Tailwind CSS v4
- [x] TypeScript type definitions
- [x] IPC wrapper utilities
- [x] State management structure

### 🔄 Ready for Implementation
- [ ] Text ingestion commands (paste, Wikipedia)
- [ ] Reading interface with progress tracking
- [ ] Text selection and snippet extraction
- [ ] Cloze deletion editor
- [ ] Flashcard creation flow
- [ ] Review interface with SRS
- [ ] Self-grading controls

## Getting Started

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run tauri dev
```

### Build for Production
```bash
npm run tauri build
```

### Database Migrations
Migrations run automatically on app startup. The database is created at:
- **macOS**: `~/Library/Application Support/com.why.trivium/trivium.db`
- **Linux**: `~/.local/share/com.why.trivium/trivium.db`
- **Windows**: `%APPDATA%\com.why.trivium\trivium.db`

## Development Workflow

### Adding Backend Commands
1. Define model in `src-tauri/src/models/`
2. Implement command in `src-tauri/src/commands/`
3. Register command in `src-tauri/src/lib.rs`
4. Add IPC wrapper in `src/lib/utils/tauri.ts`

### Adding Frontend Components
1. Create component in `src/lib/components/`
2. Add types in `src/lib/types/`
3. Connect to store in `src/lib/stores/`
4. Use in routes in `src/routes/`

### Adding UI Components
```bash
npx shadcn@latest add [component-name]
```

Example:
```bash
npx shadcn@latest add button dialog card
```

## Important Notes

### FSRS Dependency Conflict
The `fsrs` crate has a dependency conflict with `sqlx` (both link to native sqlite3). The database schema includes FSRS state fields, but the algorithm integration needs to be addressed separately. Options:
1. Manual FSRS implementation
2. Switch to rusqlite
3. Find compatible version

### Tailwind CSS v4
The project uses the latest Tailwind CSS v4 with:
- CSS-based configuration (no config file needed)
- Modern `@theme` syntax
- Built-in dark mode support
- CSS variables for theming

### Path Aliases
TypeScript and Vite are configured with `@/*` aliases:
```typescript
import { Button } from '@/lib/components/ui/button';
import { useReadingStore } from '@/lib/stores';
```

## Documentation

- `core.md` - Core application specification
- `architecture-backend.md` - Backend architecture details
- `architecture-frontend.md` - Frontend architecture details
- `DATABASE_SETUP.md` - Database configuration details
- `FRONTEND_SETUP.md` - Frontend setup details
- `FRONTEND_STRUCTURE.md` - Frontend structure overview

## Next Steps

1. **Implement Text Ingestion**
   - Wikipedia API integration
   - Paste functionality
   - Text storage

2. **Build Reading Interface**
   - Article display with Lexical
   - Progress tracking
   - Position persistence

3. **Create Cloze Editor**
   - Text selection UI
   - Cloze markup interface
   - Flashcard creation

4. **Implement Review System**
   - FSRS algorithm integration
   - Review queue management
   - Self-grading interface

## Resources

- [Tauri Docs](https://v2.tauri.app/)
- [React Docs](https://react.dev)
- [SQLx Docs](https://docs.rs/sqlx/)
- [Lexical Docs](https://lexical.dev)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs-rs)

---

**Project Status**: ✅ Structure Complete - Ready for Feature Implementation
