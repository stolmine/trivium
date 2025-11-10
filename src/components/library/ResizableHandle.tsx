import { useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { shouldReduceMotion } from '../../lib/animations';

interface ResizableHandleProps {
  onResize: (leftWidth: number) => void;
  className?: string;
}

export function ResizableHandle({ onResize, className }: ResizableHandleProps) {
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const width = (e.clientX / window.innerWidth) * 100;
      const clampedWidth = Math.min(Math.max(width, 25), 75);
      onResize(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onResize]);

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-1 cursor-col-resize bg-border hover:bg-muted-foreground',
        isResizing && 'bg-sidebar-primary',
        !shouldReduceMotion() && 'transition-colors duration-150',
        className
      )}
      onMouseDown={handleMouseDown}
    />
  );
}
