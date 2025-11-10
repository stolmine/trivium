import { useEffect } from 'react';
import { useFocusContextStore, isLibraryPageActive } from '../../stores/focusContext';
import { useLibraryStore } from '../../stores/library';
import { useLibrarySearchStore } from '../stores/librarySearch';
import { isMac } from '../utils/platform';

export function useContextualHotkeys() {
  const { activeContext } = useFocusContextStore();
  const libraryStore = useLibraryStore();
  const { openSearch } = useLibrarySearchStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // When not on library page, always use sidebar context
      const isOnLibraryPage = isLibraryPageActive();
      const effectiveContext = isOnLibraryPage ? activeContext : 'sidebar';

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
  }, [activeContext, libraryStore, openSearch]);
}
