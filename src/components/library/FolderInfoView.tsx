import { useState, useEffect } from 'react';
import { Folder, FileText, BookOpen, Activity, Brain, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../lib/components/ui/button';
import { useLibraryStatsCacheStore } from '../../stores/libraryStatsCache';
import type { FolderStatistics } from '../../lib/types/statistics';

interface FolderInfoViewProps {
  folderId: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function FolderInfoView({ folderId }: FolderInfoViewProps) {
  const { getFolderStats, loadFolderStats } = useLibraryStatsCacheStore();
  const [stats, setStats] = useState<FolderStatistics | null>(() => getFolderStats(folderId));
  const [isLoading, setIsLoading] = useState(() => !getFolderStats(folderId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      // Try to get from cache first
      const cached = getFolderStats(folderId);
      if (cached) {
        setStats(cached);
        setIsLoading(false);
        // Still load fresh data in background
        try {
          const fresh = await loadFolderStats(folderId);
          if (isMounted) {
            setStats(fresh);
          }
        } catch (err) {
          // Ignore errors on background refresh if we have cached data
          console.error('Failed to refresh folder stats:', err);
        }
        return;
      }

      // No cache, show loading
      setIsLoading(true);
      setError(null);

      try {
        const data = await loadFolderStats(folderId);
        if (isMounted) {
          setStats(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load folder statistics');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, [folderId, getFolderStats, loadFolderStats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-1">Failed to load folder statistics</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Folder className="h-8 w-8 text-muted-foreground flex-shrink-0" />
          <h2 className="text-2xl font-semibold text-foreground truncate">{stats.name}</h2>
        </div>
        {stats.parentPath && (
          <p className="text-sm text-muted-foreground pl-11">{stats.parentPath}</p>
        )}
      </div>

      {stats.totalTexts === 0 ? (
        <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            This folder is empty. Add texts to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Contents</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground">
                  {stats.totalTexts} {stats.totalTexts === 1 ? 'text' : 'texts'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground">
                  {stats.totalContentLength.toLocaleString()} characters across all texts
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground">
                  {stats.averageProgress.toFixed(1)}% read on average
                </span>
              </div>
              {stats.totalFlashcards > 0 && (
                <div className="flex items-center gap-3">
                  <Brain className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground">
                    {stats.totalFlashcards} {stats.totalFlashcards === 1 ? 'flashcard' : 'flashcards'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Details</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm text-foreground">{formatDate(stats.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Modified</p>
                  <p className="text-sm text-foreground">{formatDate(stats.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" disabled>
            Rename
          </Button>
          <Button variant="outline" size="sm" disabled>
            New Text
          </Button>
          <Button variant="destructive" size="sm" disabled>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
