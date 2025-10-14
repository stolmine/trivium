import { useEffect, useState } from 'react';
import { api } from '../utils/tauri';

const progressCache = new Map<number, { progress: number; timestamp: number }>();
const folderProgressCache = new Map<string, { progress: number; timestamp: number }>();
const CACHE_DURATION_MS = 60000;

export function useTextProgress(textId: number | null) {
  const [progress, setProgress] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (textId === null) {
      setProgress(null);
      return;
    }

    const cached = progressCache.get(textId);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
      setProgress(cached.progress);
      return;
    }

    setIsLoading(true);

    api.reading
      .calculateProgress(textId)
      .then((calculatedProgress) => {
        progressCache.set(textId, { progress: calculatedProgress, timestamp: now });
        setProgress(calculatedProgress);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to calculate progress:', error);
        setIsLoading(false);
      });
  }, [textId]);

  return { progress, isLoading };
}

export function useFolderProgress(folderId: string | null) {
  const [progress, setProgress] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (folderId === null) {
      setProgress(null);
      return;
    }

    const cached = folderProgressCache.get(folderId);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
      setProgress(cached.progress);
      return;
    }

    setIsLoading(true);

    api.folders
      .calculateProgress(folderId)
      .then((calculatedProgress) => {
        folderProgressCache.set(folderId, { progress: calculatedProgress, timestamp: now });
        setProgress(calculatedProgress);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to calculate folder progress:', error);
        setIsLoading(false);
      });
  }, [folderId]);

  return { progress, isLoading };
}

export function invalidateProgressCache(textId: number) {
  progressCache.delete(textId);
}

export function invalidateFolderProgressCache(folderId: string) {
  folderProgressCache.delete(folderId);
}

export function clearProgressCache() {
  progressCache.clear();
  folderProgressCache.clear();
}
