import { useEffect, useMemo, useState, useRef } from 'react';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin, closestCenter, MeasuringStrategy, type CollisionDetection } from '@dnd-kit/core';
import { FileText, Folder, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore, type SortOption } from '../../stores/library';
import { useLibrarySearchStore } from '../../lib/stores/librarySearch';
import { useFocusContextStore, shouldTrackFocus } from '../../stores/focusContext';
import { buildTree, isFolderDescendant, getNodeById } from '../../lib/tree-utils';
import { cn } from '../../lib/utils';
import { FolderNode } from './FolderNode';
import { TextNode } from './TextNode';
import { RootDropZone } from './RootDropZone';
import type { Text } from '../../lib/types/article';
import type { TreeNode } from '../../lib/types/folder';

interface LibraryTreeProps {
  collapsed?: boolean;
  context?: 'sidebar' | 'library';
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

export function LibraryTree({ collapsed = false, context = 'sidebar' }: LibraryTreeProps) {
  const { folders, texts, isLoading, error, sortBy, loadLibrary, moveTextToFolder, moveFolder, selectedItemId, selectNextItem, selectPreviousItem, expandSelectedFolder, collapseSelectedFolder } = useLibraryStore();
  const expandedFolderIds = useLibraryStore((state) =>
    context === 'library' ? state.libraryExpandedFolderIds : state.expandedFolderIds
  );
  const toggleFolder = useLibraryStore((state) =>
    context === 'library' ? state.toggleLibraryFolder : state.toggleFolder
  );
  const searchContext = context === 'library' ? 'library' : 'sidebar';
  const searchState = useLibrarySearchStore((state) => state[searchContext]);
  const { isOpen, query, matchedTextIds, matchedFolderIds, currentMatchIndex } = searchState;
  const { setActiveContext, isContextActive } = useFocusContextStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const focusContext = context === 'sidebar' ? 'sidebar' : 'library-left';
  const isActive = isContextActive(focusContext);

  // Only show focus tracking UI when on library page
  // When not on library page, focus outlines should not appear anywhere (including sidebar)
  const trackingEnabled = shouldTrackFocus();
  const showFocusUI = trackingEnabled && isActive;

  const handleTreeInteraction = () => {
    // Only set active context if focus tracking is enabled
    if (trackingEnabled) {
      setActiveContext(focusContext);
    }
    if (treeContainerRef.current && !collapsed) {
      treeContainerRef.current.focus();
    }
  };

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Combined collision detection for better drop zone detection
  const customCollisionDetection: CollisionDetection = (args) => {
    // First try pointer-based detection
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    // Fallback to closest center for more forgiving detection
    return closestCenter(args);
  };

  // Measuring configuration for conditionally rendered droppables
  const measuringConfig = {
    droppable: {
      strategy: MeasuringStrategy.Always,
    },
  };

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

  useEffect(() => {
    const container = treeContainerRef.current;
    if (!container || collapsed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement !== container) return;

      if (isSearchActive) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectNextItem();
          break;

        case 'ArrowUp':
          e.preventDefault();
          selectPreviousItem();
          break;

        case 'ArrowRight':
          e.preventDefault();
          expandSelectedFolder();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          collapseSelectedFolder();
          break;

        case 'Enter':
          e.preventDefault();
          if (selectedItemId) {
            const selectedNode = getNodeById(filteredTree, selectedItemId);

            if (selectedNode?.type === 'text') {
              const text = selectedNode.data as Text;
              navigate(`/read/${text.id}`);
            } else if (selectedNode?.type === 'folder') {
              toggleFolder(selectedItemId);
            }
          }
          break;
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [
    collapsed,
    isSearchActive,
    selectedItemId,
    selectNextItem,
    selectPreviousItem,
    expandSelectedFolder,
    collapseSelectedFolder,
    toggleFolder,
    navigate,
    filteredTree,
  ]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    console.log('[DragEnd] Event:', {
      activeId: active.id,
      overId: over?.id,
      activeData: active.data.current,
      overData: over?.data.current,
    });

    if (!over) return;

    const draggedData = active.data.current;
    const droppedData = over.data.current;

    if (!draggedData) return;

    if (over.id === 'root-drop-zone') {
      console.log('[DragEnd] Root drop zone detected!', {
        draggedType: draggedData.type,
        draggedData,
      });

      if (draggedData.type === 'text') {
        const text = draggedData.text as Text;
        console.log('[DragEnd] Moving text to root:', text.id);
        moveTextToFolder(text.id, null);
      } else if (draggedData.type === 'folder') {
        const folder = draggedData.folder;
        console.log('[DragEnd] Moving folder to root:', folder.id);
        moveFolder(folder.id, null);
      }
      return;
    }

    if (draggedData.type === 'text' && droppedData && droppedData.type === 'folder') {
      const text = draggedData.text as Text;
      const folderId = droppedData.folder.id;
      moveTextToFolder(text.id, folderId);
    }

    if (draggedData.type === 'folder' && droppedData && droppedData.type === 'folder') {
      const folder = draggedData.folder;
      const parentId = droppedData.folder.id;

      if (!isFolderDescendant(folders, parentId, folder.id)) {
        moveFolder(folder.id, parentId);
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
        <p className="text-xs text-muted-foreground mt-1">Ingest texts to get started</p>
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
            return <FolderNode key={node.id} node={node} depth={0} collapsed={true} highlightQuery={highlightQuery} context={context} />;
          } else {
            const text = node.data as Text;
            return <TextNode key={node.id} text={text} depth={0} collapsed={true} highlightQuery={highlightQuery} isSearchSelected={selectedTextId === text.id} context={context} />;
          }
        })}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      measuring={measuringConfig}
      onDragStart={(e) => {
        setActiveId(String(e.active.id));
        handleTreeInteraction();
      }}
      onDragEnd={(e) => {
        handleDragEnd(e);
        setActiveId(null);
      }}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {context === 'library' && <RootDropZone />}
        <div
          ref={treeContainerRef}
          tabIndex={collapsed ? -1 : 0}
          onClick={handleTreeInteraction}
          onFocus={handleTreeInteraction}
          className={cn(
            'space-y-1 px-2 outline-none focus:outline-none overflow-y-auto flex-1 min-h-0',
            // Only apply focus-related classes when focus tracking is enabled
            trackingEnabled && 'focusable-pane',
            trackingEnabled && context === 'sidebar' && 'sidebar-pane',
            trackingEnabled && context === 'library' && 'library-left-pane',
            trackingEnabled && showFocusUI && !collapsed ? 'focusable-pane--focused' : trackingEnabled && 'focusable-pane--unfocused',
            trackingEnabled && showFocusUI && !collapsed && context === 'sidebar' && 'sidebar-pane--focused',
            trackingEnabled && showFocusUI && !collapsed && context === 'library' && 'library-left-pane--focused'
          )}
          role="tree"
          aria-label="Library navigation tree"
        >
          {filteredTree.map((node) => {
            if (node.type === 'folder') {
              return <FolderNode key={node.id} node={node} depth={0} highlightQuery={highlightQuery} selectedTextId={selectedTextId} context={context} />;
            } else {
              const text = node.data as Text;
              return <TextNode key={node.id} text={text} depth={0} highlightQuery={highlightQuery} isSearchSelected={selectedTextId === text.id} context={context} />;
            }
          })}
        </div>
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
