# Keyboard Shortcut System - Migration Plan

## Overview

This document outlines the step-by-step migration plan to transition from the current hardcoded keyboard shortcut system to the new customizable architecture described in `HOTKEY_CUSTOMIZATION_DESIGN.md`.

The migration is divided into three phases to minimize risk and allow incremental progress:

- **Phase 1: Preparation** - Build new infrastructure alongside existing code (no breaking changes)
- **Phase 2: Migration** - Gradually replace hardcoded shortcuts with new system
- **Phase 3: Customization** - Add user preferences and settings UI

---

## Phase 1: Preparation (Do Now)

**Goal:** Build the foundation without breaking existing functionality.

### 1.1 Create Core Infrastructure

**Status:** Ready to implement
**Estimated Time:** 2-3 hours
**Risk:** Low (no changes to existing code)

#### Tasks:

1. **Create shortcut registry** (`/src/lib/shortcuts/registry.ts`)
   - Define all existing shortcuts using `ShortcutDefinition` type
   - Include all shortcuts from current inventory
   - Start with defaults only (no user overrides yet)

2. **Create platform utilities** (`/src/lib/shortcuts/platform.ts`)
   ```typescript
   export function getPlatform(): Platform;
   export function isMac(): boolean;
   export function translateModifiers(modifiers: Modifier[]): Modifier[];
   ```

3. **Create shortcut matcher** (`/src/lib/shortcuts/matcher.ts`)
   ```typescript
   export function matchesShortcut(
     event: KeyboardEvent,
     shortcut: ShortcutDefinition
   ): boolean;

   export function normalizeKey(key: string): string;

   export function getEventModifiers(event: KeyboardEvent): Set<Modifier>;
   ```

4. **Create basic resolver** (`/src/lib/shortcuts/resolver.ts`)
   ```typescript
   // Phase 1: Just wraps registry (no overrides yet)
   export class ShortcutResolver {
     constructor(private registry: ShortcutDefinition[]) {}

     resolve(): ResolvedShortcut[] {
       // For now, just translate platform modifiers
       return this.registry.map(def => ({
         ...def,
         isOverridden: false,
         isDisabled: false,
         effectiveKey: def.key,
         effectiveModifiers: translateModifiers(def.modifiers || []),
       }));
     }

     getForScope(scope: ShortcutScope): ResolvedShortcut[] {
       return this.resolve().filter(s => s.scope === scope);
     }
   }
   ```

#### Deliverables:

- `/src/lib/shortcuts/types.ts` - Already created
- `/src/lib/shortcuts/registry.ts` - Complete shortcut definitions
- `/src/lib/shortcuts/platform.ts` - Platform detection and translation
- `/src/lib/shortcuts/matcher.ts` - Event matching logic
- `/src/lib/shortcuts/resolver.ts` - Basic resolver (no overrides yet)

#### Testing:

- Unit tests for platform detection
- Unit tests for modifier translation (Mod → Cmd/Ctrl)
- Unit tests for event matching
- Verify registry contains all existing shortcuts

---

### 1.2 Create Simplified React Hook

**Status:** Ready to implement
**Estimated Time:** 1-2 hours
**Risk:** Low (additive only)

#### Tasks:

1. **Create `useShortcut` hook** (`/src/hooks/useShortcut.ts`)
   ```typescript
   /**
    * Register a keyboard shortcut handler.
    *
    * This is the Phase 1 implementation - it works alongside
    * existing shortcuts without replacing them yet.
    */
   export function useShortcut(
     id: string,
     handler: () => void,
     dependencies: any[] = []
   ): void {
     const resolver = useShortcutResolver(); // Get from context

     useEffect(() => {
       const shortcut = resolver.resolve().find(s => s.id === id);
       if (!shortcut || shortcut.isDisabled) return;

       const handleKeyDown = (event: KeyboardEvent) => {
         if (matchesShortcut(event, shortcut)) {
           event.preventDefault();
           handler();
         }
       };

       window.addEventListener('keydown', handleKeyDown);
       return () => window.removeEventListener('keydown', handleKeyDown);
     }, [id, handler, ...dependencies]);
   }
   ```

2. **Create `ShortcutProvider` context**
   ```typescript
   const ShortcutContext = createContext<ShortcutResolver | null>(null);

   export function ShortcutProvider({ children }: { children: ReactNode }) {
     const resolver = useMemo(() => {
       return new ShortcutResolver(SHORTCUT_REGISTRY);
     }, []);

     return (
       <ShortcutContext.Provider value={resolver}>
         {children}
       </ShortcutContext.Provider>
     );
   }
   ```

#### Deliverables:

- `/src/hooks/useShortcut.ts` - Basic hook implementation
- `/src/lib/shortcuts/context.tsx` - React context provider
- Wrap `App` component with `ShortcutProvider`

#### Testing:

- Manual testing: Try `useShortcut` in a test component
- Verify it doesn't interfere with existing shortcuts
- Test on Mac and Windows (modifier translation)

---

### 1.3 Document the System

**Status:** Ready to implement
**Estimated Time:** 30 minutes
**Risk:** None

#### Tasks:

1. Add inline documentation to all new code
2. Create README in `/src/lib/shortcuts/README.md` explaining the architecture
3. Add migration notes to main README

---

## Phase 2: Migration (Gradual Replacement)

**Goal:** Replace hardcoded shortcuts with registry-based system.

### 2.1 Migrate Global Shortcuts

**Status:** After Phase 1 complete
**Estimated Time:** 1 hour
**Risk:** Low (well-defined scope)

#### Tasks:

1. **Refactor `useGlobalShortcuts` hook**

   **Before:**
   ```typescript
   const globalShortcuts: KeyboardShortcut[] = [
     {
       key: 'b',
       ctrlKey: true,
       action: onToggleSidebar,
       description: 'Toggle sidebar',
       category: 'view',
     },
     // ... more shortcuts
   ];

   useKeyboardShortcuts({ shortcuts: globalShortcuts });
   ```

   **After:**
   ```typescript
   function useGlobalShortcuts(onToggleSidebar: () => void, onToggleHelp: () => void) {
     const navigate = useNavigate();
     const { toggleLinks } = useSettingsStore();

     // Use new hook for each shortcut
     useShortcut('global.toggleSidebar', onToggleSidebar);
     useShortcut('global.toggleLinks', toggleLinks);
     useShortcut('global.goToDashboard', () => navigate('/'));
     useShortcut('global.goToLibrary', () => navigate('/library'));
     useShortcut('global.goToReview', () => navigate('/review'));
     useShortcut('global.goToCreate', () => navigate('/create'));
     useShortcut('global.openIngest', () => navigate('/ingest'));
     useShortcut('global.showHelp', onToggleHelp);

     // Return shortcuts for help display
     const resolver = useShortcutResolver();
     return resolver.getForScope('global');
   }
   ```

2. **Update ShortcutHelp component** to use `ResolvedShortcut[]` type

#### Testing:

- Test all global shortcuts still work
- Verify help dialog shows correct shortcuts
- Test on both Mac and Windows

---

### 2.2 Migrate Review Session Shortcuts

**Status:** After Phase 2.1 complete
**Estimated Time:** 30 minutes
**Risk:** Low

#### Tasks:

1. **Refactor `/routes/review/session.tsx`**

   **Before:**
   ```typescript
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if (e.key === ' ') {
         e.preventDefault();
         toggleAnswer();
       }
       if (showAnswer) {
         if (e.key === '1') {
           e.preventDefault();
           gradeCard(0);
         }
         // ... more keys
       }
     };

     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, [showAnswer, toggleAnswer, gradeCard]);
   ```

   **After:**
   ```typescript
   // Set context for 'when' conditions
   useShortcutContext('review', { answerVisible: showAnswer });

   // Register handlers
   useShortcut('review.toggleAnswer', toggleAnswer);
   useShortcut('review.gradeAgain', () => gradeCard(0));
   useShortcut('review.gradeHard', () => gradeCard(1));
   useShortcut('review.gradeGood', () => gradeCard(2));
   useShortcut('review.gradeEasy', () => gradeCard(3));
   ```

2. **Add context support to dispatcher**
   - The grade shortcuts should only work when `answerVisible` is true
   - Implement basic `when` condition evaluation

#### Testing:

- Test all review shortcuts
- Verify grade shortcuts only work when answer is visible
- Test spacebar toggle

---

### 2.3 Migrate Ingest Page Shortcuts

**Status:** After Phase 2.2 complete
**Estimated Time:** 45 minutes
**Risk:** Medium (complex context: textarea focus, undo/redo)

#### Tasks:

1. **Refactor `/routes/ingest/index.tsx`**

   **Before:**
   ```typescript
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if (e.key === 'Escape') {
         e.preventDefault();
         handleCancel();
         return;
       }

       if (e.key === 'Enter' && e.shiftKey) {
         e.preventDefault();
         if (title && content && !titleError) {
           handleSubmit(e as unknown as React.FormEvent);
         }
         return;
       }

       if (document.activeElement === contentRef.current) {
         if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
           e.preventDefault();
           handleWrapExclude();
         }
         // ... undo/redo
       }
     };

     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, [content, title, titleError, undo, redo]);
   ```

   **After:**
   ```typescript
   const isContentFocused = document.activeElement === contentRef.current;

   useShortcutContext('ingest', {
     titleValid: !!title && !titleError,
     contentValid: !!content,
     contentFocused: isContentFocused,
   });

   useShortcut('ingest.cancel', handleCancel);
   useShortcut('ingest.submit', () => {
     if (title && content && !titleError) {
       handleSubmit({} as React.FormEvent);
     }
   });
   useShortcut('ingest.excludeSelection', handleWrapExclude);
   useShortcut('ingest.undo', undo);
   useShortcut('ingest.redo', redo);
   ```

2. **Handle textarea-specific shortcuts**
   - Update registry definitions to include `when: 'contentFocused'` for textarea shortcuts
   - Dispatcher should respect focus context

#### Testing:

- Test all ingest shortcuts
- Verify undo/redo only work in textarea
- Test Escape and Shift+Enter
- Test exclude selection

---

### 2.4 Migrate Reading Page Shortcuts

**Status:** After Phase 2.3 complete
**Estimated Time:** 1.5 hours
**Risk:** High (most complex page, many context-dependent shortcuts)

#### Tasks:

1. **Refactor `/routes/read/[id].tsx`**

   This is the most complex migration due to many context-dependent shortcuts.

   **Strategy:**
   - Break into smaller chunks
   - Migrate one group of shortcuts at a time
   - Keep existing code working alongside new code temporarily
   - Remove old code once new system proven stable

   **Groups:**
   - Undo/redo (context: not editing)
   - Edit activation (Ctrl+E)
   - Save edit (Ctrl+S)
   - Mark as read (Ctrl+M)
   - Find (Ctrl+F)
   - Escape (context: which modal/mode is active)

2. **Update context frequently**
   ```typescript
   useShortcutContext('reading', {
     editing: isEditMode,
     hasSelection: !!selectionInfo,
     searchOpen: isOpen,
     inlineEditActive,
     editRegion: !!editRegion,
     inlineEditRegion: !!inlineEditRegion,
   });
   ```

3. **Register all shortcuts**
   ```typescript
   useShortcut('reading.undo', handleUndo);
   useShortcut('reading.redo', handleRedo);
   useShortcut('reading.activateEdit', () => {
     if (selectionInfo) {
       handleActivateInlineEdit();
     } else {
       setEditingContent(currentText?.content || '');
       setInlineEditActive(true);
     }
   });
   useShortcut('reading.saveEdit', handleSaveInlineEdit);
   useShortcut('reading.markAsRead', handleMarkSelectionRead);
   useShortcut('reading.find', () => {
     openSearch();
     setTimeout(() => {
       const input = document.querySelector('input[placeholder="Find in page..."]');
       if (input) (input as HTMLInputElement).focus();
     }, 0);
   });
   useShortcut('reading.closeSearch', closeSearch);
   useShortcut('reading.cancelEdit', () => {
     if (inlineEditActive) {
       setInlineEditActive(false);
       setEditingContent(currentText?.content || '');
     } else if (editRegion) {
       setEditRegion(null);
     } else if (inlineEditRegion) {
       setInlineEditRegion(null);
       // ... scroll restoration
     }
   });
   ```

4. **Handle Escape complexity**
   - Escape does different things based on context
   - May need multiple shortcut IDs with different `when` clauses:
     - `reading.cancelInlineEdit` (when: 'inlineEditActive')
     - `reading.cancelEditRegion` (when: 'editRegion')
     - `reading.cancelInlineEditRegion` (when: 'inlineEditRegion')
     - `reading.closeSearch` (when: 'searchOpen')
   - Or use priority system (first match wins)

#### Testing:

- Test all reading shortcuts
- Test Escape in different contexts
- Test undo/redo with different modes
- Test edit activation with/without selection
- Verify search shortcuts work

---

### 2.5 Migrate Component-Level Shortcuts

**Status:** After Phase 2.4 complete
**Estimated Time:** 1 hour
**Risk:** Low

#### Tasks:

1. **Migrate MarkDisplay component** (`/create` page navigation)
   - ArrowLeft/Ctrl+K for previous
   - ArrowRight/Ctrl+J for next
   - Shift+B to toggle

2. **Migrate ScopeSelector**
   - Number keys 1, 2 for scope selection

3. **Migrate Create page**
   - `?` for help
   - Escape/Enter to close help

#### Approach:

For component-specific shortcuts that don't fit global scopes, consider:
- Adding component-specific scope (e.g., `'create.marks'`)
- Or use `when` conditions with existing scopes
- Or keep local `useEffect` if truly component-specific and won't be customized

#### Testing:

- Test all component shortcuts
- Verify they don't interfere with page-level shortcuts

---

### 2.6 Deprecate Old System

**Status:** After all migrations complete
**Estimated Time:** 30 minutes
**Risk:** Low

#### Tasks:

1. **Remove old `useKeyboardShortcuts` hook**
   - Or mark as deprecated
   - Update any remaining usage

2. **Keep or remove `KeyboardManager` class?**
   - See evaluation in separate section
   - Decision: Likely remove (superseded by new system)

3. **Clean up**
   - Remove unused code
   - Update imports
   - Remove deprecated types

---

## Phase 3: Customization (Future Implementation)

**Goal:** Enable user customization of shortcuts.

### 3.1 Add User Preferences

**Status:** Future
**Estimated Time:** 3-4 hours
**Risk:** Medium

#### Tasks:

1. **Create ShortcutPreferences class** (`/src/lib/shortcuts/preferences.ts`)
   ```typescript
   export class ShortcutPreferences {
     private preferences: ShortcutPreferences;

     constructor() {
       this.load();
     }

     load(): void {
       const stored = localStorage.getItem('trivium_shortcut_preferences');
       if (stored) {
         this.preferences = JSON.parse(stored);
       } else {
         this.preferences = { version: 1, overrides: {}, disabled: [] };
       }
     }

     save(): void {
       localStorage.setItem(
         'trivium_shortcut_preferences',
         JSON.stringify(this.preferences)
       );
     }

     setOverride(id: string, key: string, modifiers?: Modifier[]): void {
       this.preferences.overrides[id] = { id, key, modifiers };
       this.save();
     }

     // ... other methods
   }
   ```

2. **Update ShortcutResolver** to merge overrides
   ```typescript
   resolve(): ResolvedShortcut[] {
     return this.registry.map(def => {
       const override = this.preferences.overrides[def.id];
       const isDisabled = this.preferences.disabled.includes(def.id);

       const effectiveKey = override?.key ?? def.key;
       const effectiveModifiers = translateModifiers(
         override?.modifiers ?? def.modifiers ?? []
       );

       return {
         ...def,
         isOverridden: !!override,
         isDisabled,
         effectiveKey,
         effectiveModifiers,
       };
     });
   }
   ```

3. **Add preferences to context**
   ```typescript
   export function ShortcutProvider({ children }: { children: ReactNode }) {
     const [preferences] = useState(() => new ShortcutPreferences());
     const resolver = useMemo(() => {
       return new ShortcutResolver(SHORTCUT_REGISTRY, preferences);
     }, [preferences]);

     return (
       <ShortcutContext.Provider value={{ resolver, preferences }}>
         {children}
       </ShortcutContext.Provider>
     );
   }
   ```

#### Testing:

- Test loading/saving preferences
- Test override merging
- Test disabling shortcuts
- Test persistence across page reloads

---

### 3.2 Add Conflict Detection

**Status:** Future
**Estimated Time:** 2-3 hours
**Risk:** Medium

#### Tasks:

1. **Create ConflictDetector** (`/src/lib/shortcuts/conflicts.ts`)
   ```typescript
   export class ConflictDetector {
     constructor(private resolver: ShortcutResolver) {}

     checkConflict(
       id: string,
       key: string,
       modifiers: Modifier[]
     ): ShortcutConflict | null {
       const resolved = this.resolver.resolve();
       const definition = this.resolver.registry.find(d => d.id === id);
       if (!definition) return null;

       // Find other shortcuts with same key combo in same scope
       const conflicts = resolved.filter(s =>
         s.id !== id &&
         s.effectiveKey === key &&
         arraysEqual(s.effectiveModifiers, modifiers) &&
         (s.scope === definition.scope || s.scope === 'global')
       );

       if (conflicts.length === 0) return null;

       // Check if 'when' conditions prevent conflict
       const canCoexist = this.checkWhenConditions(definition, conflicts);
       if (canCoexist) return null;

       return {
         newShortcut: definition,
         conflictingWith: conflicts,
         severity: 'error',
         message: `This shortcut conflicts with: ${conflicts.map(c => c.description).join(', ')}`,
       };
     }

     // ... other methods
   }
   ```

2. **Add reserved shortcut list**
   ```typescript
   const RESERVED_SHORTCUTS: ReservedShortcut[] = [
     { key: 'n', modifiers: ['Mod'], reason: 'Browser: New window' },
     { key: 't', modifiers: ['Mod'], reason: 'Browser: New tab' },
     { key: 'w', modifiers: ['Mod'], reason: 'Browser: Close tab' },
     { key: 'q', modifiers: ['Mod'], reason: 'Browser: Quit' },
     { key: 'r', modifiers: ['Mod'], reason: 'Browser: Reload' },
     // ... more
   ];

   function isReservedShortcut(key: string, modifiers: Modifier[]): boolean {
     return RESERVED_SHORTCUTS.some(reserved =>
       reserved.key === key &&
       arraysEqual(reserved.modifiers, modifiers)
     );
   }
   ```

#### Testing:

- Test same-scope conflict detection
- Test global vs scoped conflicts
- Test when clause conflict prevention
- Test reserved shortcut blocking

---

### 3.3 Build Settings UI

**Status:** Future
**Estimated Time:** 8-12 hours
**Risk:** Medium-High

#### Tasks:

1. **Create settings page** (`/routes/settings/shortcuts.tsx`)
   - Search/filter shortcuts
   - Group by category
   - Show current bindings
   - Edit mode for changing bindings
   - Conflict warnings
   - Reset buttons

2. **Create shortcut input component**
   ```typescript
   function ShortcutInput({
     shortcut,
     onChange,
   }: {
     shortcut: ResolvedShortcut;
     onChange: (key: string, modifiers: Modifier[]) => void;
   }) {
     const [recording, setRecording] = useState(false);

     const handleKeyDown = (e: KeyboardEvent) => {
       if (!recording) return;

       e.preventDefault();
       const modifiers = getEventModifiers(e);
       onChange(e.key, Array.from(modifiers));
       setRecording(false);
     };

     // ... render
   }
   ```

3. **Add conflict resolution UI**
   - Show conflicts inline
   - Suggest alternatives
   - Allow force override (if user understands risk)

4. **Add import/export**
   - Export to JSON file
   - Import from JSON file
   - Validate imports

5. **Add to main settings**
   - Link from settings menu
   - Or dedicated shortcuts button in UI

#### Testing:

- Test search/filter
- Test editing shortcuts
- Test conflict detection UI
- Test reset functionality
- Test import/export
- Accessibility testing
- Mobile responsive testing

---

## Rollback Strategy

If issues arise during migration:

### Phase 1 Rollback
- Simply don't use new hooks yet
- Remove new files
- Zero risk (no changes to existing code)

### Phase 2 Rollback
- Revert component changes
- Keep infrastructure (for future retry)
- Gradual migration means partial rollback possible

### Phase 3 Rollback
- Clear localStorage preferences
- Keep registry system (still works with defaults)
- Remove settings UI

---

## Testing Strategy

### Automated Tests

**Unit Tests:**
- Platform detection
- Modifier translation
- Event matching
- Conflict detection
- Condition parsing
- Preference save/load

**Integration Tests:**
- Registry + Resolver + Preferences
- Full shortcut resolution pipeline
- Import/export functionality

**E2E Tests:**
- Test shortcuts in each page
- Test context switching
- Test customization persistence
- Test conflict prevention

### Manual Testing

**Cross-Platform:**
- Test on Mac (Cmd key)
- Test on Windows (Ctrl key)
- Test on Linux

**Cross-Browser:**
- Chrome
- Firefox
- Safari
- Edge

**Accessibility:**
- Screen reader announcements
- Keyboard-only navigation
- High contrast mode

---

## Migration Checklist

### Phase 1: Preparation
- [ ] Create `/src/lib/shortcuts/types.ts` (DONE)
- [ ] Create `/src/lib/shortcuts/registry.ts`
- [ ] Create `/src/lib/shortcuts/platform.ts`
- [ ] Create `/src/lib/shortcuts/matcher.ts`
- [ ] Create `/src/lib/shortcuts/resolver.ts`
- [ ] Create `/src/hooks/useShortcut.ts`
- [ ] Create `/src/lib/shortcuts/context.tsx`
- [ ] Wrap App with ShortcutProvider
- [ ] Write unit tests
- [ ] Document system

### Phase 2: Migration
- [ ] Migrate global shortcuts
- [ ] Update ShortcutHelp component
- [ ] Migrate review session shortcuts
- [ ] Add basic context support
- [ ] Migrate ingest page shortcuts
- [ ] Migrate reading page shortcuts
- [ ] Migrate component-level shortcuts
- [ ] Test all migrations
- [ ] Remove old code

### Phase 3: Customization
- [ ] Implement ShortcutPreferences
- [ ] Update ShortcutResolver with overrides
- [ ] Implement ConflictDetector
- [ ] Create reserved shortcuts list
- [ ] Build settings UI
- [ ] Add import/export
- [ ] Comprehensive testing
- [ ] User documentation

---

## Timeline Estimates

### Phase 1 (Preparation)
- **Development:** 3-5 hours
- **Testing:** 1-2 hours
- **Total:** 4-7 hours

### Phase 2 (Migration)
- **Global shortcuts:** 1 hour
- **Review shortcuts:** 0.5 hours
- **Ingest shortcuts:** 0.75 hours
- **Reading shortcuts:** 1.5 hours
- **Component shortcuts:** 1 hour
- **Cleanup:** 0.5 hours
- **Testing:** 2 hours
- **Total:** 7-8 hours

### Phase 3 (Customization)
- **Preferences system:** 3-4 hours
- **Conflict detection:** 2-3 hours
- **Settings UI:** 8-12 hours
- **Testing:** 4-6 hours
- **Total:** 17-25 hours

### Grand Total
**Minimum:** 28 hours
**Maximum:** 40 hours
**Realistic:** 32-36 hours

---

## Risk Assessment

| Phase | Risk Level | Mitigation |
|-------|-----------|------------|
| Phase 1 | Low | Additive only, no changes to existing code |
| Phase 2.1-2.3 | Low | Straightforward migrations, clear scope |
| Phase 2.4 | Medium-High | Complex reading page, extensive testing needed |
| Phase 2.5-2.6 | Low | Small scope, cleanup |
| Phase 3.1 | Medium | New localStorage logic, needs validation |
| Phase 3.2 | Medium | Complex conflict logic, edge cases |
| Phase 3.3 | Medium-High | Large UI component, UX critical |

---

## Success Criteria

### Phase 1
- [ ] All infrastructure files created
- [ ] Unit tests passing
- [ ] Documentation complete
- [ ] No regression in existing functionality

### Phase 2
- [ ] All shortcuts work via new system
- [ ] No shortcuts left hardcoded
- [ ] All pages tested on Mac and Windows
- [ ] Help dialog works correctly
- [ ] Old code removed

### Phase 3
- [ ] User can customize any non-default-only shortcut
- [ ] Conflicts detected and prevented
- [ ] Preferences persist across sessions
- [ ] Settings UI is intuitive and accessible
- [ ] Import/export works reliably

---

## Post-Migration Tasks

1. **User Documentation**
   - Add shortcuts to user guide
   - Create video tutorial for customization
   - Add FAQ for common issues

2. **Monitoring**
   - Track localStorage usage
   - Monitor error reports
   - Gather user feedback

3. **Future Enhancements**
   - Shortcut sequences (Vim mode)
   - Command palette
   - Cloud sync
   - Preset profiles

---

## Questions to Resolve

1. **Should we keep the old KeyboardManager class?**
   - Recommendation: No, superseded by new system
   - See evaluation below

2. **How to handle component-specific shortcuts?**
   - Option A: Add component scopes (e.g., 'create.marks')
   - Option B: Use when conditions
   - Option C: Keep local for truly one-off shortcuts
   - Recommendation: Hybrid - use scopes for customizable, local for one-off

3. **Should Escape be customizable?**
   - Recommendation: No (mark as defaultOnly)
   - It's too critical for UX (closing modals, canceling)

4. **How to handle shortcuts in input fields?**
   - Current: Ignored when input/textarea focused
   - Future: Allow opt-in (e.g., undo/redo in rich text editor)
   - Recommendation: Keep current behavior, add opt-in flag later

---

## Notes

- This migration can be done incrementally
- Each phase can be deployed independently
- Phase 1 has zero risk (no changes to existing code)
- Phase 2 can be done page-by-page
- Phase 3 is optional (system works without customization)
- Consider feature flag for Phase 3 (gradual rollout)
