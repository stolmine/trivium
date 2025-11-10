import { useLibraryStore } from '../../stores/library';
import { Button } from '../../lib/components/ui/button';
import { Layers, FileText, Activity, Brain } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../lib/utils/tauri';

interface MultiSelectInfoViewProps {
  selectedItemIds: Set<string>;
}

interface TextStats {
  textId: number;
  progress: number;
  flashcardCount: number;
}

export function MultiSelectInfoView({ selectedItemIds }: MultiSelectInfoViewProps) {
  const getSelectedLibraryItems = useLibraryStore((state) => state.getSelectedLibraryItems);
  const [textStats, setTextStats] = useState<Map<number, TextStats>>(new Map());
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const { folders: selectedFolders, texts: selectedTexts } = getSelectedLibraryItems();

  useEffect(() => {
    if (selectedTexts.length === 0) {
      setTextStats(new Map());
      return;
    }

    const loadStats = async () => {
      setIsLoadingStats(true);
      const statsMap = new Map<number, TextStats>();

      await Promise.all(
        selectedTexts.map(async (text) => {
          try {
            const [progress, flashcards] = await Promise.all([
              api.reading.calculateProgress(text.id),
              api.flashcards.getByText(text.id),
            ]);

            statsMap.set(text.id, {
              textId: text.id,
              progress,
              flashcardCount: flashcards.length,
            });
          } catch (error) {
            console.error(`Failed to load stats for text ${text.id}:`, error);
            statsMap.set(text.id, {
              textId: text.id,
              progress: 0,
              flashcardCount: 0,
            });
          }
        })
      );

      setTextStats(statsMap);
      setIsLoadingStats(false);
    };

    loadStats();
  }, [selectedTexts]);

  if (selectedItemIds.size === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No items selected</p>
        </div>
      </div>
    );
  }

  const totalContentLength = selectedTexts.reduce(
    (sum, text) => sum + text.contentLength,
    0
  );

  const averageProgress =
    selectedTexts.length > 0
      ? Array.from(textStats.values()).reduce(
          (sum, stats) => sum + stats.progress,
          0
        ) / selectedTexts.length
      : 0;

  const totalFlashcards = Array.from(textStats.values()).reduce(
    (sum, stats) => sum + stats.flashcardCount,
    0
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Layers className="h-8 w-8 text-muted-foreground" />
          <h2 className="text-xl font-semibold">
            {selectedItemIds.size} {selectedItemIds.size === 1 ? 'item' : 'items'} selected
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedFolders.length} {selectedFolders.length === 1 ? 'folder' : 'folders'},{' '}
          {selectedTexts.length} {selectedTexts.length === 1 ? 'text' : 'texts'}
        </p>
      </div>

      {selectedTexts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Total Statistics
          </h3>

          {isLoadingStats ? (
            <div className="space-y-2">
              <div className="h-6 bg-muted animate-pulse rounded" />
              <div className="h-6 bg-muted animate-pulse rounded" />
              <div className="h-6 bg-muted animate-pulse rounded" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {totalContentLength.toLocaleString()} characters
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {averageProgress.toFixed(1)}% average progress
                </span>
              </div>

              {totalFlashcards > 0 && (
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {totalFlashcards} {totalFlashcards === 1 ? 'flashcard' : 'flashcards'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Batch Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled title="Coming in Phase 6">
            Move
          </Button>
          <Button variant="destructive" disabled title="Coming in Phase 6">
            Delete
          </Button>
          <Button variant="outline" disabled title="Coming in Phase 6">
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
