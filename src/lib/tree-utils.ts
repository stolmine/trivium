import type { Folder, TreeNode } from './types/folder';
import type { Text } from './types/article';

export function buildTree(folders: Folder[], texts: Text[]): TreeNode[] {
  const folderMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  folders.forEach((folder) => {
    const node: TreeNode = {
      id: folder.id,
      type: 'folder',
      data: folder,
      children: [],
      depth: 0,
    };
    folderMap.set(folder.id, node);
  });

  folders.forEach((folder) => {
    const node = folderMap.get(folder.id);
    if (!node) return;

    if (folder.parentId === null) {
      rootNodes.push(node);
    } else {
      const parentNode = folderMap.get(folder.parentId);
      if (parentNode) {
        node.depth = parentNode.depth + 1;
        parentNode.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }
  });

  texts.forEach((text) => {
    const textNode: TreeNode = {
      id: `text-${text.id}`,
      type: 'text',
      data: text,
      children: [],
      depth: 0,
    };

    if (text.folderId) {
      const parentNode = folderMap.get(text.folderId);
      if (parentNode) {
        textNode.depth = parentNode.depth + 1;
        parentNode.children.push(textNode);
      } else {
        rootNodes.push(textNode);
      }
    } else {
      rootNodes.push(textNode);
    }
  });

  sortTreeNodes(rootNodes);

  return rootNodes;
}

function sortTreeNodes(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }

    if (a.type === 'folder' && b.type === 'folder') {
      return (a.data as Folder).name.localeCompare((b.data as Folder).name);
    }

    if (a.type === 'text' && b.type === 'text') {
      return (a.data as Text).title.localeCompare((b.data as Text).title);
    }

    return 0;
  });

  nodes.forEach((node) => {
    if (node.children.length > 0) {
      sortTreeNodes(node.children);
    }
  });
}

export function findFolderPath(folders: Folder[], folderId: string): string[] {
  const path: string[] = [];
  const folderMap = new Map<string, Folder>();

  folders.forEach((folder) => {
    folderMap.set(folder.id, folder);
  });

  let currentId: string | null = folderId;

  while (currentId !== null) {
    const folder = folderMap.get(currentId);
    if (!folder) break;

    path.unshift(folder.name);
    currentId = folder.parentId;
  }

  return path;
}

export function isFolderDescendant(folders: Folder[], childId: string, ancestorId: string): boolean {
  if (childId === ancestorId) return true;

  const folderMap = new Map<string, Folder>();
  folders.forEach((folder) => {
    folderMap.set(folder.id, folder);
  });

  let currentId: string | null = childId;

  while (currentId !== null) {
    const folder = folderMap.get(currentId);
    if (!folder) break;

    if (folder.parentId === ancestorId) return true;
    currentId = folder.parentId;
  }

  return false;
}

export function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];

  function traverse(node: TreeNode) {
    result.push(node);
    node.children.forEach(traverse);
  }

  nodes.forEach(traverse);
  return result;
}

export function getNodeById(nodes: TreeNode[], nodeId: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;

    if (node.children.length > 0) {
      const found = getNodeById(node.children, nodeId);
      if (found) return found;
    }
  }

  return null;
}
