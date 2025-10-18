import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LastReadState {
  textId: number | null;
  textTitle: string | null;
  scrollPosition: number;
  timestamp: number | null;
  progress: number;
  setLastRead: (textId: number, textTitle: string, scrollPosition: number, progress: number) => void;
  clearLastRead: () => void;
  hasLastRead: () => boolean;
}

export const useLastReadStore = create<LastReadState>()(
  persist(
    (set, get) => ({
      textId: null,
      textTitle: null,
      scrollPosition: 0,
      timestamp: null,
      progress: 0,

      setLastRead: (textId: number, textTitle: string, scrollPosition: number, progress: number) => {
        set({
          textId,
          textTitle,
          scrollPosition,
          timestamp: Date.now(),
          progress
        });
      },

      clearLastRead: () => {
        set({
          textId: null,
          textTitle: null,
          scrollPosition: 0,
          timestamp: null,
          progress: 0
        });
      },

      hasLastRead: () => {
        const state = get();
        return state.textId !== null;
      },
    }),
    {
      name: 'trivium-last-read-storage',
    }
  )
);
