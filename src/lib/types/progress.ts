export interface DailyProgress {
  date: Date;
  articlesRead: number;
  wordsRead: number;
  flashcardsCreated: number;
  flashcardsReviewed: number;
  reviewAccuracy: number;
  readingTime: number;
}

export interface ReadingStats {
  totalArticles: number;
  articlesCompleted: number;
  totalWordsRead: number;
  averageReadingSpeed: number;
  totalReadingTime: number;
}

export interface ReviewStats {
  totalFlashcards: number;
  flashcardsDue: number;
  flashcardsReviewed: number;
  averageAccuracy: number;
  currentStreak: number;
  longestStreak: number;
}

export interface UserProgress {
  reading: ReadingStats;
  review: ReviewStats;
  dailyHistory: DailyProgress[];
}
