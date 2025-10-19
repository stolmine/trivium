# Phase 19: Comprehensive Settings Menu

**Status**: Planning
**Branch**: `17_settingsMenu`
**Start Date**: 2025-10-18

---

## Overview

Implement a comprehensive settings page providing user control over all aspects of the application including defaults, database management, keyboard shortcuts, reset options, and theme customization.

## Existing Infrastructure

### Current Settings Store (`src/lib/stores/settings.ts`)
- **Storage**: Zustand with persist middleware (localStorage)
- **Current Settings**:
  - `linksEnabled`: Toggle for clickable Wikipedia links (default: false)
  - `fontSize`: Reading view font size (default: 1.25rem)
  - `flashcardSidebarCollapsed`: Flashcard creation sidebar state (default: false)

### Keyboard Shortcuts
- 60+ shortcuts already defined across 7 categories
- Platform-aware (Cmd/Ctrl detection)
- No conflicts currently

---

## Requirements Analysis

### 1. Defaults
**Complexity**: Low
- ✅ Reading view links visible (already exists)
- Need UI to expose this setting

### 2. Database Management
**Complexity**: High

#### 2.1 Export Database
- **Technical Challenge**: Export SQLite database file
- **Considerations**:
  - Database location varies by platform
  - Need to handle locked database (app running)
  - File size could be large
  - User needs file picker for save location
- **Implementation**: Tauri file system API + dialog

#### 2.2 Database Size Display
- **Query**: Get database file size from filesystem
- **Display**: Human-readable format (KB/MB/GB)
- **Update frequency**: On settings page load

#### 2.3 Database Size Limit
- **Complexity**: Very High
- **Challenges**:
  - What happens when limit reached?
  - Which data to purge? (old texts, flashcards, read ranges?)
  - User notification system
  - Risk of data loss
- **Recommendation**: Defer to later phase or make optional warning-only

### 3. Keyboard Shortcut Customization
**Complexity**: Very High

#### Requirements
- Every UI function assignable to keyboard shortcut
- Conflict detection and warning
- Platform-aware default bindings
- Validation for invalid combinations
- Reset to defaults option

#### Technical Challenges
- **Action Registry**: Need centralized registry of all possible actions
- **Shortcut Format**: Platform-independent internal representation
- **Conflict Detection**: Check for duplicates across all contexts
- **Context Awareness**: Some shortcuts only valid in certain views
- **Persistence**: Store custom bindings
- **Migration**: Update existing code to use configurable shortcuts

#### Action Categories (from KEYBOARD_SHORTCUTS.md)
1. Global Navigation (6 actions)
2. Global View Controls (2 actions)
3. Reading View - Text Editing (4 actions)
4. Reading View - Text Selection (1 action)
5. Reading View - History & Navigation (3 actions)
6. Reading View - Text Search (4 actions)
7. Reading View - Text Dialogs (5 actions)
8. Review Session - Answer Reveal (1 action)
9. Review Session - Card Grading (4 actions)
10. Create Cards - Scope Selection (3 actions)
11. Create Cards - Mark Navigation (3 actions)
12. Create Cards - Card Creation (4 actions)
13. Create Cards - Help (2 actions)
14. Ingest/Import (3 actions)
15. Library Navigation (7 actions)
16. Modal Dialogs (2 actions)

**Total**: ~54 distinct actions

### 4. Reset Options
**Complexity**: High (Data Safety Critical)

#### 4.1 Reset by Scope (Folder/Text/Collection)
- **Granular control**: User selects what to reset
- **Options**:
  - Reset reading progress (clear read_ranges)
  - Reset marks (delete cloze_notes)
  - Reset flashcards (delete flashcards)
  - Reset flashcard stats (reset FSRS state)
  - Complete text deletion

#### 4.2 Reset All (Nuclear Option)
- **Warning**: Multiple confirmation dialogs
- **Actions**:
  - Delete all texts
  - Delete all folders
  - Delete all flashcards
  - Delete all read ranges
  - Delete all marks
  - Reset all settings to defaults
  - Clear localStorage
- **Effect**: Fresh install state

#### 4.3 Reset Flashcard Stats/Difficulty
- Reset FSRS parameters to defaults
- Clear review history but keep cards
- Useful for algorithmic fresh start

#### Data Safety Requirements
- **Confirmation dialogs** with clear warnings
- **Progress indicators** during deletion
- **Irreversible action** warnings
- **Export prompt** before destructive operations
- **Error handling** for partial failures

### 5. Theme Customization
**Complexity**: Very High

#### 5.1 Adaptive Theme
- **System theme detection**: Light/dark mode OS preference
- **Auto-switch**: Follow OS changes
- **Manual override**: User can force light/dark

#### 5.2 Custom Adaptive Colors
- **Two color sets**: One for light, one for dark
- **Automatic switching**: Based on adaptive setting
- **Elements to customize**: (see 5.3)

#### 5.3 Custom Colors (Full Control)
- **UI Elements**:
  - Body text
  - Buttons (default, hover, active states)
  - Headers (h1-h6)
  - Icons
  - Links (default, visited, hover)
  - Marked text (background + foreground)
  - Selected text (background + foreground)
  - Read text highlighting (inverse style)
  - Unread text highlighting
  - Search match highlighting
  - Sidebar background
  - Main content background
  - Border colors

#### 5.4 Fonts
- **Family**:
  - UI font (currently Inter)
  - Reading font (currently Charter)
  - Code font (monospace)
  - Fallback chains
- **Size**:
  - Base font size (affects everything)
  - Per-element overrides
  - Line height adjustments

#### 5.5 UI Zoom
- **Global zoom**: 50% - 200%
- **Per-view zoom**: Independent zoom levels
- **Persistence**: Remember zoom per view

#### 5.6 Show Tips Toggle
- Toggle all tooltip displays
- Help text visibility
- Onboarding hints

#### Technical Implementation
- **CSS Variables**: Use custom properties for theming
- **Tailwind CSS v4**: Leverage @theme directive
- **LocalStorage**: Persist theme preferences
- **Runtime CSS**: Inject custom colors via style tags
- **Font Loading**: Handle custom font imports

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
**Focus**: Basic infrastructure and simple settings

#### Backend
- [ ] Create `settings` table in database
- [ ] Create migration for settings schema
- [ ] Implement `get_settings` command
- [ ] Implement `update_settings` command
- [ ] Implement `get_database_size` command
- [ ] Implement `export_database` command

#### Frontend
- [ ] Expand `settings.ts` store with full data model
- [ ] Create `/settings` route
- [ ] Create `SettingsPage` component with tab layout
- [ ] Create `DefaultsSection` component
- [ ] Add settings icon to navigation (Ctrl+6)
- [ ] Implement "Links Visible" toggle UI

**Deliverable**: Basic settings page with defaults section working

---

### Phase 2: Database Management (Week 2)
**Focus**: Database utilities and export

#### Backend
- [ ] Implement database export with file dialog
- [ ] Add database size calculation
- [ ] Create backup creation utility

#### Frontend
- [ ] Create `DatabaseSection` component
- [ ] Display database size with auto-update
- [ ] Implement "Export Database" button with progress
- [ ] Add success/error notifications
- [ ] (Optional) Database size limit warning

**Deliverable**: Functional database export and monitoring

---

### Phase 3: Reset Options (Week 3)
**Focus**: Destructive operations with safety

#### Backend
- [ ] Create `reset_reading_progress` command (by scope)
- [ ] Create `reset_marks` command (by scope)
- [ ] Create `reset_flashcards` command (by scope)
- [ ] Create `reset_flashcard_stats` command
- [ ] Create `reset_all` command (nuclear option)
- [ ] Add transaction support for atomic resets
- [ ] Implement rollback on error

#### Frontend
- [ ] Create `ResetSection` component
- [ ] Implement scope selector (Library/Folder/Text)
- [ ] Create multi-step confirmation dialogs
- [ ] Add "Export first" prompt
- [ ] Implement progress indicators
- [ ] Add success/error handling
- [ ] Create "Reset All" with triple confirmation

**Deliverable**: Safe, user-friendly reset operations

---

### Phase 4: Theme Basics (Week 4)
**Focus**: Adaptive theme and basic colors

#### Frontend
- [ ] Create `ThemeSection` component
- [ ] Implement adaptive theme toggle
- [ ] Add OS theme detection
- [ ] Create color picker components
- [ ] Implement CSS variable injection
- [ ] Add basic color customization:
  - [ ] Body text color
  - [ ] Background color
  - [ ] Button colors
  - [ ] Link colors
- [ ] Add light/dark mode preview
- [ ] Persist theme settings

**Deliverable**: Basic theme customization working

---

### Phase 5: Advanced Theme (Week 5)
**Focus**: Comprehensive color and font control

#### Frontend
- [ ] Add all UI element color customization
- [ ] Implement marked text color controls
- [ ] Implement selected text color controls
- [ ] Add font family selector with previews
- [ ] Add font size controls
- [ ] Implement UI zoom slider
- [ ] Add "Show Tips" toggle
- [ ] Create theme preset system
- [ ] Add "Reset to Default" theme button

**Deliverable**: Complete theme customization

---

### Phase 6: Keyboard Shortcuts (Week 6-7)
**Focus**: Customizable keyboard shortcuts

#### Backend
- [ ] Create `keyboard_shortcuts` table
- [ ] Create action registry system
- [ ] Implement shortcut validation
- [ ] Create conflict detection algorithm

#### Frontend
- [ ] Create `KeyboardShortcutsSection` component
- [ ] Build action registry from existing shortcuts
- [ ] Implement shortcut capture UI
- [ ] Add conflict detection and warnings
- [ ] Create shortcut editor dialog
- [ ] Implement category filtering
- [ ] Add search/filter for actions
- [ ] Create "Reset to Defaults" option
- [ ] Add export/import shortcuts feature
- [ ] Update all keyboard event handlers to use registry

#### Core Architecture Changes
- [ ] Centralize keyboard handling
- [ ] Create `useKeyboardShortcuts` hook v2
- [ ] Migrate all hardcoded shortcuts
- [ ] Add shortcut context system

**Deliverable**: Fully customizable keyboard shortcuts

---

### Phase 7: Testing & Polish (Week 8)
**Focus**: Integration testing and UX refinement

- [ ] Test all settings persistence
- [ ] Test database export on all platforms
- [ ] Test reset operations thoroughly
- [ ] Test theme with all combinations
- [ ] Test keyboard shortcut conflicts
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Documentation update
- [ ] Keyboard shortcuts help update
- [ ] Settings migration guide

**Deliverable**: Production-ready settings system

---

## Data Models

### Settings Store (TypeScript)

```typescript
interface SettingsState {
  // Existing
  linksEnabled: boolean;
  fontSize: number;
  flashcardSidebarCollapsed: boolean;

  // Defaults
  defaultLinksVisible: boolean;

  // Database
  databaseSizeLimit: number | null; // bytes, null = unlimited
  autoBackup: boolean;

  // Theme
  theme: 'light' | 'dark' | 'adaptive';
  customColors: ThemeColors;
  fontFamily: {
    ui: string;
    reading: string;
    code: string;
  };
  baseFontSize: number; // rem
  uiZoom: number; // percentage
  showTips: boolean;

  // Keyboard Shortcuts
  shortcuts: Record<ActionId, KeyBinding>;

  // Actions
  updateDefaults: (defaults: Partial<Defaults>) => void;
  updateTheme: (theme: Partial<ThemeSettings>) => void;
  updateShortcut: (actionId: ActionId, binding: KeyBinding) => void;
  resetShortcuts: () => void;
  exportSettings: () => Promise<void>;
  importSettings: (settings: SettingsState) => void;
}

interface ThemeColors {
  light: ColorScheme;
  dark: ColorScheme;
}

interface ColorScheme {
  bodyText: string;
  background: string;
  buttons: {
    default: string;
    hover: string;
    active: string;
  };
  headers: string;
  icons: string;
  links: {
    default: string;
    visited: string;
    hover: string;
  };
  markedText: {
    background: string;
    foreground: string;
  };
  selectedText: {
    background: string;
    foreground: string;
  };
  // ... more elements
}

interface KeyBinding {
  key: string;
  modifiers: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
  context?: 'global' | 'reading' | 'review' | 'create' | 'ingest';
}

type ActionId =
  | 'navigate.dashboard'
  | 'navigate.library'
  | 'navigate.create'
  | 'navigate.review'
  | 'navigate.ingest'
  | 'view.toggleSidebar'
  | 'view.showHelp'
  | 'reading.editMode'
  // ... all 54 actions
```

### Database Schema (SQLite)

```sql
-- Settings table (for server-side settings)
CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Keyboard shortcuts (for conflict detection & backup)
CREATE TABLE keyboard_shortcuts (
  action_id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL,
  ctrl INTEGER DEFAULT 0,
  shift INTEGER DEFAULT 0,
  alt INTEGER DEFAULT 0,
  meta INTEGER DEFAULT 0,
  context TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Theme presets (for sharing/backup)
CREATE TABLE theme_presets (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  colors TEXT NOT NULL, -- JSON
  fonts TEXT NOT NULL, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## File Structure

```
src/
├── routes/
│   └── settings/
│       └── index.tsx                # Main settings page
├── lib/
│   ├── components/
│   │   └── settings/
│   │       ├── SettingsLayout.tsx   # Tab layout wrapper
│   │       ├── DefaultsSection.tsx
│   │       ├── DatabaseSection.tsx
│   │       ├── ResetSection.tsx
│   │       ├── ThemeSection.tsx
│   │       ├── KeyboardSection.tsx
│   │       ├── ColorPicker.tsx
│   │       ├── FontSelector.tsx
│   │       ├── ShortcutEditor.tsx
│   │       └── ConfirmationDialog.tsx
│   ├── stores/
│   │   ├── settings.ts              # Expanded settings store
│   │   └── keyboardShortcuts.ts     # New: shortcut registry
│   ├── utils/
│   │   ├── theme.ts                 # Theme application utilities
│   │   └── shortcuts.ts             # Shortcut utilities
│   └── types/
│       └── settings.ts              # Settings type definitions
src-tauri/
├── src/
│   └── commands/
│       └── settings.rs              # New: settings commands
└── migrations/
    └── YYYYMMDDHHMMSS_create_settings.sql
```

---

## UI/UX Design

### Settings Page Layout

```
┌─────────────────────────────────────────────────────┐
│  Settings                                      [X]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Defaults] [Database] [Reset] [Theme] [Shortcuts] │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │                                             │  │
│  │  Section Content                            │  │
│  │  (Scrollable)                               │  │
│  │                                             │  │
│  │  • Toggle switches                          │  │
│  │  • Sliders                                  │  │
│  │  • Color pickers                            │  │
│  │  • Dropdowns                                │  │
│  │  • Buttons                                  │  │
│  │                                             │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│                    [Export Settings] [Reset All]   │
└─────────────────────────────────────────────────────┘
```

### Navigation
- **Global Shortcut**: Ctrl+6 / Cmd+6
- **Sidebar Icon**: Settings (gear icon)
- **Tab Navigation**: Arrow keys or click

---

## Risk Assessment

### High Risk
1. **Database Size Limit**: Data loss potential - implement warnings only
2. **Reset Operations**: Irreversible - require multiple confirmations
3. **Keyboard Shortcut Migration**: Breaking changes - careful rollout
4. **Theme CSS Injection**: Performance impact - optimize CSS variables

### Medium Risk
1. **Database Export**: Platform differences - extensive testing needed
2. **Conflict Detection**: Edge cases - thorough validation required
3. **Settings Migration**: Version compatibility - migration system needed

### Low Risk
1. **Defaults Section**: Simple toggles
2. **Basic Theme**: CSS variables well-supported
3. **Font Selection**: Standard web fonts

---

## Testing Strategy

### Unit Tests
- Shortcut conflict detection algorithm
- Theme color validation
- Settings persistence
- Reset scope calculation

### Integration Tests
- Database export/import flow
- Theme application across views
- Keyboard shortcut registration
- Settings migration between versions

### Manual Testing
- All reset operations with various scopes
- Database export on macOS/Windows/Linux
- Theme switching with custom colors
- Shortcut conflicts and warnings
- Performance with large databases

---

## Success Criteria

### Phase 1
- [ ] Settings page accessible via Ctrl+6
- [ ] Defaults section displays current settings
- [ ] Link visibility toggle works

### Phase 2
- [ ] Database size displays correctly
- [ ] Database export creates valid SQLite file
- [ ] Export works on all platforms

### Phase 3
- [ ] All reset operations work correctly
- [ ] Confirmation dialogs prevent accidents
- [ ] Reset operations are atomic (all-or-nothing)

### Phase 4-5
- [ ] Adaptive theme follows OS preference
- [ ] Custom colors apply across entire app
- [ ] Font changes reflect immediately
- [ ] UI zoom works smoothly

### Phase 6
- [ ] All 54 actions are customizable
- [ ] Conflict detection prevents duplicates
- [ ] Custom shortcuts persist across sessions
- [ ] Reset to defaults works correctly

### Phase 7
- [ ] All settings persist correctly
- [ ] No performance degradation
- [ ] Accessibility score maintained
- [ ] Documentation complete

---

## Recommendations

### Prioritization (Most Important → Least)

1. **Phase 1 (Defaults)** - Quick win, user-facing
2. **Phase 2 (Database)** - Essential for backups
3. **Phase 3 (Reset)** - Critical for data management
4. **Phase 4 (Theme Basics)** - High user value
5. **Phase 5 (Advanced Theme)** - Nice to have
6. **Phase 6 (Shortcuts)** - Power users, very complex

### Defer to Future
- Database size limit enforcement (warning only for now)
- Theme preset sharing
- Settings sync across devices
- Advanced font rendering options

### Alternative Approach: MVP First

If time is limited, implement in this order:

1. **Week 1**: Defaults + Database Export
2. **Week 2**: Basic Theme (adaptive only)
3. **Week 3**: Reset Options
4. **Week 4**: Polish + Testing

Then iterate with:
- Advanced theme customization
- Keyboard shortcuts (most complex)

---

## Implementation Timeline

### Aggressive (6 weeks)
- Skip advanced theme features
- Basic keyboard customization only
- Minimal polish

### Recommended (8 weeks)
- All features except deferred items
- Proper testing
- Documentation

### Comprehensive (10 weeks)
- All features including deferred
- Extensive testing
- User onboarding
- Settings migration system

---

## Dependencies

### External Libraries (Potential)
- `react-color` or `@radix-ui/react-popover` - Color picker
- `react-hotkeys-hook` - Keyboard management (or build custom)
- `file-saver` - Database export helper

### Tauri APIs
- `@tauri-apps/api/fs` - File system operations
- `@tauri-apps/api/dialog` - File dialogs
- `@tauri-apps/api/path` - Path resolution

---

## Notes

- Settings should be versioned for migration
- Export settings as JSON for portability
- Consider settings import/export for backup
- Some settings require app restart (fonts?)
- Theme changes should be instant (no reload)
- Keyboard shortcuts need global event listener optimization

---

**Last Updated**: 2025-10-18
**Phase Status**: Planning Complete, Ready for Implementation
