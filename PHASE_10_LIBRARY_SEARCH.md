# Phase 10: Library Search Feature - Implementation Plan

**Status**: PLANNING
**Branch**: (to be created from main)
**Estimated Time**: 4-6 hours
**Priority**: HIGH - Quality of life feature for users with large libraries

---

## Overview

Implement a professional search feature for the library sidebar that filters the hierarchical folder/text tree in real-time as users type. This feature mirrors the successful Phase 9 text search implementation but focuses on searching article/text titles (not content) with folder name support.

---

## Features to Implement

### Core Functionality
- Search through text/article titles in the library
- Optional: Search through folder names
- Real-time filtering of the library tree as user types
- Debounced input (300ms like text search)
- Case-insensitive search by default
- Case-sensitive toggle option (consistent with text search)
- Whole-word toggle option (consistent with text search)
- Highlight matching text in titles

### User Interface
- Search button in library header (sidebar)
- Reuse SearchBar component or create LibrarySearchBar variant
- Show/hide search bar on button click or hotkey
- Match counter showing number of matches
- Clear/close functionality

### Keyboard Shortcuts
- `Shift+Cmd+F` / `Shift+Ctrl+F` - Open library search
- `Enter` - Navigate to next match (expand and scroll to it)
- `Shift+Enter` - Navigate to previous match
- `Escape` - Close search

---

## Architecture Overview

### Component Structure

**Decision: Create LibrarySearchBar component (separate from SearchBar)**

**Rationale:**
- SearchBar is tightly coupled to reading view (text content search)
- Library search has different behavior (tree filtering vs content highlighting)
- Different match navigation (expand folders, scroll to items vs scroll to text spans)
- Keeps concerns separated and code maintainable

**Alternative Considered:** Reuse SearchBar with props
- Rejected because: Too many conditional branches would make component complex
- Different state management needs (filtering vs highlighting)

### State Management

**Decision: Create librarySearch store (separate from search store)**

**Location:** `/src/lib/stores/librarySearch.ts`

**State Shape:**
```typescript
interface LibrarySearchState {
  isOpen: boolean;
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  matchedTextIds: number[];      // IDs of texts that match
  matchedFolderIds: string[];    // IDs of folders that match (optional)
  currentMatchIndex: number;      // Current match in navigation

  // Actions
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  setMatches: (textIds: number[], folderIds: string[]) => void;
  nextMatch: () => void;
  previousMatch: () => void;
  toggleCaseSensitive: () => void;
  toggleWholeWord: () => void;
  reset: () => void;
}
```

### Search Logic Location

**Decision: Frontend filtering (no backend queries)**

**Rationale:**
- Library data is already loaded in libraryStore
- Typical libraries will have 10-1000 texts (small dataset)
- Real-time filtering requires instant results
- No network latency or database overhead
- Consistent with existing frontend architecture

**Implementation:**
- Search algorithm in `/src/lib/utils/librarySearch.ts`
- Filters existing library data from libraryStore
- Updates librarySearch store with matched IDs

---

## Files to Create

### 1. `/src/lib/stores/librarySearch.ts` (~100 lines)
**Purpose:** Zustand store for library search state
**Content:**
- Search open/close state
- Query string with case/whole-word options
- Matched item IDs (texts and folders)
- Current match index for navigation
- Actions for all state mutations

### 2. `/src/lib/utils/librarySearch.ts` (~80 lines)
**Purpose:** Search algorithm utilities
**Content:**
```typescript
export interface LibrarySearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  searchFolders: boolean;  // Whether to search folder names
}

export interface LibrarySearchResults {
  textIds: number[];
  folderIds: string[];
}

export function searchLibrary(
  folders: Folder[],
  texts: Text[],
  query: string,
  options: LibrarySearchOptions
): LibrarySearchResults;
```

### 3. `/src/lib/components/library/LibrarySearchBar.tsx` (~180 lines)
**Purpose:** Search UI component for library
**Content:**
- Similar layout to SearchBar but adapted for library
- Match counter format: "5 matches" or "5 texts, 2 folders"
- No next/previous buttons (navigates via tree expansion)
- Case-sensitive and whole-word toggles
- Close button

**Layout:**
```
[Search Input] [5 matches] [Aa] [Ab|] [×]
```

### 4. `/src/lib/hooks/useLibrarySearchEffect.ts` (~40 lines)
**Purpose:** Custom hook to perform search when query/options change
**Content:**
- Watches librarySearch store query/options
- Reads library data from libraryStore
- Calls searchLibrary utility
- Updates librarySearch store with results

---

## Files to Modify

### 1. `/src/components/shell/Sidebar.tsx`
**Changes:**
- Add search button to library header (next to sort and create folder buttons)
- Import and integrate LibrarySearchBar component
- Show/hide LibrarySearchBar based on librarySearch.isOpen
- Add keyboard shortcut handler for Shift+Cmd/Ctrl+F

**Location:** Around line 133 (library header section)

```tsx
// Add to library header (around line 133)
<div className="flex items-center gap-1">
  <Button
    variant="ghost"
    size="sm"
    className="h-6 w-6 p-0"
    onClick={() => librarySearchStore.openSearch()}
    title="Search library (Shift+Ctrl+F)"
    aria-label="Search library"
  >
    <Search className="h-4 w-4" />
  </Button>
  {/* existing sort and create folder buttons */}
</div>

// Add before LibraryTree (around line 177)
{librarySearch.isOpen && <LibrarySearchBar />}
```

### 2. `/src/components/library/LibraryTree.tsx`
**Changes:**
- Accept optional `filteredTextIds` and `filteredFolderIds` props
- Filter tree nodes to show only matches when search is active
- Auto-expand folders that contain matches
- Highlight matching text in titles (add CSS classes)
- Show "No matches" state when search has no results

**Filtering Logic:**
```typescript
// When search is active, filter tree
const filteredTree = useMemo(() => {
  if (!librarySearch.isOpen || librarySearch.query === '') {
    return tree; // Show full tree
  }

  // Filter to show only matched items and their ancestors
  return filterTreeByMatches(
    tree,
    librarySearch.matchedTextIds,
    librarySearch.matchedFolderIds
  );
}, [tree, librarySearch.isOpen, librarySearch.query, librarySearch.matchedTextIds, librarySearch.matchedFolderIds]);
```

### 3. `/src/components/library/FolderNode.tsx`
**Changes:**
- Accept optional `highlightQuery` prop
- Highlight matching text in folder name if it matches
- Auto-expand folder if it contains matches (when search active)

### 4. `/src/components/library/TextNode.tsx`
**Changes:**
- Accept optional `highlightQuery` prop
- Highlight matching text in title if it matches
- Add visual indicator for matched items (subtle background color)

### 5. `/src/lib/utils/tauri.ts` (Optional - if backend search needed later)
**Changes:** None for Phase 10 (frontend filtering only)

---

## Implementation Steps

### Step 1: Create Library Search Store (30 min)
1. Create `/src/lib/stores/librarySearch.ts`
2. Define LibrarySearchState interface
3. Implement all actions (open, close, setQuery, etc.)
4. Add wraparound navigation for matches
5. Test store in browser console

### Step 2: Create Search Algorithm Utility (45 min)
1. Create `/src/lib/utils/librarySearch.ts`
2. Implement `searchLibrary()` function
3. Handle case-sensitive/insensitive matching
4. Handle whole-word matching with word boundaries
5. Return matched text IDs and folder IDs
6. Write unit tests for edge cases

**Algorithm Pseudocode:**
```typescript
function searchLibrary(folders, texts, query, options) {
  if (!query.trim()) return { textIds: [], folderIds: [] };

  const regex = buildSearchRegex(query, options);

  const textIds = texts
    .filter(text => regex.test(text.title))
    .map(text => text.id);

  const folderIds = options.searchFolders
    ? folders.filter(folder => regex.test(folder.name)).map(f => f.id)
    : [];

  return { textIds, folderIds };
}
```

### Step 3: Create LibrarySearchBar Component (60 min)
1. Create `/src/lib/components/library/LibrarySearchBar.tsx`
2. Copy structure from SearchBar.tsx
3. Adapt for library search (remove next/prev buttons)
4. Update match counter format
5. Wire up to librarySearch store
6. Add debounced input (300ms)
7. Test component in isolation

### Step 4: Create Search Effect Hook (20 min)
1. Create `/src/lib/hooks/useLibrarySearchEffect.ts`
2. Watch query and options changes
3. Debounce search execution
4. Call searchLibrary utility
5. Update store with results

### Step 5: Integrate Search into Sidebar (30 min)
1. Modify `/src/components/shell/Sidebar.tsx`
2. Add search button to library header
3. Add LibrarySearchBar component
4. Add keyboard shortcut handler (Shift+Cmd/Ctrl+F)
5. Test show/hide functionality

### Step 6: Update LibraryTree for Filtering (90 min)
1. Modify `/src/components/library/LibraryTree.tsx`
2. Create `filterTreeByMatches()` utility function
3. Filter tree to show only matches and ancestors
4. Auto-expand folders containing matches
5. Handle empty results state
6. Test with various search queries

### Step 7: Add Highlighting to Tree Nodes (45 min)
1. Modify `/src/components/library/FolderNode.tsx`
2. Modify `/src/components/library/TextNode.tsx`
3. Create `highlightMatchingText()` utility function
4. Wrap matching substrings in `<mark>` tags or spans
5. Add CSS classes for highlighted text
6. Test highlighting with various cases

### Step 8: Polish and Testing (60 min)
1. Test all keyboard shortcuts
2. Test case-sensitive/whole-word toggles
3. Test edge cases (empty query, no matches, special chars)
4. Test with large libraries (100+ texts)
5. Verify performance (should be < 50ms for 1000 items)
6. Test accessibility (screen reader, keyboard nav)
7. Fix any bugs discovered

### Step 9: Documentation (30 min)
1. Update this document with completion notes
2. Add inline code comments
3. Update keyboard shortcuts documentation
4. Update PROGRESS.md

---

## Technical Considerations

### Folder Search vs Text Search

**Decision: Search both folder names AND text titles**

**Rationale:**
- Users may organize by folder names (e.g., "Biology", "Physics")
- Searching folders helps narrow down location
- Folder matches should show all child texts (expanded view)

**UI Treatment:**
- Match counter shows: "5 texts, 2 folders" when both match
- Folder matches appear expanded in tree
- Text matches within matched folders also highlighted

### Hierarchical Tree Filtering

**Challenge:** How to show matches in a tree structure?

**Solution: Show matches + ancestors**

```typescript
function filterTreeByMatches(
  tree: TreeNode[],
  matchedTextIds: number[],
  matchedFolderIds: string[]
): TreeNode[] {
  return tree
    .map(node => {
      if (node.type === 'folder') {
        // Recursively filter children
        const filteredChildren = filterTreeByMatches(
          node.children,
          matchedTextIds,
          matchedFolderIds
        );

        // Show folder if: it matches OR has matching children
        if (matchedFolderIds.includes(node.id) || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
        return null; // Hide this folder
      } else {
        // Show text if it matches
        return matchedTextIds.includes(node.data.id) ? node : null;
      }
    })
    .filter(node => node !== null);
}
```

**Auto-Expansion:**
- When search is active, expand all folders that contain matches
- Update libraryStore.expandedFolderIds automatically
- Collapse folders when search is cleared (restore previous state)

### Performance Considerations

**Library Size Analysis:**
- Small library: 10-50 texts → No optimization needed
- Medium library: 50-500 texts → Debouncing sufficient
- Large library: 500-5000 texts → May need memoization

**Optimization Strategy:**
1. Debounce search input (300ms) ✅
2. Memoize filtered tree results ✅
3. Use useMemo for search results ✅
4. If > 5000 texts: Consider Web Worker (future enhancement)

**Expected Performance:**
- Search 100 texts: < 5ms
- Search 1000 texts: < 50ms
- Search 5000 texts: < 200ms

### Integration with Existing Library Tree

**Current Tree Behavior:**
- Uses `buildTree()` to construct hierarchy
- Supports drag-and-drop
- Supports expand/collapse state
- Shows all items by default

**Search Integration:**
- Add filtering layer AFTER tree construction
- Preserve expand/collapse state when possible
- Disable drag-and-drop during search (or keep enabled?)
- Show filtered count: "Showing 5 of 50 texts"

### UTF-16 Considerations

**Text Titles with Unicode:**
- Search should handle emoji in titles: "📚 My Reading List"
- Search should handle CJK characters: "量子物理学"
- JavaScript string operations work with UTF-16 by default
- No special handling needed (unlike content search)

**Implementation:**
```typescript
// Safe for Unicode - JavaScript regex handles it
const regex = new RegExp(escapeRegex(query), flags);
const matches = text.title.match(regex);
```

### Highlighting Implementation

**Approach: React component with mark elements**

```tsx
function HighlightedText({ text, query, options }: Props) {
  if (!query) return <span>{text}</span>;

  const regex = buildSearchRegex(query, options);
  const parts = text.split(regex);
  const matches = text.match(regex) || [];

  return (
    <span>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {matches[i] && (
            <mark className="bg-yellow-200 text-black font-medium">
              {matches[i]}
            </mark>
          )}
        </Fragment>
      ))}
    </span>
  );
}
```

**CSS Styling:**
```css
mark.library-search-highlight {
  background-color: #fef08a; /* yellow-200 */
  color: black;
  font-weight: 500;
  border-radius: 2px;
  padding: 0 2px;
}
```

---

## Testing Checklist

### Unit Tests (Optional for Phase 10)
- [ ] `searchLibrary()` with various queries
- [ ] Case-sensitive search works correctly
- [ ] Whole-word search works correctly
- [ ] Empty query returns empty results
- [ ] Special characters are escaped properly
- [ ] Unicode text titles are searchable

### Manual Testing Scenarios

#### Basic Search
- [ ] Open search with Shift+Cmd+F / Shift+Ctrl+F
- [ ] Type query and see results filter in real-time
- [ ] Match counter shows correct count
- [ ] Clear query shows all items again
- [ ] Close search with Escape or X button
- [ ] Close search with button click

#### Filtering Behavior
- [ ] Search shows only matching texts
- [ ] Search shows folders containing matching texts
- [ ] Parent folders of matches are visible (ancestor visibility)
- [ ] Folders with no matches are hidden
- [ ] Empty state shows "No matches" message

#### Highlighting
- [ ] Matching text in titles is highlighted
- [ ] Matching text in folder names is highlighted (if enabled)
- [ ] Multiple matches in same title are all highlighted
- [ ] Case-insensitive highlighting works
- [ ] Whole-word highlighting works

#### Options
- [ ] Case-sensitive toggle works correctly
- [ ] Whole-word toggle works correctly
- [ ] Options update results immediately
- [ ] Options persist during search session

#### Navigation
- [ ] Enter key navigates to next match (future feature)
- [ ] Shift+Enter navigates to previous match (future feature)
- [ ] Matched folders auto-expand
- [ ] Current match is scrolled into view

#### Edge Cases
- [ ] Search with empty library shows "No items"
- [ ] Search with no matches shows "No matches"
- [ ] Search with special characters works (?, *, +, etc.)
- [ ] Search with very long query works
- [ ] Search with Unicode characters works (emoji, CJK)
- [ ] Rapid typing doesn't cause lag (debouncing works)

#### Integration
- [ ] Search doesn't interfere with tree navigation
- [ ] Search doesn't interfere with drag-and-drop
- [ ] Search works with collapsed sidebar (icon only)
- [ ] Search works with sorting options
- [ ] Creating/deleting items updates search results

#### Performance
- [ ] Search with 100 texts is instant
- [ ] Search with 500 texts is < 100ms
- [ ] No lag when typing rapidly
- [ ] Tree re-renders are efficient

#### Accessibility
- [ ] Search input is focusable with Tab
- [ ] Screen reader announces match count
- [ ] All buttons have aria-labels
- [ ] Keyboard shortcuts work
- [ ] Focus is trapped in search bar when open

---

## Time Estimate

**Total: 4-6 hours**

Breakdown:
- Store creation: 30 min
- Search algorithm: 45 min
- SearchBar component: 60 min
- Search effect hook: 20 min
- Sidebar integration: 30 min
- Tree filtering: 90 min
- Highlighting: 45 min
- Testing & polish: 60 min
- Documentation: 30 min

**Risk Buffer:** +2 hours for unexpected issues
- Complex tree filtering edge cases
- Highlighting regex issues with special chars
- Performance optimization for large libraries
- UI/UX refinement based on testing

---

## Potential Issues & Mitigations

### Issue 1: Performance with Large Libraries

**Problem:** Filtering 1000+ texts on every keystroke could cause lag

**Mitigation:**
1. Debounce input to 300ms (implemented)
2. Memoize filtered tree with useMemo
3. If still slow, add Web Worker for search (Phase 11)

### Issue 2: Folder Hierarchy Complexity

**Problem:** Showing ancestors of matches complicates tree filtering

**Mitigation:**
1. Use recursive algorithm with clear logic
2. Write comprehensive tests for edge cases
3. Consider caching ancestor paths if needed

### Issue 3: Highlighting with Special Regex Characters

**Problem:** User searches for "title?" or "name*" breaks regex

**Mitigation:**
1. Escape all special regex characters in query
2. Use established escapeRegex utility
3. Test with special character suite

### Issue 4: Auto-Expand State Management

**Problem:** Expanding folders during search conflicts with user's expand state

**Mitigation:**
1. Save expand state before search
2. Restore expand state after search cleared
3. Or: Let search override expand state (simpler)

**Chosen Approach:** Override expand state during search, restore on close

### Issue 5: Match Navigation Implementation

**Problem:** Next/previous navigation in tree structure is complex

**Mitigation:**
1. Phase 10: Skip navigation (filter only)
2. Phase 11: Add navigation if requested
3. Alternative: Click matched item to navigate

**Chosen Approach:** Phase 10 has no next/previous navigation

### Issue 6: Search Bar Space Constraint

**Problem:** Sidebar may be narrow, search bar needs to fit

**Mitigation:**
1. Make search bar compact (single line)
2. Remove next/previous buttons (not needed for filtering)
3. Stack options on second line if needed (responsive)

### Issue 7: Conflicting Keyboard Shortcuts

**Problem:** Shift+Cmd+F might conflict with system shortcuts

**Mitigation:**
1. Check for conflicts on macOS/Windows/Linux
2. Alternative: Cmd+K or Cmd+Shift+K
3. Make shortcut configurable (future enhancement)

**Chosen Approach:** Use Shift+Cmd/Ctrl+F (not typically used by systems)

---

## Success Criteria

### Functional Requirements ✅
- [ ] Search bar opens with Shift+Cmd/Ctrl+F
- [ ] Typing filters library tree in real-time
- [ ] Match counter shows accurate count
- [ ] Case-sensitive toggle works
- [ ] Whole-word toggle works
- [ ] Matching text is highlighted in tree
- [ ] Folders containing matches are expanded
- [ ] Empty state shows appropriate message
- [ ] Escape closes search and restores tree

### Performance Requirements ✅
- [ ] Search with 100 texts: < 50ms
- [ ] Search with 500 texts: < 200ms
- [ ] No input lag (debouncing works)
- [ ] No visible frame drops during typing

### User Experience Requirements ✅
- [ ] Search is discoverable (visible button)
- [ ] Search behaves like text search (familiar)
- [ ] Keyboard shortcuts are intuitive
- [ ] Visual feedback is clear (highlighting)
- [ ] No learning curve for existing users

### Code Quality Requirements ✅
- [ ] TypeScript compilation: 0 errors
- [ ] No console warnings
- [ ] Code follows existing patterns
- [ ] Components are properly typed
- [ ] Store follows Zustand conventions

---

## Future Enhancements (Not in Phase 10)

### Match Navigation (Phase 11)
- Next/previous match navigation with Enter/Shift+Enter
- Scroll matched item into view
- Visual indicator for current match (orange highlight)

### Advanced Search Options
- Search in metadata (author, publication date)
- Search in content snippet (first 100 chars)
- Regex mode toggle
- Search history (recent searches)

### Search Persistence
- Remember last search query
- Remember search options (case/word)
- Restore search when returning to library

### Performance Optimization
- Web Worker for search (if libraries > 5000 texts)
- Virtual scrolling for filtered results
- Search index caching

### Backend Integration (if needed)
- Full-text search in database (SQLite FTS5)
- Fuzzy search support
- Search ranking/relevance scoring

---

## Migration Notes

### No Breaking Changes
- ✅ Existing library tree behavior unchanged
- ✅ No database schema changes
- ✅ No API changes required
- ✅ Optional feature (can be ignored by users)

### For Users
- New search button appears in library header
- Shift+Cmd/Ctrl+F opens library search
- Search filters visible items in tree
- No impact on existing workflows

### For Developers
- New store: `useLibrarySearchStore()`
- New component: `<LibrarySearchBar />`
- New utility: `searchLibrary()`
- LibraryTree accepts filtering props
- Nodes accept highlighting props

---

## Code Patterns to Follow

### Store Pattern (from existing stores)
```typescript
export const useLibrarySearchStore = create<LibrarySearchState>((set, get) => ({
  // State
  isOpen: false,
  query: '',

  // Actions
  setQuery: (query: string) => {
    set({ query, currentMatchIndex: 0 });
  },

  // Use get() to access current state in actions
  nextMatch: () => {
    const { matches, currentMatchIndex } = get();
    // ...
  }
}));
```

### Component Pattern (from SearchBar.tsx)
```typescript
export function LibrarySearchBar() {
  const [localQuery, setLocalQuery] = useState('');
  const debouncedQuery = useDebounce(localQuery, 300);

  // Sync with store
  useEffect(() => {
    setQuery(debouncedQuery);
  }, [debouncedQuery]);

  // ...
}
```

### Utility Pattern (from textSearch.ts)
```typescript
export function searchLibrary(
  folders: Folder[],
  texts: Text[],
  query: string,
  options: SearchOptions
): SearchResults {
  if (!query.trim()) return { textIds: [], folderIds: [] };

  // Build regex
  const flags = options.caseSensitive ? 'g' : 'gi';
  const pattern = options.wholeWord
    ? `\\b${escapeRegex(query)}\\b`
    : escapeRegex(query);
  const regex = new RegExp(pattern, flags);

  // Search
  const textIds = texts
    .filter(text => regex.test(text.title))
    .map(text => text.id);

  return { textIds, folderIds: [] };
}
```

---

## Implementation Checklist

### Pre-Implementation
- [x] Review Phase 9 text search implementation
- [x] Understand libraryStore structure
- [x] Understand LibraryTree component hierarchy
- [x] Read SearchBar component code
- [ ] Create feature branch from main

### Core Implementation
- [ ] Create librarySearch store
- [ ] Create searchLibrary utility
- [ ] Create LibrarySearchBar component
- [ ] Create useLibrarySearchEffect hook
- [ ] Integrate search button into Sidebar
- [ ] Add keyboard shortcut handler

### Tree Integration
- [ ] Create filterTreeByMatches utility
- [ ] Update LibraryTree with filtering logic
- [ ] Update FolderNode with highlighting
- [ ] Update TextNode with highlighting
- [ ] Handle auto-expand folders logic

### Polish
- [ ] Add "No matches" empty state
- [ ] Add loading state (if needed)
- [ ] Style highlighted text
- [ ] Test all keyboard shortcuts
- [ ] Test case-sensitive/whole-word options
- [ ] Test with various library sizes

### Documentation
- [ ] Add inline code comments
- [ ] Update this document with completion notes
- [ ] Update PROGRESS.md
- [ ] Update documentation_index.md
- [ ] Add to keyboard shortcuts help dialog

### Testing
- [ ] Manual test all scenarios
- [ ] Test with Unicode text titles
- [ ] Test with special characters in query
- [ ] Performance test with 500+ texts
- [ ] Accessibility audit

### Deployment
- [ ] Build with no TypeScript errors
- [ ] Build with no console warnings
- [ ] Test in production build
- [ ] Create PR with detailed description
- [ ] Update PHASE_10_LIBRARY_SEARCH.md with completion status

---

## Conclusion

Phase 10 Library Search is a natural extension of the successful Phase 9 text search feature. By reusing established patterns (debouncing, Zustand stores, similar UI) while adapting for hierarchical tree filtering, we can deliver a high-quality search experience in 4-6 hours.

The key architectural decisions are:
1. **Frontend filtering** for instant results (no backend needed)
2. **Separate components** for maintainability (LibrarySearchBar vs SearchBar)
3. **Tree filtering + highlighting** for clear visual feedback
4. **Auto-expand folders** for intuitive navigation

This feature will significantly improve usability for users with large libraries (50+ texts), making Trivium more scalable and professional.

---

**Implementation Team:** TBD
**Review Date:** TBD
**Approved By:** Pending approval
