# Flashcard Creation Hub - Quick Reference

## Visual Layout Comparison

### Current Reading View Flashcard Creation
```
┌─────────────────┬──────────────────────┬─────────────────┐
│                 │                      │  FLASHCARD      │
│   SIDEBAR       │   READING CONTENT    │  SIDEBAR        │
│   (Library)     │                      │                 │
│                 │  Article text here   │  Recent Read:   │
│                 │  with marks...       │  "marked text"  │
│                 │                      │                 │
│                 │                      │  [Create Card]  │
│                 │                      │                 │
└─────────────────┴──────────────────────┴─────────────────┘
```
**Issues**:
- Cramped sidebar space
- Context switching between reading and creating
- Limited mark navigation
- No batch processing capability

### New Flashcard Creation Hub
```
┌────────────────────────────────────────────────────────────┐
│  ← CREATE FLASHCARDS                                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [Scope Selector: Library / Folder / Text]                │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  MARK 3 OF 15                    [←Prev]  [Next→]    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  CONTEXT (with surrounding text)                     │ │
│  │  "...marked section with 200 chars before/after..."  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  QUESTION: [                                      ]   │ │
│  │  ANSWER:   [                                      ]   │ │
│  │  PREVIEW:  [Q: ... A: ...]                          │ │
│  │                              [Create Card →]         │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  CREATED CARDS (newest first)                        │ │
│  │  #5: Q: ... A: ...                        [Edit][×]  │ │
│  │  #4: Q: ... A: ...                        [Edit][×]  │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```
**Advantages**:
- Full-width dedicated workspace
- Systematic mark processing
- Batch creation with context
- Running list of created cards
- Skip/bury workflow options

---

## Keyboard Shortcuts at a Glance

### Global Navigation
```
Ctrl/Cmd + 4    →  Go to Create Cards Hub
Ctrl/Cmd + 1    →  Dashboard
Ctrl/Cmd + 2    →  Library
Ctrl/Cmd + 3    →  Review
```

### Mark Navigation
```
→  or  Ctrl/Cmd + J    →  Next mark
←  or  Ctrl/Cmd + K    →  Previous mark
Space                  →  Skip mark (reappears later)
Shift + B              →  Bury mark (0-card, won't reappear)
```

### Card Creation
```
Shift + Enter    →  Create card
Ctrl/Cmd + E     →  Edit last created card
Escape           →  Clear form / Cancel edit
```

### Scope Selection
```
Ctrl/Cmd + 1     →  Library scope
Ctrl/Cmd + 2     →  Folder scope
Ctrl/Cmd + 3     →  Text scope
Tab              →  Cycle through options
```

---

## User Workflows

### Workflow 1: Process All Library Marks
1. Press `Ctrl+3` (go to Create Cards)
2. Select "All Library" scope
3. Review mark context
4. Type question and answer
5. Press `Shift+Enter` to create
6. Auto-advances to next mark
7. Repeat until done

### Workflow 2: Focus on One Folder
1. Navigate to Create Cards
2. Select "Folder" scope
3. Choose folder from dropdown
4. Process marks from that folder only
5. Skip marks you're not ready for (Space)
6. Bury marks that don't need cards (Shift+B)

### Workflow 3: Quick Single-Text Cards
1. Go to Create Cards
2. Select "Text" scope
3. Pick specific text/article
4. Create cards just from that text
5. Great for focused study prep

### Workflow 4: Edit Recent Cards
1. Create several cards
2. Notice error in recent card
3. Click "Edit" on card in list
4. Form populates with card data
5. Make changes
6. Press "Update Card"

---

## Component Architecture

```
CreateCardsPage (Route: /create)
├── ScopeSelector
│   ├── Radio Group (Library/Folder/Text)
│   ├── FolderSelect (when Folder selected)
│   └── TextSelect (when Text selected)
│
├── MarkNavigation
│   ├── Progress Indicator (X of Y)
│   ├── Previous/Next Buttons
│   └── Skip/Bury Buttons
│
├── MarkContext
│   ├── Before Context (200 chars)
│   ├── Marked Text (highlighted)
│   ├── After Context (200 chars)
│   └── Source Attribution
│
├── CardCreator
│   ├── Question Textarea
│   ├── Answer Textarea
│   ├── Live Preview
│   └── Create/Clear Buttons
│
└── CreatedCardsList
    └── CreatedCardItem[]
        ├── Timestamp
        ├── Question/Answer Preview
        └── Edit/Delete Actions
```

---

## State Management (Zustand)

```typescript
// cardCreationStore
{
  // Scope
  scope: 'library' | 'folder' | 'text'
  selectedId: string | number | null

  // Marks
  marks: MarkWithContext[]
  currentMarkIndex: number

  // Session tracking
  skippedMarkIds: Set<number>
  buriedMarkIds: Set<number>

  // Created cards
  createdCards: CreatedCard[]

  // Actions
  setScope(scope, id?)
  loadMarks()
  nextMark()
  previousMark()
  skipMark()
  buryMark()
  createCard(q, a)
  editCard(id, q, a)
  deleteCard(id)
}
```

---

## Backend Commands Needed

```rust
// Fetch marks for scope
get_marks_for_scope(
  scope: ScopeType,
  scope_id: Option<String>,
  include_with_cards: bool
) -> Vec<MarkWithContext>

// Get context around mark
get_mark_context(
  mark_id: i64,
  context_chars: i32
) -> MarkContextData

// Mark actions
skip_mark(mark_id: i64) -> ()
bury_mark(mark_id: i64) -> ()

// Card creation
create_card_from_mark(
  mark_id: i64,
  question: String,
  answer: String
) -> CreatedCard

// Session tracking
get_created_cards_today() -> Vec<CreatedCard>
```

---

## Design System Integration

### Typography
- **Headers**: Inter, font-semibold
- **Context Display**: Charter/Georgia (serif), text-lg, leading-relaxed
- **UI Elements**: Inter, text-sm to text-base
- **Card Preview**: text-base, font-medium (Q), font-normal (A)

### Colors
- **Borders**: oklch(0.922 0 0) light, oklch(1 0 0 / 10%) dark
- **Backgrounds**: Card bg-card, Context bg-muted/30
- **Text**: Foreground for primary, muted-foreground for secondary
- **Accents**: border-primary for preview card left border

### Spacing
- **Container**: max-w-6xl mx-auto px-8 py-8
- **Section Gaps**: mb-6 between major sections
- **Panel Padding**: p-6 for bordered sections
- **Card Spacing**: space-y-4 in list

### Shadows
- **Panels**: shadow-card
- **Hover**: shadow-card-hover
- **Preview**: shadow-sm

---

## Accessibility Features

### ARIA Labels
- Scope selector: `role="radiogroup"`
- Mark navigation: `aria-live="polite"` for progress
- Form: `aria-required="true"` on inputs
- Cards list: `aria-label="Created flashcards"`

### Keyboard Navigation
- Full tab order through all interactive elements
- Arrow keys for mark navigation
- Enter/Space for button activation
- Escape for cancel/clear

### Screen Reader Support
- Announces mark changes
- Announces card creation success
- Announces errors clearly
- All controls have descriptive labels

### Visual Accessibility
- WCAG AA contrast (4.5:1 minimum)
- Focus indicators on all interactive elements
- Reduced motion support (@media prefers-reduced-motion)
- Clear visual hierarchy

---

## Empty States & Edge Cases

### No Marks Available
```
┌─────────────────────────────────┐
│  📚 No marks need cards yet!    │
│                                 │
│  All marked text already has    │
│  flashcards.                    │
│                                 │
│  [Change Scope] [Go to Reading] │
└─────────────────────────────────┘
```

### All Marks Processed
```
┌─────────────────────────────────┐
│  🎉 All marks processed!        │
│                                 │
│  You've created cards for all   │
│  marks in this scope.           │
│                                 │
│  [Change Scope] [Review Cards]  │
└─────────────────────────────────┘
```

### Loading State
```
┌─────────────────────────────────┐
│  Loading marks...               │
│  ████████████░░░░░░░  60%       │
└─────────────────────────────────┘
```

### Error State
```
┌─────────────────────────────────┐
│  ⚠️ Failed to load marks        │
│                                 │
│  Please try again or select a   │
│  different scope.               │
│                                 │
│  [Retry] [Change Scope]         │
└─────────────────────────────────┘
```

---

## Mark Status System

### Mark without Card
- Default state when mark first created
- Appears in creation hub
- Available for card creation

### Mark with Card(s)
- Has one or more flashcards
- Shows checkmark indicator
- Can create additional cards if needed
- `has_card` flag = true

### Skipped Mark
- User pressed Space (skip)
- Stored in session state (not DB)
- Will reappear next session
- Good for "not ready yet" marks

### Buried Mark (0-Card)
- User pressed Shift+B (bury)
- Marked in DB as intentionally cardless
- Won't appear in future sessions
- Good for reference-only marks

---

## Integration Points

### From Dashboard
- CreateCardsCard shows stats
- Click "Start Creating" → /create
- Shows pending marks count

### From Reading View
- Context menu: "Create card from mark"
- Opens hub with that specific mark
- Pre-selects text scope

### From Review
- After session: "Create more cards" CTA
- Empty state: Link to creation hub
- Source context linking

### To Review
- Newly created cards immediately available
- Can review same-day creations
- Cards maintain mark context

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Page Load | < 500ms | Initial hub load |
| Mark Transition | < 100ms | Switching between marks |
| Card Creation | < 200ms | Save and update UI |
| Scope Change | < 300ms | Load new mark set |
| Preview Update | < 150ms | Debounced typing |
| Memory Usage | < 150MB | For 100 marks loaded |

---

## Common Patterns

### Pattern: Batch Processing Session
```
1. Select folder scope
2. Navigate through marks sequentially (→)
3. Create card (Shift+Enter) or skip (Space)
4. Auto-advance to next
5. Continue until done
6. Review created cards in list
7. Edit any errors immediately
```

### Pattern: Quick Single-Mark Card
```
1. Go to hub (Ctrl+4)
2. Already on right mark? Create card
3. Otherwise navigate to mark (←/→)
4. Fill Q&A, preview
5. Create (Shift+Enter)
6. Done - can exit or continue
```

### Pattern: Cleanup Session
```
1. Select library scope
2. Go through all marks
3. Create cards for important marks
4. Bury reference-only marks (Shift+B)
5. Skip uncertain marks (Space)
6. Results in clean, intentional card set
```

---

## File Structure

```
src/
├── routes/
│   └── create/
│       └── index.tsx                 # Main hub page
│
├── components/
│   ├── create/
│   │   ├── ScopeSelector.tsx        # Scope selection UI
│   │   ├── MarkNavigation.tsx       # Prev/Next/Skip/Bury
│   │   ├── MarkContext.tsx          # Context display
│   │   ├── CardCreator.tsx          # Q&A form
│   │   ├── CardPreview.tsx          # Live preview
│   │   └── CreatedCardsList.tsx     # Cards list
│   │
│   └── dashboard/
│       └── CreateCardsCard.tsx      # Dashboard tile
│
├── lib/
│   └── stores/
│       └── cardCreation.ts          # Zustand store
│
└── src-tauri/
    └── src/
        └── commands/
            └── card_creation.rs      # Backend commands
```

---

## Testing Checklist

### Functionality
- [ ] Scope switching (Library/Folder/Text)
- [ ] Mark navigation (prev/next)
- [ ] Skip mark functionality
- [ ] Bury mark functionality
- [ ] Card creation
- [ ] Card editing
- [ ] Card deletion
- [ ] Auto-advance after create
- [ ] Form validation
- [ ] Error handling

### UI/UX
- [ ] All keyboard shortcuts work
- [ ] Animations smooth (or disabled with prefers-reduced-motion)
- [ ] Loading states appear correctly
- [ ] Empty states show appropriate messages
- [ ] Error states provide helpful guidance
- [ ] Preview updates in real-time
- [ ] Created cards list updates correctly

### Accessibility
- [ ] All controls keyboard accessible
- [ ] Tab order logical
- [ ] ARIA labels present
- [ ] Screen reader announcements work
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

### Performance
- [ ] Page loads in < 500ms
- [ ] Mark transitions smooth
- [ ] No lag when typing in form
- [ ] Large mark sets (100+) handled well
- [ ] Memory usage reasonable

### Integration
- [ ] Dashboard tile shows correct stats
- [ ] Sidebar navigation works
- [ ] Reading view link works
- [ ] Review integration works
- [ ] Cards appear in review immediately

---

**Quick Start Implementation**:

1. **Backend First**: Create Tauri commands for mark fetching and card creation
2. **Store Setup**: Build cardCreation Zustand store
3. **Core UI**: ScopeSelector, MarkNavigation, MarkContext components
4. **Card Creation**: CardCreator, CardPreview, form handling
5. **Card List**: CreatedCardsList with edit/delete
6. **Integration**: Add to sidebar, dashboard tile
7. **Polish**: Shortcuts, accessibility, animations, error handling

---

**End of Quick Reference**

This document provides a condensed overview for quick lookups during implementation. See `FLASHCARD_CREATION_HUB_DESIGN.md` for complete specifications.
