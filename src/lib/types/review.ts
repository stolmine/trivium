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
