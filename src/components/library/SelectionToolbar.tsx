import { useLibraryStore } from '../../stores/library';
import { Button } from '../../lib/components/ui/button';
import { X } from 'lucide-react';

export function SelectionToolbar() {
  const selectedItemIds = useLibraryStore((state) => state.selectedItemIds);
  const clearSelection = useLibraryStore((state) => state.clearSelection);

  if (selectedItemIds.size === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-accent border-b border-border">
      <span className="text-sm font-medium">
        {selectedItemIds.size} item{selectedItemIds.size !== 1 ? 's' : ''} selected
      </span>
      <Button variant="ghost" size="sm" onClick={clearSelection}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
