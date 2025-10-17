import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui';
import { Loader2 } from 'lucide-react';

interface TextEditorProps {
  textId: number;
  initialContent: string;
  onSave: (newContent: string) => Promise<void>;
  onCancel: () => void;
  fontSize: number;
}

export function TextEditor({
  initialContent,
  onSave,
  onCancel,
  fontSize,
}: TextEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    setHasUnsavedChanges(content !== initialContent);
  }, [content, initialContent]);

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, hasUnsavedChanges]);

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await onSave(content);
    } catch (error) {
      console.error('Failed to save text:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('Discard unsaved changes?')) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  const charCount = content.length;

  return (
    <div className="flex flex-col h-full">
      <div className="border-l-4 border-primary bg-primary/5 px-4 py-3 mb-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-primary">
          Edit Mode Active
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          All marks will be flagged for review after saving changes.
        </p>
      </div>

      <div className="flex-1 mb-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full p-4 bg-background border border-border rounded-md resize-none font-serif focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
          disabled={isSaving}
        />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="text-sm text-muted-foreground" aria-live="polite">
          {charCount.toLocaleString()} characters
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
