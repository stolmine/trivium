import { useEffect, useState, useMemo, memo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Clock } from 'lucide-react';
import { api } from '../../lib/utils/tauri';
import type { Text } from '../../lib/types';
import { SkeletonList } from '../shared/SkeletonLoader';
import { EmptyState } from '../shared/EmptyState';

interface ActivityItem {
  id: string;
  type: 'review' | 'read' | 'create';
  timestamp: Date;
  description: string;
  textTitle?: string;
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

const ActivityItem = memo(({ activity, getIcon, formatTime }: {
  activity: ActivityItem;
  getIcon: (type: ActivityItem['type']) => string;
  formatTime: (date: Date) => string;
}) => (
  <div className="flex items-start gap-3 text-sm pb-3 border-b last:border-b-0 last:pb-0">
    <span className="text-lg mt-0.5">{getIcon(activity.type)}</span>
    <div className="flex-1 min-w-0">
      <p className="text-foreground">{activity.description}</p>
      {activity.textTitle && (
        <p className="text-muted-foreground text-xs truncate">
          {activity.textTitle}
        </p>
      )}
    </div>
    <span className="text-muted-foreground text-xs whitespace-nowrap">
      {formatTime(activity.timestamp)}
    </span>
  </div>
));

ActivityItem.displayName = 'ActivityItem';

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecentActivities = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

        const [reviewHistory, allTexts] = await Promise.all([
          invoke<ReviewHistoryEntry[]>('get_review_history_since', {
            since: twoWeeksAgo.toISOString(),
          }),
          api.texts.list(),
        ]);

        const textMap = new Map<number, Text>();
        allTexts.forEach((text) => textMap.set(text.id, text));

        const reviewActivities: ActivityItem[] = [];
        const reviewsBySession = new Map<string, ReviewHistoryEntry[]>();

        reviewHistory.forEach((entry) => {
          const sessionKey = entry.reviewedAt.split('T')[0] + '-' + Math.floor(new Date(entry.reviewedAt).getTime() / (30 * 60 * 1000));
          const existing = reviewsBySession.get(sessionKey) || [];
          reviewsBySession.set(sessionKey, [...existing, entry]);
        });

        reviewsBySession.forEach((reviews) => {
          const firstReview = reviews[0];
          const uniqueCards = new Set(reviews.map((r) => r.flashcardId)).size;

          reviewActivities.push({
            id: `review-${firstReview.id}`,
            type: 'review',
            timestamp: new Date(firstReview.reviewedAt),
            description: `Reviewed ${uniqueCards} card${uniqueCards !== 1 ? 's' : ''}`,
          });
        });

        const allActivities = [...reviewActivities];

        allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        setActivities(allActivities.slice(0, 10));
      } catch (err) {
        console.error('Failed to load recent activities:', err);
        setError(err instanceof Error ? err.message : 'Failed to load activities');
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentActivities();
  }, []);

  const formatTimestamp = useMemo(() => (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return diffMins <= 1 ? 'just now' : `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString();
  }, []);

  const getActivityIcon = useMemo(() => (type: ActivityItem['type']): string => {
    switch (type) {
      case 'review':
        return '🎯';
      case 'read':
        return '📖';
      case 'create':
        return '✨';
      default:
        return '•';
    }
  }, []);

  if (isLoading) {
    return (
      <div className="border rounded-lg p-8 shadow-card bg-card">
        <h2 className="text-lg font-semibold mb-6">Recent Activity</h2>
        <SkeletonList items={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border rounded-lg p-8 shadow-card bg-card">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="text-destructive text-sm">{error}</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="border rounded-lg p-8 shadow-card bg-card">
        <EmptyState
          icon={Clock}
          title="No Recent Activity"
          description="Start reading or reviewing to see your progress here."
        />
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-8 shadow-card bg-card">
      <h2 className="text-lg font-semibold mb-6">Recent Activity</h2>

      <div className="space-y-3">
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            getIcon={getActivityIcon}
            formatTime={formatTimestamp}
          />
        ))}
      </div>
    </div>
  );
}
