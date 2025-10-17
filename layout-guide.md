# Trivium UI/UX Layout Guide

## Design System Overview

### Typography
- **UI Font**: Inter (400, 500, 600, 700)
- **Reading Font**: Charter (fallback: Georgia, Cambria)
- **Reading Content**: 1.25rem base, line-height 1.8, max-width 70ch

### Color Palette

#### Light Mode
- Background: `oklch(1 0 0)` - Pure white
- Foreground: `oklch(0.145 0 0)` - Near black
- Primary: `oklch(0.205 0 0)` - Dark gray
- Muted: `oklch(0.97 0 0)` - Very light gray
- Border: `oklch(0.922 0 0)` - Light gray
- Destructive: `oklch(0.577 0.245 27.325)` - Red

#### Dark Mode
- Background: `oklch(0.145 0 0)` - Near black
- Foreground: `oklch(0.985 0 0)` - Near white
- Primary: `oklch(0.922 0 0)` - Light gray
- Muted: `oklch(0.269 0 0)` - Dark gray
- Border: `oklch(1 0 0 / 10%)` - Semi-transparent white
- Destructive: `oklch(0.704 0.191 22.216)` - Lighter red

### Special Reading Highlights

#### Read Text
- Light: `background: black; color: white`
- Dark: `background: black; color: white` (same)

#### Excluded Text
- Background: `var(--muted)`
- Color: `var(--muted-foreground)`
- Left border: 3px `var(--border)`
- Padding-left: 0.75rem
- Display: block with border-radius

#### Search Matches
- Active Match: `#fed7aa` (orange-200)
- Inactive Match: `#fef08a` (yellow-200)

#### Cloze Marks (Yellow Highlights)
- Visible: `hsl(var(--primary) / 0.2)` background
- Font-weight: 600
- Border-radius: 4px
- Padding: 0 4px

### Component Patterns

#### Buttons (shadcn/ui)
- Default: Primary background with shadow
- Outline: Border with background on hover
- Ghost: Transparent with hover accent
- Destructive: Red background
- Sizes: sm (h-8), default (h-9), lg (h-10), icon (h-9 w-9)

#### Dialogs
- Backdrop blur support
- Shadow-modal: `0 10px 15px rgba(0,0,0,0.1)`
- Sticky header with border-b
- Footer with action buttons

#### Keyboard Shortcuts (Existing)
- `Ctrl/Cmd+F`: Search in text
- `Ctrl/Cmd+L`: Toggle links
- `Ctrl/Cmd+M`: Toggle read marking
- `Ctrl/Cmd+N`: Create flashcard
- `Escape`: Close overlays
- `Enter`: Confirm dialogs

## Reading View Layout

### Header (Sticky)
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back]  Title by Author          Progress: 45%  [🔗][🔍][⋮]│
└─────────────────────────────────────────────────────────────┘
```

### Content Area (Scrollable)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Lorem ipsum dolor sit amet, consectetur adipiscing elit.  │
│  ████████████████████████████████ (read text in black/white)│
│  Sed do eiusmod tempor incididunt ut labore et dolore      │
│  magna aliqua. [Highlighted mark] continues with more text  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar (Collapsible)
- Width: 384px (w-96) when expanded
- Width: 48px (w-12) when collapsed
- Contains flashcard list
- Border-left separator

---

## Truly Inline Text Editor Design

**Last Updated**: 2025-10-17
**Status**: Design Specification - Inline Region Editing

### Context & Constraints

The truly inline text editor enables users to edit text content directly within the reading view with intelligent boundary expansion. The editor maintains full context visibility while creating a focused editing experience.

**Core Features**:
- In-place editing (no modal overlay)
- Smart boundary expansion (sentence or paragraph)
- Context preservation with visual dimming
- Dual markdown modes (styled vs literal)
- Mark position preservation

**Critical Requirement**: Marks and read ranges are stored by character position. Text edits can shift positions, requiring careful handling.

---

## 1. ENTRY/EXIT MECHANISMS

### A. Selection-Based Entry (Primary)

**User Flow**:
1. User selects text in reading view (existing selection behavior)
2. User presses `E` key OR clicks "Edit" in text selection menu
3. System calculates smart boundary expansion
4. Inline editor activates with 200ms transition

**Smart Boundary Logic**:
- **Single sentence or fragment** → Expand to sentence boundaries (. ! ?)
- **Multiple sentences** → Expand to paragraph boundaries (\n\n)
- Boundaries are auto-detected but visually indicated

**Selection Menu Addition**:
```
┌────────────────────────────┐
│ Mark as Read               │
│ Create Flashcard           │
│ ─────────────────────────  │
│ Edit Selection          E  │ ← NEW OPTION
└────────────────────────────┘
```

### B. Keyboard Shortcuts

**Entry**:
- `E` - Enter edit mode (requires active selection)

**While Editing**:
- `M` - Toggle markdown mode (styled ↔ literal)
- `⌘S` / `Ctrl+S` - Save changes
- `Esc` - Cancel editing
- `⌘Z` / `Ctrl+Z` - Undo (native)
- `⌘⇧Z` / `Ctrl+⇧Z` - Redo (native)

### C. Exit Methods

**Three ways to exit**:

1. **Save Changes** (Primary)
   - Toolbar button: "Save" or keyboard `⌘S`
   - Validates content non-empty
   - Updates mark positions (backend)
   - Shows success toast
   - 300ms fade transition to read mode

2. **Cancel Changes** (Secondary)
   - Toolbar button: "Cancel" or keyboard `Esc`
   - If unchanged: immediate exit
   - If changed: inline confirmation dialog
   - Reverts to original content

3. **Click Outside** (Optional Enhancement)
   - Same behavior as Cancel
   - Prevents accidental exits with confirmation

---

## 2. VISUAL STATES & TRANSITIONS

### State Machine

```
┌──────────────┐
│  READ MODE   │ ← Default state
│              │
│ - Full text  │
│ - Highlights │
│ - Selection  │
└──────┬───────┘
       │
       │ Select text + press E
       ↓
┌──────────────────┐
│ BOUNDARY         │
│ CALCULATION      │
│ (instant)        │
└──────┬───────────┘
       │
       ↓
┌──────────────────────┐
│ INLINE EDIT MODE     │
│                      │
│ - Editable region    │
│ - Dimmed context     │
│ - Inline toolbar     │
│ - Styled/Literal mode│
└──────┬───────────────┘
       │
       │ Save / Cancel
       ↓
┌──────────────────┐
│ SAVING STATE     │ (200ms-1s)
│                  │
│ - Disabled UI    │
│ - Spinner        │
│ - Position update│
└──────┬───────────┘
       │
       ↓ Success
┌──────────────┐
│  READ MODE   │
│ (Updated)    │
└──────────────┘
```

### Read Mode (Default)

**Appearance**:
- Content: `<ReadHighlighter>` component
- Font: Charter serif, 1.25rem × user scale
- Highlights: Yellow background for marks
- Read ranges: Black background, white text
- Text selection enabled

**Visual Example**:
```
┌────────────────────────────────────────────────────┐
│                                                    │
│  Natural selection acts solely through the         │
│  preservation of variations in some way            │
│  advantageous, which consequently endure.          │
│  ████████████████████████████ (read text)         │
│  The term 'natural selection' is in some respects  │
│  a bad one, as it seems to imply conscious choice. │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Inline Edit Mode - Sentence Boundary

**User selects partial text → expands to full sentence**

```
┌─────────────────────────────────────────────────────────────┐
│ [← Back]  Origin of Species      [🔗] [🔍] [📝 EDITING] [⋮] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│░░ Natural selection acts solely through preservation... ░░░│
│░░ ████████████████████████████████████████████████████ ░░░│
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ The term 'natural selection' is in some respects a  │  │
│  │ bad one, as it seems to imply conscious choice; but │  │
│  │ this will be disregarded after a little familiarity.│  │
│  │                                                [▊]  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│░░ Everyone knows what is meant by inherited tendency... ░░░│
│                                                             │
│  [M] Styled │ 158 chars │ [Esc] Cancel │ [⌘S] Save         │
└─────────────────────────────────────────────────────────────┘

Legend:
░ = Dimmed context (40% opacity, slight blur)
┌─┐ = Editable region border (2px primary color)
[▊] = Text cursor
```

### Inline Edit Mode - Paragraph Boundary

**User selects multiple sentences → expands to paragraph**

```
┌─────────────────────────────────────────────────────────────┐
│ [← Back]  Origin of Species      [🔗] [🔍] [📝 EDITING] [⋮] │
├─────────────────────────────────────────────────────────────┤
│░░                                                        ░░░│
│░░ [Previous paragraph dimmed...]                        ░░░│
│░░ ████████████████████████████████████████████████████ ░░░│
│                                                             │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ The term 'natural selection' is in some respects a  ┃  │
│  ┃ bad one, as it seems to imply conscious choice; but ┃  │
│  ┃ this will be disregarded after a little familiarity.┃  │
│  ┃                                                      ┃  │
│  ┃ Everyone knows what is meant by inherited tendency; ┃  │
│  ┃ we see it in every domestic and wild animals. The   ┃  │
│  ┃ laws governing inheritance are unknown. [▊]         ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                             │
│░░                                                        ░░░│
│░░ [Next paragraph dimmed...]                            ░░░│
│                                                             │
│  [M] Styled │ 347 chars │ [Esc] Cancel │ [⌘S] Save         │
└─────────────────────────────────────────────────────────────┘

Legend:
░ = Dimmed context
┏━┓ = Paragraph border (3px, thicker than sentence)
```

### Markdown Mode Toggle - Literal View

**User presses M to see raw markdown**

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────┐  │
│  │ The term '[natural selection](https://wikipedia...)' │  │
│  │ is in some respects a bad one, as it seems to imply  │  │
│  │ conscious choice; but this will be disregarded after │  │
│  │ a little familiarity.                                │  │
│  │                                                       │  │
│  │ Everyone knows what is meant by {{c1::inherited      │  │
│  │ tendency}}; we see it in every domestic and wild     │  │
│  │ animals. [▊]                                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [M] LITERAL │ 412 chars │ [Esc] Cancel │ [⌘S] Save        │
│  └─ Shows raw markdown syntax for editing URLs            │
└─────────────────────────────────────────────────────────────┘
```

**Component Specifications**:

### Inline Editable Region

**Sentence Boundary Styling**:
```css
.inline-edit-region--sentence {
  border: 2px solid oklch(var(--primary));
  border-radius: 8px;
  padding: 12px 16px;
  background: oklch(var(--background));
  box-shadow:
    0 0 0 4px oklch(var(--primary) / 10%),
    0 4px 16px oklch(0 0 0 / 8%);
  min-height: 48px;
  max-height: min(70vh, 800px);
  overflow-y: auto;
  font-family: Charter, Georgia, serif;
  font-size: 1.25rem; /* × user scale */
  line-height: 1.8;
  contenteditable: true;
  outline: none;
}
```

**Paragraph Boundary Styling**:
```css
.inline-edit-region--paragraph {
  border: 3px solid oklch(var(--primary));
  border-radius: 12px;
  padding: 20px 24px;
  background: oklch(var(--background));
  box-shadow:
    0 0 0 6px oklch(var(--primary) / 15%),
    0 8px 24px oklch(0 0 0 / 12%);
  min-height: 120px;
  max-height: min(70vh, 800px);
  /* ... same font properties ... */
}
```

**Context Dimming**:
```css
.context-dimmed {
  opacity: 0.4;
  filter: blur(0.5px);
  pointer-events: none;
  user-select: none;
  transition: opacity 300ms ease-out, filter 300ms ease-out;
}
```

### Inline Toolbar

**Layout**:
```
┌────────────────────────────────────────────────────────┐
│ [M] Styled │ 158 chars │ [Esc] Cancel │ [⌘S] Save     │
│ └─ 40px      120px        100px           100px        │
│    Toggle    Counter      Cancel          Save         │
└────────────────────────────────────────────────────────┘
```

**Toolbar Container**:
- Position: Fixed to bottom of editable region
- Background: `oklch(var(--background) / 95%)` with `backdrop-blur(8px)`
- Border-top: `2px solid oklch(var(--primary))`
- Border-radius: `0 0 8px 8px` (matches region)
- Padding: `12px 16px`
- Height: `56px` total (12px + 32px + 12px)
- Shadow: `0 -4px 12px oklch(0 0 0 / 10%)`
- Display: `flex`, `align-items: center`, `gap: 16px`

**1. Markdown Mode Toggle**:
- Component: `Button` variant="ghost" size="sm"
- Icon: `Code` (literal mode) or `Eye` (styled mode)
- Text: "Styled" or "LITERAL"
- Width: `40px` (icon only) or `auto` (with text)
- Height: `32px`
- Keyboard: `M`
- aria-label: "Toggle markdown editing mode"
- aria-pressed: `{mode === 'literal'}`

**2. Character Counter**:
- Font: Inter 400, 13px
- Color: `oklch(var(--muted-foreground))`
- Format: `{count} chars`
- Flex: `1` (takes remaining space)
- Text-align: `center`
- aria-live: `polite`
- aria-atomic: `true`

**3. Cancel Button**:
- Component: `Button` variant="outline" size="sm"
- Text: "Cancel"
- Width: `100px`
- Height: `32px`
- Keyboard hint: Show `Esc` on hover/focus

**4. Save Button**:
- Component: `Button` variant="default" size="sm"
- Text: "Save" (normal) or "Saving..." (loading)
- Width: `100px`
- Height: `32px`
- Disabled: When `content === originalContent`
- Loading: Shows `Loader2` spinner + "Saving..."
- Keyboard hint: Show `⌘S` on hover/focus

### Saving State (Transition)

**Duration**: 200ms - 1s (depending on content size)

**Save Button Transform**:
```
Normal:     [Save Changes]
Loading:    [⟳ Saving...]
```

- Button disabled during save
- Spinner icon: `Loader2` with spin animation
- Cursor: not-allowed on entire edit form
- Opacity: 0.6 on textarea

**Success Transition**:
- Toast notification:
  - Message: "Text updated successfully"
  - Variant: Success (green checkmark)
  - Duration: 3000ms
- Smooth crossfade (300ms) from edit mode → read mode
- Content updates with new text and recalculated highlights

**Error State**:
- Toast notification:
  - Message: "Failed to update text: [error message]"
  - Variant: Destructive (red alert)
  - Duration: 5000ms
- Edit mode remains active
- User can retry or cancel

---

## 3. MARKDOWN RENDERING MODES

### Two Editing Modes

The inline editor supports two modes for different use cases:

**1. Styled Mode** (Default):
- Markdown rendered as HTML in contenteditable
- Links: `[text](url)` → underlined, clickable-looking but not clickable
- Cloze marks: `{{c1::text}}` → yellow background highlight
- Headers: `=== Text ===` → bold text
- User edits visible text only, URLs protected
- Best for: Quick text edits without touching syntax

**2. Literal Mode** (Toggle with M):
- Raw markdown visible as plain text
- Links: Shows full `[text](url)` syntax
- Cloze marks: Shows raw `{{c1::text}}` syntax
- Headers: Shows raw `=== Text ===`
- User can edit all syntax including URLs
- Best for: Fixing links, adjusting cloze boundaries

### Styled Mode Implementation

**Challenge**: Render markdown in contenteditable while preventing URL edits

**Solution**: Use custom HTML elements with data attributes

```html
<!-- Link rendering -->
<span class="inline-link" data-url="https://...">natural selection</span>

<!-- Cloze rendering -->
<mark class="cloze-mark" data-cloze-id="c1">inherited tendency</mark>

<!-- Header rendering -->
<strong class="header-text">Section Title</strong>
```

**On Input Event**:
```typescript
function handleStyledModeInput(e: React.FormEvent<HTMLDivElement>) {
  const element = e.currentTarget;

  // Extract text content (strips HTML but preserves structure)
  const textContent = element.textContent || '';

  // User can edit visible text, but we preserve underlying markdown
  // This requires tracking changes and reconstructing markdown

  setEditedText(textContent);
}
```

**Styled Mode Styling**:
```css
.inline-link {
  text-decoration: underline;
  text-decoration-color: oklch(0.45 0.1 240);
  text-underline-offset: 2px;
  cursor: text; /* Not pointer - editing, not clicking */
}

.inline-link:hover::after {
  content: ' 🔗';
  opacity: 0.5;
  font-size: 0.85em;
}

.cloze-mark {
  background: oklch(0.95 0.08 90);
  border: 2px dotted oklch(0.7 0.15 85);
  border-radius: 4px;
  padding: 2px 4px;
  font-weight: 500;
}

.header-text {
  font-weight: 700;
  display: block;
  margin: 0.5em 0;
}
```

### Literal Mode Implementation

**Much Simpler**: Just show raw text

```typescript
function handleLiteralModeInput(e: React.FormEvent<HTMLDivElement>) {
  const element = e.currentTarget;
  const rawText = element.textContent || '';

  // Direct markdown editing - what you see is what you get
  setEditedText(rawText);
}
```

**Toggle Behavior**:
```typescript
function toggleMarkdownMode() {
  if (mode === 'styled') {
    // Convert from styled to literal
    // Extract raw markdown from HTML (reverse render)
    const rawMarkdown = extractMarkdownFromHTML(editorRef.current);
    setMode('literal');
    setEditedText(rawMarkdown);

    // Update contenteditable to show raw text
    if (editorRef.current) {
      editorRef.current.textContent = rawMarkdown;
    }
  } else {
    // Convert from literal to styled
    setMode('styled');
    const renderedHTML = renderMarkdownToHTML(editedText);

    // Update contenteditable to show styled HTML
    if (editorRef.current) {
      editorRef.current.innerHTML = renderedHTML;
    }
  }
}
```

### Indicator for Link Editing

**In Styled Mode**, hovering a link shows tooltip:
```
┌─────────────────────────────────┐
│ Press M for literal mode to     │
│ edit URL                         │
└─────────────────────────────────┘
```

**Visual Cue**: Link has subtle icon on hover
```
natural selection 🔗
```

---

## 4. MARK PRESERVATION & POSITION TRACKING

### The Challenge

Marks and read ranges are stored as **character positions** (start, end) in the database. When text is edited:
- Adding text before a mark shifts its position forward
- Deleting text can invalidate mark positions
- Boundary edits only affect marks within the boundary

### Strategy: Boundary-Scoped Updates

**Philosophy**: Only marks within the edit boundary need recalculation. Marks outside are automatically shifted by the length delta.

**Three Position Zones**:

1. **Before Boundary**: Unchanged
   - Mark positions remain identical
   - No recalculation needed

2. **Within Boundary**: Recalculate
   - Try to find mark text in new content
   - Update relative positions
   - Flag for review if text not found

3. **After Boundary**: Shift
   - Add `(newBoundaryLength - oldBoundaryLength)` to positions
   - Automatic, no text searching needed

### Cloze Syntax Preservation

In edit mode, the textarea shows:
```
The mitochondria is the {{c1::powerhouse}} of the cell.
It produces {{c2::ATP}} through cellular respiration.
```

Rules:
- Preserve all `{{cN::text}}` patterns
- Users can manually add/edit/remove cloze marks
- Validation on save:
  - Check for malformed syntax
  - Warn if syntax errors detected
  - Show preview of how marks will render

### Post-Save Mark Update Logic

**Backend Responsibility** (not in this design, but noted):
1. Parse old and new text
2. Identify cloze mark positions in new text
3. Update database positions
4. If marks cannot be found (deleted text), warn user or remove mark
5. Return updated mark positions to frontend

**Frontend Handling**:
- After save, reload text with updated positions
- Marks automatically re-highlight in correct positions
- If marks were lost, show warning toast:
  - "Some highlights may have been removed due to text changes"

---

## 4. SAVE/CANCEL WORKFLOW

### Cancel Flow

```
User clicks Cancel or presses Escape
         │
         ↓
   Has unsaved changes?
         │
    ┌────┴────┐
    │         │
   YES        NO
    │         │
    ↓         ↓
 Show      Exit to
 Dialog    Read Mode
    │
    ↓
┌────────────────────┐
│ Discard Changes?   │
│                    │
│ You have unsaved   │
│ changes. Are you   │
│ sure you want to   │
│ discard them?      │
│                    │
│  [Cancel] [Discard]│
└────────────────────┘
         │
    ┌────┴────┐
    │         │
 Cancel    Discard
    │         │
    ↓         ↓
 Stay in   Exit to
Edit Mode  Read Mode
           (revert)
```

**Confirmation Dialog Specs**:
- Component: `Dialog` (shadcn/ui)
- Title: "Discard Changes?"
- Description:
  ```
  You have unsaved changes to this text.
  Are you sure you want to discard them?
  ```
- Buttons:
  - Cancel: `variant="outline"` - stays in edit mode
  - Discard: `variant="destructive"` - reverts and exits
- Keyboard:
  - `Escape`: Close dialog (stay in edit mode)
  - `Enter`: Discard changes

### Save Flow

```
User clicks Save or presses Ctrl+S
         │
         ↓
  Validate content
         │
    ┌────┴────┐
    │         │
  Valid    Invalid
    │         │
    ↓         ↓
  Save    Show error
   API      toast
    │      (stay in
    │      edit mode)
    ↓
Success?
    │
┌───┴───┐
│       │
YES     NO
│       │
↓       ↓
Show   Show
Success Error
Toast  Toast
│       │
↓       ↓
Exit   Stay in
to     Edit Mode
Read   (retry)
Mode
```

**Validation Rules**:
- Content length > 0 (required)
- Warn if content is significantly shorter than original (>50% reduction)
- Check for malformed cloze syntax (optional, non-blocking)

**Optimistic Update**:
- Do NOT use optimistic UI update
- Wait for backend confirmation
- Prevents race conditions with mark position calculations

---

## 5. KEYBOARD SHORTCUTS SPECIFICATION

### Global Shortcuts (Reading View)

| Shortcut | Action | Context |
|----------|--------|---------|
| `Ctrl/Cmd+E` | Toggle edit mode | Anywhere in reading view |
| `Ctrl/Cmd+F` | Open search | Read mode only |
| `Ctrl/Cmd+L` | Toggle links | Read mode only |
| `Ctrl/Cmd+M` | Mark as read | Read mode, selection active |
| `Ctrl/Cmd+N` | Create flashcard | Read mode, selection active |

### Edit Mode Shortcuts

| Shortcut | Action | Behavior |
|----------|--------|----------|
| `Ctrl/Cmd+S` | Save changes | Validates and saves |
| `Escape` | Cancel editing | Shows confirm if unsaved |
| `Ctrl/Cmd+Z` | Undo | Native textarea undo |
| `Ctrl/Cmd+Shift+Z` | Redo | Native textarea redo |
| `Tab` | Insert tab | Inserts 2 spaces (not tab char) |
| `Shift+Tab` | Outdent | Removes 2 spaces if present |

**Shortcut Conflicts Prevention**:
- When edit mode is active:
  - Disable `Ctrl+M` (mark as read)
  - Disable `Ctrl+N` (create flashcard)
  - Disable `Ctrl+F` (search) - not needed in edit mode
  - Keep `Ctrl+L` disabled (no link rendering in edit)

### Accessibility (Keyboard Navigation)

**Tab Order in Edit Mode**:
1. Textarea (auto-focused on entry)
2. Cancel button
3. Save button

**Screen Reader Announcements**:
- On entering edit mode: "Edit mode active. Textarea focused. Press Ctrl+S to save or Escape to cancel."
- On save success: "Text updated successfully"
- On save error: "Failed to update text. [error message]"
- Character count: aria-live="polite" region

---

## 6. COMPONENT HIERARCHY

### File Structure

```
src/lib/components/reading/
├── ReadHighlighter.tsx          (existing - read mode display)
├── TextSelectionMenu.tsx        (existing - context menu)
├── SearchBar.tsx                (existing - search UI)
└── TextEditor.tsx               (NEW - inline editor component)

src/routes/read/[id].tsx         (MODIFY - integrate editor toggle)
```

### New Component: `TextEditor.tsx`

**Props Interface**:
```typescript
interface TextEditorProps {
  content: string                    // Current text content
  textId: number                     // Text ID for API calls
  onSave: (newContent: string) => Promise<void>
  onCancel: () => void
  fontSize: number                   // User's reading size preference
  className?: string
}
```

**State Management**:
```typescript
const [editedContent, setEditedContent] = useState(content)
const [isSaving, setIsSaving] = useState(false)
const [charCount, setCharCount] = useState(content.length)
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
const [showCancelDialog, setShowCancelDialog] = useState(false)
```

**Component Structure**:
```tsx
<div className="text-editor-container">
  {/* Edit Mode Banner */}
  <div className="edit-mode-banner">
    <Edit2 className="h-4 w-4" />
    EDIT MODE ACTIVE
  </div>

  {/* Textarea */}
  <Textarea
    value={editedContent}
    onChange={handleChange}
    className="reading-content" // Charter font, 1.25rem
    style={{ fontSize: `${fontSize}rem` }}
    autoFocus
    spellCheck
  />

  {/* Character Counter */}
  <div className="character-counter" aria-live="polite">
    Characters: {charCount.toLocaleString()} / unlimited
  </div>

  {/* Information Banner */}
  <Alert>
    <AlertCircle className="h-5 w-5" />
    <AlertTitle>EDITING NOTICE</AlertTitle>
    <AlertDescription>
      <ul>
        <li>Read progress and flashcard marks will be automatically updated</li>
        <li>Large edits may affect mark positions</li>
      </ul>
    </AlertDescription>
  </Alert>

  {/* Action Buttons */}
  <div className="action-buttons">
    <Button variant="outline" onClick={handleCancel}>
      Cancel
    </Button>
    <Button
      variant="default"
      onClick={handleSave}
      disabled={!hasUnsavedChanges || isSaving}
    >
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Saving...
        </>
      ) : (
        'Save Changes'
      )}
    </Button>
  </div>

  {/* Cancel Confirmation Dialog */}
  <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
    {/* ... dialog content ... */}
  </Dialog>
</div>
```

### Integration in `ReadPage`

**New State**:
```typescript
const [isEditMode, setIsEditMode] = useState(false)
```

**Keyboard Handler Addition**:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl/Cmd+E to toggle edit mode
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault()
      if (!showRenameDialog && !showDeleteDialog && !isOpen) {
        setIsEditMode(!isEditMode)
      }
    }
    // ... existing handlers ...
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [isEditMode, showRenameDialog, showDeleteDialog, isOpen])
```

**Render Logic**:
```tsx
<div className="flex-1 overflow-y-auto">
  <div className="container mx-auto px-8 py-12 max-w-4xl">
    <article className="reading-content mx-auto space-y-4" style={{ fontSize: `${fontSize}rem` }}>
      {isEditMode ? (
        <TextEditor
          content={currentText.content}
          textId={currentText.id}
          onSave={handleSaveTextEdit}
          onCancel={() => setIsEditMode(false)}
          fontSize={fontSize}
        />
      ) : (
        <TextSelectionMenu textId={currentText.id}>
          <ReadHighlighter
            content={currentText.content}
            readRanges={readRanges}
            linksEnabled={linksEnabled}
            searchMatches={matches}
            activeSearchIndex={currentIndex}
          />
        </TextSelectionMenu>
      )}
    </article>
  </div>
</div>
```

---

## 7. COLOR & STYLING GUIDELINES

### Edit Mode Banner

```css
.edit-mode-banner {
  background: hsl(var(--accent));
  border: 2px solid hsl(var(--primary));
  border-radius: var(--radius);
  padding: 12px 16px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}
```

### Textarea Styling

```css
.text-editor-textarea {
  font-family: 'Charter', 'Georgia', 'Cambria', serif;
  font-size: 1.25rem; /* Base, scaled by fontSize prop */
  line-height: 1.8;
  min-height: 400px;
  padding: 16px;
  border: 2px solid hsl(var(--border));
  border-radius: var(--radius);
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  resize: vertical;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.text-editor-textarea:focus {
  outline: none;
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--ring) / 20%);
}
```

### Character Counter

```css
.character-counter {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
  text-align: right;
  margin-top: 8px;
}
```

### Information Banner

```css
.editing-notice {
  background: hsl(var(--muted) / 50%);
  border-left: 4px solid hsl(var(--primary));
  border-radius: var(--radius);
  padding: 16px;
  margin: 24px 0;
}

.editing-notice-title {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--foreground));
  margin-bottom: 8px;
}

.editing-notice-content {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: hsl(var(--foreground));
}

.editing-notice-content ul {
  list-style: disc;
  margin-left: 20px;
  margin-top: 4px;
}
```

### Dark Mode Adaptations

All colors use CSS variables, so dark mode automatically adapts:
- Banner background: Changes from light accent to dark accent
- Border colors: Adjust from dark gray to semi-transparent white
- Text colors: Invert from near-black to near-white
- Focus rings: Maintain visibility in both modes

---

## 8. USER FEEDBACK MECHANISMS

### Success States

**Save Success**:
- Toast notification (shadcn/ui Toast component)
- Variant: Success
- Icon: `CheckCircle` (green)
- Message: "Text updated successfully"
- Duration: 3000ms
- Position: Bottom-right
- Auto-dismiss: Yes

**Visual Transition**:
- Crossfade (300ms ease-in-out) from edit mode to read mode
- New content appears with updated highlights
- Scroll position preserved

### Error States

**Save Failed**:
- Toast notification
- Variant: Destructive
- Icon: `XCircle` (red)
- Message: "Failed to update text: [error message]"
- Duration: 5000ms (longer to allow reading)
- Position: Bottom-right
- Auto-dismiss: Yes, but with close button

**Validation Errors**:
- Empty content: Toast "Text cannot be empty"
- Malformed syntax: Toast "Warning: Cloze syntax may be malformed. Preview before saving."

### Warning States

**Large Edit Warning** (Optional, v2 feature):
- If content shrinks by >50%, show inline warning:
- Banner above action buttons
- Background: `hsl(var(--destructive) / 10%)`
- Border-left: 4px `hsl(var(--destructive))`
- Icon: `AlertTriangle` (orange)
- Message: "Large deletion detected. This may affect existing flashcards."
- Dismissible: No (stays until user saves or cancels)

### Loading States

**Save in Progress**:
- Save button:
  - Disabled: `disabled={true}`
  - Spinner: `Loader2` icon with spin animation
  - Text: "Saving..."
  - Cursor: not-allowed
- Textarea:
  - Opacity: 0.6
  - Pointer-events: none
- Cancel button: Disabled

**Duration Expectations**:
- <500 chars: ~200ms
- 500-2000 chars: ~500ms
- 2000+ chars: ~1s
- Show spinner immediately (no delay threshold)

---

## 9. RESPONSIVE CONSIDERATIONS

### Desktop (Primary)

- Full layout as described above
- Textarea max-width: 70ch (maintains readability)
- Sidebar visible (flashcard list remains accessible)

### Tablet (768px - 1024px)

- Sidebar collapses automatically when entering edit mode
- Edit mode takes full width
- Restore sidebar state when exiting edit mode

### Mobile (<768px)

- Edit mode overlay (full screen)
- Header simplified:
  ```
  ┌─────────────────────────┐
  │ [✕] Edit Text    [Save] │
  └─────────────────────────┘
  ```
- No sidebar (already hidden on mobile)
- Textarea expands to full viewport height minus header/footer
- Character counter moves to header (next to title)
- Information banner collapsible (tap to expand)
- Action buttons stacked vertically, full width

---

## 10. ACCESSIBILITY CHECKLIST

### Keyboard Navigation
- [x] All interactive elements accessible via Tab
- [x] Edit mode entry via keyboard (`Ctrl+E`)
- [x] Save via keyboard (`Ctrl+S`)
- [x] Cancel via keyboard (`Escape`)
- [x] Textarea auto-focuses on edit mode entry
- [x] Logical tab order: Textarea → Cancel → Save

### Screen Reader Support
- [x] Edit button has aria-label: "Toggle edit mode"
- [x] Edit mode banner announced on entry
- [x] Character counter aria-live="polite"
- [x] Save button state changes announced
- [x] Error messages announced via toast aria-live regions
- [x] Confirmation dialog properly labeled with DialogTitle/Description

### Visual Indicators
- [x] Focus rings visible on all interactive elements
- [x] Color contrast ratios meet WCAG AA (4.5:1 for text)
- [x] Edit mode visually distinct from read mode
- [x] Loading states have spinner AND text label
- [x] Disabled states have reduced opacity (0.5)

### Motor Impairments
- [x] Large click targets (buttons 36px height minimum)
- [x] Textarea resize handle for user control
- [x] No time-based UI (no auto-dismiss critical dialogs)
- [x] Forgiving click areas (16px padding on buttons)

### Cognitive Accessibility
- [x] Clear state indicators (banner shows "EDIT MODE ACTIVE")
- [x] Confirmation for destructive actions (discard changes)
- [x] Progress feedback (saving spinner + text)
- [x] Undo available (native textarea undo)

---

## 11. IMPLEMENTATION NOTES

### API Requirements

**New or Modified Endpoints**:

1. `PATCH /api/texts/:id`
   - Request body: `{ content: string }`
   - Response: Updated `Text` object with new content
   - Side effects:
     - Recalculate read range positions
     - Update mark positions
     - Return warnings if marks were lost

2. Mark Position Update Logic (Backend)
   - Compare old vs new text
   - Parse cloze syntax in both versions
   - Map marks to new positions
   - Flag marks that cannot be resolved

### State Management

**Zustand Store Updates** (`reading.ts`):

```typescript
interface ReadingState {
  // ... existing fields ...
  updateTextContent: (textId: number, newContent: string) => Promise<void>
}

updateTextContent: async (textId: number, newContent: string) => {
  try {
    const updatedText = await api.texts.update(textId, { content: newContent })
    set({ currentText: updatedText })

    // Reload dependent data
    await get().getReadRanges(textId)
    await get().calculateProgress(textId)

    // Invalidate caches
    invalidateProgressCache(textId)
    if (updatedText.folderId) {
      invalidateFolderProgressCache(updatedText.folderId)
    }
  } catch (error) {
    console.error('Failed to update text content:', error)
    throw error
  }
}
```

### Performance Considerations

**Debouncing**:
- Character counter updates: Debounce 100ms
- Auto-save: NOT implemented (explicit save only)
- Validation: On save only (not on every keystroke)

**Large Text Handling**:
- Textarea virtualization: Not needed (max expected ~50k chars)
- Syntax highlighting: Deferred to v2 (too expensive for real-time)
- Undo stack: Browser-native (efficient)

### Error Handling

**Network Errors**:
- Retry logic: No automatic retry (user retries via button)
- Offline detection: Show warning toast if navigator.onLine === false
- Timeout: 30s timeout on save API call

**Validation Errors**:
- Frontend validation before save
- Backend validation returns 400 with error message
- Display error message in toast

---

## 12. FUTURE ENHANCEMENTS (V2)

### Phase 2 Features

1. **Rich Text Editing**
   - contenteditable with syntax highlighting
   - Real-time cloze mark preview
   - Markdown toolbar (bold, italic, link)

2. **Revision History**
   - Track text edit history
   - Diff view (old vs new)
   - Restore previous versions

3. **Collaborative Editing**
   - Live cursors (if multi-user)
   - Conflict resolution

4. **Advanced Validation**
   - Spell check integration
   - Grammar suggestions
   - Readability scores

5. **Auto-Save**
   - Draft saving every 30s
   - Recover unsaved changes on crash

---

## ASCII MOCKUPS

### Full Page: Read Mode
```
╔══════════════════════════════════════════════════════════════════════════════╗
║ ┌────────────────────────────────────────────────────────────────────────┐   ║
║ │ [← Back]  The Origin of Species by Charles Darwin                      │   ║
║ │                                            Progress: 67%  [🔗][🔍][✏️][⋮]│   ║
║ └────────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║ ┌────────────────────────────────────────────────────────────────────────┐   ║
║ │                                                                        │   ║
║ │   Natural selection acts solely through the preservation of           │   ║
║ │   variations in some way advantageous, which consequently endure.      │   ║
║ │   ████████████████████████████████████████████████████████████        │   ║
║ │   ████████████████████████████████████████████████████████████        │   ║
║ │   The term 'natural selection' is in some respects a bad one, as it   │   ║
║ │   seems to imply conscious choice; but this will be disregarded       │   ║
║ │   after a little familiarity.                                          │   ║
║ │                                                                        │   ║
║ │   Everyone knows what is meant by inherited tendency; we see it in    │   ║
║ │   every [highlighted mark shown in yellow background] domestic and     │   ║
║ │   wild animals. The laws governing inheritance are unknown.            │   ║
║ │                                                                        │   ║
║ └────────────────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Full Page: Edit Mode
```
╔══════════════════════════════════════════════════════════════════════════════╗
║ ┌────────────────────────────────────────────────────────────────────────┐   ║
║ │ [← Back]  The Origin of Species by Charles Darwin                      │   ║
║ │                                            Progress: 67%  [🔗][🔍][✏️][⋮]│   ║
║ │                                                              ^^^^^^^^      ║
║ │                                                              ACTIVE        ║
║ └────────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║ ┌────────────────────────────────────────────────────────────────────────┐   ║
║ │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │   ║
║ │ ┃ ✏️  EDIT MODE ACTIVE                                                ┃ │   ║
║ │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │   ║
║ │                                                                        │   ║
║ │ ┌──────────────────────────────────────────────────────────────────┐ │   ║
║ │ │ Natural selection acts solely through the preservation of       │ │   ║
║ │ │ variations in some way advantageous, which consequently endure. │ │   ║
║ │ │ The struggle for existence inevitably follows from the high     │ │   ║
║ │ │ rate at which all organic beings tend to increase.              │ │   ║
║ │ │                                                                  │ │   ║
║ │ │ The term 'natural selection' is in some respects a bad one, as  │ │   ║
║ │ │ it seems to imply conscious choice; but this will be            │ │   ║
║ │ │ disregarded after a little familiarity.                         │ │   ║
║ │ │                                                                  │ │   ║
║ │ │ Everyone knows what is meant by inherited tendency; we see it   │ │   ║
║ │ │ in every {{c1::domestic and wild}} animals. The laws governing  │ │   ║
║ │ │ inheritance are unknown. [Cursor]                               │ │   ║
║ │ │                                                                  │ │   ║
║ │ └──────────────────────────────────────────────────────────────────┘ │   ║
║ │                                                                        │   ║
║ │                                   Characters: 1,247 / unlimited        │   ║
║ │                                                                        │   ║
║ │ ┌──────────────────────────────────────────────────────────────────┐ │   ║
║ │ │ ⚠️  EDITING NOTICE                                               │ │   ║
║ │ │                                                                  │ │   ║
║ │ │  • Read progress and flashcard marks will be automatically      │ │   ║
║ │ │    updated to match text changes                                │ │   ║
║ │ │  • Large edits may affect mark positions                        │ │   ║
║ │ └──────────────────────────────────────────────────────────────────┘ │   ║
║ │                                                                        │   ║
║ │                                            [Cancel]  [Save Changes]   │   ║
║ └────────────────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Edit Mode: Saving State
```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Natural selection acts solely through the preservation of       │ │
│ │ variations in some way advantageous...                          │ │
│ │                                                  [DISABLED]      │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│                                   Characters: 1,247 / unlimited        │
│                                                                        │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ ⚠️  EDITING NOTICE                                               │ │
│ │  • Read progress and flashcard marks will be automatically...   │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│                                [Cancel]  [⟳ Saving...]                │
│                                ^^^^^^^   ^^^^^^^^^^^^^                 │
│                                DISABLED  LOADING                       │
└────────────────────────────────────────────────────────────────────────┘
```

### Discard Changes Dialog
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Discard Changes?                                           │
│                                                              │
│  You have unsaved changes to this text.                     │
│  Are you sure you want to discard them?                     │
│                                                              │
│                                      [Cancel]  [Discard]    │
│                                                ^^^^^^^^^^    │
│                                                DESTRUCTIVE   │
└──────────────────────────────────────────────────────────────┘
```

---

## DESIGN RATIONALE

### Why Charter Font in Edit Mode?

Maintaining the Charter serif font in the textarea creates **visual continuity** between read and edit modes. Users mentally map the edited text to how it will appear when saved, reducing cognitive load. This is superior to showing a monospace font (which would feel "code-like") or switching to Inter (which would create jarring transitions).

### Why Explicit Save vs Auto-Save?

**Explicit save** gives users control and confidence. Auto-save can feel unpredictable and may save unwanted intermediate states. For a learning app where text precision matters (marks are tied to exact positions), users should consciously commit changes. This also simplifies error handling and reduces server load.

### Why Show Raw Cloze Syntax?

Displaying `{{c1::text}}` syntax is **transparent and empowering**. Users understand exactly what's stored and can manually edit mark boundaries. Alternative approaches (WYSIWYG highlighting in contenteditable) are technically complex, error-prone, and can confuse users about what's editable vs what's markup. The cloze syntax is already familiar from the flashcard creator.

### Why No Auto-Update Marks?

Automatically updating mark positions on every keystroke would be computationally expensive and create race conditions with the backend. Instead, we update positions **on save** as a single atomic operation. This is predictable, performant, and allows backend validation before committing changes.

### Why Full-Width Edit Mode?

Edit mode deserves focus. Collapsing the sidebar (on smaller screens) gives maximum space to the textarea, reducing horizontal scrolling and improving readability. The sidebar's flashcard list is less relevant during editing—users are focused on content, not review.

---

## IMPLEMENTATION PRIORITY

### Phase 1: MVP (This Design)
- [ ] Edit mode toggle button in header
- [ ] Keyboard shortcut (`Ctrl+E`)
- [ ] TextEditor component with Charter font
- [ ] Character counter
- [ ] Save/Cancel buttons with confirmation
- [ ] Toast notifications for success/error
- [ ] Backend API: `PATCH /api/texts/:id`
- [ ] Mark position recalculation on save

### Phase 2: Enhancements
- [ ] Syntax highlighting in textarea (contenteditable)
- [ ] Large edit warning (>50% deletion)
- [ ] Revision history
- [ ] Undo/redo UI (beyond native textarea)

### Phase 3: Advanced
- [ ] Auto-save drafts
- [ ] Diff view (old vs new)
- [ ] Spell check integration
- [ ] Markdown toolbar

---

## REFERENCES

**Influenced By**:
- **Notion**: Seamless read/edit mode switching
- **Google Docs**: Auto-save with manual save option
- **Obsidian**: Raw markdown editing with preview
- **GitHub**: Textarea with character counter and preview
- **Superhuman**: Keyboard-first design with explicit shortcuts

**Design Principles Applied**:
- **Progressive Disclosure**: Advanced features (warnings, validations) appear only when needed
- **Confirmation of Risky Actions**: Discard changes requires confirmation
- **Immediate Feedback**: Toast notifications for save success/failure
- **Consistent Typography**: Charter font in both read and edit modes
- **Accessibility First**: Keyboard shortcuts, screen reader support, focus management

---

**End of Design Document**

This design balances power and simplicity, giving users full control over text editing while preserving the integrity of marks and read progress. The inline approach keeps users in context, avoiding modal dialogs or separate editor views, which aligns with Trivium's philosophy of focused, distraction-free learning.
