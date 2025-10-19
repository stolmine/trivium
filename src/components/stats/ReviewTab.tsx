import { useEffect } from 'react';
import { EmptyStatsState } from './EmptyStatsState';
import { StatsSummaryCard } from './StatsSummaryCard';
import { useStatsStore } from '@/lib/stores/stats';
import { Loader2 } from 'lucide-react';
import { HourlyDistributionChart } from './charts/HourlyDistributionChart';
import { AnswerDistributionChart } from './charts/AnswerDistributionChart';

export function ReviewTab() {
  const { isLoading, error, reviewStats, dailyReviewStats, hourlyDistribution, loadStats, dateRange } = useStatsStore();

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
    return (
      <EmptyStatsState
        title="No Review Statistics"
        message="Complete some card reviews to see detailed performance analytics, hourly distribution, and accuracy trends."
      />
    );
  }

  const totalAnswers = dailyReviewStats.reduce((sum, day) =>
    sum + day.againCount + day.hardCount + day.goodCount + day.easyCount, 0
  );

  const againRate = totalAnswers > 0 ? (dailyReviewStats.reduce((sum, day) => sum + day.againCount, 0) / totalAnswers * 100).toFixed(1) : '0';
  const hardRate = totalAnswers > 0 ? (dailyReviewStats.reduce((sum, day) => sum + day.hardCount, 0) / totalAnswers * 100).toFixed(1) : '0';
  const goodRate = totalAnswers > 0 ? (dailyReviewStats.reduce((sum, day) => sum + day.goodCount, 0) / totalAnswers * 100).toFixed(1) : '0';
  const easyRate = totalAnswers > 0 ? (dailyReviewStats.reduce((sum, day) => sum + day.easyCount, 0) / totalAnswers * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsSummaryCard
          title="Again Rate"
          value={`${againRate}%`}
          subtitle="Failed cards"
        />
        <StatsSummaryCard
          title="Hard Rate"
          value={`${hardRate}%`}
          subtitle="Difficult cards"
        />
        <StatsSummaryCard
          title="Good Rate"
          value={`${goodRate}%`}
          subtitle="Normal cards"
        />
        <StatsSummaryCard
          title="Easy Rate"
          value={`${easyRate}%`}
          subtitle="Easy cards"
        />
      </div>

      {hourlyDistribution.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Hourly Performance</h3>
          <HourlyDistributionChart data={hourlyDistribution} />
        </div>
      )}

      {dailyReviewStats.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Daily Answer Distribution</h3>
          <AnswerDistributionChart data={dailyReviewStats} />
        </div>
      )}

      {dailyReviewStats.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Daily Review Stats</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Reviews</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Cards</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Avg Rating</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Again</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Hard</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Good</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Easy</th>
                </tr>
              </thead>
              <tbody>
                {dailyReviewStats.slice(-10).map((day) => (
                  <tr key={day.date} className="border-b border-border last:border-0">
                    <td className="py-2 px-3">
                      {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="text-right py-2 px-3">{day.totalReviews}</td>
                    <td className="text-right py-2 px-3">{day.uniqueCards}</td>
                    <td className="text-right py-2 px-3">{day.avgRating.toFixed(2)}</td>
                    <td className="text-right py-2 px-3 text-red-600 dark:text-red-400">{day.againCount}</td>
                    <td className="text-right py-2 px-3 text-orange-600 dark:text-orange-400">{day.hardCount}</td>
                    <td className="text-right py-2 px-3 text-green-600 dark:text-green-400">{day.goodCount}</td>
                    <td className="text-right py-2 px-3 text-blue-600 dark:text-blue-400">{day.easyCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
