import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../lib/components/ui';
import { api } from '../../lib/utils/tauri';
import type { Flashcard } from '../../lib/types';
import { SkeletonCard } from '../shared/SkeletonLoader';

interface CardsByText {
  textId: number;
  textTitle: string;
  count: number;
}

export function DueReviewCard() {
  const navigate = useNavigate();
  const [totalDue, setTotalDue] = useState<number>(0);
  const [breakdown, setBreakdown] = useState<CardsByText[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDueCards = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const dueCards = await api.review.getDueCards(100);
        setTotalDue(dueCards.length);

        const cardsByTextId = new Map<number, Flashcard[]>();
        dueCards.forEach((card) => {
          const existing = cardsByTextId.get(card.textId) || [];
          cardsByTextId.set(card.textId, [...existing, card]);
        });

        const breakdownPromises = Array.from(cardsByTextId.entries()).map(
          async ([textId, cards]) => {
            try {
              const text = await api.texts.get(textId);
              return {
                textId,
                textTitle: text.title,
                count: cards.length,
              };
            } catch (err) {
              console.error(`Failed to load text ${textId}:`, err);
              return {
                textId,
                textTitle: `Text ${textId}`,
                count: cards.length,
              };
            }
          }
        );

        const breakdownData = await Promise.all(breakdownPromises);
        breakdownData.sort((a, b) => b.count - a.count);
        setBreakdown(breakdownData.slice(0, 5));
      } catch (err) {
        console.error('Failed to load due cards:', err);
        setError(err instanceof Error ? err.message : 'Failed to load due cards');
      } finally {
        setIsLoading(false);
      }
    };

    loadDueCards();
  }, []);

  const handleStartReview = () => {
    navigate('/review/session');
  };

  const handleConfigureReview = () => {
    navigate('/review');
  };

  if (isLoading) {
    return <SkeletonCard className="h-full" />;
  }

  if (error) {
    return (
      <div className="border rounded-lg p-8 shadow-card bg-card">
        <h2 className="text-lg font-semibold mb-4">Due for Review</h2>
        <div className="text-destructive text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-8 shadow-card hover-lift bg-card">
      <h2 className="text-lg font-semibold mb-6">Due for Review</h2>

      <div className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold mb-1">{totalDue}</div>
          <div className="text-sm text-muted-foreground">
            card{totalDue !== 1 ? 's' : ''} due
          </div>
        </div>

        {totalDue === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            All caught up! Great job staying on top of your studies!
          </div>
        ) : (
          breakdown.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                By Text:
              </div>
              {breakdown.map((item) => (
                <div key={item.textId} className="flex justify-between items-center text-sm">
                  <span className="truncate flex-1 mr-2">{item.textTitle}</span>
                  <span className="font-medium text-muted-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          )
        )}

        <div className="space-y-2">
          <Button
            onClick={handleStartReview}
            className="w-full mt-4"
            disabled={totalDue === 0}
          >
            Quick Start ({totalDue})
          </Button>
          <Button
            onClick={handleConfigureReview}
            variant="outline"
            className="w-full"
            disabled={totalDue === 0}
          >
            Configure Review
          </Button>
        </div>
      </div>
    </div>
  );
}
