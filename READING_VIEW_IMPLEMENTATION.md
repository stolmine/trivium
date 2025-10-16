# Trivium Reading View Implementation - Exploration Summary

## Overview
This document provides a comprehensive analysis of the Reading view implementation in the Trivium codebase, including the current structure, key components, state management, and integration points for potential search functionality.

---

## 1. Reading View Overall Architecture

### Main Entry Point
- **File**: `/Users/why/repos/trivium/src/routes/read/[id].tsx` (ReadPage component)
- **Role**: Main reading interface that displays a single text with highlighting, progress tracking, and flashcard sidebar
- **Layout**: Three-part layout:
  1. Header with navigation and text options (top)
  2. Main content area with highlighted text (center/left)
  3. Collapsible flashcard sidebar (right, hidden on mobile)

### Key Features
- Text display with progressive reading highlights
- Real-time progress calculation and display
- Flashcard creation from selected text
- Keyboard shortcuts (Ctrl+M to toggle read, Ctrl+N to create flashcard)
- Links toggle button (Ctrl+L)
- Rename/delete text options
- Reading progress tracking

---

## 2. Component Structure

### Main Reading Components

#### `src/lib/components/reading/ReadHighlighter.tsx` (390 lines)
**Purpose**: Core text rendering component with highlight capabilities

**Key Responsibilities**:
- Parses content and splits into segments (read/unread/excluded/header)
- Handles markdown link rendering and Wikipedia header formatting
- Manages position mapping between rendered DOM and original content (critical for search)
- Renders text with appropriate styling based on read status

**Key Data Structures**:
```typescript
interface TextSegment {
  text: string
  isRead: boolean
  isExcluded: boolean
  isHeader: boolean
}

interface ReadRange {
  startPosition: number
  endPosition: number
}
```

**Important Functions**:
- `parseExcludedRanges()`: Removes `[[exclude]]` tags from content and returns:
  - `cleanedContent`: Original with tags removed
  - `renderedContent`: Stripped of markdown links and headers
  - `excludedRanges`: Positioned ranges in rendered space
- `renderedPosToCleanedPos()`: Converts DOM positions to cleaned content positions
- `stripMarkdownLinks()`: Removes markdown syntax for position calculation
- `detectHeaderRanges()`: Identifies Wikipedia-style headers

**Styling Classes**:
```css
.excluded-text {} /* Grayed out, muted styling */
.read-header {} /* Gray background, italic, muted */
.clickable-link {} /* Blue, underlined */
/* Read text: black background, white text */
```

#### `src/lib/components/reading/TextSelectionMenu.tsx` (127 lines)
**Purpose**: Context menu for text selection actions

**Keyboard Shortcuts**:
- `Ctrl+M`: Toggle read status on selected text
- `Ctrl+N`: Create flashcard from selected text

**Implementation Details**:
- Uses browser's `window.getSelection()` API
- Calculates start/end positions in DOM text content
- Has DEBUG logging to trace position calculations
- Wraps ReadHighlighter component as ContextMenuTrigger

#### `src/lib/components/reading/ReadingProgress.tsx`
**Purpose**: Displays reading progress (minimal component)

#### `src/lib/components/reading/index.ts`
**Exports**:
```typescript
export { ArticleViewer }
export { ReadingProgress }
export { IngestModal }
export { TextSelectionMenu }
export { ReadHighlighter, parseExcludedRanges }
```

---

## 3. Header/Top Bar Structure

### Location
**File**: `/Users/why/repos/trivium/src/routes/read/[id].tsx` (lines 156-218)

### Components in Header
```jsx
<header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
  <div className="container mx-auto px-6 py-4 max-w-4xl">
    <div className="flex items-center justify-between">
      {/* LEFT SECTION: Back button + Title */}
      <div className="flex items-center gap-4">
        <Button onClick={() => navigate(-1)}>ChevronLeft</Button>
        <div>
          <h1>{currentText.title}</h1>
          {currentText.author && <p>by {currentText.author}</p>}
        </div>
      </div>

      {/* RIGHT SECTION: Progress + Buttons */}
      <div className="flex items-center gap-4">
        {/* Progress display */}
        <div className="text-sm text-muted-foreground">
          Progress: <span className="font-medium">{totalProgress}%</span>
        </div>

        {/* Links toggle button */}
        <Button
          variant={linksEnabled ? 'default' : 'outline'}
          size="icon"
          onClick={toggleLinks}
          title="Links enabled/disabled (Ctrl+L)"
        >
          <Link className="h-4 w-4" />
        </Button>

        {/* More options dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
              <Edit2 /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Collapse sidebar button (mobile) */}
        <Button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
          Cards
        </Button>
      </div>
    </div>
  </div>
</header>
```

### Current Buttons in Header
1. **Back Button**: Navigate to previous page
2. **Progress Display**: Shows read percentage
3. **Links Toggle Button** (Link icon): Toggle clickable links - location where search button could go
4. **More Options** (⋮): Rename/Delete options
5. **Cards Toggle** (mobile): Show/hide sidebar

### Integration Point for Search
The **Links Toggle Button** position (right side of header) would be the natural location for a search/find button, or it could go in the "More Options" dropdown menu.

---

## 4. Keyboard Shortcuts

### Reading View Shortcuts
**In TextSelectionMenu**:
- `Ctrl+M`: Toggle read status on selected text
- `Ctrl+N`: Create flashcard from selected text

**For Dialog Input** (lines 85-113 in ReadPage):
- `Enter`: Confirm rename/delete actions

### Global Shortcuts (from `src/hooks/useKeyboardShortcuts.ts`)
- `Ctrl+B`: Toggle sidebar
- `Ctrl+L`: Toggle links
- `Ctrl+1`: Go to Dashboard
- `Ctrl+2`: Go to Library
- `Ctrl+3`: Go to Review
- `Ctrl+N`: Open ingest view (conflicts with flashcard creation!)
- `Ctrl+/`: Show shortcuts help

### Keyboard Handling Architecture
**Hook**: `src/hooks/useKeyboardShortcuts.ts` (195 lines)
- Central keyboard shortcut system
- Detects Mac vs Windows (uses Cmd on Mac, Ctrl on Windows)
- Avoids triggering on input/textarea elements
- Categorized shortcuts for help display

**Utility**: `src/lib/utils/keyboard.ts`
- `KeyboardManager` class for managing shortcuts
- Can register/unregister shortcuts dynamically
- Global singleton: `keyboardManager`

### Recommended Search Shortcut
- `Ctrl+F` or `Cmd+F`: Find text in current article (standard browser behavior)
- Alternative: `Ctrl+Shift+F` if need to avoid browser default

---

## 5. State Management (Zustand Stores)

### Primary Store: `src/lib/stores/reading.ts`

```typescript
interface ReadingState {
  texts: Text[]
  currentText: Text | null
  readRanges: ReadRange[]
  excludedRanges: ExcludedRange[]
  paragraphs: Paragraph[]
  currentParagraphIndex: number
  totalProgress: number
  isLoading: boolean
  error: string | null

  // Actions
  loadTexts: () => Promise<void>
  loadText: (id: number) => Promise<void>
  createText: (request: CreateTextRequest) => Promise<Text>
  setCurrentText: (text: Text | null) => void
  markRangeAsRead: (textId, startPos, endPos) => Promise<void>
  unmarkRangeAsRead: (textId, startPos, endPos) => Promise<void>
  isRangeRead: (startPos, endPos) => boolean
  isRangeExcluded: (startPos, endPos) => boolean
  setExcludedRanges: (ranges: ExcludedRange[]) => void
  getReadRanges: (textId) => Promise<void>
  getParagraphs: (textId) => Promise<void>
  calculateProgress: (textId) => Promise<void>
  navigateToNextParagraph: () => void
  navigateToPreviousParagraph: () => void
}
```

**Key Observations**:
- All state is reactive via Zustand
- Read ranges are in rendered space (after markdown stripping)
- Excluded ranges also in rendered space
- Cache invalidation via `invalidateProgressCache()` and `invalidateFolderProgressCache()`

### Secondary Store: `src/lib/stores/settings.ts`

```typescript
interface SettingsState {
  linksEnabled: boolean
  toggleLinks: () => void
  setLinksEnabled: (enabled: boolean) => void
}
```

**Features**:
- Persisted to localStorage via Zustand middleware
- Simple boolean toggle for link visibility

### Integration with API
**File**: `src/lib/utils/tauri.ts`

API endpoints used in reading:
- `api.texts.list()`: Get all texts
- `api.texts.get(id)`: Get specific text
- `api.texts.create()`: Create new text
- `api.reading.markRangeAsRead()`: Mark range as read
- `api.reading.unmarkRangeAsRead()`: Unmark range
- `api.reading.getReadRanges()`: Fetch read ranges
- `api.reading.getParagraphs()`: Get paragraph info
- `api.reading.calculateProgress()`: Get progress %

---

## 6. Text Selection and Highlighting

### Text Selection Flow
1. User selects text in reading content
2. Context menu appears (ContextMenuTrigger from TextSelectionMenu)
3. User chooses "Toggle Read" or "Create Flashcard"
4. Position calculation happens via DOM selection API

### Position Mapping System
**Critical for Search Implementation**:

The codebase handles three different text representations:
1. **Original Content**: With markdown links and headers
2. **Cleaned Content**: Links/headers remain but exclude tags are removed
3. **Rendered Content**: Markdown syntax completely stripped (what user sees)

**Key Functions** (in ReadHighlighter.tsx):
```typescript
// Convert DOM selection positions to internal positions
renderedPosToCleanedPos(renderedPos: number, cleanedContent: string): number

// Parse excluded ranges from [[exclude]] markers
parseExcludedRanges(content: string): {
  cleanedContent: string
  renderedContent: string
  excludedRanges: ExcludedRange[]
}
```

### Highlighting Implementation
**Method**: CSS classes + React segments
```typescript
// Segments are created with properties:
- text: string (actual text content)
- isRead: boolean (background: black, color: white)
- isExcluded: boolean (gray muted styling)
- isHeader: boolean (gray italic styling)

// Rendered as:
segments.map((segment, idx) => (
  <span key={idx} className={segmentClassName} style={segmentStyle}>
    {/* dangerously render with link HTML */}
  </span>
))
```

### Link Rendering
- When `linksEnabled = true`: Markdown links and URLs become clickable `<a>` tags
- When `linksEnabled = false`: Markdown stripped to text only
- Handled in `renderTextWithLinks()` function

---

## 7. Current Search/Find Functionality

### Status: **NO EXISTING SEARCH IMPLEMENTATION**

Grep results show references to "search" only in:
- FlashcardSidebar.tsx: Variable names like `searchText` (not relevant)
- Review components: Card searching (different feature)
- Tree-utils: Folder searching (different feature)

### What DOES Exist for Text Location
1. **Paragraph Navigation** (unused in UI):
   - `navigateToNextParagraph()`
   - `navigateToPreviousParagraph()`
   - `currentParagraphIndex` state
   - Paragraph data structure with positions

2. **Position Awareness**:
   - Text content is position-indexed
   - Read ranges track start/end positions
   - Position mapping functions available

---

## 8. Integration Architecture for Search

### Data Flow for Search Implementation

```
User presses Ctrl+F
    ↓
Global keyboard handler (useKeyboardShortcuts hook)
    ↓
Show search modal/bar in header
    ↓
User types search query
    ↓
Search engine:
  1. Get currentText from reading store
  2. Get renderedContent from parseExcludedRanges()
  3. Find all occurrences of search term
  4. Store matches with rendered positions
    ↓
Render highlights:
  1. Convert rendered positions back to cleaned positions
  2. Pass to ReadHighlighter as new highlighting layer
  3. Render search highlights (different color from read highlights)
    ↓
Navigation:
  1. Ctrl+G or "Next" button → jump to next match
  2. Ctrl+Shift+G or "Prev" button → jump to previous match
  3. Scroll content into view
```

### Critical Components to Modify/Create

1. **New Search Store** (`src/lib/stores/search.ts`):
   - Search query
   - Match positions
   - Current match index
   - Visibility toggle

2. **New Search Component** (`src/lib/components/reading/SearchBar.tsx`):
   - Input field
   - Navigation buttons
   - Result counter ("1 of 5")
   - Close button

3. **Highlight Integration** in `ReadHighlighter.tsx`:
   - Add search match highlighting layer
   - Different styling (e.g., yellow background)
   - Distinguish search matches from read ranges

4. **Position Conversion Helper**:
   - Convert search match positions (rendered) to segment-aware positions
   - Handle markdown link/header edge cases

5. **Keyboard Handler Update** in `useKeyboardShortcuts.ts`:
   - Add Ctrl+F binding
   - Add Ctrl+G (next match) binding
   - Add Ctrl+Shift+G (prev match) binding

---

## 9. File Structure Summary

### Reading-Related Files

```
/src
├── routes/
│   └── read/
│       └── [id].tsx (439 lines) - Main ReadPage component
│
├── lib/
│   ├── components/reading/
│   │   ├── ReadHighlighter.tsx (390 lines) - Core rendering
│   │   ├── TextSelectionMenu.tsx (127 lines) - Context menu
│   │   ├── ReadingProgress.tsx - Progress display
│   │   ├── ArticleViewer.tsx - Legacy?
│   │   ├── IngestModal.tsx - Ingest dialog
│   │   └── index.ts - Exports
│   │
│   ├── stores/
│   │   ├── reading.ts (208 lines) - Zustand store
│   │   ├── settings.ts (28 lines) - Settings store
│   │   ├── flashcard.ts - Related feature
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── keyboard.ts (58 lines) - KeyboardManager
│   │   ├── selection.ts - Selection utilities
│   │   ├── tauri.ts - API client
│   │   └── index.ts
│   │
│   ├── types/
│   │   ├── reading.ts - ReadRange, Paragraph, ExcludedRange
│   │   └── index.ts
│   │
│   └── hooks/
│       └── useTextProgress.ts
│
├── hooks/
│   └── useKeyboardShortcuts.ts (195 lines) - Global shortcuts
│
├── components/
│   ├── shared/
│   │   └── ShortcutHelp.tsx (115 lines) - Shortcuts modal
│   └── shell/
│       └── AppShell.tsx - Layout wrapper
│
└── index.css - Styling (.reading-content, .excluded-text, .read-header, .clickable-link)
```

### Related Backend/API Files

```
/src-tauri/src
├── commands/
│   └── reading.rs - Backend endpoints
├── services/
│   └── reading_service.rs - Business logic
└── models/
    └── reading.rs - Data models
```

---

## 10. Current CSS Classes

### Reading Content Styling
```css
.reading-content {
  font-family: 'Charter', 'Georgia', 'Cambria', serif;
  font-size: 1.25rem;
  line-height: 1.8;
  max-width: 70ch;
}

.reading-content p {
  margin-bottom: 1rem;
}

.excluded-text {
  background-color: var(--muted);
  color: var(--muted-foreground);
  border-left: 3px solid var(--border);
  padding-left: 0.75rem;
  /* ... more padding ... */
  display: block;
  border-radius: 0.25rem;
}

.read-header {
  background-color: rgba(128, 128, 128, 0.2);
  color: var(--muted-foreground);
  padding: 0 4px;
  border-radius: 4px;
  font-style: italic;
}

.clickable-link {
  color: hsl(217, 91%, 60%);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  /* transitions and hover states */
}
```

### Suggested Search Highlight Class
```css
.search-match {
  background-color: hsl(48, 100%, 50%);  /* Yellow */
  color: var(--foreground);
  padding: 0 2px;
  border-radius: 2px;
  animation: pulse-subtle 1s ease-in-out;
}

.search-match.current {
  background-color: hsl(48, 100%, 40%);  /* Darker yellow */
  box-shadow: 0 0 0 2px hsl(48, 100%, 70%);
}

@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
```

---

## 11. Integration Points for Search Functionality

### Location 1: Header Top Bar
**File**: `/Users/why/repos/trivium/src/routes/read/[id].tsx` (lines 170-216)
- Right section after Links toggle button
- Can add Search icon button
- Could trigger search bar/modal

### Location 2: SearchBar Component
- Insert below header, full width or contained
- Fixed position sticky below header
- Similar to IDE search UI

### Location 3: ReadHighlighter Modification
- Add `searchMatches?: SearchMatch[]` prop
- Add search highlight rendering layer
- Preserve existing highlighting logic

### Location 4: Keyboard Handling
- File: `src/hooks/useKeyboardShortcuts.ts`
- Add search shortcuts to global shortcuts
- Can trigger from readPage or globally

### Location 5: New Store
- File: `src/lib/stores/search.ts` (new)
- Manage search state independent of reading state
- Subscribe to text changes to reset search

---

## 12. Recommended Implementation Strategy

### Phase 1: Core Search Engine
1. Create `src/lib/utils/searchEngine.ts`
   - Function to find all matches in text
   - Handle case-insensitive search
   - Handle whole-word option
   - Return match positions in rendered space

2. Create `src/lib/stores/search.ts`
   - Store search query, matches, current index
   - Reset on text change
   - Actions to navigate matches

### Phase 2: UI Components
1. Create `src/lib/components/reading/SearchBar.tsx`
   - Search input field
   - Navigation buttons
   - Result counter
   - Keyboard shortcuts

2. Modify `src/lib/components/reading/ReadHighlighter.tsx`
   - Accept search matches prop
   - Render search highlights
   - Handle layering with existing highlights

### Phase 3: Integration
1. Modify `src/routes/read/[id].tsx`
   - Add SearchBar component in header
   - Wire up search store
   - Handle Ctrl+F keyboard shortcut

2. Update `src/hooks/useKeyboardShortcuts.ts`
   - Add search-related shortcuts
   - Update ShortcutHelp display

3. Add CSS for search highlighting

### Phase 4: Polish
1. Add animations for match highlighting
2. Test with various text types (with links, headers, excluded regions)
3. Handle edge cases (empty matches, very long texts)
4. Add accessibility features (ARIA labels)

---

## 13. Key Challenges & Solutions

### Challenge 1: Position Mapping
**Problem**: Search works in rendered space (DOM), but highlighting needs segment awareness
**Solution**: Use existing `renderedPosToCleanedPos()` function, then break segments at search boundaries

### Challenge 2: Search in Excluded Text
**Problem**: Should search include excluded regions?
**Consideration**: Could add toggle "Search excluded text"

### Challenge 3: Link/Header Edge Cases
**Problem**: Search term might span across markdown syntax
**Solution**: Work in rendered space (stripped of markdown), convert positions after

### Challenge 4: Performance
**Problem**: Large texts (100k+ chars) might slow down search
**Solution**: Implement debouncing in search input, consider web worker for very large texts

### Challenge 5: Accessibility
**Problem**: Screen readers need context for search highlights
**Solution**: Use ARIA attributes, semantic HTML for results counter

---

## 14. Summary of Current Architecture

### Strengths
- Clean separation of concerns (store, component, utils)
- Zustand for simple, reactive state
- Position-aware highlighting system already in place
- Keyboard shortcut infrastructure exists
- Markdown/link handling already sophisticated

### Ready for Search Implementation
- Position mapping functions available
- Keyboard shortcut system established
- Component composition pattern clear
- UI component library ready
- CSS structure supports new highlight class

### Design Decisions Made
- Text positioning uses rendered space (after markdown stripping)
- Read ranges stored separately from text content
- Zustand stores for all state
- React hooks for keyboard handling
- Context menu for text operations

---

## Conclusion

The Trivium Reading view is well-architected for adding search functionality. The critical components are:

1. **Header Location**: Right side after Links toggle button
2. **State Location**: New `src/lib/stores/search.ts`
3. **Component Location**: `src/lib/components/reading/SearchBar.tsx`
4. **Integration Point**: ReadHighlighter.tsx for rendering
5. **Keyboard Integration**: useKeyboardShortcuts hook

The existing position mapping system (`renderedPosToCleanedPos`) and segment-aware rendering (`TextSegment`) make it straightforward to add search highlighting without disrupting existing features.

