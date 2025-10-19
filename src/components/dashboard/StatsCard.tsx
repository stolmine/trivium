import { useEffect, useState } from 'react';
import { BarChart3, BookOpen, Calendar, TrendingUp } from 'lucide-react';
import { SkeletonCard } from '../shared/SkeletonLoader';
import { api } from '../../lib/utils/tauri';
import type { ReviewStatistics, ReadingStatistics } from '../../lib/types';

interface DashboardMetrics {
  readingProgress: string;
  reviewForecast: string;
  retentionRate: string;
}

export function StatsCard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const startDate = weekAgo.toISOString();
        const endDate = now.toISOString();

        const [reviewStats, readingStats] = await Promise.all([
          api.statistics.getReviewStatistics(startDate, endDate),
          api.statistics.getReadingStats(startDate, endDate),
        ]);

        const readingProgress = formatReadingProgress(readingStats);
        const reviewForecast = formatReviewForecast(reviewStats);
        const retentionRate = formatRetentionRate(reviewStats);

        setMetrics({
          readingProgress,
          reviewForecast,
          retentionRate,
        });
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
        setMetrics({
          readingProgress: '0 chars',
          reviewForecast: '0 due',
          retentionRate: '0%',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
  }, []);

  const formatReadingProgress = (stats: ReadingStatistics): string => {
    const chars = stats.totalCharactersRead;
    if (chars === 0) return '0 chars';
    if (chars < 1000) return `${chars} chars`;
    if (chars < 1000000) return `${(chars / 1000).toFixed(1)}k chars`;
    return `${(chars / 1000000).toFixed(1)}M chars`;
  };

  const formatReviewForecast = (stats: ReviewStatistics): string => {
    if (!stats.forecastNext7Days || stats.forecastNext7Days.length === 0) {
      return '0 due';
    }

    const today = stats.forecastNext7Days[0];
    const tomorrow = stats.forecastNext7Days.length > 1 ? stats.forecastNext7Days[1] : null;

    if (today && today.cardsDue > 0) {
      return `${today.cardsDue} today`;
    }

    if (tomorrow && tomorrow.cardsDue > 0) {
      return `${tomorrow.cardsDue} tomorrow`;
    }

    return '0 due';
  };

  const formatRetentionRate = (stats: ReviewStatistics): string => {
    return `${stats.retentionRate.toFixed(0)}%`;
  };

  if (isLoading) {
    return <SkeletonCard className="h-full" />;
  }

  if (error) {
    return (
      <div className="border rounded-lg p-8 shadow-card bg-card">
        <h2 className="text-lg font-semibold mb-4">Statistics</h2>
        <div className="text-destructive text-sm">{error}</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="border rounded-lg p-8 shadow-card bg-card">
        <h2 className="text-lg font-semibold mb-4">Statistics</h2>
        <div className="text-muted-foreground text-sm">No data available</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-8 shadow-card bg-card">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Statistics</h2>
      </div>

      <div className="space-y-4">
        <div className="text-xs font-medium text-muted-foreground mb-3">
          This Week:
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center justify-between flex-1">
              <span className="text-sm text-muted-foreground">Reading Progress</span>
              <span className="text-lg font-semibold">{metrics.readingProgress}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center justify-between flex-1">
              <span className="text-sm text-muted-foreground">Review Forecast</span>
              <span className="text-lg font-semibold">{metrics.reviewForecast}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center justify-between flex-1">
              <span className="text-sm text-muted-foreground">Retention Rate</span>
              <span className="text-lg font-semibold">{metrics.retentionRate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
