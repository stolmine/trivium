export interface ReadRange {
  id: number;
  textId: number;
  startPosition: number;
  endPosition: number;
  markedAt: string;
}

export interface Paragraph {
  id: number;
  textId: number;
  paragraphIndex: number;
  startPosition: number;
  endPosition: number;
  characterCount: number;
  isRead: boolean;
}
