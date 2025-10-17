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

## Inline Text Editor Design

**Last Updated**: 2025-10-16
**Status**: Design Specification

### Context & Constraints

The inline text editor allows users to edit text content directly in the reading view while preserving:
- Read/unread progress tracking (character position ranges)
- Flashcard marks (highlighted yellow text)
- Excluded ranges (grayed-out sections)
- Markdown links and Wikipedia headers (=== format)

**Critical Requirement**: Marks and read ranges are stored by character position. Text edits can shift positions, requiring careful handling.

---

## 1. ENTRY/EXIT MECHANISMS

### A. Toggle Button (Primary Entry)

**Location**: Header toolbar, between Search and Options menu

```
Header Layout:
┌──────────────────────────────────────────────────────────────────┐
│ [← Back]  Title            Progress: 45%  [🔗] [🔍] [✏️] [⋮]     │
└──────────────────────────────────────────────────────────────────┘
                                                      ^^^
                                                   NEW BUTTON
```

**Button Specs**:
- Component: `Button` variant="ghost" size="icon"
- Icon: `Edit2` from lucide-react (16px)
- States:
  - Default: `variant="ghost"`
  - Active (edit mode): `variant="default"` with primary background
- Tooltip: "Edit text (Ctrl+E)"
- aria-label: "Toggle edit mode"

### B. Keyboard Shortcut (Secondary Entry)

**Shortcut**: `Ctrl/Cmd+E` (E for Edit)
- Works globally in reading view
- Prevents default browser behavior
- Toggles between read and edit modes
- Does NOT trigger when:
  - Search bar is focused
  - Any dialog is open
  - Flashcard creator is open

### C. Exit Methods

**Three ways to exit**:

1. **Save Changes** (Primary action)
   - Button: "Save" variant="default"
   - Shortcut: `Ctrl/Cmd+S`
   - Validates content length > 0
   - Shows success toast: "Text updated successfully"
   - Recalculates progress and mark positions

2. **Cancel Changes** (Secondary action)
   - Button: "Cancel" variant="outline"
   - Shortcut: `Escape`
   - Shows confirmation if unsaved changes detected
   - Reverts to original content

3. **Toggle Button** (Tertiary)
   - Clicking edit button again
   - Same behavior as Cancel (shows confirmation if unsaved)

---

## 2. VISUAL STATES & TRANSITIONS

### State Machine

```
┌──────────────┐
│  READ MODE   │ ← Default state
│              │
│ - Text with  │
│   highlights │
│ - Selection  │
│   enabled    │
└──────┬───────┘
       │
       │ Ctrl+E or Click Edit
       ↓
┌──────────────┐
│  EDIT MODE   │
│              │
│ - Textarea   │
│ - Char count │
│ - Actions    │
└──────┬───────┘
       │
       │ Save / Cancel / Esc
       ↓
┌──────────────┐
│ SAVING STATE │ (Brief, 200ms-1s)
│              │
│ - Disabled   │
│ - Spinner    │
└──────┬───────┘
       │
       ↓ Success
┌──────────────┐
│  READ MODE   │
│              │
│ (Updated)    │
└──────────────┘
```

### Read Mode (Default)

**Appearance**:
- Content: `<ReadHighlighter>` component (current)
- Font: Charter serif, 1.25rem scaled by user preference
- Highlights: Yellow background for marks
- Read ranges: Black background, white text
- User can select text for marking/flashcards

**Visual Example**:
```
┌────────────────────────────────────────────────────┐
│                                                    │
│  The quick brown fox jumps over the lazy dog.     │
│  ████████████████████████████ (read text)         │
│  Lorem ipsum dolor sit amet, consectetur           │
│  adipiscing elit with highlighted mark shown       │
│  in yellow background.                             │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Edit Mode (Active)

**Layout Transform**: Content area becomes editable form

```
┌─────────────────────────────────────────────────────────────┐
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ EDIT MODE ACTIVE                                       ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ The quick brown fox jumps over the lazy dog.       │   │
│ │ All previously read text remains as normal text.    │   │
│ │ Lorem ipsum dolor sit amet, consectetur             │   │
│ │ adipiscing elit {{c1::with highlighted mark}}       │   │
│ │ visible as cloze syntax.                            │   │
│ │                                                      │   │
│ │ [Cursor here, fully editable]                       │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Characters: 1,247 / unlimited                              │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ ⚠️  EDITING NOTICE                                  │   │
│ │                                                      │   │
│ │ • Read progress and flashcard marks will be         │   │
│ │   automatically updated to match text changes       │   │
│ │ • Large edits may affect mark positions             │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│                              [Cancel]  [Save Changes]      │
└─────────────────────────────────────────────────────────────┘
```

**Component Specifications**:

1. **Edit Mode Banner** (Top)
   - Background: `hsl(var(--accent))`
   - Border: 2px `hsl(var(--primary))`
   - Padding: 12px 16px
   - Font: Inter 600, 14px
   - Text: "EDIT MODE ACTIVE"
   - Icon: `Edit2` (16px) before text
   - Border-radius: 8px
   - Margin-bottom: 24px

2. **Textarea Component**
   - Component: Custom styled `<Textarea>` (shadcn/ui)
   - Font: **Charter serif** (matches reading view)
   - Font-size: Inherits from `reading-content` (1.25rem × user scale)
   - Line-height: 1.8 (matches reading view)
   - Min-height: 400px
   - Max-width: 70ch (matches reading content)
   - Padding: 16px
   - Border: 2px `hsl(var(--border))`
   - Border-radius: var(--radius) (0.625rem)
   - Background: `hsl(var(--background))`
   - Focus:
     - Border-color: `hsl(var(--ring))`
     - Box-shadow: `0 0 0 2px hsl(var(--ring) / 20%)`
   - Resize: vertical (user can adjust height)
   - Spellcheck: enabled
   - Auto-focus: true (when entering edit mode)

3. **Character Counter**
   - Position: Below textarea, right-aligned
   - Font: Inter 400, 14px
   - Color: `hsl(var(--muted-foreground))`
   - Format: "Characters: 1,247 / unlimited"
   - Updates in real-time (debounced 100ms)

4. **Information Banner**
   - Component: Custom alert-style div
   - Background: `hsl(var(--muted) / 50%)`
   - Border-left: 4px `hsl(var(--primary))`
   - Padding: 16px
   - Border-radius: var(--radius)
   - Margin: 24px 0
   - Icon: `AlertCircle` (20px, `hsl(var(--primary))`)
   - Title: "EDITING NOTICE" (Inter 600, 13px, uppercase)
   - Content:
     - Bullet points (Inter 400, 14px)
     - Line-height: 1.6
     - Color: `hsl(var(--foreground))`
   - Message:
     ```
     • Read progress and flashcard marks will be automatically
       updated to match text changes
     • Large edits may affect mark positions
     ```

5. **Action Buttons** (Footer)
   - Layout: Flex row, justify-end, gap 12px
   - Margin-top: 24px

   **Cancel Button**:
   - Component: `Button` variant="outline" size="default"
   - Text: "Cancel"
   - Keyboard: `Escape`
   - Behavior: Confirm if unsaved changes

   **Save Button**:
   - Component: `Button` variant="default" size="default"
   - Text: "Save Changes"
   - Keyboard: `Ctrl/Cmd+S`
   - Disabled when: content === originalContent
   - Loading state: Shows spinner, text "Saving..."

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

## 3. MARK PRESERVATION & VISUALIZATION

### The Challenge

Marks and read ranges are stored as **character positions** (start, end) in the database. When text is edited:
- Adding text before a mark shifts its position forward
- Deleting text can invalidate mark positions
- We must intelligently update positions or warn users

### Strategy: Transparent Auto-Update

**Philosophy**: Make editing feel seamless. The system handles position updates behind the scenes.

### Visual Approach in Edit Mode

**Option A: Show Marks as Plain Text** (RECOMMENDED)
- Display raw cloze syntax: `{{c1::highlighted text}}`
- Users see and can edit mark boundaries
- Clear, explicit, matches flashcard creation
- Familiar to users who understand cloze format

**Option B: Syntax Highlighting** (Future Enhancement)
- Display marks with yellow background in textarea
- Technically complex (requires contenteditable)
- Risk of user confusion about editability
- Defer to v2

**Implementation**: Option A (Raw Syntax)

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
