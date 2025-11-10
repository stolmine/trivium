import { useMemo, useState, useEffect } from 'react';
import { Folder, FileText } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin, closestCenter, MeasuringStrategy, type CollisionDetection, useDraggable, useDroppable } from '@dnd-kit/core';
import { useLibraryStore } from '../../stores/library';
import { cn } from '../../lib/utils';
import { isFolderDescendant } from '../../lib/tree-utils';
import { RootDropZone } from './RootDropZone';
import { FolderContextMenu } from './FolderContextMenu';
import { TextContextMenu } from './TextContextMenu';
import type { Text } from '../../lib/types/article';
import type { Folder as FolderType } from '../../lib/types/folder';

interface GridItemProps {
  id: string;
  type: 'folder' | 'text';
  name: string;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  data: FolderType | Text;
}

function GridItem({ id, type, name, isSelected, onSelect, onDoubleClick, data }: GridItemProps) {
  const Icon = type === 'folder' ? Folder : FileText;

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: type === 'folder' ? id : `droppable-${id}`,
    data: {
      type: 'folder',
      folder: data,
    },
    disabled: type !== 'folder',
  });

  const draggable = useDraggable({
    id: type === 'folder' ? `folder-drag-${id}` : id,
    data: {
      type: type,
      [type]: data,
    },
  });

  const gridItemContent = (
    <div
      ref={(node) => {
        if (type === 'folder') {
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
            }
          : undefined
      }
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-lg cursor-pointer',
        'hover:bg-sidebar-accent/50',
        isSelected && 'bg-sidebar-primary/20 ring-2 ring-sidebar-primary/50',
        isOver && type === 'folder' && 'bg-sidebar-primary/10 ring-2 ring-sidebar-primary',
        draggable.isDragging && 'opacity-50'
      )}
      title={name}
    >
      <Icon className="h-12 w-12" />
      <span className="text-xs text-center truncate w-full px-1">
        {name}
      </span>
    </div>
  );

  if (type === 'folder') {
    const folder = data as FolderType;
    return (
      <FolderContextMenu folderId={folder.id} folderName={folder.name}>
        {gridItemContent}
      </FolderContextMenu>
    );
  } else {
    const text = data as Text;
    return (
      <TextContextMenu textId={text.id} textTitle={text.title}>
        {gridItemContent}
      </TextContextMenu>
    );
  }
}

export function IconGridView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    folders,
    texts,
    currentFolderId,
    setCurrentFolder,
    librarySelectedItemIds,
    selectLibraryItemMulti,
    clearLibrarySelection,
    moveTextToFolder,
    moveFolder,
  } = useLibraryStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sync URL param with store state on mount and when URL changes
  useEffect(() => {
    const folderParam = searchParams.get('folder');
    if (folderParam !== currentFolderId) {
      setCurrentFolder(folderParam);
    }
  }, [searchParams, setCurrentFolder]);

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

    const folderItems = filteredFolders.map((folder) => ({
      id: folder.id,
      type: 'folder' as const,
      name: folder.name,
      data: folder,
    }));

    const textItems = filteredTexts.map((text) => ({
      id: `text-${text.id}`,
      type: 'text' as const,
      name: text.title,
      data: text,
    }));

    return [...folderItems, ...textItems];
  }, [folders, texts, currentFolderId]);

  const handleItemClick = (id: string, e: React.MouseEvent) => {
    const visibleItemIds = items.map(item => item.id);
    if (e.ctrlKey || e.metaKey) {
      selectLibraryItemMulti(id, 'toggle');
    } else if (e.shiftKey) {
      selectLibraryItemMulti(id, 'range', visibleItemIds);
    } else {
      selectLibraryItemMulti(id, 'single');
    }
  };

  const handleItemDoubleClick = (id: string, type: 'folder' | 'text') => {
    if (type === 'folder') {
      navigateToFolder(id);
    } else {
      const textId = parseInt(id.replace('text-', ''));
      navigate(`/read/${textId}`);
    }
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      clearLibrarySelection();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    console.log('[IconGridView DragEnd] Event:', {
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
      console.log('[IconGridView DragEnd] Root drop zone detected!', {
        draggedType: draggedData.type,
        draggedData,
      });

      if (draggedData.type === 'text') {
        const text = draggedData.text as Text;
        console.log('[IconGridView DragEnd] Moving text to root:', text.id);
        moveTextToFolder(text.id, null);
      } else if (draggedData.type === 'folder') {
        const folder = draggedData.folder;
        console.log('[IconGridView DragEnd] Moving folder to root:', folder.id);
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
        <Folder className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
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
        <div
          className="p-4 overflow-y-auto flex-1"
          onClick={handleContainerClick}
        >
          {/* Root Drop Zone - shown when in a subfolder */}
          {currentFolderId !== null && <RootDropZone />}
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}
          >
            {items.map((item) => (
              <GridItem
                key={item.id}
                id={item.id}
                type={item.type}
                name={item.name}
                isSelected={librarySelectedItemIds.has(item.id)}
                onSelect={(e) => handleItemClick(item.id, e)}
                onDoubleClick={() => handleItemDoubleClick(item.id, item.type)}
                data={item.data}
              />
            ))}
          </div>
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
