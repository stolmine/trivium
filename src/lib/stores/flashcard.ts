import { create } from 'zustand';
import type { Flashcard, FlashcardPreview } from '../types';
import { api } from '../utils/tauri';

interface FlashcardState {
  flashcards: Flashcard[];
  currentTextFlashcards: Flashcard[];
  mostRecentlyReadTextId: number | null;
  isLoading: boolean;
  error: string | null;
  loadFlashcards: (textId: number) => Promise<void>;
  createFlashcard: (textId: number, selectedText: string, clozeText: string) => Promise<Flashcard[]>;
  deleteFlashcard: (flashcardId: number) => Promise<void>;
  getPreview: (clozeText: string, clozeIndex: number) => Promise<FlashcardPreview>;
  setMostRecentlyReadTextId: (textId: number | null) => void;
}

export const useFlashcardStore = create<FlashcardState>((set) => ({
  flashcards: [],
  currentTextFlashcards: [],
  mostRecentlyReadTextId: null,
  isLoading: false,
  error: null,

  loadFlashcards: async (textId: number) => {
    set({ isLoading: true, error: null });
    try {
      const flashcards = await api.flashcards.getByText(textId);
      set({
        currentTextFlashcards: flashcards,
        flashcards: flashcards,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to load flashcards:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load flashcards',
        isLoading: false
      });
    }
  },

  createFlashcard: async (textId: number, selectedText: string, clozeText: string) => {
    set({ isLoading: true, error: null });
    try {
      const newFlashcards = await api.flashcards.createFromCloze(textId, selectedText, clozeText);
      set((state) => ({
        flashcards: [...newFlashcards, ...state.flashcards],
        currentTextFlashcards: [...newFlashcards, ...state.currentTextFlashcards],
        isLoading: false
      }));
      return newFlashcards;
    } catch (error) {
      console.error('Failed to create flashcard:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to create flashcard',
        isLoading: false
      });
      throw error;
    }
  },

  deleteFlashcard: async (flashcardId: number) => {
    set({ isLoading: true, error: null });
    try {
      await api.flashcards.delete(flashcardId);
      set((state) => ({
        flashcards: state.flashcards.filter(f => f.id !== flashcardId),
        currentTextFlashcards: state.currentTextFlashcards.filter(f => f.id !== flashcardId),
        isLoading: false
      }));
    } catch (error) {
      console.error('[Store] Failed to delete flashcard:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to delete flashcard',
        isLoading: false
      });
      throw error;
    }
  },

  getPreview: async (clozeText: string, clozeIndex: number) => {
    try {
      const preview = await api.flashcards.getPreview(clozeText, clozeIndex);
      return preview;
    } catch (error) {
      console.error('Failed to get preview:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to get preview'
      });
      throw error;
    }
  },

  setMostRecentlyReadTextId: (textId: number | null) => {
    set({ mostRecentlyReadTextId: textId });
  },
}));
