import { Home, ChevronLeft, ChevronRight, HelpCircle, FolderPlus, ArrowUpDown, GraduationCap, Search, FilePlus, ChevronsDown, ChevronsUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../stores/app';
import { useLibraryStore, type SortOption } from '../../stores/library';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../lib/components/ui';
import { SIDEBAR_WIDTH, getTransitionStyle, shouldReduceMotion } from '../../lib/animations';
import { cn } from '../../lib/utils';
import { LibraryTree } from '../library/LibraryTree';
import { LibrarySearchBar } from '../library/LibrarySearchBar';
import { useLibrarySearchStore } from '../../lib/stores/librarySearch';
import { searchLibrary } from '../../lib/utils/librarySearch';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  shortcut?: string;
}

interface SidebarProps {
  onShowHelp?: () => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/', shortcut: 'Ctrl+1' },
  { id: 'review', label: 'Review', icon: GraduationCap, path: '/review', shortcut: 'Ctrl+3' },
];

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

export function Sidebar({ onShowHelp }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { folders, texts, createFolder, sortBy, setSortBy, expandAllFolders, collapseAllFolders } = useLibraryStore();
  const {
    isOpen: isSearchOpen,
    query,
    caseSensitive,
    wholeWord,
    openSearch,
    setMatches
  } = useLibrarySearchStore();
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [allFoldersExpanded, setAllFoldersExpanded] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  const width = sidebarCollapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded;
  const transitionStyle = shouldReduceMotion() ? {} : getTransitionStyle('width', 300);

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
      // Shift+Ctrl/Cmd+F opens library search (Ctrl/Cmd+F without Shift is for text search)
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        openSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSearch]);

  const handleToggleExpandAll = () => {
    if (allFoldersExpanded) {
      collapseAllFolders();
      setAllFoldersExpanded(false);
    } else {
      expandAllFolders();
      setAllFoldersExpanded(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        handleToggleExpandAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allFoldersExpanded, handleToggleExpandAll]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setShowCreateFolderDialog(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setMatches([], []);
      return;
    }

    const results = searchLibrary(folders, texts, query, {
      caseSensitive,
      wholeWord
    });

    setMatches(
      Array.from(results.matchedTextIds),
      Array.from(results.matchedFolderIds)
    );
  }, [query, caseSensitive, wholeWord, folders, texts, setMatches]);

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

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        shouldReduceMotion() ? '' : 'transition-all duration-300'
      )}
      style={{ width: `${width}px`, ...transitionStyle }}
    >
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
        {!sidebarCollapsed && (
          <h1 className="text-lg font-bold tracking-wide">TRIVIUM</h1>
        )}
        {sidebarCollapsed && (
          <span className="text-lg font-bold">T</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 flex flex-col" role="navigation" aria-label="Main navigation">
        <ul className="space-y-1 px-2 mb-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  title={sidebarCollapsed ? item.label : (item.shortcut ? `${item.label} (${item.shortcut})` : item.label)}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex-1 overflow-y-auto">
          {!sidebarCollapsed && (
            <div className="px-4 py-2 flex items-center justify-between">
              <button
                onClick={() => navigate('/library')}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded px-1 py-0.5"
                aria-label="Go to Library"
                title="Go to Library (Ctrl+2)"
              >
                Library
              </button>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => navigate('/ingest')}
                  title="New ingest (Ctrl+N)"
                  aria-label="Create new text"
                >
                  <FilePlus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={openSearch}
                  title="Search library (Shift+Ctrl+F)"
                  aria-label="Search library"
                >
                  <Search className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleToggleExpandAll}
                  title={allFoldersExpanded ? "Collapse all folders (Ctrl+Shift+E)" : "Expand all folders (Ctrl+Shift+E)"}
                  aria-label={allFoldersExpanded ? "Collapse all folders" : "Expand all folders"}
                >
                  {allFoldersExpanded ? (
                    <ChevronsUp className="h-4 w-4" />
                  ) : (
                    <ChevronsDown className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateFolderDialog(true)}
                  className="h-6 w-6 p-0"
                  aria-label="Create new folder"
                  title="Create folder (Ctrl+Shift+N)"
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {isSearchOpen && !sidebarCollapsed && <LibrarySearchBar />}
          <LibraryTree collapsed={sidebarCollapsed} />
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-1">
        {onShowHelp && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowHelp}
            className="w-full"
            aria-label="Show keyboard shortcuts"
            title={sidebarCollapsed ? 'Help' : 'Show keyboard shortcuts (Ctrl+/)'}
          >
            <HelpCircle className="h-5 w-5" />
            {!sidebarCollapsed && <span className="ml-2 text-sm">Help</span>}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="w-full"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
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
    </aside>
  );
}
