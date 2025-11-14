import { useState, useEffect } from 'react';
import { Folder, FileText, BookOpen, Activity, Brain, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../lib/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../lib/components/ui/dialog';
import { Input, Label } from '../../lib/components/ui';
import { useLibraryStatsCacheStore } from '../../stores/libraryStatsCache';
import { useLibraryStore } from '../../stores/library';
import type { FolderStatistics } from '../../lib/types/statistics';

interface FolderInfoViewProps {
  folderId: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function FolderInfoView({ folderId }: FolderInfoViewProps) {
  const navigate = useNavigate();
  const { getFolderStats, loadFolderStats } = useLibraryStatsCacheStore();
  const renameFolder = useLibraryStore((state) => state.renameFolder);
  const deleteFolder = useLibraryStore((state) => state.deleteFolder);
  const folders = useLibraryStore((state) => state.folders);
  const [stats, setStats] = useState<FolderStatistics | null>(() => getFolderStats(folderId));
  const [isLoading, setIsLoading] = useState(() => !getFolderStats(folderId));
  const [error, setError] = useState<string | null>(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  const handleRename = async () => {
    if (!stats) return;
    const trimmedName = renameFolderName.trim();
    if (!trimmedName || trimmedName === stats.name || renameError) return;

    try {
      await renameFolder(folderId, trimmedName);
      setRenameError(null);
      setShowRenameDialog(false);
    } catch (error) {
      console.error('Error renaming folder:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFolder(folderId);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  const handleNewText = () => {
    navigate('/ingest', {
      state: {
        selectedFolderId: folderId,
      },
    });
  };

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      // Try to get from cache first
      const cached = getFolderStats(folderId);
      if (cached) {
        setStats(cached);
        setIsLoading(false);
        // Still load fresh data in background
        try {
          const fresh = await loadFolderStats(folderId);
          if (isMounted) {
            setStats(fresh);
          }
        } catch (err) {
          // Ignore errors on background refresh if we have cached data
          console.error('Failed to refresh folder stats:', err);
        }
        return;
      }

      // No cache, show loading
      setIsLoading(true);
      setError(null);

      try {
        const data = await loadFolderStats(folderId);
        if (isMounted) {
          setStats(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load folder statistics');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, [folderId, getFolderStats, loadFolderStats]);

  useEffect(() => {
    if (!showRenameDialog || !stats) {
      return;
    }

    const trimmedName = renameFolderName.trim();
    if (!trimmedName || trimmedName === stats.name) {
      setRenameError(null);
      return;
    }

    const currentFolder = folders.find(f => f.id === folderId);
    if (!currentFolder) {
      setRenameError(null);
      return;
    }

    const duplicateFolder = folders.find(
      f => f.id !== folderId &&
      f.parentId === currentFolder.parentId &&
      f.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateFolder) {
      setRenameError('A folder with this name already exists');
    } else {
      setRenameError(null);
    }
  }, [renameFolderName, folderId, stats, showRenameDialog, folders]);

  useEffect(() => {
    if (!showDeleteDialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        deleteFolder(folderId).then(() => {
          setShowDeleteDialog(false);
        }).catch((error) => {
          console.error('Error deleting folder:', error);
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteDialog, folderId, deleteFolder]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-1">Failed to load folder statistics</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-12 bg-sidebar">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-sidebar">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Folder className="h-8 w-8 text-muted-foreground flex-shrink-0" />
          <h2 className="text-2xl font-semibold text-foreground truncate">{stats.name}</h2>
        </div>
        {stats.parentPath && (
          <p className="text-sm text-muted-foreground pl-11">{stats.parentPath}</p>
        )}
      </div>

      {stats.totalTexts === 0 ? (
        <div className="rounded-lg border border-border bg-background p-6 text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            This folder is empty. Add texts to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Contents</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground">
                  {stats.totalTexts} {stats.totalTexts === 1 ? 'text' : 'texts'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground">
                  {stats.totalContentLength.toLocaleString()} characters across all texts
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground">
                  {stats.averageProgress.toFixed(1)}% read on average
                </span>
              </div>
              {stats.totalFlashcards > 0 && (
                <div className="flex items-center gap-3">
                  <Brain className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground">
                    {stats.totalFlashcards} {stats.totalFlashcards === 1 ? 'flashcard' : 'flashcards'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Details</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm text-foreground">{formatDate(stats.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Modified</p>
                  <p className="text-sm text-foreground">{formatDate(stats.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (stats) {
                setRenameFolderName(stats.name);
                setShowRenameDialog(true);
              }
            }}
          >
            Rename
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleNewText();
            }}
          >
            New Text
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <Dialog open={showRenameDialog} onOpenChange={(open) => {
        setShowRenameDialog(open);
        if (!open) {
          setRenameFolderName('');
          setRenameError(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-folder">Name</Label>
              <Input
                id="rename-folder"
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                placeholder="Enter folder name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRename();
                  }
                }}
                autoFocus
              />
              {renameError && (
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{renameError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleRename} disabled={!renameFolderName.trim() || !!renameError}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "{stats?.name}"? This action cannot be undone. All
              subfolders and texts within will be moved to the root level.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
