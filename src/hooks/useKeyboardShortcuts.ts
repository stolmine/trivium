import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettingsStore } from '../lib/stores/settings';
import { useNavigationHistory } from '../lib/stores/navigationHistory';
import { useLastReadStore } from '../lib/stores/lastRead';
import type { ReadPageLocationState } from '../lib/types';
import { isMac } from '../lib/utils/platform';

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
  const location = useLocation();
  const { toggleLinks } = useSettingsStore();
  const { goBack, goForward } = useNavigationHistory();
  const { textId, scrollPosition, hasLastRead } = useLastReadStore();

  const handleNavigation = (path: string) => () => navigate(path);

  const handleBackToReading = useCallback(() => {
    if (hasLastRead() && textId) {
      const state: ReadPageLocationState = {
        restoreScrollPosition: scrollPosition
      };
      navigate(`/read/${textId}`, { state });
    }
  }, [hasLastRead, textId, scrollPosition, navigate]);

  const handleHistoryBack = useCallback(() => {
    if (location.pathname.startsWith('/ingest')) {
      return;
    }

    const entry = goBack();
    if (entry) {
      // Add __fromHistory flag to prevent NavigationTracker from pushing duplicate entry
      navigate(entry.pathname, {
        state: { ...(entry.state || {}), __fromHistory: true },
        replace: true
      });
    }
  }, [goBack, navigate, location.pathname]);

  const handleHistoryForward = useCallback(() => {
    if (location.pathname.startsWith('/ingest')) {
      return;
    }

    const entry = goForward();
    if (entry) {
      // Add __fromHistory flag to prevent NavigationTracker from pushing duplicate entry
      navigate(entry.pathname, {
        state: { ...(entry.state || {}), __fromHistory: true },
        replace: true
      });
    }
  }, [goForward, navigate, location.pathname]);

  const globalShortcuts: KeyboardShortcut[] = [
    {
      key: '[',
      ctrlKey: true,
      action: handleHistoryBack,
      description: 'Navigate back in history',
      category: 'navigation',
    },
    {
      key: ']',
      ctrlKey: true,
      action: handleHistoryForward,
      description: 'Navigate forward in history',
      category: 'navigation',
    },
    {
      key: 'b',
      ctrlKey: true,
      action: onToggleSidebar,
      description: 'Toggle sidebar',
      category: 'view',
    },
    {
      key: 'l',
      ctrlKey: true,
      action: toggleLinks,
      description: 'Toggle clickable links in reading view',
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
      key: '3',
      ctrlKey: true,
      action: handleNavigation('/create'),
      description: 'Go to Create Cards',
      category: 'navigation',
    },
    {
      key: '4',
      ctrlKey: true,
      action: handleNavigation('/review'),
      description: 'Go to Review',
      category: 'navigation',
    },
    {
      key: '5',
      ctrlKey: true,
      action: handleNavigation('/ingest'),
      description: 'Go to Ingest',
      category: 'navigation',
    },
    {
      key: '6',
      ctrlKey: true,
      action: handleNavigation('/settings'),
      description: 'Go to Settings',
      category: 'navigation',
    },
    {
      key: '7',
      ctrlKey: true,
      action: handleNavigation('/stats'),
      description: 'Go to Statistics',
      category: 'navigation',
    },
    {
      key: ',',
      ctrlKey: true,
      action: handleNavigation('/settings'),
      description: 'Go to Settings (macOS standard)',
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
      key: 'r',
      ctrlKey: true,
      shiftKey: true,
      action: handleBackToReading,
      description: 'Back to reading',
      category: 'navigation',
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
      description: 'Submit/ingest text',
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
