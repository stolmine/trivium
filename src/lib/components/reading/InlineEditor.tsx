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

  useEffect(() => {
    if (isActive && divRef.current) {
      divRef.current.focus();
    }
  }, [isActive]);

  // Sync content when initialContent changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.textContent || '';
    setContent(newText);
    onContentChange(newText);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleActivate = () => {
    onActivate();
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
