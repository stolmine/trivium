import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookMarked, Layers } from 'lucide-react';
import { Button } from '../../lib/components/ui';
import { api } from '../../lib/utils/tauri';
import { SkeletonCard } from '../shared/SkeletonLoader';

export function CreateCardsCard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ pending: 0, todayCount: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const hubStats = await api.hub.getStats();
        setStats({
          pending: hubStats.pending,
          todayCount: hubStats.todayCount,
        });
      } catch (err) {
        console.error('Failed to load hub stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  const handleStartCreating = () => {
    navigate('/create');
  };

  if (isLoading) {
    return <SkeletonCard className="h-full" />;
  }

  if (error) {
    return (
      <div className="border rounded-lg p-8 shadow-card bg-card">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Create Cards</h2>
        </div>
        <div className="text-destructive text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-8 shadow-card hover-lift bg-card">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Create Cards</h2>
        {stats.pending > 0 && (
          <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
            {stats.pending} pending
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Turn your marked text into flashcards
      </p>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 text-sm">
          <BookMarked className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">Marks awaiting cards:</span>
          <span className="ml-auto font-semibold">{stats.pending}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">Cards created today:</span>
          <span className="ml-auto font-semibold">{stats.todayCount}</span>
        </div>
      </div>

      <Button
        onClick={handleStartCreating}
        className="w-full"
        disabled={stats.pending === 0}
      >
        {stats.pending === 0 ? 'No Marks Available' : 'Start Creating'}
      </Button>
    </div>
  );
}
