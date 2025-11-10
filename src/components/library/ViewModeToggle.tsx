import { List, LayoutGrid, Network } from 'lucide-react';
import { useLibraryStore, type ViewMode } from '../../stores/library';
import { cn } from '../../lib/utils';

export function ViewModeToggle() {
  const viewMode = useLibraryStore((state) => state.viewMode);
  const setViewMode = useLibraryStore((state) => state.setViewMode);

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-sidebar-border">
      <span className="text-xs text-muted-foreground mr-2">View:</span>
      <div className="flex items-center gap-0.5 bg-sidebar-accent/30 rounded-md p-0.5">
        <button
          onClick={() => handleModeChange('tree')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors',
            viewMode === 'tree'
              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
          )}
          aria-label="Tree view"
          title="Tree view"
        >
          <Network className="h-3.5 w-3.5" />
          <span>Tree</span>
        </button>
        <button
          onClick={() => handleModeChange('icon')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors',
            viewMode === 'icon'
              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
          )}
          aria-label="Icon grid view"
          title="Icon grid view"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>Grid</span>
        </button>
        <button
          onClick={() => handleModeChange('list')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors',
            viewMode === 'list'
              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
          )}
          aria-label="List view"
          title="List view"
        >
          <List className="h-3.5 w-3.5" />
          <span>List</span>
        </button>
      </div>
    </div>
  );
}
