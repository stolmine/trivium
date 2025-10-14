export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TreeNode {
  id: string;
  type: 'folder' | 'text';
  data: Folder | any;
  children: TreeNode[];
  depth: number;
}

export interface FolderTreeData {
  folders: Folder[];
  texts: any[];
}
