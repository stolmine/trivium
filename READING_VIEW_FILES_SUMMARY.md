# Reading View Files - Summary Table

## Core Reading Components

| File | Lines | Purpose | Key Exports |
|------|-------|---------|-------------|
| `src/routes/read/[id].tsx` | 439 | Main reading page component, layout, header | `ReadPage` |
| `src/lib/components/reading/ReadHighlighter.tsx` | 390 | Text rendering with highlighting | `ReadHighlighter, parseExcludedRanges` |
| `src/lib/components/reading/TextSelectionMenu.tsx` | 127 | Context menu for selected text | `TextSelectionMenu` |
| `src/lib/components/reading/index.ts` | 6 | Component exports | Exports all reading components |

## State Management

| File | Lines | Purpose | Key Exports |
|------|-------|---------|-------------|
| `src/lib/stores/reading.ts` | 208 | Zustand store for reading state | `useReadingStore` |
| `src/lib/stores/settings.ts` | 28 | Settings store (localStorage) | `useSettingsStore` |
| `src/lib/stores/index.ts` | 5 | Store re-exports | All stores |

## Keyboard & Utilities

| File | Lines | Purpose | Key Exports |
|------|-------|---------|-------------|
| `src/hooks/useKeyboardShortcuts.ts` | 195 | Global keyboard shortcut handler | `useKeyboardShortcuts, useGlobalShortcuts` |
| `src/lib/utils/keyboard.ts` | 58 | Keyboard manager class | `KeyboardManager, keyboardManager` |
| `src/components/shared/ShortcutHelp.tsx` | 115 | Shortcuts help modal | `ShortcutHelp` |

## Type Definitions

| File | Purpose | Key Types |
|------|---------|-----------|
| `src/lib/types/reading.ts` | Reading-related types | `ReadRange, Paragraph, ExcludedRange` |
| `src/lib/types/article.ts` | Article/Text types | `Text, Article, CreateTextRequest` |
| `src/lib/types/index.ts` | Type exports | All type re-exports |

## Supporting Files

| File | Purpose |
|------|---------|
| `src/index.css` | Styling for reading content (.reading-content, .excluded-text, .read-header, .clickable-link) |
| `src/lib/utils/tauri.ts` | API client for backend communication |
| `src/lib/hooks/useTextProgress.ts` | Progress calculation and caching |

## Backend (Tauri)

| Path | Purpose |
|------|---------|
| `src-tauri/src/commands/reading.rs` | API endpoints for reading |
| `src-tauri/src/services/reading_service.rs` | Business logic |
| `src-tauri/src/models/reading.rs` | Database models |

---

## Key Functions Reference

### In ReadHighlighter.tsx

```typescript
parseExcludedRanges(content: string): {
  cleanedContent: string
  renderedContent: string
  excludedRanges: ExcludedRange[]
}
```
Removes `[[exclude]]` tags and returns three versions of content.

```typescript
renderedPosToCleanedPos(renderedPos: number, cleanedContent: string): number
```
Converts position from rendered space to cleaned space, handling markdown links/headers.

```typescript
stripMarkdownLinks(text: string): string
```
Removes all markdown syntax: links `[text](url)` and headers `== text ==`.

```typescript
detectHeaderRanges(content: string): HeaderRange[]
```
Finds all Wikipedia-style header ranges `== text ==`.

### In TextSelectionMenu.tsx

```typescript
handleToggleRead(): void
```
Gets DOM selection, calculates positions, calls store action.

```typescript
handleCreateFlashcard(): void
```
Gets selected text and opens flashcard creator dialog.

### In useKeyboardShortcuts.ts

```typescript
useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void
```
Hook to register shortcuts for component.

```typescript
useGlobalShortcuts(onToggleSidebar, onToggleHelp): KeyboardShortcut[]
```
Returns all global shortcuts array.

```typescript
getShortcutLabel(shortcut: KeyboardShortcut): string
```
Formats shortcut for display (handles Cmd vs Ctrl, etc).

---

## Store Actions

### Reading Store (`useReadingStore`)

```typescript
loadText(id: number): Promise<void>
markRangeAsRead(textId, startPos, endPos): Promise<void>
unmarkRangeAsRead(textId, startPos, endPos): Promise<void>
isRangeRead(startPos, endPos): boolean
isRangeExcluded(startPos, endPos): boolean
setExcludedRanges(ranges: ExcludedRange[]): void
getReadRanges(textId): Promise<void>
getParagraphs(textId): Promise<void>
calculateProgress(textId): Promise<void>
navigateToNextParagraph(): void
navigateToPreviousParagraph(): void
```

### Settings Store (`useSettingsStore`)

```typescript
toggleLinks(): void
setLinksEnabled(enabled: boolean): void
```

---

## CSS Classes

| Class | Purpose | Location |
|-------|---------|----------|
| `.reading-content` | Main content wrapper | `index.css` line 193 |
| `.excluded-text` | Excluded regions | `index.css` line 276 |
| `.read-header` | Wikipedia headers | `index.css` line 289 |
| `.clickable-link` | Hyperlinks | `index.css` line 297 |

---

## Component Props

### ReadHighlighter

```typescript
interface ReadHighlighterProps {
  content: string
  readRanges: ReadRange[]
  className?: string
  onExcludedRangesParsed?: (excludedRanges: ExcludedRange[]) => void
  linksEnabled?: boolean
}
```

### TextSelectionMenu

```typescript
interface TextSelectionMenuProps {
  children: React.ReactNode
  textId: number
}
```

### FlashcardSidebar

```typescript
interface FlashcardSidebarProps {
  textId: number
  isCollapsed: boolean
  onToggleCollapse: () => void
}
```

---

## File Dependencies

```
ReadPage
├─ useReadingStore (reading.ts)
├─ useLibraryStore
├─ useSettingsStore (settings.ts)
├─ TextSelectionMenu
│  ├─ useReadingStore
│  └─ ReadHighlighter
│     ├─ parseExcludedRanges (util)
│     └─ renderTextWithLinks (util)
└─ FlashcardSidebar
   └─ useFlashcardStore

useKeyboardShortcuts (hook)
├─ useSettingsStore
└─ useNavigate

ShortcutHelp (component)
└─ useKeyboardShortcuts (hook)
```

---

## Integration Points

### For Search Feature (To Be Added)

| Integration Point | File | Type |
|-------------------|------|------|
| Search Bar UI | `src/lib/components/reading/SearchBar.tsx` (NEW) | Component |
| Search State | `src/lib/stores/search.ts` (NEW) | Store |
| Search Engine | `src/lib/utils/searchEngine.ts` (NEW) | Utility |
| Rendering | `src/lib/components/reading/ReadHighlighter.tsx` | Modify |
| Keyboard | `src/hooks/useKeyboardShortcuts.ts` | Update |
| Styling | `src/index.css` | Add |
| Layout | `src/routes/read/[id].tsx` | Integrate |

---

## Performance Characteristics

| Component | Computation | Trigger | Cost |
|-----------|-----------|---------|------|
| ReadHighlighter | Segment computation | useMemo on content/readRanges | O(n) string ops |
| Text selection | Position calculation | Per selection | O(n) DOM traversal |
| parseExcludedRanges | Regex matching | On load | O(n) regex |
| renderedPosToCleanedPos | Position mapping | Per selection | O(n) string walking |

For large texts (100k+ characters), consider debouncing or web workers.

