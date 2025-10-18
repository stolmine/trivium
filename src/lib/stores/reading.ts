import { create } from 'zustand';
import type { Text, CreateTextRequest, ReadRange, Paragraph, ExcludedRange } from '../types';
import { api } from '../utils/tauri';
import { invalidateProgressCache, invalidateFolderProgressCache } from '../hooks/useTextProgress';
import { useReadingHistoryStore } from './readingHistory';

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
  markAsFinished: (textId: number, contentLength: number) => Promise<void>;
  clearProgress: (textId: number) => Promise<void>;
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
    console.log('[Reading Store] loadTexts() called');
    set({ isLoading: true, error: null });
    try {
      console.log('[Reading Store] Fetching texts from API...');
      const texts = await api.texts.list();
      console.log('[Reading Store] Received texts:', texts.length, texts);
      set({ texts, isLoading: false });
    } catch (error) {
      console.error('[Reading Store] Failed to load texts:', error);
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
      const historyStore = useReadingHistoryStore.getState();
      const isUndoRedo = historyStore.isUndoRedoInProgress;

      let contentSnapshot = '';
      let markedText = '';

      if (!isUndoRedo) {
        contentSnapshot = get().currentText?.content || '';
        markedText = contentSnapshot.substring(startPosition, endPosition);
      }

      await api.reading.markRangeAsRead(textId, startPosition, endPosition);
      await get().getReadRanges(textId);
      await get().calculateProgress(textId);
      invalidateProgressCache(textId);

      if (!isUndoRedo) {
        historyStore.recordMark({
          range: { start: startPosition, end: endPosition },
          contentSnapshot,
          markedText
        });
      }

      const currentText = get().currentText;
      if (currentText?.folderId) {
        invalidateFolderProgressCache(currentText.folderId);
      }
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
      const historyStore = useReadingHistoryStore.getState();
      const isUndoRedo = historyStore.isUndoRedoInProgress;

      let previousReadRanges: ReadRange[] = [];
      let contentSnapshot = '';
      let unmarkedText = '';

      if (!isUndoRedo) {
        previousReadRanges = [...get().readRanges];
        contentSnapshot = get().currentText?.content || '';
        unmarkedText = contentSnapshot.substring(startPosition, endPosition);
      }

      await api.reading.unmarkRangeAsRead(textId, startPosition, endPosition);
      await get().getReadRanges(textId);
      await get().calculateProgress(textId);
      invalidateProgressCache(textId);

      if (!isUndoRedo) {
        historyStore.recordUnmark({
          range: { start: startPosition, end: endPosition },
          previousReadRanges,
          contentSnapshot,
          unmarkedText
        });
      }

      const currentText = get().currentText;
      if (currentText?.folderId) {
        invalidateFolderProgressCache(currentText.folderId);
      }
    } catch (error) {
      console.error('Failed to unmark range as read:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to unmark range as read'
      });
      throw error;
    }
  },

  markAsFinished: async (textId: number, contentLength: number) => {
    try {
      await api.reading.markRangeAsRead(textId, 0, contentLength);
      await get().getReadRanges(textId);
      await get().calculateProgress(textId);
      invalidateProgressCache(textId);
      // Invalidate folder progress cache if text belongs to a folder
      const currentText = get().currentText;
      if (currentText?.folderId) {
        invalidateFolderProgressCache(currentText.folderId);
      }
    } catch (error) {
      console.error('Failed to mark as finished:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to mark as finished'
      });
      throw error;
    }
  },

  clearProgress: async (textId: number) => {
    try {
      await api.reading.clearReadProgress(textId);
      set({ readRanges: [], totalProgress: 0 });
      invalidateProgressCache(textId);
      const currentText = get().currentText;
      if (currentText?.folderId) {
        invalidateFolderProgressCache(currentText.folderId);
      }
    } catch (error) {
      console.error('Failed to clear progress:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to clear progress'
      });
      throw error;
    }
  },

  isRangeRead: (startPosition: number, endPosition: number) => {
    const { readRanges } = get();
    // Check for ANY overlap (not just full containment)
    // A range overlaps if: range.start < end AND range.end > start
    // This means selecting any part of a marked region will unmark the entire mark
    for (const range of readRanges) {
      if (range.startPosition < endPosition && range.endPosition > startPosition) {
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
