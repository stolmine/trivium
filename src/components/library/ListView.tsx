import React, { useMemo, useState, useEffect } from 'react';
import { Folder, FileText, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin, closestCenter, MeasuringStrategy, type CollisionDetection, useDraggable, useDroppable } from '@dnd-kit/core';
import { useLibraryStore, type SortColumn } from '../../stores/library';
import { useLibraryStatsCacheStore } from '../../stores/libraryStatsCache';
import { cn } from '../../lib/utils';
import { isFolderDescendant } from '../../lib/tree-utils';
import { FolderContextMenu } from './FolderContextMenu';
import { TextContextMenu } from './TextContextMenu';
import type { Text } from '../../lib/types/article';
import type { Folder as FolderType } from '../../lib/types/folder';

interface ListItem {
  id: string;
  type: 'folder' | 'text';
  name: string;
  size: number | null;
  modified: Date;
  progress: number | null;
  flashcards: number | null;
  data: FolderType | Text;
}

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatSize(size: number | null): string {
  if (size === null) return '—';
  if (size < 1000) return `${size} chars`;
  if (size < 1000000) return `${Math.round(size / 1000)}k chars`;
  return `${Math.round(size / 1000000)}M chars`;
}

function formatProgress(progress: number | null): string {
  if (progress === null) return '—';
  return `${Math.round(progress)}%`;
}

function formatFlashcards(count: number | null): string {
  if (count === null) return '—';
  return count.toString();
}

interface ColumnHeaderProps {
  column: SortColumn;
  label: string;
  currentSortColumn: SortColumn;
  currentSortDirection: 'asc' | 'desc';
  onSort: (column: SortColumn) => void;
}

function ColumnHeader({
  column,
  label,
  currentSortColumn,
  currentSortDirection,
  onSort,
}: ColumnHeaderProps) {
  const isSorted = currentSortColumn === column;

  return (
    <th
      onClick={() => onSort(column)}
      className="px-4 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:bg-sidebar-accent/30 transition-colors select-none"
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isSorted && (
          currentSortDirection === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        )}
      </div>
    </th>
  );
}

function RootDropZoneRow() {
  const { setNodeRef, isOver } = useDroppable({
    id: 'root-drop-zone',
    data: {
      type: 'root',
      accepts: ['folder', 'text']
    },
  });

  return (
    <tr
      ref={setNodeRef}
      className={cn(
        'sticky top-0 z-10 border-2 border-dashed transition-colors',
        'bg-background dark:bg-background',
        isOver
          ? 'border-sidebar-primary bg-sidebar-primary/10'
          : 'border-border'
      )}
    >
      <td colSpan={5} className="px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Folder className="h-4 w-4" />
          <span>Drop here to move to root directory</span>
        </div>
      </td>
    </tr>
  );
}

interface ListRowProps {
  item: ListItem;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
}

const ListRow = React.memo(function ListRow({ item, onClick, onDoubleClick }: ListRowProps) {
  // Optimized selector - only re-render when THIS item's selection state changes
  const isSelected = useLibraryStore((state) => state.librarySelectedItemIds.has(item.id));
  const Icon = item.type === 'folder' ? Folder : FileText;

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: item.type === 'folder' ? item.id : `droppable-${item.id}`,
    data: {
      type: 'folder',
      folder: item.data,
    },
    disabled: item.type !== 'folder',
  });

  const draggable = useDraggable({
    id: item.type === 'folder' ? `folder-drag-${item.id}` : item.id,
    data: {
      type: item.type,
      [item.type]: item.data,
    },
  });

  const listRowContent = (
    <tr
      ref={(node) => {
        if (item.type === 'folder') {
          setDroppableRef(node);
        }
        draggable.setNodeRef(node);
      }}
      {...draggable.attributes}
      {...draggable.listeners}
      style={
        draggable.transform
          ? {
              transform: `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`,
              contain: 'layout style paint',
            }
          : {
              contain: 'layout style paint',
            }
      }
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        'cursor-pointer border-b border-sidebar-border/50 transition-none',
        'hover:bg-sidebar-accent/50',
        'will-change-[background-color]',
        isSelected && 'bg-sidebar-primary/20',
        isOver && item.type === 'folder' && 'bg-sidebar-primary/10 border-l-4 border-sidebar-primary',
        draggable.isDragging && 'opacity-50'
      )}
    >
      <td className="px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{item.name}</span>
        </div>
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground">
        {formatSize(item.size)}
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground">
        {formatDate(item.modified)}
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground">
        {formatProgress(item.progress)}
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground">
        {formatFlashcards(item.flashcards)}
      </td>
    </tr>
  );

  if (item.type === 'folder') {
    const folder = item.data as FolderType;
    return (
      <FolderContextMenu folderId={folder.id} folderName={folder.name}>
        {listRowContent}
      </FolderContextMenu>
    );
  } else {
    const text = item.data as Text;
    return (
      <TextContextMenu textId={text.id} textTitle={text.title}>
        {listRowContent}
      </TextContextMenu>
    );
  }
});

export function ListView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    folders,
    texts,
    currentFolderId,
    setCurrentFolder,
    selectLibraryItemMulti,
    sortColumn,
    sortDirection,
    setSortColumn,
    moveTextToFolder,
    moveFolder,
  } = useLibraryStore();
  const {
    getTextStats,
    getFolderStats,
    loadMultipleTextStats,
    loadMultipleFolderStats,
    textStats: textStatsCache,
    folderStats: folderStatsCache,
  } = useLibraryStatsCacheStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sync URL param with store state on mount and when URL changes
  useEffect(() => {
    const folderParam = searchParams.get('folder');
    if (folderParam !== currentFolderId) {
      setCurrentFolder(folderParam);
    }
  }, [searchParams, setCurrentFolder]);

  // Load statistics for visible items
  useEffect(() => {
    const filteredFolders = folders.filter(
      (folder) => folder.parentId === currentFolderId
    );
    const filteredTexts = texts.filter(
      (text) => (text.folderId ?? null) === currentFolderId
    );

    // Load stats in background (they'll be cached)
    const textIds = filteredTexts.map((text) => text.id);
    const folderIds = filteredFolders.map((folder) => folder.id);

    if (textIds.length > 0) {
      loadMultipleTextStats(textIds);
    }
    if (folderIds.length > 0) {
      loadMultipleFolderStats(folderIds);
    }
  }, [folders, texts, currentFolderId, loadMultipleTextStats, loadMultipleFolderStats]);

  // Helper to navigate to a folder via URL
  const navigateToFolder = (folderId: string | null) => {
    if (folderId === null) {
      setSearchParams({});
    } else {
      setSearchParams({ folder: folderId });
    }
  };

  // Get parent folder for "Up" button
  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;
  const parentFolderId = currentFolder?.parentId ?? null;

  // Keyboard shortcut: Cmd/Ctrl+Up to navigate up one level
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Up (Mac) or Ctrl+Up (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
        e.preventDefault();
        // Navigate up if not at root
        if (currentFolderId !== null) {
          navigateToFolder(parentFolderId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentFolderId, parentFolderId]);

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

  const items = useMemo(() => {
    const filteredFolders = folders.filter(
      (folder) => folder.parentId === currentFolderId
    );
    const filteredTexts = texts.filter(
      (text) => (text.folderId ?? null) === currentFolderId
    );

    const folderItems: ListItem[] = filteredFolders.map((folder) => {
      const stats = getFolderStats(folder.id);
      return {
        id: folder.id,
        type: 'folder' as const,
        name: folder.name,
        size: stats ? stats.totalContentLength : null,
        modified: new Date(folder.updatedAt),
        progress: stats ? stats.averageProgress : null,
        flashcards: stats ? stats.totalFlashcards : null,
        data: folder,
      };
    });

    const textItems: ListItem[] = filteredTexts.map((text) => {
      const stats = getTextStats(text.id);
      return {
        id: `text-${text.id}`,
        type: 'text' as const,
        name: text.title,
        size: text.contentLength,
        modified: new Date(text.updatedAt),
        progress: stats ? stats.readPercentage : null,
        flashcards: stats ? stats.totalFlashcards : null,
        data: text,
      };
    });

    return [...folderItems, ...textItems];
  }, [folders, texts, currentFolderId, getTextStats, getFolderStats, textStatsCache, folderStatsCache]);

  const sortedItems = useMemo(() => {
    const sorted = [...items];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          if (a.size === null && b.size === null) comparison = 0;
          else if (a.size === null) comparison = 1;
          else if (b.size === null) comparison = -1;
          else comparison = a.size - b.size;
          break;
        case 'modified':
          comparison = a.modified.getTime() - b.modified.getTime();
          break;
        case 'progress':
          if (a.progress === null && b.progress === null) comparison = 0;
          else if (a.progress === null) comparison = 1;
          else if (b.progress === null) comparison = -1;
          else comparison = a.progress - b.progress;
          break;
        case 'flashcards':
          if (a.flashcards === null && b.flashcards === null) comparison = 0;
          else if (a.flashcards === null) comparison = 1;
          else if (b.flashcards === null) comparison = -1;
          else comparison = a.flashcards - b.flashcards;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [items, sortColumn, sortDirection]);

  const handleRowClick = (id: string, e: React.MouseEvent) => {
    const visibleItemIds = sortedItems.map(item => item.id);

    if (e.ctrlKey || e.metaKey) {
      selectLibraryItemMulti(id, 'toggle');
    } else if (e.shiftKey) {
      selectLibraryItemMulti(id, 'range', visibleItemIds);
    } else {
      selectLibraryItemMulti(id, 'single');
    }
  };

  const handleRowDoubleClick = (item: ListItem) => {
    if (item.type === 'folder') {
      navigateToFolder(item.id);
    } else {
      const textId = parseInt(item.id.replace('text-', ''));
      navigate(`/read/${textId}`);
    }
  };

  const handleSort = (column: SortColumn) => {
    setSortColumn(column);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    console.log('[ListView DragEnd] Event:', {
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
      console.log('[ListView DragEnd] Root drop zone detected!', {
        draggedType: draggedData.type,
        draggedData,
      });

      if (draggedData.type === 'text') {
        const text = draggedData.text as Text;
        console.log('[ListView DragEnd] Moving text to root:', text.id);
        moveTextToFolder(text.id, null);
      } else if (draggedData.type === 'folder') {
        const folder = draggedData.folder;
        console.log('[ListView DragEnd] Moving folder to root:', folder.id);
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

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center flex-1">
        <FileText className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">
          {currentFolderId ? 'This folder is empty' : 'No items in library'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {currentFolderId ? 'Add texts or folders to get started' : 'Ingest texts to get started'}
        </p>
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
      }}
      onDragEnd={(e) => {
        handleDragEnd(e);
        setActiveId(null);
      }}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-sidebar border-b border-sidebar-border z-10">
              <tr>
                <ColumnHeader
                  column="name"
                  label="Name"
                  currentSortColumn={sortColumn}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <ColumnHeader
                  column="size"
                  label="Size"
                  currentSortColumn={sortColumn}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <ColumnHeader
                  column="modified"
                  label="Modified"
                  currentSortColumn={sortColumn}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <ColumnHeader
                  column="progress"
                  label="Progress"
                  currentSortColumn={sortColumn}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <ColumnHeader
                  column="flashcards"
                  label="Flashcards"
                  currentSortColumn={sortColumn}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody>
              {currentFolderId !== null && <RootDropZoneRow />}
              {sortedItems.map((item) => (
                <ListRow
                  key={item.id}
                  item={item}
                  onClick={(e) => handleRowClick(item.id, e)}
                  onDoubleClick={() => handleRowDoubleClick(item)}
                />
              ))}
            </tbody>
          </table>
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
