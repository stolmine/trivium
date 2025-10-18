export interface ReadRange {
  id: number;
  textId: number;
  startPosition: number;
  endPosition: number;
  markedAt: string;
  // Optional: Original RENDERED space positions (used when positions are converted to CLEANED space)
  originalStartPosition?: number;
  originalEndPosition?: number;
}

export interface Paragraph {
  id: number;
  textId: number;
  paragraphIndex: number;
  startPosition: number;
  endPosition: number;
  characterCount: number;
  createdAt: string;
}

export interface ExcludedRange {
  startPosition: number;
  endPosition: number;
}
