import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useFlashcardManagerStore } from '../../stores/flashcardManager';
import { useLibraryStore } from '../../stores/library';
import { Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Button } from '../../lib/components/ui';

interface DateRange {
  earliest: string | null;
  latest: string | null;
}

export function FlashcardFilterPanel() {
  const filters = useFlashcardManagerStore((state) => state.filters);
  const setFilter = useFlashcardManagerStore((state) => state.setFilter);
  const folders = useLibraryStore((state) => state.folders);
  const texts = useLibraryStore((state) => state.texts);

  const [dueAfter, setDueAfter] = useState(filters.dueAfter || '');
  const [dueBefore, setDueBefore] = useState(filters.dueBefore || '');
  const [createdAfter, setCreatedAfter] = useState(filters.createdAfter || '');
  const [createdBefore, setCreatedBefore] = useState(filters.createdBefore || '');
  const [minReps, setMinReps] = useState(filters.minReps?.toString() || '');
  const [maxReps, setMaxReps] = useState(filters.maxReps?.toString() || '');
  const [minDifficulty, setMinDifficulty] = useState(filters.minDifficulty?.toString() || '');
  const [maxDifficulty, setMaxDifficulty] = useState(filters.maxDifficulty?.toString() || '');
  const [dateRangeLoaded, setDateRangeLoaded] = useState(false);

  useEffect(() => {
    if (!dateRangeLoaded) {
      invoke<DateRange>('get_flashcard_date_range')
        .then((range) => {
          if (range.earliest && !filters.createdAfter) {
            setCreatedAfter(range.earliest);
          }
          if (!filters.createdBefore) {
            const now = new Date().toISOString();
            setCreatedBefore(now);
          }
          setDateRangeLoaded(true);
        })
        .catch((error) => {
          console.error('Failed to load flashcard date range:', error);
          setDateRangeLoaded(true);
        });
    }
  }, [dateRangeLoaded, filters.createdAfter, filters.createdBefore]);

  useEffect(() => {
    setDueAfter(filters.dueAfter || '');
    setDueBefore(filters.dueBefore || '');
    setCreatedAfter(filters.createdAfter || '');
    setCreatedBefore(filters.createdBefore || '');
    setMinReps(filters.minReps?.toString() || '');
    setMaxReps(filters.maxReps?.toString() || '');
    setMinDifficulty(filters.minDifficulty?.toString() || '');
    setMaxDifficulty(filters.maxDifficulty?.toString() || '');
  }, [filters]);

  const handleApplyFilters = () => {
    if (dueAfter) setFilter('dueAfter', dueAfter);
    else setFilter('dueAfter', undefined);

    if (dueBefore) setFilter('dueBefore', dueBefore);
    else setFilter('dueBefore', undefined);

    if (createdAfter) setFilter('createdAfter', createdAfter);
    else setFilter('createdAfter', undefined);

    if (createdBefore) setFilter('createdBefore', createdBefore);
    else setFilter('createdBefore', undefined);

    if (minReps) setFilter('minReps', parseInt(minReps, 10));
    else setFilter('minReps', undefined);

    if (maxReps) setFilter('maxReps', parseInt(maxReps, 10));
    else setFilter('maxReps', undefined);

    if (minDifficulty) setFilter('minDifficulty', parseFloat(minDifficulty));
    else setFilter('minDifficulty', undefined);

    if (maxDifficulty) setFilter('maxDifficulty', parseFloat(maxDifficulty));
    else setFilter('maxDifficulty', undefined);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="folder-filter">Folder</Label>
          <Select
            value={filters.folderId || ''}
            onValueChange={(value) => setFilter('folderId', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All folders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All folders</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="text-filter">Text</Label>
          <Select
            value={filters.textId?.toString() || ''}
            onValueChange={(value) => setFilter('textId', value ? parseInt(value, 10) : undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All texts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All texts</SelectItem>
              {texts.map((text) => (
                <SelectItem key={text.id} value={text.id.toString()}>
                  {text.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Due Date Range</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="due-after" className="text-xs text-muted-foreground">
              After
            </Label>
            <Input
              id="due-after"
              type="datetime-local"
              value={dueAfter ? new Date(dueAfter).toISOString().slice(0, 16) : ''}
              onChange={(e) => {
                const value = e.target.value;
                setDueAfter(value ? new Date(value).toISOString() : '');
              }}
            />
          </div>
          <div>
            <Label htmlFor="due-before" className="text-xs text-muted-foreground">
              Before
            </Label>
            <Input
              id="due-before"
              type="datetime-local"
              value={dueBefore ? new Date(dueBefore).toISOString().slice(0, 16) : ''}
              onChange={(e) => {
                const value = e.target.value;
                setDueBefore(value ? new Date(value).toISOString() : '');
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Created Date Range</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="created-after" className="text-xs text-muted-foreground">
              After
            </Label>
            <Input
              id="created-after"
              type="datetime-local"
              value={createdAfter ? new Date(createdAfter).toISOString().slice(0, 16) : ''}
              onChange={(e) => {
                const value = e.target.value;
                setCreatedAfter(value ? new Date(value).toISOString() : '');
              }}
            />
          </div>
          <div>
            <Label htmlFor="created-before" className="text-xs text-muted-foreground">
              Before
            </Label>
            <Input
              id="created-before"
              type="datetime-local"
              value={createdBefore ? new Date(createdBefore).toISOString().slice(0, 16) : ''}
              onChange={(e) => {
                const value = e.target.value;
                setCreatedBefore(value ? new Date(value).toISOString() : '');
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Repetitions Range</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="min-reps" className="text-xs text-muted-foreground">
              Min
            </Label>
            <Input
              id="min-reps"
              type="number"
              value={minReps}
              onChange={(e) => setMinReps(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="max-reps" className="text-xs text-muted-foreground">
              Max
            </Label>
            <Input
              id="max-reps"
              type="number"
              value={maxReps}
              onChange={(e) => setMaxReps(e.target.value)}
              placeholder="999"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Difficulty Range</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="min-difficulty" className="text-xs text-muted-foreground">
              Min
            </Label>
            <Input
              id="min-difficulty"
              type="number"
              step="0.01"
              value={minDifficulty}
              onChange={(e) => setMinDifficulty(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="max-difficulty" className="text-xs text-muted-foreground">
              Max
            </Label>
            <Input
              id="max-difficulty"
              type="number"
              step="0.01"
              value={maxDifficulty}
              onChange={(e) => setMaxDifficulty(e.target.value)}
              placeholder="10.00"
            />
          </div>
        </div>
      </div>

      <Button onClick={handleApplyFilters} className="w-full">
        Apply Filters
      </Button>
    </div>
  );
}
