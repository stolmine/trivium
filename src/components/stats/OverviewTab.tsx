import { useEffect } from 'react';
import { StatsSummaryCard } from './StatsSummaryCard';
import { EmptyStatsState } from './EmptyStatsState';
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

export function OverviewTab() {
  const { isLoading, error, reviewStats, studyTimeStats, loadStats, dateRange } = useStatsStore();

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

  const hasData = reviewStats && reviewStats.totalReviews > 0;

  if (!hasData) {
    return <EmptyStatsState />;
  }

  const retentionRate = reviewStats.retentionRate.toFixed(1);
  const avgStudyTime = studyTimeStats ? formatTime(studyTimeStats.totalStudyTimeMs / 1000) : '0m';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsSummaryCard
          title="Total Reviews"
          value={reviewStats.totalReviews}
          subtitle="This period"
        />
        <StatsSummaryCard
          title="Study Time"
          value={avgStudyTime}
          subtitle="Total time spent"
        />
        <StatsSummaryCard
          title="Study Streak"
          value={reviewStats.dailyStreak}
          subtitle="Days"
        />
        <StatsSummaryCard
          title="Retention Rate"
          value={`${retentionRate}%`}
          subtitle="Success rate"
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="text-lg font-semibold mb-4">7-Day Forecast</h3>
        <div className="space-y-3">
          {reviewStats.forecastNext7Days.map((day) => (
            <div key={day.date} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm font-medium">{new Date(day.date).toLocaleDateString()}</span>
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{day.cardsDue}</span> due
                </span>
                <span className="text-muted-foreground">
                  <span className="font-medium text-blue-600 dark:text-blue-400">{day.newCards}</span> new
                </span>
                <span className="text-muted-foreground">
                  <span className="font-medium text-green-600 dark:text-green-400">{day.reviewCards}</span> review
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {studyTimeStats && studyTimeStats.byDate.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Daily Study Time</h3>
          <div className="space-y-2">
            {studyTimeStats.byDate.slice(-7).map((day) => {
              const timeMinutes = Math.floor(day.totalTimeMs / 60000);
              const maxTime = Math.max(...studyTimeStats.byDate.map(d => d.totalTimeMs));
              const widthPercent = maxTime > 0 ? (day.totalTimeMs / maxTime) * 100 : 0;

              return (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-20">
                    {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-16 text-right">
                    {timeMinutes}m
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
