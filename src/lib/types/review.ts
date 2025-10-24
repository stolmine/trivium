export interface LimitStatus {
  newCardsRemaining: number;
  reviewCardsRemaining: number;
  newCardsLimit: number;
  reviewCardsLimit: number;
  newCardsSeen: number;
  reviewCardsSeen: number;
}

export interface ReviewStats {
  dueCount: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
}

export interface ReviewHistoryEntry {
  cardId: number;
  previousState: {
    state: number;
    stability: number;
    difficulty: number;
    elapsedDays: number;
    scheduledDays: number;
    reps: number;
    lapses: number;
    lastReview: string | null;
    due: string;
  };
  card: import('./flashcard').Flashcard;
}
