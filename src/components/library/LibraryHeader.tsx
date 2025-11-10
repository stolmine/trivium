import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus, Search, ArrowUpDown, ChevronsDown, ChevronsUp, FolderPlus, Network, LayoutGrid, List, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useLibraryStore, type SortOption, type ViewMode } from '../../stores/library';
import { useLibrarySearchStore } from '../../lib/stores/librarySearch';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../lib/components/ui';
import { getModifierKey } from '../../lib/utils/platform';
import { cn } from '../../lib/utils';

const getSortLabel = (sortBy: SortOption): string => {
  switch (sortBy) {
    case 'name-asc':
      return 'Name (A-Z)';
    case 'name-desc':
      return 'Name (Z-A)';
    case 'date-newest':
      return 'Date Created (Newest)';
    case 'date-oldest':
      return 'Date Created (Oldest)';
    case 'content-length':
      return 'Content Length';
    default:
      return 'Sort';
  }
};

export function LibraryHeader() {
  const navigate = useNavigate();
  const { folders, sortBy, setSortBy, expandAllLibraryFolders, collapseAllLibraryFolders, createFolder, viewMode, setViewMode, isInfoViewCollapsed, toggleInfoViewCollapsed } = useLibraryStore();
  const openSearch = useLibrarySearchStore((state) => state.openSearch);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [allFoldersExpanded, setAllFoldersExpanded] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const mod = getModifierKey();

  useEffect(() => {
    if (!showCreateFolderDialog) return;

    const trimmedName = newFolderName.trim();
    if (!trimmedName) {
      setFolderError(null);
      return;
    }

    const duplicateFolder = folders.find(
      f => f.parentId === null &&
      f.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateFolder) {
      setFolderError('A folder with this name already exists');
    } else {
      setFolderError(null);
    }
  }, [newFolderName, folders, showCreateFolderDialog]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setShowCreateFolderDialog(true);
      }
      if (!e.shiftKey && (e.metaKey || e.ctrlKey) && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        toggleInfoViewCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleInfoViewCollapsed]);

  const handleToggleExpandAll = () => {
    if (allFoldersExpanded) {
      collapseAllLibraryFolders();
      setAllFoldersExpanded(false);
    } else {
      expandAllLibraryFolders();
      setAllFoldersExpanded(true);
    }
  };

  const handleCreateFolder = async () => {
    const trimmedName = newFolderName.trim();
    if (!trimmedName) return;

    if (folderError) return;

    const duplicateFolder = folders.find(
      f => f.parentId === null &&
      f.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateFolder) {
      return;
    }

    try {
      await createFolder(trimmedName);
      setNewFolderName('');
      setShowCreateFolderDialog(false);
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  return (
    <>
      <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold">Library</h2>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigate('/ingest')}
            title={`New ingest (${mod}+N)`}
            aria-label="Create new text"
          >
            <FilePlus className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => openSearch('library')}
            title={`Search library (Shift+${mod}+F)`}
            aria-label="Search library"
          >
            <Search className="h-4 w-4" />
          </Button>

          {viewMode !== 'list' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title={getSortLabel(sortBy)}
                  aria-label="Sort library"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy(sortBy === 'name-asc' ? 'name-desc' : 'name-asc')}>
                  Name (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy(sortBy === 'name-desc' ? 'name-asc' : 'name-desc')}>
                  Name (Z-A)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy(sortBy === 'date-newest' ? 'date-oldest' : 'date-newest')}>
                  Date Created (Newest)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy(sortBy === 'date-oldest' ? 'date-newest' : 'date-oldest')}>
                  Date Created (Oldest)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('content-length')}>
                  Content Length
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {viewMode === 'tree' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleToggleExpandAll}
              title={allFoldersExpanded ? `Collapse all folders (${mod}+Shift+E)` : `Expand all folders (${mod}+Shift+E)`}
              aria-label={allFoldersExpanded ? "Collapse all folders" : "Expand all folders"}
            >
              {allFoldersExpanded ? (
                <ChevronsUp className="h-4 w-4" />
              ) : (
                <ChevronsDown className="h-4 w-4" />
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreateFolderDialog(true)}
            className="h-8 w-8 p-0"
            aria-label="Create new folder"
            title={`Create folder (${mod}+Shift+N)`}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleInfoViewCollapsed}
            className="h-8 w-8 p-0"
            aria-label={isInfoViewCollapsed ? "Show info panel" : "Hide info panel"}
            title={isInfoViewCollapsed ? `Show info panel (${mod}+I)` : `Hide info panel (${mod}+I)`}
          >
            {isInfoViewCollapsed ? (
              <PanelRightOpen className="h-4 w-4" />
            ) : (
              <PanelRightClose className="h-4 w-4" />
            )}
          </Button>

          <div className="flex items-center gap-0 ml-2 border border-sidebar-border rounded-md overflow-hidden">
            <button
              onClick={() => handleModeChange('tree')}
              className={cn(
                'flex items-center justify-center h-8 w-8 transition-colors',
                viewMode === 'tree'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
              aria-label="Tree view"
              title="Tree view"
            >
              <Network className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleModeChange('icon')}
              className={cn(
                'flex items-center justify-center h-8 w-8 border-x border-sidebar-border transition-colors',
                viewMode === 'icon'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
              aria-label="Icon grid view"
              title="Icon grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleModeChange('list')}
              className={cn(
                'flex items-center justify-center h-8 w-8 transition-colors',
                viewMode === 'list'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
              aria-label="List view"
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <Dialog open={showCreateFolderDialog} onOpenChange={(open) => {
        setShowCreateFolderDialog(open);
        if (!open) {
          setFolderError(null);
          setNewFolderName('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolder();
                  }
                }}
                autoFocus
              />
              {folderError && (
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{folderError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreateFolderDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateFolder} disabled={!newFolderName.trim() || !!folderError}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
