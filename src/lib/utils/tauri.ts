import { invoke } from '@tauri-apps/api/core';
import type {
  Article,
  Flashcard,
  FlashcardPreview,
  ReviewResult,
  Text,
  CreateTextRequest,
  ReadRange,
  Paragraph,
  ReviewFilter,
  ReviewStats,
  LimitStatus,
  WikipediaArticle,
  MarkWithContext,
  CreatedCard,
  HubStats,
  CreateCardRequest,
  ResetResult
} from '../types';

export async function loadArticle(id: string): Promise<Article> {
  return await invoke('load_article', { id });
}

export async function saveArticle(article: Article): Promise<void> {
  await invoke('save_article', { article });
}

export async function deleteArticle(id: string): Promise<void> {
  await invoke('delete_article', { id });
}

export async function listArticles(): Promise<Article[]> {
  return await invoke('list_articles');
}

export async function createFlashcard(flashcard: Omit<Flashcard, 'id'>): Promise<Flashcard> {
  return await invoke('create_flashcard', { flashcard });
}

export async function getFlashcardsForReview(): Promise<Flashcard[]> {
  return await invoke('get_flashcards_for_review');
}

export async function submitReview(result: ReviewResult): Promise<void> {
  await invoke('submit_review', { result });
}

export async function updateReadingPosition(articleId: string, position: number): Promise<void> {
  await invoke('update_reading_position', { articleId, position });
}

export const api = {
  texts: {
    create: async (request: CreateTextRequest): Promise<Text> => {
      return await invoke('create_text', { request });
    },
    list: async (): Promise<Text[]> => {
      return await invoke('list_texts');
    },
    listWithAvailableMarks: async (): Promise<Text[]> => {
      return await invoke('get_texts_with_available_marks');
    },
    get: async (id: number): Promise<Text> => {
      return await invoke('get_text', { id });
    },
    rename: async (id: number, title: string): Promise<void> => {
      return await invoke('rename_text', { id, title });
    },
    delete: async (id: number): Promise<void> => {
      return await invoke('delete_text', { id });
    },
    updateContent: async (textId: number, newContent: string): Promise<void> => {
      return await invoke('update_text_content', { textId, newContent });
    },
    updateTextWithSmartMarks: async (
      textId: number,
      editStart: number,
      editEnd: number,
      newContent: string
    ) => {
      return invoke<{
        updated_marks: number[];
        flagged_marks: number[];
        unchanged_marks: number[];
      }>('update_text_with_smart_marks', {
        textId,
        editStart,
        editEnd,
        newContent,
      });
    },
  },
  reading: {
    markRangeAsRead: async (textId: number, startPosition: number, endPosition: number): Promise<void> => {
      return await invoke('mark_range_as_read', {
        textId: textId,
        startPos: startPosition,
        endPos: endPosition
      });
    },
    unmarkRangeAsRead: async (textId: number, startPosition: number, endPosition: number): Promise<void> => {
      return await invoke('unmark_range_as_read', {
        textId: textId,
        startPos: startPosition,
        endPos: endPosition
      });
    },
    getReadRanges: async (textId: number): Promise<ReadRange[]> => {
      return await invoke('get_read_ranges', { textId: textId });
    },
    calculateProgress: async (textId: number): Promise<number> => {
      return await invoke('calculate_text_progress', { textId: textId });
    },
    getParagraphs: async (textId: number): Promise<Paragraph[]> => {
      return await invoke('get_paragraphs', { textId: textId });
    },
    clearReadProgress: async (textId: number): Promise<void> => {
      return await invoke('clear_read_progress', { textId });
    },
  },
  flashcards: {
    createFromCloze: async (textId: number, selectedText: string, clozeText: string): Promise<Flashcard[]> => {
      return await invoke('create_flashcard_from_cloze', {
        textId: textId,
        selectedText: selectedText,
        clozeText: clozeText
      });
    },
    getByText: async (textId: number): Promise<Flashcard[]> => {
      return await invoke('get_flashcards_by_text', { textId: textId });
    },
    delete: async (flashcardId: number): Promise<void> => {
      return await invoke('delete_flashcard', { flashcardId: flashcardId });
    },
    getPreview: async (clozeText: string, clozeNumber: number): Promise<FlashcardPreview> => {
      return await invoke('get_flashcard_preview', {
        clozeText: clozeText,
        clozeNumber: clozeNumber
      });
    },
    createMark: async (textId: number, selectedText: string, startPosition: number, endPosition: number): Promise<number> => {
      return await invoke('create_mark', { textId, selectedText, startPosition, endPosition });
    },
    getMarksForText: async (textId: number) => {
      return invoke<Array<{
        id: number;
        textId: number;
        originalText: string;
        startPosition: number | null;
        endPosition: number | null;
        status: string;
        notes: string | null;
        createdAt: string;
        updatedAt: string;
      }>>('get_marks_for_text', { textId });
    },
    deleteMarks: async (markIds: number[]): Promise<{
      deletedCount: number;
      markIds: number[];
    }> => {
      return await invoke('delete_marks', { markIds });
    },
    deleteReadRanges: async (textId: number, ranges: [number, number][]): Promise<{
      deletedCount: number;
    }> => {
      return await invoke('delete_read_ranges', { textId, ranges });
    },
  },
  review: {
    getDueCards: async (limit: number): Promise<Flashcard[]> => {
      return await invoke('get_due_cards', { limit: limit });
    },
    gradeCard: async (flashcardId: number, rating: number, filter?: ReviewFilter): Promise<void> => {
      return await invoke('grade_card', {
        flashcardId: flashcardId,
        rating: rating,
        filter: filter || null
      });
    },
    getStats: async (): Promise<{ due_count: number; new_count: number; learning_count: number; review_count: number }> => {
      return await invoke('get_review_stats');
    },
    getDueCardsFiltered: async (params: {
      filter?: ReviewFilter,
      limit?: number
    }): Promise<Flashcard[]> => {
      return await invoke('get_due_cards_filtered', params);
    },
    getReviewStatsFiltered: async (filter?: ReviewFilter): Promise<ReviewStats> => {
      return await invoke('get_review_stats_filtered', { filter });
    },
    getLimitStatus: async (filter?: ReviewFilter): Promise<LimitStatus> => {
      return await invoke('get_limit_status', { filter });
    },
  },
  dashboard: {
    getMostRecentlyReadText: async (): Promise<number | null> => {
      return await invoke('get_most_recently_read_text');
    },
  },
  folders: {
    create: async (name: string, parentId: string | null): Promise<any> => {
      return await invoke('create_folder', { name, parentId });
    },
    getAll: async (): Promise<any[]> => {
      return await invoke('get_folder_tree');
    },
    rename: async (id: string, name: string): Promise<void> => {
      return await invoke('rename_folder', { id, name });
    },
    delete: async (id: string): Promise<void> => {
      return await invoke('delete_folder', { id });
    },
    moveText: async (textId: number, folderId: string | null): Promise<void> => {
      return await invoke('move_text_to_folder', { textId, folderId });
    },
    moveFolder: async (folderId: string, parentId: string | null): Promise<void> => {
      return await invoke('move_folder', { folderId, parentId });
    },
    getTextsInFolder: async (folderId: string): Promise<any[]> => {
      return await invoke('get_texts_in_folder', { folderId });
    },
    calculateProgress: async (folderId: string): Promise<number> => {
      return await invoke('calculate_folder_progress', { folderId });
    },
  },
  wikipedia: {
    fetch: async (url: string): Promise<WikipediaArticle> => {
      return await invoke('fetch_wikipedia_article', { url });
    },
  },
  hub: {
    getMarksForScope: async (scope: string, scopeId: string | number | null): Promise<MarkWithContext[]> => {
      return await invoke('get_hub_marks', {
        scope,
        scopeId: scopeId !== null ? String(scopeId) : null,
        includeWithCards: false,
      });
    },
    skipMark: async (markId: number): Promise<void> => {
      return await invoke('skip_mark', { markId });
    },
    buryMark: async (markId: number): Promise<void> => {
      return await invoke('bury_mark', { markId });
    },
    createCardFromMark: async (request: CreateCardRequest): Promise<CreatedCard[]> => {
      return await invoke('create_card_from_mark', {
        markId: request.markId,
        selectedText: request.selectedText,
        clozeText: request.clozeText,
      });
    },
    updateCard: async (cardId: number, question: string, answer: string): Promise<void> => {
      return await invoke('update_created_card', {
        cardId,
        question,
        answer,
      });
    },
    deleteCard: async (cardId: number): Promise<void> => {
      return await invoke('delete_created_card', { cardId });
    },
    getStats: async (): Promise<HubStats> => {
      return await invoke('get_hub_stats');
    },
  },
  settings: {
    updateSetting: async (key: string, value: string): Promise<void> => {
      return await invoke('update_setting', { key, value });
    },
    getDatabaseSize: async (): Promise<number> => {
      return await invoke('get_database_size');
    },
    exportDatabase: async (): Promise<void> => {
      return await invoke('export_database');
    },
    importDatabase: async (): Promise<string> => {
      return await invoke('import_database');
    },
    resetAllData: async (): Promise<ResetResult> => {
      return await invoke('reset_all_data');
    },
    resetReadingProgress: async (): Promise<{ count: number }> => {
      return await invoke('reset_reading_progress');
    },
    resetAllFlashcards: async (): Promise<{ count: number }> => {
      return await invoke('reset_all_flashcards');
    },
    resetFlashcardStats: async (): Promise<{ count: number }> => {
      return await invoke('reset_flashcard_stats');
    },
  },
};
