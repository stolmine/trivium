import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/lib/components/ui/dialog';
import { Button } from '@/lib/components/ui/button';
import { AlertTriangle, Folder, FileText } from 'lucide-react';
import { useLibraryStore } from '@/stores/library';
import { invoke } from '@tauri-apps/api/core';

interface BatchDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DeleteItem {
  type: 'folder' | 'text';
  id: string | number; // folder: string, text: number
}

interface DeleteResult {
  deletedCount: number;
}

export function BatchDeleteDialog({ open, onOpenChange }: BatchDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const getSelectedLibraryItems = useLibraryStore((state) => state.getSelectedLibraryItems);
  const loadLibrary = useLibraryStore((state) => state.loadLibrary);
  const clearLibrarySelection = useLibraryStore((state) => state.clearLibrarySelection);

  const { folders: selectedFolders, texts: selectedTexts } = getSelectedLibraryItems();

  const totalItems = selectedFolders.length + selectedTexts.length;
  const displayLimit = 10;
  const hasMore = totalItems > displayLimit;

  const handleDelete = async () => {
    if (selectedFolders.length === 0 && selectedTexts.length === 0) return;

    setIsDeleting(true);
    try {
      const items: DeleteItem[] = [
        ...selectedFolders.map(f => ({ type: 'folder' as const, id: f.id })),
        ...selectedTexts.map(t => ({ type: 'text' as const, id: t.id })) // Use numeric ID
      ];

      const result = await invoke<DeleteResult>('delete_multiple_items', { items });

      clearLibrarySelection();
      await loadLibrary();

      onOpenChange(false);

      console.log(`Successfully deleted ${result.deletedCount} items`);
    } catch (error) {
      console.error('Failed to delete items:', error);
      alert(`Failed to delete items: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const itemsToDisplay = [
    ...selectedFolders.slice(0, displayLimit).map(f => ({ type: 'folder' as const, name: f.name })),
    ...selectedTexts.slice(0, displayLimit - selectedFolders.length).map(t => ({ type: 'text' as const, name: t.title }))
  ].slice(0, displayLimit);

  const remainingCount = totalItems - itemsToDisplay.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {totalItems} {totalItems === 1 ? 'Item' : 'Items'}?
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the selected items.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {selectedFolders.length > 0 && (
            <div className="p-4 bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 dark:border-destructive/30 rounded-md">
              <p className="text-sm font-medium text-destructive">
                Folders will be deleted recursively
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                All texts and subfolders within the selected folders will also be deleted.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Items to be deleted:</p>
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {itemsToDisplay.map((item, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  {item.type === 'folder' ? (
                    <Folder className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <span className="break-words">{item.name}</span>
                </li>
              ))}
            </ul>
            {hasMore && (
              <p className="text-sm text-muted-foreground italic">
                and {remainingCount} more...
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
