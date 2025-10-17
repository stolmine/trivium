import { create } from 'zustand';

interface LibrarySearchState {
  isOpen: boolean;
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  matchedTextIds: number[];
  matchedFolderIds: string[];
  totalMatches: number;
  currentMatchIndex: number;
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  toggleCaseSensitive: () => void;
  toggleWholeWord: () => void;
  setMatches: (textIds: number[], folderIds: string[]) => void;
  nextMatch: () => void;
  previousMatch: () => void;
  reset: () => void;
}

export const useLibrarySearchStore = create<LibrarySearchState>((set, get) => ({
  isOpen: false,
  query: '',
  caseSensitive: false,
  wholeWord: false,
  matchedTextIds: [],
  matchedFolderIds: [],
  totalMatches: 0,
  currentMatchIndex: 0,

  openSearch: () => {
    set({ isOpen: true });
  },

  closeSearch: () => {
    set({ isOpen: false });
  },

  setQuery: (query: string) => {
    set({
      query,
      currentMatchIndex: 0
    });
  },

  toggleCaseSensitive: () => {
    set((state) => ({
      caseSensitive: !state.caseSensitive,
      currentMatchIndex: 0
    }));
  },

  toggleWholeWord: () => {
    set((state) => ({
      wholeWord: !state.wholeWord,
      currentMatchIndex: 0
    }));
  },

  setMatches: (textIds: number[], folderIds: string[]) => {
    const totalMatches = textIds.length + folderIds.length;
    set({
      matchedTextIds: textIds,
      matchedFolderIds: folderIds,
      totalMatches,
      currentMatchIndex: totalMatches > 0 ? 0 : 0
    });
  },

  nextMatch: () => {
    const { matchedTextIds, currentMatchIndex } = get();
    // Only navigate through text matches, not folders
    const textMatchCount = matchedTextIds.length;
    if (textMatchCount === 0) {
      return;
    }
    const nextIndex = currentMatchIndex >= textMatchCount - 1 ? 0 : currentMatchIndex + 1;
    set({ currentMatchIndex: nextIndex });
  },

  previousMatch: () => {
    const { matchedTextIds, currentMatchIndex } = get();
    // Only navigate through text matches, not folders
    const textMatchCount = matchedTextIds.length;
    if (textMatchCount === 0) {
      return;
    }
    const prevIndex = currentMatchIndex <= 0 ? textMatchCount - 1 : currentMatchIndex - 1;
    set({ currentMatchIndex: prevIndex });
  },

  reset: () => {
    set({
      query: '',
      matchedTextIds: [],
      matchedFolderIds: [],
      totalMatches: 0,
      currentMatchIndex: 0
    });
  }
}));
