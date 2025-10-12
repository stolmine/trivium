import type { Flashcard, ReviewResult, ReviewQuality } from '../types';

export interface ReviewState {
  queue: Flashcard[];
  currentIndex: number;
  currentCard: Flashcard | null;
  showAnswer: boolean;
  sessionStats: {
    totalReviewed: number;
    correct: number;
    incorrect: number;
    startTime: Date;
  };
  isLoading: boolean;
  error: string | null;
}

export function createReviewStore() {
  // TODO: Implement state management for spaced repetition review
  // This will handle:
  // - Loading review queue
  // - Navigating through flashcards
  // - Submitting review results
  // - Calculating next review intervals (SM-2 algorithm)
  // - Tracking session statistics
}
