import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { api } from '../../utils/tauri';
import { ResetConfirmationDialog, type ResetType } from './ResetConfirmationDialog';
import { useLibraryStore } from '../../../stores/library';
import { useReadingStore } from '../../stores/reading';
import { useCardCreationStore } from '../../stores/cardCreation';
import { useLastReadStore } from '../../stores/lastRead';
import { useReadingHistoryStore } from '../../stores/readingHistory';
import { useReviewStore } from '../../stores/review';
import { useNavigationHistory } from '../../stores/navigationHistory';
import { clearProgressCache } from '../../hooks/useTextProgress';

export function ResetSection() {
  const navigate = useNavigate();
  const { loadLibrary } = useLibraryStore();
  const { setCurrentText } = useReadingStore();
  const { reset: resetCardCreation } = useCardCreationStore();
  const { clearLastRead } = useLastReadStore();
  const { clearHistory } = useReadingHistoryStore();
  const { resetSession } = useReviewStore();
  const { clear: clearNavigationHistory } = useNavigationHistory();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetType, setResetType] = useState<ResetType>('reading');
  const [itemCount, setItemCount] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const openResetDialog = (type: ResetType, count?: number) => {
    setResetType(type);
    setItemCount(count);
    setResetDialogOpen(true);
  };

  const handleResetReadingProgress = async () => {
    setIsLoading(true);
    try {
      const result = await api.settings.resetReadingProgress();

      // Clear all cached progress values before refreshing UI
      clearProgressCache();

      await loadLibrary();
      clearHistory();

      // Refresh current reading view if one is open
      const { currentText, getReadRanges, calculateProgress } = useReadingStore.getState();
      if (currentText) {
        await getReadRanges(currentText.id);
        await calculateProgress(currentText.id);
      }

      console.log(`Reset ${result.count} read ranges and library refreshed`);
      setResetDialogOpen(false);
    } catch (error) {
      console.error('Failed to reset reading progress:', error);
      alert('Failed to reset reading progress. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAllFlashcards = async () => {
    setIsLoading(true);
    try {
      const result = await api.settings.resetAllFlashcards();

      // Clear all cached progress values before refreshing UI
      clearProgressCache();

      await loadLibrary();
      resetCardCreation();
      resetSession();
      clearHistory();
      console.log(`Reset ${result.count} flashcards and library refreshed`);
      setResetDialogOpen(false);
    } catch (error) {
      console.error('Failed to reset flashcards:', error);
      alert('Failed to reset flashcards. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetFlashcardStats = async () => {
    setIsLoading(true);
    try {
      const result = await api.settings.resetFlashcardStats();
      await loadLibrary();
      resetSession();
      console.log(`Reset stats for ${result.count} flashcards and library refreshed`);
      setResetDialogOpen(false);
    } catch (error) {
      console.error('Failed to reset flashcard stats:', error);
      alert('Failed to reset flashcard stats. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAllData = async () => {
    setIsLoading(true);
    try {
      const result = await api.settings.resetAllData();

      // Clear all cached progress values before refreshing UI
      clearProgressCache();

      await loadLibrary();
      setCurrentText(null);
      resetCardCreation();
      clearLastRead();
      clearHistory();
      resetSession();
      clearNavigationHistory();
      console.log('Reset all data and library refreshed:', result);
      setResetDialogOpen(false);
      navigate('/');
      alert('All data has been reset successfully.');
    } catch (error) {
      console.error('Failed to reset all data:', error);
      alert('Failed to reset all data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getResetHandler = () => {
    switch (resetType) {
      case 'reading':
        return handleResetReadingProgress;
      case 'flashcards':
        return handleResetAllFlashcards;
      case 'stats':
        return handleResetFlashcardStats;
      case 'all':
        return handleResetAllData;
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Reset Options</h2>
          <div className="h-px bg-border mb-6" />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-4">
            <div className="space-y-1">
              <Label>Reset Reading Progress</Label>
              <p className="text-sm text-muted-foreground">
                Clear all read/unread tracking across all texts
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => openResetDialog('reading')}
              disabled={isLoading}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Progress
            </Button>
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="space-y-1">
              <Label>Reset All Flashcards</Label>
              <p className="text-sm text-muted-foreground">
                Delete all flashcards and marks from your database
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => openResetDialog('flashcards')}
              disabled={isLoading}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Reset Cards
            </Button>
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="space-y-1">
              <Label>Reset Flashcard Statistics</Label>
              <p className="text-sm text-muted-foreground">
                Reset review stats and FSRS state, keep card content
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => openResetDialog('stats')}
              disabled={isLoading}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Stats
            </Button>
          </div>

          <div className="h-px bg-border my-6" />

          <div className="flex items-center justify-between py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <Label className="text-destructive">Reset All Data</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Delete everything from your database. This cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => openResetDialog('all')}
              disabled={isLoading}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Reset All Data
            </Button>
          </div>
        </div>
      </div>

      <ResetConfirmationDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        resetType={resetType}
        itemCount={itemCount}
        onConfirm={getResetHandler()}
        isLoading={isLoading}
      />
    </>
  );
}
