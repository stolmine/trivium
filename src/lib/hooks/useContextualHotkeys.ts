import { useEffect } from 'react';
import { useFocusContextStore, isLibraryPageActive } from '../../stores/focusContext';
import { useLibraryStore } from '../../stores/library';
import { useLibrarySearchStore } from '../stores/librarySearch';
import { useSettingsStore } from '../stores/settings';
import { isMac } from '../utils/platform';

export function useContextualHotkeys() {
  const { activeContext } = useFocusContextStore();
  const enableFocusTracking = useSettingsStore((state) => state.enableFocusTracking);
  const libraryStore = useLibraryStore();
  const { openSearch } = useLibrarySearchStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Determine effective context based on focus tracking setting
      const isOnLibraryPage = isLibraryPageActive();
      let effectiveContext = activeContext;

      if (!enableFocusTracking) {
        // When focus tracking is disabled:
        // - On library page: always use 'library-left' context
        // - Not on library page: always use 'sidebar' context
        effectiveContext = isOnLibraryPage ? 'library-left' : 'sidebar';
      } else {
        // When focus tracking is enabled:
        // - Not on library page: always use 'sidebar' context
        // - On library page: use the active context
        effectiveContext = isOnLibraryPage ? activeContext : 'sidebar';
      }

      if (modKey && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();

        if (effectiveContext === 'sidebar') {
          const allExpanded = libraryStore.folders.length > 0 &&
            libraryStore.folders.every(f => libraryStore.expandedFolderIds.has(f.id));

          if (allExpanded) {
            libraryStore.collapseAllFolders();
          } else {
            libraryStore.expandAllFolders();
          }
        } else if (effectiveContext === 'library-left') {
          const allExpanded = libraryStore.folders.length > 0 &&
            libraryStore.folders.every(f => libraryStore.libraryExpandedFolderIds.has(f.id));

          const store = useLibraryStore.getState();
          if (allExpanded) {
            if ('collapseAllLibraryFolders' in store && typeof store.collapseAllLibraryFolders === 'function') {
              (store as any).collapseAllLibraryFolders();
            }
          } else {
            if ('expandAllLibraryFolders' in store && typeof store.expandAllLibraryFolders === 'function') {
              (store as any).expandAllLibraryFolders();
            }
          }
        }
        return;
      }

      if (modKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        // Open search for the appropriate context
        if (effectiveContext === 'sidebar') {
          openSearch('sidebar');
        } else if (effectiveContext === 'library-left') {
          openSearch('library');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeContext, enableFocusTracking, libraryStore, openSearch]);
}
