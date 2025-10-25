# Links Sidebar Feature - Executive Summary

**Date**: 2025-10-20
**Status**: Implemented (Phase 21) + Scroll Preservation Fix (Phase 27, 2025-10-25)
**Estimated Effort**: Phase 1 MVP (8-12 hours) + Phase 2 Polish (4-6 hours)
**Post-Implementation Fix**: Phase 27 - Scroll position preservation system (see PROGRESS.md)

---

## Problem Statement

The current link context menu approach (alt+click) has critical UX issues:

1. **Breaks native text selection** - Event handlers interfere with normal browser selection behavior
2. **Poor discoverability** - Users don't know about alt+click, hidden feature
3. **Blocks native context menu** - Users can't access "Copy link", "Open in new tab"
4. **Limited scope** - Shows one link at a time, no overview
5. **Event handling complexity** - stopPropagation creates conflicts with SelectionToolbar

## Solution Overview

**Replace context menu with dedicated Links Sidebar** - a new panel that:

- Shows ALL links in the article at once
- Provides clear "Ingest" and "Open" buttons for each link
- Deduplicates links intelligently (same article, different sections)
- Never interferes with native text selection
- Follows familiar pattern (mirrors existing Flashcard sidebar)

## Key Features

### 1. Dual-Mode Sidebar

Reading view sidebar now has TWO modes:
- **Flashcards Mode** (existing) - Shows flashcards for current text
- **Links Mode** (new) - Shows all article links

Toggle buttons in header: `[Cards] [Links]`

### 2. Intelligent Link Deduplication

**Problem**: Wikipedia articles often reference same page multiple times:
```
https://en.wikipedia.org/wiki/Natural_selection
https://en.wikipedia.org/wiki/Natural_selection#History
https://en.wikipedia.org/wiki/Natural_selection#Modern_synthesis
```

**Solution**: Show as ONE entry with frequency indicator:
```
┌─────────────────────────────────┐
│ Natural Selection               │
│ wikipedia.org/wiki/Natural...   │
│ Appears 3 times • Sections: ... │
│ [Ingest] [Open] [Copy]         │
└─────────────────────────────────┘
```

**Algorithm**:
- Group by base URL (protocol + host + path, NO hash)
- Query parameters kept separate (different resources)
- Choose best title (longest non-URL text)
- Show frequency and section names

### 3. Clear Action Buttons

Each link has three actions:
1. **[Ingest]** - Primary button, navigates to /ingest page (existing flow)
2. **[Open]** - Secondary button, opens in external browser
3. **[Copy]** - Icon button, copies URL to clipboard

### 4. Zero Interference with Selection

**Removed**:
- onContextMenu handler
- Event interception
- stopPropagation calls

**Result**: Native browser text selection works perfectly. Right-click on links shows standard browser menu.

## Visual Mockups

### Current State (Before)
```
┌────────────────────────────────────────────────┐
│ Reading View Header                    [⋮]    │
├────────────────────────────────────────────────┤
│                                                │
│  Article text with [link] continues...        │
│  ████████████████ (read)                      │
│                                                │
│  User must alt+click link → Context menu      │
│  [Open in Ingest]                             │
│  [Open in Browser]                            │
│                                                │
│  Problem: Breaks text selection               │
└────────────────────────────────────────────────┘
```

### Proposed State (After)
```
╔═══════════════════════════════════════════════════════════════╗
║ ┌───────────────────────────────────────────────────────────┐ ║
║ │ Reading View          [Cards][Links][Search][⋮]          │ ║
║ │                         ^^^^^  ^^^^^                      │ ║
║ │                         Mode toggle buttons               │ ║
║ └───────────────────────────────────────────────────────────┘ ║
║ ┌─────────────────────────────────┬─────────────────────────┐ ║
║ │ Article Content                 │ Links Sidebar           │ ║
║ │                                 │ ┌─────────────────────┐ │ ║
║ │ Text with [link] continues...  │ │ Links (5)       [×] │ │ ║
║ │ ████████████████ (read)        │ ├─────────────────────┤ │ ║
║ │                                 │ │                     │ │ ║
║ │ More text with [another link]  │ │ ┌─────────────────┐ │ │ ║
║ │                                 │ │ │ Natural Select. │ │ │ ║
║ │ Native selection works!         │ │ │ wikipedia.org/..│ │ │ ║
║ │                                 │ │ │                 │ │ │ ║
║ │                                 │ │ │ [Ingest][Open]  │ │ │ ║
║ │                                 │ │ └─────────────────┘ │ │ ║
║ │                                 │ │                     │ │ ║
║ │                                 │ │ ┌─────────────────┐ │ │ ║
║ │                                 │ │ │ Evolution       │ │ │ ║
║ │                                 │ │ │ wikipedia.org/..│ │ │ ║
║ │                                 │ │ │ [Ingest][Open]  │ │ │ ║
║ │                                 │ │ └─────────────────┘ │ │ ║
║ └─────────────────────────────────┴─────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════╝

Benefits:
✓ All links visible at once
✓ Native text selection preserved
✓ Clear, discoverable actions
✓ No event interception
```

## Technical Architecture

### New Components

```
src/lib/stores/linksSidebar.ts              - Zustand store
src/lib/components/reading/
  ├── LinksSidebar.tsx                      - Main sidebar container
  ├── LinkItem.tsx                          - Individual link card
  └── SidebarToggleButtons.tsx              - [Cards][Links] switcher
```

### Modified Components

```
src/routes/read/[id].tsx                    - Add toggle buttons, integrate sidebar
src/lib/components/reading/ReadHighlighter.tsx - REMOVE context menu code
```

### Deleted Components

```
src/lib/components/reading/LinkContextMenu.tsx - DELETE (no longer needed)
```

### State Management

**Zustand Store** (`linksSidebar.ts`):
```typescript
interface LinksSidebarState {
  sidebarMode: 'flashcards' | 'links'
  isCollapsed: boolean
  links: DeduplicatedLink[]

  setSidebarMode(mode): void
  extractAndSetLinks(content): void  // Parses markdown, deduplicates
}
```

**Integration**:
- Extract links when text loads: `useEffect(() => extractAndSetLinks(content), [content])`
- Re-extract after inline editing saves
- Links regenerated (not persisted) - always fresh

## User Flows

### Discovering the Feature

1. User opens article with links
2. Sees `[Cards] [Links]` toggle buttons in header
3. Clicks `[Links]` button
4. Sidebar switches from Flashcards to Links mode
5. All article links displayed with actions

### Using the Feature

**Happy Path**:
1. User sees "Natural Selection" link in sidebar
2. Clicks `[Ingest]` button
3. Navigates to /ingest page with URL pre-filled (existing behavior)
4. User returns via back button
5. Scroll position preserved (existing behavior)

**Alternative Actions**:
- Click `[Open]` → Opens in system browser
- Click `[Copy]` → Copies URL to clipboard, shows checkmark confirmation

### Native Selection (Restored)

1. User selects text that includes a link
2. Native browser selection highlights normally (no interference!)
3. User can copy, use selection toolbar, etc.
4. Right-click shows BROWSER context menu (not custom)

## Performance

**Benchmarks** (Target):
- Link extraction: <50ms for 200 links
- Deduplication: <20ms
- Total: <70ms (imperceptible)

**Optimization**:
- Memoize extraction (only re-run when content changes)
- No virtualization needed (<100 unique links typical)
- Shallow comparison for re-renders

## Accessibility

**Keyboard Navigation**:
- Tab through all link action buttons
- Enter/Space to activate
- Proper focus indicators

**Screen Reader**:
- "Links sidebar opened. 5 links found."
- "Natural Selection. Wikipedia link. Ingest button."
- ARIA labels on all interactive elements

**WCAG Compliance**:
- Color contrast: 4.5:1 minimum
- Large click targets: 32px minimum
- Focus rings visible in all modes

## Implementation Phases

### Phase 1: Core MVP (8-12 hours)

**Tasks**:
1. Create `linksSidebar.ts` store with extraction algorithm
2. Create `LinksSidebar.tsx` container component
3. Create `LinkItem.tsx` card component
4. Create `SidebarToggleButtons.tsx` switcher
5. Integrate into `ReadPage.tsx`
6. Remove context menu from `ReadHighlighter.tsx`
7. Delete `LinkContextMenu.tsx`
8. Test: extraction accuracy, deduplication, navigation

**Deliverables**:
- Working sidebar with basic functionality
- Link deduplication working
- Navigation to ingest page working
- Native text selection restored

### Phase 2: Polish (4-6 hours)

**Tasks**:
1. Add frequency display ("Appears 3 times • Sections: ...")
2. Add Copy URL button with clipboard feedback
3. Improve empty state (icon + messaging)
4. Add keyboard shortcut (Ctrl+Shift+L)
5. Accessibility audit (ARIA, screen reader testing)
6. Performance optimization (memoization, debouncing)

**Deliverables**:
- Frequency indicators
- Copy to clipboard
- Keyboard shortcut
- Full accessibility support

### Phase 3: Advanced Features (Future)

**Potential Enhancements**:
- Search/filter links by title or domain
- Group links by domain (collapsible)
- "Already ingested" indicator (check if URL in library)
- Bulk ingest (select multiple, queue for batch)
- Link annotations (user notes, tags)

## Migration from Context Menu

### Code Changes

**Files to Delete**:
```diff
- src/lib/components/reading/LinkContextMenu.tsx
```

**Files to Modify**:
```diff
// src/lib/components/reading/ReadHighlighter.tsx
- import { LinkContextMenu } from './LinkContextMenu'
- const [contextMenu, setContextMenu] = useState(...)
- const handleContextMenu = useCallback(...)
- onContextMenu={linksEnabled ? handleContextMenu : undefined}
- {contextMenu && <LinkContextMenu ... />}

// Keep handleClick with selection check (still needed for regular clicks)
```

### User Communication

**Changelog Entry**:
```
## New Feature: Links Sidebar

Replaced link context menu with a dedicated Links sidebar.

What Changed:
• Right-clicking links now shows native browser menu (copy, open in new tab)
• New [Links] button in header shows all article links
• Each link has [Ingest] and [Open] buttons
• Links automatically deduplicated (same article, different sections)
• Text selection works perfectly (no interference)

Migration:
• Alt+click no longer shows custom context menu
• Use [Links] sidebar button instead
```

## Design Rationale

### Why Sidebar Over Context Menu?

**Context Menu Issues**:
- Breaks native browser UX expectations
- Interferes with text selection
- Hidden feature (low discoverability)
- Shows one link at a time (no overview)

**Sidebar Benefits**:
- Preserves native browser behavior
- Zero selection interference
- Visible, discoverable toggle
- Shows ALL links at once
- Familiar pattern (like Flashcards)

### Why Deduplicate?

Wikipedia articles often reference same page 5-10 times with different anchors. Showing all separately creates clutter:
```
Natural Selection
Natural Selection
Natural Selection
Natural Selection
Natural Selection
```

With deduplication:
```
Natural Selection (appears 5 times)
```

Clean, informative, actionable.

### Why Separate Ingest/Open Buttons?

**Different User Intents**:
- Ingest = "Save for later reading in Trivium"
- Open = "Quick reference check in browser"

Making Ingest primary (left position, solid background) guides users toward Trivium workflow while keeping browser option accessible.

## Risk Assessment

**Low Risk**:
- No backend changes required
- Uses existing navigation patterns (/ingest page)
- Removal of problematic code (context menu)
- Familiar UI pattern (sidebar already exists)

**Potential Issues**:
- Performance with 500+ link articles (mitigated: memoization, no virtualization needed)
- URL parsing edge cases (mitigated: comprehensive test suite)
- User adjustment period (mitigated: clear changelog, intuitive UI)

## Success Metrics

**Functional**:
- [ ] Link extraction accuracy: 99%+ for markdown/bare URLs
- [ ] Deduplication correctness: Groups all same-base URLs
- [ ] Navigation success: Ingest button takes to /ingest 100%
- [ ] Selection compatibility: Zero interference with native selection

**Performance**:
- [ ] Extraction time: <50ms for 200 links
- [ ] Render time: <16ms for 50 link items
- [ ] No frame drops during scroll

**UX**:
- [ ] Discoverability: Users find [Links] button without instruction
- [ ] Clarity: Users understand Ingest vs Open distinction
- [ ] Efficiency: Reduce time to ingest linked article by 50%

## Dependencies

**Required**:
- React hooks (useState, useEffect, useMemo, useCallback)
- Zustand (state management)
- Tailwind v4 (styling)
- Lucide icons (Download, ExternalLink, Copy, ChevronLeft, Link)
- shadcn/ui Button, Tooltip components
- Existing navigation utilities (useNavigate, location state)

**No New Dependencies**: All libraries already in project.

## Testing Strategy

### Unit Tests
- Link extraction from markdown
- Bare URL detection
- Empty link filtering
- Deduplication algorithm
- URL parsing (base, anchor, query params)
- Title selection logic

### Integration Tests
- Sidebar mode switching
- Navigation to ingest page
- Link extraction on text load
- Re-extraction on inline edit
- Collapse/expand behavior

### Manual Testing
- Large articles (500+ links)
- Mixed link types (Wikipedia, external, bare URLs)
- Dark mode styling
- Keyboard navigation
- Screen reader compatibility
- Text selection across links

## Conclusion

This Links Sidebar feature solves critical UX issues with the context menu approach while providing superior functionality:

✅ **Preserves native browser behavior** - No selection interference
✅ **Improves discoverability** - Visible toggle button
✅ **Provides overview** - All links at once
✅ **Intelligent deduplication** - Reduces clutter
✅ **Familiar pattern** - Matches Flashcard sidebar
✅ **Clear actions** - Ingest/Open/Copy buttons
✅ **Accessible** - Full keyboard + screen reader support
✅ **Performant** - <70ms overhead
✅ **Low risk** - No backend changes, uses existing patterns

**Ready for implementation** - All components, algorithms, and integration points fully specified.

---

**Files**:
- Full Design: `/Users/why/repos/trivium/LINKS_SIDEBAR_DESIGN.md`
- Layout Guide: `/Users/why/repos/trivium/layout-guide.md` (updated)
- This Summary: `/Users/why/repos/trivium/LINKS_SIDEBAR_SUMMARY.md`
