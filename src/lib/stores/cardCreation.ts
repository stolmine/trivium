import { create } from 'zustand';
import type { HubScope, MarkWithContext, CreatedCard, CreateCardRequest } from '../types';
import { api } from '../utils/tauri';

export interface CardCreationState {
  scope: HubScope;
  selectedId: string | null;
  marks: MarkWithContext[];
  currentMarkIndex: number;
  createdCards: CreatedCard[];
  isLoading: boolean;
  error: string | null;
  setScope: (scope: HubScope, selectedId?: string | null) => void;
  loadMarks: () => Promise<void>;
  nextMark: () => void;
  prevMark: () => void;
  deleteMark: () => Promise<void>;
  createCard: (selectedText: string, clozeText: string) => Promise<void>;
  deleteCard: (id: number) => void;
  editCard: (id: number, question: string, answer: string) => Promise<void>;
  reset: () => void;
}

export const useCardCreationStore = create<CardCreationState>((set, get) => ({
  scope: 'library',
  selectedId: null,
  marks: [],
  currentMarkIndex: 0,
  createdCards: [],
  isLoading: false,
  error: null,

  setScope: (scope: HubScope, selectedId?: string | null) => {
    set({
      scope,
      selectedId: selectedId !== undefined ? selectedId : null,
      currentMarkIndex: 0
    });

    const state = get();
    if (scope === 'folder' && !state.selectedId) {
      return;
    }
    if (scope === 'text' && !state.selectedId) {
      return;
    }

    get().loadMarks();
  },

  loadMarks: async () => {
    set({ isLoading: true, error: null });
    try {
      const { scope, selectedId } = get();
      const marks = await api.hub.getMarksForScope(scope, selectedId);
      set({
        marks,
        currentMarkIndex: 0,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to load marks:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load marks',
        isLoading: false
      });
    }
  },

  nextMark: () => {
    const { marks, currentMarkIndex } = get();
    if (currentMarkIndex < marks.length - 1) {
      set({ currentMarkIndex: currentMarkIndex + 1 });
    }
  },

  prevMark: () => {
    const { currentMarkIndex } = get();
    if (currentMarkIndex > 0) {
      set({ currentMarkIndex: currentMarkIndex - 1 });
    }
  },

  deleteMark: async () => {
    const { marks, currentMarkIndex } = get();
    const currentMark = marks[currentMarkIndex];
    if (currentMark) {
      try {
        await api.hub.deleteMark(currentMark.id);
        // Remove the mark from the list
        const newMarks = marks.filter((_, index) => index !== currentMarkIndex);
        // Adjust current index if needed
        const newIndex = currentMarkIndex >= newMarks.length ? newMarks.length - 1 : currentMarkIndex;
        set({
          marks: newMarks,
          currentMarkIndex: Math.max(0, newIndex)
        });
      } catch (error) {
        console.error('Failed to delete mark:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to delete mark'
        });
      }
    }
  },

  createCard: async (selectedText: string, clozeText: string) => {
    const { marks, currentMarkIndex } = get();
    const currentMark = marks[currentMarkIndex];
    if (!currentMark) {
      throw new Error('No current mark selected');
    }

    set({ isLoading: true, error: null });
    try {
      const request: CreateCardRequest = {
        markId: currentMark.id,
        selectedText,
        clozeText
      };
      const createdCards = await api.hub.createCardFromMark(request);

      set((state) => ({
        createdCards: [...createdCards, ...state.createdCards],
        isLoading: false
      }));

      get().nextMark();
    } catch (error) {
      console.error('Failed to create card:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to create card',
        isLoading: false
      });
      throw error;
    }
  },

  deleteCard: (id: number) => {
    set((state) => ({
      createdCards: state.createdCards.filter((card) => card.id !== id)
    }));
  },

  editCard: async (id: number, question: string, answer: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.hub.updateCard(id, question, answer);
      set((state) => ({
        createdCards: state.createdCards.map((card) =>
          card.id === id ? { ...card, question, answer } : card
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to update card:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update card',
        isLoading: false
      });
      throw error;
    }
  },

  reset: () => {
    set({
      scope: 'library',
      selectedId: null,
      marks: [],
      currentMarkIndex: 0,
      createdCards: [],
      isLoading: false,
      error: null
    });
  }
}));
