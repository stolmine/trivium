import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/lib/components/ui/dialog';
import { Button } from '@/lib/components/ui/button';
import type { ClozeNote } from '@/lib/types/flashcard';
import type { ReadRange } from '@/lib/types/reading';

interface MarkDeletionWarningProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marks: ClozeNote[];
  readRanges: ReadRange[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function MarkDeletionWarning({
  open,
  onOpenChange,
  marks,
  readRanges,
  onConfirm,
  onCancel
}: MarkDeletionWarningProps) {
  const markCount = marks.length;
  const rangeCount = readRanges.length;
  const totalCount = markCount + rangeCount;

  const formatMarkPreview = (mark: ClozeNote): string => {
    if (mark.originalText.length > 50) {
      return mark.originalText.substring(0, 50) + '...';
    }
    return mark.originalText;
  };

  const hasConvertedMarks = marks.some(m => m.status === 'converted');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delete {totalCount} item{totalCount > 1 ? 's' : ''}?</DialogTitle>
          <DialogDescription>
            Your edit overlaps with {markCount > 0 && `${markCount} mark${markCount > 1 ? 's' : ''}`}
            {markCount > 0 && rangeCount > 0 && ' and '}
            {rangeCount > 0 && `${rangeCount} read range${rangeCount > 1 ? 's' : ''}`}.
            {markCount > 0 && ` Mark${markCount > 1 ? 's' : ''} will be deleted${hasConvertedMarks ? ', and any flashcards created from them will also be removed' : ', but any flashcards created from them will be preserved'}.`}
            {rangeCount > 0 && ` Read range${rangeCount > 1 ? 's' : ''} will be deleted.`}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 max-h-48 overflow-y-auto space-y-2">
          {marks.map((mark, idx) => (
            <div
              key={mark.id}
              className="p-3 bg-muted rounded-md border-l-4 border-destructive/50"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm text-foreground">Mark {idx + 1}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {mark.startPosition}-{mark.endPosition}
                  {mark.status === 'converted' && (
                    <span className="ml-2 text-destructive font-sans">• Has flashcards</span>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground italic">
                "{formatMarkPreview(mark)}"
              </div>
            </div>
          ))}
          {readRanges.map((range, idx) => (
            <div
              key={`range-${range.id}`}
              className="p-3 bg-muted rounded-md border-l-4 border-border"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm text-foreground">Read Range {idx + 1}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {range.startPosition}-{range.endPosition}
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete Marks & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
