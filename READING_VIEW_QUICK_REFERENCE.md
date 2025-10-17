# Reading View Quick Reference

## Critical File Locations

### Main Components
- **ReadPage**: `/Users/why/repos/trivium/src/routes/read/[id].tsx` (439 lines)
  - Main entry point for reading view
  - Header with back button, title, progress, links toggle, options menu
  - Content area with ReadHighlighter wrapped in TextSelectionMenu
  - Right sidebar with FlashcardSidebar

- **ReadHighlighter**: `/Users/why/repos/trivium/src/lib/components/reading/ReadHighlighter.tsx` (390 lines)
  - Core text rendering with segment-based highlighting
  - Position mapping functions (critical for search)
  - Markdown/link handling

- **TextSelectionMenu**: `/Users/why/repos/trivium/src/lib/components/reading/TextSelectionMenu.tsx` (127 lines)
  - Context menu for text selection
  - Ctrl+M: Toggle read | Ctrl+N: Create flashcard

### State Management
- **Reading Store**: `/Users/why/repos/trivium/src/lib/stores/reading.ts` (208 lines)
  - Zustand store with text, readRanges, progress state
  
- **Settings Store**: `/Users/why/repos/trivium/src/lib/stores/settings.ts` (28 lines)
  - Simple linksEnabled toggle

### Keyboard Shortcuts
- **useKeyboardShortcuts**: `/Users/why/repos/trivium/src/hooks/useKeyboardShortcuts.ts` (195 lines)
  - Global shortcut handler
  - Mac vs Windows detection
  - Shortcut categories

### UI Components
- **ShortcutHelp**: `/Users/why/repos/trivium/src/components/shared/ShortcutHelp.tsx` (115 lines)
  - Modal displaying all shortcuts

## Key Concepts

### Position Space
Three different text representations to understand:
1. **Rendered Space**: What user sees (no markdown)
2. **Cleaned Space**: Original markdown, no exclude tags
3. **Original Space**: Full content with exclude tags

### Critical Functions
```typescript
parseExcludedRanges(content)        // Returns: cleanedContent, renderedContent, excludedRanges
renderedPosToCleanedPos(pos, text)  // Convert DOM position to internal position
stripMarkdownLinks(text)            // Remove markdown for position calculation
detectHeaderRanges(content)         // Find Wikipedia headers
```

### Text Segments
ReadHighlighter breaks content into TextSegment objects:
```typescript
{
  text: string
  isRead: boolean        // Rendered with black bg + white text
  isExcluded: boolean    // Grayed out styling
  isHeader: boolean      // Gray + italic styling
}
```

## For Search Implementation

### Where to Add Search Bar
- Header right section: `/Users/why/repos/trivium/src/routes/read/[id].tsx` lines 170-216
- After Links toggle button

### Where to Add Search Store
- New file: `/Users/why/repos/trivium/src/lib/stores/search.ts`
- Export from: `/Users/why/repos/trivium/src/lib/stores/index.ts`

### Where to Add Search Component
- New file: `/Users/why/repos/trivium/src/lib/components/reading/SearchBar.tsx`
- Export from: `/Users/why/repos/trivium/src/lib/components/reading/index.ts`

### Where to Add Search Highlighting
- Modify: `/Users/why/repos/trivium/src/lib/components/reading/ReadHighlighter.tsx`
- Add searchMatches prop
- Add .search-match CSS class to index.css

### Keyboard Shortcuts
- Update: `/Users/why/repos/trivium/src/hooks/useKeyboardShortcuts.ts`
- Add Ctrl+F binding
- Add Ctrl+G / Ctrl+Shift+G for navigation

## CSS Classes Available
```css
.reading-content        /* Main content wrapper */
.excluded-text          /* Excluded regions styling */
.read-header            /* Header styling */
.clickable-link         /* Link styling (blue, underlined) */
```

## Current Keyboard Shortcuts
- Ctrl+M: Toggle read on selected text
- Ctrl+N: Create flashcard (conflicts with global ingest!)
- Ctrl+L: Toggle links
- Ctrl+B: Toggle sidebar (global)
- Ctrl+/: Show shortcuts (global)

## Architecture Patterns
- **State**: Zustand for all stores
- **Effects**: React useEffect hooks
- **Keyboard**: Global event listeners on window
- **Position Tracking**: Rendered space as primary
- **Highlighting**: CSS classes + React segments
- **Styling**: Tailwind CSS + index.css custom rules

## Data Flow
1. User interaction → Keyboard handler / Click handler
2. Handler → Store update (Zustand)
3. Store change → Component re-render (React)
4. ReadHighlighter computes segments from readRanges
5. Segments rendered with appropriate CSS classes

## Performance Considerations
- Position mapping uses string operations (could be slow for 100k+ texts)
- ReadHighlighter segments computed in useMemo on content/readRanges change
- Search should debounce input to avoid too-frequent recalculations

## Accessibility Features
- ARIA labels on buttons
- Keyboard navigation support
- ShortcutHelp modal documents all shortcuts

