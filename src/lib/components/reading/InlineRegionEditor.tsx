import { useEffect, useRef, useState } from 'react';
import { InlineToolbar } from './InlineToolbar';
import { cn } from '@/lib/utils';
import type { ClozeNote } from '@/lib/types/flashcard';

interface InlineRegionEditorProps {
  content: string;
  editRegion: { start: number; end: number };
  marks?: ClozeNote[];
  onSave: (newContent: string) => Promise<void>;
  onCancel: () => void;
  initialMode?: 'styled' | 'literal';
}

export function InlineRegionEditor({
  content,
  editRegion,
  onSave,
  onCancel,
  initialMode = 'styled'
}: InlineRegionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editedContent, setEditedContent] = useState('');
  const [mode, setMode] = useState<'styled' | 'literal'>(initialMode);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const contextBefore = content.substring(0, editRegion.start);
  const contextAfter = content.substring(editRegion.end);
  const originalEditedContent = content.substring(editRegion.start, editRegion.end);

  useEffect(() => {
    setEditedContent(originalEditedContent);
    setHasChanges(false);

    if (editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
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

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.textContent || '';
    setEditedContent(newText);
    setHasChanges(newText !== originalEditedContent);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleModeToggle = () => {
    setMode(prev => prev === 'styled' ? 'literal' : 'styled');
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

    setIsSaving(true);

    try {
      const mergedText =
        content.substring(0, editRegion.start) +
        editedContent +
        content.substring(editRegion.end);

      await onSave(mergedText);
    } finally {
      setIsSaving(false);
    }
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
          {contextBefore}
        </div>
      )}

      <div
        className={cn(
          'relative my-4 transition-all duration-200',
          'animate-in fade-in slide-in-from-bottom-2'
        )}
      >
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          className={cn(
            'outline-none transition-all duration-200',
            'bg-white dark:bg-zinc-900',
            'border-2 border-gray-800 dark:border-gray-200',
            'rounded-md px-4 py-3',
            'min-h-[3rem]',
            'whitespace-pre-wrap break-words',
            'focus:ring-2 focus:ring-gray-800/20 dark:focus:ring-gray-200/25'
          )}
          style={{
            fontFamily: 'Charter, Georgia, serif',
          }}
          suppressContentEditableWarning
          role="textbox"
          aria-label="Edit text region"
          aria-multiline="true"
        >
          {editedContent}
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
          {contextAfter}
        </div>
      )}
    </div>
  );
}
