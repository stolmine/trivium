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

export interface Text {
  id: number;
  title: string;
  source: string;
  source_url?: string;
  content: string;
  content_length: number;
  ingested_at: string;
  updated_at: string;
  metadata?: string;
  author?: string;
  publication_date?: string;
  publisher?: string;
  access_date?: string;
  doi?: string;
  isbn?: string;
}

export interface CreateTextRequest {
  title: string;
  source: string;
  source_url?: string;
  content: string;
  metadata?: string;
  author?: string;
  publication_date?: string;
  publisher?: string;
  access_date?: string;
  doi?: string;
  isbn?: string;
}
