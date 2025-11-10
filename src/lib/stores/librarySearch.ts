import { create } from 'zustand';

type SearchContext = 'sidebar' | 'library';

interface SearchContextState {
  isOpen: boolean;
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  matchedTextIds: number[];
  matchedFolderIds: string[];
  totalMatches: number;
  currentMatchIndex: number;
}

interface LibrarySearchState {
  sidebar: SearchContextState;
  library: SearchContextState;
  openSearch: (context: SearchContext) => void;
  closeSearch: (context: SearchContext) => void;
  setQuery: (context: SearchContext, query: string) => void;
  toggleCaseSensitive: (context: SearchContext) => void;
  toggleWholeWord: (context: SearchContext) => void;
  setMatches: (context: SearchContext, textIds: number[], folderIds: string[]) => void;
  nextMatch: (context: SearchContext) => void;
  previousMatch: (context: SearchContext) => void;
  reset: (context: SearchContext) => void;
}

const createInitialContextState = (): SearchContextState => ({
  isOpen: false,
  query: '',
  caseSensitive: false,
  wholeWord: false,
  matchedTextIds: [],
  matchedFolderIds: [],
  totalMatches: 0,
  currentMatchIndex: 0,
});

export const useLibrarySearchStore = create<LibrarySearchState>((set, get) => ({
  sidebar: createInitialContextState(),
  library: createInitialContextState(),

  openSearch: (context: SearchContext) => {
    set((state) => ({
      [context]: {
        ...state[context],
        isOpen: true
      }
    }));
  },

  closeSearch: (context: SearchContext) => {
    set((state) => ({
      [context]: {
        ...state[context],
        isOpen: false
      }
    }));
  },

  setQuery: (context: SearchContext, query: string) => {
    set((state) => ({
      [context]: {
        ...state[context],
        query,
        currentMatchIndex: 0
      }
    }));
  },

  toggleCaseSensitive: (context: SearchContext) => {
    set((state) => ({
      [context]: {
        ...state[context],
        caseSensitive: !state[context].caseSensitive,
        currentMatchIndex: 0
      }
    }));
  },

  toggleWholeWord: (context: SearchContext) => {
    set((state) => ({
      [context]: {
        ...state[context],
        wholeWord: !state[context].wholeWord,
        currentMatchIndex: 0
      }
    }));
  },

  setMatches: (context: SearchContext, textIds: number[], folderIds: string[]) => {
    const totalMatches = textIds.length + folderIds.length;
    set((state) => ({
      [context]: {
        ...state[context],
        matchedTextIds: textIds,
        matchedFolderIds: folderIds,
        totalMatches,
        currentMatchIndex: totalMatches > 0 ? 0 : 0
      }
    }));
  },

  nextMatch: (context: SearchContext) => {
    const contextState = get()[context];
    const textMatchCount = contextState.matchedTextIds.length;
    if (textMatchCount === 0) {
      return;
    }
    const nextIndex = contextState.currentMatchIndex >= textMatchCount - 1 ? 0 : contextState.currentMatchIndex + 1;
    set((state) => ({
      [context]: {
        ...state[context],
        currentMatchIndex: nextIndex
      }
    }));
  },

  previousMatch: (context: SearchContext) => {
    const contextState = get()[context];
    const textMatchCount = contextState.matchedTextIds.length;
    if (textMatchCount === 0) {
      return;
    }
    const prevIndex = contextState.currentMatchIndex <= 0 ? textMatchCount - 1 : contextState.currentMatchIndex - 1;
    set((state) => ({
      [context]: {
        ...state[context],
        currentMatchIndex: prevIndex
      }
    }));
  },

  reset: (context: SearchContext) => {
    set((state) => ({
      [context]: {
        ...state[context],
        query: '',
        matchedTextIds: [],
        matchedFolderIds: [],
        totalMatches: 0,
        currentMatchIndex: 0
      }
    }));
  }
}));
