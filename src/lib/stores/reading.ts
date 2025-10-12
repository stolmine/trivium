import { create } from 'zustand';
import type { Text, CreateTextRequest } from '../types';
import { api } from '../utils/tauri';

interface ReadingState {
  texts: Text[];
  currentText: Text | null;
  isLoading: boolean;
  error: string | null;
  loadTexts: () => Promise<void>;
  loadText: (id: number) => Promise<void>;
  createText: (request: CreateTextRequest) => Promise<Text>;
  setCurrentText: (text: Text | null) => void;
}

export const useReadingStore = create<ReadingState>((set) => ({
  texts: [],
  currentText: null,
  isLoading: false,
  error: null,

  loadTexts: async () => {
    set({ isLoading: true, error: null });
    try {
      const texts = await api.texts.list();
      set({ texts, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load texts',
        isLoading: false
      });
    }
  },

  loadText: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const text = await api.texts.get(id);
      set({ currentText: text, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load text',
        isLoading: false
      });
    }
  },

  createText: async (request: CreateTextRequest) => {
    set({ isLoading: true, error: null });
    try {
      const text = await api.texts.create(request);
      set((state) => ({
        texts: [text, ...state.texts],
        isLoading: false
      }));
      return text;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create text',
        isLoading: false
      });
      throw error;
    }
  },

  setCurrentText: (text: Text | null) => {
    set({ currentText: text });
  },
}));
