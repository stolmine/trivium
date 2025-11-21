import { useState } from 'react';
import { Button } from '../../lib/components/ui';
import { Trash2, Copy, Calendar, RotateCcw, FileEdit } from 'lucide-react';
import { useFlashcardManagerStore } from '../../stores/flashcardManager';
import { BatchDeleteDialog } from './BatchDeleteDialog';
import { BatchOperationsDialog } from './BatchOperationsDialog';
import { isMac } from '../../lib/utils/platform';
import { invoke } from '@tauri-apps/api/core';

export function BulkActionToolbar() {
  const selectedIds = useFlashcardManagerStore((state) => state.selectedIds);
  const clearSelection = useFlashcardManagerStore((state) => state.clearSelection);
  const loadFlashcards = useFlashcardManagerStore((state) => state.loadFlashcards);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBuryDialog, setShowBuryDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showStateDialog, setShowStateDialog] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const selectedCount = selectedIds.size;

  const handleDuplicate = async () => {
    if (selectedCount === 0) return;

    setIsDuplicating(true);
    try {
      const flashcardIds = Array.from(selectedIds);
      await invoke('duplicate_flashcards', { flashcardIds });
      clearSelection();
      await loadFlashcards();
    } catch (err) {
      console.error('Failed to duplicate flashcards:', err);
    } finally {
      setIsDuplicating(false);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  const modifierKey = isMac ? '⌘' : 'Ctrl';

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? 'card' : 'cards'} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="text-xs"
          >
            Clear selection
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            disabled={isDuplicating}
            title={`Duplicate selected cards (${modifierKey}+D)`}
          >
            <Copy className="h-4 w-4 mr-2" />
            {isDuplicating ? 'Duplicating...' : 'Duplicate'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBuryDialog(true)}
            title="Bury cards until date"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Bury Cards
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResetDialog(true)}
            title="Reset FSRS stats"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Stats
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStateDialog(true)}
            title="Change card state"
          >
            <FileEdit className="h-4 w-4 mr-2" />
            Change State
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            title={`Delete selected cards (Delete key)`}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <BatchDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />

      <BatchOperationsDialog
        open={showBuryDialog}
        onOpenChange={setShowBuryDialog}
        operation="bury"
      />

      <BatchOperationsDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        operation="reset"
      />

      <BatchOperationsDialog
        open={showStateDialog}
        onOpenChange={setShowStateDialog}
        operation="state"
      />
    </>
  );
}
