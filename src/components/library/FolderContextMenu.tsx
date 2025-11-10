import { useState, useEffect } from 'react';
import { FolderPlus, Edit2, Trash2 } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '../../lib/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../lib/components/ui/dialog';
import { Button, Input, Label } from '../../lib/components/ui';
import { useLibraryStore } from '../../stores/library';

interface FolderContextMenuProps {
  folderId: string;
  folderName: string;
  children: React.ReactNode;
}

export function FolderContextMenu({ folderId, folderName, children }: FolderContextMenuProps) {
  const createFolder = useLibraryStore((state) => state.createFolder);
  const renameFolder = useLibraryStore((state) => state.renameFolder);
  const deleteFolder = useLibraryStore((state) => state.deleteFolder);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [newFolderName, setNewFolderName] = useState('');
  const [renameFolderName, setRenameFolderName] = useState(folderName);
  const [createError, setCreateError] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);

  const handleCreateSubfolder = async () => {
    const trimmedName = newFolderName.trim();
    if (!trimmedName || createError) return;

    try {
      await createFolder(trimmedName, folderId);
      setNewFolderName('');
      setCreateError(null);
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error creating subfolder:', error);
    }
  };

  const handleRename = async () => {
    const trimmedName = renameFolderName.trim();
    if (!trimmedName || trimmedName === folderName || renameError) return;

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
      // Error already logged in store, could add toast notification here
      console.error('Error deleting folder:', error);
    }
  };

  useEffect(() => {
    if (!showCreateDialog) {
      return;
    }

    const trimmedName = newFolderName.trim();
    if (!trimmedName) {
      setCreateError(null);
      return;
    }

    const folders = useLibraryStore.getState().folders;

    const duplicateFolder = folders.find(
      f => f.parentId === folderId &&
      f.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateFolder) {
      setCreateError('A folder with this name already exists');
    } else {
      setCreateError(null);
    }
  }, [newFolderName, folderId, showCreateDialog]);

  useEffect(() => {
    if (!showRenameDialog) {
      return;
    }

    const trimmedName = renameFolderName.trim();
    if (!trimmedName || trimmedName === folderName) {
      setRenameError(null);
      return;
    }

    const folders = useLibraryStore.getState().folders;

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
  }, [renameFolderName, folderId, folderName, showRenameDialog]);

  useEffect(() => {
    if (!showDeleteDialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteDialog]);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setShowCreateDialog(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            Create Subfolder
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setShowRenameDialog(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
            <span className="text-destructive">Delete</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          setNewFolderName('');
          setCreateError(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subfolder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subfolder-name">Name</Label>
              <Input
                id="subfolder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateSubfolder();
                  }
                }}
                autoFocus
              />
              {createError && (
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{createError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateSubfolder} disabled={!newFolderName.trim() || !!createError}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameDialog} onOpenChange={(open) => {
        setShowRenameDialog(open);
        if (!open) {
          setRenameFolderName(folderName);
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
              Are you sure you want to delete "{folderName}"? This action cannot be undone. All
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
    </>
  );
}
