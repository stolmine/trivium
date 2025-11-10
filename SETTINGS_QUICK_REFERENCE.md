# Settings Menu - Quick Reference

**Phase**: 19
**Complexity**: Very High
**Estimated Time**: 6-8 weeks

---

## Implemented Settings (Current)

### Default Settings

#### `show_links_by_default`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Controls whether Wikipedia links are shown by default in the reading view
- **UI Location**: Settings > Defaults tab
- **Hotkey**: Ctrl+L / Cmd+L to toggle links visibility

#### `enable_focus_tracking`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Controls whether the Library page uses click-to-focus with visual feedback. When OFF (default), library always gets hotkeys without focus management. When ON, requires clicking panes to focus them with visual outlines
- **UI Location**: Settings > Defaults tab
- **Applies To**: Library page (`/library`) only
- **Visual Effects**: When enabled, shows darker borders (2px), shadows, and dimming (88% opacity) on unfocused panes
- **Related**: Phase 29.3 Focus Tracking feature

#### `show_library_controls_in_sidebar`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Controls whether library control buttons (Ingest, Search, Sort, Expand/Collapse All, New Folder) are shown in the sidebar. When enabled, buttons appear in BOTH sidebar and library header. When disabled, buttons only appear in library header
- **UI Location**: Settings > Defaults tab
- **Applies To**: Sidebar and Library page
- **Benefits**: User choice between quick sidebar access or minimal sidebar with header-only controls
- **Related**: Phase 29 Polish Improvements

---

## Feature Breakdown by Complexity

### 🟢 LOW (Week 1)
- Defaults section
- Links visible toggle
- Basic settings page structure
- Database size display

### 🟡 MEDIUM (Week 2-3)
- Database export functionality
- Reset by scope (folder/text)
- Basic theme (light/dark/adaptive)
- Simple color customization

### 🔴 HIGH (Week 4-5)
- Comprehensive reset options
- Advanced theme customization
- Font family selection
- UI zoom controls

### 🔴 VERY HIGH (Week 6-8)
- Full keyboard shortcut customization
- Conflict detection system
- Action registry architecture
- Shortcut migration

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Basic settings page with defaults

**Backend Tasks**:
- Settings database table & migrations
- `get_settings` command
- `update_settings` command
- `get_database_size` command

**Frontend Tasks**:
- `/settings` route
- Tab layout component
- Defaults section UI
- Navigation integration (Ctrl+6)

### Phase 2: Database (Week 2)
**Goal**: Database management tools

**Tasks**:
- Export database command
- File dialog integration
- Progress indicators
- Size limit warnings (optional)

### Phase 3: Reset Options (Week 3)
**Goal**: Safe data reset functionality

**Tasks**:
- Reset commands with scope
- Multi-step confirmations
- Transaction support
- Error handling

### Phase 4-5: Theme (Week 4-5)
**Goal**: Theme customization

**Tasks**:
- Adaptive theme detection
- Color picker components
- CSS variable injection
- Font selection
- UI zoom

### Phase 6: Shortcuts (Week 6-7)
**Goal**: Customizable keyboard shortcuts

**Tasks**:
- Action registry system
- Shortcut capture UI
- Conflict detection
- Migration of hardcoded shortcuts

### Phase 7: Polish (Week 8)
**Goal**: Production ready

**Tasks**:
- Integration testing
- Documentation
- Accessibility audit
- Performance optimization

---

## Critical Decisions

### Database Size Limit
**Decision**: Implement warning-only, not enforcement
**Reason**: Risk of data loss too high

### Keyboard Shortcuts
**Decision**: Full implementation required
**Reason**: Core feature request, high user value

### Theme System
**Decision**: Phased approach (basic → advanced)
**Reason**: Allows early delivery of value

### Reset Options
**Decision**: Multiple confirmation dialogs
**Reason**: Data safety is paramount

---

## Data Safety Checklist

- [ ] All destructive operations require confirmation
- [ ] Export prompt before reset operations
- [ ] Transaction-based resets (atomic)
- [ ] Rollback on error
- [ ] Clear warning messages
- [ ] Progress indicators for long operations
- [ ] Error handling with user feedback

---

## Technical Challenges

1. **Keyboard Shortcuts**: Requires architectural refactor of event handling
2. **Theme CSS**: Performance impact of runtime CSS injection
3. **Database Export**: Platform-specific file paths
4. **Conflict Detection**: Complex validation logic
5. **Settings Migration**: Version compatibility

---

## MVP Alternative (3 weeks)

If full implementation is too ambitious:

**Week 1**: Defaults + Database Export
**Week 2**: Basic Theme + Database Size
**Week 3**: Simple Reset Options

Defer:
- Advanced theme customization
- Keyboard shortcut customization
- Complex reset scopes

---

## Files to Create

### Frontend
```
src/routes/settings/index.tsx
src/lib/components/settings/SettingsLayout.tsx
src/lib/components/settings/DefaultsSection.tsx
src/lib/components/settings/DatabaseSection.tsx
src/lib/components/settings/ResetSection.tsx
src/lib/components/settings/ThemeSection.tsx
src/lib/components/settings/KeyboardSection.tsx
src/lib/components/settings/ColorPicker.tsx
src/lib/components/settings/FontSelector.tsx
src/lib/components/settings/ShortcutEditor.tsx
src/lib/stores/keyboardShortcuts.ts (new)
src/lib/utils/theme.ts (new)
src/lib/utils/shortcuts.ts (new)
src/lib/types/settings.ts (new)
```

### Backend
```
src-tauri/src/commands/settings.rs (new)
src-tauri/migrations/YYYYMMDDHHMMSS_create_settings.sql (new)
```

---

## Action Registry (54 Actions)

### Global Navigation (6)
- navigate.dashboard
- navigate.library
- navigate.create
- navigate.review
- navigate.ingest
- navigate.ingestAlt

### Global View (2)
- view.toggleSidebar
- view.showHelp

### Reading View (17)
- reading.editMode
- reading.editSelection
- reading.saveEdit
- reading.cancelEdit
- reading.toggleRead
- reading.toggleLinks
- reading.undo
- reading.redo
- reading.search
- reading.nextMatch
- reading.prevMatch
- reading.closeSearch
- reading.confirmRename
- reading.confirmDelete
- reading.confirmFinish
- reading.confirmClear
- reading.cancelDialog

### Review Session (5)
- review.toggleAnswer
- review.gradeAgain
- review.gradeHard
- review.gradeGood
- review.gradeEasy

### Create Cards (10)
- create.scopeLibrary
- create.scopeFolder
- create.scopeText
- create.prevMark
- create.nextMark
- create.buryMark
- create.wrapCloze
- create.createCard
- create.showHelp
- create.closeHelp

### Ingest (3)
- ingest.submit
- ingest.cancel
- ingest.excludeSelection

### Library (7)
- library.search
- library.arrowUp
- library.arrowDown
- library.arrowRight
- library.arrowLeft
- library.enter
- library.expandCollapse

### Modal Dialogs (2)
- modal.confirm
- modal.cancel

---

## Success Metrics

- [ ] Settings accessible via navigation
- [ ] All settings persist across sessions
- [ ] Database export creates valid SQLite file
- [ ] Reset operations complete without errors
- [ ] Theme changes apply instantly
- [ ] Custom shortcuts work without conflicts
- [ ] No performance degradation
- [ ] Accessibility maintained (WCAG AA)

---

## Next Steps

1. Review and approve plan
2. Begin Phase 1 implementation
3. Create feature branch from main
4. Set up settings database schema
5. Build basic settings page structure

---

**Created**: 2025-10-18
**Status**: Ready for Implementation
