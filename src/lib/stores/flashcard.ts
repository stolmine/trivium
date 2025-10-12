import type { Flashcard, ClozeData } from '../types';

export interface FlashcardState {
  flashcards: Flashcard[];
  currentCloze: ClozeData | null;
  isCreating: boolean;
  error: string | null;
}

export function createFlashcardStore() {
  // TODO: Implement state management for flashcard creation
  // This will handle:
  // - Text selection and cloze creation
  // - Flashcard preview
  // - Saving flashcards to backend
  // - Managing flashcard list for an article
}
