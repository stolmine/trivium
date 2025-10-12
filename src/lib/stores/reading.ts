import type { Article, ReadingPosition } from '../types';

export interface ReadingState {
  currentArticle: Article | null;
  position: ReadingPosition | null;
  isLoading: boolean;
  error: string | null;
}

export function createReadingStore() {
  // TODO: Implement state management for reading interface
  // This will handle:
  // - Loading and displaying articles
  // - Tracking reading position
  // - Auto-saving progress
  // - Navigation between articles
}
