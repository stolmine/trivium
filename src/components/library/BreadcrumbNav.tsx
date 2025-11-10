import { ChevronRight, Home } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useLibraryStore } from '../../stores/library';
import { cn } from '../../lib/utils';

export function BreadcrumbNav() {
  const [, setSearchParams] = useSearchParams();
  const { folders, currentFolderId } = useLibraryStore();

  const navigateToFolder = (folderId: string | null) => {
    if (folderId === null) {
      setSearchParams({});
    } else {
      setSearchParams({ folder: folderId });
    }
  };

  const buildBreadcrumbPath = (): Array<{ id: string | null; name: string }> => {
    const path: Array<{ id: string | null; name: string }> = [{ id: null, name: 'Home' }];

    if (!currentFolderId) {
      return path;
    }

    const findPath = (folderId: string): Array<{ id: string; name: string }> => {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return [];

      if (folder.parentId) {
        return [...findPath(folder.parentId), { id: folder.id, name: folder.name }];
      }
      return [{ id: folder.id, name: folder.name }];
    };

    const folderPath = findPath(currentFolderId);
    return [...path, ...folderPath];
  };

  const breadcrumbs = buildBreadcrumbPath();

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-sidebar-border overflow-x-auto">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.id ?? 'home'} className="flex items-center gap-1 flex-shrink-0">
          {index > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <button
            onClick={() => navigateToFolder(crumb.id)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors',
              index === breadcrumbs.length - 1
                ? 'text-sidebar-foreground cursor-default'
                : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
            disabled={index === breadcrumbs.length - 1}
            aria-label={index === 0 ? 'Navigate to home' : `Navigate to ${crumb.name}`}
            title={index === 0 ? 'Navigate to home' : `Navigate to ${crumb.name}`}
          >
            {index === 0 && <Home className="h-3.5 w-3.5" />}
            <span className="truncate max-w-[120px]">{crumb.name}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
