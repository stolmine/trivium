import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { api } from '../../lib/utils/tauri';
import { Button } from '../../lib/components/ui/button';
import { Skeleton } from '../../components/shared/SkeletonLoader';
import { formatDueDate } from '../../lib/utils/date';
import { useLibraryStore } from '../../stores/library';
import type { Text } from '../../lib/types/article';
import type { Flashcard } from '../../lib/types/flashcard';

interface TextInfoViewProps {
  textId: number;
}

interface TextStatistics {
  text: Text;
  progress: number;
  flashcards: Flashcard[];
  wordCount: number;
  paragraphCount: number;
  lastReadDate: string | null;
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

function SkeletonTextInfo() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full mt-2" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>

      <div className="flex gap-2 mt-6">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

export function TextInfoView({ textId }: TextInfoViewProps) {
  const navigate = useNavigate();
  const folders = useLibraryStore((state) => state.folders);
  const [statistics, setStatistics] = useState<TextStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatistics() {
      setIsLoading(true);
      setError(null);

      try {
        const [text, progress, flashcards] = await Promise.all([
          api.texts.get(textId),
          api.reading.calculateProgress(textId),
          api.flashcards.getByText(textId),
        ]);

        const wordCount = Math.round(text.contentLength / 5);
        const paragraphCount = text.content.split(/\n\n+/).filter(p => p.trim().length > 0).length;

        setStatistics({
          text,
          progress,
          flashcards,
          wordCount,
          paragraphCount,
          lastReadDate: null,
        });
      } catch (err) {
        console.error('Failed to load text statistics:', err);
        setError('Failed to load text information');
      } finally {
        setIsLoading(false);
      }
    }

    loadStatistics();
  }, [textId]);

  const handleOpen = () => {
    navigate(`/read/${textId}`);
  };

  const handleDelete = () => {
    console.log('Delete action not yet implemented');
  };

  if (isLoading) {
    return <SkeletonTextInfo />;
  }

  if (error || !statistics) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[400px] text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">
          {error || 'Failed to load text information'}
        </p>
      </div>
    );
  }

  const { text, progress, flashcards, wordCount, paragraphCount } = statistics;

  const newCards = flashcards.filter(f => f.state === 0).length;
  const learningCards = flashcards.filter(f => f.state === 1 || f.state === 2).length;
  const reviewCards = flashcards.filter(f => f.state === 3).length;

  const folder = text.folderId ? folders.find(f => f.id === text.folderId) : null;

  return (
    <div className="p-4 space-y-6">
      <div>
        <div className="flex items-start gap-2 mb-2">
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <h2 className="text-xl font-semibold break-words">{text.title}</h2>
        </div>
        {folder && (
          <p className="text-sm text-muted-foreground ml-7">
            {folder.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Content</h3>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Length</dt>
            <dd className="font-medium">
              {formatNumber(text.contentLength)} characters, {formatNumber(wordCount)} words
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Paragraphs</dt>
            <dd className="font-medium">{formatNumber(paragraphCount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Progress</dt>
            <dd className="font-medium">{formatPercentage(progress)}</dd>
          </div>
        </dl>

        <div className="mt-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {flashcards.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Flashcards</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-medium">{formatNumber(flashcards.length)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Breakdown</dt>
              <dd className="font-medium">
                {newCards > 0 && `${newCards} new`}
                {newCards > 0 && (learningCards > 0 || reviewCards > 0) && ', '}
                {learningCards > 0 && `${learningCards} learning`}
                {learningCards > 0 && reviewCards > 0 && ', '}
                {reviewCards > 0 && `${reviewCards} review`}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Details</h3>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Created</dt>
            <dd className="font-medium">{formatDueDate(text.ingestedAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Modified</dt>
            <dd className="font-medium">{formatDueDate(text.updatedAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Last read</dt>
            <dd className="font-medium text-muted-foreground">Never</dd>
          </div>
        </dl>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleOpen}>
          Open
        </Button>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={true}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
