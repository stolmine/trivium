import { useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { FileText } from 'lucide-react';
import { useLibraryStore } from '../../stores/library';
import { buildTree } from '../../lib/tree-utils';
import { FolderNode } from './FolderNode';
import { TextNode } from './TextNode';
import type { Text } from '../../lib/types/article';

interface LibraryTreeProps {
  collapsed?: boolean;
}

export function LibraryTree({ collapsed = false }: LibraryTreeProps) {
  const { folders, texts, isLoading, error, loadLibrary, moveTextToFolder } = useLibraryStore();

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const draggedData = active.data.current;
    const droppedData = over.data.current;

    if (!draggedData || draggedData.type !== 'text') return;

    if (droppedData && droppedData.type === 'folder') {
      const text = draggedData.text as Text;
      const folderId = droppedData.folder.id;

      moveTextToFolder(text.id, folderId);
    } else if (over.id === 'root-drop-zone') {
      const text = draggedData.text as Text;
      moveTextToFolder(text.id, null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Loading library...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-destructive">
        Error loading library
      </div>
    );
  }

  const tree = buildTree(folders, texts);

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">No texts or folders yet</p>
        <p className="text-xs text-muted-foreground mt-1">Import texts to get started</p>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="space-y-1 px-2">
        {tree.map((node) => {
          if (node.type === 'folder') {
            return <FolderNode key={node.id} node={node} depth={0} collapsed={true} />;
          } else {
            return <TextNode key={node.id} text={node.data as Text} depth={0} collapsed={true} />;
          }
        })}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-1 px-2">
        {tree.map((node) => {
          if (node.type === 'folder') {
            return <FolderNode key={node.id} node={node} depth={0} />;
          } else {
            return <TextNode key={node.id} text={node.data as Text} depth={0} />;
          }
        })}
      </div>
      <DragOverlay>
        <div className="bg-sidebar-accent text-sidebar-accent-foreground px-3 py-2 rounded-md shadow-lg text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>Moving text...</span>
        </div>
      </DragOverlay>
    </DndContext>
  );
}
