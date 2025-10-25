import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils';

interface InlineEditorProps {
  initialContent: string;
  onContentChange: (newContent: string) => void;
  onActivate: () => void;
  onDeactivate: () => void;
  isActive: boolean;
  className?: string;
  fontSize: number;
}

export function InlineEditor({
  initialContent,
  onContentChange,
  onActivate,
  onDeactivate,
  isActive,
  className,
  fontSize
}: InlineEditorProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(initialContent);

  // Refs to track cursor position for restoration after re-render
  const cursorNodeRef = useRef<Node | null>(null);
  const cursorOffsetRef = useRef<number>(0);
  const shouldRestoreCursorRef = useRef(false);

  useEffect(() => {
    if (isActive && divRef.current) {
      divRef.current.focus();
    }
  }, [isActive]);

  // Sync content when initialContent changes (external update)
  useEffect(() => {
    setContent(initialContent);
    // Don't restore cursor on external content changes
    shouldRestoreCursorRef.current = false;
  }, [initialContent]);

  // Restore cursor position after content updates from user input
  useEffect(() => {
    if (shouldRestoreCursorRef.current && cursorNodeRef.current && divRef.current?.contains(cursorNodeRef.current)) {
      try {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();

          // Clamp offset to valid range for the node
          const maxOffset = cursorNodeRef.current.nodeType === Node.TEXT_NODE
            ? (cursorNodeRef.current.textContent?.length || 0)
            : cursorNodeRef.current.childNodes.length;
          const clampedOffset = Math.min(cursorOffsetRef.current, maxOffset);

          range.setStart(cursorNodeRef.current, clampedOffset);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (e) {
        // Cursor position may be invalid after content change
        console.warn('Could not restore cursor position', e);
      }
      shouldRestoreCursorRef.current = false;
    }
  }, [content]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.textContent || '';

    // Save cursor position before state update
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      cursorNodeRef.current = range.startContainer;
      cursorOffsetRef.current = range.startOffset;
      shouldRestoreCursorRef.current = true;
    }

    setContent(newText);
    onContentChange(newText);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleActivate = () => {
    // Only call onActivate if not already active
    if (!isActive) {
      onActivate();
    }
  };

  const handleDeactivate = () => {
    onDeactivate();
  };

  return (
    <div
      ref={divRef}
      contentEditable={isActive}
      onInput={handleInput}
      onPaste={handlePaste}
      onClick={handleActivate}
      onBlur={handleDeactivate}
      className={cn(
        'outline-none transition-all',
        isActive ? 'border-2 border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-2 border-transparent',
        className
      )}
      style={{
        fontFamily: 'Charter, Georgia, serif',
        fontSize: `${fontSize}rem`,
        lineHeight: 1.7,
        padding: '0.5rem',
        borderRadius: '4px',
        minHeight: '2rem',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        WebkitUserSelect: 'text',
      }}
      suppressContentEditableWarning
    >
      {content}
    </div>
  );
}
