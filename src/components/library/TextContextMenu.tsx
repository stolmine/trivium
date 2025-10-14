import { useState, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
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
import { useReadingStore } from '../../lib/stores/reading';

interface TextContextMenuProps {
  textId: number;
  textTitle: string;
  children: React.ReactNode;
}

export function TextContextMenu({ textId, textTitle, children }: TextContextMenuProps) {
  const { renameText, deleteText } = useLibraryStore();
  const { loadTexts } = useReadingStore();

  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [renameTextTitle, setRenameTextTitle] = useState(textTitle);

  const handleRename = async () => {
    if (renameTextTitle.trim() && renameTextTitle.trim() !== textTitle) {
      await renameText(textId, renameTextTitle.trim());
      setShowRenameDialog(false);
    }
  };

  const handleDelete = async () => {
    await deleteText(textId);
    // Refresh reading store so library page updates immediately
    await loadTexts();
    setShowDeleteDialog(false);
  };

  // Add keyboard shortcuts for delete dialog
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

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Text</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-text">Title</Label>
              <Input
                id="rename-text"
                value={renameTextTitle}
                onChange={(e) => setRenameTextTitle(e.target.value)}
                placeholder="Enter text title"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRename();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameTextTitle.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Text</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "{textTitle}"? This action cannot be undone. All
              flashcards associated with this text will also be deleted.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
