# Frontend Architecture - Trivium

## Technology Stack

### Recommended Stack
- **Framework**: React 18+
- **UI Components**: shadcn/ui + Radix UI
- **Rich Text Editor**: Lexical
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **TypeScript**: 5.0+

### Alternative Stack (Performance-Optimized)
- **Framework**: Svelte 4+
- **UI Components**: shadcn-svelte
- **Rich Text Editor**: Lexical (Svelte bindings)
- **State Management**: Svelte Stores (native)
- **Styling**: Tailwind CSS

## Framework Comparison

### React
**Pros:**
- Largest ecosystem for complex UI requirements
- Best support for rich text editors
- Extensive documentation and community
- Official Tauri templates

**Cons:**
- Larger bundle size (~70-150KB)
- Virtual DOM overhead
- More boilerplate code

### Svelte
**Pros:**
- Exceptional performance (1.85KB overhead)
- Compiled approach (no virtual DOM)
- Built-in state management
- 40-60% smaller bundles than React

**Cons:**
- Smaller ecosystem
- Fewer rich text editor options
- Smaller developer talent pool

## Rich Text Editor Comparison

### Lexical (Primary Recommendation)
**Pros:**
- Meta/Facebook backed
- Exceptional performance
- Framework agnostic (React, Svelte, Vue, Solid)
- TypeScript-first
- Minimal overhead for desktop apps

**Cons:**
- More initial setup required
- Steeper learning curve

### Tiptap (Alternative)
**Pros:**
- ProseMirror-based
- Easier setup
- Extension-based architecture
- Excellent documentation

**Cons:**
- Larger bundle size (~80KB vs ~50KB)
- More opinionated architecture

## State Management

### React: Zustand

```typescript
// stores/readingStore.ts
import create from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';

interface ReadingState {
  currentArticle: Article | null;
  readingProgress: number;
  updateProgress: (progress: number) => void;
  loadArticle: (id: string) => Promise<void>;
}

export const useReadingStore = create<ReadingState>((set, get) => ({
  currentArticle: null,
  readingProgress: 0,

  updateProgress: async (progress) => {
    set({ readingProgress: progress });
    await invoke('save_progress', {
      articleId: get().currentArticle?.id,
      progress
    });
  },

  loadArticle: async (id) => {
    const article = await invoke('load_article', { id });
    set({ currentArticle: article });
  }
}));
```

### Svelte: Native Stores

```typescript
// stores.ts
import { writable, derived } from 'svelte/store';
import { invoke } from '@tauri-apps/api/tauri';

export const currentArticle = writable<Article | null>(null);
export const readingProgress = writable<number>(0);

export const progressPercentage = derived(
  [readingProgress, currentArticle],
  ([$progress, $article]) => {
    if (!$article) return 0;
    return ($progress / $article.totalLength) * 100;
  }
);
```

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── reading/         # Reading interface components
│   │   ├── flashcard/       # Flashcard components
│   │   └── editor/          # Cloze editor components
│   ├── stores/              # State management
│   │   ├── reading.ts
│   │   ├── flashcard.ts
│   │   └── review.ts
│   ├── utils/
│   │   ├── tauri.ts         # IPC wrappers
│   │   ├── selection.ts     # Text selection utilities
│   │   └── keyboard.ts      # Keyboard shortcuts
│   └── types/               # TypeScript types
├── routes/                  # Pages/views
│   ├── read/
│   ├── review/
│   └── library/
└── main.tsx
```

## Cloze Deletion Interface

### Text Selection Implementation

```typescript
class SelectionTracker {
  getSelectedText(): string {
    const selection = window.getSelection();
    return selection?.toString() || '';
  }

  saveSelection(): { start: number; end: number; text: string } {
    const range = this.getSelectionRange();
    if (!range) return null;

    return {
      start: range.startOffset,
      end: range.endOffset,
      text: this.getSelectedText()
    };
  }
}
```

### Cloze Editor Component

```tsx
function ClozeEditor({ selectedText, context }) {
  const [clozes, setClozes] = useState([]);

  const addCloze = (start, end) => {
    const clozeNumber = clozes.length + 1;
    setClozes([...clozes, {
      id: clozeNumber,
      start,
      end,
      text: selectedText.substring(start, end)
    }]);
  };

  return (
    <div className="cloze-editor">
      <div className="context-display">
        {renderTextWithClozeHighlights(selectedText, clozes)}
      </div>
      <div className="cloze-actions">
        <Button onClick={() => addCloze(/* selection */)}>
          Add Cloze {{clozes.length + 1}}
        </Button>
        <Button onClick={handleSave}>Create Card</Button>
      </div>
    </div>
  );
}
```

## Flashcard Review Interface

### Layout Structure

```
┌─────────────────────────────────────────┐
│  Progress: 5/20 cards | 15 min left     │ ← Header
├─────────────────────────────────────────┤
│                                         │
│         [Card Content Display]          │ ← Main card area
│                                         │
├─────────────────────────────────────────┤
│  [Show Answer] or [Rating Buttons]      │ ← Actions
└─────────────────────────────────────────┘
```

### Self-Grading Controls (4-Button System)

```tsx
function GradingButtons({ onGrade, intervals }) {
  const grades = [
    { label: 'Again', value: 1, key: '1', interval: intervals.again },
    { label: 'Hard', value: 2, key: '2', interval: intervals.hard },
    { label: 'Good', value: 3, key: '3', interval: intervals.good },
    { label: 'Easy', value: 4, key: '4', interval: intervals.easy }
  ];

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const grade = grades.find(g => g.key === e.key);
      if (grade) onGrade(grade.value);
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [onGrade]);

  return (
    <div className="grade-buttons">
      {grades.map((grade) => (
        <Button key={grade.value} onClick={() => onGrade(grade.value)}>
          <span>{grade.label}</span>
          <span>{grade.interval}</span>
          <span>({grade.key})</span>
        </Button>
      ))}
    </div>
  );
}
```

### Keyboard Shortcuts

```typescript
const REVIEW_SHORTCUTS = {
  'Space': 'showAnswer',
  '1': 'gradeAgain',
  '2': 'gradeHard',
  '3': 'gradeGood',
  '4': 'gradeEasy',
  'u': 'undo',
  'e': 'edit',
  'Escape': 'exitReview'
};
```

## Tauri IPC Patterns

### Command Pattern (Frontend → Backend)

```typescript
import { invoke } from '@tauri-apps/api/tauri';

async function loadArticle(id: string): Promise<Article> {
  return await invoke('load_article', { id });
}

async function saveProgress(articleId: string, progress: number): Promise<void> {
  await invoke('save_progress', { articleId, progress });
}
```

### Event Pattern (Backend → Frontend)

```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen<ProgressUpdate>('progress-updated', (event) => {
  useReadingStore.setState({
    readingProgress: event.payload.progress
  });
});

// Cleanup
onUnmount(() => unlisten());
```

## Performance Targets

- **Initial Load**: < 1 second
- **Bundle Size**: < 500KB (gzipped)
- **Memory Usage**: < 200MB
- **Card Transition**: < 100ms
- **IPC Latency**: < 50ms
- **Text Selection**: < 16ms (60fps)

## Development Workflow

1. **Scaffold project:**
   ```bash
   npm create tauri-app
   # Choose React + TypeScript + Vite
   ```

2. **Install dependencies:**
   ```bash
   npm install zustand lexical @lexical/react
   npx shadcn-ui@latest init
   ```

3. **Implement incrementally:**
   - Reading interface first (simplest)
   - Text selection and snippet creation
   - Cloze editor
   - Review interface last

## UX Best Practices

### Review Interface
1. **Single Focus**: One card at a time
2. **Immediate Feedback**: Show intervals for each grade
3. **Keyboard-First**: Power users should never need mouse
4. **Progress Visibility**: Always show progress
5. **Minimal Transitions**: Fast, snappy (< 200ms)
6. **Error Recovery**: Undo button for accidental grades

### Reading Interface
1. **Distraction-Free**: Clean, minimal UI
2. **Progress Indication**: Visual progress bar
3. **Easy Selection**: Smooth text selection and highlighting
4. **Context Preservation**: Show surrounding text in flashcards
