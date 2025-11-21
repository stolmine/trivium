import { useEffect, useState } from 'react';
import { useFlashcardManagerStore } from '../../stores/flashcardManager';
import { LeftPane } from './LeftPane';
import { RightPane } from './RightPane';
import { ResizableHandle } from '../../components/library/ResizableHandle';
import { BatchDeleteDialog } from '../../components/flashcard-manager/BatchDeleteDialog';
import { invoke } from '@tauri-apps/api/core';

export function FlashcardManagerDualPane() {
  const paneSizes = useFlashcardManagerStore((state) => state.paneSizes);
  const setPaneSize = useFlashcardManagerStore((state) => state.setPaneSize);
  const isDetailPanelCollapsed = useFlashcardManagerStore((state) => state.isDetailPanelCollapsed);
  const toggleDetailPanel = useFlashcardManagerStore((state) => state.toggleDetailPanel);
  const selectAll = useFlashcardManagerStore((state) => state.selectAll);
  const selectedIds = useFlashcardManagerStore((state) => state.selectedIds);
  const clearSelection = useFlashcardManagerStore((state) => state.clearSelection);
  const loadFlashcards = useFlashcardManagerStore((state) => state.loadFlashcards);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

      if (!e.shiftKey && (e.metaKey || e.ctrlKey) && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        toggleDetailPanel();
      }

      if (!e.shiftKey && (e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'A')) {
        if (isInputField) {
          return;
        }
        e.preventDefault();
        selectAll();
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        if (isInputField) {
          return;
        }
        e.preventDefault();
        setShowDeleteDialog(true);
      }

      if (!e.shiftKey && (e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D') && selectedIds.size > 0) {
        if (isInputField) {
          return;
        }
        e.preventDefault();

        try {
          const flashcardIds = Array.from(selectedIds);
          await invoke('duplicate_flashcards', { flashcardIds });
          clearSelection();
          await loadFlashcards();
        } catch (err) {
          console.error('Failed to duplicate flashcards:', err);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDetailPanel, selectAll, selectedIds, clearSelection, loadFlashcards]);

  const handleResize = (leftWidth: number) => {
    setPaneSize(leftWidth, 100 - leftWidth);
  };

  if (isDetailPanelCollapsed) {
    return (
      <>
        <div className="h-full flex flex-row overflow-hidden">
          <LeftPane width={100} />
        </div>
        <BatchDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
        />
      </>
    );
  }

  return (
    <>
      <div className="h-full flex flex-row overflow-hidden">
        <LeftPane width={paneSizes.left} />
        <ResizableHandle onResize={handleResize} />
        <RightPane width={paneSizes.right} />
      </div>
      <BatchDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </>
  );
}
