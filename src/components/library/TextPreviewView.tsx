import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReadHighlighter } from '../../lib/components/reading/ReadHighlighter';
import { Button } from '../../lib/components/ui/button';
import { api } from '../../lib/utils/tauri';
import type { SmartExcerpt } from '../../lib/types';

interface TextPreviewViewProps {
  textId: number;
}

export function TextPreviewView({ textId }: TextPreviewViewProps) {
  const [excerpt, setExcerpt] = useState<SmartExcerpt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    api.texts.getSmartExcerpt(textId)
      .then(setExcerpt)
      .catch((err) => {
        console.error('Failed to load excerpt:', err);
        setError(err.message || 'Failed to load preview');
      })
      .finally(() => setIsLoading(false));
  }, [textId]);

  const handleOpenReader = () => {
    navigate(`/read/${textId}`);
  };

  const handleContinueReading = () => {
    if (excerpt && excerpt.currentPosition > 0) {
      navigate(`/read/${textId}`, { state: { scrollToPosition: excerpt.currentPosition } });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading preview...</div>
      </div>
    );
  }

  if (error || !excerpt) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-destructive">
          {error || 'Failed to load preview'}
        </div>
      </div>
    );
  }

  // Validate that excerpt has all required properties
  if (typeof excerpt.startPos !== 'number' || typeof excerpt.totalLength !== 'number') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-destructive">
          Invalid preview data
        </div>
      </div>
    );
  }

  const getExcerptTypeLabel = () => {
    return 'Preview:';
  };

  return (
    <div className="border-t border-border bg-sidebar">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="text-xs text-muted-foreground">
          {getExcerptTypeLabel()}
        </div>
        <div className="text-xs text-muted-foreground">
          Position: {excerpt.startPos.toLocaleString()} / {excerpt.totalLength.toLocaleString()} chars
        </div>
      </div>

      <div className="p-4 max-h-64 overflow-y-auto prose prose-sm dark:prose-invert">
        <ReadHighlighter
          content={excerpt.excerpt}
          readRanges={excerpt.readRanges}
        />
      </div>

      <div className="flex gap-2 px-4 pb-4">
        <Button onClick={handleOpenReader}>
          Open in Reader
        </Button>
        {excerpt.currentPosition > 0 && (
          <Button variant="outline" onClick={handleContinueReading}>
            Continue Reading
          </Button>
        )}
      </div>
    </div>
  );
}
