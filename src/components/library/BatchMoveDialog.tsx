import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../lib/components/ui/dialog';
import { Button } from '../../lib/components/ui/button';
import { FolderSelect } from '../../lib/components/folders/FolderSelect';
import { Folder, FileText } from 'lucide-react';
import { api } from '../../lib/utils/tauri';
import type { Folder as FolderType } from '../../lib/types/folder';
import type { Text } from '../../lib/types/article';
import { isFolderDescendant } from '../../lib/tree-utils';
import { useLibraryStore } from '../../stores/library';

interface BatchMoveDialogProps {
  open: boolean;
  onClose: () => void;
  selectedItems: { folders: FolderType[]; texts: Text[] };
}

interface FolderNode {
  folder: {
    id: string;
    name: string;
    parentId: string | null;
  };
  children: FolderNode[];
}

function buildFolderTree(folders: FolderType[]): FolderNode[] {
  const folderMap = new Map<string, FolderNode>();
  const rootNodes: FolderNode[] = [];

  folders.forEach((folder) => {
    const node: FolderNode = {
      folder: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
      },
      children: [],
    };
    folderMap.set(folder.id, node);
  });

  folders.forEach((folder) => {
    const node = folderMap.get(folder.id);
    if (!node) return;

    if (folder.parentId === null) {
      rootNodes.push(node);
    } else {
      const parentNode = folderMap.get(folder.parentId);
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }
  });

  rootNodes.sort((a, b) => a.folder.name.localeCompare(b.folder.name));
  rootNodes.forEach((node) => sortFolderTree(node));

  return rootNodes;
}

function sortFolderTree(node: FolderNode): void {
  node.children.sort((a, b) => a.folder.name.localeCompare(b.folder.name));
  node.children.forEach(sortFolderTree);
}

export default function BatchMoveDialog({ open, onClose, selectedItems }: BatchMoveDialogProps) {
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const folders = useLibraryStore((state) => state.folders);
  const loadLibrary = useLibraryStore((state) => state.loadLibrary);

  useEffect(() => {
    if (!open) {
      setTargetFolderId(null);
      setError(null);
    }
  }, [open]);

  const folderCount = selectedItems.folders.length;
  const textCount = selectedItems.texts.length;
  const totalCount = folderCount + textCount;

  const availableFolders = useMemo(() => {
    const selectedFolderIds = new Set(selectedItems.folders.map(f => f.id));

    return folders.filter((folder) => {
      if (selectedFolderIds.has(folder.id)) {
        return false;
      }

      for (const selectedFolder of selectedItems.folders) {
        if (isFolderDescendant(folders, folder.id, selectedFolder.id)) {
          return false;
        }
      }

      return true;
    });
  }, [folders, selectedItems.folders]);

  const folderTree = useMemo(() => buildFolderTree(availableFolders), [availableFolders]);

  const handleMove = async () => {
    setIsLoading(true);
    setError(null);

    try {
      for (const folder of selectedItems.folders) {
        await api.folders.moveFolder(folder.id, targetFolderId);
      }

      for (const text of selectedItems.texts) {
        await api.folders.moveText(text.id, targetFolderId);
      }

      await loadLibrary();
      onClose();
    } catch (err) {
      console.error('Failed to move items:', err);
      setError(String(err));
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move {totalCount} Item{totalCount !== 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>
            Select a destination folder for the selected items.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Selected items:
            </div>
            <div className="flex items-center gap-4 text-sm">
              {folderCount > 0 && (
                <div className="flex items-center gap-1">
                  <Folder className="h-4 w-4" />
                  <span>{folderCount} folder{folderCount !== 1 ? 's' : ''}</span>
                </div>
              )}
              {textCount > 0 && (
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>{textCount} text{textCount !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Destination folder</label>
            <FolderSelect
              value={targetFolderId}
              onChange={setTargetFolderId}
              folders={folderTree}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={isLoading}
          >
            {isLoading ? 'Moving...' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
