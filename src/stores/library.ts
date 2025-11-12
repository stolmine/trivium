import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/utils/tauri';
import type { Folder } from '../lib/types/folder';
import type { Text } from '../lib/types/article';
import { buildTree, getFlattenedVisibleNodes, getNodeById } from '../lib/tree-utils';
import { useLibraryStatsCacheStore } from './libraryStatsCache';

export type SortOption = 'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest' | 'content-length';
export type ViewMode = 'tree' | 'icon' | 'list';
export type SortColumn = 'name' | 'size' | 'modified' | 'progress' | 'flashcards';
export type SortDirection = 'asc' | 'desc';

interface LibraryState {
  folders: Folder[];
  texts: Text[];
  expandedFolderIds: Set<string>;
  libraryExpandedFolderIds: Set<string>;
  selectedItemId: string | null;
  selectedItemIds: Set<string>;
  anchorItemId: string | null;
  librarySelectedItemId: string | null;
  librarySelectedItemIds: Set<string>;
  libraryAnchorItemId: string | null;
  sortBy: SortOption;
  isLoading: boolean;
  error: string | null;
  paneSizes: { left: number; right: number };
  viewMode: ViewMode;
  currentFolderId: string | null;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  syncSidebarSelection: boolean;
  isInfoViewCollapsed: boolean;

  // Keyboard navigation state (separate from selection)
  focusedItemId: string | null;
  gridColumns: number;

  loadLibrary: () => Promise<void>;
  toggleFolder: (folderId: string) => void;
  toggleLibraryFolder: (folderId: string) => void;
  expandAllFolders: () => void;
  collapseAllFolders: () => void;
  expandAllLibraryFolders: () => void;
  collapseAllLibraryFolders: () => void;
  selectItem: (itemId: string | null) => void;
  selectLibraryItem: (itemId: string | null) => void;
  selectItemMulti: (id: string, mode: 'single' | 'toggle' | 'range') => void;
  selectLibraryItemMulti: (id: string, mode: 'single' | 'toggle' | 'range', visibleItemIds?: string[]) => void;
  selectAll: () => void;
  selectAllLibrary: () => void;
  clearSelection: () => void;
  clearLibrarySelection: () => void;
  getSelectedItems: () => { folders: Folder[], texts: Text[] };
  getSelectedLibraryItems: () => { folders: Folder[], texts: Text[] };
  setSortBy: (sortBy: SortOption) => void;
  selectNextItem: () => void;
  selectPreviousItem: () => void;
  expandSelectedFolder: () => void;
  collapseSelectedFolder: () => void;
  createFolder: (name: string, parentId?: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveTextToFolder: (textId: number, folderId: string | null) => Promise<void>;
  moveFolder: (folderId: string, parentId: string | null) => Promise<void>;
  renameText: (id: number, title: string) => Promise<void>;
  deleteText: (id: number) => Promise<void>;
  setPaneSize: (left: number, right: number) => void;
  toggleSyncSidebarSelection: () => void;
  setViewMode: (mode: ViewMode) => void;
  setCurrentFolder: (folderId: string | null) => void;
  setSortColumn: (column: SortColumn, direction?: SortDirection) => void;
  toggleInfoViewCollapsed: () => void;

  // Keyboard navigation actions
  setFocusedItem: (itemId: string | null) => void;
  focusNextItem: (direction: 'up' | 'down' | 'left' | 'right') => void;
  focusFirstItem: () => void;
  focusLastItem: () => void;
  setGridColumns: (columns: number) => void;
  getFlattenedItems: () => string[];
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      folders: [],
      texts: [],
      expandedFolderIds: new Set<string>(),
      libraryExpandedFolderIds: new Set<string>(),
      selectedItemId: null,
      selectedItemIds: new Set<string>(),
      anchorItemId: null,
      librarySelectedItemId: null,
      librarySelectedItemIds: new Set<string>(),
      libraryAnchorItemId: null,
      sortBy: 'date-newest',
      isLoading: false,
      error: null,
      paneSizes: { left: 40, right: 60 },
      viewMode: 'tree',
      currentFolderId: null,
      sortColumn: 'name',
      sortDirection: 'asc',
      syncSidebarSelection: false,
      isInfoViewCollapsed: false,
      focusedItemId: null,
      gridColumns: 6,

  loadLibrary: async () => {
    set({ isLoading: true, error: null });

    try {
      const [folders, texts] = await Promise.all([
        api.folders.getAll(),
        api.texts.list(),
      ]);

      set({ folders, texts, isLoading: false, error: null });
    } catch (error) {
      console.error('Failed to load library:', error);
      set({ error: String(error), isLoading: false });
    }
  },

  toggleFolder: (folderId: string) => {
    set((state) => {
      const newExpandedIds = new Set(state.expandedFolderIds);

      if (newExpandedIds.has(folderId)) {
        newExpandedIds.delete(folderId);
      } else {
        newExpandedIds.add(folderId);
      }

      return { expandedFolderIds: newExpandedIds };
    });
  },

  toggleLibraryFolder: (folderId: string) => {
    set((state) => {
      const newExpandedIds = new Set(state.libraryExpandedFolderIds);

      if (newExpandedIds.has(folderId)) {
        newExpandedIds.delete(folderId);
      } else {
        newExpandedIds.add(folderId);
      }

      return { libraryExpandedFolderIds: newExpandedIds };
    });
  },

  expandAllFolders: () => {
    set((state) => {
      const allFolderIds = new Set(state.folders.map(f => f.id));
      return { expandedFolderIds: allFolderIds };
    });
  },

  collapseAllFolders: () => {
    set({ expandedFolderIds: new Set() });
  },

  expandAllLibraryFolders: () => {
    set((state) => {
      const allFolderIds = new Set(state.folders.map(f => f.id));
      return { libraryExpandedFolderIds: allFolderIds };
    });
  },

  collapseAllLibraryFolders: () => {
    set({ libraryExpandedFolderIds: new Set() });
  },

  selectItem: (itemId: string | null) => {
    set({
      selectedItemId: itemId,
      selectedItemIds: itemId ? new Set([itemId]) : new Set(),
      anchorItemId: itemId,
    });
  },

  selectLibraryItem: (itemId: string | null) => {
    set({
      librarySelectedItemId: itemId,
      librarySelectedItemIds: itemId ? new Set([itemId]) : new Set(),
      libraryAnchorItemId: itemId,
    });
  },

  selectItemMulti: (id: string, mode: 'single' | 'toggle' | 'range') => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedItemIds);
      let newAnchorId = state.anchorItemId;
      let newSelectedItemId: string | null = id;

      if (mode === 'single') {
        newSelectedIds.clear();
        newSelectedIds.add(id);
        newAnchorId = id;
      } else if (mode === 'toggle') {
        if (newSelectedIds.has(id)) {
          newSelectedIds.delete(id);
          if (newSelectedIds.size === 0) {
            newAnchorId = null;
            newSelectedItemId = null;
          } else {
            newSelectedItemId = Array.from(newSelectedIds)[0];
          }
        } else {
          newSelectedIds.add(id);
          newAnchorId = id;
        }
      } else if (mode === 'range') {
        if (!newAnchorId) {
          newSelectedIds.clear();
          newSelectedIds.add(id);
          newAnchorId = id;
        } else {
          const tree = buildTree(state.folders, state.texts);
          const flatNodes = getFlattenedVisibleNodes(tree, state.expandedFolderIds);

          const anchorIndex = flatNodes.findIndex(n => n.id === newAnchorId);
          const targetIndex = flatNodes.findIndex(n => n.id === id);

          if (anchorIndex !== -1 && targetIndex !== -1) {
            const startIndex = Math.min(anchorIndex, targetIndex);
            const endIndex = Math.max(anchorIndex, targetIndex);

            newSelectedIds.clear();
            for (let i = startIndex; i <= endIndex; i++) {
              newSelectedIds.add(flatNodes[i].id);
            }
          }
        }
      }

      if (state.syncSidebarSelection) {
        return {
          selectedItemIds: newSelectedIds,
          anchorItemId: newAnchorId,
          selectedItemId: newSelectedItemId,
        };
      } else {
        return {
          selectedItemIds: newSelectedIds,
          anchorItemId: newAnchorId,
        };
      }
    });
  },

  selectLibraryItemMulti: (id: string, mode: 'single' | 'toggle' | 'range', visibleItemIds?: string[]) => {
    set((state) => {
      const newSelectedIds = new Set(state.librarySelectedItemIds);
      let newAnchorId = state.libraryAnchorItemId;
      let newSelectedItemId: string | null = id;

      if (mode === 'single') {
        newSelectedIds.clear();
        newSelectedIds.add(id);
        newAnchorId = id;
      } else if (mode === 'toggle') {
        if (newSelectedIds.has(id)) {
          newSelectedIds.delete(id);
          if (newSelectedIds.size === 0) {
            newAnchorId = null;
            newSelectedItemId = null;
          } else {
            newSelectedItemId = Array.from(newSelectedIds)[0];
          }
        } else {
          newSelectedIds.add(id);
          newAnchorId = id;
        }
      } else if (mode === 'range') {
        if (!newAnchorId) {
          newSelectedIds.clear();
          newSelectedIds.add(id);
          newAnchorId = id;
        } else {
          // Use provided visible items if available (for grid/icon/list views),
          // otherwise fall back to flattened tree (for tree view)
          let itemIds: string[];
          if (visibleItemIds) {
            itemIds = visibleItemIds;
          } else {
            const tree = buildTree(state.folders, state.texts);
            const flatNodes = getFlattenedVisibleNodes(tree, state.libraryExpandedFolderIds);
            itemIds = flatNodes.map(n => n.id);
          }

          const anchorIndex = itemIds.findIndex(itemId => itemId === newAnchorId);
          const targetIndex = itemIds.findIndex(itemId => itemId === id);

          if (anchorIndex !== -1 && targetIndex !== -1) {
            const startIndex = Math.min(anchorIndex, targetIndex);
            const endIndex = Math.max(anchorIndex, targetIndex);

            newSelectedIds.clear();
            for (let i = startIndex; i <= endIndex; i++) {
              newSelectedIds.add(itemIds[i]);
            }
          }
        }
      }

      return {
        librarySelectedItemIds: newSelectedIds,
        libraryAnchorItemId: newAnchorId,
        librarySelectedItemId: newSelectedItemId,
      };
    });
  },

  selectAll: () => {
    set((state) => {
      const tree = buildTree(state.folders, state.texts);
      const flatNodes = getFlattenedVisibleNodes(tree, state.expandedFolderIds);
      const allIds = new Set(flatNodes.map(n => n.id));

      return {
        selectedItemIds: allIds,
        selectedItemId: flatNodes.length > 0 ? flatNodes[0].id : null,
        anchorItemId: flatNodes.length > 0 ? flatNodes[0].id : null,
      };
    });
  },

  selectAllLibrary: () => {
    set((state) => {
      let allIds: Set<string>;

      // In tree view: select all visible nodes
      // In icon/list view: select only items in current folder
      if (state.viewMode === 'tree') {
        const tree = buildTree(state.folders, state.texts);
        const flatNodes = getFlattenedVisibleNodes(tree, state.libraryExpandedFolderIds);
        allIds = new Set(flatNodes.map(n => n.id));
      } else {
        // Icon or list view: only select items in current folder
        const currentFolderId = state.currentFolderId;
        const foldersInView = state.folders
          .filter(f => f.parentId === currentFolderId)
          .map(f => f.id);
        const textsInView = state.texts
          .filter(t => (t.folderId ?? null) === currentFolderId)
          .map(t => `text-${t.id}`); // Use text-{id} format to match IconGridView/ListView
        allIds = new Set([...foldersInView, ...textsInView]);
      }

      return {
        librarySelectedItemIds: allIds,
        librarySelectedItemId: allIds.size > 0 ? Array.from(allIds)[0] : null,
        libraryAnchorItemId: allIds.size > 0 ? Array.from(allIds)[0] : null,
      };
    });
  },

  clearSelection: () => {
    set({
      selectedItemIds: new Set(),
      selectedItemId: null,
      anchorItemId: null,
    });
  },

  clearLibrarySelection: () => {
    set({
      librarySelectedItemIds: new Set(),
      librarySelectedItemId: null,
      libraryAnchorItemId: null,
    });
  },

  getSelectedItems: () => {
    const state = get();
    const selectedIds = state.selectedItemIds;

    const selectedFolders = state.folders.filter(folder => selectedIds.has(folder.id));
    const selectedTexts = state.texts.filter(text => selectedIds.has(`text-${text.id}`));

    return {
      folders: selectedFolders,
      texts: selectedTexts,
    };
  },

  getSelectedLibraryItems: () => {
    const state = get();
    const selectedIds = state.librarySelectedItemIds;

    const selectedFolders = state.folders.filter(folder => selectedIds.has(folder.id));
    const selectedTexts = state.texts.filter(text => selectedIds.has(`text-${text.id}`));

    return {
      folders: selectedFolders,
      texts: selectedTexts,
    };
  },

  setSortBy: (sortBy: SortOption) => {
    set({ sortBy });
  },

  selectNextItem: () => {
    set((state) => {
      const tree = buildTree(state.folders, state.texts);
      const flatNodes = getFlattenedVisibleNodes(tree, state.expandedFolderIds);

      if (flatNodes.length === 0) return {};

      if (!state.selectedItemId) {
        return { selectedItemId: flatNodes[0].id };
      }

      const currentIndex = flatNodes.findIndex(n => n.id === state.selectedItemId);
      if (currentIndex === -1) {
        return { selectedItemId: flatNodes[0].id };
      }

      const nextIndex = (currentIndex + 1) % flatNodes.length;
      return { selectedItemId: flatNodes[nextIndex].id };
    });
  },

  selectPreviousItem: () => {
    set((state) => {
      const tree = buildTree(state.folders, state.texts);
      const flatNodes = getFlattenedVisibleNodes(tree, state.expandedFolderIds);

      if (flatNodes.length === 0) return {};

      if (!state.selectedItemId) {
        return { selectedItemId: flatNodes[flatNodes.length - 1].id };
      }

      const currentIndex = flatNodes.findIndex(n => n.id === state.selectedItemId);
      if (currentIndex === -1) {
        return { selectedItemId: flatNodes[flatNodes.length - 1].id };
      }

      const prevIndex = currentIndex === 0 ? flatNodes.length - 1 : currentIndex - 1;
      return { selectedItemId: flatNodes[prevIndex].id };
    });
  },

  expandSelectedFolder: () => {
    set((state) => {
      if (!state.selectedItemId) return {};

      const tree = buildTree(state.folders, state.texts);
      const selectedNode = getNodeById(tree, state.selectedItemId);

      if (!selectedNode || selectedNode.type !== 'folder') return {};

      if (state.expandedFolderIds.has(state.selectedItemId)) {
        if (selectedNode.children.length > 0) {
          return { selectedItemId: selectedNode.children[0].id };
        }
        return {};
      }

      const newExpandedIds = new Set(state.expandedFolderIds);
      newExpandedIds.add(state.selectedItemId);
      return { expandedFolderIds: newExpandedIds };
    });
  },

  collapseSelectedFolder: () => {
    set((state) => {
      if (!state.selectedItemId) return {};

      const tree = buildTree(state.folders, state.texts);
      const selectedNode = getNodeById(tree, state.selectedItemId);

      if (!selectedNode || selectedNode.type !== 'folder') return {};

      if (!state.expandedFolderIds.has(state.selectedItemId)) {
        return {};
      }

      const newExpandedIds = new Set(state.expandedFolderIds);
      newExpandedIds.delete(state.selectedItemId);
      return { expandedFolderIds: newExpandedIds };
    });
  },

  createFolder: async (name: string, parentId?: string) => {
    try {
      const newFolder = await api.folders.create(name, parentId || null);
      set((state) => ({
        folders: [...state.folders, newFolder],
      }));
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error; // Let the caller handle the error
    }
  },

  renameFolder: async (id: string, name: string) => {
    try {
      await api.folders.rename(id, name);
      set((state) => ({
        folders: state.folders.map((folder) =>
          folder.id === id ? { ...folder, name, updatedAt: new Date().toISOString() } : folder
        ),
      }));
      // Invalidate cache for this folder
      useLibraryStatsCacheStore.getState().invalidateFolderStats(id);
    } catch (error) {
      console.error('Failed to rename folder:', error);
      throw error; // Let the caller handle the error
    }
  },

  deleteFolder: async (id: string) => {
    try {
      await api.folders.delete(id);
      set((state) => ({
        folders: state.folders.filter((folder) => folder.id !== id),
        expandedFolderIds: new Set(
          Array.from(state.expandedFolderIds).filter((fid) => fid !== id)
        ),
        libraryExpandedFolderIds: new Set(
          Array.from(state.libraryExpandedFolderIds).filter((fid) => fid !== id)
        ),
      }));
      // Invalidate cache for deleted folder
      useLibraryStatsCacheStore.getState().invalidateFolderStats(id);
    } catch (error) {
      console.error('Failed to delete folder:', error);
      throw error; // Let the caller handle the error
    }
  },

  moveTextToFolder: async (textId: number, folderId: string | null) => {
    try {
      const oldText = get().texts.find(t => t.id === textId);
      const oldFolderId = oldText?.folderId ?? null;

      await api.folders.moveText(textId, folderId);
      set((state) => ({
        texts: state.texts.map((text) =>
          text.id === textId ? { ...text, folderId } : text
        ),
      }));

      // Invalidate cache for affected text and folders
      useLibraryStatsCacheStore.getState().invalidateTextStats(textId);
      if (oldFolderId) {
        useLibraryStatsCacheStore.getState().invalidateFolderStats(oldFolderId);
      }
      if (folderId) {
        useLibraryStatsCacheStore.getState().invalidateFolderStats(folderId);
      }
    } catch (error) {
      console.error('Failed to move text to folder:', error);
      throw error; // Let the caller handle the error
    }
  },

  moveFolder: async (folderId: string, parentId: string | null) => {
    try {
      await api.folders.moveFolder(folderId, parentId);
      const tree = await api.folders.getAll();
      set({ folders: tree });
      // Invalidate cache for moved folder and both old and new parent folders
      useLibraryStatsCacheStore.getState().invalidateFolderStats(folderId);
      if (parentId) {
        useLibraryStatsCacheStore.getState().invalidateFolderStats(parentId);
      }
    } catch (error) {
      console.error('Failed to move folder:', error);
      throw error;
    }
  },

  renameText: async (id: number, title: string) => {
    try {
      await api.texts.rename(id, title);
      set((state) => ({
        texts: state.texts.map((text) =>
          text.id === id ? { ...text, title, updatedAt: new Date().toISOString() } : text
        ),
      }));
      // Invalidate cache for this text
      useLibraryStatsCacheStore.getState().invalidateTextStats(id);
    } catch (error) {
      console.error('Failed to rename text:', error);
      throw error; // Let the caller handle the error
    }
  },

  deleteText: async (id: number) => {
    try {
      await api.texts.delete(id);
      set((state) => ({
        texts: state.texts.filter((text) => text.id !== id),
      }));
      // Invalidate cache for deleted text
      useLibraryStatsCacheStore.getState().invalidateTextStats(id);
    } catch (error) {
      console.error('Failed to delete text:', error);
      throw error; // Let the caller handle the error
    }
  },

  setPaneSize: (left: number, _right: number) => {
    const clampedLeft = Math.max(25, Math.min(75, left));
    const clampedRight = 100 - clampedLeft;
    set({ paneSizes: { left: clampedLeft, right: clampedRight } });
  },

  toggleSyncSidebarSelection: () => {
    set((state) => ({ syncSidebarSelection: !state.syncSidebarSelection }));
  },

  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode });
  },

  setCurrentFolder: (folderId: string | null) => {
    set({ currentFolderId: folderId });
  },

  setSortColumn: (column: SortColumn, direction?: SortDirection) => {
    set((state) => {
      if (direction !== undefined) {
        return { sortColumn: column, sortDirection: direction };
      }
      if (state.sortColumn === column) {
        return { sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc' };
      }
      return { sortColumn: column, sortDirection: 'asc' };
    });
  },

  toggleInfoViewCollapsed: () => {
    set((state) => ({ isInfoViewCollapsed: !state.isInfoViewCollapsed }));
  },

  setFocusedItem: (itemId: string | null) => {
    set({ focusedItemId: itemId });
  },

  focusNextItem: (direction: 'up' | 'down' | 'left' | 'right') => {
    set((state) => {
      const items = state.getFlattenedItems();
      if (items.length === 0) return {};

      // If no focused item, focus first item
      if (!state.focusedItemId) {
        return { focusedItemId: items[0] };
      }

      const currentIndex = items.findIndex(id => id === state.focusedItemId);
      if (currentIndex === -1) {
        return { focusedItemId: items[0] };
      }

      let newIndex = currentIndex;

      // Handle navigation based on view mode
      if (state.viewMode === 'tree' || state.viewMode === 'list') {
        // 1D navigation
        if (direction === 'up') {
          newIndex = Math.max(0, currentIndex - 1);
        } else if (direction === 'down') {
          newIndex = Math.min(items.length - 1, currentIndex + 1);
        }
        // Left/Right handled separately for tree view (expand/collapse)
      } else if (state.viewMode === 'icon') {
        // 2D grid navigation
        const cols = state.gridColumns;

        switch (direction) {
          case 'left':
            newIndex = currentIndex - 1;
            // Wrap to previous row end
            if (newIndex < 0) {
              newIndex = items.length - 1;
            }
            break;
          case 'right':
            newIndex = currentIndex + 1;
            // Wrap to next row start
            if (newIndex >= items.length) {
              newIndex = 0;
            }
            break;
          case 'up':
            newIndex = currentIndex - cols;
            if (newIndex < 0) {
              // Wrap to bottom, same column
              const col = currentIndex % cols;
              const lastFullRow = Math.floor((items.length - 1) / cols) * cols;
              newIndex = lastFullRow + col;
              if (newIndex >= items.length) {
                newIndex = items.length - 1;
              }
            }
            break;
          case 'down':
            newIndex = currentIndex + cols;
            if (newIndex >= items.length) {
              // Wrap to top, same column
              const col = currentIndex % cols;
              newIndex = col;
            }
            break;
        }
      }

      return { focusedItemId: items[newIndex] };
    });
  },

  focusFirstItem: () => {
    set((state) => {
      const items = state.getFlattenedItems();
      return { focusedItemId: items.length > 0 ? items[0] : null };
    });
  },

  focusLastItem: () => {
    set((state) => {
      const items = state.getFlattenedItems();
      return { focusedItemId: items.length > 0 ? items[items.length - 1] : null };
    });
  },

  setGridColumns: (columns: number) => {
    set({ gridColumns: columns });
  },

  getFlattenedItems: () => {
    const state = get();

    if (state.viewMode === 'tree') {
      // Tree view: use flattened visible nodes
      const tree = buildTree(state.folders, state.texts);
      const flatNodes = getFlattenedVisibleNodes(tree, state.libraryExpandedFolderIds);
      return flatNodes.map(n => n.id);
    } else {
      // Icon/List view: items in current folder only
      const currentFolderId = state.currentFolderId;
      const foldersInView = state.folders
        .filter(f => f.parentId === currentFolderId)
        .map(f => f.id);
      const textsInView = state.texts
        .filter(t => (t.folderId ?? null) === currentFolderId)
        .map(t => `text-${t.id}`);
      return [...foldersInView, ...textsInView];
    }
  },
    }),
    {
      name: 'trivium-library-storage',
      partialize: (state) => ({
        paneSizes: state.paneSizes,
        viewMode: state.viewMode,
        currentFolderId: state.currentFolderId,
        sortColumn: state.sortColumn,
        sortDirection: state.sortDirection,
        syncSidebarSelection: state.syncSidebarSelection,
        libraryExpandedFolderIds: state.libraryExpandedFolderIds,
        isInfoViewCollapsed: state.isInfoViewCollapsed
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Reconstruct Sets from arrays
          if (parsed.state?.libraryExpandedFolderIds) {
            parsed.state.libraryExpandedFolderIds = new Set(parsed.state.libraryExpandedFolderIds);
          }
          return parsed;
        },
        setItem: (name, value) => {
          // Convert Sets to arrays for JSON serialization
          const toStore = {
            ...value,
            state: {
              ...value.state,
              libraryExpandedFolderIds: value.state?.libraryExpandedFolderIds
                ? Array.from(value.state.libraryExpandedFolderIds)
                : []
            }
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
