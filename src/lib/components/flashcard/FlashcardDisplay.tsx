import type { Flashcard } from '../../types';

interface FlashcardDisplayProps {
  flashcard: Flashcard;
  showAnswer: boolean;
  onToggleAnswer: () => void;
}

export function FlashcardDisplay({ flashcard: _flashcard, showAnswer: _showAnswer, onToggleAnswer: _onToggleAnswer }: FlashcardDisplayProps) {
  // TODO: Implement flashcard display for review
  // Features:
  // - Display context with cloze deletion
  // - Toggle answer visibility
  // - Keyboard shortcuts (Space to reveal)
  // - Visual feedback for correct/incorrect

  return null;
}
