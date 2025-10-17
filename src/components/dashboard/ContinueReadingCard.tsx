import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Button } from '../../lib/components/ui';
import { api } from '../../lib/utils/tauri';
import type { Text } from '../../lib/types';
import { SkeletonCard } from '../shared/SkeletonLoader';
import { EmptyState } from '../shared/EmptyState';

export function ContinueReadingCard() {
  const navigate = useNavigate();
  const [currentText, setCurrentText] = useState<Text | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecentText = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const textId = await api.dashboard.getMostRecentlyReadText();

        if (textId) {
          const text = await api.texts.get(textId);
          const textProgress = await api.reading.calculateProgress(textId);

          setCurrentText(text);
          setProgress(textProgress);
        } else {
          setCurrentText(null);
        }
      } catch (err) {
        console.error('Failed to load recent text:', err);
        setError(err instanceof Error ? err.message : 'Failed to load recent text');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentText();
  }, []);

  const handleContinue = () => {
    if (currentText) {
      navigate(`/read/${currentText.id}`);
    }
  };

  const estimateReadingTime = (contentLength: number, progress: number): string => {
    const remainingChars = contentLength * (1 - progress / 100);
    const avgCharsPerMinute = 1000;
    const minutes = Math.ceil(remainingChars / avgCharsPerMinute);

    if (minutes < 60) {
      return `${minutes}m left`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
  };

  if (isLoading) {
    return <SkeletonCard className="h-full" />;
  }

  if (error) {
    return (
      <div className="border rounded-lg p-8 shadow-card bg-card">
        <h2 className="text-lg font-semibold mb-4">Continue Reading</h2>
        <div className="text-destructive text-sm">{error}</div>
      </div>
    );
  }

  if (!currentText) {
    return (
      <div className="border rounded-lg p-8 shadow-card bg-card h-full flex items-center justify-center">
        <EmptyState
          icon={BookOpen}
          title="No Reading in Progress"
          description="Import a text to start reading and tracking your progress."
          action={{
            label: 'Go to Library',
            onClick: () => navigate('/library'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-8 shadow-card bg-card">
      <h2 className="text-lg font-semibold mb-6">Continue Reading</h2>

      <div className="space-y-3">
        <div>
          <h3 className="font-medium text-base mb-1">{currentText.title}</h3>
          {currentText.author && (
            <p className="text-sm text-muted-foreground">by {currentText.author}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress.toFixed(0)}%</span>
          </div>

          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {estimateReadingTime(currentText.contentLength, progress)}
          </p>
        </div>

        <Button onClick={handleContinue} className="w-full mt-4">
          Continue Reading
        </Button>
      </div>
    </div>
  );
}
