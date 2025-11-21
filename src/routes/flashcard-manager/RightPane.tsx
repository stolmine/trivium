import { useFlashcardManagerStore } from '../../stores/flashcardManager';

interface RightPaneProps {
  width: number;
}

export function RightPane({ width }: RightPaneProps) {
  const selectedIds = useFlashcardManagerStore((state) => state.selectedIds);
  const flashcards = useFlashcardManagerStore((state) => state.flashcards);

  const selectedFlashcards = flashcards.filter(fc => selectedIds.has(fc.id));

  return (
    <div
      className="h-full flex flex-col bg-background"
      style={{ width: `${width}%` }}
    >
      <div className="border-b p-4">
        <h3 className="text-lg font-semibold">Card Details</h3>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {selectedIds.size === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a flashcard to view details
          </div>
        )}

        {selectedIds.size === 1 && selectedFlashcards.length > 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Text Source</label>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedFlashcards[0].textTitle}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Cloze Content</label>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {selectedFlashcards[0].clozeText}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Original Text</label>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {selectedFlashcards[0].originalText}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(selectedFlashcards[0].due).toLocaleDateString()}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Reps</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFlashcards[0].reps}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Difficulty</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFlashcards[0].difficulty.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Stability</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFlashcards[0].stability.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Lapses</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFlashcards[0].lapses}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Scheduled Days</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFlashcards[0].scheduledDays}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Last Review</label>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedFlashcards[0].lastReview
                  ? new Date(selectedFlashcards[0].lastReview).toLocaleDateString()
                  : 'Never reviewed'}
              </p>
            </div>
          </div>
        )}

        {selectedIds.size > 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-semibold">{selectedIds.size} cards selected</p>
              <p className="text-sm text-muted-foreground mt-2">
                Select a single card to view detailed information
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">Quick Stats</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Reps:</span>{' '}
                  <span>{selectedFlashcards.reduce((sum, fc) => sum + fc.reps, 0)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Lapses:</span>{' '}
                  <span>{selectedFlashcards.reduce((sum, fc) => sum + fc.lapses, 0)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Difficulty:</span>{' '}
                  <span>
                    {(selectedFlashcards.reduce((sum, fc) => sum + fc.difficulty, 0) / selectedFlashcards.length).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Stability:</span>{' '}
                  <span>
                    {(selectedFlashcards.reduce((sum, fc) => sum + fc.stability, 0) / selectedFlashcards.length).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
