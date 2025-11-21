import { Home, ChevronLeft, ChevronRight, HelpCircle, GraduationCap, Search, Sparkles, FileInput, Settings, BarChart3, ChevronUp, ChevronDown, FilePlus, ArrowUpDown, ChevronsDown, ChevronsUp, FolderPlus, Table } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../stores/app';
import { useLibraryStore } from '../../stores/library';
import { Button } from '../../lib/components/ui';
import { SIDEBAR_WIDTH, getTransitionStyle, shouldReduceMotion } from '../../lib/animations';
import { cn } from '../../lib/utils';
import { LibraryTree } from '../library/LibraryTree';
import { LibrarySearchBar } from '../library/LibrarySearchBar';
import { useLibrarySearchStore } from '../../lib/stores/librarySearch';
import { searchLibrary } from '../../lib/utils/librarySearch';
import { NavigationButtons } from '../../lib/components/shared/NavigationButtons';
import { getModifierKey } from '../../lib/utils/platform';
import { useSettingsStore } from '../../lib/stores/settings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../lib/components/ui';

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

// Navigation items use dynamic shortcuts based on platform
const getNavItems = (): NavItem[] => {
  const mod = getModifierKey();
  return [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/', shortcut: `${mod}+1` },
    { id: 'library', label: 'Library', icon: Search, path: '/library', shortcut: `${mod}+2` },
    { id: 'create', label: 'Create Cards', icon: Sparkles, path: '/create', shortcut: `${mod}+3` },
    { id: 'review', label: 'Review', icon: GraduationCap, path: '/review', shortcut: `${mod}+4` },
    { id: 'ingest', label: 'Ingest', icon: FileInput, path: '/ingest', shortcut: `${mod}+5` },
    { id: 'stats', label: 'Statistics', icon: BarChart3, path: '/stats', shortcut: `${mod}+6` },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', shortcut: `${mod}+7` },
    { id: 'flashcard-manager', label: 'Flashcard Manager', icon: Table, path: '/flashcard-manager', shortcut: `${mod}+8` },
  ];
};

export function Sidebar({ onShowHelp }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const isSearchOpen = useLibrarySearchStore((state) => state.sidebar.isOpen);
  const query = useLibrarySearchStore((state) => state.sidebar.query);
  const caseSensitive = useLibrarySearchStore((state) => state.sidebar.caseSensitive);
  const wholeWord = useLibrarySearchStore((state) => state.sidebar.wholeWord);
  const setMatches = useLibrarySearchStore((state) => state.setMatches);
  const openSearch = useLibrarySearchStore((state) => state.openSearch);
  const { folders, texts, sortBy, setSortBy, expandAllLibraryFolders, collapseAllLibraryFolders, createFolder, currentFolderId } = useLibraryStore();
  const showLibraryControlsInSidebar = useSettingsStore((state) => state.showLibraryControlsInSidebar);
  const [navCollapsed, setNavCollapsed] = useState(() => {
    const saved = localStorage.getItem('trivium-nav-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [allFoldersExpanded, setAllFoldersExpanded] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  const width = sidebarCollapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded;
  const transitionStyle = shouldReduceMotion() ? {} : getTransitionStyle('width', 300);
  const mod = getModifierKey();
  const navItems = getNavItems();

  const toggleNavCollapsed = () => {
    const newValue = !navCollapsed;
    setNavCollapsed(newValue);
    localStorage.setItem('trivium-nav-collapsed', JSON.stringify(newValue));
  };

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
      f => f.parentId === currentFolderId &&
      f.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateFolder) {
      return;
    }

    try {
      await createFolder(trimmedName, currentFolderId || undefined);
      setNewFolderName('');
      setShowCreateFolderDialog(false);
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const getSortLabel = (sortOption: string): string => {
    switch (sortOption) {
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

  useEffect(() => {
    if (!showCreateFolderDialog) return;

    const trimmedName = newFolderName.trim();
    if (!trimmedName) {
      setFolderError(null);
      return;
    }

    const duplicateFolder = folders.find(
      f => f.parentId === currentFolderId &&
      f.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateFolder) {
      setFolderError('A folder with this name already exists');
    } else {
      setFolderError(null);
    }
  }, [newFolderName, folders, showCreateFolderDialog, currentFolderId]);

  useEffect(() => {
    if (!query.trim()) {
      setMatches('sidebar', [], []);
      return;
    }

    const results = searchLibrary(folders, texts, query, {
      caseSensitive,
      wholeWord
    });

    setMatches(
      'sidebar',
      Array.from(results.matchedTextIds),
      Array.from(results.matchedFolderIds)
    );
  }, [query, caseSensitive, wholeWord, folders, texts, setMatches]);

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
      <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {!sidebarCollapsed && (
            <h1 className="text-lg font-bold tracking-wide">TRIVIUM</h1>
          )}
          {sidebarCollapsed && (
            <span className="text-lg font-bold">T</span>
          )}
        </div>
        {!sidebarCollapsed && (
          <div className="flex items-center">
            <NavigationButtons />
          </div>
        )}
      </div>

      <nav className="flex-1 flex flex-col overflow-hidden" role="navigation" aria-label="Main navigation">
        <div className="flex-shrink-0">
          <div className="py-4">
            <ul className="space-y-1 px-2">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const isDashboard = index === 0;
                const shouldShow = !navCollapsed || isDashboard || sidebarCollapsed;

                if (!shouldShow) return null;

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
          </div>
          {!sidebarCollapsed && (
            <div className="px-2 pb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleNavCollapsed}
                className="w-full h-8 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                aria-label={navCollapsed ? "Expand navigation" : "Collapse navigation"}
                title={navCollapsed ? "Show all navigation links" : "Show only Dashboard"}
              >
                {navCollapsed ? (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    <span>Show More</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    <span>Show Less</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="px-4 py-2 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Library Tree
            </span>
            {showLibraryControlsInSidebar && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => navigate('/ingest')}
                  title={`New ingest (${mod}+N)`}
                  aria-label="Create new text"
                >
                  <FilePlus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => openSearch('sidebar')}
                  title={`Search library (Shift+${mod}+F)`}
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
                  title={allFoldersExpanded ? `Collapse all folders (${mod}+Shift+E)` : `Expand all folders (${mod}+Shift+E)`}
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
                  title={`Create folder (${mod}+Shift+N)`}
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isSearchOpen && !sidebarCollapsed && <LibrarySearchBar context="sidebar" />}
          <LibraryTree collapsed={sidebarCollapsed} context="sidebar" />
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
            title={sidebarCollapsed ? 'Help' : `Show keyboard shortcuts (${mod}+/)`}
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
          title={sidebarCollapsed ? `Expand sidebar (${mod}+B)` : `Collapse sidebar (${mod}+B)`}
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
            <DialogTitle>{currentFolderId ? 'Create Subfolder' : 'Create Folder'}</DialogTitle>
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
