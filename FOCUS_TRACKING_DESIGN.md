# Focus Tracking System Design

## Executive Summary

This document proposes a focus tracking system for managing user interaction between the sidebar navigation tree and the library page dual-pane view in Trivium. The system will enable context-aware hotkeys, independent state management, clear visual feedback, and future drag-and-drop capabilities between panes.

## Problem Analysis

### Current Pain Points

1. **Hotkey Ambiguity**: Currently, hotkeys like `Ctrl+Shift+E` (expand/collapse all) and `Shift+Cmd/Ctrl+F` (library search) are registered globally in the Sidebar component. When a user is on the library page, these hotkeys operate only on the sidebar tree, not on the library page tree.

2. **Shared State Confusion**: The library store maintains two separate sets of expanded folder IDs (`expandedFolderIds` for sidebar, `libraryExpandedFolderIds` for library page), but there's no clear indication to the user which tree is currently "active" for keyboard operations.

3. **No Visual Feedback**: Users cannot tell which pane has focus, making keyboard navigation unintuitive.

4. **Search State Coupling**: The library search store is shared between both contexts, but the UI only shows the search bar in one location at a time.

5. **Future Drag-and-Drop**: There's no mechanism to track which pane is the source/target for drag operations between sidebar and library page.

### Current Architecture Analysis

**Component Hierarchy:**
```
AppShell
├── Sidebar
│   ├── LibrarySearchBar (conditional)
│   └── LibraryTree (context="sidebar")
└── Outlet (route-based)
    └── LibraryPage
        └── LibraryDualPane
            ├── LeftPane
            │   ├── LibrarySearchBar (conditional)
            │   ├── SelectionToolbar
            │   └── LibraryTree (context="library")
            └── RightPane
```

**State Management:**
- `useLibraryStore`: Manages folders, texts, expanded states (separate for sidebar/library), selection
- `useLibrarySearchStore`: Manages search query, matches, navigation
- `useKeyboardShortcuts`: Global hotkey registration in AppShell

**Current Context Discrimination:**
- LibraryTree accepts `context?: 'sidebar' | 'library'` prop
- Different expanded folder sets based on context
- Different click behaviors (sidebar navigates immediately, library uses multi-select)

## Proposed Architecture

### 1. Focus Context Management

Create a new Zustand store to track which pane currently has focus:

```typescript
// src/stores/focusContext.ts
import { create } from 'zustand';

type FocusContext = 'sidebar' | 'library-left' | 'library-right' | 'none';

interface FocusContextState {
  activeContext: FocusContext;
  setActiveContext: (context: FocusContext) => void;
  isContextActive: (context: FocusContext) => boolean;
}

export const useFocusContextStore = create<FocusContextState>((set, get) => ({
  activeContext: 'none',

  setActiveContext: (context: FocusContext) => {
    console.log('[FocusContext] Switching to:', context);
    set({ activeContext: context });
  },

  isContextActive: (context: FocusContext) => {
    return get().activeContext === context;
  },
}));
```

**Why Zustand?**
- Already used throughout the app (consistency)
- Simple API, no context provider boilerplate
- Can be accessed from anywhere (components, event handlers)
- React integration via hooks

### 2. Focus Tracking Implementation

#### Option A: Ref-based Focus Detection (Recommended)

Track focus using React refs and native focus events:

```typescript
// In LibraryTree component
const treeContainerRef = useRef<HTMLDivElement>(null);
const { setActiveContext } = useFocusContextStore();

useEffect(() => {
  const container = treeContainerRef.current;
  if (!container) return;

  const handleFocus = () => {
    setActiveContext(context === 'sidebar' ? 'sidebar' : 'library-left');
  };

  const handleBlur = (e: FocusEvent) => {
    // Only blur if focus is leaving the tree entirely
    if (!container.contains(e.relatedTarget as Node)) {
      setActiveContext('none');
    }
  };

  container.addEventListener('focus', handleFocus, true);
  container.addEventListener('blur', handleBlur, true);

  return () => {
    container.removeEventListener('focus', handleFocus, true);
    container.removeEventListener('blur', handleBlur, true);
  };
}, [context, setActiveContext]);

// Trigger focus on click
const handleTreeClick = (e: React.MouseEvent) => {
  if (treeContainerRef.current) {
    treeContainerRef.current.focus();
  }
};
```

**Pros:**
- Native browser behavior
- Works with keyboard navigation (Tab key)
- No manual state synchronization
- Accessible (screen readers understand focus)

**Cons:**
- Need to make divs focusable with `tabIndex={0}`
- Blur events can be tricky with nested elements

#### Option B: Click-based Focus Tracking

Track focus via click handlers:

```typescript
const handleTreeClick = () => {
  setActiveContext(context === 'sidebar' ? 'sidebar' : 'library-left');
};

// On the tree container
<div onClick={handleTreeClick}>
  {/* tree content */}
</div>
```

**Pros:**
- Simple to implement
- Works well with drag-and-drop
- No focus management complexity

**Cons:**
- Not keyboard-accessible
- Doesn't integrate with browser focus
- User must click to activate, Tab navigation won't work

#### Option C: Hybrid Approach (Recommended)

Combine both methods:

```typescript
const handleInteraction = () => {
  const newContext = context === 'sidebar' ? 'sidebar' : 'library-left';
  setActiveContext(newContext);

  // Also grab native focus for keyboard nav
  if (treeContainerRef.current) {
    treeContainerRef.current.focus();
  }
};

<div
  ref={treeContainerRef}
  tabIndex={0}
  onClick={handleInteraction}
  onFocus={handleInteraction}
  className="outline-none focus:outline-none"
>
  {/* tree content */}
</div>
```

**Pros:**
- Works with both mouse and keyboard
- Clear user intent capture
- Accessible
- Simple logic

**Cons:**
- Slightly more code
- Need to handle edge cases (modals, dialogs)

### 3. Context-Aware Hotkey System

Modify the hotkey system to check active context:

```typescript
// src/hooks/useContextualHotkeys.ts
import { useEffect } from 'react';
import { useFocusContextStore } from '../stores/focusContext';
import { useLibraryStore } from '../stores/library';
import { useLibrarySearchStore } from '../lib/stores/librarySearch';
import { isMac } from '../lib/utils/platform';

type HotkeyContext = 'sidebar' | 'library' | 'global';

export function useContextualHotkeys() {
  const { activeContext } = useFocusContextStore();
  const libraryStore = useLibraryStore();
  const searchStore = useLibrarySearchStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input
      if (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Expand/Collapse All: Ctrl+Shift+E
      if (modKey && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();

        if (activeContext === 'sidebar') {
          // Toggle sidebar folders
          const allExpanded = libraryStore.folders.every(
            f => libraryStore.expandedFolderIds.has(f.id)
          );
          if (allExpanded) {
            libraryStore.collapseAllFolders();
          } else {
            libraryStore.expandAllFolders();
          }
        } else if (activeContext === 'library-left') {
          // Toggle library page folders
          const allExpanded = libraryStore.folders.every(
            f => libraryStore.libraryExpandedFolderIds.has(f.id)
          );
          if (allExpanded) {
            // Add collapseAllLibraryFolders to store
            libraryStore.collapseAllLibraryFolders();
          } else {
            // Add expandAllLibraryFolders to store
            libraryStore.expandAllLibraryFolders();
          }
        }
        return;
      }

      // Library Search: Shift+Ctrl+F
      if (modKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchStore.openSearch();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeContext, libraryStore, searchStore]);
}
```

**Store Updates Required:**

```typescript
// Add to useLibraryStore in src/stores/library.ts

expandAllLibraryFolders: () => {
  set((state) => {
    const allFolderIds = new Set(state.folders.map(f => f.id));
    return { libraryExpandedFolderIds: allFolderIds };
  });
},

collapseAllLibraryFolders: () => {
  set({ libraryExpandedFolderIds: new Set() });
},
```

**Integration Points:**

1. **Remove** global hotkey handlers from Sidebar.tsx (lines 113-145)
2. **Add** `useContextualHotkeys()` call in AppShell or a dedicated component
3. **Update** LibraryTree to set focus context on interaction

### 4. Visual Feedback Design

Provide clear visual indicators of which pane has focus:

```typescript
// In LibraryTree or as a wrapper component
const { activeContext } = useFocusContextStore();
const isActive = context === 'sidebar'
  ? activeContext === 'sidebar'
  : activeContext === 'library-left';

<div
  className={cn(
    'flex flex-col flex-1 min-h-0',
    isActive && 'ring-2 ring-blue-500 ring-inset rounded-sm'
  )}
>
  {/* tree content */}
</div>
```

**Visual Feedback Options:**

1. **Subtle Ring** (Recommended):
   - 2px blue ring around active pane
   - Only visible when context has focus
   - Non-intrusive, professional look

2. **Background Tint**:
   - Slight background color change
   - More obvious but can interfere with design
   - Example: `bg-blue-50/30` for active pane

3. **Border Accent**:
   - Colored left border (3-4px)
   - Common in IDEs (VS Code style)
   - Example: `border-l-4 border-blue-500`

4. **Header Badge**:
   - Small "Active" badge in pane header
   - Most explicit but takes space
   - Good for first-time users

**Recommended Approach:** Combine subtle ring with header indicator:

```typescript
// In LeftPane.tsx header
const { activeContext } = useFocusContextStore();
const isActive = activeContext === 'library-left';

<div className="h-14 flex items-center px-4 border-b border-sidebar-border">
  <h2 className="text-lg font-semibold">Library</h2>
  {isActive && (
    <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded">
      Active
    </span>
  )}
</div>
```

### 5. Search State Management

Currently, there's one global search store. We need to decide: share or separate?

#### Option A: Shared Search State (Recommended for MVP)

Keep the current single search store, but show search bar in active context:

```typescript
// In Sidebar.tsx
const { isOpen: isSearchOpen } = useLibrarySearchStore();
const { activeContext } = useFocusContextStore();
const showSearchInSidebar = isSearchOpen && activeContext === 'sidebar';

{showSearchInSidebar && <LibrarySearchBar />}
```

```typescript
// In LeftPane.tsx
const { isOpen: isSearchOpen } = useLibrarySearchStore();
const { activeContext } = useFocusContextStore();
const showSearchInLibrary = isSearchOpen && activeContext === 'library-left';

{showSearchInLibrary && <LibrarySearchBar />}
```

**Pros:**
- Simple, no code duplication
- Search results shared between views
- User can search in sidebar, then switch to library view

**Cons:**
- Only one search at a time
- Switching contexts closes search in previous location

#### Option B: Separate Search States

Create context-aware search stores:

```typescript
interface LibrarySearchState {
  // ... existing fields
  context: 'sidebar' | 'library';
}

// Two store instances
export const useSidebarSearchStore = create<LibrarySearchState>(...);
export const useLibrarySearchStore = create<LibrarySearchState>(...);
```

**Pros:**
- Independent searches in each pane
- More flexible user experience

**Cons:**
- More complex
- Duplicate state management
- Confusing UX (two different search results)

**Recommendation:** Start with Option A (shared), migrate to Option B only if users request it.

### 6. Drag-and-Drop Enhancement

The current drag-and-drop implementation uses `@dnd-kit/core`. Focus context can enhance this:

```typescript
// In handleDragStart
const handleDragStart = (event: DragStartEvent) => {
  setActiveId(String(event.active.id));

  // Set focus context based on drag source
  const dragData = event.active.data.current;
  if (dragData?.sourceContext) {
    setActiveContext(dragData.sourceContext);
  }
};

// When setting up draggable items, include source context
const draggable = useDraggable({
  id: nodeId,
  data: {
    type: 'text',
    text,
    sourceContext: context, // 'sidebar' or 'library'
  },
});
```

**Future Cross-Pane Drag:**

```typescript
// In LibraryTree
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  const sourceContext = active.data.current?.sourceContext;
  const targetContext = over?.data.current?.targetContext;

  // Handle cross-context drag (sidebar -> library or vice versa)
  if (sourceContext !== targetContext) {
    console.log('Cross-pane drag detected!', { sourceContext, targetContext });
    // Future: implement cross-pane move logic
  }

  // Existing drop logic...
};
```

### 7. Edge Cases and Solutions

#### Edge Case 1: Modal Dialogs

**Problem:** When a modal opens (e.g., create folder dialog), focus context should pause.

**Solution:**
```typescript
// In modal components
const { setActiveContext } = useFocusContextStore();

useEffect(() => {
  if (isOpen) {
    setActiveContext('none');
  }
}, [isOpen, setActiveContext]);
```

#### Edge Case 2: Rapid Context Switching

**Problem:** User clicks back and forth between panes rapidly.

**Solution:** Debounce context changes if needed:
```typescript
const debouncedSetContext = useMemo(
  () => debounce(setActiveContext, 100),
  [setActiveContext]
);
```

#### Edge Case 3: Keyboard Navigation Between Panes

**Problem:** How should Tab key move between sidebar and library?

**Solution:** Let browser handle it naturally with proper `tabIndex`:
- Sidebar tree: `tabIndex={0}`
- Library left pane tree: `tabIndex={0}`
- Library right pane: `tabIndex={0}`

User can Tab to cycle through focusable elements.

#### Edge Case 4: Page Navigation

**Problem:** When user navigates away from library page, context should reset.

**Solution:**
```typescript
// In LibraryDualPane
const { setActiveContext } = useFocusContextStore();

useEffect(() => {
  // Reset context when unmounting
  return () => {
    setActiveContext('none');
  };
}, [setActiveContext]);
```

#### Edge Case 5: Search Bar Focus

**Problem:** When search bar is focused, keyboard shortcuts should be disabled.

**Solution:** Already handled in useContextualHotkeys by checking:
```typescript
if (e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement) {
  return;
}
```

## Implementation Plan

### Phase 1: Core Focus Tracking (2-3 hours)

1. **Create focus context store** (`src/stores/focusContext.ts`)
   - Define FocusContext type and store interface
   - Implement basic setActiveContext and isContextActive

2. **Update LibraryTree component**
   - Add focus/click handlers to track context
   - Make tree container focusable with `tabIndex={0}`
   - Test focus detection with console logs

3. **Add visual feedback**
   - Implement subtle ring indicator
   - Test in both sidebar and library page

**Testing:**
- Click sidebar tree, verify "sidebar" context
- Click library page tree, verify "library-left" context
- Tab between panes, verify context follows focus

### Phase 2: Context-Aware Hotkeys (3-4 hours)

1. **Create contextual hotkey hook** (`src/hooks/useContextualHotkeys.ts`)
   - Implement Ctrl+Shift+E for expand/collapse
   - Implement Shift+Ctrl+F for search
   - Check active context before executing

2. **Update library store**
   - Add `expandAllLibraryFolders()` method
   - Add `collapseAllLibraryFolders()` method

3. **Remove duplicate handlers**
   - Clean up Sidebar.tsx global handlers
   - Integrate new hook into AppShell

**Testing:**
- Focus sidebar, press Ctrl+Shift+E, verify sidebar folders expand/collapse
- Focus library page, press Ctrl+Shift+E, verify library folders expand/collapse
- Press Shift+Ctrl+F from either context, verify search opens

### Phase 3: Search Integration (2 hours)

1. **Update search bar visibility logic**
   - Show search in active context only
   - Test switching contexts while search is open

2. **Adjust search focus behavior**
   - When search opens, auto-focus input
   - When search closes, restore tree focus

**Testing:**
- Open search in sidebar, verify it shows in sidebar
- Click library page, verify search moves to library
- Close search, verify tree regains focus

### Phase 4: Polish and Edge Cases (2-3 hours)

1. **Handle modals**
   - Reset context to 'none' when dialogs open
   - Test create folder dialog

2. **Handle navigation**
   - Reset context when leaving library page
   - Test navigating to different routes

3. **Add keyboard shortcuts to help dialog**
   - Update ShortcutHelp with context info
   - Document Ctrl+Shift+E and Shift+Ctrl+F

**Testing:**
- Open create folder dialog, verify context resets
- Navigate to dashboard, verify no context leaks
- Open help dialog, verify shortcuts documented

### Phase 5: Future Enhancements (Not in MVP)

1. **Cross-pane drag-and-drop**
   - Track source/target context in drag data
   - Implement move logic for cross-context drops
   - Add visual indicators during drag

2. **Separate search states** (if requested)
   - Create context-specific search stores
   - Update UI to show both searches simultaneously

3. **Keyboard shortcuts for context switching**
   - Ctrl+1: Focus sidebar
   - Ctrl+2: Focus library left pane
   - Ctrl+3: Focus library right pane

## Code Snippets

### Complete Focus Context Store

```typescript
// src/stores/focusContext.ts
import { create } from 'zustand';

export type FocusContext = 'sidebar' | 'library-left' | 'library-right' | 'none';

interface FocusContextState {
  activeContext: FocusContext;
  setActiveContext: (context: FocusContext) => void;
  isContextActive: (context: FocusContext) => boolean;
  resetContext: () => void;
}

export const useFocusContextStore = create<FocusContextState>((set, get) => ({
  activeContext: 'none',

  setActiveContext: (context: FocusContext) => {
    const current = get().activeContext;
    if (current !== context) {
      console.log('[FocusContext] Switching from', current, 'to', context);
      set({ activeContext: context });
    }
  },

  isContextActive: (context: FocusContext) => {
    return get().activeContext === context;
  },

  resetContext: () => {
    set({ activeContext: 'none' });
  },
}));
```

### Updated LibraryTree with Focus Tracking

```typescript
// In LibraryTree component (additions only)
import { useFocusContextStore } from '../../stores/focusContext';

export function LibraryTree({ collapsed = false, context = 'sidebar' }: LibraryTreeProps) {
  // ... existing code ...

  const { setActiveContext, isContextActive } = useFocusContextStore();
  const focusContext = context === 'sidebar' ? 'sidebar' : 'library-left';
  const isActive = isContextActive(focusContext);

  const handleTreeInteraction = () => {
    setActiveContext(focusContext);
    if (treeContainerRef.current && !collapsed) {
      treeContainerRef.current.focus();
    }
  };

  // ... existing useEffects ...

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      measuring={measuringConfig}
      onDragStart={(e) => {
        setActiveId(String(e.active.id));
        handleTreeInteraction(); // Set context on drag
      }}
      onDragEnd={(e) => {
        handleDragEnd(e);
        setActiveId(null);
      }}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {context === 'library' && <RootDropZone />}
        <div
          ref={treeContainerRef}
          tabIndex={collapsed ? -1 : 0}
          onClick={handleTreeInteraction}
          onFocus={handleTreeInteraction}
          className={cn(
            'space-y-1 px-2 outline-none focus:outline-none overflow-y-auto flex-1 min-h-0',
            isActive && !collapsed && 'ring-2 ring-blue-500 ring-inset rounded-sm'
          )}
          role="tree"
          aria-label="Library navigation tree"
        >
          {/* ... existing tree content ... */}
        </div>
      </div>
      {/* ... drag overlay ... */}
    </DndContext>
  );
}
```

### Contextual Hotkeys Hook

```typescript
// src/hooks/useContextualHotkeys.ts
import { useEffect } from 'react';
import { useFocusContextStore } from '../stores/focusContext';
import { useLibraryStore } from '../stores/library';
import { useLibrarySearchStore } from '../lib/stores/librarySearch';
import { isMac } from '../lib/utils/platform';

export function useContextualHotkeys() {
  const { activeContext } = useFocusContextStore();
  const {
    folders,
    expandedFolderIds,
    libraryExpandedFolderIds,
    expandAllFolders,
    collapseAllFolders,
    expandAllLibraryFolders,
    collapseAllLibraryFolders,
  } = useLibraryStore();
  const { openSearch } = useLibrarySearchStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input/textarea
      if (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Expand/Collapse All: Ctrl+Shift+E
      if (modKey && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();

        if (activeContext === 'sidebar') {
          // Check if all sidebar folders are expanded
          const allExpanded = folders.length > 0 &&
            folders.every(f => expandedFolderIds.has(f.id));

          if (allExpanded) {
            collapseAllFolders();
          } else {
            expandAllFolders();
          }
        } else if (activeContext === 'library-left') {
          // Check if all library folders are expanded
          const allExpanded = folders.length > 0 &&
            folders.every(f => libraryExpandedFolderIds.has(f.id));

          if (allExpanded) {
            collapseAllLibraryFolders();
          } else {
            expandAllLibraryFolders();
          }
        }
        return;
      }

      // Library Search: Shift+Ctrl+F
      if (modKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        openSearch();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeContext,
    folders,
    expandedFolderIds,
    libraryExpandedFolderIds,
    expandAllFolders,
    collapseAllFolders,
    expandAllLibraryFolders,
    collapseAllLibraryFolders,
    openSearch,
  ]);
}
```

### Library Store Updates

```typescript
// In src/stores/library.ts, add to interface and implementation:

interface LibraryState {
  // ... existing fields ...
  expandAllLibraryFolders: () => void;
  collapseAllLibraryFolders: () => void;
}

// In the create() implementation:
expandAllLibraryFolders: () => {
  set((state) => {
    const allFolderIds = new Set(state.folders.map(f => f.id));
    return { libraryExpandedFolderIds: allFolderIds };
  });
},

collapseAllLibraryFolders: () => {
  set({ libraryExpandedFolderIds: new Set() });
},
```

## Testing Approach

### Unit Tests

```typescript
// src/stores/__tests__/focusContext.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFocusContextStore } from '../focusContext';

describe('useFocusContextStore', () => {
  it('should initialize with none context', () => {
    const { result } = renderHook(() => useFocusContextStore());
    expect(result.current.activeContext).toBe('none');
  });

  it('should set active context', () => {
    const { result } = renderHook(() => useFocusContextStore());
    act(() => {
      result.current.setActiveContext('sidebar');
    });
    expect(result.current.activeContext).toBe('sidebar');
  });

  it('should check if context is active', () => {
    const { result } = renderHook(() => useFocusContextStore());
    act(() => {
      result.current.setActiveContext('library-left');
    });
    expect(result.current.isContextActive('library-left')).toBe(true);
    expect(result.current.isContextActive('sidebar')).toBe(false);
  });

  it('should reset context', () => {
    const { result } = renderHook(() => useFocusContextStore());
    act(() => {
      result.current.setActiveContext('sidebar');
      result.current.resetContext();
    });
    expect(result.current.activeContext).toBe('none');
  });
});
```

### Integration Tests

```typescript
// src/components/__tests__/LibraryTree.integration.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryTree } from '../library/LibraryTree';
import { useFocusContextStore } from '../../stores/focusContext';

describe('LibraryTree Focus Integration', () => {
  it('should set sidebar context on click', () => {
    render(<LibraryTree context="sidebar" />);
    const tree = screen.getByRole('tree');

    fireEvent.click(tree);

    const { activeContext } = useFocusContextStore.getState();
    expect(activeContext).toBe('sidebar');
  });

  it('should set library context on click', () => {
    render(<LibraryTree context="library" />);
    const tree = screen.getByRole('tree');

    fireEvent.click(tree);

    const { activeContext } = useFocusContextStore.getState();
    expect(activeContext).toBe('library-left');
  });

  it('should show visual focus indicator when active', () => {
    render(<LibraryTree context="sidebar" />);
    const tree = screen.getByRole('tree');

    fireEvent.click(tree);

    expect(tree).toHaveClass('ring-2', 'ring-blue-500');
  });
});
```

### E2E Test Scenarios

1. **Context Switching**
   - Click sidebar tree, verify active indicator
   - Click library page tree, verify active indicator moves
   - Verify only one context active at a time

2. **Hotkey Behavior**
   - Focus sidebar, press Ctrl+Shift+E, verify sidebar folders expand
   - Focus library, press Ctrl+Shift+E, verify library folders expand
   - Verify no cross-contamination

3. **Search Interaction**
   - Press Shift+Ctrl+F in sidebar, verify search opens
   - Click library page, verify search context switches
   - Close search, verify tree regains focus

4. **Modal Interruption**
   - Focus sidebar, open create folder dialog
   - Verify context resets to 'none'
   - Close dialog, click sidebar, verify context restores

5. **Keyboard Navigation**
   - Press Tab to move from sidebar to library tree
   - Verify focus context follows Tab navigation
   - Use arrow keys within each tree

## Success Metrics

1. **User can tell which pane is active**: Visual indicator present and clear
2. **Hotkeys work contextually**: Ctrl+Shift+E operates on focused pane
3. **No conflicts or confusion**: State remains consistent during rapid switching
4. **Keyboard accessible**: Tab navigation works, screen readers can identify focus
5. **Performance**: No lag when switching contexts (<50ms)

## Risks and Mitigations

### Risk 1: Focus Conflicts with Drag-and-Drop

**Impact:** Medium
**Probability:** Medium
**Mitigation:** Test drag operations thoroughly, ensure drag start sets context correctly

### Risk 2: Browser Focus Management Complexity

**Impact:** High
**Probability:** Low
**Mitigation:** Use hybrid approach (ref + click), extensive testing across browsers

### Risk 3: User Confusion with Search Context

**Impact:** Medium
**Probability:** Medium
**Mitigation:** Show clear visual indicator where search is active, add tooltip

### Risk 4: Performance Degradation

**Impact:** Low
**Probability:** Low
**Mitigation:** Zustand is performant, minimal re-renders expected. Profile if issues arise.

## Future Enhancements

1. **Multi-Pane Support**: Extend to right pane in library view
2. **Cross-Pane Operations**: Drag items from sidebar to library page
3. **Context History**: Remember last active context per route
4. **Keyboard Shortcuts for Context**: Ctrl+1/2/3 to switch panes
5. **Per-Context Settings**: Different sort, filter, view options per pane

## Appendix: Alternative Approaches Considered

### React Context API

**Why Not:**
- Adds provider boilerplate
- Zustand already used extensively
- Less flexible for global access

### FocusScope from React Aria

**Why Not:**
- Heavy dependency for simple use case
- Designed for modals/dialogs, not pane management
- Overkill for this scenario

### Custom Event System

**Why Not:**
- More complex than Zustand
- Harder to debug
- No built-in React integration

### CSS :focus-within

**Why Not:**
- Can't trigger JavaScript logic
- Limited to visual feedback only
- No state management

## Conclusion

The proposed focus tracking system provides a clean, maintainable solution for context-aware hotkeys and visual feedback in Trivium's dual-pane library interface. By leveraging Zustand for state management, React refs for focus detection, and a hybrid interaction model, we achieve a robust system that supports future enhancements like cross-pane drag-and-drop.

**Key Benefits:**
- Clear separation of sidebar vs library page state
- Context-aware hotkeys (Ctrl+Shift+E, Shift+Ctrl+F)
- Visual feedback for active pane
- Accessible keyboard navigation
- Foundation for future cross-pane operations

**Implementation Effort:** ~10-12 hours
**Risk Level:** Low to Medium
**User Impact:** High (significantly improves UX)

**Recommendation:** Proceed with Phase 1-4 implementation, defer Phase 5 enhancements until user feedback is gathered.
