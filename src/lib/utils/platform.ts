/**
 * Platform detection utilities for cross-platform keyboard shortcut support
 */

/**
 * Detects if the current platform is macOS
 */
export const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

/**
 * Returns the appropriate modifier key label for the current platform
 * @returns "Cmd" on macOS, "Ctrl" on Windows/Linux
 */
export function getModifierKey(): string {
  return isMac ? 'Cmd' : 'Ctrl';
}

/**
 * Returns the appropriate modifier key symbol for the current platform
 * @returns "⌘" on macOS, "Ctrl" on Windows/Linux
 */
export function getModifierSymbol(): string {
  return isMac ? '⌘' : 'Ctrl';
}

/**
 * Returns the appropriate Alt key label for the current platform
 * @returns "Option" on macOS, "Alt" on Windows/Linux
 */
export function getAltKey(): string {
  return isMac ? 'Option' : 'Alt';
}

/**
 * Returns the appropriate Alt key symbol for the current platform
 * @returns "⌥" on macOS, "Alt" on Windows/Linux
 */
export function getAltSymbol(): string {
  return isMac ? '⌥' : 'Alt';
}

/**
 * Formats a keyboard shortcut string for the current platform
 * @param shortcut - Shortcut definition with ctrl, shift, alt, and key
 * @returns Formatted shortcut string (e.g., "Cmd+S" or "Ctrl+S")
 */
export function formatShortcut(shortcut: {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  key: string;
}): string {
  const parts: string[] = [];

  if (shortcut.ctrl) {
    parts.push(getModifierKey());
  }
  if (shortcut.shift) {
    parts.push('Shift');
  }
  if (shortcut.alt) {
    parts.push(getAltKey());
  }

  parts.push(shortcut.key);

  return parts.join('+');
}

/**
 * Formats a keyboard shortcut string using symbols for the current platform
 * @param shortcut - Shortcut definition with ctrl, shift, alt, and key
 * @returns Formatted shortcut string with symbols (e.g., "⌘S" or "Ctrl+S")
 */
export function formatShortcutSymbol(shortcut: {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  key: string;
}): string {
  const parts: string[] = [];

  if (shortcut.ctrl) {
    parts.push(getModifierSymbol());
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(getAltSymbol());
  }

  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? '' : '+');
}
