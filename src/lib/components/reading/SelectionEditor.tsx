import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui';
import { cn } from '@/lib/utils';
import { updateMarkPositions } from '@/lib/utils/markPositions';
import type { ClozeNote } from '@/lib/types/flashcard';

interface SelectionEditorProps {
  fullText: string;
  marks: ClozeNote[];
  editRegion: {
    start: number;
    end: number;
    extractedText: string;
  } | null;
  onSave: (newText: string, updatedMarks: ClozeNote[]) => void;
  onCancel: () => void;
  fontSize: number;
}

export function SelectionEditor({
  fullText,
  marks,
  editRegion,
  onSave,
  onCancel,
  fontSize,
}: SelectionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editedContent, setEditedContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (editRegion) {
      setEditedContent(editRegion.extractedText);
      setHasChanges(false);
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }
  }, [editRegion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editedContent, editRegion]);

  if (!editRegion) {
    return null;
  }

  const contextBefore = fullText.substring(
    Math.max(0, editRegion.start - 100),
    editRegion.start
  );

  const contextAfter = fullText.substring(
    editRegion.end,
    Math.min(fullText.length, editRegion.end + 100)
  );

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.textContent || '';
    setEditedContent(newText);
    setHasChanges(newText !== editRegion.extractedText);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleSave = () => {
    if (!hasChanges) {
      onCancel();
      return;
    }

    const editRegionData = {
      start: editRegion.start,
      end: editRegion.end,
      originalText: editRegion.extractedText,
    };

    const { marks: updatedMarks } = updateMarkPositions(
      marks,
      editRegionData,
      editedContent
    );

    const mergedText =
      fullText.substring(0, editRegion.start) +
      editedContent +
      fullText.substring(editRegion.end);

    onSave(mergedText, updatedMarks);
  };

  const overlappingMarks = marks.filter(mark => {
    return (
      (mark.startPosition >= editRegion.start && mark.startPosition < editRegion.end) ||
      (mark.endPosition > editRegion.start && mark.endPosition <= editRegion.end) ||
      (mark.startPosition < editRegion.start && mark.endPosition > editRegion.end)
    );
  });

  const charCount = editedContent.length;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-background border border-border rounded-lg shadow-lg overflow-hidden">
        <div className="border-b border-border bg-muted px-6 py-4">
          <h2 className="font-semibold text-lg">Edit Selection</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Make changes to the selected text region
          </p>
        </div>

        {overlappingMarks.length > 0 && (
          <div className="mx-6 mt-4 border-l-4 border-yellow-500 bg-yellow-500/10 px-4 py-3">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              <strong>Warning:</strong> {overlappingMarks.length} mark{overlappingMarks.length > 1 ? 's' : ''} overlap with this region and will be flagged for review.
            </p>
          </div>
        )}

        <div className="p-6">
          <div
            className="relative"
            style={{
              fontFamily: 'Charter, Georgia, serif',
              fontSize: `${fontSize}rem`,
              lineHeight: 1.7,
            }}
          >
            {contextBefore && (
              <div
                className="opacity-60 select-none pointer-events-none"
                style={{ userSelect: 'none' }}
              >
                {contextBefore}
              </div>
            )}

            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onPaste={handlePaste}
              className={cn(
                'outline-none transition-all',
                'border-2 border-primary bg-primary/5',
                'ring-2 ring-primary/20',
                'px-4 py-3 rounded-md',
                'min-h-[3rem]',
                'whitespace-pre-wrap break-words'
              )}
              suppressContentEditableWarning
            >
              {editedContent}
            </div>

            {contextAfter && (
              <div
                className="opacity-60 select-none pointer-events-none"
                style={{ userSelect: 'none' }}
              >
                {contextAfter}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border px-6 py-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">
                {charCount.toLocaleString()} characters
              </div>
              <div className="text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">Ctrl+S</kbd> to save
                {' · '}
                <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">Esc</kbd> to cancel
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
