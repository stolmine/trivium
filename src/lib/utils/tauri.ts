import { invoke } from '@tauri-apps/api/core';
import type { Article, Flashcard, ReviewResult, Text, CreateTextRequest } from '../types';

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
    get: async (id: number): Promise<Text> => {
      return await invoke('get_text', { id });
    },
  },
};
