import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, SkipForward, Archive } from 'lucide-react';
import { Button } from '../ui/button';
import { useCardCreationStore } from '../../stores/cardCreation';

export function MarkNavigation() {
  const marks = useCardCreationStore((state) => state.marks);
  const currentMarkIndex = useCardCreationStore((state) => state.currentMarkIndex);
  const skippedMarkIds = useCardCreationStore((state) => state.skippedMarkIds);
  const buriedMarkIds = useCardCreationStore((state) => state.buriedMarkIds);
  const nextMark = useCardCreationStore((state) => state.nextMark);
  const prevMark = useCardCreationStore((state) => state.prevMark);
  const skipMark = useCardCreationStore((state) => state.skipMark);
  const buryMark = useCardCreationStore((state) => state.buryMark);

  const currentMark = marks[currentMarkIndex];
  const isFirstMark = currentMarkIndex === 0;
  const isLastMark = currentMarkIndex === marks.length - 1;
  const totalMarks = marks.length;

  const isCurrentSkipped = currentMark ? skippedMarkIds.has(currentMark.id) : false;
  const isCurrentBuried = currentMark ? buriedMarkIds.has(currentMark.id) : false;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      if (e.key === 'ArrowLeft' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
        e.preventDefault();
        if (!isFirstMark) {
          prevMark();
        }
      } else if (e.key === 'ArrowRight' || ((e.ctrlKey || e.metaKey) && e.key === 'j')) {
        e.preventDefault();
        if (!isLastMark) {
          nextMark();
        }
      } else if (e.key === ' ' && !e.shiftKey) {
        e.preventDefault();
        skipMark();
      } else if (e.shiftKey && e.key === 'B') {
        e.preventDefault();
        buryMark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFirstMark, isLastMark, prevMark, nextMark, skipMark, buryMark]);

  if (totalMarks === 0) {
    return (
      <div className="p-6 border border-border rounded-lg mb-6 bg-muted/30">
        <p className="text-center text-muted-foreground">No marks available in this scope</p>
      </div>
    );
  }

  return (
    <div className="p-6 border border-border rounded-lg mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center justify-between md:justify-start gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevMark}
              disabled={isFirstMark}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <span className="text-sm font-medium whitespace-nowrap">
              Mark {currentMarkIndex + 1} of {totalMarks}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={nextMark}
              disabled={isLastMark}
              className="flex items-center gap-2"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {(isCurrentSkipped || isCurrentBuried) && (
            <div className="flex items-center gap-2">
              {isCurrentSkipped && (
                <span className="text-xs px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                  Skipped
                </span>
              )}
              {isCurrentBuried && (
                <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border">
                  Buried
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={skipMark}
            className="flex items-center gap-2"
          >
            <SkipForward className="h-4 w-4" />
            <span className="hidden sm:inline">Skip</span>
            <span className="text-xs text-muted-foreground hidden md:inline">(Space)</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={buryMark}
            className="flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Bury</span>
            <span className="text-xs text-muted-foreground hidden md:inline">(Shift+B)</span>
          </Button>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded border border-border font-mono">←</kbd>
            <span>Previous</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded border border-border font-mono">→</kbd>
            <span>Next</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded border border-border font-mono">Space</kbd>
            <span>Skip</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded border border-border font-mono">Shift+B</kbd>
            <span>Bury</span>
          </div>
        </div>
      </div>
    </div>
  );
}
