# Inline Region Editor - Usage Guide

This guide shows how to integrate and use the new inline editing components.

## Components Created

1. **InlineRegionEditor.tsx** - Main component with three-region layout
2. **InlineToolbar.tsx** - Bottom-attached toolbar
3. **inlineEdit.ts** - Animation configurations
4. **SelectionToolbar.tsx** - Updated with inline edit integration point

## Basic Usage

### 1. Import the Component

```typescript
import { InlineRegionEditor } from '@/lib/components/reading/InlineRegionEditor';
```

### 2. Set Up State

```typescript
const [isInlineEditing, setIsInlineEditing] = useState(false);
const [editRegion, setEditRegion] = useState<{ start: number; end: number } | null>(null);
```

### 3. Activate Inline Editing

```typescript
const handleActivateInlineEdit = (selection: { start: number; end: number }) => {
  setEditRegion(selection);
  setIsInlineEditing(true);
};
```

### 4. Render the Component

```typescript
{isInlineEditing && editRegion && (
  <InlineRegionEditor
    content={fullTextContent}
    editRegion={editRegion}
    marks={clozeNotes}
    onSave={async (newContent) => {
      await saveTextContent(newContent);
      setIsInlineEditing(false);
      setEditRegion(null);
    }}
    onCancel={() => {
      setIsInlineEditing(false);
      setEditRegion(null);
    }}
    initialMode="styled"
  />
)}
```

## Integration with SelectionToolbar

### Update SelectionToolbar Props

```typescript
<SelectionToolbar
  selection={selection}
  onEdit={handleModalEdit}           // Existing modal edit
  onEditInline={handleActivateInlineEdit}  // NEW: Inline edit
  onMarkAsRead={handleMarkAsRead}
  position={toolbarPosition}
/>
```

The toolbar will automatically use inline editing if `onEditInline` is provided, otherwise it falls back to the modal editor.

## Component Lifecycle Example

```typescript
function ReadingView() {
  const [fullText, setFullText] = useState("...");
  const [marks, setMarks] = useState<ClozeNote[]>([]);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [isInlineEditing, setIsInlineEditing] = useState(false);

  const handleTextSelection = (start: number, end: number) => {
    setSelection({ start, end });
  };

  const handleActivateInlineEdit = () => {
    if (selection) {
      setIsInlineEditing(true);
    }
  };

  const handleSaveEdit = async (newContent: string) => {
    // Save to database
    await updateTextContent(newContent);

    // Update local state
    setFullText(newContent);

    // Exit edit mode
    setIsInlineEditing(false);
    setSelection(null);
  };

  const handleCancelEdit = () => {
    setIsInlineEditing(false);
    // Keep selection for potential retry
  };

  return (
    <div>
      {!isInlineEditing ? (
        <>
          <TextContent onSelection={handleTextSelection}>
            {fullText}
          </TextContent>

          <SelectionToolbar
            selection={selection}
            onEditInline={handleActivateInlineEdit}
            position={getSelectionPosition()}
          />
        </>
      ) : (
        <InlineRegionEditor
          content={fullText}
          editRegion={selection!}
          marks={marks}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
}
```

## Props Reference

### InlineRegionEditor

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `content` | `string` | Yes | Full text content of the document |
| `editRegion` | `{ start: number; end: number }` | Yes | Character positions defining what to edit |
| `marks` | `ClozeNote[]` | No | Array of marks (for position updates) |
| `onSave` | `(newContent: string) => Promise<void>` | Yes | Async callback when user saves |
| `onCancel` | `() => void` | Yes | Callback when user cancels |
| `initialMode` | `'styled' \| 'literal'` | No | Default: `'styled'` |

### InlineToolbar

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `mode` | `'styled' \| 'literal'` | Yes | Current markdown rendering mode |
| `characterCount` | `number` | Yes | Number of characters in edited content |
| `hasChanges` | `boolean` | Yes | Whether content has been modified |
| `isSaving` | `boolean` | Yes | Whether save operation is in progress |
| `onModeToggle` | `() => void` | Yes | Callback to toggle markdown mode |
| `onCancel` | `() => void` | Yes | Callback to cancel editing |
| `onSave` | `() => void` | Yes | Callback to save changes |

## Features Implemented

### ✅ Three-Region Layout
- Context before (dimmed at 40% opacity)
- Editable region (bright with 2px border)
- Context after (dimmed at 40% opacity)

### ✅ Dimming Effect
- `opacity-40` on context regions
- `blur-[0.5px]` for subtle defocus
- `select-none pointer-events-none` to prevent interaction

### ✅ Editable Region Styling
- Light mode: white background, dark border
- Dark mode: zinc-900 background, light border
- Rounded corners with padding
- Focus ring on interaction

### ✅ Auto-Focus
- Automatically focuses contenteditable on mount
- Cursor placed at end of text

### ✅ Keyboard Shortcuts
- `Cmd/Ctrl + S`: Save changes
- `Esc`: Cancel (with confirmation if changed)
- `M`: Toggle between styled/literal mode (when not typing)

### ✅ Visual Feedback
- Character counter updates live
- Save button disabled when no changes
- Loading spinner during save operation
- Smooth 200-300ms transitions

### ✅ Accessibility
- Proper ARIA labels on editable region
- Keyboard navigation support
- Clear visual focus indicators
- Screen-reader friendly button labels

## Keyboard Shortcuts

| Key | Action | Notes |
|-----|--------|-------|
| `E` | Activate inline edit | When text is selected |
| `M` | Toggle markdown mode | Outside contenteditable only |
| `Cmd/Ctrl + S` | Save changes | Works globally in edit mode |
| `Esc` | Cancel edit | Confirms if changes exist |
| `Tab` | Navigate toolbar | From contenteditable |

## Visual States

### Normal Reading
```
Regular text content with selection toolbar on highlight
```

### Active Editing
```
░░ Dimmed context before ░░

┌────────────────────────────┐
│ Bright editable region     │
│ User can type here         │
└────────────────────────────┘
[M] Styled │ 158 chars │ [Esc] Cancel │ [⌘S] Save

░░ Dimmed context after ░░
```

## Styling Classes

### Animation Classes (from inlineEdit.ts)
```typescript
import { inlineEditClasses } from '@/lib/animations/inlineEdit';

// Apply to elements:
className={inlineEditClasses.editRegion}    // Edit region entry
className={inlineEditClasses.contextDim}    // Context dimming
className={inlineEditClasses.toolbar}       // Toolbar slide-up
```

### Direct Tailwind Usage
```typescript
// Context dimming
className="opacity-40 blur-[0.5px] select-none pointer-events-none"

// Editable region
className="bg-white dark:bg-zinc-900 border-2 border-gray-800 dark:border-gray-200"

// Toolbar
className="backdrop-blur-sm bg-background/80 border-t border-border"
```

## Future Enhancements

The component is designed to support:
- [ ] Styled mode rendering (links, cloze marks, headers)
- [ ] Literal mode with raw markdown
- [ ] Cursor position preservation on mode toggle
- [ ] Mark position updates using `updateMarkPositions` from utils
- [ ] Save success animations (green border flash)
- [ ] Error recovery UI

These features are ready to be integrated when the supporting utilities are completed by parallel agents.

## Notes for Integration

1. **Position Markers**: The component accepts `marks` prop but doesn't use it yet - this will be integrated with the `positionMarkers.ts` utilities when available.

2. **Mode Toggle**: Currently toggles state but doesn't transform content - waiting for `markdownParser.ts` to be completed.

3. **Mark Updates**: The `updateMarkPositions` utility from `@/lib/utils/markPositions` is available and can be called in the `onSave` handler to update mark positions after edits.

4. **Boundary Detection**: The parent component should handle expanding selection to sentence/paragraph boundaries before passing `editRegion` to this component.

## Example with Mark Position Updates

```typescript
const handleSaveWithMarkUpdates = async (newContent: string) => {
  const editRegionData = {
    start: editRegion.start,
    end: editRegion.end,
    originalText: content.substring(editRegion.start, editRegion.end)
  };

  // Update mark positions
  const { marks: updatedMarks } = updateMarkPositions(
    currentMarks,
    editRegionData,
    newContent.substring(editRegion.start, newContent.length)
  );

  // Save everything
  await saveTextAndMarks(newContent, updatedMarks);

  setMarks(updatedMarks);
  setIsInlineEditing(false);
};
```
