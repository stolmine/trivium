# Trivium GUI Redesign Implementation Plan

## Overview
Transform the current page-based navigation into a unified, professional application with:
- **Persistent left sidebar** with hierarchical library (collapsible, drag & drop)
- **Polymorphic main area** that adapts to context (Dashboard/Reading/Review/Ingest)
- **Dashboard-first experience** with reading progress, due cards, and stats
- **Clean, minimal aesthetic** with improved legibility and professional polish

## Current State Analysis
- Routes: Library page → Read page → Review page (separate views)
- No persistent layout or sidebar
- Basic modal-based text ingestion
- Flashcard sidebar only in reading view
- Minimal visual polish, illegibility issues

## Implementation Phases

### Phase 1: Shell & Navigation Foundation (Week 1)
**Create unified application shell with persistent sidebar**

1. Create `AppShell` component with sidebar + main area layout
2. Build collapsible `Sidebar` with header, nav, and footer
3. Implement sidebar collapse/expand animation (256px ↔ 64px)
4. Create new global `AppStore` for view state and sidebar state
5. Set up React Router with nested routes under `AppShell`
6. Implement smooth view transition animations (fade + slide)
7. Add localStorage persistence for sidebar collapsed state

**Files**: `src/components/shell/AppShell.tsx`, `src/components/shell/Sidebar.tsx`, `src/stores/app.ts`, `src/lib/animations.ts`

### Phase 2: Dashboard View (Week 2)
**Build the main dashboard with actionable cards**

1. Create `DashboardView` route component
2. Build `ContinueReadingCard` (shows most recent text with progress)
3. Build `DueReviewCard` (shows total due + breakdown by collection)
4. Build `StatsCard` (weekly stats, streak, retention)
5. Build `RecentActivityFeed` component
6. Implement 3-column responsive grid layout
7. Add navigation from cards to respective views
8. Style with clean, minimal aesthetic (proper spacing, shadows, borders)

**Files**: `src/routes/dashboard/index.tsx`, `src/components/dashboard/*.tsx`

### Phase 3: Hierarchical Library Tree (Week 3)
**Backend folder system + frontend tree with drag & drop**

Backend:
1. Create `folders` table (id, name, parent_id, created_at, updated_at)
2. Add `folder_id` to `texts` table
3. Implement Tauri commands: `create_folder`, `get_folder_tree`, `move_text_to_folder`, `delete_folder`

Frontend:
4. Create `LibraryStore` for folder/text state management
5. Build recursive `LibraryTree` component
6. Create `FolderNode` and `TextNode` components with expand/collapse
7. Implement drag & drop with visual feedback (using `@dnd-kit` or similar)
8. Add folder CRUD operations (create, rename, delete with cascade)
9. Show active selection state in tree
10. Add folder selector dropdown for ingest view

**Files**: Backend migrations + commands, `src/stores/library.ts`, `src/components/library/*.tsx`, `src/hooks/useDragDrop.ts`

### Phase 4: Adapt Existing Views (Week 4)
**Refactor Reading, Review, and Ingest to work in new shell**

1. **Reading View**: Remove standalone layout, adapt to main area, keep right flashcard sidebar
2. **Review View**: Remove standalone layout, adapt to centered full-screen card display
3. **Ingest View**: Convert from modal to full main area view with 2-column layout (metadata + preview)
4. Update all navigation to use new routing structure
5. Polish transitions between modes
6. Ensure sidebar selection updates when navigating
7. Test all existing features work in new layout

**Files**: Modify `src/routes/read/[id].tsx`, `src/routes/review/index.tsx`, create `src/routes/ingest/index.tsx`

### Phase 5: Visual Polish & UX (Week 5)
**Final refinements for professional appearance**

1. Implement comprehensive keyboard shortcuts system
2. Add loading states and skeleton loaders
3. Optimize performance (memoization, lazy loading, code splitting)
4. Improve typography (proper font sizes, line heights, reading view uses serif)
5. Enhance color contrast for legibility (WCAG AA minimum)
6. Add focus indicators and accessibility improvements
7. Test responsive behavior (tablet/mobile adaptations)
8. Add animations with `prefers-reduced-motion` support
9. Polish micro-interactions (hover states, transitions)
10. Fix any edge cases and bugs

**Files**: `src/hooks/useKeyboardShortcuts.ts`, `src/components/shared/SkeletonLoader.tsx`, CSS refinements

## Design Specifications

### Layout Structure
```
┌─────────────┬───────────────────────┐
│  Sidebar    │    Main Area          │
│  (256px)    │    (Polymorphic)      │
│             │                        │
│  • Nav      │  • Dashboard          │
│  • Tree     │  • Reading            │
│             │  • Review             │
│             │  • Ingest             │
└─────────────┴───────────────────────┘
```

### Detailed Layout Mockups

#### Full Application View (Expanded Sidebar)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ TRIVIUM                                                                     │
├─────────────────┬──────────────────────────────────────────────────────────┤
│                 │  Dashboard                        [Import Text] [⚙]      │
│ [●] Dashboard   ├──────────────────────────────────────────────────────────┤
│ [ ] Library     │                                                           │
│                 │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ ▼ My Library    │  │ Continue     │ │ Due Review   │ │ Statistics   │    │
│   ▼ Physics     │  │ Reading      │ │              │ │              │    │
│     • Quantum   │  │              │ │  45 cards    │ │ This week:   │    │
│     • Classical │  │ [Book img]   │ │              │ │ • 120 cards  │    │
│   ▼ History     │  │              │ │ Physics (15) │ │ • 2h 15m     │    │
│     • Ancient   │  │ "The Art of  │ │ History (30) │ │              │    │
│     • Modern    │  │  Memory"     │ │              │ │ Streak: 7d   │    │
│   • Math        │  │              │ │ [Review]     │ │              │    │
│                 │  │ Progress: ━━ │ │              │ │              │    │
│                 │  │ 45% ━━━━━─── │ │              │ │              │    │
│ [Scroll area]   │  │              │ │              │ │              │    │
│                 │  │ [Continue]   │ │              │ │              │    │
│                 │  └──────────────┘ └──────────────┘ └──────────────┘    │
│                 │                                                           │
│                 │  ┌─────────────────────────────────────────────────┐   │
│                 │  │ Recent Activity                                  │   │
│                 │  │                                                   │   │
│ [⟨ Collapse]    │  │ • Finished "The Art of Memory"        2h ago    │   │
│                 │  │ • Review session: 30 cards            3h ago    │   │
│                 │  │ • Created 5 cards in "Quantum"        1d ago    │   │
│                 │  │                                                   │   │
│                 │  └─────────────────────────────────────────────────┘   │
│                 │                                                           │
└─────────────────┴──────────────────────────────────────────────────────────┘
```

#### Reading View (with Flashcard Sidebar)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ TRIVIUM                                                                     │
├─────────────────┬──────────────────────────────────────────┬───────────────┤
│                 │ [← Back]  Quantum Mechanics    45%   [☰] │ Flashcards(12)│
│ [●] Dashboard   ├──────────────────────────────────────────┼───────────────┤
│ [ ] Library     │                                           │               │
│                 │  The Art of Quantum Mechanics             │ Card #1       │
│ ▼ My Library    │  by Richard Feynman                       │ ┌───────────┐ │
│   ▼ Physics     │                                           │ │ The [..] │ │
│     • Quantum ● │  Lorem ipsum dolor sit amet,              │ │ principle │ │
│     • Classical │  consectetur adipiscing elit.             │ │ states... │ │
│   ▼ History     │  Sed do eiusmod tempor                    │ └───────────┘ │
│     • Ancient   │  incididunt ut labore et dolore           │               │
│     • Modern    │  magna aliqua.                            │ Card #2       │
│   • Math        │                                           │ ┌───────────┐ │
│                 │  Ut enim ad minim veniam, quis            │ │ Wave [..] │ │
│                 │  nostrud exercitation ullamco             │ │ describes │ │
│                 │  laboris nisi ut aliquip ex ea            │ └───────────┘ │
│                 │  commodo consequat.                       │               │
│ [Scroll area]   │                                           │ [Scroll area] │
│                 │                                           │               │
│ [⟨ Collapse]    │                                           │ [⟩ Collapse]  │
└─────────────────┴──────────────────────────────────────────┴───────────────┘
```

#### Review View (Answer State)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ TRIVIUM                                                                     │
├─────────────────┬──────────────────────────────────────────────────────────┤
│                 │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 45/120      │
│ [●] Dashboard   ├──────────────────────────────────────────────────────────┤
│ [ ] Library     │                                                           │
│                 │                                                           │
│ ▼ My Library    │              ┌─────────────────────────────┐            │
│   ▼ Physics     │              │                             │            │
│     • Quantum   │              │   The process of oxidation  │            │
│     • Classical │              │   involves multiple stages   │            │
│   ▼ History     │              │   that occur in sequence.    │            │
│     • Ancient   │              │                             │            │
│     • Modern    │              │   "oxidation" revealed      │            │
│   • Math        │              │                             │            │
│                 │              └─────────────────────────────┘            │
│                 │                                                           │
│                 │  ────────────────────────────────────────────────────   │
│ [Scroll area]   │                                                           │
│                 │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│                 │   │  Again  │ │  Hard   │ │  Good   │ │  Easy   │     │
│                 │   │    1    │ │    2    │ │    3    │ │    4    │     │
│                 │   │ <1 min  │ │  6 min  │ │  2 days │ │  5 days │     │
│                 │   └─────────┘ └─────────┘ └─────────┘ └─────────┘     │
│                 │                                                           │
│ [⟨ Collapse]    │                                                           │
└─────────────────┴──────────────────────────────────────────────────────────┘
```

#### Ingest View
```
┌────────────────────────────────────────────────────────────────────────────┐
│ TRIVIUM                                                                     │
├─────────────────┬──────────────────────────────────────────────────────────┤
│                 │ [× Close]  Import New Text                               │
│ [●] Dashboard   ├──────────────────────────────────────────────────────────┤
│ [ ] Library     │                                                           │
│                 │ ┌──────────────────┐  ┌──────────────────────────────┐ │
│ ▼ My Library    │ │ Metadata         │  │ Content Preview               │ │
│   ▼ Physics     │ │                  │  │                               │ │
│     • Quantum   │ │ Title *          │  │ The Art of Memory             │ │
│     • Classical │ │ ┌──────────────┐ │  │                               │ │
│   ▼ History     │ │ │              │ │  │ Lorem ipsum dolor sit amet,   │ │
│     • Ancient   │ │ └──────────────┘ │  │ consectetur adipiscing elit.  │ │
│     • Modern    │ │                  │  │ Sed do eiusmod tempor         │ │
│   • Math        │ │ Author           │  │ incididunt ut labore et       │ │
│                 │ │ ┌──────────────┐ │  │ dolore magna aliqua.          │ │
│                 │ │ │              │ │  │                               │ │
│ [Scroll area]   │ │ └──────────────┘ │  │ Ut enim ad minim veniam,      │ │
│                 │ │                  │  │ quis nostrud exercitation     │ │
│                 │ │ Collection *     │  │ ullamco laboris nisi ut       │ │
│                 │ │ ┌──────────────┐ │  │ aliquip ex ea commodo         │ │
│                 │ │ │ Physics    ▼ │ │  │ consequat.                    │ │
│                 │ │ └──────────────┘ │  │                               │ │
│                 │ │                  │  │ [Editable textarea with       │ │
│                 │ │ [Advanced ▼]     │  │  full formatting support]     │ │
│ [⟨ Collapse]    │ └──────────────────┘  └──────────────────────────────┘ │
│                 │                                                           │
│                 │ ┌─────────────────────────────────────────────────────┐ │
│                 │ │   [Cancel]                  [Import to Library]     │ │
│                 │ └─────────────────────────────────────────────────────┘ │
└─────────────────┴──────────────────────────────────────────────────────────┘
```

### Color & Typography
- Maintain existing Tailwind CSS v4 + shadcn/ui components
- Enhanced spacing and shadows for depth perception
- **Reading view**: Serif font (Charter/Georgia fallback), 20px, 1.8 line-height, max 70ch width
- **Dashboard & UI**: Sans-serif (Inter), clean card-based layout
- Improved contrast ratios for all text (WCAG AA minimum: 4.5:1)
- Dark mode support maintained

### Typography System
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-serif: 'Charter', 'Georgia', 'Cambria', serif;  /* For reading view */

Body text: 16px / 24px line-height
Reading text: 20px / 32px line-height (1.8)
Headings: 24px-36px with 600 weight
Metadata: 14px with muted foreground color
```

### Spacing & Layout
- Sidebar: 256px expanded, 64px collapsed, 300ms transition
- Main area: Dynamic width, max-w-4xl for reading, max-w-6xl for dashboard
- Card padding: 24px (p-6)
- Component spacing: 16-24px gaps (gap-4 to gap-6)
- Section margins: 32-48px (my-8 to my-12)

### Key Interactions
- **Sidebar**: Click collapse button to toggle, remembers state in localStorage
- **Tree**: Click folder to expand/collapse, drag texts between folders with visual feedback
- **Dashboard**: Click cards to navigate to reading/review views
- **Keyboard shortcuts**:
  - `Cmd/Ctrl + B`: Toggle sidebar
  - `Cmd/Ctrl + 1`: Dashboard
  - `Cmd/Ctrl + 2`: Library view
  - `Cmd/Ctrl + N`: Create flashcard (in reading view)
  - `Space`: Show answer (in review)
  - `1-4`: Grade cards (in review)

### Animation Strategy
- View transitions: 200ms fade + slide with cubic-bezier(0.4, 0, 0.2, 1)
- Sidebar collapse: 300ms width transition
- Hover effects: 150ms scale/shadow transitions
- **Respect `prefers-reduced-motion`**: Disable animations if user preference set

## Success Criteria
- ✅ Persistent sidebar with smooth collapse animation
- ✅ Dashboard shows reading progress, due cards, and stats at a glance
- ✅ Hierarchical library with drag & drop organization
- ✅ Clean, minimal aesthetic throughout application
- ✅ All existing features (reading, flashcards, review) work in new layout
- ✅ Improved legibility with proper typography, contrast, and spacing
- ✅ Smooth, professional transitions between views
- ✅ Keyboard-accessible navigation and shortcuts
- ✅ Professional, polished appearance worthy of production release

## Risk Mitigation
- **Backend changes isolated to Phase 3** (folders only) - can implement after frontend shell works
- **Phases 1-2 are frontend-only** (lower risk, faster iteration)
- **Existing review/reading logic preserved** - just re-layout, not refactoring core features
- **Can test each phase independently** before proceeding to next
- **Fallback plan**: If drag & drop proves complex, can defer to manual "move to folder" dropdown initially

## Technical Debt to Address
- Remove old Library page route (replaced by Dashboard + Sidebar)
- Clean up unused modal-based ingest component
- Consolidate routing logic in new AppShell
- Update any hardcoded navigation paths

## Performance Considerations
- **Lazy load** route components with React.lazy()
- **Virtualize tree** if library has >100 items (use react-window or similar)
- **Memoize** expensive tree calculations with useMemo
- **Debounce** drag operations and search/filter inputs
- **Code split** by route to reduce initial bundle size

## Accessibility Requirements
- All interactive elements keyboard-accessible with visible focus indicators
- ARIA labels for sidebar tree (role="tree", role="treeitem")
- Screen reader announcements for view transitions
- Skip links for keyboard users
- Color contrast meets WCAG AA standards
- Support for reduced motion preferences

## Dependencies to Add
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag & drop (recommended)
- OR `react-dnd` + `react-dnd-html5-backend` (alternative)
- `framer-motion` (optional, for advanced animations - may already be implicit in shadcn)

## Timeline Estimate
- **Phase 1**: 3-5 days (shell architecture)
- **Phase 2**: 3-4 days (dashboard components)
- **Phase 3**: 5-7 days (backend + tree + drag & drop)
- **Phase 4**: 4-5 days (adapt existing views)
- **Phase 5**: 3-5 days (polish and optimization)

**Total**: ~3-4 weeks for complete redesign

## Next Steps
1. Review and approve this plan
2. Create new branch `3_GUIredesign` from current `2_GUIupdate`
3. Begin Phase 1 implementation
4. Test each phase before proceeding to next
5. Update PROGRESS.md after each phase completion

---

## Appendix: Key Files Reference

### Existing Files to Modify
- `/src/App.tsx` - Replace router with AppShell structure
- `/src/routes/read/[id].tsx` - Adapt to shell layout
- `/src/routes/review/index.tsx` - Adapt to shell layout
- `/src/routes/library/index.tsx` - Remove (replaced by dashboard + sidebar)
- `/src/index.css` - Add new typography and animation utilities

### New Files to Create
- `/src/components/shell/AppShell.tsx`
- `/src/components/shell/Sidebar.tsx`
- `/src/components/shell/SidebarHeader.tsx`
- `/src/components/shell/SidebarFooter.tsx`
- `/src/components/library/LibraryTree.tsx`
- `/src/components/library/FolderNode.tsx`
- `/src/components/library/TextNode.tsx`
- `/src/routes/dashboard/index.tsx`
- `/src/components/dashboard/ContinueReadingCard.tsx`
- `/src/components/dashboard/DueReviewCard.tsx`
- `/src/components/dashboard/StatsCard.tsx`
- `/src/components/dashboard/RecentActivity.tsx`
- `/src/routes/ingest/index.tsx`
- `/src/stores/app.ts`
- `/src/stores/library.ts`
- `/src/hooks/useDragDrop.ts`
- `/src/hooks/useKeyboardShortcuts.ts`
- `/src/lib/animations.ts`

### Backend Files to Create (Phase 3)
- Migration: `create_folders_table`
- Migration: `add_folder_id_to_texts`
- `/src-tauri/src/commands/folder.rs`
- `/src-tauri/src/services/folder_service.rs`
- Update `/src-tauri/src/lib.rs` to register new commands
