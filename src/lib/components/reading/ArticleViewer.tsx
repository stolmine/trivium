import type { Article } from '../../types';

interface ArticleViewerProps {
  article: Article;
  onSelectionComplete?: (text: string, startOffset: number, endOffset: number) => void;
}

export function ArticleViewer({ article: _article, onSelectionComplete: _onSelectionComplete }: ArticleViewerProps) {
  // TODO: Implement article reading interface
  // Features:
  // - Render article content with proper typography
  // - Handle text selection for cloze creation
  // - Track reading position
  // - Support keyboard navigation
  // - Display reading progress

  return null;
}
