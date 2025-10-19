/**
 * Theme utility for managing light, dark, and adaptive theme modes
 */

export type ThemeMode = 'light' | 'dark' | 'adaptive';

/**
 * Detects the current system theme preference
 * @returns 'dark' if system prefers dark mode, otherwise 'light'
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Applies the theme to the document root element
 * @param mode - The theme mode to apply ('light', 'dark', or 'adaptive')
 */
export function applyTheme(mode: ThemeMode): void {
  console.log('[theme.ts] applyTheme called with mode:', mode);

  if (typeof window === 'undefined') {
    console.log('[theme.ts] Window undefined, returning early');
    return;
  }

  const root = document.documentElement;
  console.log('[theme.ts] document.documentElement:', root);

  const effectiveTheme = mode === 'adaptive' ? getSystemTheme() : mode;
  console.log('[theme.ts] Effective theme (after adaptive check):', effectiveTheme);
  console.log('[theme.ts] classList BEFORE modification:', root.classList.toString());

  if (effectiveTheme === 'dark') {
    console.log('[theme.ts] Adding "dark" class to HTML element');
    root.classList.add('dark');
  } else {
    console.log('[theme.ts] Removing "dark" class from HTML element');
    root.classList.remove('dark');
  }

  console.log('[theme.ts] classList AFTER modification:', root.classList.toString());
  console.log('[theme.ts] Has dark class:', root.classList.contains('dark'));
}

/**
 * Sets up a listener for system theme changes
 * Only active when theme mode is set to 'adaptive'
 * @param callback - Function to call when system theme changes
 * @returns Cleanup function to remove the listener
 */
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e: MediaQueryListEvent | MediaQueryList) => {
    const theme = e.matches ? 'dark' : 'light';
    callback(theme);
  };

  // Use addEventListener for modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }
}

/**
 * Initializes the theme system
 * @param mode - The theme mode to initialize with
 * @returns Cleanup function to remove event listeners
 */
export function initializeTheme(mode: ThemeMode): () => void {
  console.log('[theme.ts] initializeTheme called with mode:', mode);

  // Apply the initial theme
  applyTheme(mode);

  // If adaptive mode, watch for system theme changes
  if (mode === 'adaptive') {
    console.log('[theme.ts] Setting up system theme watcher for adaptive mode');
    return watchSystemTheme((systemTheme) => {
      console.log('[theme.ts] System theme changed to:', systemTheme);
      const root = document.documentElement;
      if (systemTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      console.log('[theme.ts] classList after system theme change:', root.classList.toString());
    });
  }

  console.log('[theme.ts] Not adaptive mode, no watcher needed');
  // No cleanup needed if not in adaptive mode
  return () => {};
}

/**
 * Injects custom CSS color variables into the document
 * @param colors - Object containing CSS variable names and their values
 * @param isDark - Whether this is for dark mode
 */
export function injectCustomColors(
  colors: Record<string, string>,
  isDark: boolean = false
): void {
  if (typeof window === 'undefined') return;

  const selector = isDark ? '.dark' : ':root';

  // Create or update a style element for custom colors
  const styleId = isDark ? 'custom-theme-dark' : 'custom-theme-light';
  let styleElement = document.getElementById(styleId) as HTMLStyleElement;

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }

  // Build CSS from the colors object
  const cssVariables = Object.entries(colors)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  styleElement.textContent = `
${selector} {
${cssVariables}
}
`;
}

/**
 * Removes custom color injections
 */
export function removeCustomColors(): void {
  if (typeof window === 'undefined') return;

  const lightStyle = document.getElementById('custom-theme-light');
  const darkStyle = document.getElementById('custom-theme-dark');

  if (lightStyle) lightStyle.remove();
  if (darkStyle) darkStyle.remove();
}
