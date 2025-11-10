import { useEffect } from 'react';
import { useLibrarySearchStore } from '../../lib/stores/librarySearch';
import { useLibraryStore } from '../../stores/library';
import { LibraryTree } from '../../components/library/LibraryTree';
import { LibrarySearchBar } from '../../components/library/LibrarySearchBar';
import { SelectionToolbar } from '../../components/library/SelectionToolbar';
import { ViewModeToggle } from '../../components/library/ViewModeToggle';
import { BreadcrumbNav } from '../../components/library/BreadcrumbNav';
import { IconGridView } from '../../components/library/IconGridView';
import { ListView } from '../../components/library/ListView';
import { searchLibrary } from '../../lib/utils/librarySearch';
import { cn } from '../../lib/utils';

interface LeftPaneProps {
  width: number;
}

export function LeftPane({ width }: LeftPaneProps) {
  const isSearchOpen = useLibrarySearchStore((state) => state.library.isOpen);
  const query = useLibrarySearchStore((state) => state.library.query);
  const caseSensitive = useLibrarySearchStore((state) => state.library.caseSensitive);
  const wholeWord = useLibrarySearchStore((state) => state.library.wholeWord);
  const setMatches = useLibrarySearchStore((state) => state.setMatches);
  const { folders, texts, viewMode } = useLibraryStore();

  useEffect(() => {
    if (!query.trim()) {
      setMatches('library', [], []);
      return;
    }

    const results = searchLibrary(folders, texts, query, {
      caseSensitive,
      wholeWord
    });

    setMatches(
      'library',
      Array.from(results.matchedTextIds),
      Array.from(results.matchedFolderIds)
    );
  }, [query, caseSensitive, wholeWord, folders, texts, setMatches]);

  return (
    <div
      className={cn(
        'flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border'
      )}
      style={{ width: `${width}%` }}
    >
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold">Library</h2>
      </div>

      {isSearchOpen && <LibrarySearchBar context="library" />}

      <ViewModeToggle />

      {(viewMode === 'icon' || viewMode === 'list') && <BreadcrumbNav />}

      <div className="flex-1 flex flex-col min-h-0">
        {viewMode === 'tree' && <LibraryTree context="library" />}
        {viewMode === 'icon' && <IconGridView />}
        {viewMode === 'list' && <ListView />}
      </div>

      <SelectionToolbar />
    </div>
  );
}
