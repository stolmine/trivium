/**
 * Shortcut Registry - Central definition of all keyboard shortcuts.
 *
 * This is the single source of truth for all shortcuts in the application.
 * Add new shortcuts here to make them available throughout the app.
 *
 * See: HOTKEY_CUSTOMIZATION_DESIGN.md for architecture details
 */

import type { ShortcutDefinition } from './types';

/**
 * Complete registry of all keyboard shortcuts in Trivium.
 *
 * Guidelines for adding shortcuts:
 * - Use 'Mod' for platform-agnostic Cmd (Mac) / Ctrl (Windows/Linux)
 * - Be specific with scope (prevents conflicts)
 * - Add good descriptions (shown in help dialog)
 * - Use 'when' conditions for context-dependent shortcuts
 * - Mark critical shortcuts as 'defaultOnly: true'
 */
export const SHORTCUT_REGISTRY: ShortcutDefinition[] = [
  // ==========================================================================
  // GLOBAL SHORTCUTS - Active everywhere
  // ==========================================================================

  {
    id: 'global.toggleSidebar',
    key: 'b',
    modifiers: ['Mod'],
    description: 'Toggle sidebar',
    category: 'view',
    scope: 'global',
  },

  {
    id: 'global.toggleLinks',
    key: 'l',
    modifiers: ['Mod'],
    description: 'Toggle clickable links in reading view',
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

  {
    id: 'global.goToReview',
    key: '2',
    modifiers: ['Mod'],
    description: 'Go to Review',
    category: 'navigation',
    scope: 'global',
  },

  {
    id: 'global.goToCreate',
    key: '3',
    modifiers: ['Mod'],
    description: 'Go to Create Cards',
    category: 'navigation',
    scope: 'global',
  },

  {
    id: 'global.goToLibrary',
    key: '4',
    modifiers: ['Mod'],
    description: 'Go to Library',
    category: 'navigation',
    scope: 'global',
  },

  {
    id: 'global.openIngest',
    key: 'n',
    modifiers: ['Mod'],
    description: 'Open ingest view',
    category: 'actions',
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

  // ==========================================================================
  // REVIEW SESSION SHORTCUTS
  // ==========================================================================

  {
    id: 'review.toggleAnswer',
    key: ' ',
    description: 'Toggle answer visibility',
    category: 'review',
    scope: 'review',
  },

  {
    id: 'review.gradeAgain',
    key: '1',
    description: 'Grade card: Again',
    category: 'review',
    scope: 'review',
    when: 'answerVisible',
  },

  {
    id: 'review.gradeHard',
    key: '2',
    description: 'Grade card: Hard',
    category: 'review',
    scope: 'review',
    when: 'answerVisible',
  },

  {
    id: 'review.gradeGood',
    key: '3',
    description: 'Grade card: Good',
    category: 'review',
    scope: 'review',
    when: 'answerVisible',
  },

  {
    id: 'review.gradeEasy',
    key: '4',
    description: 'Grade card: Easy',
    category: 'review',
    scope: 'review',
    when: 'answerVisible',
  },

  // ==========================================================================
  // INGEST PAGE SHORTCUTS
  // ==========================================================================

  {
    id: 'ingest.cancel',
    key: 'Escape',
    description: 'Close/cancel ingest',
    category: 'actions',
    scope: 'ingest',
    defaultOnly: true, // Escape should not be customizable
  },

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
    when: 'contentFocused',
  },

  {
    id: 'ingest.undo',
    key: 'z',
    modifiers: ['Mod'],
    description: 'Undo last change',
    category: 'editing',
    scope: 'ingest',
    when: 'contentFocused',
  },

  {
    id: 'ingest.redo',
    key: 'z',
    modifiers: ['Mod', 'Shift'],
    description: 'Redo last undone change',
    category: 'editing',
    scope: 'ingest',
    when: 'contentFocused',
  },

  {
    id: 'ingest.redoAlt',
    key: 'y',
    modifiers: ['Mod'],
    description: 'Redo last undone change (alternative)',
    category: 'editing',
    scope: 'ingest',
    when: 'contentFocused',
  },

  // ==========================================================================
  // READING PAGE SHORTCUTS
  // ==========================================================================

  {
    id: 'reading.undo',
    key: 'z',
    modifiers: ['Mod'],
    description: 'Undo last change',
    category: 'editing',
    scope: 'reading',
    when: '!editing && !inlineEditActive && !editRegion && !inlineEditRegion',
  },

  {
    id: 'reading.redo',
    key: 'z',
    modifiers: ['Mod', 'Shift'],
    description: 'Redo last undone change',
    category: 'editing',
    scope: 'reading',
    when: '!editing && !inlineEditActive && !editRegion && !inlineEditRegion',
  },

  {
    id: 'reading.activateEdit',
    key: 'e',
    modifiers: ['Mod'],
    description: 'Activate inline edit mode',
    category: 'editing',
    scope: 'reading',
    when: '!editing && !inlineEditActive && !editRegion && !inlineEditRegion',
  },

  {
    id: 'reading.saveEdit',
    key: 's',
    modifiers: ['Mod'],
    description: 'Save inline edit',
    category: 'editing',
    scope: 'reading',
    when: 'inlineEditActive',
  },

  {
    id: 'reading.markAsRead',
    key: 'm',
    modifiers: ['Mod'],
    description: 'Mark selection as read',
    category: 'actions',
    scope: 'reading',
    when: 'hasSelection && !editRegion',
  },

  {
    id: 'reading.find',
    key: 'f',
    modifiers: ['Mod'],
    description: 'Find in page',
    category: 'search',
    scope: 'reading',
  },

  {
    id: 'reading.closeSearch',
    key: 'Escape',
    description: 'Close search',
    category: 'search',
    scope: 'reading',
    when: 'searchOpen',
  },

  {
    id: 'reading.cancelInlineEdit',
    key: 'Escape',
    description: 'Cancel inline edit',
    category: 'editing',
    scope: 'reading',
    when: 'inlineEditActive',
    defaultOnly: true,
  },

  {
    id: 'reading.cancelEditRegion',
    key: 'Escape',
    description: 'Cancel region edit',
    category: 'editing',
    scope: 'reading',
    when: 'editRegion',
    defaultOnly: true,
  },

  {
    id: 'reading.cancelInlineEditRegion',
    key: 'Escape',
    description: 'Cancel inline region edit',
    category: 'editing',
    scope: 'reading',
    when: 'inlineEditRegion',
    defaultOnly: true,
  },

  // ==========================================================================
  // CREATE PAGE SHORTCUTS
  // ==========================================================================

  {
    id: 'create.showHelp',
    key: '?',
    description: 'Show help',
    category: 'view',
    scope: 'create',
  },

  {
    id: 'create.closeHelp',
    key: 'Escape',
    description: 'Close help dialog',
    category: 'view',
    scope: 'create',
    when: 'helpOpen',
    defaultOnly: true,
  },

  {
    id: 'create.closeHelpAlt',
    key: 'Enter',
    description: 'Close help dialog (alternative)',
    category: 'view',
    scope: 'create',
    when: 'helpOpen',
    defaultOnly: true,
  },

  {
    id: 'create.previousMark',
    key: 'ArrowLeft',
    description: 'Go to previous mark',
    category: 'navigation',
    scope: 'create',
  },

  {
    id: 'create.previousMarkAlt',
    key: 'k',
    modifiers: ['Mod'],
    description: 'Go to previous mark (alternative)',
    category: 'navigation',
    scope: 'create',
  },

  {
    id: 'create.nextMark',
    key: 'ArrowRight',
    description: 'Go to next mark',
    category: 'navigation',
    scope: 'create',
  },

  {
    id: 'create.nextMarkAlt',
    key: 'j',
    modifiers: ['Mod'],
    description: 'Go to next mark (alternative)',
    category: 'navigation',
    scope: 'create',
  },

  {
    id: 'create.toggleMarks',
    key: 'B',
    modifiers: ['Shift'],
    description: 'Toggle between marks',
    category: 'view',
    scope: 'create',
  },

  {
    id: 'create.selectScope1',
    key: '1',
    description: 'Select first scope option',
    category: 'actions',
    scope: 'create',
    when: 'scopeSelectorOpen',
  },

  {
    id: 'create.selectScope2',
    key: '2',
    description: 'Select second scope option',
    category: 'actions',
    scope: 'create',
    when: 'scopeSelectorOpen',
  },

  // ==========================================================================
  // MODAL SHORTCUTS - Universal escape key
  // ==========================================================================

  {
    id: 'modal.close',
    key: 'Escape',
    description: 'Close modal or cancel',
    category: 'actions',
    scope: 'modal',
    defaultOnly: true,
  },
];

/**
 * Get all shortcuts for a specific scope.
 */
export function getShortcutsForScope(scope: string): ShortcutDefinition[] {
  return SHORTCUT_REGISTRY.filter(s => s.scope === scope);
}

/**
 * Get a shortcut by its ID.
 */
export function getShortcutById(id: string): ShortcutDefinition | undefined {
  return SHORTCUT_REGISTRY.find(s => s.id === id);
}

/**
 * Get all shortcuts in a category.
 */
export function getShortcutsByCategory(category: string): ShortcutDefinition[] {
  return SHORTCUT_REGISTRY.filter(s => s.category === category);
}

/**
 * Get all customizable shortcuts (not defaultOnly).
 */
export function getCustomizableShortcuts(): ShortcutDefinition[] {
  return SHORTCUT_REGISTRY.filter(s => !s.defaultOnly);
}

/**
 * Validate the registry for common issues.
 * Useful for catching configuration errors during development.
 */
export function validateRegistry(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const keyCombosByScope = new Map<string, Set<string>>();

  for (const shortcut of SHORTCUT_REGISTRY) {
    // Check for duplicate IDs
    if (ids.has(shortcut.id)) {
      errors.push(`Duplicate shortcut ID: ${shortcut.id}`);
    }
    ids.add(shortcut.id);

    // Check for duplicate key combos in same scope (without when clause)
    if (!shortcut.when) {
      const keyCombo = `${shortcut.modifiers?.join('+') || ''}+${shortcut.key}`;
      const scopeKey = shortcut.scope;

      if (!keyCombosByScope.has(scopeKey)) {
        keyCombosByScope.set(scopeKey, new Set());
      }

      const combosInScope = keyCombosByScope.get(scopeKey)!;
      if (combosInScope.has(keyCombo)) {
        errors.push(
          `Duplicate key combo in scope '${scopeKey}': ${keyCombo} (${shortcut.id})`
        );
      }
      combosInScope.add(keyCombo);
    }

    // Check for missing required fields
    if (!shortcut.description) {
      errors.push(`Missing description: ${shortcut.id}`);
    }
    if (!shortcut.category) {
      errors.push(`Missing category: ${shortcut.id}`);
    }
  }

  return errors;
}

/**
 * Development helper: Log registry validation errors.
 * Call this in development mode to catch issues early.
 */
export function logRegistryValidation(): void {
  const errors = validateRegistry();
  if (errors.length > 0) {
    console.error('Shortcut Registry Validation Errors:');
    errors.forEach(error => console.error(`  - ${error}`));
  } else {
    console.log('Shortcut Registry: OK');
  }
}
