import { create } from 'zustand';
import { api } from '../lib/utils/tauri';
import type { Folder } from '../lib/types/folder';
import type { Text } from '../lib/types/article';
import { buildTree, getFlattenedVisibleNodes, getNodeById } from '../lib/tree-utils';

export type SortOption = 'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest' | 'content-length';

interface LibraryState {
  folders: Folder[];
  texts: Text[];
  expandedFolderIds: Set<string>;
  selectedItemId: string | null;
  sortBy: SortOption;
  isLoading: boolean;
  error: string | null;

  loadLibrary: () => Promise<void>;
  toggleFolder: (folderId: string) => void;
  expandAllFolders: () => void;
  collapseAllFolders: () => void;
  selectItem: (itemId: string | null) => void;
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
}

export const useLibraryStore = create<LibraryState>((set) => ({
  folders: [],
  texts: [],
  expandedFolderIds: new Set<string>(),
  selectedItemId: null,
  sortBy: 'date-newest',
  isLoading: false,
  error: null,

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

  expandAllFolders: () => {
    set((state) => {
      const allFolderIds = new Set(state.folders.map(f => f.id));
      return { expandedFolderIds: allFolderIds };
    });
  },

  collapseAllFolders: () => {
    set({ expandedFolderIds: new Set() });
  },

  selectItem: (itemId: string | null) => {
    set({ selectedItemId: itemId });
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
      }));
    } catch (error) {
      console.error('Failed to delete folder:', error);
      throw error; // Let the caller handle the error
    }
  },

  moveTextToFolder: async (textId: number, folderId: string | null) => {
    try {
      await api.folders.moveText(textId, folderId);
      set((state) => ({
        texts: state.texts.map((text) =>
          text.id === textId ? { ...text, folderId } : text
        ),
      }));
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
    } catch (error) {
      console.error('Failed to delete text:', error);
      throw error; // Let the caller handle the error
    }
  },
}));
