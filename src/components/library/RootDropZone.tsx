import { useDroppable } from '@dnd-kit/core';
import { FolderOpen } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RootDropZoneProps {
  className?: string;
}

export function RootDropZone({ className }: RootDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'root-drop-zone',
    data: {
      type: 'root',
      accepts: ['folder', 'text']
    },
  });

  console.log('[RootDropZone] State:', { isOver });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'px-4 py-6 mx-2 mb-2 border-2 border-dashed rounded transition-colors min-h-[64px] flex-shrink-0',
        isOver
          ? 'border-sidebar-primary bg-sidebar-primary/10'
          : 'border-border',
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FolderOpen className="h-4 w-4" />
        <span>Drop here to move to root directory</span>
      </div>
    </div>
  );
}
