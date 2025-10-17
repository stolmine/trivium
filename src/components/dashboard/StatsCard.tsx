import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SkeletonCard } from '../shared/SkeletonLoader';

interface WeeklyStats {
  cardsReviewed: number;
  timeSpentMinutes: number;
  currentStreak: number;
}

interface ReviewHistoryEntry {
  id: number;
  flashcardId: number;
  userId: number;
  reviewedAt: string;
  rating: number;
  reviewDurationMs: number | null;
  stateBefore: number;
  stateAfter: number;
}

export function StatsCard() {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWeeklyStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const reviewHistory = await invoke<ReviewHistoryEntry[]>(
          'get_review_history_since',
          { since: weekAgo.toISOString() }
        );

        const cardsReviewed = reviewHistory.length;

        const totalTimeMs = reviewHistory.reduce((sum, entry) => {
          return sum + (entry.reviewDurationMs || 0);
        }, 0);
        const timeSpentMinutes = Math.round(totalTimeMs / 60000);

        const reviewsByDay = new Map<string, boolean>();
        reviewHistory.forEach((entry) => {
          const date = entry.reviewedAt.split('T')[0];
          reviewsByDay.set(date, true);
        });

        let currentStreak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = checkDate.toISOString().split('T')[0];
          if (reviewsByDay.has(dateStr)) {
            currentStreak++;
          } else if (i > 0) {
            break;
          }
        }

        setStats({
          cardsReviewed,
          timeSpentMinutes,
          currentStreak,
        });
      } catch (err) {
        console.error('Failed to load weekly stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stats');
        setStats({
          cardsReviewed: 0,
          timeSpentMinutes: 0,
          currentStreak: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadWeeklyStats();
  }, []);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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

  if (!stats) {
    return (
      <div className="border rounded-lg p-8 shadow-card bg-card">
        <h2 className="text-lg font-semibold mb-4">Statistics</h2>
        <div className="text-muted-foreground text-sm">No data available</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-8 shadow-card bg-card">
      <h2 className="text-lg font-semibold mb-6">Statistics</h2>

      <div className="space-y-4">
        <div className="text-xs font-medium text-muted-foreground mb-3">
          This Week:
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Cards Reviewed</span>
            <span className="text-lg font-semibold">{stats.cardsReviewed}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Time Spent</span>
            <span className="text-lg font-semibold">
              {formatTime(stats.timeSpentMinutes)}
            </span>
          </div>

          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Streak</span>
              <span className="text-lg font-semibold">
                {stats.currentStreak} day{stats.currentStreak !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
