/**
 * Type definitions for the keyboard shortcut customization system.
 *
 * This file defines the core types used throughout the shortcut system.
 * These types are designed to support the future customization feature
 * while being usable in the current implementation.
 */

// ============================================================================
// Modifiers and Keys
// ============================================================================

/**
 * Keyboard modifier keys.
 *
 * - 'Mod': Platform-agnostic modifier (Cmd on Mac, Ctrl on Windows/Linux)
 * - 'Ctrl': Control key (physical key, not platform-agnostic)
 * - 'Alt': Alt/Option key
 * - 'Shift': Shift key
 * - 'Meta': Command key on Mac, Windows key on Windows
 */
export type Modifier = 'Mod' | 'Ctrl' | 'Alt' | 'Shift' | 'Meta';

/**
 * Platform identifier.
 */
export type Platform = 'mac' | 'windows' | 'linux';

// ============================================================================
// Shortcut Categories and Scopes
// ============================================================================

/**
 * Categories for organizing shortcuts in the settings UI.
 */
export type ShortcutCategory =
  | 'navigation'  // Moving between pages/sections
  | 'actions'     // Creating/modifying content
  | 'view'        // UI visibility toggles
  | 'editing'     // Text editing operations
  | 'review'      // Flashcard review
  | 'search';     // Search and find operations

/**
 * Scope determines where a shortcut is active.
 *
 * Shortcuts are only active when the application is in the matching scope.
 * This prevents conflicts between different parts of the application.
 */
export type ShortcutScope =
  | 'global'   // Active everywhere in the application
  | 'reading'  // Active on /read/[id] page
  | 'review'   // Active on /review/session page
  | 'ingest'   // Active on /ingest page
  | 'create'   // Active on /create page
  | 'library'  // Active on /library page
  | 'modal';   // Active when any modal/dialog is open

// ============================================================================
// Core Shortcut Definition
// ============================================================================

/**
 * Defines a keyboard shortcut.
 *
 * This is the canonical definition used in the shortcut registry.
 * It describes a shortcut's key binding, behavior, and context.
 */
export interface ShortcutDefinition {
  /**
   * Unique identifier for this shortcut.
   * Format: 'scope.action' (e.g., 'global.toggleSidebar', 'review.gradeGood')
   */
  id: string;

  /**
   * The key to press (e.g., 'b', 'Escape', 'ArrowLeft', ' ').
   * Case-sensitive. Special keys should use standard key names.
   */
  key: string;

  /**
   * Optional modifier keys that must be pressed with the key.
   * Use 'Mod' for platform-agnostic Cmd/Ctrl.
   */
  modifiers?: Modifier[];

  /**
   * Human-readable description of what this shortcut does.
   * Shown in help dialogs and settings UI.
   */
  description: string;

  /**
   * Category for organizing in settings UI.
   */
  category: ShortcutCategory;

  /**
   * Scope where this shortcut is active.
   */
  scope: ShortcutScope;

  /**
   * Optional condition that must be true for shortcut to trigger.
   *
   * Simple boolean expression using context variables.
   * Examples:
   *   - 'editing' - only when editing
   *   - '!editing' - only when NOT editing
   *   - 'hasSelection && !editing' - has selection and not editing
   */
  when?: string;

  /**
   * If true, this shortcut cannot be customized by the user.
   * Use for critical shortcuts like Escape to close modals.
   */
  defaultOnly?: boolean;

  /**
   * Optional platform restrictions.
   * If specified, shortcut only works on these platforms.
   * If omitted, works on all platforms.
   */
  platforms?: Platform[];
}

// ============================================================================
// User Preferences
// ============================================================================

/**
 * User's custom shortcut binding.
 *
 * Overrides the default key/modifiers for a specific shortcut.
 * The shortcut ID must match an existing ShortcutDefinition.
 */
export interface ShortcutOverride {
  /**
   * ID of the shortcut being overridden.
   * Must match a ShortcutDefinition.id in the registry.
   */
  id: string;

  /**
   * Custom key for this shortcut.
   */
  key: string;

  /**
   * Custom modifiers for this shortcut.
   */
  modifiers?: Modifier[];
}

/**
 * Complete user preferences for keyboard shortcuts.
 *
 * Stored in localStorage and merged with default registry.
 */
export interface ShortcutPreferences {
  /**
   * Version number for migration compatibility.
   * Increment when preferences structure changes.
   */
  version: number;

  /**
   * User's custom key bindings.
   * Map from shortcut ID to override.
   */
  overrides: Record<string, ShortcutOverride>;

  /**
   * IDs of shortcuts the user has disabled.
   */
  disabled: string[];
}

// ============================================================================
// Resolved Shortcuts
// ============================================================================

/**
 * A shortcut after resolving defaults + user overrides.
 *
 * This is what the application actually uses at runtime.
 * Includes metadata about customization state.
 */
export interface ResolvedShortcut extends ShortcutDefinition {
  /**
   * True if the user has customized this shortcut.
   */
  isOverridden: boolean;

  /**
   * True if the user has disabled this shortcut.
   */
  isDisabled: boolean;

  /**
   * The actual key after applying overrides and platform translation.
   */
  effectiveKey: string;

  /**
   * The actual modifiers after applying overrides and platform translation.
   * 'Mod' is translated to 'Meta' (Mac) or 'Ctrl' (Windows/Linux).
   */
  effectiveModifiers: Modifier[];
}

// ============================================================================
// Conflicts
// ============================================================================

/**
 * Severity of a shortcut conflict.
 */
export type ConflictSeverity = 'error' | 'warning';

/**
 * Describes a conflict between shortcuts.
 */
export interface ShortcutConflict {
  /**
   * The shortcut being defined that conflicts.
   */
  newShortcut: ShortcutDefinition;

  /**
   * Existing shortcuts that conflict with the new one.
   */
  conflictingWith: ResolvedShortcut[];

  /**
   * How severe the conflict is.
   *
   * - 'error': Must be resolved (same scope, same key combo, overlapping when conditions)
   * - 'warning': Should be aware (global vs scoped, browser defaults)
   */
  severity: ConflictSeverity;

  /**
   * Human-readable explanation of the conflict.
   */
  message: string;
}

// ============================================================================
// Context System
// ============================================================================

/**
 * Runtime context for evaluating 'when' conditions.
 *
 * Each scope has different available context variables.
 */
export interface ShortcutContext {
  /**
   * Current active scope.
   */
  scope: ShortcutScope;

  /**
   * Boolean conditions for evaluating 'when' clauses.
   * Keys are variable names, values are their current state.
   */
  conditions: Record<string, boolean>;
}

/**
 * Global context variables (available everywhere).
 */
export interface GlobalContext {
  sidebarOpen: boolean;
  modalOpen: boolean;
  inputFocused: boolean;
}

/**
 * Reading page context variables.
 */
export interface ReadingContext extends GlobalContext {
  editing: boolean;
  hasSelection: boolean;
  searchOpen: boolean;
  inlineEditActive: boolean;
  editRegion: boolean;
  inlineEditRegion: boolean;
}

/**
 * Review session context variables.
 */
export interface ReviewContext extends GlobalContext {
  answerVisible: boolean;
  cardGraded: boolean;
  sessionComplete: boolean;
}

/**
 * Ingest page context variables.
 */
export interface IngestContext extends GlobalContext {
  titleValid: boolean;
  contentValid: boolean;
  fetching: boolean;
}

/**
 * Create page context variables.
 */
export interface CreateContext extends GlobalContext {
  hasMarks: boolean;
  previewMode: boolean;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Function that handles a keyboard shortcut.
 */
export type ShortcutHandler = (event: KeyboardEvent) => void;

/**
 * Map of shortcut IDs to handlers.
 * Used when registering multiple shortcuts at once.
 */
export type ShortcutHandlers = Record<string, () => void>;

// ============================================================================
// Event Matching
// ============================================================================

/**
 * Normalized keyboard event for matching against shortcuts.
 */
export interface NormalizedKeyEvent {
  /**
   * Normalized key name.
   */
  key: string;

  /**
   * Active modifiers (already translated from Mod if needed).
   */
  modifiers: Set<Modifier>;

  /**
   * Original keyboard event.
   */
  originalEvent: KeyboardEvent;
}

// ============================================================================
// Condition Parsing (for 'when' clauses)
// ============================================================================

/**
 * AST node types for condition expressions.
 */
export type ConditionNode =
  | { type: 'variable'; name: string }
  | { type: 'not'; operand: ConditionNode }
  | { type: 'and'; left: ConditionNode; right: ConditionNode }
  | { type: 'or'; left: ConditionNode; right: ConditionNode };

// ============================================================================
// Settings UI (Future)
// ============================================================================

/**
 * Data needed to render shortcut in settings UI.
 */
export interface ShortcutSettingsItem {
  definition: ShortcutDefinition;
  resolved: ResolvedShortcut;
  conflicts: ShortcutConflict[];
  canCustomize: boolean;  // false if defaultOnly
  canReset: boolean;      // true if overridden or disabled
}

/**
 * Grouped shortcuts for settings UI display.
 */
export interface ShortcutGroup {
  category: ShortcutCategory;
  categoryLabel: string;
  shortcuts: ShortcutSettingsItem[];
}

// ============================================================================
// Import/Export
// ============================================================================

/**
 * Format for exporting/importing shortcut configurations.
 */
export interface ShortcutExport {
  /**
   * Export format version.
   */
  version: number;

  /**
   * When this export was created.
   */
  exportedAt: string;

  /**
   * Platform this export was created on.
   */
  platform: Platform;

  /**
   * The preferences being exported.
   */
  preferences: ShortcutPreferences;
}

// ============================================================================
// Reserved Shortcuts
// ============================================================================

/**
 * Shortcuts that cannot be overridden because they're reserved by browser/OS.
 */
export interface ReservedShortcut {
  key: string;
  modifiers: Modifier[];
  reason: string;  // Why it's reserved (e.g., "Browser: New window")
  platforms?: Platform[];  // If omitted, reserved on all platforms
}
