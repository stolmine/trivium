import { useEffect } from 'react';
import { StatsSummaryCard } from './StatsSummaryCard';
import { EmptyStatsState } from './EmptyStatsState';
import { useStatsStore } from '@/lib/stores/stats';
import { Loader2 } from 'lucide-react';
import { ForecastChart } from './charts/ForecastChart';
import { StudyTimeChart } from './charts/StudyTimeChart';

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
  }, [dateRange, loadStats]);

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
        <ForecastChart data={reviewStats.forecastNext7Days} />
      </div>

      {studyTimeStats && studyTimeStats.byDate.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Daily Study Time</h3>
          <StudyTimeChart data={studyTimeStats.byDate} />
        </div>
      )}
    </div>
  );
}
