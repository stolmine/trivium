import { useLibrarySearchStore } from '../../lib/stores/librarySearch';
import { LibraryTree } from '../../components/library/LibraryTree';
import { LibrarySearchBar } from '../../components/library/LibrarySearchBar';
import { SelectionToolbar } from '../../components/library/SelectionToolbar';
import { cn } from '../../lib/utils';

interface LeftPaneProps {
  width: number;
}

export function LeftPane({ width }: LeftPaneProps) {
  const { isOpen: isSearchOpen } = useLibrarySearchStore();

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

      {isSearchOpen && <LibrarySearchBar />}

      <SelectionToolbar />

      <div className="flex-1 flex flex-col min-h-0">
        <LibraryTree context="library" />
      </div>
    </div>
  );
}
