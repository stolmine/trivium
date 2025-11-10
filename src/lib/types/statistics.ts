export interface ReviewStatistics {
  totalReviews: number;
  uniqueCardsReviewed: number;
  avgRating: number;
  retentionRate: number;
  dailyStreak: number;
  forecastNext7Days: ForecastDay[];
}

export interface ForecastDay {
  date: string;
  cardsDue: number;
  newCards: number;
  reviewCards: number;
  learningCards: number;
}

export interface HourlyReviewDistribution {
  hour: number;
  reviewCount: number;
  againRate: number;
  hardRate: number;
  goodRate: number;
  easyRate: number;
  avgDurationMs: number | null;
}

export interface DailyReviewStats {
  date: string;
  totalReviews: number;
  uniqueCards: number;
  avgRating: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  avgDurationMs: number | null;
}

export interface ReadingStatistics {
  totalTimeSeconds: number;
  totalCharactersRead: number;
  sessionCount: number;
  avgSessionDuration: number;
  textsRead: number;
  byFolder: FolderReadingStats[];
}

export interface FolderReadingStats {
  folderId: string;
  folderName: string;
  totalTimeSeconds: number;
  charactersRead: number;
  sessionCount: number;
}

export interface StudyTimeStats {
  totalStudyTimeMs: number;
  avgTimePerCardMs: number;
  totalCardsReviewed: number;
  byDate: DailyStudyTime[];
}

export interface DailyStudyTime {
  date: string;
  totalTimeMs: number;
  cardCount: number;
  avgTimePerCardMs: number;
}

export interface TextStatistics {
  id: number;
  title: string;
  folderPath: string | null;
  contentLength: number;
  wordCount: number;
  paragraphCount: number;
  readPercentage: number;
  currentPosition: number;
  totalFlashcards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  retentionRate: number | null;
  createdAt: string;
  updatedAt: string;
  lastReadAt: string | null;
}

export interface FolderStatistics {
  id: string;
  name: string;
  parentPath: string | null;
  totalTexts: number;
  totalContentLength: number;
  averageProgress: number;
  totalFlashcards: number;
  createdAt: string;
  updatedAt: string;
}
