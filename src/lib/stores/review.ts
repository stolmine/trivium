import { create } from 'zustand';
import type { Flashcard, ReviewQuality, ReviewFilter } from '../types';
import { api } from '../utils/tauri';

export interface ReviewState {
  queue: Flashcard[];
  currentIndex: number;
  currentCard: Flashcard | null;
  showAnswer: boolean;
  currentFilter: ReviewFilter | null;
  sessionStats: {
    totalReviews: number;
    uniqueCards: number;
    againCount: number;
    hardCount: number;
    goodCount: number;
    easyCount: number;
    startTime: Date;
  };
  isLoading: boolean;
  error: string | null;
  loadDueCards: (filter?: ReviewFilter, limit?: number) => Promise<void>;
  gradeCard: (rating: ReviewQuality) => Promise<void>;
  toggleAnswer: () => void;
  nextCard: () => void;
  resetSession: () => void;
  clearSession: () => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  queue: [],
  currentIndex: 0,
  currentCard: null,
  showAnswer: false,
  currentFilter: null,
  isLoading: false,
  error: null,
  sessionStats: {
    totalReviews: 0,
    uniqueCards: 0,
    againCount: 0,
    hardCount: 0,
    goodCount: 0,
    easyCount: 0,
    startTime: new Date(),
  },

  loadDueCards: async (filter, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const cards = filter
        ? await api.review.getDueCardsFiltered({ filter, limit })
        : await api.review.getDueCards(limit);
      set({
        queue: cards,
        currentIndex: 0,
        currentCard: cards[0] || null,
        currentFilter: filter || null,
        isLoading: false,
        sessionStats: {
          totalReviews: 0,
          uniqueCards: 0,
          againCount: 0,
          hardCount: 0,
          goodCount: 0,
          easyCount: 0,
          startTime: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to load due cards:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load due cards',
        isLoading: false
      });
    }
  },

  gradeCard: async (rating: ReviewQuality) => {
    const { currentCard, sessionStats, queue, currentFilter } = get();
    if (!currentCard) return;

    set({ isLoading: true });
    try {
      await api.review.gradeCard(currentCard.id, rating + 1, currentFilter || undefined);

      const statKey = ['againCount', 'hardCount', 'goodCount', 'easyCount'][rating] as keyof typeof sessionStats;
      set({
        sessionStats: {
          ...sessionStats,
          totalReviews: sessionStats.totalReviews + 1,
          // Only count as unique card if rating is not "Again" (0)
          uniqueCards: rating !== 0 ? sessionStats.uniqueCards + 1 : sessionStats.uniqueCards,
          [statKey]: sessionStats[statKey as 'againCount' | 'hardCount' | 'goodCount' | 'easyCount'] + 1,
        },
      });

      // If rating is "Again" (0), re-queue the card
      if (rating === 0) {
        const updatedQueue = [...queue];
        updatedQueue.push(currentCard);
        set({ queue: updatedQueue });
      }

      get().nextCard();
    } catch (error) {
      console.error('Failed to grade card:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to grade card',
        isLoading: false
      });
    }
  },

  toggleAnswer: () => {
    set({ showAnswer: !get().showAnswer });
  },

  nextCard: () => {
    const { queue, currentIndex } = get();
    const nextIndex = currentIndex + 1;

    if (nextIndex < queue.length) {
      set({
        currentIndex: nextIndex,
        currentCard: queue[nextIndex],
        showAnswer: false,
        isLoading: false,
      });
    } else {
      set({
        currentCard: null,
        showAnswer: false,
        isLoading: false,
      });
    }
  },

  resetSession: () => {
    set({
      queue: [],
      currentIndex: 0,
      currentCard: null,
      showAnswer: false,
      currentFilter: null,
      isLoading: false,
      error: null,
      sessionStats: {
        totalReviews: 0,
        uniqueCards: 0,
        againCount: 0,
        hardCount: 0,
        goodCount: 0,
        easyCount: 0,
        startTime: new Date(),
      },
    });
  },

  clearSession: () => {
    set({
      queue: [],
      currentIndex: 0,
      currentCard: null,
      showAnswer: false,
      currentFilter: null,
      isLoading: false,
      error: null,
      sessionStats: {
        totalReviews: 0,
        uniqueCards: 0,
        againCount: 0,
        hardCount: 0,
        goodCount: 0,
        easyCount: 0,
        startTime: new Date(),
      },
    });
  },
}));
