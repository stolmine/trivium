import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { FileText, Folder, Search } from 'lucide-react';
import { useLibraryStore, type SortOption } from '../../stores/library';
import { useLibrarySearchStore } from '../../lib/stores/librarySearch';
import { buildTree, isFolderDescendant } from '../../lib/tree-utils';
import { FolderNode } from './FolderNode';
import { TextNode } from './TextNode';
import type { Text } from '../../lib/types/article';
import type { TreeNode } from '../../lib/types/folder';

interface LibraryTreeProps {
  collapsed?: boolean;
}

const sortTexts = (texts: Text[], sortBy: SortOption): Text[] => {
  const textsCopy = [...texts];

  switch (sortBy) {
    case 'name-asc':
      return textsCopy.sort((a, b) => a.title.localeCompare(b.title));
    case 'name-desc':
      return textsCopy.sort((a, b) => b.title.localeCompare(a.title));
    case 'date-newest':
      return textsCopy.sort((a, b) => new Date(b.ingestedAt).getTime() - new Date(a.ingestedAt).getTime());
    case 'date-oldest':
      return textsCopy.sort((a, b) => new Date(a.ingestedAt).getTime() - new Date(b.ingestedAt).getTime());
    case 'content-length':
      return textsCopy.sort((a, b) => b.contentLength - a.contentLength);
    default:
      return textsCopy;
  }
};

const filterTreeByMatches = (
  nodes: TreeNode[],
  matchedTextIds: number[],
  matchedFolderIds: string[]
): TreeNode[] => {
  const textIdSet = new Set(matchedTextIds);
  const folderIdSet = new Set(matchedFolderIds);

  const filterNode = (node: TreeNode): TreeNode | null => {
    if (node.type === 'text') {
      const text = node.data as Text;
      return textIdSet.has(text.id) ? node : null;
    }

    if (node.type === 'folder') {
      const filteredChildren = node.children
        .map(filterNode)
        .filter((child): child is TreeNode => child !== null);

      const folderMatches = folderIdSet.has(node.id);
      const hasMatchingChildren = filteredChildren.length > 0;

      if (folderMatches || hasMatchingChildren) {
        return {
          ...node,
          children: filteredChildren
        };
      }

      return null;
    }

    return null;
  };

  return nodes
    .map(filterNode)
    .filter((node): node is TreeNode => node !== null);
};

export function LibraryTree({ collapsed = false }: LibraryTreeProps) {
  const { folders, texts, isLoading, error, sortBy, loadLibrary, moveTextToFolder, moveFolder, expandedFolderIds, toggleFolder } = useLibraryStore();
  const { isOpen, query, matchedTextIds, matchedFolderIds, currentMatchIndex } = useLibrarySearchStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const sortedTexts = useMemo(() => sortTexts(texts, sortBy), [texts, sortBy]);
  const tree = useMemo(() => buildTree(folders, sortedTexts), [folders, sortedTexts]);

  const isSearchActive = isOpen && query.trim().length > 0;

  const filteredTree = useMemo(() => {
    if (!isSearchActive) {
      return tree;
    }
    return filterTreeByMatches(tree, matchedTextIds, matchedFolderIds);
  }, [tree, isSearchActive, matchedTextIds, matchedFolderIds]);

  useEffect(() => {
    if (isSearchActive && filteredTree.length > 0) {
      const foldersToExpand = new Set<string>();

      const collectFolderIds = (nodes: TreeNode[]) => {
        for (const node of nodes) {
          if (node.type === 'folder') {
            foldersToExpand.add(node.id);
            collectFolderIds(node.children);
          }
        }
      };

      collectFolderIds(filteredTree);

      foldersToExpand.forEach((folderId) => {
        if (!expandedFolderIds.has(folderId)) {
          toggleFolder(folderId);
        }
      });
    }
  }, [isSearchActive, filteredTree, expandedFolderIds, toggleFolder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const draggedData = active.data.current;
    const droppedData = over.data.current;

    if (!draggedData) return;

    if (draggedData.type === 'text') {
      if (droppedData && droppedData.type === 'folder') {
        const text = draggedData.text as Text;
        const folderId = droppedData.folder.id;
        moveTextToFolder(text.id, folderId);
      } else if (over.id === 'root-drop-zone') {
        const text = draggedData.text as Text;
        moveTextToFolder(text.id, null);
      }
    }

    if (draggedData.type === 'folder') {
      const folder = draggedData.folder;

      if (droppedData && droppedData.type === 'folder') {
        const parentId = droppedData.folder.id;

        if (!isFolderDescendant(folders, parentId, folder.id)) {
          moveFolder(folder.id, parentId);
        }
      } else if (over.id === 'root-drop-zone') {
        moveFolder(folder.id, null);
      }
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Loading library...
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-destructive">
        Error loading library
      </div>
    );
  }

  if (filteredTree.length === 0) {
    if (isSearchActive) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Search className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">No matches found</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different search query</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">No texts or folders yet</p>
        <p className="text-xs text-muted-foreground mt-1">Import texts to get started</p>
      </div>
    );
  }

  const highlightQuery = isSearchActive ? query : null;

  // Get the currently selected text ID based on currentMatchIndex
  const selectedTextId = isSearchActive && matchedTextIds.length > 0 && currentMatchIndex < matchedTextIds.length
    ? matchedTextIds[currentMatchIndex]
    : null;

  if (collapsed) {
    return (
      <div className="space-y-1 px-2">
        {filteredTree.map((node) => {
          if (node.type === 'folder') {
            return <FolderNode key={node.id} node={node} depth={0} collapsed={true} highlightQuery={highlightQuery} />;
          } else {
            const text = node.data as Text;
            return <TextNode key={node.id} text={text} depth={0} collapsed={true} highlightQuery={highlightQuery} isSearchSelected={selectedTextId === text.id} />;
          }
        })}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={(e) => {
        handleDragEnd(e);
        setActiveId(null);
      }}
    >
      <div className="space-y-1 px-2">
        {filteredTree.map((node) => {
          if (node.type === 'folder') {
            return <FolderNode key={node.id} node={node} depth={0} highlightQuery={highlightQuery} selectedTextId={selectedTextId} />;
          } else {
            const text = node.data as Text;
            return <TextNode key={node.id} text={text} depth={0} highlightQuery={highlightQuery} isSearchSelected={selectedTextId === text.id} />;
          }
        })}
      </div>
      <DragOverlay>
        {activeId ? (
          <div className="bg-sidebar-accent text-sidebar-accent-foreground px-3 py-2 rounded-md shadow-lg text-sm flex items-center gap-2">
            {String(activeId).startsWith('folder-drag-') ? (
              <>
                <Folder className="h-4 w-4" />
                <span>Moving folder...</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>Moving text...</span>
              </>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
