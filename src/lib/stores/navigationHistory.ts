import { create } from 'zustand';

export interface NavigationEntry {
  pathname: string;
  state: unknown;
  timestamp: number;
}

interface NavigationHistoryState {
  entries: NavigationEntry[];
  currentIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
  pushEntry: (pathname: string, state: unknown) => void;
  goBack: () => NavigationEntry | null;
  goForward: () => NavigationEntry | null;
  clear: () => void;
}

const MAX_HISTORY_ENTRIES = 50;

export const useNavigationHistory = create<NavigationHistoryState>((set, get) => ({
  entries: [],
  currentIndex: -1,
  canGoBack: false,
  canGoForward: false,

  pushEntry: (pathname: string, state: unknown) => {
    set((prevState) => {
      const entries = [...prevState.entries.slice(0, prevState.currentIndex + 1)];

      entries.push({
        pathname,
        state,
        timestamp: Date.now(),
      });

      if (entries.length > MAX_HISTORY_ENTRIES) {
        entries.shift();
      }

      const currentIndex = entries.length - 1;

      return {
        entries,
        currentIndex,
        canGoBack: currentIndex > 0,
        canGoForward: false,
      };
    });
  },

  goBack: () => {
    const { entries, currentIndex } = get();

    if (currentIndex <= 0) {
      return null;
    }

    const newIndex = currentIndex - 1;
    const entry = entries[newIndex];

    set({
      currentIndex: newIndex,
      canGoBack: newIndex > 0,
      canGoForward: true,
    });

    return entry;
  },

  goForward: () => {
    const { entries, currentIndex } = get();

    if (currentIndex >= entries.length - 1) {
      return null;
    }

    const newIndex = currentIndex + 1;
    const entry = entries[newIndex];

    set({
      currentIndex: newIndex,
      canGoBack: true,
      canGoForward: newIndex < entries.length - 1,
    });

    return entry;
  },

  clear: () => {
    set({
      entries: [],
      currentIndex: -1,
      canGoBack: false,
      canGoForward: false,
    });
  },
}));
