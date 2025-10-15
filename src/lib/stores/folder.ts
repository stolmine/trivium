import { create } from 'zustand';
import { api } from '../utils/tauri';
import type { Folder } from '../types/folder';

interface FolderNode {
  folder: Folder;
  children: FolderNode[];
}

interface FolderState {
  folderTree: FolderNode[];
  isLoading: boolean;
  error: string | null;
  loadFolderTree: () => Promise<void>;
}

// Helper function to build hierarchical tree from flat folder list
function buildFolderTree(folders: Folder[]): FolderNode[] {
  const folderMap = new Map<string, FolderNode>();
  const rootNodes: FolderNode[] = [];

  // First pass: create all nodes
  folders.forEach((folder) => {
    folderMap.set(folder.id, {
      folder,
      children: [],
    });
  });

  // Second pass: build hierarchy
  folders.forEach((folder) => {
    const node = folderMap.get(folder.id);
    if (!node) return;

    if (folder.parentId === null || folder.parentId === undefined) {
      // Root folder
      rootNodes.push(node);
    } else {
      // Child folder
      const parentNode = folderMap.get(folder.parentId);
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        // Parent not found, treat as root
        rootNodes.push(node);
      }
    }
  });

  return rootNodes;
}

export const useFolderStore = create<FolderState>((set) => ({
  folderTree: [],
  isLoading: false,
  error: null,

  loadFolderTree: async () => {
    set({ isLoading: true, error: null });
    try {
      const folders = await api.folders.getAll();
      const tree = buildFolderTree(folders);
      set({ folderTree: tree, isLoading: false });
    } catch (error) {
      console.error('Failed to load folder tree:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load folder tree',
        isLoading: false
      });
    }
  },
}));
