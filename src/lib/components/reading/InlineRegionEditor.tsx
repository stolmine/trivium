import { useEffect, useRef, useState, useMemo } from 'react';
import { InlineToolbar } from './InlineToolbar';
import { EditableContent } from './EditableContent';
import { MarkdownRenderer } from './MarkdownRenderer';
import { parseMarkdownWithPositions } from '@/lib/utils/markdownParser';
import { cn } from '@/lib/utils';
import type { ClozeNote } from '@/lib/types/flashcard';
import type { ReadRange } from '@/lib/types/reading';
import { detectMarkOverlap } from '@/lib/utils/markOverlap';
import { MarkDeletionWarning } from './MarkDeletionWarning';
import { api } from '@/lib/utils/tauri';

interface InlineRegionEditorProps {
  content: string;
  editRegion: { start: number; end: number };
  marks?: ClozeNote[];
  readRanges?: ReadRange[];
  textId?: number;
  onSave: (newContent: string, deletedMarks?: ClozeNote[]) => Promise<void>;
  onCancel: () => void;
  initialMode?: 'styled' | 'literal';
  onNavigateToIngest?: (url: string) => void;
}

export function InlineRegionEditor({
  content,
  editRegion,
  marks,
  readRanges,
  textId,
  onSave,
  onCancel,
  initialMode = 'styled',
  onNavigateToIngest
}: InlineRegionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const [editedContent, setEditedContent] = useState('');
  const [mode, setMode] = useState<'styled' | 'literal'>(initialMode);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMarkWarning, setShowMarkWarning] = useState(false);
  const [marksToDelete, setMarksToDelete] = useState<ClozeNote[]>([]);
  const [readRangesToDelete, setReadRangesToDelete] = useState<ReadRange[]>([]);

  const contextBefore = content.substring(0, editRegion.start);
  const contextAfter = content.substring(editRegion.end);
  const originalEditedContent = content.substring(editRegion.start, editRegion.end);

  const contextBeforeAst = useMemo(() => {
    if (mode === 'styled' && contextBefore) {
      return parseMarkdownWithPositions(contextBefore);
    }
    return null;
  }, [contextBefore, mode]);

  const contextAfterAst = useMemo(() => {
    if (mode === 'styled' && contextAfter) {
      return parseMarkdownWithPositions(contextAfter);
    }
    return null;
  }, [contextAfter, mode]);

  const editedAst = useMemo(() => {
    if (mode === 'styled' && editedContent) {
      return parseMarkdownWithPositions(editedContent);
    }
    return null;
  }, [editedContent, mode]);

  const marksInEditRegion = useMemo(() => {
    if (!marks) return [];
    return marks.filter(
      mark => mark.startPosition >= editRegion.start && mark.endPosition <= editRegion.end
    ).map(mark => ({
      ...mark,
      startPosition: mark.startPosition - editRegion.start,
      endPosition: mark.endPosition - editRegion.start
    }));
  }, [marks, editRegion]);

  useEffect(() => {
    setEditedContent(originalEditedContent);
    setHasChanges(false);
  }, [originalEditedContent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
      if (e.key === 'm' || e.key === 'M') {
        if (e.target === editorRef.current) {
          return;
        }
        e.preventDefault();
        handleModeToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editedContent, hasChanges]);

  const handleContentChange = (newText: string) => {
    setEditedContent(newText);
    setHasChanges(newText !== originalEditedContent);
  };

  const handleModeToggle = () => {
    setMode(prev => prev === 'styled' ? 'literal' : 'styled');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (editableRef.current) {
          editableRef.current.scrollIntoView({
            behavior: 'instant',
            block: 'center',
            inline: 'nearest'
          });
        }
      });
    });
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }
    onCancel();
  };

  const handleSave = async () => {
    if (!hasChanges) {
      onCancel();
      return;
    }

    const overlapResult = detectMarkOverlap(
      editRegion.start,
      editRegion.end,
      marks || [],
      readRanges || []
    );

    if (overlapResult.hasOverlap) {
      setMarksToDelete(overlapResult.overlappingMarks);
      setReadRangesToDelete(overlapResult.overlappingReadRanges);
      setShowMarkWarning(true);
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    setIsSaving(true);

    try {
      if (marksToDelete.length > 0) {
        const markIds = marksToDelete.map(m => m.id);
        await api.flashcards.deleteMarks(markIds);
      }

      if (readRangesToDelete.length > 0 && textId !== undefined) {
        // Use original RENDERED positions for deletion (the database stores RENDERED positions)
        // If originalStartPosition is not available, fall back to startPosition (for backwards compatibility)
        const ranges = readRangesToDelete.map(r => [
          r.originalStartPosition ?? r.startPosition,
          r.originalEndPosition ?? r.endPosition
        ] as [number, number]);
        await api.flashcards.deleteReadRanges(textId, ranges);
      }

      const mergedText =
        content.substring(0, editRegion.start) +
        editedContent +
        content.substring(editRegion.end);

      await onSave(mergedText, marksToDelete.length > 0 ? marksToDelete : undefined);
    } finally {
      setIsSaving(false);
      setShowMarkWarning(false);
      setMarksToDelete([]);
      setReadRangesToDelete([]);
    }
  };

  const handleConfirmDelete = async () => {
    setShowMarkWarning(false);
    await performSave();
  };

  const handleCancelWarning = () => {
    setShowMarkWarning(false);
    setMarksToDelete([]);
    setReadRangesToDelete([]);
  };

  const characterCount = editedContent.length;

  return (
    <div className="relative">
      {contextBefore && (
        <div
          className="opacity-40 select-none pointer-events-none blur-[0.5px] transition-all duration-300"
          style={{
            userSelect: 'none',
            fontFamily: 'Charter, Georgia, serif',
          }}
        >
          {mode === 'styled' && contextBeforeAst ? (
            <MarkdownRenderer
              ast={contextBeforeAst}
              markdown={contextBefore}
              onTextEdit={() => {}}
              marks={undefined}
              mode="styled"
              onNavigateToIngest={onNavigateToIngest}
            />
          ) : (
            <div className="whitespace-pre-wrap">{contextBefore}</div>
          )}
        </div>
      )}

      <div
        ref={editableRef}
        className={cn(
          'relative my-4 transition-all duration-200',
          'animate-in fade-in slide-in-from-bottom-2'
        )}
      >
        <div
          ref={editorRef}
          className={cn(
            'outline-none transition-all duration-200',
            'bg-white dark:bg-zinc-900',
            'border-2 border-gray-800 dark:border-gray-200',
            'rounded-md px-4 py-3',
            'min-h-[3rem]',
            'focus-within:ring-2 focus-within:ring-gray-800/20 dark:focus-within:ring-gray-200/25'
          )}
        >
          <EditableContent
            mode={mode}
            markdown={editedContent}
            ast={editedAst || undefined}
            marks={marksInEditRegion}
            editableRange={{ start: 0, end: editedContent.length }}
            onContentChange={handleContentChange}
          />
        </div>

        <InlineToolbar
          mode={mode}
          characterCount={characterCount}
          hasChanges={hasChanges}
          isSaving={isSaving}
          onModeToggle={handleModeToggle}
          onCancel={handleCancel}
          onSave={handleSave}
        />
      </div>

      {contextAfter && (
        <div
          className="opacity-40 select-none pointer-events-none blur-[0.5px] transition-all duration-300"
          style={{
            userSelect: 'none',
            fontFamily: 'Charter, Georgia, serif',
          }}
        >
          {mode === 'styled' && contextAfterAst ? (
            <MarkdownRenderer
              ast={contextAfterAst}
              markdown={contextAfter}
              onTextEdit={() => {}}
              marks={undefined}
              mode="styled"
              onNavigateToIngest={onNavigateToIngest}
            />
          ) : (
            <div className="whitespace-pre-wrap">{contextAfter}</div>
          )}
        </div>
      )}

      <MarkDeletionWarning
        open={showMarkWarning}
        onOpenChange={setShowMarkWarning}
        marks={marksToDelete}
        readRanges={readRangesToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelWarning}
      />
    </div>
  );
}
