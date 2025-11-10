/**
 * Platform detection utilities for cross-platform keyboard shortcut support
 * Enhanced with Tauri platform detection for accurate cross-platform behavior
 */

import { platform } from '@tauri-apps/plugin-os';

/**
 * Platform type definitions
 */
export type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

/**
 * Browser-based macOS detection (synchronous)
 * Detects if the current platform is macOS using browser APIs
 */
export const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

/**
 * Cached platform value for performance
 */
let cachedPlatform: Platform | null = null;

/**
 * Get the current platform using Tauri's platform detection
 * Result is cached after first call for performance
 * @returns Platform name ('windows' | 'macos' | 'linux' | 'unknown')
 */
export async function getPlatform(): Promise<Platform> {
  if (cachedPlatform) {
    return cachedPlatform;
  }

  try {
    const os = await platform();
    cachedPlatform = os as Platform;
    return cachedPlatform;
  } catch (error) {
    console.error('Failed to detect platform via Tauri, falling back to browser detection:', error);
    // Fallback to browser detection
    cachedPlatform = isMac ? 'macos' : 'unknown';
    return cachedPlatform;
  }
}

/**
 * Check if running on Windows
 */
export async function isWindows(): Promise<boolean> {
  return (await getPlatform()) === 'windows';
}

/**
 * Check if running on macOS
 */
export async function isMacOS(): Promise<boolean> {
  return (await getPlatform()) === 'macos';
}

/**
 * Check if running on Linux
 */
export async function isLinux(): Promise<boolean> {
  return (await getPlatform()) === 'linux';
}

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

/**
 * Format a simple hotkey string with the correct modifier for the current platform
 * Example: formatHotkey('S') => 'Cmd+S' on macOS, 'Ctrl+S' on Windows/Linux
 * @param key - The key to format (e.g., 'S', 'N', 'F')
 * @returns Formatted hotkey string
 */
export function formatHotkey(key: string): string {
  return `${getModifierKey()}+${key}`;
}

/**
 * Format multiple keys as a hotkey combination
 * Example: formatHotkeyCombo(['Shift', 'S']) => 'Cmd+Shift+S' on macOS
 * @param keys - Array of keys in the combination
 * @returns Formatted hotkey string
 */
export function formatHotkeyCombo(keys: string[]): string {
  return [getModifierKey(), ...keys].join('+');
}

/**
 * React hook for using platform in components
 * Usage: const platform = usePlatform();
 * @returns Current platform ('windows' | 'macos' | 'linux' | 'unknown')
 */
import { useEffect, useState } from 'react';

export function usePlatform(): Platform {
  const [platformState, setPlatformState] = useState<Platform>('unknown');

  useEffect(() => {
    getPlatform().then(setPlatformState);
  }, []);

  return platformState;
}

/**
 * React hook for using modifier key in components
 * Usage: const modifierKey = useModifierKey(); // 'Cmd' or 'Ctrl'
 * @returns Modifier key label for current platform
 */
export function useModifierKey(): string {
  const [modifierKey, setModifierKey] = useState<string>(getModifierKey());

  useEffect(() => {
    getPlatform().then(() => {
      setModifierKey(getModifierKey());
    });
  }, []);

  return modifierKey;
}
