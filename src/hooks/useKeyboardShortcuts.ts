import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'actions' | 'view' | 'ingest' | 'review';
}

interface UseKeyboardShortcutsOptions {
  shortcuts?: KeyboardShortcut[];
  enabled?: boolean;
}

const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { shortcuts = [], enabled = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      for (const shortcut of shortcuts) {
        const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey ? modifierKey : !modifierKey;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.altKey ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useGlobalShortcuts(onToggleSidebar: () => void, onToggleHelp: () => void) {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => () => navigate(path);

  const globalShortcuts: KeyboardShortcut[] = [
    {
      key: 'b',
      ctrlKey: true,
      action: onToggleSidebar,
      description: 'Toggle sidebar',
      category: 'view',
    },
    {
      key: '1',
      ctrlKey: true,
      action: handleNavigation('/'),
      description: 'Go to Dashboard',
      category: 'navigation',
    },
    {
      key: '2',
      ctrlKey: true,
      action: handleNavigation('/library'),
      description: 'Go to Library',
      category: 'navigation',
    },
    {
      key: 'n',
      ctrlKey: true,
      action: handleNavigation('/ingest'),
      description: 'Open ingest view',
      category: 'actions',
    },
    {
      key: '/',
      ctrlKey: true,
      action: onToggleHelp,
      description: 'Show keyboard shortcuts',
      category: 'view',
    },
  ];

  const ingestShortcuts: KeyboardShortcut[] = [
    {
      key: 'Escape',
      action: () => {},
      description: 'Close/cancel ingest',
      category: 'ingest',
    },
    {
      key: 'Enter',
      shiftKey: true,
      action: () => {},
      description: 'Submit/import text',
      category: 'ingest',
    },
    {
      key: 'E',
      ctrlKey: true,
      shiftKey: true,
      action: () => {},
      description: 'Exclude selection from progress',
      category: 'ingest',
    },
  ];

  const reviewShortcuts: KeyboardShortcut[] = [
    {
      key: 'Space',
      action: () => {},
      description: 'Toggle answer',
      category: 'review',
    },
    {
      key: '1',
      action: () => {},
      description: 'Grade card: Again',
      category: 'review',
    },
    {
      key: '2',
      action: () => {},
      description: 'Grade card: Hard',
      category: 'review',
    },
    {
      key: '3',
      action: () => {},
      description: 'Grade card: Good',
      category: 'review',
    },
    {
      key: '4',
      action: () => {},
      description: 'Grade card: Easy',
      category: 'review',
    },
  ];

  useKeyboardShortcuts({ shortcuts: globalShortcuts });

  return [...globalShortcuts, ...ingestShortcuts, ...reviewShortcuts];
}

export function getShortcutLabel(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrlKey || shortcut.metaKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shiftKey) {
    parts.push('Shift');
  }
  if (shortcut.altKey) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  parts.push(shortcut.key.toUpperCase());

  return parts.join(' + ');
}
