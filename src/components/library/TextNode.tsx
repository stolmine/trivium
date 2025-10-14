import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '../../lib/utils';
import { useLibraryStore } from '../../stores/library';
import { shouldReduceMotion } from '../../lib/animations';
import type { Text } from '../../lib/types/article';

interface TextNodeProps {
  text: Text;
  depth: number;
  collapsed?: boolean;
}

export function TextNode({ text, depth, collapsed = false }: TextNodeProps) {
  const navigate = useNavigate();
  const { selectedItemId, selectItem } = useLibraryStore();

  const nodeId = `text-${text.id}`;
  const isSelected = selectedItemId === nodeId;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: nodeId,
    data: {
      type: 'text',
      text,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleClick = () => {
    selectItem(nodeId);
    navigate(`/read/${text.id}`);
  };

  const indentStyle = collapsed ? {} : { paddingLeft: `${depth * 16 + 8}px` };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...indentStyle }}
      className={cn(
        'flex items-center gap-2 h-8 px-2 rounded-md text-sm cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        isSelected
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
        isDragging && 'opacity-50',
        !shouldReduceMotion() && 'transition-colors duration-150'
      )}
      onClick={handleClick}
      {...attributes}
      {...listeners}
      title={collapsed ? text.title : undefined}
    >
      <FileText className="h-4 w-4 flex-shrink-0" />
      {!collapsed && (
        <span className="truncate flex-1" title={text.title}>
          {text.title}
        </span>
      )}
    </div>
  );
}
