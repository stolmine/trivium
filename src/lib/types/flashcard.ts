export interface Flashcard {
  id: number;
  textId: number;
  userId: number;
  originalText: string;
  clozeText: string;
  clozeIndex: number;
  displayIndex: number;
  clozeNumber: number;
  createdAt: string;
  updatedAt: string;
  clozeNoteId: number | null;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
}

export interface ClozeNote {
  id: number;
  textId: number;
  userId: number;
  originalText: string;
  parsedSegments: string;
  clozeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClozeSegment {
  clozeNumber: number;
  text: string;
  hint: string | null;
  startPosition: number;
  endPosition: number;
}

export interface CreateFlashcardRequest {
  textId: number;
  selectedText: string;
  clozeText: string;
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

export interface FlashcardPreview {
  html: string;
  clozeNumber: number;
}

export type ReviewFilter =
  | { type: 'global' }
  | { type: 'text'; textId: number }
  | { type: 'folder'; folderId: string };
