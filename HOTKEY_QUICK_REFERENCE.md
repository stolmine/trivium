# Keyboard Shortcuts - Quick Reference Card

**For Developers:** Quick guide to understanding and working with the shortcut system.

---

## Current Status

**✅ Phase 1 Preparation:** Types and registry created
**⏳ Phase 2 Migration:** Not started (implementation needed)
**⏳ Phase 3 Customization:** Future work

---

## File Structure

```
/src/lib/shortcuts/
  ├── types.ts          ✅ Type definitions
  ├── registry.ts       ✅ All shortcut definitions
  ├── README.md         ✅ Developer guide
  ├── platform.ts       ⏳ Platform detection (to be created)
  ├── matcher.ts        ⏳ Event matching (to be created)
  └── resolver.ts       ⏳ Resolver logic (to be created)

/src/hooks/
  └── useShortcut.ts    ⏳ React hook (to be created)

/HOTKEY_CUSTOMIZATION_DESIGN.md     ✅ Full architecture
/HOTKEY_MIGRATION_PLAN.md           ✅ Migration steps
/KEYBOARD_MANAGER_EVALUATION.md     ✅ Existing class analysis
/HOTKEY_RESEARCH_SUMMARY.md         ✅ Executive summary
```

---

## All Current Shortcuts

### Global (Active Everywhere)
- `Cmd/Ctrl + B` - Toggle sidebar
- `Cmd/Ctrl + L` - Toggle clickable links
- `Cmd/Ctrl + 1` - Go to Dashboard
- `Cmd/Ctrl + 2` - Go to Review
- `Cmd/Ctrl + 3` - Go to Create Cards
- `Cmd/Ctrl + 4` - Go to Library
- `Cmd/Ctrl + N` - Open ingest
- `Cmd/Ctrl + /` - Show help

### Review Session
- `Space` - Toggle answer
- `1` - Grade: Again
- `2` - Grade: Hard
- `3` - Grade: Good
- `4` - Grade: Easy

### Ingest Page
- `Escape` - Cancel/close
- `Shift + Enter` - Submit/import
- `Cmd/Ctrl + Shift + E` - Exclude selection
- `Cmd/Ctrl + Z` - Undo (in textarea)
- `Cmd/Ctrl + Shift + Z` - Redo (in textarea)
- `Cmd/Ctrl + Y` - Redo (alternative)

### Reading Page
- `Cmd/Ctrl + Z` - Undo (when not editing)
- `Cmd/Ctrl + Shift + Z` - Redo (when not editing)
- `Cmd/Ctrl + E` - Activate inline edit
- `Cmd/Ctrl + S` - Save inline edit
- `Cmd/Ctrl + M` - Mark selection as read
- `Cmd/Ctrl + F` - Find in page
- `Escape` - Close search / cancel edit (context-dependent)

### Create Page
- `?` - Show help
- `Escape` / `Enter` - Close help (when open)
- `ArrowLeft` / `Cmd/Ctrl + K` - Previous mark
- `ArrowRight` / `Cmd/Ctrl + J` - Next mark
- `Shift + B` - Toggle between marks
- `1` - Select scope option 1
- `2` - Select scope option 2

---

## Adding a New Shortcut

**1. Add to registry** (`/src/lib/shortcuts/registry.ts`):

```typescript
{
  id: 'reading.myAction',           // Unique ID: scope.action
  key: 'k',                          // Key to press
  modifiers: ['Mod'],                // Cmd (Mac) or Ctrl (Win)
  description: 'Do something cool',  // Shown in help
  category: 'actions',               // navigation|actions|view|editing|review|search
  scope: 'reading',                  // global|reading|review|ingest|create|library|modal
  when: 'hasSelection',              // Optional condition
  defaultOnly: false,                // Can user customize? (usually false)
}
```

**2. Use in component** (after Phase 2 complete):

```typescript
import { useShortcut } from '@/hooks/useShortcut';

function MyComponent() {
  const handleAction = () => { /* ... */ };

  useShortcut('reading.myAction', handleAction);

  return <div>...</div>;
}
```

---

## Scopes

| Scope | When Active |
|-------|-------------|
| `global` | Everywhere in the app |
| `reading` | `/read/[id]` page only |
| `review` | `/review/session` page only |
| `ingest` | `/ingest` page only |
| `create` | `/create` page only |
| `library` | `/library` page only |
| `modal` | When any modal is open |

---

## Categories

| Category | Purpose |
|----------|---------|
| `navigation` | Moving between pages/sections |
| `actions` | Creating/modifying content |
| `view` | UI visibility toggles |
| `editing` | Text editing operations |
| `review` | Flashcard review actions |
| `search` | Search and find operations |

---

## Platform Handling

**Use `Mod` for cross-platform shortcuts:**

```typescript
modifiers: ['Mod']  // Cmd on Mac, Ctrl on Windows/Linux
```

**Use specific modifiers when needed:**

```typescript
modifiers: ['Ctrl']   // Always Ctrl (even on Mac)
modifiers: ['Meta']   // Always Cmd (Mac only)
modifiers: ['Alt']    // Alt/Option
modifiers: ['Shift']  // Shift
```

---

## Context Conditions (`when`)

**Syntax:** Simple boolean expressions

```typescript
when: 'editing'                        // Single condition
when: '!editing'                       // NOT
when: 'hasSelection && !editing'       // AND
when: 'answerVisible || sessionComplete' // OR
```

**Available variables by scope:**

**Global:**
- `sidebarOpen`, `modalOpen`, `inputFocused`

**Reading:**
- `editing`, `hasSelection`, `searchOpen`, `inlineEditActive`, `editRegion`, `inlineEditRegion`

**Review:**
- `answerVisible`, `cardGraded`, `sessionComplete`

**Ingest:**
- `titleValid`, `contentValid`, `fetching`, `contentFocused`

**Create:**
- `hasMarks`, `previewMode`, `helpOpen`, `scopeSelectorOpen`

---

## Reserved Shortcuts (Don't Use)

**Browser shortcuts to avoid:**
- `Cmd/Ctrl + N` - New window
- `Cmd/Ctrl + T` - New tab
- `Cmd/Ctrl + W` - Close tab
- `Cmd/Ctrl + R` - Reload
- `Cmd/Ctrl + Q` - Quit
- `Cmd/Ctrl + P` - Print (unless overriding intentionally)
- `Cmd/Ctrl + S` - Save (use with caution)

**Tip:** Use `Shift` modifier to avoid conflicts:
- ✅ `Shift + S` instead of `Ctrl + S`
- ✅ `Cmd/Ctrl + Shift + P` instead of `Cmd/Ctrl + P`

---

## Common Patterns

**Help dialog:**
```typescript
key: '?'  // Universal convention (Gmail, Twitter, etc.)
```

**Navigation (j/k pattern):**
```typescript
key: 'j'  // Next item
key: 'k'  // Previous item
```

**Close/Cancel:**
```typescript
key: 'Escape'       // Universal close
defaultOnly: true   // Don't let users customize Escape
```

**Submit/Confirm:**
```typescript
key: 'Enter'
modifiers: ['Shift']  // Shift+Enter for submit
```

---

## Testing Your Shortcuts

**After Phase 2 is complete:**

```typescript
// 1. Add to registry
// 2. Use hook in component
// 3. Test on:
//    - Mac (Cmd key)
//    - Windows (Ctrl key)
//    - Both Chrome and Firefox
// 4. Verify:
//    - Shortcut works in correct scope
//    - Doesn't trigger in wrong scope
//    - Respects 'when' conditions
//    - Shows up in help dialog
```

---

## Validation

**Check registry for errors:**

```typescript
import { validateRegistry, logRegistryValidation } from '@/lib/shortcuts/registry';

// In development:
logRegistryValidation();

// Or check programmatically:
const errors = validateRegistry();
if (errors.length > 0) {
  console.error('Registry errors:', errors);
}
```

**Common errors:**
- Duplicate shortcut IDs
- Duplicate key combos in same scope
- Missing description
- Missing category

---

## Migration Status by Page

| Page/Component | Status | Complexity |
|----------------|--------|------------|
| Global shortcuts | ⏳ Not started | Low |
| Review session | ⏳ Not started | Low |
| Ingest page | ⏳ Not started | Medium |
| Reading page | ⏳ Not started | High ⚠️ |
| Create page | ⏳ Not started | Medium |
| Library page | ⏳ Not started | Low |

---

## Next Steps for Implementation

### Phase 1: Complete Infrastructure (4-7 hours)
1. Create `platform.ts` - Platform detection
2. Create `matcher.ts` - Event matching
3. Create `resolver.ts` - Shortcut resolution
4. Create `useShortcut.ts` hook
5. Create `context.tsx` provider
6. Add tests
7. Wrap App with ShortcutProvider

### Phase 2: Migrate Shortcuts (7-8 hours)
1. Migrate global shortcuts
2. Migrate review session
3. Migrate ingest page
4. Migrate reading page (most complex)
5. Migrate create page
6. Clean up old code

### Phase 3: User Customization (17-25 hours) - FUTURE
1. User preferences store
2. Conflict detection
3. Settings UI
4. Import/export

---

## Resources

**Full Documentation:**
- `/HOTKEY_CUSTOMIZATION_DESIGN.md` - Complete architecture
- `/HOTKEY_MIGRATION_PLAN.md` - Detailed migration steps
- `/HOTKEY_RESEARCH_SUMMARY.md` - Executive summary
- `/src/lib/shortcuts/README.md` - Developer guide

**Code:**
- `/src/lib/shortcuts/types.ts` - All TypeScript types
- `/src/lib/shortcuts/registry.ts` - All shortcut definitions

**Industry References:**
- [VS Code Keybindings](https://code.visualstudio.com/docs/configure/keybindings)
- [Obsidian Hotkeys](https://help.obsidian.md/Customization/Custom+hotkeys)

---

## FAQ

**Q: Can I use this system now?**
A: Not yet - need to complete Phase 1 infrastructure first.

**Q: Will this break existing shortcuts?**
A: No - Phase 2 migration will maintain exact same functionality.

**Q: When will users be able to customize shortcuts?**
A: Phase 3 (future work, optional).

**Q: Should I mark Escape as customizable?**
A: No - mark critical shortcuts like Escape as `defaultOnly: true`.

**Q: How do I handle the same key in different contexts?**
A: Use `when` conditions or different scopes.

**Q: What if I need a Mac-only shortcut?**
A: Use `platforms: ['mac']` in the definition.

**Q: How do I test on Windows if I have a Mac?**
A: Use browser dev tools or virtual machine.

---

**Last Updated:** 2025-10-18
**Status:** Phase 1 Preparation Complete, Ready for Implementation
