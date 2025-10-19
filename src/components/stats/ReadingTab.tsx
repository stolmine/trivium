import { useEffect } from 'react';
import { EmptyStatsState } from './EmptyStatsState';
import { StatsSummaryCard } from './StatsSummaryCard';
import { useStatsStore } from '@/lib/stores/stats';
import { Loader2 } from 'lucide-react';

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function ReadingTab() {
  const { isLoading, error, readingStats, loadStats, dateRange } = useStatsStore();

  useEffect(() => {
    loadStats(dateRange);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
        <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Statistics</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const hasData = readingStats && readingStats.sessionCount > 0;

  if (!hasData) {
    return (
      <EmptyStatsState
        title="No Reading Statistics"
        message="Start reading and marking content to see reading progress by folder, reading velocity, and session metrics."
      />
    );
  }

  const avgSessionTime = formatTime(readingStats.avgSessionDuration);
  const totalTime = formatTime(readingStats.totalTimeSeconds);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsSummaryCard
          title="Total Reading Time"
          value={totalTime}
          subtitle="This period"
        />
        <StatsSummaryCard
          title="Sessions"
          value={readingStats.sessionCount}
          subtitle="Reading sessions"
        />
        <StatsSummaryCard
          title="Avg Session"
          value={avgSessionTime}
          subtitle="Per session"
        />
        <StatsSummaryCard
          title="Characters Read"
          value={formatNumber(readingStats.totalCharactersRead)}
          subtitle="Total read"
        />
      </div>

      {readingStats.byFolder.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Reading by Folder</h3>
          <div className="space-y-4">
            {readingStats.byFolder
              .sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds)
              .map((folder) => {
                const totalFolderTime = readingStats.byFolder.reduce((sum, f) => sum + f.totalTimeSeconds, 0);
                const widthPercent = totalFolderTime > 0 ? (folder.totalTimeSeconds / totalFolderTime) * 100 : 0;
                const folderTime = formatTime(folder.totalTimeSeconds);

                return (
                  <div key={folder.folderId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{folder.folderName}</span>
                      <span className="text-sm text-muted-foreground">{folderTime}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {widthPercent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{formatNumber(folder.charactersRead)} characters</span>
                      <span>{folder.sessionCount} sessions</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Reading Summary</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Total time spent reading</span>
            <span className="font-medium">{totalTime}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Total reading sessions</span>
            <span className="font-medium">{readingStats.sessionCount}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Average session duration</span>
            <span className="font-medium">{avgSessionTime}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Total characters read</span>
            <span className="font-medium">{readingStats.totalCharactersRead.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Texts read</span>
            <span className="font-medium">{readingStats.textsRead}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
