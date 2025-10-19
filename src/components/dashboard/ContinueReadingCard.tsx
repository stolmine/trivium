import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Button } from '../../lib/components/ui';
import { EmptyState } from '../shared/EmptyState';
import { useLastReadStore } from '../../lib/stores/lastRead';
import type { ReadPageLocationState } from '../../lib/types/navigation';

export function ContinueReadingCard() {
  const navigate = useNavigate();
  const { textId, textTitle, scrollPosition, progress, timestamp, hasLastRead } = useLastReadStore();

  const handleContinue = () => {
    if (textId) {
      const state: ReadPageLocationState = {
        restoreScrollPosition: scrollPosition,
        __fromHistory: true
      };
      navigate(`/read/${textId}`, { state });
    }
  };

  const formatTimestamp = (timestamp: number | null): string => {
    if (!timestamp) return '';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  if (!hasLastRead() || !textId || !textTitle) {
    return (
      <div className="border rounded-lg p-8 shadow-card bg-card h-full flex items-center justify-center">
        <EmptyState
          icon={BookOpen}
          title="No Reading in Progress"
          description="Ingest a text to start reading and tracking your progress."
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
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Continue Reading</h2>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="font-medium text-base mb-1">{textTitle}</h3>
          <p className="text-sm text-muted-foreground">{formatTimestamp(timestamp)}</p>
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
        </div>

        <Button onClick={handleContinue} className="w-full mt-4">
          Continue Reading
        </Button>
      </div>
    </div>
  );
}
