import { useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useFlashcardManagerStore, type FlashcardWithTextInfo } from '../../stores/flashcardManager';
import { Button, Checkbox } from '../../lib/components/ui';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { FlashcardTableToolbar } from './FlashcardTableToolbar';
import { BulkActionToolbar } from './BulkActionToolbar';

const columnHelper = createColumnHelper<FlashcardWithTextInfo>();

const getStateLabel = (state: number): string => {
  switch (state) {
    case 0: return 'New';
    case 1: return 'Learning';
    case 2: return 'Review';
    case 3: return 'Relearning';
    default: return 'Unknown';
  }
};

const truncateText = (text: string, maxLength: number = 50): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// DEBUG FLAG - set to true to enable debug logging
const DEBUG_RENDERS = false;

let renderCount = 0;

export function FlashcardTable() {
  renderCount++;
  const renderTimestamp = new Date().toISOString();

  if (DEBUG_RENDERS) {
    console.log(`[FlashcardTable] Render #${renderCount} at ${renderTimestamp}`);
  }

  // Split into data subscriptions and action subscriptions to minimize re-renders
  // Actions are stable and don't cause re-renders
  const loadFlashcards = useFlashcardManagerStore((state) => state.loadFlashcards);
  const setPage = useFlashcardManagerStore((state) => state.setPage);
  const toggleSelection = useFlashcardManagerStore((state) => state.toggleSelection);
  const selectAll = useFlashcardManagerStore((state) => state.selectAll);
  const clearSelection = useFlashcardManagerStore((state) => state.clearSelection);
  const toggleSortColumn = useFlashcardManagerStore((state) => state.toggleSortColumn);

  // Data subscriptions with shallow comparison
  const flashcards = useFlashcardManagerStore((state) => state.flashcards);
  const totalCount = useFlashcardManagerStore((state) => state.totalCount);
  const currentPage = useFlashcardManagerStore((state) => state.currentPage);
  const pageSize = useFlashcardManagerStore((state) => state.pageSize);
  const isLoading = useFlashcardManagerStore((state) => state.isLoading);
  const selectedIds = useFlashcardManagerStore((state) => state.selectedIds);
  const sorting = useFlashcardManagerStore((state) => state.sorting);
  const hiddenColumns = useFlashcardManagerStore((state) => state.hiddenColumns);

  useEffect(() => {
    if (DEBUG_RENDERS) {
      console.log(`[FlashcardTable] useEffect triggered - calling loadFlashcards()`);
      console.log(`[FlashcardTable] State snapshot:`, {
        flashcardsCount: flashcards.length,
        totalCount,
        currentPage,
        pageSize,
        isLoading,
        selectedIdsSize: selectedIds.size,
        sorting,
      });
    }
    loadFlashcards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSortIcon = (columnId: string) => {
    if (!sorting || sorting.column !== columnId) return null;
    return sorting.direction === 'asc' ? (
      <ArrowUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 inline ml-1" />
    );
  };

  // Convert Set to array for stable comparison in useMemo
  const selectedIdsArray = useMemo(() => Array.from(selectedIds).sort(), [selectedIds]);

  const columnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {};
    // Defensive check: ensure hiddenColumns is a Set
    if (hiddenColumns && typeof hiddenColumns.forEach === 'function') {
      hiddenColumns.forEach((columnId) => {
        visibility[columnId] = false;
      });
    }
    return visibility;
  }, [hiddenColumns]);

  if (DEBUG_RENDERS) {
    console.log(`[FlashcardTable] selectedIds size: ${selectedIds.size}, sorting:`, sorting);
  }

  const columns = useMemo(
    () => {
      if (DEBUG_RENDERS) {
        console.log(`[FlashcardTable] Columns useMemo recalculated`);
      }
      return [
        columnHelper.display({
          id: 'select',
          header: () => {
            const allVisibleIds = flashcards.map(fc => fc.id);
            const allVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
            return (
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={(checked: boolean) => {
                  if (checked) {
                    selectAll();
                  } else {
                    clearSelection();
                  }
                }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              />
            );
          },
          cell: ({ row }) => (
            <Checkbox
              checked={selectedIds.has(row.original.id)}
              onCheckedChange={() => {
                toggleSelection(row.original.id);
              }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          ),
          size: 50,
          enableSorting: false,
        }),
      columnHelper.accessor('id', {
        header: 'ID',
        cell: (info) => info.getValue(),
        size: 80,
        enableSorting: true,
      }),
      columnHelper.accessor('textTitle', {
        header: 'Text Source',
        cell: (info) => truncateText(info.getValue(), 30),
        size: 200,
        enableSorting: true,
      }),
      columnHelper.accessor('clozeText', {
        header: 'Cloze Content',
        cell: (info) => truncateText(info.getValue(), 40),
        size: 250,
        enableSorting: true,
      }),
      columnHelper.accessor('originalText', {
        header: 'Original Text',
        cell: (info) => truncateText(info.getValue(), 40),
        size: 250,
        enableSorting: true,
      }),
      columnHelper.accessor('due', {
        header: 'Due Date',
        cell: (info) => {
          const dueDate = new Date(info.getValue());
          const now = new Date();
          if (dueDate < now) {
            return <span className="text-red-500">{formatDistanceToNow(dueDate, { addSuffix: true })}</span>;
          }
          return formatDistanceToNow(dueDate, { addSuffix: true });
        },
        size: 150,
        enableSorting: true,
      }),
      columnHelper.accessor('reps', {
        header: 'Reps',
        cell: (info) => info.getValue(),
        size: 80,
        enableSorting: true,
      }),
      columnHelper.accessor('difficulty', {
        header: 'Difficulty',
        cell: (info) => info.getValue().toFixed(2),
        size: 100,
        enableSorting: true,
      }),
      columnHelper.accessor('stability', {
        header: 'Stability',
        cell: (info) => info.getValue().toFixed(2),
        size: 100,
        enableSorting: true,
      }),
      columnHelper.accessor('state', {
        header: 'State',
        cell: (info) => getStateLabel(info.getValue()),
        size: 120,
        enableSorting: true,
      }),
      columnHelper.accessor('createdAt', {
        header: 'Created At',
        cell: (info) => new Date(info.getValue()).toLocaleDateString(),
        size: 120,
        enableSorting: true,
      }),
      columnHelper.accessor('lastReview', {
        header: 'Last Review',
        cell: (info) => {
          const value = info.getValue();
          return value ? new Date(value).toLocaleDateString() : '-';
        },
        size: 120,
        enableSorting: true,
      }),
      columnHelper.accessor('lapses', {
        header: 'Lapses',
        cell: (info) => info.getValue(),
        size: 80,
        enableSorting: true,
      }),
      columnHelper.accessor('scheduledDays', {
        header: 'Scheduled Days',
        cell: (info) => info.getValue(),
        size: 130,
        enableSorting: true,
      }),
      columnHelper.accessor('buriedUntil', {
        header: 'Buried Until',
        cell: (info) => {
          const value = info.getValue();
          return value ? new Date(value).toLocaleDateString() : '-';
        },
        size: 130,
        enableSorting: true,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: () => (
          <Button variant="ghost" size="sm">
            •••
          </Button>
        ),
        size: 100,
        enableSorting: false,
      }),
    ];
    },
    [selectedIdsArray]
  );

  const table = useReactTable({
    data: flashcards,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
    state: {
      pagination: {
        pageIndex: currentPage,
        pageSize,
      },
      columnVisibility,
    },
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading flashcards...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <FlashcardTableToolbar />
      <BulkActionToolbar />
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-muted/50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-medium border-b"
                    style={{ width: header.column.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.columnDef.enableSorting
                            ? 'cursor-pointer select-none hover:text-foreground flex items-center'
                            : ''
                        }
                        onClick={() => {
                          if (header.column.columnDef.enableSorting) {
                            toggleSortColumn(header.column.id);
                          }
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {getSortIcon(header.column.id)}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => toggleSelection(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
        <div className="text-sm text-muted-foreground">
          Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} flashcards
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(0)}
            disabled={currentPage === 0}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
