# Keyboard Shortcuts System

This directory contains the infrastructure for Trivium's keyboard shortcut system.

## Overview

The shortcut system provides:
- Centralized definition of all keyboard shortcuts
- Context-aware activation (scopes and conditions)
- Platform-specific handling (Mac Cmd vs Windows/Linux Ctrl)
- Future support for user customization

## Architecture

See `/HOTKEY_CUSTOMIZATION_DESIGN.md` for comprehensive architecture documentation.

## Current Status

**Phase 1: Preparation** ✅ (Types and Registry created)
- `types.ts` - TypeScript type definitions
- `registry.ts` - Central shortcut definitions

**Phase 2: Migration** (Planned)
- Gradually replace hardcoded shortcuts with registry-based system
- See `/HOTKEY_MIGRATION_PLAN.md` for detailed migration steps

**Phase 3: Customization** (Future)
- User preferences and settings UI
- Conflict detection
- Import/export functionality

## Files

### `types.ts`
Type definitions for the shortcut system. Defines:
- `ShortcutDefinition` - Registry entry
- `ResolvedShortcut` - After applying overrides and platform translation
- `ShortcutContext` - Runtime context for 'when' conditions
- And many more supporting types

### `registry.ts`
Central registry of all keyboard shortcuts. This is the single source of truth.

**Adding a new shortcut:**
```typescript
{
  id: 'reading.markAsRead',           // Unique ID
  key: 'm',                            // Key to press
  modifiers: ['Mod'],                  // Cmd (Mac) or Ctrl (Win/Linux)
  description: 'Mark selection as read', // Shown in help
  category: 'actions',                 // For organization
  scope: 'reading',                    // Where it's active
  when: 'hasSelection',                // Optional condition
}
```

## Adding Shortcuts

1. Add definition to `SHORTCUT_REGISTRY` in `registry.ts`
2. Use appropriate scope (`global`, `reading`, `review`, `ingest`, `create`)
3. Add `when` clause if context-dependent
4. Mark critical shortcuts as `defaultOnly: true` (e.g., Escape)

## Usage (Phase 2+)

**Using shortcuts in components:**
```typescript
import { useShortcut } from '@/hooks/useShortcut';

function MyComponent() {
  const handleSave = () => { /* ... */ };

  // Register shortcut handler
  useShortcut('reading.saveEdit', handleSave);

  return <div>...</div>;
}
```

**Setting context:**
```typescript
import { useShortcutContext } from '@/hooks/useShortcut';

function ReadingPage() {
  const [editing, setEditing] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);

  // Update context for 'when' conditions
  useShortcutContext('reading', {
    editing,
    hasSelection,
  });

  return <div>...</div>;
}
```

## Scopes

- `global` - Active everywhere
- `reading` - Reading page only
- `review` - Review session only
- `ingest` - Ingest page only
- `create` - Create cards page only
- `library` - Library page only
- `modal` - When modals are open

## Categories

- `navigation` - Moving between pages
- `actions` - Creating/modifying content
- `view` - UI visibility toggles
- `editing` - Text editing operations
- `review` - Flashcard review
- `search` - Search and find

## Platform Handling

Use `Mod` modifier for platform-agnostic shortcuts:
- Mac: `Mod` → `Cmd` (Meta key)
- Windows/Linux: `Mod` → `Ctrl`

Example:
```typescript
modifiers: ['Mod']  // Cmd+B on Mac, Ctrl+B on Windows
```

## Context Conditions (`when` clauses)

Shortcuts can be conditionally activated using simple boolean expressions:

```typescript
when: 'editing'                        // Active only when editing
when: '!editing'                       // Active when NOT editing
when: 'hasSelection && !editing'       // Has selection AND not editing
```

Available context variables vary by scope (see `types.ts` for details).

## Development

**Validate registry:**
```typescript
import { validateRegistry, logRegistryValidation } from './registry';

// In development mode:
logRegistryValidation(); // Logs any errors
```

**Common validation errors:**
- Duplicate shortcut IDs
- Duplicate key combos in same scope
- Missing descriptions or categories

## Migration Guide

See `/HOTKEY_MIGRATION_PLAN.md` for the complete migration plan from the current hardcoded system to this registry-based approach.

## Future Features (Phase 3)

- User customization via settings UI
- Conflict detection and resolution
- Import/export configurations
- Shortcut sequences (Vim-style)
- Command palette
- Preset profiles (Vim mode, Emacs mode, etc.)

## Related Documentation

- `/HOTKEY_CUSTOMIZATION_DESIGN.md` - Full architecture design
- `/HOTKEY_MIGRATION_PLAN.md` - Migration plan and timeline
- `/KEYBOARD_MANAGER_EVALUATION.md` - Analysis of existing KeyboardManager class
