import { Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '../../lib/utils';
import { useLibraryStore } from '../../stores/library';
import { shouldReduceMotion } from '../../lib/animations';
import { FolderContextMenu } from './FolderContextMenu';
import { TextNode } from './TextNode';
import { useFolderProgress } from '../../lib/hooks/useTextProgress';
import type { TreeNode } from '../../lib/types/folder';
import type { Folder as FolderType } from '../../lib/types/folder';
import type { Text } from '../../lib/types/article';

interface FolderNodeProps {
  node: TreeNode;
  depth: number;
  collapsed?: boolean;
}

export function FolderNode({ node, depth, collapsed = false }: FolderNodeProps) {
  const { expandedFolderIds, selectedItemId, toggleFolder, selectItem } = useLibraryStore();

  const folder = node.data as FolderType;
  const isExpanded = expandedFolderIds.has(folder.id);
  const isSelected = selectedItemId === folder.id;
  const { progress } = useFolderProgress(folder.id);

  const { setNodeRef, isOver } = useDroppable({
    id: folder.id,
    data: {
      type: 'folder',
      folder,
    },
  });

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFolder(folder.id);
  };

  const handleSelect = () => {
    selectItem(folder.id);
  };

  const indentStyle = collapsed ? {} : { paddingLeft: `${depth * 16 + 8}px` };

  const hasChildren = node.children.length > 0;

  return (
    <div>
      <FolderContextMenu folderId={folder.id} folderName={folder.name}>
        <div
          ref={setNodeRef}
          style={indentStyle}
          className={cn(
            'flex items-center gap-2 h-8 px-2 rounded-md text-sm cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            isSelected
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
            isOver && 'bg-sidebar-primary/10 border-l-4 border-sidebar-primary',
            !shouldReduceMotion() && 'transition-colors duration-150'
          )}
          onClick={handleSelect}
          title={collapsed ? folder.name : undefined}
        >
          {!collapsed && hasChildren && (
            <button
              onClick={handleToggle}
              className="p-0.5 hover:bg-sidebar-accent rounded transition-colors"
              aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
            >
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
                {folder.name}
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
              return <FolderNode key={child.id} node={child} depth={depth + 1} />;
            } else {
              return (
                <TextNode key={child.id} text={child.data as Text} depth={depth + 1} />
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
