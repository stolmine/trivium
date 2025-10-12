export interface Flashcard {
  id: string;
  articleId: string;
  context: string;
  clozeText: string;
  clozePosition: number;
  dateCreated: Date;
  lastReviewed?: Date;
  nextReview: Date;
  difficulty: number;
  interval: number;
  repetitions: number;
  easeFactor: number;
}

export interface ClozeData {
  fullText: string;
  clozedWord: string;
  startIndex: number;
  endIndex: number;
  contextBefore: string;
  contextAfter: string;
}

export interface ReviewResult {
  flashcardId: string;
  quality: number;
  timestamp: Date;
  responseTime: number;
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;
