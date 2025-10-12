export interface Article {
  id: string;
  title: string;
  content: string;
  source?: string;
  author?: string;
  dateAdded: Date;
  lastRead?: Date;
  readingProgress: number;
  wordCount: number;
  estimatedReadTime: number;
  tags?: string[];
}

export interface ArticleMetadata {
  id: string;
  title: string;
  source?: string;
  author?: string;
  dateAdded: Date;
  lastRead?: Date;
  wordCount: number;
  estimatedReadTime: number;
  tags?: string[];
}

export interface ReadingPosition {
  articleId: string;
  scrollPosition: number;
  characterOffset: number;
  lastUpdated: Date;
}
