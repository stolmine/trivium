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
  sourceUrl?: string;
  content: string;
  contentLength: number;
  ingestedAt: string;
  updatedAt: string;
  metadata?: string;
  author?: string;
  publicationDate?: string;
  publisher?: string;
  accessDate?: string;
  doi?: string;
  isbn?: string;
  folderId?: string | null;
}

export interface CreateTextRequest {
  title: string;
  source: string;
  sourceUrl?: string;
  content: string;
  metadata?: string;
  author?: string;
  publicationDate?: string;
  publisher?: string;
  accessDate?: string;
  doi?: string;
  isbn?: string;
  folderId?: string | null;
}

import type { ReadRange } from './reading';

export interface SmartExcerpt {
  textId: number;
  excerpt: string;
  startPos: number;
  endPos: number;
  currentPosition: number;
  totalLength: number;
  readRanges: ReadRange[];
  excerptType: 'unread' | 'current' | 'beginning';
}
