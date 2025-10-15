import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ReviewConfig {
  filterType: 'all' | 'folder' | 'text';
  folderId?: string;
  textId?: number;
  sessionLimit: number;
}

interface ReviewConfigState {
  config: ReviewConfig;
  setFilterType: (type: 'all' | 'folder' | 'text') => void;
  setFolder: (id: string) => void;
  setText: (id: number) => void;
  setSessionLimit: (limit: number) => void;
}

export const useReviewConfig = create<ReviewConfigState>()(
  persist(
    (set) => ({
      config: {
        filterType: 'all',
        sessionLimit: 20,
      },
      setFilterType: (type) => set((state) => ({
        config: { ...state.config, filterType: type }
      })),
      setFolder: (id) => set((state) => ({
        config: { ...state.config, folderId: id }
      })),
      setText: (id) => set((state) => ({
        config: { ...state.config, textId: id }
      })),
      setSessionLimit: (limit) => set((state) => ({
        config: { ...state.config, sessionLimit: limit }
      })),
    }),
    { name: 'review-config' }
  )
);
