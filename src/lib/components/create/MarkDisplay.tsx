import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Archive } from 'lucide-react';
import { Button } from '../ui/button';
import { cn, formatDueDate } from '../../utils';
import type { MarkWithContext } from '../../types';

interface MarkDisplayProps {
  mark: MarkWithContext;
  currentIndex: number;
  totalMarks: number;
  isBuried: boolean;
  onBury: () => void;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

export function MarkDisplay({
  mark,
  currentIndex,
  totalMarks,
  isBuried,
  onBury,
  onPrevious,
  onNext,
  className
}: MarkDisplayProps) {
  const isFirstMark = currentIndex === 0;
  const isLastMark = currentIndex === totalMarks - 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      if (e.key === 'ArrowLeft' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
        e.preventDefault();
        if (!isFirstMark) {
          onPrevious();
        }
      } else if (e.key === 'ArrowRight' || ((e.ctrlKey || e.metaKey) && e.key === 'j')) {
        e.preventDefault();
        if (!isLastMark) {
          onNext();
        }
      } else if (e.shiftKey && e.key === 'B') {
        e.preventDefault();
        onBury();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFirstMark, isLastMark, onPrevious, onNext, onBury]);

  const contextBefore = mark.beforeContext.slice(-200);
  const contextAfter = mark.afterContext.slice(0, 200);
  const markedDate = formatDueDate(mark.createdAt);

  if (totalMarks === 0) {
    return (
      <div className="p-6 border border-border rounded-lg mb-6 bg-muted/30">
        <p className="text-center text-muted-foreground">No marks available in this scope</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-card shadow-card rounded-lg border border-border',
        className
      )}
    >
      <div className="p-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center justify-between md:justify-start gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevious}
                disabled={isFirstMark}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>

              <span className="text-sm font-medium whitespace-nowrap">
                Mark {currentIndex + 1} of {totalMarks}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={onNext}
                disabled={isLastMark}
                className="flex items-center gap-2"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {isBuried && (
              <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border">
                Buried
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBury}
              className="flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Bury</span>
              <span className="text-xs text-muted-foreground hidden md:inline">(Shift+B)</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>From: "{mark.textTitle}"</span>
          <span>Created: {markedDate}</span>
        </div>

        <div className="font-serif text-lg leading-relaxed">
          {contextBefore && (
            <span className="text-muted-foreground">
              ...{contextBefore}{' '}
            </span>
          )}

          <span
            className={cn(
              'border-l-4 border-primary bg-primary/5 pl-4 py-2',
              'inline-block my-1'
            )}
          >
            {mark.markedText}
          </span>

          {contextAfter && (
            <span className="text-muted-foreground">
              {' '}{contextAfter}...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
