/**
 * Types for the Flashcard Creation Hub feature
 */

import type { ClozeNote } from './flashcard';

/**
 * Scope types for filtering marks
 */
export type HubScope = 'library' | 'folder' | 'text';

/**
 * Statistics for the hub
 */
export interface HubStats {
  pending: number;      // Marks without cards
  skipped: number;      // Marks skipped in current session
  buried: number;       // Marks buried (0-card)
  converted: number;    // Marks with cards created
  todayCount: number;   // Cards created today
  weekCount: number;    // Cards created this week
}

/**
 * Mark with surrounding context for card creation
 */
export interface MarkWithContext {
  id: number;
  textId: number;
  textTitle: string;
  startPosition: number;
  endPosition: number;
  markedText: string;
  beforeContext: string;  // 200 chars before
  afterContext: string;   // 200 chars after
  hasCard: boolean;
  createdAt: string;
  clozeNote?: ClozeNote;  // Optional associated cloze note
}

/**
 * Card created in the hub session
 */
export interface CreatedCard {
  id: number;
  markId: number;
  question: string;
  answer: string;
  createdAt: string;
  textId: number;
  textTitle: string;
}

/**
 * Request to create a card from a mark
 */
export interface CreateCardRequest {
  markId: number;
  selectedText: string;  // Original text (unused for cloze cards)
  clozeText: string;     // Text with {{c1::}} syntax
}

/**
 * Scope selection parameters
 */
export interface ScopeSelection {
  scope: HubScope;
  selectedId: string | number | null;
}
