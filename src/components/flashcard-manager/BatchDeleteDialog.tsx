import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../lib/components/ui/dialog';
import { Button } from '../../lib/components/ui';
import { AlertTriangle } from 'lucide-react';
import { useFlashcardManagerStore } from '../../stores/flashcardManager';
import { invoke } from '@tauri-apps/api/core';

interface BatchDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BatchDeleteDialog({ open, onOpenChange }: BatchDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedIds = useFlashcardManagerStore((state) => state.selectedIds);
  const clearSelection = useFlashcardManagerStore((state) => state.clearSelection);
  const loadFlashcards = useFlashcardManagerStore((state) => state.loadFlashcards);

  const selectedCount = selectedIds.size;

  const handleDelete = async () => {
    if (selectedCount === 0) return;

    setIsDeleting(true);
    setError(null);

    try {
      const flashcardIds = Array.from(selectedIds);

      const deletedCount = await invoke<number>('batch_delete_flashcards', {
        flashcardIds,
      });

      console.log(`Successfully deleted ${deletedCount} flashcards`);

      clearSelection();
      await loadFlashcards();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to delete flashcards:', err);
      setError(String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {selectedCount} {selectedCount === 1 ? 'Flashcard' : 'Flashcards'}?
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the selected
            flashcards and all associated review history.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="py-4">
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              {error}
            </div>
          </div>
        )}

        <div className="py-4">
          <div className="p-4 bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 dark:border-destructive/30 rounded-md">
            <p className="text-sm font-medium text-destructive">
              Warning: This will delete all review history
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              All FSRS data, review history, and scheduling information for these cards will be permanently lost.
            </p>
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
