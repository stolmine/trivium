# Evaluation: Existing KeyboardManager Class

## Overview

The `/src/lib/utils/keyboard.ts` file contains an unused `KeyboardManager` class that was likely created for centralized keyboard shortcut management but never integrated into the application.

This document evaluates whether this class should be:
- A) Revived and used as foundation for new system
- B) Replaced entirely by new architecture
- C) Kept for compatibility

## Current Implementation Analysis

### Code Structure

```typescript
export type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: (event: KeyboardEvent) => void;
};

export class KeyboardManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isListening: boolean = false;

  register(id: string, shortcut: KeyboardShortcut): void;
  unregister(id: string): void;
  start(): void;
  stop(): void;
  private handleKeyDown(event: KeyboardEvent): void;
  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean;
}

export const keyboardManager = new KeyboardManager();
```

### Strengths

1. **Centralized Event Handling**
   - Single global listener (efficient)
   - Better than multiple listeners per component

2. **Registration Pattern**
   - Clean register/unregister API
   - Uses string IDs for shortcuts
   - Map-based storage (O(1) lookup)

3. **Singleton Instance**
   - `keyboardManager` exported as singleton
   - Easy to use from anywhere in the app

4. **Event Prevention**
   - Automatically calls `preventDefault()` on matched shortcuts
   - Returns after first match (no duplicate handling)

5. **Simple Matching Logic**
   - Clean boolean comparison for modifiers
   - Uses `!!` to normalize undefined to false

### Weaknesses

1. **No Scope/Context System**
   - All shortcuts are global
   - No way to have page-specific or modal-specific shortcuts
   - No context-aware activation (like `when` clauses)

2. **No Platform Abstraction**
   - Requires explicit `ctrl` or `meta` specification
   - No `Mod` key equivalent
   - Doesn't handle platform differences

3. **Handlers in Definition**
   - Handler functions stored directly in shortcut definition
   - Makes serialization impossible (can't save to localStorage)
   - Can't separate declaration from implementation

4. **No Customization Support**
   - No mechanism for user overrides
   - No way to change key bindings
   - No conflict detection

5. **No Description/Metadata**
   - Can't generate help dialogs
   - No categorization
   - Missing human-readable descriptions

6. **Type Inconsistency**
   - Has its own `KeyboardShortcut` type
   - Different from the one in `useKeyboardShortcuts.ts`
   - Would cause confusion if both are used

7. **No Input Field Handling**
   - Doesn't check if event is from input/textarea
   - Would capture shortcuts even when typing

8. **Arrow Function Binding Issue**
   - `handleKeyDown` is an arrow function
   - Bound at instance creation
   - Can't be easily mocked or tested

9. **No Cleanup Safety**
   - `stop()` removes listener, but shortcuts remain registered
   - Could cause memory leaks if shortcuts reference components
   - No automatic cleanup

10. **Missing Features**
    - No disabled shortcuts
    - No priority/ordering
    - No conditions
    - No conflict detection
    - No import/export

## Comparison with New Architecture

| Feature | KeyboardManager | New Architecture |
|---------|----------------|------------------|
| Centralized listening | ✅ Yes | ✅ Yes |
| Scope system | ❌ No | ✅ Yes (global, reading, review, etc.) |
| Context-aware (`when`) | ❌ No | ✅ Yes |
| Platform abstraction (`Mod`) | ❌ No | ✅ Yes |
| User customization | ❌ No | ✅ Yes |
| Serializable definitions | ❌ No (handlers in def) | ✅ Yes |
| Conflict detection | ❌ No | ✅ Yes |
| Help dialog support | ❌ No metadata | ✅ Yes (descriptions, categories) |
| Input field handling | ❌ No | ✅ Yes |
| React integration | ⚠️ Awkward | ✅ Hook-based |
| Testing | ⚠️ Difficult | ✅ Easy (pure functions) |
| localStorage persistence | ❌ No | ✅ Yes |
| Import/export | ❌ No | ✅ Yes |

## Could KeyboardManager Be Adapted?

### Option A: Minimal Adaptation

**Pros:**
- Reuse existing event handling
- Familiar API

**Cons:**
- Would need extensive refactoring:
  - Add scope/context system
  - Separate handlers from definitions
  - Add platform abstraction
  - Add all metadata fields
- By the time all changes are made, little of original code remains
- Type conflicts with existing `useKeyboardShortcuts`

**Verdict:** Not worth it - too much modification needed

### Option B: Use as Dispatcher Only

**Pros:**
- Keep the event listener logic
- Use new types for everything else

**Cons:**
- `matchesShortcut` would need updating
- Still need new `ShortcutDispatcher` with more features
- Adds confusion (why have both classes?)

**Verdict:** Not worth it - cleaner to write new dispatcher

### Option C: Keep for Reference

**Pros:**
- Shows original design intent
- Could be useful for comparison

**Cons:**
- Dead code in codebase
- Confusing for new developers
- Another `KeyboardShortcut` type

**Verdict:** Not recommended - better to remove

## Recommendation: Replace Entirely

### Why Replace?

1. **Fundamental architectural differences:**
   - KeyboardManager: Imperative, class-based
   - New system: Declarative, React-friendly

2. **Missing too many critical features:**
   - No scoping
   - No context awareness
   - No customization
   - No metadata

3. **Type conflicts:**
   - Two different `KeyboardShortcut` types
   - Would cause confusion

4. **React integration:**
   - KeyboardManager is singleton, not React-native
   - New hooks approach is more idiomatic
   - Better lifecycle management

5. **Code volume:**
   - KeyboardManager is only ~60 lines
   - Not a significant loss to rewrite

### What to Keep from KeyboardManager

**Good patterns to preserve:**

1. **Centralized event handling** ✅
   - Single global listener
   - Implement in new `ShortcutDispatcher`

2. **Registration pattern** ✅
   - `register(id, ...)` and `unregister(id)`
   - Use in new system

3. **Early exit optimization** ✅
   - Return after first match
   - Prevents duplicate handling

4. **Modifier matching logic** ✅
   - The `!!modifier === !!event.modifier` pattern
   - Clean and effective

**Example - adapted matching logic:**
```typescript
// Original (KeyboardManager)
private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  return (
    event.key === shortcut.key &&
    !!event.ctrlKey === !!shortcut.ctrl &&
    !!event.shiftKey === !!shortcut.shift &&
    !!event.altKey === !!shortcut.alt &&
    !!event.metaKey === !!shortcut.meta
  );
}

// New (ShortcutDispatcher) - enhanced version
private matchesShortcut(
  event: KeyboardEvent,
  shortcut: ResolvedShortcut
): boolean {
  // Same core logic, but with more features
  if (event.key !== shortcut.effectiveKey) return false;

  const modifiers = shortcut.effectiveModifiers;
  return (
    !!event.ctrlKey === modifiers.includes('Ctrl') &&
    !!event.shiftKey === modifiers.includes('Shift') &&
    !!event.altKey === modifiers.includes('Alt') &&
    !!event.metaKey === modifiers.includes('Meta')
  );
}
```

### Migration Path for KeyboardManager

1. **Phase 1:** Leave KeyboardManager untouched while building new system
2. **Phase 2:** Build new system alongside (no conflicts - KeyboardManager unused)
3. **Phase 3:** Remove KeyboardManager once new system is proven

**No migration needed** - KeyboardManager is already unused, so removing it is zero risk.

## Action Items

### Immediate (Phase 1)
- [x] Document evaluation of KeyboardManager
- [ ] Add comment to `keyboard.ts` explaining it will be replaced
- [ ] Add deprecation notice (if keeping temporarily)

### Phase 2 (During migration)
- [ ] Implement new `ShortcutDispatcher` with enhanced matching logic
- [ ] Ensure all good patterns from KeyboardManager are preserved
- [ ] Test new system thoroughly

### Phase 3 (Cleanup)
- [ ] Remove `KeyboardManager` class entirely
- [ ] Remove old `KeyboardShortcut` type from `keyboard.ts`
- [ ] Update any comments referencing it
- [ ] Consider keeping as historical reference in docs only (not in code)

## Conclusion

**The KeyboardManager class should be replaced entirely**, not adapted.

**Reasoning:**
- Too many fundamental architectural differences
- Missing critical features for customization
- Only ~60 lines - not a significant investment to preserve
- Would cause type conflicts and confusion
- New system requirements are substantially different

**What to preserve:**
- Centralized event handling pattern
- Registration/unregistration API
- Modifier matching logic
- Early exit optimization

**How to handle:**
1. Build new system from scratch based on design document
2. Incorporate good patterns from KeyboardManager
3. Remove KeyboardManager in Phase 3 cleanup
4. Optionally keep as reference in documentation (not code)

**Risk:** Low - KeyboardManager is unused, so removal has zero impact.

---

## Additional Notes

### For Future Reference

If someone asks "Why didn't we use the existing KeyboardManager?", point them to this document. The short answer:

> KeyboardManager was a good start but lacked critical features for customization (scopes, context awareness, platform abstraction, metadata, user overrides). The new requirements were different enough that building fresh was cleaner than extensive refactoring. We preserved the good patterns (centralized listening, modifier matching) in the new architecture.

### Learning from KeyboardManager

The existence of KeyboardManager shows that:
1. The team recognized the need for centralized keyboard handling
2. The class-based singleton approach was considered
3. It was never integrated (suggests it didn't fit the React architecture)

This validates the new approach:
- React-native (hooks, context)
- Declarative (registry of definitions)
- Customizable (separate data from handlers)
