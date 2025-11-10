import { create } from 'zustand';
import { api } from '../lib/utils/tauri';
import type { TextStatistics, FolderStatistics } from '../lib/types/statistics';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface LibraryStatsCacheState {
  textStats: Map<number, CacheEntry<TextStatistics>>;
  folderStats: Map<string, CacheEntry<FolderStatistics>>;
  loadingTexts: Set<number>;
  loadingFolders: Set<string>;
  maxCacheSize: number;
  cacheDurationMs: number;

  getTextStats: (textId: number) => TextStatistics | null;
  getFolderStats: (folderId: string) => FolderStatistics | null;
  loadTextStats: (textId: number) => Promise<TextStatistics>;
  loadFolderStats: (folderId: string) => Promise<FolderStatistics>;
  loadMultipleTextStats: (textIds: number[]) => Promise<void>;
  loadMultipleFolderStats: (folderIds: string[]) => Promise<void>;
  invalidateTextStats: (textId: number) => void;
  invalidateFolderStats: (folderId: string) => void;
  clearCache: () => void;
}

const MAX_CACHE_SIZE = 100;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Evict oldest cache entries if cache size exceeds limit (LRU eviction)
 */
function evictOldestEntries<K, V>(
  cache: Map<K, CacheEntry<V>>,
  maxSize: number
): Map<K, CacheEntry<V>> {
  if (cache.size <= maxSize) {
    return cache;
  }

  // Sort by timestamp and keep only the most recent entries
  const sorted = Array.from(cache.entries()).sort(
    (a, b) => b[1].timestamp - a[1].timestamp
  );

  return new Map(sorted.slice(0, maxSize));
}

/**
 * Check if a cache entry is still valid
 */
function isCacheValid<T>(entry: CacheEntry<T> | undefined, maxAgeMs: number): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < maxAgeMs;
}

export const useLibraryStatsCacheStore = create<LibraryStatsCacheState>((set, get) => ({
  textStats: new Map(),
  folderStats: new Map(),
  loadingTexts: new Set(),
  loadingFolders: new Set(),
  maxCacheSize: MAX_CACHE_SIZE,
  cacheDurationMs: CACHE_DURATION_MS,

  getTextStats: (textId: number) => {
    const entry = get().textStats.get(textId);
    if (isCacheValid(entry, get().cacheDurationMs)) {
      return entry!.data;
    }
    return null;
  },

  getFolderStats: (folderId: string) => {
    const entry = get().folderStats.get(folderId);
    if (isCacheValid(entry, get().cacheDurationMs)) {
      return entry!.data;
    }
    return null;
  },

  loadTextStats: async (textId: number) => {
    const state = get();

    // Return cached data if valid
    const cached = state.getTextStats(textId);
    if (cached) {
      return cached;
    }

    // Don't start a new load if already loading
    if (state.loadingTexts.has(textId)) {
      // Wait for the existing load to complete
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          const currentState = get();
          if (!currentState.loadingTexts.has(textId)) {
            clearInterval(checkInterval);
            const stats = currentState.getTextStats(textId);
            if (stats) {
              resolve(stats);
            } else {
              reject(new Error('Failed to load text stats'));
            }
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Timeout waiting for text stats'));
        }, 10000);
      });
    }

    // Mark as loading
    set((state) => ({
      loadingTexts: new Set(state.loadingTexts).add(textId),
    }));

    try {
      const stats = await api.libraryStatistics.getTextStatistics(textId);

      set((state) => {
        const newTextStats = new Map(state.textStats);
        newTextStats.set(textId, {
          data: stats,
          timestamp: Date.now(),
        });

        // Evict old entries if needed
        const evictedTextStats = evictOldestEntries(newTextStats, state.maxCacheSize);

        const newLoadingTexts = new Set(state.loadingTexts);
        newLoadingTexts.delete(textId);

        return {
          textStats: evictedTextStats,
          loadingTexts: newLoadingTexts,
        };
      });

      return stats;
    } catch (error) {
      // Remove from loading set on error
      set((state) => {
        const newLoadingTexts = new Set(state.loadingTexts);
        newLoadingTexts.delete(textId);
        return { loadingTexts: newLoadingTexts };
      });
      throw error;
    }
  },

  loadFolderStats: async (folderId: string) => {
    const state = get();

    // Return cached data if valid
    const cached = state.getFolderStats(folderId);
    if (cached) {
      return cached;
    }

    // Don't start a new load if already loading
    if (state.loadingFolders.has(folderId)) {
      // Wait for the existing load to complete
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          const currentState = get();
          if (!currentState.loadingFolders.has(folderId)) {
            clearInterval(checkInterval);
            const stats = currentState.getFolderStats(folderId);
            if (stats) {
              resolve(stats);
            } else {
              reject(new Error('Failed to load folder stats'));
            }
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Timeout waiting for folder stats'));
        }, 10000);
      });
    }

    // Mark as loading
    set((state) => ({
      loadingFolders: new Set(state.loadingFolders).add(folderId),
    }));

    try {
      const stats = await api.libraryStatistics.getFolderStatistics(folderId);

      set((state) => {
        const newFolderStats = new Map(state.folderStats);
        newFolderStats.set(folderId, {
          data: stats,
          timestamp: Date.now(),
        });

        // Evict old entries if needed
        const evictedFolderStats = evictOldestEntries(newFolderStats, state.maxCacheSize);

        const newLoadingFolders = new Set(state.loadingFolders);
        newLoadingFolders.delete(folderId);

        return {
          folderStats: evictedFolderStats,
          loadingFolders: newLoadingFolders,
        };
      });

      return stats;
    } catch (error) {
      // Remove from loading set on error
      set((state) => {
        const newLoadingFolders = new Set(state.loadingFolders);
        newLoadingFolders.delete(folderId);
        return { loadingFolders: newLoadingFolders };
      });
      throw error;
    }
  },

  loadMultipleTextStats: async (textIds: number[]) => {
    // Load all text stats in parallel, but skip already loading/cached ones
    const promises = textIds.map((textId) => {
      const state = get();
      const cached = state.getTextStats(textId);
      if (cached || state.loadingTexts.has(textId)) {
        return Promise.resolve();
      }
      return state.loadTextStats(textId).catch((error) => {
        console.error(`Failed to load stats for text ${textId}:`, error);
      });
    });

    await Promise.all(promises);
  },

  loadMultipleFolderStats: async (folderIds: string[]) => {
    // Load all folder stats in parallel, but skip already loading/cached ones
    const promises = folderIds.map((folderId) => {
      const state = get();
      const cached = state.getFolderStats(folderId);
      if (cached || state.loadingFolders.has(folderId)) {
        return Promise.resolve();
      }
      return state.loadFolderStats(folderId).catch((error) => {
        console.error(`Failed to load stats for folder ${folderId}:`, error);
      });
    });

    await Promise.all(promises);
  },

  invalidateTextStats: (textId: number) => {
    set((state) => {
      const newTextStats = new Map(state.textStats);
      newTextStats.delete(textId);
      return { textStats: newTextStats };
    });
  },

  invalidateFolderStats: (folderId: string) => {
    set((state) => {
      const newFolderStats = new Map(state.folderStats);
      newFolderStats.delete(folderId);
      return { folderStats: newFolderStats };
    });
  },

  clearCache: () => {
    set({
      textStats: new Map(),
      folderStats: new Map(),
      loadingTexts: new Set(),
      loadingFolders: new Set(),
    });
  },
}));
