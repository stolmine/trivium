import { create } from 'zustand';
import type { Text, CreateTextRequest, ReadRange, Paragraph, ExcludedRange } from '../types';
import { api } from '../utils/tauri';
import { invalidateProgressCache } from '../hooks/useTextProgress';

interface ReadingState {
  texts: Text[];
  currentText: Text | null;
  readRanges: ReadRange[];
  excludedRanges: ExcludedRange[];
  paragraphs: Paragraph[];
  currentParagraphIndex: number;
  totalProgress: number;
  isLoading: boolean;
  error: string | null;
  loadTexts: () => Promise<void>;
  loadText: (id: number) => Promise<void>;
  createText: (request: CreateTextRequest) => Promise<Text>;
  setCurrentText: (text: Text | null) => void;
  markRangeAsRead: (textId: number, startPosition: number, endPosition: number) => Promise<void>;
  unmarkRangeAsRead: (textId: number, startPosition: number, endPosition: number) => Promise<void>;
  isRangeRead: (startPosition: number, endPosition: number) => boolean;
  isRangeExcluded: (startPosition: number, endPosition: number) => boolean;
  setExcludedRanges: (ranges: ExcludedRange[]) => void;
  getReadRanges: (textId: number) => Promise<void>;
  getParagraphs: (textId: number) => Promise<void>;
  calculateProgress: (textId: number) => Promise<void>;
  navigateToNextParagraph: () => void;
  navigateToPreviousParagraph: () => void;
}

export const useReadingStore = create<ReadingState>((set, get) => ({
  texts: [],
  currentText: null,
  readRanges: [],
  excludedRanges: [],
  paragraphs: [],
  currentParagraphIndex: 0,
  totalProgress: 0,
  isLoading: false,
  error: null,

  loadTexts: async () => {
    set({ isLoading: true, error: null });
    try {
      const texts = await api.texts.list();
      set({ texts, isLoading: false });
    } catch (error) {
      console.error('Failed to load texts:', error);
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
      console.error('Failed to load text:', error);
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
      console.error('Failed to create text:', error);
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

  markRangeAsRead: async (textId: number, startPosition: number, endPosition: number) => {
    try {
      await api.reading.markRangeAsRead(textId, startPosition, endPosition);
      await get().getReadRanges(textId);
      await get().calculateProgress(textId);
      invalidateProgressCache(textId);
    } catch (error) {
      console.error('Failed to mark range as read:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to mark range as read'
      });
      throw error;
    }
  },

  unmarkRangeAsRead: async (textId: number, startPosition: number, endPosition: number) => {
    try {
      await api.reading.unmarkRangeAsRead(textId, startPosition, endPosition);
      await get().getReadRanges(textId);
      await get().calculateProgress(textId);
      invalidateProgressCache(textId);
    } catch (error) {
      console.error('Failed to unmark range as read:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to unmark range as read'
      });
      throw error;
    }
  },

  isRangeRead: (startPosition: number, endPosition: number) => {
    const { readRanges } = get();
    for (const range of readRanges) {
      if (range.startPosition <= startPosition && range.endPosition >= endPosition) {
        return true;
      }
    }
    return false;
  },

  isRangeExcluded: (startPosition: number, endPosition: number) => {
    const { excludedRanges } = get();
    for (const range of excludedRanges) {
      if (startPosition < range.endPosition && endPosition > range.startPosition) {
        return true;
      }
    }
    return false;
  },

  setExcludedRanges: (ranges: ExcludedRange[]) => {
    set({ excludedRanges: ranges });
  },

  getReadRanges: async (textId: number) => {
    try {
      const ranges = await api.reading.getReadRanges(textId);
      set({ readRanges: ranges });
    } catch (error) {
      console.error('Failed to load read ranges:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load read ranges'
      });
    }
  },

  getParagraphs: async (textId: number) => {
    try {
      const paragraphs = await api.reading.getParagraphs(textId);
      set({ paragraphs });
    } catch (error) {
      console.error('Failed to load paragraphs:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load paragraphs'
      });
    }
  },

  calculateProgress: async (textId: number) => {
    try {
      const progress = await api.reading.calculateProgress(textId);
      set({ totalProgress: progress });
    } catch (error) {
      console.error('Failed to calculate progress:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to calculate progress'
      });
    }
  },

  navigateToNextParagraph: () => {
    const { currentParagraphIndex, paragraphs } = get();
    if (currentParagraphIndex < paragraphs.length - 1) {
      set({ currentParagraphIndex: currentParagraphIndex + 1 });
    }
  },

  navigateToPreviousParagraph: () => {
    const { currentParagraphIndex } = get();
    if (currentParagraphIndex > 0) {
      set({ currentParagraphIndex: currentParagraphIndex - 1 });
    }
  },
}));
