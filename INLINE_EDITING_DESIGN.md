# Truly Inline Text Editing Design Specification

**Project**: Trivium Reading App
**Feature**: In-Place Text Editing with Smart Boundaries
**Date**: 2025-10-17
**Status**: Complete Design Specification

---

## EXECUTIVE SUMMARY

This document specifies a truly inline text editing experience that transforms selected text into an editable region without modal overlays. The design features intelligent boundary expansion, context-preserving visual dimming, and dual markdown rendering modes.

### Core Innovations

1. **Smart Boundary Expansion**: Single sentence vs multi-sentence detection
2. **Context Preservation**: Dimmed surrounding text stays visible
3. **Dual Markdown Modes**: Styled (rendered) vs Literal (raw syntax)
4. **Position-Safe Editing**: Mark positions updated intelligently
5. **Seamless Transitions**: 200-300ms animations feel magical

---

## 1. USER INTERACTION FLOW

### Entry Sequence

```
User in Reading View
        ↓
Select text (drag or double-click)
        ↓
Press 'E' key OR click "Edit" in selection menu
        ↓
System calculates boundary:
  - Single sentence → Expand to sentence boundaries (. ! ?)
  - Multiple sentences → Expand to paragraph boundaries (\n\n)
        ↓
200ms transition:
  - Dim context (40% opacity + blur)
  - Show editable border (2-3px primary color)
  - Render inline toolbar
  - Focus contenteditable region
        ↓
User edits text in place
        ↓
User can toggle markdown mode with 'M' key
        ↓
User saves (⌘S) or cancels (Esc)
        ↓
300ms fade transition back to read mode
```

### Visual States

**Read Mode**:
- Full text visible with highlights
- Selection enabled
- Charter serif font

**Inline Edit Mode**:
- Editable region: bordered, elevated (shadow)
- Context: dimmed to 40% opacity with 0.5px blur
- Toolbar: fixed to bottom of editable region
- Cursor: blinking in contenteditable area

---

## 2. VISUAL DESIGN SPECIFICATIONS

### Sentence Boundary Edit

```
┌─────────────────────────────────────────────────────────────┐
│ [← Back]  Article Title          [🔗] [🔍] [📝 EDIT] [⋮]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│░░ Previous paragraph dimmed at 40% opacity...            ░░░│
│░░ ████████████████████████████████████████████████████ ░░░░│
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ The term 'natural selection' is in some respects a  │  │
│  │ bad one, as it seems to imply conscious choice; but │  │
│  │ this will be disregarded after a little familiarity.│  │
│  │                                                 [▊] │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│░░ Next paragraph also dimmed...                          ░░░│
│                                                             │
│  [M] Styled │ 158 chars │ [Esc] Cancel │ [⌘S] Save         │
└─────────────────────────────────────────────────────────────┘
```

**Dimensions**:
- Border: 2px solid oklch(var(--primary))
- Border-radius: 8px
- Padding: 12px 16px
- Min-height: 48px
- Shadow: 0 0 0 4px oklch(var(--primary) / 10%), 0 4px 16px oklch(0 0 0 / 8%)

### Paragraph Boundary Edit

```
┌─────────────────────────────────────────────────────────────┐
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ First sentence of paragraph. Second sentence here.  ┃  │
│  ┃ Third sentence continues the thought.                ┃  │
│  ┃                                                      ┃  │
│  ┃ New paragraph starts here with more content. [▊]    ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                             │
│  [M] Styled │ 347 chars │ [Esc] Cancel │ [⌘S] Save         │
└─────────────────────────────────────────────────────────────┘
```

**Dimensions**:
- Border: 3px solid oklch(var(--primary)) (thicker)
- Border-radius: 12px (larger)
- Padding: 20px 24px
- Min-height: 120px
- Shadow: 0 0 0 6px oklch(var(--primary) / 15%), 0 8px 24px oklch(0 0 0 / 12%)

### Inline Toolbar Anatomy

```
┌─────────────────────────────────────────────────────────────┐
│ [M] Styled    │    158 chars    │    [Esc] Cancel    │  [⌘S] Save │
│ └───┬────┘          └──┬──┘          └─────┬─────┘      └────┬────┘
│     │                  │                    │                  │
│  Toggle          Character           Cancel Button      Save Button
│  (40px)          Counter                (100px)            (100px)
│                  (flex-1)
└─────────────────────────────────────────────────────────────┘
```

**Toolbar Specs**:
- Position: Sticky to bottom of editable region
- Height: 56px (12px + 32px + 12px padding)
- Background: oklch(var(--background) / 95%) with backdrop-blur(8px)
- Border-top: 2px solid oklch(var(--primary))
- Border-radius: 0 0 8px 8px
- Shadow: 0 -4px 12px oklch(0 0 0 / 10%)

---

## 3. MARKDOWN RENDERING MODES

### Styled Mode (Default)

**Purpose**: Quick text edits without touching syntax

**Rendering**:
- Links: `[text](url)` → <u>text</u> (underlined, not clickable)
- Cloze: `{{c1::text}}` → <mark>text</mark> (yellow highlight)
- Headers: `=== Text ===` → **Text** (bold)

**User Experience**:
- Edits visible text only
- URLs protected from accidental changes
- Markdown syntax hidden
- Hover over link shows 🔗 icon
- Tooltip: "Press M to edit URLs"

**Styling**:
```css
.inline-link {
  text-decoration: underline;
  text-decoration-color: oklch(0.45 0.1 240);
  text-underline-offset: 2px;
  cursor: text;
}

.cloze-mark {
  background: oklch(0.95 0.08 90);
  border: 2px dotted oklch(0.7 0.15 85);
  border-radius: 4px;
  padding: 2px 4px;
  font-weight: 500;
}
```

### Literal Mode (Press 'M')

**Purpose**: Edit raw markdown including URLs and cloze boundaries

**Rendering**:
- Shows raw text: `[natural selection](https://wikipedia.org/...)`
- Shows cloze syntax: `{{c1::inherited tendency}}`
- Shows header syntax: `=== Section Title ===`

**User Experience**:
- Full control over all syntax
- Can edit URLs directly
- Can adjust cloze mark IDs
- Plain text editing (no HTML rendering)

**Visual Indicator**:
- Toggle button shows "LITERAL" instead of "Styled"
- Border color shifts slightly (optional: different hue)
- Tooltip updates to "Press M for styled view"

---

## 4. COLOR & STYLING GUIDE

### Light Mode

**Editable Region**:
- Background: `oklch(1 0 0)` (pure white)
- Border: `oklch(0.205 0 0)` (dark gray)
- Focus ring: `oklch(0.205 0 0 / 20%)`

**Dimmed Context**:
- Opacity: `0.4`
- Filter: `blur(0.5px)`

**Toolbar**:
- Background: `oklch(1 0 0 / 95%)` + `backdrop-blur(8px)`
- Border-top: `2px solid oklch(0.205 0 0)`

**Markdown Elements**:
- Link underline: `oklch(0.45 0.1 240)` (blue)
- Cloze background: `oklch(0.95 0.08 90)` (soft yellow)
- Cloze border: `oklch(0.7 0.15 85)` (darker yellow)

### Dark Mode

**Editable Region**:
- Background: `oklch(0.18 0 0)` (slightly lighter than page bg)
- Border: `oklch(0.85 0 0)` (light gray)
- Focus ring: `oklch(0.85 0 0 / 25%)`

**Dimmed Context**:
- Opacity: `0.35` (more aggressive)
- Filter: `blur(0.8px)` (more blur)

**Toolbar**:
- Background: `oklch(0.16 0 0 / 95%)` + `backdrop-blur(10px)`
- Border-top: `2px solid oklch(0.85 0 0)`

**Markdown Elements**:
- Link underline: `oklch(0.65 0.12 250)` (brighter blue)
- Cloze background: `oklch(0.35 0.08 80)` (darker yellow)
- Cloze border: `oklch(0.5 0.15 75)`

---

## 5. ANIMATION & TRANSITIONS

### Entry Animation (200ms ease-out)

```css
@keyframes inline-edit-enter {
  from {
    opacity: 0;
    transform: scale(0.98);
    border-color: transparent;
  }
  to {
    opacity: 1;
    transform: scale(1);
    border-color: oklch(var(--primary));
  }
}
```

**Simultaneous**:
- Editable region fades in + scales up
- Context dims from 100% → 40% opacity
- Toolbar slides up from bottom (translateY(20px) → 0)

### Context Dimming (300ms cubic-bezier)

```css
.context-dimmed {
  transition:
    opacity 300ms cubic-bezier(0.4, 0, 0.2, 1),
    filter 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Exit Animation (300ms ease-in-out)

**On Save Success**:
```css
@keyframes save-success {
  0% {
    opacity: 1;
    border-color: oklch(var(--primary));
  }
  50% {
    border-color: oklch(0.6 0.15 145); /* Green flash */
  }
  100% {
    opacity: 0;
    transform: scale(0.99);
  }
}
```

**Sequence**:
1. Border flashes green (100ms)
2. Editable region fades out (200ms)
3. Context brightens back to 100% (200ms)
4. New content crossfades in (100ms)

---

## 6. KEYBOARD SHORTCUTS

| Key | Action | Context |
|-----|--------|---------|
| `E` | Enter edit mode | Text selected |
| `M` | Toggle markdown mode | While editing |
| `⌘S` / `Ctrl+S` | Save changes | While editing |
| `Esc` | Cancel / Exit | While editing |
| `⌘Z` / `Ctrl+Z` | Undo | While editing |
| `⌘⇧Z` / `Ctrl+⇧Z` | Redo | While editing |
| `Tab` | Move to toolbar | From editor |
| `⇧Tab` | Return to editor | From toolbar |

**Shortcut Conflicts**:
- When editing, disable global shortcuts: `Ctrl+M` (mark read), `Ctrl+N` (flashcard)
- Search (`Ctrl+F`) disabled during edit
- Link toggle (`Ctrl+L`) disabled during edit

---

## 7. ACCESSIBILITY FEATURES

### ARIA Labels

**Editable Region**:
```html
<div
  role="textbox"
  aria-label="Edit text region"
  aria-multiline="true"
  aria-describedby="edit-toolbar-hints"
  contenteditable="true"
>
```

**Toolbar Hints** (screen reader only):
```html
<div id="edit-toolbar-hints" aria-live="polite" class="sr-only">
  Editing mode active. Press M to toggle markdown view,
  Command+S to save, or Escape to cancel.
</div>
```

**Character Counter**:
```html
<span aria-live="polite" aria-atomic="true">
  {charCount} characters
</span>
```

### Focus Management

**On Entry**:
1. Focus moves to contenteditable
2. Cursor placed at end of text
3. Screen reader announces: "Edit mode active"

**On Exit**:
1. Focus returns to reading container
2. Scroll position preserved
3. Screen reader announces: "Changes saved" or "Edit cancelled"

### Keyboard Navigation

**Tab Order**:
1. Editable region (auto-focused)
2. Markdown toggle button
3. Cancel button
4. Save button
5. (Shift+Tab back to editable region)

---

## 8. MARK POSITION PRESERVATION

### The Three Zones

```
Before Boundary         Within Boundary          After Boundary
[No changes]            [Recalculate]            [Shift by delta]

████████████            ┏━━━━━━━━━━━━━┓          ████████████
████████████            ┃ EDITED TEXT ┃          ████████████
                        ┗━━━━━━━━━━━━━┛
```

**Zone 1: Before Boundary**
- Mark positions: unchanged
- No processing needed
- Example: Mark at position 100, boundary starts at 500 → no change

**Zone 2: Within Boundary**
- Try to find mark text in new content
- Update relative positions
- Flag for review if text not found
- Example: Mark "inherited tendency" → search in new boundary text

**Zone 3: After Boundary**
- Shift by length delta: `(newLength - oldLength)`
- Automatic, no text search
- Example: Boundary grows by 50 chars → add 50 to all marks after

### Mark Update Algorithm

```typescript
function updateMarkPositions(
  marks: ClozeNote[],
  boundary: { start: number; end: number },
  newBoundaryText: string,
  oldBoundaryText: string
): ClozeNote[] {
  const lengthDelta = newBoundaryText.length - oldBoundaryText.length;

  return marks.map(mark => {
    // Zone 1: Before boundary
    if (mark.endPosition <= boundary.start) {
      return mark; // No change
    }

    // Zone 3: After boundary
    if (mark.startPosition >= boundary.end) {
      return {
        ...mark,
        startPosition: mark.startPosition + lengthDelta,
        endPosition: mark.endPosition + lengthDelta
      };
    }

    // Zone 2: Within boundary
    const relativeStart = mark.startPosition - boundary.start;
    const markText = oldBoundaryText.substring(
      relativeStart,
      relativeStart + (mark.endPosition - mark.startPosition)
    );

    const newIndex = newBoundaryText.indexOf(markText);

    if (newIndex !== -1) {
      // Found - update position
      return {
        ...mark,
        startPosition: boundary.start + newIndex,
        endPosition: boundary.start + newIndex + markText.length
      };
    } else {
      // Not found - flag for review
      return {
        ...mark,
        needsReview: true,
        needsReviewReason: 'Text content changed during edit'
      };
    }
  });
}
```

---

## 9. EDGE CASES & ERROR HANDLING

### Edge Case: No Clear Boundary

**Problem**: User selects text in a list or code block without periods

**Solution**:
1. Try sentence boundary (. ! ?)
2. Fall back to line boundary (\n)
3. If still none, expand ±100 characters
4. Show inline note: "Custom boundary - adjust as needed"

### Edge Case: Selection at Document Start

**Problem**: Expanding backward goes before position 0

**Solution**:
```typescript
const boundaryStart = Math.max(0, calculatedStart);
```

### Edge Case: Selection at Document End

**Problem**: Expanding forward exceeds document length

**Solution**:
```typescript
const boundaryEnd = Math.min(fullText.length, calculatedEnd);
```

### Error State: Empty Content

**Validation**:
```typescript
if (editedContent.trim().length === 0) {
  showToast({
    variant: 'destructive',
    title: 'Content cannot be empty',
    description: 'Please enter text or cancel to revert.'
  });
  return; // Prevent save
}
```

**Visual**:
- Save button disabled
- Character counter shows warning color

### Error State: Save Failed

**Visual**:
```
┌──────────────────────────────────────────────────────────┐
│ ❌ Failed to save: Network error                         │
│    [Retry] [Copy to Clipboard]                           │
└──────────────────────────────────────────────────────────┘
```

**Behavior**:
- Editor stays open (no data loss)
- Red flash on border (200ms)
- Save button becomes "Retry" button
- "Copy to Clipboard" preserves work

### Edge Case: Very Long Content

**Problem**: 10,000+ character paragraphs

**Solution**:
- Editable region max-height: `min(70vh, 800px)`
- Overflow: `auto` (scrollable)
- Toolbar position: `sticky` (stays at bottom)
- Performance: contenteditable handles this natively

---

## 10. IMPLEMENTATION CHECKLIST

### Phase 1 - MVP

- [ ] Boundary detection algorithm (sentence vs paragraph)
- [ ] InlineRegionEditor component
  - [ ] Contenteditable with Charter font
  - [ ] Context dimming wrapper
  - [ ] Inline toolbar
- [ ] Styled mode rendering (default)
  - [ ] Link rendering (non-clickable)
  - [ ] Cloze mark rendering (yellow highlights)
  - [ ] Header rendering (bold)
- [ ] Save/Cancel with keyboard shortcuts
- [ ] Mark position update logic (three zones)
- [ ] Entry/exit animations (200-300ms)

### Phase 2 - Enhanced

- [ ] Literal mode toggle ('M' key)
  - [ ] Raw markdown display
  - [ ] Toggle transitions
- [ ] Markdown mode indicator tooltips
- [ ] Link edit hint (hover shows 🔗 + tooltip)
- [ ] Advanced mark collision warnings
- [ ] Character counter with warnings

### Phase 3 - Polish

- [ ] Save success animation (green flash)
- [ ] Error recovery UI (retry + copy)
- [ ] Empty content validation
- [ ] Very long content handling
- [ ] Mobile/touch optimization
- [ ] Dark mode color refinements

---

## 11. FILE STRUCTURE

### New Files

```
src/lib/components/reading/
├── InlineRegionEditor.tsx       (Main component)
├── MarkdownRenderer.tsx          (Styled mode HTML rendering)
└── BoundaryDetector.ts           (Sentence/paragraph logic)

src/lib/utils/
├── boundaryDetection.ts          (Export boundary functions)
└── markPositionUpdater.ts        (Three-zone update logic)

src/lib/styles/
└── inline-editor.css             (Inline editor specific styles)
```

### Modified Files

```
src/lib/components/reading/
├── ReadHighlighter.tsx           (Add selection tracking)
├── TextSelectionMenu.tsx         (Add "Edit" option)
└── SelectionToolbar.tsx          (Add 'E' key handler)

src/routes/read/index.tsx         (Integrate inline editor)
```

---

## 12. DESIGN RATIONALE

### Why Inline vs Modal?

**Problem with Modals**:
- Break reading flow
- Hide context
- Feel like leaving the page
- Harder to verify edits match surroundings

**Inline Advantages**:
- Editing in context
- See before/after text
- Feels like direct manipulation
- Faster mental mapping

### Why Smart Boundaries?

**User Cognitive Load**:
- Manually selecting exact boundaries is tedious
- Natural editing units are sentences or paragraphs
- Auto-expansion feels magical but predictable

**Implementation Simplicity**:
- Clear algorithm (sentence vs paragraph)
- Position tracking easier with defined boundaries
- Undo/redo cleaner with discrete units

### Why Dual Markdown Modes?

**Flexibility**:
- Most edits are text-only (styled mode faster)
- URL edits rare but important (literal mode)
- Power users want full control

**Learning Curve**:
- Beginners start with styled mode (familiar)
- Toggle discovery through hover hints
- Literal mode reveals markdown structure gradually

### Why Context Dimming?

**Visual Hierarchy**:
- Creates clear focus without hiding context
- Maintains spatial awareness
- Reduces cognitive load (know where you are)

**Depth Perception**:
- Subtle blur adds depth cue
- Editable region "lifts" from page
- Feels like tactile manipulation

---

## 13. FUTURE ENHANCEMENTS

### Phase 4+ Ideas

1. **Multi-Region Editing**
   - Select multiple non-contiguous regions
   - Edit in batch with synchronized save

2. **Revision History**
   - Track edit history per boundary
   - Diff view (old vs new)
   - Restore previous versions

3. **Collaborative Editing**
   - Live cursors (if multi-user)
   - Conflict resolution
   - Comment threads on edits

4. **AI Suggestions**
   - Grammar/style checking
   - Readability improvements
   - Auto-fix markdown syntax errors

5. **Advanced Markdown**
   - Tables, footnotes, citations
   - Custom shortcodes
   - LaTeX math rendering

---

## 14. DESIGN INSPIRATIONS

**Influenced By**:

- **Notion**: Seamless inline editing blocks
- **Medium**: Distraction-free editing with context
- **Google Docs**: Contextual toolbar positioning
- **Obsidian**: Dual view (edit/preview) markdown
- **Superhuman**: Keyboard-first interaction design

**Design Principles Applied**:

- **Direct Manipulation**: Edit where you see it
- **Progressive Disclosure**: Advanced features hidden until needed
- **Feedback & Response**: Immediate visual feedback on all actions
- **Consistency**: Matches existing reading view aesthetics
- **Accessibility First**: Keyboard navigation, screen reader support

---

## CONCLUSION

This design creates a truly inline editing experience that feels seamless, intuitive, and powerful. By combining smart boundary detection, context preservation, and flexible markdown modes, users can make quick edits or deep revisions without ever leaving their reading flow.

The design balances simplicity (for quick fixes) with power (for advanced users), while maintaining the app's professional, minimal aesthetic. Every transition is smooth, every interaction is keyboard-accessible, and every edge case is handled gracefully.

**Key Success Metrics**:
- Time to edit: <2 seconds from selection to edit mode
- Error rate: <1% accidental data loss (with confirmations)
- User satisfaction: "Feels magical" (seamless transitions)
- Accessibility: WCAG AA compliant (keyboard + screen reader)

---

**Document End**

For implementation questions or design clarifications, refer to:
- `/Users/why/repos/trivium/layout-guide.md` (Updated design guide)
- `/Users/why/repos/trivium/src/lib/components/reading/` (Existing components)
