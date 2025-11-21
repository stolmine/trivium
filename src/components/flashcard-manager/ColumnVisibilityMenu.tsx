import { Columns } from 'lucide-react';
import { useFlashcardManagerStore } from '../../stores/flashcardManager';
import { Button, Checkbox, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuSeparator } from '../../lib/components/ui';
import { getModifierKey } from '../../lib/utils/platform';

interface ColumnDef {
  id: string;
  label: string;
  canHide: boolean;
}

const columns: ColumnDef[] = [
  { id: 'select', label: 'Select', canHide: false },
  { id: 'id', label: 'ID', canHide: true },
  { id: 'textTitle', label: 'Text Source', canHide: true },
  { id: 'clozeText', label: 'Cloze Content', canHide: true },
  { id: 'originalText', label: 'Original Text', canHide: true },
  { id: 'due', label: 'Due Date', canHide: true },
  { id: 'reps', label: 'Reps', canHide: true },
  { id: 'difficulty', label: 'Difficulty', canHide: true },
  { id: 'stability', label: 'Stability', canHide: true },
  { id: 'state', label: 'State', canHide: true },
  { id: 'createdAt', label: 'Created At', canHide: true },
  { id: 'lastReview', label: 'Last Review', canHide: true },
  { id: 'lapses', label: 'Lapses', canHide: true },
  { id: 'scheduledDays', label: 'Scheduled Days', canHide: true },
  { id: 'buriedUntil', label: 'Buried Until', canHide: true },
  { id: 'actions', label: 'Actions', canHide: true },
];

export function ColumnVisibilityMenu() {
  const hiddenColumns = useFlashcardManagerStore((state) => state.hiddenColumns);
  const toggleColumnVisibility = useFlashcardManagerStore((state) => state.toggleColumnVisibility);
  const mod = getModifierKey();

  const hideableColumns = columns.filter(col => col.canHide);
  const allVisible = hideableColumns.every(col => !hiddenColumns.has(col.id));
  const allHidden = hideableColumns.every(col => hiddenColumns.has(col.id));
  const isIndeterminate = !allVisible && !allHidden;

  const handleToggleAll = () => {
    if (allVisible) {
      // Hide all
      hideableColumns.forEach(col => toggleColumnVisibility(col.id));
    } else {
      // Show all
      hideableColumns.forEach(col => {
        if (hiddenColumns.has(col.id)) {
          toggleColumnVisibility(col.id);
        }
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          title={`Toggle column visibility (${mod}+Shift+C)`}
        >
          <Columns className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div
          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          onClick={handleToggleAll}
        >
          <Checkbox
            checked={isIndeterminate ? "indeterminate" : allVisible}
            onCheckedChange={handleToggleAll}
            className="pointer-events-none"
          />
          <span className="ml-2 font-semibold">Toggle All</span>
        </div>
        <DropdownMenuSeparator />
        {columns.map((column) => {
          if (!column.canHide) return null;

          const isVisible = !hiddenColumns.has(column.id);

          return (
            <div
              key={column.id}
              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                toggleColumnVisibility(column.id);
              }}
            >
              <Checkbox
                checked={isVisible}
                onCheckedChange={() => toggleColumnVisibility(column.id)}
                className="pointer-events-none"
              />
              <span className="ml-2">{column.label}</span>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
