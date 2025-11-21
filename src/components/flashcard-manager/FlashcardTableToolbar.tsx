import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, X, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { useFlashcardManagerStore } from '../../stores/flashcardManager';
import { Button, Input } from '../../lib/components/ui';
import { getModifierKey } from '../../lib/utils/platform';
import { FlashcardFilterPanel } from './FlashcardFilterPanel';
import { ColumnVisibilityMenu } from './ColumnVisibilityMenu';

export function FlashcardTableToolbar() {
  // Use selectors to avoid subscribing to entire store
  const searchText = useFlashcardManagerStore((state) => state.filters.searchText);
  const stateFilter = useFlashcardManagerStore((state) => state.filters.state);
  const dueBefore = useFlashcardManagerStore((state) => state.filters.dueBefore);
  const dueAfter = useFlashcardManagerStore((state) => state.filters.dueAfter);
  const isBuried = useFlashcardManagerStore((state) => state.filters.isBuried);
  const setFilter = useFlashcardManagerStore((state) => state.setFilter);
  const clearFilters = useFlashcardManagerStore((state) => state.clearFilters);
  const activeFilterCount = useFlashcardManagerStore((state) => state.getActiveFilterCount());
  const isDetailPanelCollapsed = useFlashcardManagerStore((state) => state.isDetailPanelCollapsed);
  const toggleDetailPanel = useFlashcardManagerStore((state) => state.toggleDetailPanel);

  const [searchInput, setSearchInput] = useState(searchText || '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const mod = getModifierKey();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchText) {
        setFilter('searchText', searchInput || undefined);
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, searchText]);

  const handleQuickFilter = useCallback((filterKey: string, value: any, isActive: boolean) => {
    if (isActive) {
      setFilter(filterKey as any, undefined);
    } else {
      if (filterKey === 'state') {
        setFilter('dueBefore', undefined);
        setFilter('dueAfter', undefined);
        setFilter('isBuried', undefined);
        setFilter('state', value);
      } else if (filterKey === 'isBuried') {
        setFilter('state', undefined);
        setFilter('dueBefore', undefined);
        setFilter('dueAfter', undefined);
        setFilter('isBuried', value);
      } else {
        setFilter('state', undefined);
        setFilter('isBuried', undefined);
        setFilter('dueBefore', value);
        if (filterKey === 'dueBefore') {
          setFilter('dueAfter', undefined);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClearFilters = () => {
    setSearchInput('');
    clearFilters();
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return (
    <div className="border-b bg-background">
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search cloze or original text..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <ColumnVisibilityMenu />

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleDetailPanel}
          className="h-9 w-9 p-0"
          title={isDetailPanelCollapsed ? `Show detail panel (${mod}+I)` : `Hide detail panel (${mod}+I)`}
        >
          {isDetailPanelCollapsed ? (
            <PanelRightOpen className="h-4 w-4" />
          ) : (
            <PanelRightClose className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-xs font-medium text-secondary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 pb-3 flex-wrap">
        <span className="text-sm text-muted-foreground">Quick filters:</span>

        <Button
          variant={stateFilter?.includes(0) ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('state', [0], stateFilter?.includes(0) || false)}
          className="h-7"
        >
          New
        </Button>

        <Button
          variant={stateFilter?.includes(1) ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('state', [1], stateFilter?.includes(1) || false)}
          className="h-7"
        >
          Learning
        </Button>

        <Button
          variant={stateFilter?.includes(2) ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('state', [2], stateFilter?.includes(2) || false)}
          className="h-7"
        >
          Review
        </Button>

        <Button
          variant={stateFilter?.includes(3) ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('state', [3], stateFilter?.includes(3) || false)}
          className="h-7"
        >
          Relearning
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          variant={dueBefore === todayEnd && dueAfter === todayStart ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            const isActive = dueBefore === todayEnd && dueAfter === todayStart;
            if (isActive) {
              setFilter('dueBefore', undefined);
              setFilter('dueAfter', undefined);
            } else {
              setFilter('state', undefined);
              setFilter('isBuried', undefined);
              setFilter('dueBefore', todayEnd);
              setFilter('dueAfter', todayStart);
            }
          }}
          className="h-7"
        >
          Due Today
        </Button>

        <Button
          variant={dueBefore === weekEnd && !dueAfter ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('dueBefore', weekEnd, dueBefore === weekEnd && !dueAfter)}
          className="h-7"
        >
          Due This Week
        </Button>

        <Button
          variant={dueBefore === now.toISOString() && !dueAfter ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('dueBefore', now.toISOString(), dueBefore === now.toISOString() && !dueAfter)}
          className="h-7"
        >
          Overdue
        </Button>

        <Button
          variant={isBuried === true ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('isBuried', true, isBuried === true)}
          className="h-7"
        >
          Buried
        </Button>
      </div>

      {showAdvancedFilters && (
        <div className="border-t">
          <FlashcardFilterPanel />
        </div>
      )}
    </div>
  );
}
