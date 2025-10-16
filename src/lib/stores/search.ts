import { create } from 'zustand';

export interface SearchMatch {
  start: number;
  end: number;
}

interface SearchState {
  isOpen: boolean;
  query: string;
  matches: SearchMatch[];
  currentIndex: number;
  caseSensitive: boolean;
  wholeWord: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  setMatches: (matches: SearchMatch[]) => void;
  nextMatch: () => void;
  previousMatch: () => void;
  toggleCaseSensitive: () => void;
  toggleWholeWord: () => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  isOpen: false,
  query: '',
  matches: [],
  currentIndex: 0,
  caseSensitive: false,
  wholeWord: false,

  openSearch: () => {
    set({ isOpen: true });
  },

  closeSearch: () => {
    set({ isOpen: false });
  },

  setQuery: (query: string) => {
    set({
      query,
      currentIndex: 0
    });
  },

  setMatches: (matches: SearchMatch[]) => {
    set({
      matches,
      currentIndex: matches.length > 0 ? 0 : 0
    });
  },

  nextMatch: () => {
    const { matches, currentIndex } = get();
    if (matches.length === 0) {
      return;
    }
    const nextIndex = currentIndex >= matches.length - 1 ? 0 : currentIndex + 1;
    set({ currentIndex: nextIndex });
  },

  previousMatch: () => {
    const { matches, currentIndex } = get();
    if (matches.length === 0) {
      return;
    }
    const prevIndex = currentIndex <= 0 ? matches.length - 1 : currentIndex - 1;
    set({ currentIndex: prevIndex });
  },

  toggleCaseSensitive: () => {
    set((state) => ({
      caseSensitive: !state.caseSensitive,
      currentIndex: 0
    }));
  },

  toggleWholeWord: () => {
    set((state) => ({
      wholeWord: !state.wholeWord,
      currentIndex: 0
    }));
  },

  reset: () => {
    set({
      query: '',
      matches: [],
      currentIndex: 0
    });
  }
}));
