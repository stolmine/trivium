# Inline Editing Visual Comparison Guide

**Purpose**: High-fidelity ASCII mockups to guide implementation

---

## COMPARISON: Modal vs Inline Approach

### Current Implementation (Modal)

```
┌─────────────────────────────────────────────────────────────┐
│ ███████████████████████████████████████████████████████████ │
│ ██                                                       ██ │
│ ██  ┌────────────────────────────────────────────────┐  ██ │
│ ██  │ Edit Selection                           [X]   │  ██ │
│ ██  ├────────────────────────────────────────────────┤  ██ │
│ ██  │                                                │  ██ │
│ ██  │ ... context before (dimmed) ...               │  ██ │
│ ██  │                                                │  ██ │
│ ██  │ ┌──────────────────────────────────────────┐ │  ██ │
│ ██  │ │ Editable text here with cursor         │ │  ██ │
│ ██  │ │                                          │ │  ██ │
│ ██  │ └──────────────────────────────────────────┘ │  ██ │
│ ██  │                                                │  ██ │
│ ██  │ ... context after (dimmed) ...                │  ██ │
│ ██  │                                                │  ██ │
│ ██  ├────────────────────────────────────────────────┤  ██ │
│ ██  │              [Cancel]  [Save Changes]         │  ██ │
│ ██  └────────────────────────────────────────────────┘  ██ │
│ ██                                                       ██ │
│ ███████████████████████████████████████████████████████████ │
│                   BLOCKS ENTIRE VIEW                        │
└─────────────────────────────────────────────────────────────┘

Issues:
✗ Covers all reading content
✗ Loses spatial position in document
✗ Feels like leaving the page
✗ Context is shown but disconnected
```

### New Implementation (Inline)

```
┌─────────────────────────────────────────────────────────────┐
│ [← Back]  Article Title          [🔗] [🔍] [📝 EDIT] [⋮]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  First paragraph of the document continues normally with   │
│  all the text visible and readable.                        │
│                                                             │
│░░ Second paragraph starts here and continues with more  ░░░│
│░░ content that is now dimmed because we're editing       ░░░│
│░░ the paragraph below. Notice it's still readable.      ░░░│
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Third paragraph is actively being edited. The cursor│  │
│  │ is visible right here [▊] and I can type naturally. │  │
│  │ Links like Wikipedia look underlined. Highlights    │  │
│  │ like inherited tendency appear with yellow bg.      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│░░ Fourth paragraph is dimmed but still contextually     ░░░│
│░░ visible so I know where I am in the document.         ░░░│
│                                                             │
│  Fifth paragraph is back to normal, below the edit zone.  │
│                                                             │
│  [M] Styled │ 234 chars │ [Esc] Cancel │ [⌘S] Save         │
└─────────────────────────────────────────────────────────────┘

Benefits:
✓ Editing in original position
✓ Context always visible
✓ Feels like direct manipulation
✓ Spatial awareness maintained
```

---

## STATE TRANSITIONS: Frame-by-Frame

### Frame 1: Normal Reading

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Natural selection acts solely through the preservation    │
│  of variations in some way advantageous, which             │
│  consequently endure.                                       │
│                                                             │
│  The term 'natural selection' is in some respects a bad    │
│  one, as it seems to imply conscious choice; but this      │
│  will be disregarded after a little familiarity.           │
│                                                             │
│  Everyone knows what is meant by inherited tendency; we    │
│  see it in every domestic and wild animals.                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Frame 2: User Selects "bad one"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Natural selection acts solely through the preservation    │
│  of variations in some way advantageous, which             │
│  consequently endure.                                       │
│                                                             │
│  The term 'natural selection' is in some respects a ▓▓▓▓   │
│  ▓▓▓, as it seems to imply conscious choice; but this      │
│  will be disregarded after a little familiarity.           │
│                     └─ SELECTED TEXT ─┘                     │
│  Everyone knows what is meant by inherited tendency; we    │
│  see it in every domestic and wild animals.                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Frame 3: User Presses 'E' → Boundary Calculation (Instant)

```
System detects: Selection within single sentence
Action: Expand to sentence boundaries
Start: "The term..."
End: "...little familiarity."
Boundary Type: SENTENCE
```

### Frame 4: 100ms into Transition

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Natural selection acts solely through the preservation    │
│░ of variations in some way advantageous, which            ░│
│░ consequently endure.                                      ░│
│  └── Starting to dim (70% opacity) ──┘                      │
│  ┌───────────────────────────────────────────────────┐     │
│  │ The term 'natural selection' is in some respects a│     │
│  │ bad one, as it seems to imply conscious choice;   │     │
│  │ but this will be disregarded after a little       │     │
│  │ familiarity.                                      │     │
│  └───────────────────────────────────────────────────┘     │
│  └── Border appearing (50% opacity) ──┘                     │
│░ Everyone knows what is meant by inherited tendency...   ░│
│  └── Starting to dim ──┘                                    │
└─────────────────────────────────────────────────────────────┘
```

### Frame 5: 200ms → Edit Mode Fully Active

```
┌─────────────────────────────────────────────────────────────┐
│ [← Back]  Article                [🔗] [🔍] [📝 EDIT] [⋮]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│░░ Natural selection acts solely through preservation... ░░░│
│░░ of variations in some way advantageous, which         ░░░│
│░░ consequently endure.                                  ░░░│
│  └── Fully dimmed (40% opacity + blur) ──┘                  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ The term 'natural selection' is in some respects a  │  │
│  │ bad one, as it seems to imply conscious choice; but │  │
│  │ this will be disregarded after a little familiarity.│  │
│  │                                                 [▊] │  │
│  └──────────────────────────────────────────────────────┘  │
│  └── Full border, shadow, cursor active ──┘                 │
│                                                             │
│░░ Everyone knows what is meant by inherited tendency... ░░░│
│  └── Fully dimmed ──┘                                       │
│                                                             │
│  [M] Styled │ 158 chars │ [Esc] Cancel │ [⌘S] Save         │
│  └── Toolbar fully visible ──┘                              │
└─────────────────────────────────────────────────────────────┘
```

### Frame 6: User Edits Text

```
┌─────────────────────────────────────────────────────────────┐
│░░ Natural selection acts solely through preservation... ░░░│
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ The term 'natural selection' is somewhat misleading,│  │
│  │ as it seems to imply conscious choice; but this     │  │
│  │ will be disregarded after a little familiarity. [▊] │  │
│  └──────────────────────────────────────────────────────┘  │
│      └── Text changed, char count updates ──┘               │
│                                                             │
│░░ Everyone knows what is meant by inherited tendency... ░░░│
│                                                             │
│  [M] Styled │ 171 chars │ [Esc] Cancel │ [⌘S] Save         │
│                  ^^^^^                       ^^^^           │
│              Updated!                    Now enabled!       │
└─────────────────────────────────────────────────────────────┘
```

### Frame 7: User Presses ⌘S → Saving

```
┌─────────────────────────────────────────────────────────────┐
│░░ Natural selection acts solely through preservation... ░░░│
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ The term 'natural selection' is somewhat misleading,│  │
│  │ as it seems to imply conscious choice; but this     │  │
│  │ will be disregarded after a little familiarity.     │  │
│  └──────────────────────────────────────────────────────┘  │
│      └── Slightly dimmed (60% opacity) ──┘                  │
│                                                             │
│░░ Everyone knows what is meant by inherited tendency... ░░░│
│                                                             │
│  [M] Styled │ 171 chars │ [Esc] Cancel │ [⟳ Saving...]     │
│                              ^^^^^^^       ^^^^^^^^^^^      │
│                            Disabled        Spinner          │
└─────────────────────────────────────────────────────────────┘
```

### Frame 8: Save Success → Border Flash

```
┌─────────────────────────────────────────────────────────────┐
│░░ Natural selection acts solely through preservation... ░░░│
│                                                             │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ The term 'natural selection' is somewhat misleading,┃  │
│  ┃ as it seems to imply conscious choice; but this     ┃  │
│  ┃ will be disregarded after a little familiarity.     ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│  └── GREEN BORDER (100ms flash) ──┘                         │
│                                                             │
│  Toast: ✓ Text updated successfully                        │
└─────────────────────────────────────────────────────────────┘
```

### Frame 9: 100ms Later → Fading Out

```
┌─────────────────────────────────────────────────────────────┐
│░░ Natural selection acts solely through preservation... ░░░│
│  └── Brightening to 70% ──┘                                 │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ The term 'natural selection' is somewhat misleading,│  │
│  │ as it seems to imply conscious choice; but this     │  │
│  │ will be disregarded after a little familiarity.     │  │
│  └──────────────────────────────────────────────────────┘  │
│  └── Border fading, opacity 50% ──┘                         │
│                                                             │
│░░ Everyone knows what is meant by inherited tendency... ░░░│
│  └── Brightening to 70% ──┘                                 │
│                                                             │
│  [M] Styled │ 171 chars │ [Esc] Cancel │ [⌘S] Save         │
│  └── Toolbar fading out, opacity 50% ──┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Frame 10: 300ms → Back to Read Mode

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Natural selection acts solely through the preservation    │
│  of variations in some way advantageous, which             │
│  consequently endure.                                       │
│                                                             │
│  The term 'natural selection' is somewhat misleading, as   │
│  it seems to imply conscious choice; but this will be      │
│  disregarded after a little familiarity.                   │
│  └── NEW TEXT, fully visible ──┘                            │
│                                                             │
│  Everyone knows what is meant by inherited tendency; we    │
│  see it in every domestic and wild animals.                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## MARKDOWN MODE COMPARISON

### Styled Mode (Default)

```
┌──────────────────────────────────────────────────────────┐
│ The theory of [natural selection](https://wikipedia...) │
│ was first proposed by Charles Darwin. It explains how   │
│ {{c1::inherited traits}} that enhance survival become   │
│ more common over generations.                            │
│                                                          │
│ === Key Principles ===                                  │
│                                                          │
│ Organisms produce more offspring than can survive.      │
└──────────────────────────────────────────────────────────┘

                        ↓ RENDERS AS ↓

┌──────────────────────────────────────────────────────────┐
│ The theory of natural selection was first proposed by   │
│              └─────────────┘                             │
│              Underlined link                             │
│ Charles Darwin. It explains how inherited traits that   │
│                                  ────────────────        │
│                               Yellow highlight (cloze)   │
│ enhance survival become more common over generations.   │
│                                                          │
│ Key Principles  ← Bold header                           │
│                                                          │
│ Organisms produce more offspring than can survive.      │
└──────────────────────────────────────────────────────────┘

User Experience:
✓ Edits "natural selection" text → link preserved
✓ Edits "inherited traits" → cloze preserved
✓ Cannot accidentally break markdown syntax
✓ Hover link shows 🔗 icon + tooltip
```

### Literal Mode (Press 'M')

```
┌──────────────────────────────────────────────────────────┐
│ The theory of [natural selection](https://wikipedia...) │
│ was first proposed by Charles Darwin. It explains how   │
│ {{c1::inherited traits}} that enhance survival become   │
│ more common over generations.                            │
│                                                          │
│ === Key Principles ===                                  │
│                                                          │
│ Organisms produce more offspring than can survive.      │
└──────────────────────────────────────────────────────────┘

                    ↓ SHOWS EXACTLY AS IS ↓

┌──────────────────────────────────────────────────────────┐
│ The theory of [natural selection](https://wikipedia     │
│ .org/wiki/Natural_selection) was first proposed by      │
│ Charles Darwin. It explains how {{c1::inherited traits}}│
│ that enhance survival become more common over            │
│ generations.                                             │
│                                                          │
│ === Key Principles ===                                  │
│                                                          │
│ Organisms produce more offspring than can survive.      │
└──────────────────────────────────────────────────────────┘

User Experience:
✓ Can edit URL: https://wikipedia.org/...
✓ Can change cloze ID: c1 → c2
✓ Can add/remove header markers: ===
✓ Full control, but requires markdown knowledge
```

### Toggle Indicator

**Styled Mode**:
```
┌─────────────────────────────────────────────────────────┐
│ [👁] Styled │ 234 chars │ [Esc] Cancel │ [⌘S] Save     │
│  └── Eye icon (viewing rendered)                        │
└─────────────────────────────────────────────────────────┘
```

**Literal Mode**:
```
┌─────────────────────────────────────────────────────────┐
│ [</>] LITERAL │ 267 chars │ [Esc] Cancel │ [⌘S] Save   │
│  └── Code icon (editing raw)    ^^^^                    │
│                            Char count higher (syntax)   │
└─────────────────────────────────────────────────────────┘
```

---

## BOUNDARY TYPE COMPARISON

### Sentence Boundary (Lighter Style)

```
Selection: "bad one" (within single sentence)
Expansion: → Full sentence

┌─────────────────────────────────────────────────────────┐
│░░ Previous context dimmed...                         ░░░│
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ The term 'natural selection' is in some respects │ │
│  │ a bad one, as it seems to imply conscious        │ │
│  │ choice; but this will be disregarded after a     │ │
│  │ little familiarity. [▊]                          │ │
│  └───────────────────────────────────────────────────┘ │
│  └── 2px border, 8px radius, 12px padding ──┘           │
│                                                         │
│░░ Next context dimmed...                             ░░░│
└─────────────────────────────────────────────────────────┘

Visual Weight: LIGHT
- Suggests: "Small, focused edit"
- Feels: Quick and precise
```

### Paragraph Boundary (Heavier Style)

```
Selection: "bad one... conscious choice" (spans 2 sentences)
Expansion: → Full paragraph

┌─────────────────────────────────────────────────────────┐
│░░ Previous paragraph dimmed...                       ░░░│
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│  ┃ The term 'natural selection' is in some respects ┃ │
│  ┃ a bad one, as it seems to imply conscious        ┃ │
│  ┃ choice; but this will be disregarded after a     ┃ │
│  ┃ little familiarity.                              ┃ │
│  ┃                                                   ┃ │
│  ┃ Everyone knows what is meant by inherited        ┃ │
│  ┃ tendency; we see it in every domestic and wild   ┃ │
│  ┃ animals. The laws governing inheritance are      ┃ │
│  ┃ unknown. [▊]                                     ┃ │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│  └── 3px border, 12px radius, 20px padding ──┘          │
│                                                         │
│░░ Next paragraph dimmed...                           ░░░│
└─────────────────────────────────────────────────────────┘

Visual Weight: HEAVY
- Suggests: "Larger scope edit"
- Feels: Structural change
```

**Side-by-Side Visual Difference**:

```
SENTENCE                        PARAGRAPH
────────                        ─────────

┌─────────────┐                ┏━━━━━━━━━━━━━┓
│ Single line │                ┃ Multiple    ┃
│ edit here   │                ┃ paragraphs  ┃
│             │                ┃ being       ┃
└─────────────┘                ┃ edited at   ┃
                               ┃ once        ┃
2px thin border                ┗━━━━━━━━━━━━━┛
8px radius
12px padding                   3px thick border
Light shadow                   12px radius
                               20px padding
                               Heavier shadow
```

---

## TOOLBAR STATES

### Normal State

```
┌─────────────────────────────────────────────────────────┐
│ [👁] Styled │ 158 chars │ [Esc] Cancel │ [⌘S] Save     │
│     └─────┘   └───────┘   └──────────┘   └────────┘    │
│     Active    Live        Normal         Primary       │
│     Toggle    Counter     Outline        Enabled       │
└─────────────────────────────────────────────────────────┘
```

### Disabled Save (No Changes)

```
┌─────────────────────────────────────────────────────────┐
│ [👁] Styled │ 158 chars │ [Esc] Cancel │  [⌘S] Save    │
│                                           ^^^^^^^^^^^    │
│                                           Grayed out    │
│                                           Not clickable │
└─────────────────────────────────────────────────────────┘
```

### Saving State

```
┌─────────────────────────────────────────────────────────┐
│ [👁] Styled │ 158 chars │ [Esc] Cancel │ [⟳ Saving...] │
│     └─────┘   └───────┘   └──────────┘   └──────────┘  │
│     Disabled  Static      Disabled       Spinner       │
└─────────────────────────────────────────────────────────┘
```

### Literal Mode Active

```
┌─────────────────────────────────────────────────────────┐
│ [</>] LITERAL │ 267 chars │ [Esc] Cancel │ [⌘S] Save   │
│  └────────┘      ^^^^^^^^                               │
│  Different     Char count higher                        │
│  icon          (includes syntax)                        │
└─────────────────────────────────────────────────────────┘
```

### Error State

```
┌─────────────────────────────────────────────────────────┐
│ ❌ Failed to save: Network error                        │
│    [Retry] [Copy to Clipboard]                          │
├─────────────────────────────────────────────────────────┤
│ [👁] Styled │ 158 chars │ [Esc] Cancel │ [↻ Retry]     │
│                                           ^^^^^^^^       │
│                                         Retry button    │
└─────────────────────────────────────────────────────────┘
```

---

## RESPONSIVE BREAKPOINTS

### Desktop (1024px+)

```
┌─────────────────────────────────────────────────────────┐
│ [← Back] Article Title    [🔗] [🔍] [📝 EDIT] [⋮]       │
├──────────────────────────────────────┬──────────────────┤
│                                      │                  │
│  Main content area                   │  Sidebar         │
│  with inline editing                 │  (flashcards)    │
│                                      │                  │
│  ┌────────────────────────────────┐ │                  │
│  │ Editable region                │ │  [Card 1]        │
│  │ Max-width: 70ch                │ │  [Card 2]        │
│  │                                │ │  [Card 3]        │
│  └────────────────────────────────┘ │                  │
│                                      │                  │
│  [M] Styled │ 158 chars │ Cancel │  │                  │
│                                      │                  │
└──────────────────────────────────────┴──────────────────┘
```

### Tablet (768px - 1024px)

```
┌─────────────────────────────────────────────────────────┐
│ [← Back] Article            [🔗] [🔍] [📝 EDIT] [⋮]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Main content area (full width when editing)           │
│  Sidebar auto-collapses on edit mode entry             │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Editable region                                  │  │
│  │ Max-width: 90vw                                  │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [M] Styled │ 158 chars │ [Esc] Cancel │ [⌘S] Save     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ [✕] Edit    [Save]       │ ← Simplified toolbar
├──────────────────────────┤
│                          │
│ ┌────────────────────┐  │
│ │ Editable region    │  │
│ │ Full width         │  │
│ │ Fills viewport     │  │
│ │                    │  │
│ │                    │  │
│ │                    │  │
│ │                    │  │
│ │ (Scrollable)       │  │
│ └────────────────────┘  │
│                          │
│ 158 chars                │ ← Counter in header
│                          │
│ [Cancel] [Save Changes]  │ ← Stacked buttons
│ ^^^^^^^^^^^^^^^^^^^^^^   │
│ Full width, bottom       │
└──────────────────────────┘
```

---

## ACCESSIBILITY: FOCUS INDICATORS

### Focus States

```
TAB ORDER:

1. Editable Region (Auto-focused on entry)
┌──────────────────────────────────────┐
│ Text here with cursor [▊]            │ ← RING VISIBLE
└──────────────────────────────────────┘
  └── 2px blue ring, 4px offset

        ↓ TAB

2. Markdown Toggle
[ [👁] Styled ]  ← RING VISIBLE
  └── Button gets focus ring

        ↓ TAB

3. Cancel Button
[ Cancel ]  ← RING VISIBLE

        ↓ TAB

4. Save Button
[ Save ]  ← RING VISIBLE

        ↓ SHIFT+TAB (back to editable)
```

### Screen Reader Announcements

**On Edit Mode Entry**:
```
[ARIA LIVE REGION]
"Edit mode active. Text region focused.
Press M to toggle markdown view.
Press Command+S to save or Escape to cancel.
158 characters."
```

**On Character Change**:
```
[ARIA LIVE - POLITE]
"159 characters."
(Only announces periodically, not every keystroke)
```

**On Mode Toggle**:
```
[ARIA LIVE]
"Literal mode active. Raw markdown visible."

[ARIA LIVE]
"Styled mode active. Markdown rendered."
```

**On Save**:
```
[ARIA LIVE]
"Saving changes..."

[ARIA LIVE - SUCCESS]
"Text updated successfully."

[ARIA LIVE - ERROR]
"Failed to save: Network error."
```

---

## DARK MODE VARIATIONS

### Light Mode

```
┌─────────────────────────────────────────────────────────┐
│                      ← White bg                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Editable region                                    │ │
│  │ Background: oklch(1 0 0) - Pure white              │ │
│  │ Border: oklch(0.205 0 0) - Dark gray (2px)         │ │
│  │ Shadow: Subtle black (8% opacity)                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  [M] Styled │ 158 chars │ [Esc] Cancel │ [⌘S] Save     │
│  ^^^^^^^^^^^  ^^^^^^^^^^   ^^^^^^^^^^^^^  ^^^^^^^^^^^^  │
│  Dark text    Muted gray   Outline btn    Primary btn  │
│                                                         │
│░░ Dimmed text: 40% opacity, slight blur              ░░░│
└─────────────────────────────────────────────────────────┘
```

### Dark Mode

```
┌─────────────────────────────────────────────────────────┐
│                      ← Near-black bg                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Editable region                                    │ │
│  │ Background: oklch(0.18 0 0) - Slightly lighter     │ │
│  │ Border: oklch(0.85 0 0) - Light gray (2px)         │ │
│  │ Shadow: Deeper black (30% opacity)                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  [M] Styled │ 158 chars │ [Esc] Cancel │ [⌘S] Save     │
│  ^^^^^^^^^^^  ^^^^^^^^^^   ^^^^^^^^^^^^^  ^^^^^^^^^^^^  │
│  Light text   Muted gray   Outline btn    Primary btn  │
│                                                         │
│░░ Dimmed text: 35% opacity, more blur                ░░░│
└─────────────────────────────────────────────────────────┘

Key Differences:
• Background slightly lighter than page (creates lift)
• Dimming more aggressive (35% vs 40%)
• Blur more pronounced (0.8px vs 0.5px)
• Shadows darker for depth
```

---

**Document End**

These visuals provide pixel-perfect reference for implementing the inline editing experience. Every state, transition, and responsive breakpoint is documented for accurate implementation.
