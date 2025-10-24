import { create } from 'zustand';
import type { Flashcard, ReviewQuality, ReviewFilter, ReviewHistoryEntry } from '../types';
import { api } from '../utils/tauri';

export interface ReviewState {
  queue: Flashcard[];
  currentIndex: number;
  currentCard: Flashcard | null;
  showAnswer: boolean;
  currentFilter: ReviewFilter | null;
  sessionId: string | null;
  cardStartTime: number | null;
  lastReviewedCard: ReviewHistoryEntry | null;
  canUndo: boolean;
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
  buryCard: () => Promise<void>;
  undoLastReview: () => Promise<void>;
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
  sessionId: null,
  cardStartTime: null,
  lastReviewedCard: null,
  canUndo: false,
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

  loadDueCards: async (filter, limit = 20, order?: string) => {
    set({ isLoading: true, error: null });
    try {
      const cards = filter
        ? await api.review.getDueCardsFiltered({ filter, limit, order })
        : await api.review.getDueCards(limit, order);
      set({
        queue: cards,
        currentIndex: 0,
        currentCard: cards[0] || null,
        currentFilter: filter || null,
        sessionId: crypto.randomUUID(),
        cardStartTime: null,
        lastReviewedCard: null,
        canUndo: false,
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
    const { currentCard, sessionStats, queue, currentFilter, sessionId, cardStartTime } = get();
    if (!currentCard) return;

    const previousState = {
      state: currentCard.state,
      stability: currentCard.stability,
      difficulty: currentCard.difficulty,
      elapsedDays: currentCard.elapsedDays,
      scheduledDays: currentCard.scheduledDays,
      reps: currentCard.reps,
      lapses: currentCard.lapses,
      lastReview: currentCard.lastReview,
      due: currentCard.due,
    };

    const reviewDurationMs = cardStartTime ? Date.now() - cardStartTime : null;

    set({ isLoading: true });
    try {
      await api.review.gradeCard(
        currentCard.id,
        rating + 1,
        currentFilter || undefined,
        reviewDurationMs,
        sessionId
      );

      const statKey = ['againCount', 'hardCount', 'goodCount', 'easyCount'][rating] as keyof typeof sessionStats;
      set({
        sessionStats: {
          ...sessionStats,
          totalReviews: sessionStats.totalReviews + 1,
          uniqueCards: rating !== 0 ? sessionStats.uniqueCards + 1 : sessionStats.uniqueCards,
          [statKey]: sessionStats[statKey as 'againCount' | 'hardCount' | 'goodCount' | 'easyCount'] + 1,
        },
        cardStartTime: null,
        lastReviewedCard: {
          cardId: currentCard.id,
          previousState,
          card: currentCard,
        },
        canUndo: true,
      });

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

  buryCard: async () => {
    const { currentCard, queue, currentIndex } = get();
    if (!currentCard) return;

    try {
      await api.review.buryCard(currentCard.id);

      const newQueue = queue.filter(c => c.id !== currentCard.id);

      const newIndex = Math.min(currentIndex, newQueue.length - 1);
      const newCurrentCard = newQueue[newIndex] || null;

      set({
        queue: newQueue,
        currentIndex: newIndex,
        currentCard: newCurrentCard,
        showAnswer: false,
      });
    } catch (error) {
      console.error('Failed to bury card:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to bury card',
      });
      throw error;
    }
  },

  undoLastReview: async () => {
    const { lastReviewedCard, queue, currentIndex, sessionStats } = get();
    if (!lastReviewedCard) return;

    try {
      await api.review.undoReview(
        lastReviewedCard.cardId,
        lastReviewedCard.previousState
      );

      const newQueue = [...queue];
      newQueue.splice(currentIndex, 0, lastReviewedCard.card);

      set({
        queue: newQueue,
        currentCard: lastReviewedCard.card,
        lastReviewedCard: null,
        canUndo: false,
        showAnswer: false,
        sessionStats: {
          ...sessionStats,
          totalReviews: Math.max(0, sessionStats.totalReviews - 1),
        },
      });
    } catch (error) {
      console.error('Failed to undo review:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to undo review',
      });
      throw error;
    }
  },

  toggleAnswer: () => {
    const { showAnswer } = get();
    if (!showAnswer) {
      set({ showAnswer: true, cardStartTime: Date.now() });
    } else {
      set({ showAnswer: false });
    }
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
      sessionId: null,
      cardStartTime: null,
      lastReviewedCard: null,
      canUndo: false,
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
      sessionId: null,
      cardStartTime: null,
      lastReviewedCard: null,
      canUndo: false,
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
