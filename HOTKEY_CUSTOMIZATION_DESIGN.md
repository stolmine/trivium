# Keyboard Shortcut Customization System - Architecture Design

## Executive Summary

This document outlines the comprehensive architecture for implementing customizable keyboard shortcuts in Trivium. The design draws from industry best practices (VS Code, Obsidian) and web application patterns to create a flexible, user-friendly system that supports customization while maintaining sensible defaults.

**Key Goals:**
- Centralize all shortcut definitions (eliminate hardcoded shortcuts scattered across components)
- Support user customization via localStorage
- Enable context-aware shortcuts (different scopes for different views)
- Detect and prevent shortcut conflicts
- Provide platform-specific defaults (Mac vs Windows/Linux)
- Maintain backward compatibility during migration

---

## Current State Analysis

### Problems with Current Implementation

1. **Scattered Definitions**: Shortcuts are defined in multiple places:
   - Global shortcuts in `useGlobalShortcuts()` hook
   - Page-specific shortcuts in individual route components (review, ingest, read)
   - Component-specific shortcuts in inline `useEffect` hooks
   - Unused `KeyboardManager` class in `keyboard.ts`

2. **Hardcoded Values**: Direct key comparisons throughout codebase:
   ```typescript
   if (e.key === 'Escape') { /* ... */ }
   if ((e.ctrlKey || e.metaKey) && e.key === 'm') { /* ... */ }
   ```

3. **No Context Awareness**: Same shortcuts can conflict across different contexts
   - Example: `Escape` means different things in different modals/views
   - No formal scoping system

4. **Platform Handling**: Platform-specific logic scattered (Mac vs Windows)
   ```typescript
   const modifierKey = isMac ? event.metaKey : event.ctrlKey;
   ```

5. **No Conflict Detection**: No system to prevent duplicate bindings

6. **Two Competing Systems**: Both `KeyboardManager` class and `useKeyboardShortcuts` hook exist

### Current Shortcut Inventory

**Global Shortcuts** (from `useGlobalShortcuts`):
- `Ctrl/Cmd + B` - Toggle sidebar
- `Ctrl/Cmd + L` - Toggle clickable links
- `Ctrl/Cmd + 1` - Go to Dashboard
- `Ctrl/Cmd + 2` - Go to Library
- `Ctrl/Cmd + 3` - Go to Review
- `Ctrl/Cmd + 4` - Go to Create Cards
- `Ctrl/Cmd + N` - Open ingest view
- `Ctrl/Cmd + /` - Show keyboard shortcuts help

**Review Session** (`/review/session`):
- `Space` - Toggle answer
- `1` - Grade: Again
- `2` - Grade: Hard
- `3` - Grade: Good
- `4` - Grade: Easy

**Ingest Page** (`/ingest`):
- `Escape` - Cancel/close ingest
- `Shift + Enter` - Submit/import text
- `Ctrl/Cmd + Shift + E` - Exclude selection from progress
- `Ctrl/Cmd + Z` - Undo (in textarea)
- `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` - Redo (in textarea)

**Reading Page** (`/read/[id]`):
- `Ctrl/Cmd + Z` - Undo (when not editing)
- `Ctrl/Cmd + Shift + Z` - Redo (when not editing)
- `Ctrl/Cmd + E` - Activate inline edit
- `Ctrl/Cmd + S` - Save inline edit
- `Ctrl/Cmd + M` - Mark selection as read
- `Ctrl/Cmd + F` - Find in page
- `Escape` - Close search/cancel edit/cancel inline region edit (context-dependent)
- `Enter` - Submit rename/move to folder (in modals)

**Create Page** (`/create`):
- `?` - Show help
- `Escape` or `Enter` - Close help (when help is shown)

**Mark Display Component**:
- `ArrowLeft` or `Ctrl/Cmd + K` - Previous mark
- `ArrowRight` or `Ctrl/Cmd + J` - Next mark
- `Shift + B` - Toggle between marks

**Scope Selector**:
- `1` - Select scope option 1
- `2` - Select scope option 2

---

## Industry Best Practices Research

### VS Code Approach

**Architecture:**
- `keybindings.json` file in user settings directory
- Default keybindings + user overrides that merge at runtime
- File is watched and hot-reloaded on changes

**Key Structure:**
```json
{
  "key": "ctrl+shift+p",
  "command": "workbench.action.showCommands",
  "when": "editorTextFocus"
}
```

**Features:**
- `when` clause: Boolean expression for context-aware activation
- Removal rules: Prefix command with `-` to unbind
- Platform-specific keys: Separate definitions for Mac/Windows/Linux
- Visual editor + JSON editing
- Conflict detection in settings UI

**Key Insights:**
- Centralized command palette approach
- Every action has a unique command ID
- Context expressions enable sophisticated scoping
- User overrides append to defaults (last wins)

### Obsidian Approach

**Architecture:**
- `hotkeys.json` in `.obsidian` config folder
- Settings UI for customization (no manual JSON editing required)
- Built-in search to find commands

**Key Structure:**
```json
{
  "command-id": [
    {
      "modifiers": ["Mod", "Shift"],
      "key": "P"
    }
  ]
}
```

**Features:**
- `Mod` key auto-translates to Cmd (Mac) or Ctrl (Windows/Linux)
- Multiple shortcuts per command supported
- Plugin commands automatically appear in hotkey settings
- Real-time conflict detection

**Key Insights:**
- User-friendly settings UI is critical
- `Mod` abstraction simplifies platform handling
- Extensible for plugins

### Web Application Best Practices

**TRACK Framework:**
- **T**arget: Every frequent action should have a shortcut
- **R**espect: Don't override browser/OS shortcuts
- **A**void: Avoid conflicts with native shortcuts (Ctrl+N, Ctrl+S, Ctrl+W)
- **C**onsistency: Use same modifiers for similar action types
- **K**eep visible: Show shortcuts in UI (tooltips, help dialog)

**Discoverability Patterns:**
- `?` key for help dialog (universal convention: Gmail, Twitter, Facebook, Feedly)
- `j/k` for next/previous (newsreader convention)
- Tooltips showing shortcuts
- Contextual help based on current view

**Learning Curve Research:**
- Average 12 practice runs for shortcuts to stick
- "Go To" sequences (G + letter) learn 57% faster (5.2 runs)
- Single modifier shortcuts learn in ~5 runs

**Scope Levels:**
1. Operating system level
2. Browser level
3. Application level
4. Context-specific (modal, editor, viewer)

**Conflict Avoidance:**
- Use combinations like `Shift+S` rather than `Ctrl+S`
- Stick with single modifier key when possible
- Group related actions with same modifier pattern

---

## Proposed Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Components using shortcuts via useShortcut() hook           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Shortcut Event Dispatcher                       │
│  - Listens to keydown events                                │
│  - Matches events to shortcut definitions                   │
│  - Respects context scopes and priorities                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│               Shortcut Resolver                              │
│  - Merges defaults + user overrides                         │
│  - Resolves conflicts (user > defaults)                     │
│  - Handles platform-specific translations (Mod key)         │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
┌───────▼────────┐  ┌────────▼──────────┐
│ Default        │  │ User Preferences  │
│ Registry       │  │ Store             │
│ (code)         │  │ (localStorage)    │
└────────────────┘  └───────────────────┘
```

### Core Components

#### 1. Shortcut Registry (Central Definition)

**Location:** `/src/lib/shortcuts/registry.ts`

**Purpose:** Single source of truth for all available shortcuts

**Structure:**
```typescript
interface ShortcutDefinition {
  id: string;                    // Unique identifier: 'global.toggleSidebar'
  key: string;                   // Key name: 'b', 'Escape', 'ArrowLeft'
  modifiers?: Modifier[];        // ['Mod', 'Shift'] where Mod = Cmd(Mac)|Ctrl(Win)
  description: string;           // Human-readable description
  category: ShortcutCategory;    // For organization in settings UI
  scope: ShortcutScope;          // Where this shortcut is active
  when?: string;                 // Optional condition (like VS Code)
  defaultOnly?: boolean;         // If true, user cannot customize
  platforms?: Platform[];        // ['mac', 'windows', 'linux'] - if omitted, all
}

type Modifier = 'Mod' | 'Ctrl' | 'Alt' | 'Shift' | 'Meta';

type ShortcutCategory =
  | 'navigation'    // Moving between pages/sections
  | 'actions'       // Creating/modifying content
  | 'view'          // UI visibility toggles
  | 'editing'       // Text editing operations
  | 'review'        // Flashcard review
  | 'search';       // Search and find

type ShortcutScope =
  | 'global'        // Active everywhere
  | 'reading'       // /read/[id] page
  | 'review'        // /review/session page
  | 'ingest'        // /ingest page
  | 'create'        // /create page
  | 'library'       // /library page
  | 'modal';        // Active when any modal is open

type Platform = 'mac' | 'windows' | 'linux';
```

**Example Definitions:**
```typescript
export const SHORTCUT_REGISTRY: ShortcutDefinition[] = [
  // Global shortcuts
  {
    id: 'global.toggleSidebar',
    key: 'b',
    modifiers: ['Mod'],
    description: 'Toggle sidebar',
    category: 'view',
    scope: 'global',
  },
  {
    id: 'global.showHelp',
    key: '/',
    modifiers: ['Mod'],
    description: 'Show keyboard shortcuts',
    category: 'view',
    scope: 'global',
  },
  {
    id: 'global.goToDashboard',
    key: '1',
    modifiers: ['Mod'],
    description: 'Go to Dashboard',
    category: 'navigation',
    scope: 'global',
  },

  // Review shortcuts
  {
    id: 'review.toggleAnswer',
    key: ' ',
    description: 'Toggle answer',
    category: 'review',
    scope: 'review',
  },
  {
    id: 'review.gradeAgain',
    key: '1',
    description: 'Grade card: Again',
    category: 'review',
    scope: 'review',
    when: 'answerVisible',  // Only active when answer is shown
  },

  // Reading shortcuts
  {
    id: 'reading.undo',
    key: 'z',
    modifiers: ['Mod'],
    description: 'Undo last change',
    category: 'editing',
    scope: 'reading',
    when: '!editing', // Only when not in edit mode
  },
  {
    id: 'reading.markAsRead',
    key: 'm',
    modifiers: ['Mod'],
    description: 'Mark selection as read',
    category: 'actions',
    scope: 'reading',
    when: 'hasSelection && !editing',
  },

  // Ingest shortcuts
  {
    id: 'ingest.submit',
    key: 'Enter',
    modifiers: ['Shift'],
    description: 'Submit/import text',
    category: 'actions',
    scope: 'ingest',
  },
  {
    id: 'ingest.excludeSelection',
    key: 'E',
    modifiers: ['Mod', 'Shift'],
    description: 'Exclude selection from progress',
    category: 'editing',
    scope: 'ingest',
  },

  // Universal modal shortcuts
  {
    id: 'modal.close',
    key: 'Escape',
    description: 'Close modal or cancel',
    category: 'actions',
    scope: 'modal',
    defaultOnly: true, // Cannot be customized
  },
];
```

#### 2. User Preferences Store

**Location:** `/src/lib/shortcuts/preferences.ts`

**Purpose:** Store and manage user customizations

**Storage:** `localStorage` with key `trivium_shortcut_preferences`

**Structure:**
```typescript
interface ShortcutPreferences {
  version: number;  // For migration compatibility
  overrides: Record<string, ShortcutOverride>;
  disabled: string[];  // IDs of shortcuts user has disabled
}

interface ShortcutOverride {
  id: string;
  key: string;
  modifiers?: Modifier[];
  // Override only key/modifiers; description, scope, etc. come from registry
}

// Example localStorage data:
{
  "version": 1,
  "overrides": {
    "global.toggleSidebar": {
      "id": "global.toggleSidebar",
      "key": "[",
      "modifiers": ["Mod"]
    },
    "reading.markAsRead": {
      "id": "reading.markAsRead",
      "key": "d",
      "modifiers": ["Mod"]
    }
  },
  "disabled": ["global.goToDashboard"]
}
```

**API:**
```typescript
class ShortcutPreferences {
  private preferences: ShortcutPreferences;

  load(): void;
  save(): void;

  setOverride(id: string, key: string, modifiers?: Modifier[]): void;
  removeOverride(id: string): void;

  disableShortcut(id: string): void;
  enableShortcut(id: string): void;

  resetToDefaults(): void;
  resetShortcut(id: string): void;

  export(): string;  // JSON string for backup
  import(data: string): void;
}
```

#### 3. Shortcut Resolver

**Location:** `/src/lib/shortcuts/resolver.ts`

**Purpose:** Merge defaults + user overrides and resolve conflicts

**API:**
```typescript
class ShortcutResolver {
  constructor(
    private registry: ShortcutDefinition[],
    private preferences: ShortcutPreferences
  ) {}

  // Get the active shortcut configuration (defaults + overrides)
  resolve(): ResolvedShortcut[];

  // Get shortcuts for a specific scope
  getForScope(scope: ShortcutScope): ResolvedShortcut[];

  // Find what command is bound to a key combination
  findByKeyCombo(
    key: string,
    modifiers: Modifier[],
    scope: ShortcutScope
  ): ResolvedShortcut | null;

  // Platform-specific key translation
  translateModifiers(modifiers: Modifier[]): Modifier[];
}

interface ResolvedShortcut extends ShortcutDefinition {
  isOverridden: boolean;  // True if user customized this
  isDisabled: boolean;    // True if user disabled this
  effectiveKey: string;   // After platform translation
  effectiveModifiers: Modifier[];
}
```

**Resolution Logic:**
1. Start with default registry
2. Apply platform translations (Mod → Cmd/Ctrl)
3. Apply user overrides
4. Mark disabled shortcuts
5. Return resolved list

#### 4. Conflict Detector

**Location:** `/src/lib/shortcuts/conflicts.ts`

**Purpose:** Validate new bindings and detect conflicts

**API:**
```typescript
interface ShortcutConflict {
  newShortcut: ShortcutDefinition;
  conflictingWith: ResolvedShortcut[];
  severity: 'error' | 'warning';
  message: string;
}

class ConflictDetector {
  constructor(private resolver: ShortcutResolver) {}

  // Check if a binding would conflict
  checkConflict(
    id: string,
    key: string,
    modifiers: Modifier[]
  ): ShortcutConflict | null;

  // Get all existing conflicts in current config
  getAllConflicts(): ShortcutConflict[];

  // Check against browser/OS reserved shortcuts
  isReservedShortcut(key: string, modifiers: Modifier[]): boolean;
}
```

**Conflict Detection Rules:**

1. **Same Scope Conflicts** (Error):
   - Two shortcuts in same scope with identical key combo
   - Example: Both `reading.undo` and `reading.find` bound to `Cmd+Z`

2. **Global vs Scoped Conflicts** (Warning):
   - Global shortcut conflicts with scope-specific one
   - Scope-specific takes precedence (user should know this)

3. **Reserved Shortcuts** (Error):
   - Browser shortcuts: `Cmd/Ctrl + N/O/P/W/T/Q`
   - OS shortcuts: System-level combos
   - Cannot be overridden

4. **Conditional Conflicts** (OK):
   - Same key in same scope but different `when` conditions
   - Example: `Escape` for different modals (evaluated at runtime)

#### 5. Shortcut Event Dispatcher

**Location:** `/src/lib/shortcuts/dispatcher.ts`

**Purpose:** Listen to keyboard events and dispatch to handlers

**API:**
```typescript
type ShortcutHandler = (event: KeyboardEvent) => void;

interface ShortcutContext {
  scope: ShortcutScope;
  conditions: Record<string, boolean>;  // For 'when' clause evaluation
}

class ShortcutDispatcher {
  private resolver: ShortcutResolver;
  private handlers: Map<string, ShortcutHandler>;
  private context: ShortcutContext;

  constructor(resolver: ShortcutResolver) {}

  // Register a handler for a shortcut ID
  register(id: string, handler: ShortcutHandler): void;
  unregister(id: string): void;

  // Update the current context (scope + conditions)
  setContext(context: ShortcutContext): void;

  // Start/stop listening
  start(): void;
  stop(): void;

  // Internal: handle keyboard event
  private handleKeyDown(event: KeyboardEvent): void;

  // Internal: check if shortcut should trigger
  private shouldTrigger(
    shortcut: ResolvedShortcut,
    event: KeyboardEvent
  ): boolean;

  // Internal: evaluate 'when' condition
  private evaluateCondition(when: string): boolean;
}
```

**Event Handling Flow:**
1. Listen to `keydown` event
2. Ignore if target is input/textarea (unless scope allows)
3. Extract key + modifiers from event
4. Find matching shortcut in current scope
5. Evaluate `when` condition if present
6. Call registered handler
7. Prevent default if handler executed

#### 6. React Hook Interface

**Location:** `/src/hooks/useShortcut.ts`

**Purpose:** Easy React integration for components

**API:**
```typescript
// Register a single shortcut handler
function useShortcut(
  id: string,
  handler: () => void,
  dependencies?: any[]
): void;

// Register multiple shortcut handlers
function useShortcuts(
  shortcuts: Record<string, () => void>,
  dependencies?: any[]
): void;

// Get all shortcuts for display (help dialog)
function useShortcutList(scope?: ShortcutScope): ResolvedShortcut[];

// Update context conditions
function useShortcutContext(
  scope: ShortcutScope,
  conditions: Record<string, boolean>
): void;
```

**Usage Examples:**
```typescript
// Simple single shortcut
function ReviewCard() {
  const { toggleAnswer } = useReviewStore();

  useShortcut('review.toggleAnswer', toggleAnswer);

  return <div>...</div>;
}

// Multiple shortcuts
function ReadingPage() {
  const { undo, redo, markRead } = useReadingStore();

  useShortcuts({
    'reading.undo': undo,
    'reading.redo': redo,
    'reading.markAsRead': markRead,
  });

  return <div>...</div>;
}

// Context-aware
function ReadingPage() {
  const [editing, setEditing] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);

  useShortcutContext('reading', {
    editing,
    hasSelection,
  });

  return <div>...</div>;
}

// Help dialog
function ShortcutHelp() {
  const shortcuts = useShortcutList(); // All shortcuts
  const globalShortcuts = useShortcutList('global'); // Just global

  return <div>{/* Render shortcuts */}</div>;
}
```

---

## Context System (When Clauses)

### Purpose

Enable sophisticated conditional activation of shortcuts based on application state.

### Syntax

Simple boolean expressions (subset of JavaScript):
- Variables: `editing`, `hasSelection`, `answerVisible`
- Operators: `!` (not), `&&` (and), `||` (or)
- Parentheses: `(` `)`

**Examples:**
```typescript
when: 'editing'                           // Active only when editing
when: '!editing'                          // Active when NOT editing
when: 'hasSelection && !editing'          // Has selection and not editing
when: 'answerVisible || reviewComplete'   // Answer shown OR review done
```

### Context Variables by Scope

**Global:**
- `sidebarOpen: boolean`
- `modalOpen: boolean`
- `inputFocused: boolean`

**Reading:**
- `editing: boolean`
- `hasSelection: boolean`
- `searchOpen: boolean`
- `inlineEditActive: boolean`

**Review:**
- `answerVisible: boolean`
- `cardGraded: boolean`
- `sessionComplete: boolean`

**Ingest:**
- `titleValid: boolean`
- `contentValid: boolean`
- `fetching: boolean`

**Create:**
- `hasMarks: boolean`
- `previewMode: boolean`

### Implementation

**Parser:**
```typescript
class ConditionParser {
  parse(expression: string): ConditionNode;
  evaluate(node: ConditionNode, context: Record<string, boolean>): boolean;
}

type ConditionNode =
  | { type: 'variable'; name: string }
  | { type: 'not'; operand: ConditionNode }
  | { type: 'and'; left: ConditionNode; right: ConditionNode }
  | { type: 'or'; left: ConditionNode; right: ConditionNode };
```

---

## Platform-Specific Handling

### The `Mod` Key

**Problem:** Mac uses `Cmd` for shortcuts, Windows/Linux use `Ctrl`

**Solution:** Abstract `Mod` modifier that translates at runtime:
- Mac: `Mod` → `Meta` (Cmd key)
- Windows/Linux: `Mod` → `Ctrl`

**Example:**
```typescript
// Definition uses 'Mod'
{ key: 'b', modifiers: ['Mod'] }

// Resolves to:
// Mac: Cmd+B (Meta)
// Windows: Ctrl+B (Ctrl)
```

### Platform-Specific Shortcuts

Some shortcuts only make sense on certain platforms:

```typescript
{
  id: 'global.preferences',
  key: ',',
  modifiers: ['Mod'],
  description: 'Open preferences',
  category: 'navigation',
  scope: 'global',
  platforms: ['mac'],  // Mac only (Cmd+,)
}
```

### Key Name Normalization

Different browsers report key names differently. Normalize:
- `' '` → `Space`
- Arrow keys: Ensure consistent casing
- Handle `NumLock` state for numeric keypad

---

## Settings UI (Future Phase)

### Requirements

1. **Search/Filter**: Find shortcuts by name or key combination
2. **Category Grouping**: Organize by category and scope
3. **Visual Editor**: Click to record new key combination
4. **Conflict Warnings**: Real-time feedback on conflicts
5. **Reset Options**: Per-shortcut and global reset
6. **Import/Export**: Backup and share configurations
7. **Platform Indicator**: Show which platform a shortcut applies to

### Mockup Structure

```
┌─────────────────────────────────────────────────────────┐
│  Keyboard Shortcuts Settings                      [×]   │
├─────────────────────────────────────────────────────────┤
│  Search: [________________]    [Reset All] [Import]    │
│                                            [Export]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ▼ Navigation                                           │
│    Toggle sidebar           [Cmd + B]         [Reset]  │
│    Go to Dashboard          [Cmd + 1]         [Reset]  │
│    Go to Library            [Cmd + 2]         [Reset]  │
│                                                         │
│  ▼ View                                                 │
│    Show help                [Cmd + /]         [Reset]  │
│    Toggle links             [Cmd + L]         [Reset]  │
│                                                         │
│  ▼ Review                                               │
│    Toggle answer            [Space]           [Reset]  │
│    Grade: Again             [1]               [Reset]  │
│    Grade: Good              [3]               [Reset]  │
│                                                         │
│  ⚠ Conflicts Detected (1)                              │
│    'Cmd+F' is bound to both:                           │
│      - Find in page                                    │
│      - Toggle fullscreen (browser default)             │
│    [Resolve]                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Migration Strategy

See `HOTKEY_MIGRATION_PLAN.md` for detailed migration steps.

**Summary:**
1. **Phase 1** (Preparation): Build infrastructure without breaking existing code
2. **Phase 2** (Migration): Gradually replace hardcoded shortcuts with registry
3. **Phase 3** (Customization): Add user preferences and settings UI

---

## Performance Considerations

### Optimization Strategies

1. **Event Listener Efficiency**:
   - Single global listener (not per-component)
   - Early exit for irrelevant events (input focus, etc.)
   - Debounce or throttle if needed

2. **Registry Lookup**:
   - Index by scope for O(1) scope filtering
   - Index by key combo for fast matching
   - Pre-compute resolved shortcuts (cache)

3. **LocalStorage**:
   - Load preferences once at app start
   - Save asynchronously (don't block UI)
   - Validate before saving

4. **Context Updates**:
   - Only re-evaluate when context actually changes
   - Memoize condition evaluation results

---

## Security Considerations

1. **XSS Protection**: Validate user input for shortcuts (prevent script injection)
2. **Reserved Keys**: Block shortcuts that could break browser/OS functionality
3. **LocalStorage Validation**: Validate imported configurations before applying

---

## Accessibility

1. **Screen Readers**: Announce shortcuts when they trigger
2. **Visual Feedback**: Show which shortcut was triggered (brief notification)
3. **Alternative Input**: All actions must also be accessible via mouse/touch
4. **Customization**: Allow users to disable conflicting shortcuts for assistive tech

---

## Testing Strategy

### Unit Tests

- Conflict detection logic
- Condition parser
- Modifier translation (Mod key)
- Shortcut matching algorithm

### Integration Tests

- Preference save/load
- Override merging
- Import/export functionality

### E2E Tests

- Keyboard events trigger correct actions
- Shortcuts respect scopes
- When conditions work correctly
- User customizations persist

---

## Future Enhancements

### Version 1.1+

1. **Shortcut Sequences**: Vim-style multi-key sequences (e.g., `g g` to go to top)
2. **Shortcut Hints**: Visual overlay showing available shortcuts in current context
3. **Command Palette**: VS Code-style command palette (Cmd+Shift+P)
4. **Shortcut Recording**: Record macros (sequences of actions)
5. **Cloud Sync**: Sync preferences across devices
6. **Preset Profiles**: Vim mode, Emacs mode, VS Code mode, etc.

---

## Appendix: Type Definitions

See `/src/lib/shortcuts/types.ts` for complete TypeScript interfaces.

---

## References

- [VS Code Keybindings Documentation](https://code.visualstudio.com/docs/configure/keybindings)
- [Obsidian Hotkeys Documentation](https://help.obsidian.md/Customization/Custom+hotkeys)
- [Web Keyboard Shortcuts Best Practices](https://sashika.medium.com/j-k-or-how-to-choose-keyboard-shortcuts-for-web-applications-a7c3b7b408ee)
- [Microsoft PowerToys Conflict Detection](https://github.com/microsoft/PowerToys/pull/41029)
