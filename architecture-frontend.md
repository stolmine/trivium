# Frontend Architecture - Trivium

## Overview

Trivium is a reading and spaced repetition application with a three-panel layout supporting folder-based organization, granular read tracking, flashcard creation, and comprehensive study sessions. The frontend prioritizes keyboard-first navigation with full mouse support for accessibility and flexibility.

## Technology Stack

### Recommended Stack
- **Framework**: React 18+
- **UI Components**: shadcn/ui + Radix UI
- **Rich Text Editor**: Lexical
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **TypeScript**: 5.0+
- **Layout**: react-resizable-panels (for resizable three-panel layout)
- **Drag and Drop**: @dnd-kit/core (for folder/text organization)
- **Context Menus**: @radix-ui/react-context-menu (text selection, folder operations)

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

### Folder Store

```typescript
// stores/folder.ts
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';

interface FolderNode {
  folder: Folder;
  children: FolderNode[];
  textCount: number;
}

interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface FolderState {
  folderTree: FolderNode[];
  selectedFolderId: number | null;
  expandedFolders: Set<number>;
  loadFolderTree: () => Promise<void>;
  createFolder: (name: string, parentId?: number) => Promise<void>;
  moveFolder: (folderId: number, newParentId: number | null) => Promise<void>;
  deleteFolder: (folderId: number) => Promise<void>;
  addTextToFolder: (textId: number, folderId: number) => Promise<void>;
  removeTextFromFolder: (textId: number, folderId: number) => Promise<void>;
  toggleExpanded: (folderId: number) => void;
  selectFolder: (folderId: number | null) => void;
}

export const useFolderStore = create<FolderState>((set, get) => ({
  folderTree: [],
  selectedFolderId: null,
  expandedFolders: new Set(),

  loadFolderTree: async () => {
    const tree = await invoke<FolderNode[]>('get_folder_tree');
    set({ folderTree: tree });
  },

  createFolder: async (name, parentId) => {
    await invoke('create_folder', { name, parentId });
    await get().loadFolderTree();
  },

  moveFolder: async (folderId, newParentId) => {
    await invoke('move_folder', { folderId, newParentId });
    await get().loadFolderTree();
  },

  deleteFolder: async (folderId) => {
    await invoke('delete_folder', { folderId });
    await get().loadFolderTree();
  },

  addTextToFolder: async (textId, folderId) => {
    await invoke('add_text_to_folder', { textId, folderId });
    await get().loadFolderTree();
  },

  removeTextFromFolder: async (textId, folderId) => {
    await invoke('remove_text_from_folder', { textId, folderId });
    await get().loadFolderTree();
  },

  toggleExpanded: (folderId) => {
    const expanded = new Set(get().expandedFolders);
    if (expanded.has(folderId)) {
      expanded.delete(folderId);
    } else {
      expanded.add(folderId);
    }
    set({ expandedFolders: expanded });
  },

  selectFolder: (folderId) => {
    set({ selectedFolderId: folderId });
  }
}));
```

### Reading History Store (Phase 15)

```typescript
// stores/readingHistory.ts
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';

interface HistoryAction {
  id: string;
  timestamp: number;
  type: 'text_edit' | 'mark' | 'unmark';
}

interface TextEditAction extends HistoryAction {
  type: 'text_edit';
  editRegion: { start: number; end: number };
  previousContent: string;
  newContent: string;
  marksBeforeEdit: ClozeNote[];
  marksAfterEdit: ClozeNote[];
}

interface MarkAction extends HistoryAction {
  type: 'mark';
  range: { start: number; end: number };
  contentSnapshot: string;
  markedText: string;
}

interface UnmarkAction extends HistoryAction {
  type: 'unmark';
  range: { start: number; end: number };
  previousReadRanges: ReadRange[];
  contentSnapshot: string;
}

interface ReadingHistoryStore {
  past: Action[];
  future: Action[];
  maxHistorySize: number;
  currentTextId: number | null;
  isUndoRedoInProgress: boolean;
  isOnReadingPage: boolean;

  recordTextEdit: (action: Omit<TextEditAction, 'id' | 'timestamp' | 'type'>) => void;
  recordMark: (action: Omit<MarkAction, 'id' | 'timestamp' | 'type'>) => void;
  recordUnmark: (action: Omit<UnmarkAction, 'id' | 'timestamp' | 'type'>) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  resetForText: (textId: number) => void;
  setOnReadingPage: (isOnPage: boolean) => void;
}

export const useReadingHistoryStore = create<ReadingHistoryStore>((set, get) => ({
  // ... implementation with 50-action history limit
  // ... page isolation (only active on reading page)
  // ... per-text history tracking
  // ... backend-synced undo/redo operations
}));
```

**Key Features**:
- **Unified History Stack**: Single stack for text edits, marks, and unmarks
- **Page Isolation**: Only active when on reading page (/read/[id])
- **Per-Text History**: Separate history for each text (cleared on switch)
- **50-Action Limit**: Automatic trimming of old actions
- **Backend-Synced**: All undo/redo operations call backend APIs
- **Position-Safe**: Stores mark positions for accurate restoration

**Keyboard Shortcuts**:
- `Ctrl+Z` or `Cmd+Z`: Undo last action
- `Ctrl+Shift+Z` or `Cmd+Shift+Z`: Redo undone action

### Reading Store (Enhanced)

```typescript
// stores/reading.ts
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';

interface ReadRange {
  id: number;
  textId: number;
  startPosition: number;
  endPosition: number;
  markedAt: string;
}

interface Paragraph {
  id: number;
  textId: number;
  paragraphIndex: number;
  startPosition: number;
  endPosition: number;
  characterCount: number;
  isRead: boolean;
}

interface Article {
  id: number;
  title: string;
  content: string;
  author?: string;
  publicationDate?: string;
  publisher?: string;
  doi?: string;
  isbn?: string;
}

interface ReadingState {
  currentArticle: Article | null;
  readRanges: ReadRange[];
  paragraphs: Paragraph[];
  currentParagraphIndex: number;
  mostRecentlyRead: string | null;
  totalProgress: number;

  loadArticle: (id: number) => Promise<void>;
  markRangeAsRead: (textId: number, startPos: number, endPos: number) => Promise<void>;
  getReadRanges: (textId: number) => Promise<void>;
  getParagraphs: (textId: number) => Promise<void>;
  navigateToNextParagraph: () => Promise<void>;
  navigateToPreviousParagraph: () => Promise<void>;
  navigateToNextUnreadParagraph: () => Promise<void>;
  calculateProgress: (textId: number) => Promise<void>;
  getMostRecentlyRead: (textId: number) => Promise<void>;
}

export const useReadingStore = create<ReadingState>((set, get) => ({
  currentArticle: null,
  readRanges: [],
  paragraphs: [],
  currentParagraphIndex: 0,
  mostRecentlyRead: null,
  totalProgress: 0,

  loadArticle: async (id) => {
    const article = await invoke<Article>('load_article', { id });
    set({ currentArticle: article });
    await get().getReadRanges(id);
    await get().getParagraphs(id);
    await get().calculateProgress(id);
    await get().getMostRecentlyRead(id);
  },

  markRangeAsRead: async (textId, startPos, endPos) => {
    await invoke('mark_range_as_read', { textId, startPos, endPos });
    await get().getReadRanges(textId);
    await get().calculateProgress(textId);
    await get().getMostRecentlyRead(textId);
  },

  getReadRanges: async (textId) => {
    const ranges = await invoke<ReadRange[]>('get_read_ranges', { textId });
    set({ readRanges: ranges });
  },

  getParagraphs: async (textId) => {
    const paragraphs = await invoke<Paragraph[]>('get_paragraphs', { textId });
    set({ paragraphs });
  },

  navigateToNextParagraph: async () => {
    const { currentParagraphIndex, paragraphs } = get();
    if (currentParagraphIndex < paragraphs.length - 1) {
      set({ currentParagraphIndex: currentParagraphIndex + 1 });
    }
  },

  navigateToPreviousParagraph: async () => {
    const { currentParagraphIndex } = get();
    if (currentParagraphIndex > 0) {
      set({ currentParagraphIndex: currentParagraphIndex - 1 });
    }
  },

  navigateToNextUnreadParagraph: async () => {
    const { currentArticle, currentParagraphIndex } = get();
    if (!currentArticle) return;

    const nextUnread = await invoke<Paragraph | null>('get_next_unread_paragraph', {
      textId: currentArticle.id,
      currentPos: currentParagraphIndex
    });

    if (nextUnread) {
      set({ currentParagraphIndex: nextUnread.paragraphIndex });
    }
  },

  calculateProgress: async (textId) => {
    const progress = await invoke<number>('calculate_text_progress', { textId });
    set({ totalProgress: progress });
  },

  getMostRecentlyRead: async (textId) => {
    const recentText = await invoke<string | null>('get_most_recently_read_text', { textId });
    set({ mostRecentlyRead: recentText });
  }
}));
```

### Study Store

```typescript
// stores/study.ts
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';

interface StudyFilter {
  type: 'folder' | 'tag' | 'text' | 'schedule';
  id?: number;
  includeNew: boolean;
  includeDue: boolean;
}

interface DailyLimits {
  newCards: number;
  reviews: number;
}

interface DailyProgress {
  newCardsStudied: number;
  reviewsCompleted: number;
}

interface StudyState {
  currentFilter: StudyFilter;
  dailyLimits: DailyLimits;
  todaysProgress: DailyProgress;
  availableCards: Flashcard[];

  setFilter: (filter: StudyFilter) => void;
  loadStudySession: () => Promise<void>;
  setDailyLimits: (limits: DailyLimits) => Promise<void>;
  getTodaysProgress: () => Promise<void>;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  currentFilter: { type: 'schedule', includeNew: true, includeDue: true },
  dailyLimits: { newCards: 20, reviews: 200 },
  todaysProgress: { newCardsStudied: 0, reviewsCompleted: 0 },
  availableCards: [],

  setFilter: (filter) => {
    set({ currentFilter: filter });
  },

  loadStudySession: async () => {
    const { currentFilter } = get();
    const cards = await invoke<Flashcard[]>('get_study_session', { filter: currentFilter });
    set({ availableCards: cards });
  },

  setDailyLimits: async (limits) => {
    await invoke('set_daily_limits', {
      newCards: limits.newCards,
      reviews: limits.reviews
    });
    set({ dailyLimits: limits });
  },

  getTodaysProgress: async () => {
    const progress = await invoke<DailyProgress>('get_todays_progress');
    set({ todaysProgress: progress });
  }
}));
```

### Stats Store

```typescript
// stores/stats.ts
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';

interface StatsFilter {
  type: 'folder' | 'tag' | 'text' | 'total';
  id?: number;
}

interface ReadingStats {
  totalCharacters: number;
  charactersRead: number;
  percentageComplete: number;
  timeSpent: number;
}

interface FlashcardStats {
  totalCards: number;
  averageRetention: number;
  cardsReviewed: number;
  averageInterval: number;
}

interface StatsState {
  readingStats: ReadingStats | null;
  flashcardStats: FlashcardStats | null;
  currentFilter: StatsFilter;

  loadStats: (filter: StatsFilter) => Promise<void>;
  loadReadingStats: (filter: StatsFilter) => Promise<void>;
  loadFlashcardStats: (filter: StatsFilter) => Promise<void>;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  readingStats: null,
  flashcardStats: null,
  currentFilter: { type: 'total' },

  loadStats: async (filter) => {
    set({ currentFilter: filter });
    await get().loadReadingStats(filter);
    await get().loadFlashcardStats(filter);
  },

  loadReadingStats: async (filter) => {
    let stats: ReadingStats;

    switch (filter.type) {
      case 'folder':
        stats = await invoke('get_reading_stats_by_folder', { folderId: filter.id });
        break;
      case 'tag':
        stats = await invoke('get_reading_stats_by_tag', { tagId: filter.id });
        break;
      case 'text':
        stats = await invoke('get_reading_stats_by_text', { textId: filter.id });
        break;
      case 'total':
      default:
        stats = await invoke('get_overall_stats');
        break;
    }

    set({ readingStats: stats });
  },

  loadFlashcardStats: async (filter) => {
    let stats: FlashcardStats;

    switch (filter.type) {
      case 'folder':
        stats = await invoke('get_flashcard_stats_by_folder', { folderId: filter.id });
        break;
      case 'tag':
        stats = await invoke('get_flashcard_stats_by_tag', { tagId: filter.id });
        break;
      case 'text':
        stats = await invoke('get_flashcard_stats_by_text', { textId: filter.id });
        break;
      case 'total':
      default:
        stats = await invoke('get_overall_flashcard_stats');
        break;
    }

    set({ flashcardStats: stats });
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

## Application Layout

### Three-Panel Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  App Header / Navigation                                         │
├───────────┬────────────────────────────────┬─────────────────────┤
│           │                                │                     │
│  Folder   │     Reading View               │   Flashcard         │
│  Tree     │                                │   Sidebar           │
│  Nav      │  [Article Content]             │   (Collapsible)     │
│           │                                │                     │
│  (Resize) │                                │   [Recent Read]     │
│           │                                │   [Cloze Editor]    │
│           │                                │                     │
└───────────┴────────────────────────────────┴─────────────────────┘
```

**Layout Features:**
- **Left Panel**: Folder tree navigation (horizontally resizable)
- **Center Panel**: Main reading area with text selection and highlighting
- **Right Panel**: Flashcard creation sidebar (collapsible)
- **Full-screen Study Mode**: Replaces entire layout during review sessions

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx      # Three-panel layout container
│   │   │   ├── ResizablePanel.tsx  # Resizable panel wrapper
│   │   │   ├── TreeNavigation.tsx  # Left sidebar container
│   │   │   └── FlashcardSidebar.tsx # Right sidebar container
│   │   ├── folders/
│   │   │   ├── FolderTree.tsx      # Hierarchical folder tree
│   │   │   ├── FolderNode.tsx      # Individual tree node
│   │   │   ├── FolderContextMenu.tsx # Right-click operations
│   │   │   └── CreateFolderDialog.tsx # Folder creation modal
│   │   ├── reading/
│   │   │   ├── ArticleViewer.tsx        # Main text display
│   │   │   ├── TextSelectionMenu.tsx    # Context menu for marking read
│   │   │   ├── ParagraphNavigator.tsx   # Keyboard paragraph navigation
│   │   │   ├── ReadHighlighter.tsx      # Visual read/unread highlighting
│   │   │   ├── InlineRegionEditor.tsx   # Phase 14: Truly inline text editor (MAIN)
│   │   │   ├── InlineToolbar.tsx        # Phase 14: Inline editing toolbar
│   │   │   ├── EditableContent.tsx      # Phase 14: Mode-aware content container
│   │   │   ├── MarkdownRenderer.tsx     # Phase 14: Styled mode renderer
│   │   │   ├── EditableLink.tsx         # Phase 14: Link editing component
│   │   │   ├── MarkDeletionWarning.tsx  # Phase 16: Deletion warning dialog
│   │   │   └── IngestModal.tsx          # Text import/metadata entry
│   │   ├── flashcard/
│   │   │   ├── FlashcardCreator.tsx     # Flashcard creation interface
│   │   │   ├── ClozeEditor.tsx          # Cloze deletion editor
│   │   │   └── RecentReadDisplay.tsx    # Shows most recently read text
│   │   ├── study/
│   │   │   ├── StudySession.tsx         # Full-screen study view
│   │   │   ├── StudyFilterDialog.tsx    # Filter selection UI
│   │   │   ├── DailyLimitsSettings.tsx  # Configure daily limits
│   │   │   └── GradingButtons.tsx       # 4-button grading system
│   │   └── stats/
│   │       ├── StatsLayout.tsx          # Statistics page layout
│   │       ├── ReadingStatsPanel.tsx    # Reading progress charts
│   │       ├── FlashcardStatsPanel.tsx  # Flashcard performance charts
│   │       └── FilterSelector.tsx       # Filter by folder/tag/article
│   ├── stores/                          # State management
│   │   ├── folder.ts                    # Folder tree state
│   │   ├── reading.ts                   # Reading state with read ranges
│   │   ├── readingHistory.ts            # Undo/redo history for reading view (Phase 15)
│   │   ├── flashcard.ts                 # Flashcard operations
│   │   ├── study.ts                     # Study session state
│   │   ├── stats.ts                     # Statistics state
│   │   └── review.ts                    # Review scheduling
│   ├── utils/
│   │   ├── tauri.ts                     # IPC wrappers
│   │   ├── selection.ts                 # Text selection utilities
│   │   ├── keyboard.ts                  # Keyboard shortcuts
│   │   ├── sentenceBoundary.ts          # Sentence/paragraph boundary detection (Phase 14)
│   │   ├── expandToSmartBoundary.ts     # Smart boundary expansion (Phase 14)
│   │   ├── preserveCursorThroughTransform.ts # Marker-based cursor tracking (Phase 14)
│   │   ├── parseMarkdownWithPositions.ts # Unified/remark integration (Phase 14)
│   │   ├── positionMapping.ts           # Rendered ↔ source position mapping (Phase 14)
│   │   ├── markOverlap.ts               # Phase 16: Mark/range overlap detection
│   │   └── rangeCalculator.ts           # Read range merging/calculation
│   └── types/                           # TypeScript types
│       ├── folder.ts
│       ├── reading.ts
│       ├── flashcard.ts
│       └── study.ts
├── routes/                              # Pages/views
│   ├── index.tsx                        # Main view (folder tree + reading)
│   ├── read/[id].tsx                    # Reading view for specific article
│   ├── study/index.tsx                  # Study session page
│   └── stats/index.tsx                  # Statistics dashboard
└── main.tsx
```

## Folder Tree Component

### Hierarchical Tree Structure

```tsx
// components/folders/FolderTree.tsx
function FolderTree() {
  const { folderTree, expandedFolders, selectedFolderId } = useFolderStore();

  return (
    <div className="folder-tree">
      {folderTree.map((node) => (
        <FolderNode
          key={node.folder.id}
          node={node}
          level={0}
          isExpanded={expandedFolders.has(node.folder.id)}
          isSelected={selectedFolderId === node.folder.id}
        />
      ))}
    </div>
  );
}
```

### Folder Node with Context Menu

```tsx
// components/folders/FolderNode.tsx
function FolderNode({ node, level, isExpanded, isSelected }) {
  const { toggleExpanded, selectFolder } = useFolderStore();

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn("folder-node", isSelected && "selected")}
          style={{ paddingLeft: `${level * 16}px` }}
          onClick={() => selectFolder(node.folder.id)}
        >
          <button onClick={() => toggleExpanded(node.folder.id)}>
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </button>
          <FolderIcon />
          <span>{node.folder.name}</span>
          <span className="text-count">({node.textCount})</span>
        </div>
      </ContextMenuTrigger>

      <FolderContextMenu folderId={node.folder.id} />

      {isExpanded && node.children.map((child) => (
        <FolderNode
          key={child.folder.id}
          node={child}
          level={level + 1}
          isExpanded={expandedFolders.has(child.folder.id)}
          isSelected={selectedFolderId === child.folder.id}
        />
      ))}
    </ContextMenu>
  );
}
```

### Context Menu for Folder Operations

```tsx
// components/folders/FolderContextMenu.tsx
function FolderContextMenu({ folderId }) {
  const { createFolder, deleteFolder, moveFolder } = useFolderStore();

  return (
    <ContextMenuContent>
      <ContextMenuItem onClick={() => createFolder('New Folder', folderId)}>
        Create Subfolder
      </ContextMenuItem>
      <ContextMenuItem onClick={() => deleteFolder(folderId)}>
        Delete Folder
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem>Add Text to Folder</ContextMenuItem>
      <ContextMenuItem>Remove Text from Folder</ContextMenuItem>
    </ContextMenuContent>
  );
}
```

## Reading Interface Components

### Read/Unread Highlighting

```tsx
// components/reading/ReadUnreadHighlighter.tsx
function ReadUnreadHighlighter({ content, readRanges }) {
  const renderHighlightedText = () => {
    const segments = [];
    let currentPos = 0;

    const sortedRanges = [...readRanges].sort((a, b) => a.startPosition - b.startPosition);

    for (const range of sortedRanges) {
      if (currentPos < range.startPosition) {
        segments.push({
          text: content.substring(currentPos, range.startPosition),
          isRead: false
        });
      }

      segments.push({
        text: content.substring(range.startPosition, range.endPosition),
        isRead: true
      });

      currentPos = range.endPosition;
    }

    if (currentPos < content.length) {
      segments.push({
        text: content.substring(currentPos),
        isRead: false
      });
    }

    return segments;
  };

  const segments = renderHighlightedText();

  return (
    <div className="highlighted-text">
      {segments.map((segment, idx) => (
        <span
          key={idx}
          className={cn(
            segment.isRead ? "text-read" : "text-unread"
          )}
        >
          {segment.text}
        </span>
      ))}
    </div>
  );
}
```

### Text Selection Context Menu

```tsx
// components/reading/TextSelectionMenu.tsx
function TextSelectionMenu() {
  const { currentArticle, markRangeAsRead } = useReadingStore();

  const handleMarkAsRead = () => {
    const selection = window.getSelection();
    if (!selection || !currentArticle) return;

    const range = selection.getRangeAt(0);
    const startPos = range.startOffset;
    const endPos = range.endOffset;

    markRangeAsRead(currentArticle.id, startPos, endPos);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className="article-content">
          {/* Article content here */}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={handleMarkAsRead}>
          Mark as Read (Ctrl+M)
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>
          Create Flashcard (Ctrl+N)
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
```

### Paragraph Navigation

```tsx
// components/reading/ParagraphNavigator.tsx
function ParagraphNavigator() {
  const {
    paragraphs,
    currentParagraphIndex,
    navigateToNextParagraph,
    navigateToPreviousParagraph,
    navigateToNextUnreadParagraph
  } = useReadingStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        navigateToNextParagraph();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigateToPreviousParagraph();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        navigateToNextUnreadParagraph();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentParagraph = paragraphs[currentParagraphIndex];

  return (
    <div className="paragraph-navigator">
      <div className="nav-controls">
        <Button onClick={navigateToPreviousParagraph}>
          Previous (Ctrl+K)
        </Button>
        <span>
          Paragraph {currentParagraphIndex + 1} of {paragraphs.length}
        </span>
        <Button onClick={navigateToNextParagraph}>
          Next (Ctrl+J)
        </Button>
        <Button onClick={navigateToNextUnreadParagraph}>
          Next Unread (Ctrl+Shift+J)
        </Button>
      </div>
    </div>
  );
}
```

### Ingest Modal (Text Import)

```tsx
// components/reading/IngestModal.tsx
function IngestModal({ isOpen, onClose }) {
  const [content, setContent] = useState('');
  const [metadata, setMetadata] = useState({
    title: '',
    author: '',
    publicationDate: '',
    publisher: '',
    url: '',
    doi: '',
    isbn: '',
    accessDate: ''
  });

  const handleImport = async () => {
    await invoke('create_text', {
      content,
      title: metadata.title,
      author: metadata.author,
      publicationDate: metadata.publicationDate,
      publisher: metadata.publisher,
      doi: metadata.doi,
      isbn: metadata.isbn
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import Text</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual">
          <TabsList>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="file">File Upload</TabsTrigger>
            <TabsTrigger value="wikipedia">Wikipedia</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or type your text here..."
              className="min-h-[300px]"
            />

            <div className="metadata-fields">
              <Input
                placeholder="Title"
                value={metadata.title}
                onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              />
              <Input
                placeholder="Author (Last, First)"
                value={metadata.author}
                onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
              />
              <Input
                placeholder="Publication Date"
                value={metadata.publicationDate}
                onChange={(e) => setMetadata({ ...metadata, publicationDate: e.target.value })}
              />
              <Input
                placeholder="Publisher"
                value={metadata.publisher}
                onChange={(e) => setMetadata({ ...metadata, publisher: e.target.value })}
              />
              <Input
                placeholder="URL"
                value={metadata.url}
                onChange={(e) => setMetadata({ ...metadata, url: e.target.value })}
              />
              <Input
                placeholder="DOI"
                value={metadata.doi}
                onChange={(e) => setMetadata({ ...metadata, doi: e.target.value })}
              />
              <Input
                placeholder="ISBN"
                value={metadata.isbn}
                onChange={(e) => setMetadata({ ...metadata, isbn: e.target.value })}
              />
            </div>
          </TabsContent>

          <TabsContent value="file">
            <div className="file-upload">
              <Input type="file" accept=".txt,.pdf,.epub" />
              <p>Supported formats: TXT, PDF, EPUB</p>
            </div>
          </TabsContent>

          <TabsContent value="wikipedia">
            {/* Phase 6.5 - Implemented */}
            <Input
              placeholder="Wikipedia URL (e.g., https://en.wikipedia.org/wiki/Title)"
              value={wikipediaUrl}
              onChange={(e) => setWikipediaUrl(e.target.value)}
            />
            <Button
              onClick={handleFetchWikipedia}
              disabled={isFetching}
            >
              {isFetching ? 'Fetching...' : 'Fetch Article'}
            </Button>
            {/* Auto-populates content, title, publisher, publicationDate, source */}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleImport}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Wikipedia Integration (Phase 6.5)

Wikipedia article fetching with HTML parsing for clean content extraction:

```tsx
// src/lib/utils/tauri.ts
export const wikipedia = {
  fetch: async (url: string): Promise<WikipediaArticle> => {
    return await invoke('fetch_wikipedia_article', { url });
  }
};

// src/lib/types/wikipedia.ts
export interface WikipediaArticle {
  title: string;
  content: string;
  source_url: string;
  publisher: string;
  publication_date: string;
}

// Usage in ingest form
const handleFetchWikipedia = async () => {
  setIsFetching(true);
  try {
    const article = await wikipedia.fetch(wikipediaUrl);

    // Auto-populate all form fields
    setContent(article.content);
    setMetadata({
      title: article.title,
      publisher: article.publisher,
      publicationDate: article.publication_date,
      source: article.source_url,
      // Other fields remain empty
    });
  } catch (error) {
    console.error('Failed to fetch Wikipedia article:', error);
    // Show user-friendly error message
  } finally {
    setIsFetching(false);
  }
};
```

**Features**:
- HTML-to-text parsing with CSS selector-based filtering
- Removes infoboxes, navigation, references, and tables
- Preserves section headings and instrumentation lists
- Link text content preserved (not removed)
- Automatic metadata population
- Error handling with user feedback

## Resizable Panel Layout

### Using react-resizable-panels

```tsx
// components/layout/MainLayout.tsx
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

function MainLayout() {
  const [isFlashcardSidebarVisible, setFlashcardSidebarVisible] = useState(true);

  return (
    <div className="main-layout">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={20} minSize={15} maxSize={35}>
          <TreeNavigation />
        </Panel>

        <PanelResizeHandle className="resize-handle" />

        <Panel defaultSize={60} minSize={40}>
          <ArticleViewer />
        </Panel>

        {isFlashcardSidebarVisible && (
          <>
            <PanelResizeHandle className="resize-handle" />
            <Panel defaultSize={20} minSize={15} maxSize={30}>
              <FlashcardSidebar
                onClose={() => setFlashcardSidebarVisible(false)}
              />
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}
```

## Flashcard Sidebar

### Recent Read Display and Cloze Creation

```tsx
// components/flashcard/FlashcardSidebar.tsx
function FlashcardSidebar({ onClose }) {
  const { mostRecentlyRead } = useReadingStore();

  return (
    <div className="flashcard-sidebar">
      <div className="sidebar-header">
        <h3>Create Flashcard</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X />
        </Button>
      </div>

      <div className="recent-read-section">
        <h4>Most Recently Read</h4>
        <div className="recent-text">
          {mostRecentlyRead || 'No text marked as read yet'}
        </div>
      </div>

      <ClozeEditor text={mostRecentlyRead} />
    </div>
  );
}
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
function ClozeEditor({ text }) {
  const [clozes, setClozes] = useState([]);

  const addCloze = (start, end) => {
    const clozeNumber = clozes.length + 1;
    setClozes([...clozes, {
      id: clozeNumber,
      start,
      end,
      text: text.substring(start, end)
    }]);
  };

  const handleSave = async () => {
    await invoke('create_flashcard', {
      content: text,
      clozes: clozes
    });
    setClozes([]);
  };

  return (
    <div className="cloze-editor">
      <div className="context-display">
        {renderTextWithClozeHighlights(text, clozes)}
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

## Study Session Interface

### Study Filter Dialog

```tsx
// components/study/StudyFilterDialog.tsx
function StudyFilterDialog({ isOpen, onClose, onStartSession }) {
  const [filterType, setFilterType] = useState<'schedule' | 'folder' | 'tag' | 'text'>('schedule');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [includeNew, setIncludeNew] = useState(true);
  const [includeDue, setIncludeDue] = useState(true);

  const handleStart = () => {
    const filter: StudyFilter = {
      type: filterType,
      id: selectedId,
      includeNew,
      includeDue
    };
    onStartSession(filter);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Study Session</DialogTitle>
        </DialogHeader>

        <div className="filter-options">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Select filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="schedule">All Due Cards</SelectItem>
              <SelectItem value="folder">By Folder</SelectItem>
              <SelectItem value="tag">By Tag</SelectItem>
              <SelectItem value="text">By Article</SelectItem>
            </SelectContent>
          </Select>

          {filterType !== 'schedule' && (
            <Select onValueChange={(val) => setSelectedId(parseInt(val))}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${filterType}`} />
              </SelectTrigger>
              <SelectContent>
                {/* Populate based on filterType */}
              </SelectContent>
            </Select>
          )}

          <div className="checkbox-options">
            <label>
              <input
                type="checkbox"
                checked={includeNew}
                onChange={(e) => setIncludeNew(e.target.checked)}
              />
              Include New Cards
            </label>
            <label>
              <input
                type="checkbox"
                checked={includeDue}
                onChange={(e) => setIncludeDue(e.target.checked)}
              />
              Include Due Cards
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleStart}>Start Session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Daily Limits Settings

```tsx
// components/study/DailyLimitsSettings.tsx
function DailyLimitsSettings() {
  const { dailyLimits, setDailyLimits } = useStudyStore();
  const [newCards, setNewCards] = useState(dailyLimits.newCards);
  const [reviews, setReviews] = useState(dailyLimits.reviews);

  const handleSave = async () => {
    await setDailyLimits({ newCards, reviews });
  };

  return (
    <div className="daily-limits-settings">
      <h3>Daily Study Limits</h3>

      <div className="limit-input">
        <label>New Cards Per Day</label>
        <Input
          type="number"
          value={newCards}
          onChange={(e) => setNewCards(parseInt(e.target.value))}
          min={0}
          max={999}
        />
      </div>

      <div className="limit-input">
        <label>Reviews Per Day</label>
        <Input
          type="number"
          value={reviews}
          onChange={(e) => setReviews(parseInt(e.target.value))}
          min={0}
          max={9999}
        />
      </div>

      <Button onClick={handleSave}>Save Limits</Button>
    </div>
  );
}
```

### Full-Screen Study Session

```tsx
// components/study/StudySession.tsx
function StudySession() {
  const { availableCards, todaysProgress, dailyLimits } = useStudyStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const currentCard = availableCards[currentIndex];
  const limitsReached = todaysProgress.newCardsStudied >= dailyLimits.newCards &&
                        todaysProgress.reviewsCompleted >= dailyLimits.reviews;

  const handleGrade = async (grade: number) => {
    await invoke('grade_card', { cardId: currentCard.id, grade });
    setShowAnswer(false);
    setCurrentIndex(currentIndex + 1);
  };

  if (limitsReached || currentIndex >= availableCards.length) {
    return <StudyComplete />;
  }

  return (
    <div className="study-session-fullscreen">
      <div className="study-header">
        <div className="progress">
          {currentIndex + 1} / {availableCards.length}
        </div>
        <div className="limits">
          New: {todaysProgress.newCardsStudied} / {dailyLimits.newCards} |
          Reviews: {todaysProgress.reviewsCompleted} / {dailyLimits.reviews}
        </div>
        <Button variant="ghost" onClick={() => window.history.back()}>
          Exit (Esc)
        </Button>
      </div>

      <div className="card-display">
        {!showAnswer ? (
          <div className="card-front">
            <div className="card-content">{currentCard.content}</div>
            <Button onClick={() => setShowAnswer(true)}>
              Show Answer (Space)
            </Button>
          </div>
        ) : (
          <div className="card-back">
            <div className="card-content">{currentCard.content}</div>
            <GradingButtons onGrade={handleGrade} />
          </div>
        )}
      </div>
    </div>
  );
}
```

## Statistics Dashboard

### Stats Page Layout

```tsx
// routes/stats/index.tsx
function StatsPage() {
  const { readingStats, flashcardStats, currentFilter, loadStats } = useStatsStore();
  const [filterType, setFilterType] = useState<'total' | 'folder' | 'tag' | 'text'>('total');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    loadStats({ type: filterType, id: selectedId });
  }, [filterType, selectedId]);

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1>Statistics</h1>
        <FilterSelector
          filterType={filterType}
          selectedId={selectedId}
          onFilterChange={(type, id) => {
            setFilterType(type);
            setSelectedId(id);
          }}
        />
      </div>

      <div className="stats-grid">
        <ReadingStatsPanel stats={readingStats} />
        <FlashcardStatsPanel stats={flashcardStats} />
      </div>
    </div>
  );
}
```

### Reading Statistics Panel

```tsx
// components/stats/ReadingStatsPanel.tsx
function ReadingStatsPanel({ stats }) {
  if (!stats) return <div>Loading...</div>;

  return (
    <Card className="stats-panel">
      <CardHeader>
        <CardTitle>Reading Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="stats-overview">
          <div className="stat-item">
            <span className="stat-label">Total Characters</span>
            <span className="stat-value">{stats.totalCharacters.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Characters Read</span>
            <span className="stat-value">{stats.charactersRead.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Percentage Complete</span>
            <span className="stat-value">{stats.percentageComplete.toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Time Spent</span>
            <span className="stat-value">{formatTime(stats.timeSpent)}</span>
          </div>
        </div>

        <div className="progress-chart">
          <Progress value={stats.percentageComplete} />
        </div>
      </CardContent>
    </Card>
  );
}
```

### Flashcard Statistics Panel

```tsx
// components/stats/FlashcardStatsPanel.tsx
function FlashcardStatsPanel({ stats }) {
  if (!stats) return <div>Loading...</div>;

  return (
    <Card className="stats-panel">
      <CardHeader>
        <CardTitle>Flashcard Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="stats-overview">
          <div className="stat-item">
            <span className="stat-label">Total Cards</span>
            <span className="stat-value">{stats.totalCards}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Cards Reviewed</span>
            <span className="stat-value">{stats.cardsReviewed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Average Retention</span>
            <span className="stat-value">{(stats.averageRetention * 100).toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Average Interval</span>
            <span className="stat-value">{stats.averageInterval} days</span>
          </div>
        </div>

        <div className="retention-chart">
          {/* Chart component showing retention over time */}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Filter Selector

```tsx
// components/stats/FilterSelector.tsx
function FilterSelector({ filterType, selectedId, onFilterChange }) {
  return (
    <div className="filter-selector">
      <Select
        value={filterType}
        onValueChange={(type) => onFilterChange(type, null)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="total">All Content</SelectItem>
          <SelectItem value="folder">By Folder</SelectItem>
          <SelectItem value="tag">By Tag</SelectItem>
          <SelectItem value="text">By Article</SelectItem>
        </SelectContent>
      </Select>

      {filterType !== 'total' && (
        <Select
          value={selectedId?.toString()}
          onValueChange={(id) => onFilterChange(filterType, parseInt(id))}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${filterType}`} />
          </SelectTrigger>
          <SelectContent>
            {/* Populate based on filterType */}
          </SelectContent>
        </Select>
      )}
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
// Global keyboard shortcuts for navigation and actions
const GLOBAL_SHORTCUTS = {
  // Reading shortcuts
  'Ctrl/Cmd + M': 'markSelectionAsRead',
  'Ctrl/Cmd + J': 'nextParagraph',
  'Ctrl/Cmd + K': 'previousParagraph',
  'Ctrl/Cmd + Shift + J': 'nextUnreadParagraph',
  'Ctrl/Cmd + N': 'createFlashcard',
  'Ctrl/Cmd + B': 'toggleFlashcardSidebar',
  'Ctrl/Cmd + Z': 'undo',                   // Phase 15: Undo (reading page only)
  'Ctrl/Cmd + Shift + Z': 'redo',           // Phase 15: Redo (reading page only)

  // Folder navigation
  'ArrowUp': 'selectPreviousFolder',
  'ArrowDown': 'selectNextFolder',
  'ArrowLeft': 'collapseFolder',
  'ArrowRight': 'expandFolder',
  'Ctrl/Cmd + Shift + N': 'createNewFolder',

  // Study shortcuts
  'Space': 'showAnswer',
  '1': 'gradeAgain',
  '2': 'gradeHard',
  '3': 'gradeGood',
  '4': 'gradeEasy',
  'u': 'undo',
  'e': 'editCard',
  'Escape': 'exitReview'
};
```

## Application Routes

```typescript
// Route structure for the application
const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '/', component: LibraryView },           // Folder tree + reading view
      { path: '/read/:id', component: ReadingView }    // Specific article reading
    ]
  },
  { path: '/study', component: StudySession },         // Full-screen study mode
  { path: '/stats', component: StatsPage }             // Statistics dashboard
];
```

**Route Descriptions:**
- `/` - Main library view with folder tree, reading panel, and flashcard sidebar
- `/read/:id` - Focused reading view for a specific article
- `/study` - Full-screen study session (replaces entire UI)
- `/stats` - Statistics and analytics dashboard

## Tauri IPC Patterns

### Command Pattern (Frontend → Backend)

```typescript
import { invoke } from '@tauri-apps/api/tauri';

// Folder commands
async function getFolderTree(): Promise<FolderNode[]> {
  return await invoke('get_folder_tree');
}

async function createFolder(name: string, parentId?: number): Promise<void> {
  await invoke('create_folder', { name, parentId });
}

// Reading commands
async function loadArticle(id: number): Promise<Article> {
  return await invoke('load_article', { id });
}

async function markRangeAsRead(textId: number, startPos: number, endPos: number): Promise<void> {
  await invoke('mark_range_as_read', { textId, startPos, endPos });
}

async function getReadRanges(textId: number): Promise<ReadRange[]> {
  return await invoke('get_read_ranges', { textId });
}

async function getParagraphs(textId: number): Promise<Paragraph[]> {
  return await invoke('get_paragraphs', { textId });
}

// Study commands
async function getStudySession(filter: StudyFilter): Promise<Flashcard[]> {
  return await invoke('get_study_session', { filter });
}

async function gradeCard(cardId: number, grade: number): Promise<void> {
  await invoke('grade_card', { cardId, grade });
}

// Statistics commands
async function getReadingStatsByFolder(folderId: number): Promise<ReadingStats> {
  return await invoke('get_reading_stats_by_folder', { folderId });
}

async function getFlashcardStatsByTag(tagId: number): Promise<FlashcardStats> {
  return await invoke('get_flashcard_stats_by_tag', { tagId });
}
```

### Event Pattern (Backend → Frontend)

```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen<ProgressUpdate>('progress-updated', (event) => {
  useReadingStore.setState({
    totalProgress: event.payload.progress
  });
});

// Cleanup
onUnmount(() => unlisten());
```

## Performance Targets

- **Initial Load**: < 1 second
- **Bundle Size**: < 500KB (gzipped)
- **Memory Usage**: < 200MB (< 300MB with large folder trees)
- **Card Transition**: < 100ms
- **IPC Latency**: < 50ms
- **Text Selection**: < 16ms (60fps)
- **Panel Resize**: < 16ms (60fps)
- **Folder Tree Rendering**: < 100ms for 1000+ items (virtualized)
- **Read Range Calculation**: < 200ms for large texts (10,000+ paragraphs)
- **Stats Aggregation**: < 500ms for complex queries

## Development Workflow

1. **Scaffold project:**
   ```bash
   npm create tauri-app
   # Choose React + TypeScript + Vite
   ```

2. **Install dependencies:**
   ```bash
   npm install zustand lexical @lexical/react
   npm install react-resizable-panels @dnd-kit/core
   npx shadcn-ui@latest init
   ```

3. **Implement incrementally (following gap analysis phases):**
   - **Phase 1**: Folder tree and read range tracking
   - **Phase 2**: Resizable panels and paragraph navigation
   - **Phase 3**: Flashcard sidebar integration
   - **Phase 4**: Study session filtering
   - **Phase 5**: Statistics dashboard
   - **Phase 6**: Drag-and-drop and polish

## UX Best Practices

### Keyboard-First Navigation
1. **Reading**: All paragraph navigation, marking read, and flashcard creation accessible via keyboard
2. **Folder Tree**: Full arrow key navigation, expand/collapse, and folder operations
3. **Study**: Complete study sessions without touching mouse
4. **Shortcuts**: Context-aware, discoverable (shown in menus and tooltips)

### Review Interface
1. **Single Focus**: One card at a time
2. **Immediate Feedback**: Show intervals for each grade
3. **Keyboard-First**: Power users should never need mouse
4. **Progress Visibility**: Always show progress and daily limits
5. **Minimal Transitions**: Fast, snappy (< 200ms)
6. **Error Recovery**: Undo button for accidental grades

### Reading Interface
1. **Distraction-Free**: Clean, minimal UI with collapsible panels
2. **Progress Indication**: Visual highlighting of read/unread sections
3. **Easy Selection**: Smooth text selection and highlighting
4. **Context Preservation**: Show recently read text in flashcard sidebar
5. **Paragraph Navigation**: Clear visual indicators and keyboard shortcuts
6. **Flexible Organization**: Drag-and-drop folder/text management

### Folder Tree
1. **Visual Hierarchy**: Clear indentation and expand/collapse icons
2. **Text Counts**: Show number of texts in each folder
3. **Context Menus**: Right-click for quick operations
4. **Drag-and-Drop**: Intuitive reorganization (Phase 6)
5. **Keyboard Navigation**: Full arrow key support

### Statistics Dashboard
1. **Multiple Views**: Filter by folder, tag, article, or total
2. **Clear Metrics**: Prominent display of key statistics
3. **Visual Charts**: Progress bars and retention graphs
4. **Responsive**: Fast aggregation and updates
