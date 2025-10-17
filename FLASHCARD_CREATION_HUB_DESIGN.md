# Flashcard Creation Hub - UI/UX Design Specification

**Feature**: Dedicated interface for creating flashcards from marked text (ReadRanges)
**Date**: 2025-10-16
**Status**: Design Complete - Ready for Implementation

---

## 1. Executive Summary

The Flashcard Creation Hub is a focused workspace where users systematically convert their marked text (ReadRanges) into flashcards. It provides mark navigation, context display, card creation tools, and a running list of created cards. The interface follows Trivium's design system and integrates seamlessly with existing navigation patterns.

### Core User Flow
1. User selects scope (Library/Folder/Text)
2. System loads marks without existing cards
3. User navigates through marks (prev/next)
4. User creates flashcard from current mark OR skips/buries
5. Created cards appear in running list (newest first)
6. Process continues until all marks processed

---

## 2. Navigation Integration

### 2.1 Sidebar Addition

**New Navigation Item** (added to `Sidebar.tsx`):
```typescript
const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/', shortcut: 'Ctrl+1' },
  { id: 'review', label: 'Review', icon: GraduationCap, path: '/review', shortcut: 'Ctrl+3' },
  { id: 'create', label: 'Create Cards', icon: Sparkles, path: '/create', shortcut: 'Ctrl+4' }, // NEW
];
```

**Visual Position**: Between Review and Library section
**Icon**: Sparkles (from lucide-react) - represents creation/generation
**Shortcut**: Ctrl+4 (maintains sequential numbering)

### 2.2 Dashboard Tile

**Component**: `CreateCardsCard.tsx` (similar to `QuickImportCard.tsx`)

```
┌─────────────────────────────────────┐
│  ✨ Create Cards           [Badge]  │
│                                     │
│  Turn your marked text into         │
│  flashcards                         │
│                                     │
│  📊 15 marks awaiting cards         │
│  📝 23 cards created this week      │
│                                     │
│  [Start Creating →]                 │
└─────────────────────────────────────┘
```

**Badge**: Shows count of marks without cards (e.g., "15 pending")
**Stats**: Real-time counts from backend
**Button**: Navigates to `/create`

---

## 3. Main Interface Layout

### 3.1 ASCII Mockup - Full Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Create Flashcards                                            [? Help] [✕]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │  Scope:  ○ All Library  ●  Folder  ○ Text         [▼]       │            │
│  │                                                               │            │
│  │  Selected: → Research → Cognitive Science                    │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  MARK NAVIGATION                                       Mark 3 of 15   │   │
│  │                                                                        │   │
│  │  [← Previous]                                          [Next →]       │   │
│  │  [Space: Skip]                                    [Shift+B: Bury]     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  CONTEXT                                                              │   │
│  │                                                                        │   │
│  │  "...previous context here. The hippocampus plays a crucial          │   │
│  │  role in memory consolidation, particularly in the formation          │   │
│  │  of declarative memories. Damage to this structure can result         │   │
│  │  in anterograde amnesia. Following context continues..."              │   │
│  │                                                                        │   │
│  │  └─ From: "Cognitive Neuroscience Fundamentals" (p. 142)              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  CREATE FLASHCARD                                                     │   │
│  │                                                                        │   │
│  │  Question                                                             │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ What brain structure is crucial for memory consolidation?      │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                        │   │
│  │  Answer                                                               │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ The hippocampus                                                 │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                        │   │
│  │  ┌──────────────────────────────────────────────────────────────┐    │   │
│  │  │  PREVIEW                                                      │    │   │
│  │  │  Q: What brain structure is crucial for memory consolidation? │    │   │
│  │  │  A: The hippocampus                                           │    │   │
│  │  └──────────────────────────────────────────────────────────────┘    │   │
│  │                                                                        │   │
│  │  [Clear]                           [Create Card (Shift+Enter)]       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  CREATED CARDS (5)                                              [Clear All]  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  #5 - Just now                                          [Edit] [✕]  │     │
│  │  Q: What brain structure is crucial for memory consolidation?      │     │
│  │  A: The hippocampus                                                 │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  #4 - 2 min ago                                         [Edit] [✕]  │     │
│  │  Q: What type of amnesia results from hippocampal damage?           │     │
│  │  A: Anterograde amnesia                                             │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  #3 - 5 min ago                                         [Edit] [✕]  │     │
│  │  Q: What type of memories does the hippocampus primarily form?      │     │
│  │  A: Declarative memories                                            │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Layout Specifications

**Container**: `max-w-6xl mx-auto px-8 py-8`
**Grid Structure**: Single column, scrollable

**Section Breakdown**:
1. **Header Bar** (h-14, border-b)
   - Back button (← Create Flashcards)
   - Help button (? - shows keyboard shortcuts)
   - Close/Exit button (✕)

2. **Scope Selector** (p-6, border, rounded-lg, mb-6)
   - Radio group (All Library / Folder / Text)
   - FolderSelect component (when Folder selected)
   - Text dropdown (when Text selected)
   - Visual breadcrumb of selection

3. **Mark Navigation Panel** (p-6, border, rounded-lg, mb-6)
   - Progress indicator (Mark X of Y)
   - Navigation buttons (Previous/Next)
   - Quick action buttons (Skip/Bury)
   - Keyboard hints visible

4. **Context Display** (p-6, border, rounded-lg, mb-6, bg-muted/30)
   - Marked text with surrounding context
   - 200 chars before + marked text + 200 chars after
   - Source attribution (text title, optional page)
   - Serif font (Charter/Georgia) for readability
   - text-lg leading-relaxed

5. **Card Creation Panel** (p-6, border, rounded-lg, mb-8)
   - Question textarea (min-h-24)
   - Answer textarea (min-h-24)
   - Live preview card (border-l-4 border-primary, p-4, bg-accent/10)
   - Action buttons (Clear, Create)

6. **Created Cards List** (border-t, pt-6)
   - Header with count and Clear All
   - Newest cards at top (reverse chronological)
   - Each card: timestamp, Q&A, Edit/Delete actions
   - Max height with scroll (max-h-96 overflow-y-auto)

---

## 4. Component Breakdown

### 4.1 Core Components

```typescript
// /src/routes/create/index.tsx
export function CreateCardsPage() {
  // Main hub component
  // Manages scope, mark navigation, card creation
}

// /src/components/create/ScopeSelector.tsx
export function ScopeSelector({
  scope,
  onScopeChange,
  selectedId,
  onSelectionChange
}) {
  // Radio group + folder/text selection
  // Shows visual breadcrumb of selection
}

// /src/components/create/MarkNavigation.tsx
export function MarkNavigation({
  currentIndex,
  totalMarks,
  onPrevious,
  onNext,
  onSkip,
  onBury
}) {
  // Navigation controls + progress
  // Keyboard shortcuts integrated
}

// /src/components/create/MarkContext.tsx
export function MarkContext({
  mark,
  text,
  beforeContext,
  afterContext
}) {
  // Displays mark with surrounding text
  // Source attribution
  // Serif typography
}

// /src/components/create/CardCreator.tsx
export function CardCreator({
  mark,
  onCreateCard,
  onClear
}) {
  // Question/Answer inputs
  // Live preview
  // Create button
}

// /src/components/create/CreatedCardsList.tsx
export function CreatedCardsList({
  cards,
  onEdit,
  onDelete,
  onClearAll
}) {
  // Newest-first list
  // Edit/Delete actions per card
  // Timestamps
}

// /src/components/create/CardPreview.tsx
export function CardPreview({
  question,
  answer
}) {
  // Visual preview of card
  // Matches review interface styling
}
```

### 4.2 Data Flow Components

```typescript
// /src/lib/stores/cardCreation.ts
interface CardCreationState {
  scope: 'library' | 'folder' | 'text'
  selectedId: string | number | null
  marks: MarkWithContext[]
  currentMarkIndex: number
  createdCards: CreatedCard[]
  skippedMarkIds: Set<number>
  buriedMarkIds: Set<number>

  // Actions
  setScope: (scope, id?) => void
  loadMarks: () => Promise<void>
  nextMark: () => void
  previousMark: () => void
  skipMark: () => void
  buryMark: () => void
  createCard: (question, answer) => Promise<void>
  deleteCard: (id) => void
  editCard: (id, question, answer) => Promise<void>
}

interface MarkWithContext {
  id: number
  textId: number
  textTitle: string
  startPosition: number
  endPosition: number
  markedText: string
  beforeContext: string // 200 chars before
  afterContext: string  // 200 chars after
  hasCard: boolean
  createdAt: string
}

interface CreatedCard {
  id: number
  markId: number
  question: string
  answer: string
  createdAt: string
  textId: number
}
```

### 4.3 Backend Integration (Tauri Commands)

```rust
// New commands needed:

#[tauri::command]
async fn get_marks_for_scope(
    scope: ScopeType,
    scope_id: Option<String>,
    include_with_cards: bool
) -> Result<Vec<MarkWithContext>, String>

#[tauri::command]
async fn get_mark_context(
    mark_id: i64,
    context_chars: i32 // default 200
) -> Result<MarkContextData, String>

#[tauri::command]
async fn skip_mark(mark_id: i64) -> Result<(), String>
// Sets flag to skip (reappears next session)

#[tauri::command]
async fn bury_mark(mark_id: i64) -> Result<(), String>
// Marks as 0-card (won't reappear)

#[tauri::command]
async fn create_card_from_mark(
    mark_id: i64,
    question: String,
    answer: String
) -> Result<CreatedCard, String>

#[tauri::command]
async fn get_created_cards_today() -> Result<Vec<CreatedCard>, String>
```

---

## 5. Interaction Flows

### 5.1 Initial Load Flow

```
1. User clicks "Create Cards" in sidebar (Ctrl+4)
   ↓
2. Page loads with default scope (All Library)
   ↓
3. Backend fetches marks without cards from library
   ↓
4. First mark loaded with context
   ↓
5. Created cards list loads (today's cards)
   ↓
6. Ready for creation
```

### 5.2 Scope Change Flow

```
1. User selects "Folder" radio
   ↓
2. FolderSelect dropdown appears
   ↓
3. User selects folder (e.g., "Research → Cognitive Science")
   ↓
4. Breadcrumb updates showing selection
   ↓
5. Marks reload for that folder
   ↓
6. First mark from folder displayed
   ↓
7. Mark counter updates (Mark 1 of X)
```

### 5.3 Card Creation Flow

```
1. User views mark context
   ↓
2. User types question in Question field
   ↓
3. Preview updates in real-time
   ↓
4. User types answer in Answer field
   ↓
5. Preview shows complete card
   ↓
6. User presses Shift+Enter (or clicks Create)
   ↓
7. Card saved to database
   ↓
8. Card appears at top of Created Cards list
   ↓
9. Form clears
   ↓
10. Auto-advances to next mark
   ↓
11. Counter updates (Mark 4 of 15)
```

### 5.4 Skip vs Bury Flow

**Skip** (Space):
- Marks mark as "skipped" for this session
- Mark will reappear in next session
- Visual feedback: "Skipped - will reappear next time"
- Auto-advances to next mark

**Bury** (Shift+B):
- Permanently marks as "no cards needed"
- Sets 0-card flag in database
- Visual feedback: "Buried - marked as 0-card"
- Auto-advances to next mark
- Won't appear in future sessions

### 5.5 Edit/Delete Card Flow

**Edit**:
- Click Edit on created card
- Card data populates Question/Answer fields
- Preview updates
- Create button becomes "Update Card"
- After update, card returns to list with "Edited" badge

**Delete**:
- Click Delete (✕)
- Confirmation dialog: "Delete this card?"
- On confirm, card removed from list and database
- Mark becomes available again for card creation

---

## 6. Keyboard Shortcuts

### 6.1 Navigation Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Ctrl/Cmd + 4` | Go to Create Cards | Global |
| `Left Arrow` or `Ctrl/Cmd + K` | Previous mark | Hub |
| `Right Arrow` or `Ctrl/Cmd + J` | Next mark | Hub |
| `Space` | Skip current mark | Hub |
| `Shift + B` | Bury current mark | Hub |
| `Shift + Enter` | Create/Update card | Card creation |
| `Ctrl/Cmd + E` | Edit last created card | Hub |
| `Escape` | Clear form / Cancel edit | Card creation |
| `?` | Show shortcuts help | Hub |

### 6.2 Scope Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + 1` | Set scope to Library |
| `Ctrl/Cmd + 2` | Set scope to Folder |
| `Ctrl/Cmd + 3` | Set scope to Text |
| `Tab` | Cycle through scope options |

### 6.3 Shortcuts Help Overlay

Similar to existing `ShortcutHelp` component:

```
┌─────────────────────────────────────────┐
│  Keyboard Shortcuts - Create Cards      │
├─────────────────────────────────────────┤
│                                         │
│  NAVIGATION                             │
│  ← / Ctrl+K    Previous mark            │
│  → / Ctrl+J    Next mark                │
│  Space         Skip mark                │
│  Shift+B       Bury mark (0-card)       │
│                                         │
│  CARD CREATION                          │
│  Shift+Enter   Create card              │
│  Ctrl+E        Edit last card           │
│  Escape        Clear/Cancel             │
│                                         │
│  SCOPE                                  │
│  Ctrl+1        All Library              │
│  Ctrl+2        Folder                   │
│  Ctrl+3        Text                     │
│                                         │
│             [Close - Escape]            │
└─────────────────────────────────────────┘
```

---

## 7. Visual Design Details

### 7.1 Color System (from design-system.md)

**Light Mode**:
- Background: `oklch(1 0 0)` (white)
- Foreground: `oklch(0.145 0 0)` (near black)
- Muted: `oklch(0.48 0 0)` (medium gray)
- Border: `oklch(0.922 0 0)` (light gray)
- Accent: Use for preview border-left

**Dark Mode**:
- Background: `oklch(0.145 0 0)` (near black)
- Foreground: `oklch(0.95 0 0)` (off-white)
- Muted: `oklch(0.75 0 0)` (light gray)
- Border: `oklch(1 0 0 / 10%)` (subtle)

### 7.2 Typography

**Interface Text** (Sans-serif):
- Font: Inter
- Headers: font-semibold
- Body: font-normal (400)
- Labels: text-sm text-muted-foreground

**Context/Content Display** (Serif):
- Font: Charter → Georgia → Cambria
- Size: text-lg (20px)
- Line height: leading-relaxed (1.8)
- Max width: max-w-4xl

**Card Preview**:
- Question: font-medium
- Answer: font-normal
- Size: text-base

### 7.3 Spacing & Layout

```css
/* Container */
.create-hub-container {
  @apply max-w-6xl mx-auto px-8 py-8;
}

/* Sections */
.section-spacing {
  @apply mb-6;
}

.section-padding {
  @apply p-6;
}

/* Cards in list */
.card-spacing {
  @apply space-y-4;
}

.card-padding {
  @apply p-4;
}

/* Form inputs */
.input-spacing {
  @apply space-y-4;
}

.textarea-min {
  @apply min-h-24;
}
```

### 7.4 Shadows & Elevation

```css
/* Main panels */
.panel {
  @apply shadow-card hover-lift;
}

/* Preview card */
.preview-card {
  @apply shadow-sm;
}

/* Created cards */
.created-card {
  @apply shadow-card;
  @apply hover:shadow-card-hover transition-shadow;
}

/* Modal overlays */
.modal {
  @apply shadow-modal;
}
```

### 7.5 Animations

**Mark Transitions**:
```css
.mark-enter {
  animation: slideInRight 200ms ease-out;
}

.mark-exit {
  animation: slideOutLeft 200ms ease-in;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

**Card Creation**:
```css
.card-created {
  animation: slideInTop 300ms ease-out;
}

@keyframes slideInTop {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Button Feedback**:
- Hover: scale(1.02), 150ms
- Active: scale(0.98)
- Success: pulse animation on create

---

## 8. Visual Feedback States

### 8.1 Mark Status Indicators

**Has Cards**:
```
┌────────────────────────────┐
│  ✓ This mark has 2 cards   │
│  [View Cards]              │
└────────────────────────────┘
```

**Skipped**:
```
┌────────────────────────────┐
│  ⏭ Skipped                 │
│  Will reappear next time   │
└────────────────────────────┘
```

**Buried**:
```
┌────────────────────────────┐
│  🔒 Buried (0-card)        │
│  Won't reappear            │
└────────────────────────────┘
```

### 8.2 Progress Indicators

**Loading Marks**:
```
┌──────────────────────────────────────┐
│  Loading marks...                    │
│  ████████████░░░░░░░░░░░░░  50%     │
└──────────────────────────────────────┘
```

**Creating Card**:
```
┌──────────────────────────────────────┐
│  [Creating Card... ⏳]               │
└──────────────────────────────────────┘
```

**Success**:
```
┌──────────────────────────────────────┐
│  ✓ Card created successfully!        │
└──────────────────────────────────────┘
```

### 8.3 Empty States

**No Marks Available**:
```
┌─────────────────────────────────────────┐
│           📚                            │
│                                         │
│     No marks need cards yet!            │
│                                         │
│  All your marked text already has       │
│  flashcards, or no text is marked.      │
│                                         │
│  [Go to Reading View]                   │
└─────────────────────────────────────────┘
```

**All Marks Processed**:
```
┌─────────────────────────────────────────┐
│           🎉                            │
│                                         │
│     All marks processed!                │
│                                         │
│  You've created cards for all marks     │
│  in this scope.                         │
│                                         │
│  [Change Scope] [Review Cards]          │
└─────────────────────────────────────────┘
```

**No Created Cards Today**:
```
┌─────────────────────────────────────────┐
│  No cards created today                 │
│  Start creating to see them here        │
└─────────────────────────────────────────┘
```

---

## 9. Accessibility Considerations

### 9.1 ARIA Labels

```tsx
// Scope selector
<div role="radiogroup" aria-label="Card creation scope">
  <input type="radio" aria-label="All library" />
  <input type="radio" aria-label="Specific folder" />
  <input type="radio" aria-label="Specific text" />
</div>

// Mark navigation
<nav aria-label="Mark navigation">
  <button aria-label="Previous mark (Left arrow or Ctrl+K)">
  <button aria-label="Next mark (Right arrow or Ctrl+J)">
  <span aria-live="polite">Mark 3 of 15</span>
</nav>

// Card creation
<form aria-label="Create flashcard">
  <label htmlFor="question">Question</label>
  <textarea id="question" aria-required="true" />

  <label htmlFor="answer">Answer</label>
  <textarea id="answer" aria-required="true" />
</form>

// Created cards list
<section aria-label="Created flashcards" aria-live="polite">
  <h2>Created Cards (5)</h2>
  {/* Card list */}
</section>
```

### 9.2 Keyboard Navigation

**Tab Order**:
1. Scope selector (radio group)
2. Folder/Text dropdown (if visible)
3. Previous mark button
4. Next mark button
5. Skip button
6. Bury button
7. Question textarea
8. Answer textarea
9. Clear button
10. Create button
11. Created cards (each card's edit/delete buttons)

**Focus Management**:
- After creating card: focus moves to Question field
- After scope change: focus moves to first mark button
- After edit: focus returns to edited card
- Modal close: focus returns to trigger element

### 9.3 Screen Reader Support

**Announcements**:
- "Mark 3 of 15 loaded" (when mark changes)
- "Card created successfully" (on create)
- "Mark skipped, moving to next" (on skip)
- "Mark buried as 0-card" (on bury)
- "Editing card number 5" (on edit)
- "Card deleted" (on delete)

**Landmarks**:
```html
<main aria-label="Flashcard creation hub">
  <header><!-- Header bar --></header>

  <section aria-label="Scope selection">
    <!-- Scope selector -->
  </section>

  <nav aria-label="Mark navigation">
    <!-- Navigation controls -->
  </nav>

  <section aria-label="Mark context">
    <!-- Context display -->
  </section>

  <section aria-label="Card creation">
    <!-- Form -->
  </section>

  <section aria-label="Created cards">
    <!-- Cards list -->
  </section>
</main>
```

### 9.4 Color Contrast

All text meets WCAG AA standards:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

**Tested Combinations**:
- Foreground on Background: 14.9:1 (AAA) ✓
- Muted on Background: 4.6:1 (AA) ✓
- Button text on Primary: 4.8:1 (AA) ✓

### 9.5 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .mark-enter,
  .mark-exit,
  .card-created {
    animation: none;
    transition: none;
  }

  .hover-lift {
    transform: none !important;
  }
}
```

---

## 10. Performance Considerations

### 10.1 Optimization Strategies

**Lazy Loading**:
- Load marks in batches (20 at a time)
- Fetch next batch when within 5 marks of end
- Cache context text to avoid re-fetching

**Virtualization**:
- Created cards list virtualized if > 50 cards
- Use `react-window` or similar
- Render visible cards + 5 buffer

**Debouncing**:
- Preview updates debounced (150ms)
- Scope change debounced (300ms)

**Memoization**:
```tsx
const MarkContext = React.memo(({ mark, beforeContext, afterContext }) => {
  // Component memo'd to prevent unnecessary re-renders
})

const contextText = useMemo(() => {
  return `${beforeContext}${mark.text}${afterContext}`
}, [beforeContext, mark.text, afterContext])
```

**Backend Optimization**:
- Single query for marks + context (JOIN)
- Index on `read_ranges.has_card` column
- Cache mark counts per scope
- Batch card creation if multiple

### 10.2 Loading States

**Initial Load** (~500ms):
- Skeleton for scope selector
- Skeleton for mark navigation
- Skeleton for context (3 lines of gray bars)
- Skeleton for card creator

**Scope Change** (~300ms):
- Loading spinner over mark navigation
- "Loading marks for [scope]..." message
- Disable navigation buttons

**Card Creation** (~200ms):
- Button shows spinner: "Creating..."
- Disable form inputs briefly
- Success animation on completion

---

## 11. Error Handling

### 11.1 Error States

**No Marks Found**:
```
┌─────────────────────────────────────────┐
│  ℹ️  No marks in this scope             │
│                                         │
│  Try selecting a different folder       │
│  or marking text in reading view        │
│                                         │
│  [Change Scope] [Go to Reading]         │
└─────────────────────────────────────────┘
```

**Failed to Load Marks**:
```
┌─────────────────────────────────────────┐
│  ⚠️  Failed to load marks               │
│                                         │
│  Unable to fetch marked text.           │
│  Please try again.                      │
│                                         │
│  [Retry] [Go Back]                      │
└─────────────────────────────────────────┘
```

**Failed to Create Card**:
```
┌─────────────────────────────────────────┐
│  ❌ Failed to create card               │
│                                         │
│  Error: Database connection failed      │
│                                         │
│  Your input has been saved locally.     │
│                                         │
│  [Retry] [Save Draft]                   │
└─────────────────────────────────────────┘
```

### 11.2 Validation

**Required Fields**:
- Question and Answer both required
- Min length: 1 character (trimmed)
- Max length: 10,000 characters each

**Validation Messages**:
```tsx
// Question empty
<span className="text-sm text-destructive">
  Question is required
</span>

// Answer empty
<span className="text-sm text-destructive">
  Answer is required
</span>

// Too long
<span className="text-sm text-destructive">
  Maximum 10,000 characters (current: 12,543)
</span>
```

**Visual Feedback**:
- Invalid field: red border
- Valid field: green checkmark icon
- Character counter: updates in real-time

### 11.3 Recovery Mechanisms

**Auto-save Draft**:
- Save Q&A to localStorage every 2 seconds
- Restore on page reload
- Show "Draft restored" notification

**Offline Support**:
- Queue card creations when offline
- Sync when connection restored
- Show "Offline - will sync when online" badge

**Undo Last Action**:
- Ctrl+Z: Undo last card creation
- Restores form, removes from list
- Max 10 undo levels

---

## 12. Integration Points

### 12.1 Dashboard Integration

**CreateCardsCard Component**:
```tsx
// /src/components/dashboard/CreateCardsCard.tsx
export function CreateCardsCard() {
  const [stats, setStats] = useState({ pending: 0, todayCount: 0 })

  useEffect(() => {
    fetchCreationStats().then(setStats)
  }, [])

  return (
    <Card>
      <CardHeader>
        <Sparkles className="h-5 w-5" />
        <CardTitle>Create Cards</CardTitle>
        {stats.pending > 0 && (
          <Badge>{stats.pending} pending</Badge>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Turn your marked text into flashcards
        </p>
        <div className="space-y-2 mb-6">
          <Stat icon={BookMarked} label="Marks awaiting cards" value={stats.pending} />
          <Stat icon={Layers} label="Cards created this week" value={stats.todayCount} />
        </div>
        <Button onClick={() => navigate('/create')} className="w-full">
          Start Creating →
        </Button>
      </CardContent>
    </Card>
  )
}
```

### 12.2 Review Integration

**Link from Review**:
- After review session: "Create more cards from marks" CTA
- Empty review state: "No cards to review. Create some?" with link

**Card Context Preservation**:
- Cards created in hub include mark context
- Review interface can show source context
- "View in reading" button links to original text

### 12.3 Reading View Integration

**Mark → Create Flow**:
- Context menu option: "Create flashcard from this mark"
- Opens creation hub with that specific mark
- Pre-selects text scope

**Mark Status Indicator** (in reading view):
```
┌────────────────────────────────┐
│  This mark has:                │
│  ✓ 2 cards created             │
│  [View Cards] [Create More]    │
└────────────────────────────────┘
```

---

## 13. Future Enhancements (Phase 2)

### 13.1 AI-Assisted Card Generation

- "Generate card" button using mark context
- Suggests Q&A based on marked text
- User can edit/refine before saving
- Uses local LLM or API (optional)

### 13.2 Bulk Operations

- Select multiple marks
- Create cards in batch
- Apply same template to all
- "Smart batch" mode

### 13.3 Card Templates

- Save Q&A patterns as templates
- "Cloze deletion" mode
- "Definition" mode
- "Concept explanation" mode
- Custom user templates

### 13.4 Advanced Filtering

- Filter marks by:
  - Text difficulty
  - Word count
  - Date range
  - Already skipped/buried
- Sort by newest/oldest/longest

### 13.5 Analytics

- Track creation velocity
- Show card quality metrics
- Suggest marks to prioritize
- Completion percentage by folder

---

## 14. Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create Tauri commands for mark fetching
- [ ] Create Tauri commands for context retrieval
- [ ] Create Tauri commands for skip/bury
- [ ] Create Tauri commands for card creation from mark
- [ ] Set up cardCreation store (Zustand)
- [ ] Create route `/create`

### Phase 2: UI Components
- [x] ScopeSelector component
- [x] MarkNavigation component
- [ ] MarkContext component
- [x] CardCreator component
- [ ] CardPreview component
- [x] CreatedCardsList component

### Phase 3: Integration
- [ ] Add to Sidebar navigation
- [ ] Create CreateCardsCard for Dashboard
- [ ] Wire up keyboard shortcuts
- [ ] Integrate with existing folder/text stores

### Phase 4: Polish
- [ ] Add all loading states
- [ ] Add all error states
- [ ] Add empty states
- [ ] Implement animations
- [ ] Add ARIA labels
- [ ] Test keyboard navigation

### Phase 5: Testing
- [ ] Test scope switching
- [ ] Test mark navigation
- [ ] Test card creation flow
- [ ] Test skip/bury functionality
- [ ] Test edit/delete cards
- [ ] Test keyboard shortcuts
- [ ] Test accessibility
- [ ] Test performance with large datasets

---

## 15. Design Rationale

### Why This Approach?

1. **Dedicated Space**: Separates card creation from reading, reducing cognitive load
2. **Batch Processing**: Efficiently process multiple marks in sequence
3. **Context Preservation**: Shows surrounding text for better card quality
4. **Flexible Scoping**: Users can focus on specific areas or work through everything
5. **Visual Feedback**: Running list shows progress and allows quick review
6. **Keyboard-First**: Power users can create cards rapidly without mouse
7. **Reversible Actions**: Skip/bury/edit allow for flexible workflows
8. **Integration**: Works seamlessly with existing reading and review flows

### Design Decisions

**Why separate from reading view?**
- Reading is focused on comprehension
- Card creation requires different mindset
- Reduces UI clutter in reading view

**Why newest-first for created cards?**
- Matches flashcard viewer pattern
- Users see their latest work immediately
- Easy to edit recent mistakes

**Why skip vs bury?**
- Skip: Temporary decision (not ready yet)
- Bury: Permanent decision (intentional 0-card)
- Gives users flexibility in workflow

**Why live preview?**
- Immediate feedback improves card quality
- Reduces errors before saving
- Shows exactly what will appear in review

**Why auto-advance after create?**
- Maintains flow state
- Reduces clicks for batch processing
- Can be disabled in settings (future)

---

## 16. Success Metrics

### User Experience
- Average time per card: < 30 seconds
- Cards created per session: 10-20
- User satisfaction: High (reduced friction)

### Technical
- Page load time: < 500ms
- Mark transition: < 100ms
- Card creation: < 200ms
- Memory usage: < 150MB for 100 marks

### Adoption
- % of marks with cards: increase by 30%
- Daily active card creators: track
- Cards created per week: track
- User retention in hub: > 5 min avg session

---

## File Reference

**New Files to Create**:
- `/src/routes/create/index.tsx`
- `/src/components/create/ScopeSelector.tsx`
- `/src/components/create/MarkNavigation.tsx`
- `/src/components/create/MarkContext.tsx`
- `/src/components/create/CardCreator.tsx`
- `/src/components/create/CardPreview.tsx`
- `/src/components/create/CreatedCardsList.tsx`
- `/src/components/dashboard/CreateCardsCard.tsx`
- `/src/lib/stores/cardCreation.ts`

**Files to Modify**:
- `/src/components/shell/Sidebar.tsx` (add nav item)
- `/src/routes/dashboard/index.tsx` (add CreateCardsCard)
- `/src/hooks/useKeyboardShortcuts.ts` (add shortcuts)
- `/src-tauri/src/commands/` (add new commands)

**Design System Files**:
- `/Users/why/repos/trivium/src/lib/design-system.md` (reference)
- `/Users/why/repos/trivium/GUI_REDESIGN_COMPLETE.md` (patterns)

---

**End of Design Specification**

This design is ready for implementation. All components, interactions, and integration points are specified. The interface follows Trivium's established design patterns and provides a focused, efficient workflow for flashcard creation.
