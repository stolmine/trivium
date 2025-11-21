import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export interface FlashcardWithTextInfo {
  id: number;
  textId: number;
  userId: number;
  originalText: string;
  clozeText: string;
  clozeIndex: number;
  displayIndex: number;
  clozeNumber: number;
  createdAt: string;
  updatedAt: string;
  clozeNoteId: number | null;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
  buriedUntil: string | null;
  textTitle: string;
  textFolderId: string | null;
}

export interface FlashcardsPage {
  flashcards: FlashcardWithTextInfo[];
  totalCount: number;
  offset: number;
  limit: number;
}

export interface FlashcardFilter {
  textId?: number;
  folderId?: string;
  state?: number[];
  dueBefore?: string;
  dueAfter?: string;
  createdBefore?: string;
  createdAfter?: string;
  minReps?: number;
  maxReps?: number;
  minDifficulty?: number;
  maxDifficulty?: number;
  searchText?: string;
  isBuried?: boolean;
}

export interface SortField {
  column: string;
  direction: 'asc' | 'desc';
}

interface FlashcardManagerState {
  flashcards: FlashcardWithTextInfo[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  paneSizes: { left: number; right: number };
  selectedIds: Set<number>;
  filters: FlashcardFilter;
  sorting: SortField | null;
  isDetailPanelCollapsed: boolean;
  hiddenColumns: Set<string>;

  loadFlashcards: () => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setPaneSize: (left: number, right: number) => void;
  toggleSelection: (id: number) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setFilter: (key: keyof FlashcardFilter, value: any) => void;
  clearFilters: () => void;
  setSorting: (sorting: SortField | null) => void;
  toggleSortColumn: (column: string) => void;
  toggleDetailPanel: () => void;
  getActiveFilterCount: () => number;
  toggleColumnVisibility: (columnId: string) => void;
}

// Add debugging wrapper for set function - set to true to enable debug logging
const DEBUG_STORE = false;
let storeUpdateCount = 0;

export const useFlashcardManagerStore = create<FlashcardManagerState>()(
  persist(
    (set, get) => {
      // Wrap the set function to log all state updates
      const debugSet = (
        partial: FlashcardManagerState | Partial<FlashcardManagerState> | ((state: FlashcardManagerState) => FlashcardManagerState | Partial<FlashcardManagerState>),
        replace?: boolean | undefined
      ) => {
        if (DEBUG_STORE) {
          storeUpdateCount++;
          const timestamp = new Date().toISOString();
          console.log(`[Store] Update #${storeUpdateCount} at ${timestamp}`);

          if (typeof partial === 'function') {
            console.log('[Store] Update via function');
          } else {
            console.log('[Store] Update fields:', Object.keys(partial));
          }

          // Log stack trace to see where update came from
          console.trace('[Store] Update stack trace');
        }

        return set(partial, replace as false | undefined);
      };

      return ({
      flashcards: [],
      totalCount: 0,
      currentPage: 0,
      pageSize: 50,
      isLoading: false,
      error: null,
      paneSizes: { left: 70, right: 30 },
      selectedIds: new Set<number>(),
      filters: {},
      sorting: null,
      isDetailPanelCollapsed: false,
      hiddenColumns: new Set<string>(),

      loadFlashcards: async () => {
        const timestamp = new Date().toISOString();
        console.log(`[Store] loadFlashcards called at ${timestamp}`);
        console.trace('[Store] loadFlashcards stack trace');

        debugSet({ isLoading: true, error: null });

        try {
          const { currentPage, pageSize, filters, sorting } = get();
          const offset = currentPage * pageSize;

          console.log(`[Store] Fetching flashcards: page=${currentPage}, size=${pageSize}, offset=${offset}`);
          console.log(`[Store] Filters:`, filters);
          console.log(`[Store] Sorting:`, sorting);
          console.log(`[Store] Sort array:`, sorting ? [sorting] : []);

          const result = await invoke<FlashcardsPage>('get_all_flashcards_paginated', {
            filter: filters,
            sort: sorting ? [sorting] : [],
            offset,
            limit: pageSize,
          });

          console.log(`[Store] Received ${result.flashcards.length} flashcards, total=${result.totalCount}`);

          debugSet({
            flashcards: result.flashcards,
            totalCount: result.totalCount,
            isLoading: false,
            error: null,
          });

          console.log(`[Store] State updated successfully`);
        } catch (error) {
          console.error('Failed to load flashcards:', error);
          debugSet({ error: String(error), isLoading: false });
        }
      },

      setPage: (page: number) => {
        debugSet({ currentPage: page });
        get().loadFlashcards();
      },

      setPageSize: (size: number) => {
        debugSet({ pageSize: size, currentPage: 0 });
        get().loadFlashcards();
      },

      setPaneSize: (left: number, right: number) => {
        debugSet({ paneSizes: { left, right } });
      },

      toggleSelection: (id: number) => {
        debugSet((state) => {
          const newSelectedIds = new Set(state.selectedIds);
          if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id);
          } else {
            newSelectedIds.add(id);
          }
          return { selectedIds: newSelectedIds };
        });
      },

      clearSelection: () => {
        debugSet({ selectedIds: new Set<number>() });
      },

      selectAll: () => {
        const { flashcards } = get();
        const allIds = new Set(flashcards.map(fc => fc.id));
        debugSet({ selectedIds: allIds });
      },

      setFilter: (key: keyof FlashcardFilter, value: any) => {
        const currentValue = get().filters[key];
        if (JSON.stringify(currentValue) === JSON.stringify(value)) {
          return;
        }
        debugSet((state) => ({
          filters: { ...state.filters, [key]: value },
          currentPage: 0,
          selectedIds: new Set<number>(),
        }));
        get().loadFlashcards();
      },

      clearFilters: () => {
        debugSet({ filters: {}, currentPage: 0 });
        get().loadFlashcards();
      },

      setSorting: (sorting: SortField | null) => {
        debugSet({ sorting });
        get().loadFlashcards();
      },

      toggleSortColumn: (column: string) => {
        debugSet((state) => {
          const currentSort = state.sorting;
          let newSorting: SortField | null;

          if (currentSort?.column === column) {
            if (currentSort.direction === 'asc') {
              newSorting = { column, direction: 'desc' as const };
            } else {
              newSorting = null;
            }
          } else {
            newSorting = { column, direction: 'asc' as const };
          }

          return { sorting: newSorting };
        });
        get().loadFlashcards();
      },

      toggleDetailPanel: () => {
        debugSet((state) => ({ isDetailPanelCollapsed: !state.isDetailPanelCollapsed }));
      },

      getActiveFilterCount: () => {
        const { filters } = get();
        return Object.values(filters).filter(v => v !== undefined && v !== null && v !== '').length;
      },

      toggleColumnVisibility: (columnId: string) => {
        debugSet((state) => {
          const newHiddenColumns = new Set(state.hiddenColumns);
          if (newHiddenColumns.has(columnId)) {
            newHiddenColumns.delete(columnId);
          } else {
            newHiddenColumns.add(columnId);
          }
          return { hiddenColumns: newHiddenColumns };
        });
      },
    });
    },
    {
      name: 'flashcard-manager-storage',
      partialize: (state) => ({
        paneSizes: state.paneSizes,
        pageSize: state.pageSize,
        filters: state.filters,
        sorting: state.sorting,
        isDetailPanelCollapsed: state.isDetailPanelCollapsed,
        hiddenColumns: state.hiddenColumns,
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          try {
            const data = JSON.parse(str);
            // Ensure hiddenColumns is always a Set
            if (data.state) {
              if (Array.isArray(data.state.hiddenColumns)) {
                // New format: array -> Set
                data.state.hiddenColumns = new Set(data.state.hiddenColumns);
              } else if (data.state.hiddenColumns && typeof data.state.hiddenColumns === 'object') {
                // Old format: object -> Set (empty)
                data.state.hiddenColumns = new Set<string>();
              } else if (!data.state.hiddenColumns) {
                // Missing: initialize as empty Set
                data.state.hiddenColumns = new Set<string>();
              }
            }
            return data;
          } catch (e) {
            console.error('Error parsing flashcard manager storage:', e);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            // Convert hiddenColumns Set to array for storage
            const data = {
              ...value,
              state: {
                ...value.state,
                hiddenColumns: value.state.hiddenColumns instanceof Set
                  ? Array.from(value.state.hiddenColumns)
                  : [],
              },
            };
            localStorage.setItem(name, JSON.stringify(data));
          } catch (e) {
            console.error('Error saving flashcard manager storage:', e);
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
