import { useRef, useEffect } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { cn } from '../../lib/utils';
import { useLibraryStore } from '../../stores/library';
import { FolderContextMenu } from './FolderContextMenu';
import { TextNode } from './TextNode';
import { useFolderProgress } from '../../lib/hooks/useTextProgress';
import type { TreeNode } from '../../lib/types/folder';
import type { Folder as FolderType } from '../../lib/types/folder';
import type { Text } from '../../lib/types/article';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string, query: string | null): React.ReactNode {
  if (!query || query.trim().length === 0) {
    return text;
  }

  try {
    const escapedQuery = escapeRegex(query);
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <mark key={index} style={{ backgroundColor: '#fef08a', color: 'inherit' }}>
            {part}
          </mark>
        );
      }
      return part;
    });
  } catch (e) {
    return text;
  }
}

interface FolderNodeProps {
  node: TreeNode;
  depth: number;
  collapsed?: boolean;
  highlightQuery?: string | null;
  selectedTextId?: number | null;
  context?: 'sidebar' | 'library';
}

export function FolderNode({ node, depth, collapsed = false, highlightQuery = null, selectedTextId = null, context = 'sidebar' }: FolderNodeProps) {
  const expandedFolderIds = useLibraryStore((state) =>
    context === 'library' ? state.libraryExpandedFolderIds : state.expandedFolderIds
  );
  const selectedItemId = useLibraryStore((state) =>
    context === 'library' ? state.librarySelectedItemId : state.selectedItemId
  );
  const selectedItemIds = useLibraryStore((state) =>
    context === 'library' ? state.librarySelectedItemIds : state.selectedItemIds
  );
  const toggleFolder = useLibraryStore((state) =>
    context === 'library' ? state.toggleLibraryFolder : state.toggleFolder
  );
  const selectItem = useLibraryStore((state) =>
    context === 'library' ? state.selectLibraryItem : state.selectItem
  );
  const selectItemMulti = useLibraryStore((state) =>
    context === 'library' ? state.selectLibraryItemMulti : state.selectItemMulti
  );

  const folder = node.data as FolderType;
  const isExpanded = expandedFolderIds.has(folder.id);
  const isSelected = selectedItemId === folder.id;
  const isMultiSelected = selectedItemIds.has(folder.id);
  const { progress } = useFolderProgress(folder.id);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && nodeRef.current) {
      nodeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [isSelected]);

  const { setNodeRef, isOver } = useDroppable({
    id: folder.id,
    data: {
      type: 'folder',
      folder,
    },
  });

  const draggable = useDraggable({
    id: `folder-drag-${folder.id}`,
    data: {
      type: 'folder',
      folder,
    },
  });

  const hasChildren = node.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    if (context === 'sidebar') {
      selectItem(folder.id);
      if (hasChildren) {
        toggleFolder(folder.id);
      }
    } else {
      if (e.ctrlKey || e.metaKey) {
        selectItemMulti(folder.id, 'toggle');
      } else if (e.shiftKey) {
        selectItemMulti(folder.id, 'range');
      } else {
        selectItemMulti(folder.id, 'single');
      }
    }
  };

  const handleDoubleClick = () => {
    if (context === 'library' && hasChildren) {
      toggleFolder(folder.id);
    }
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      toggleFolder(folder.id);
    }
  };

  const indentStyle = collapsed ? {} : { paddingLeft: `${depth * 16 + 8}px` };

  return (
    <div>
      <FolderContextMenu folderId={folder.id} folderName={folder.name}>
        <div
          ref={(node) => {
            setNodeRef(node);
            draggable.setNodeRef(node);
            if (node) {
              (nodeRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }
          }}
          {...draggable.attributes}
          {...draggable.listeners}
          style={{
            ...indentStyle,
            ...(draggable.transform ? {
              transform: `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`,
            } : undefined)
          }}
          className={cn(
            'flex items-center gap-2 h-8 px-2 rounded-md text-sm cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            context === 'library' && isMultiSelected
              ? 'bg-sidebar-primary/20'
              : isSelected
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
            isOver && 'bg-sidebar-primary/10 border-l-4 border-sidebar-primary',
            draggable.isDragging && 'opacity-50'
          )}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          title={collapsed ? folder.name : undefined}
        >
          {!collapsed && hasChildren && (
            <button onClick={handleChevronClick} className="p-0.5">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}

          {!collapsed && !hasChildren && <div className="w-5" />}

          {isExpanded && !collapsed ? (
            <FolderOpen className="h-4 w-4 flex-shrink-0" />
          ) : (
            <Folder className="h-4 w-4 flex-shrink-0" />
          )}

          {!collapsed && (
            <>
              <span className="truncate flex-1" title={folder.name}>
                {highlightText(folder.name, highlightQuery)}
              </span>
              {progress !== null && progress > 0 && (
                <span className="text-xs text-muted-foreground ml-auto pl-2 flex-shrink-0">
                  {Math.round(progress)}%
                </span>
              )}
            </>
          )}
        </div>
      </FolderContextMenu>

      {isExpanded && !collapsed && hasChildren && (
        <div>
          {node.children.map((child) => {
            if (child.type === 'folder') {
              return <FolderNode key={child.id} node={child} depth={depth + 1} highlightQuery={highlightQuery} selectedTextId={selectedTextId} context={context} />;
            } else {
              const text = child.data as Text;
              return (
                <TextNode key={child.id} text={text} depth={depth + 1} highlightQuery={highlightQuery} isSearchSelected={selectedTextId === text.id} context={context} />
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
