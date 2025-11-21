import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../lib/components/ui/dialog';
import { Button, Input, Label } from '../../lib/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../lib/components/ui/select';
import { useFlashcardManagerStore } from '../../stores/flashcardManager';
import { invoke } from '@tauri-apps/api/core';

interface BatchOperationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: 'bury' | 'reset' | 'state';
}

interface FlashcardBatchUpdate {
  id: number;
  field: string;
  value: string | number;
}

export function BatchOperationsDialog({
  open,
  onOpenChange,
  operation,
}: BatchOperationsDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buryDate, setBuryDate] = useState('');
  const [newState, setNewState] = useState<string>('0');

  const selectedIds = useFlashcardManagerStore((state) => state.selectedIds);
  const clearSelection = useFlashcardManagerStore((state) => state.clearSelection);
  const loadFlashcards = useFlashcardManagerStore((state) => state.loadFlashcards);

  const selectedCount = selectedIds.size;

  const getTitle = () => {
    switch (operation) {
      case 'bury':
        return `Bury ${selectedCount} ${selectedCount === 1 ? 'Card' : 'Cards'}`;
      case 'reset':
        return `Reset Stats for ${selectedCount} ${selectedCount === 1 ? 'Card' : 'Cards'}`;
      case 'state':
        return `Change State for ${selectedCount} ${selectedCount === 1 ? 'Card' : 'Cards'}`;
      default:
        return 'Batch Operation';
    }
  };

  const getDescription = () => {
    switch (operation) {
      case 'bury':
        return 'Set a date until which these cards will be hidden from review.';
      case 'reset':
        return 'Reset all FSRS statistics (difficulty, stability, reps, lapses) to initial values. Cards will be treated as new.';
      case 'state':
        return 'Change the learning state of the selected cards.';
      default:
        return '';
    }
  };

  const handleOperation = async () => {
    if (selectedCount === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      const flashcardIds = Array.from(selectedIds);
      let updates: FlashcardBatchUpdate[] = [];

      switch (operation) {
        case 'bury': {
          if (!buryDate) {
            setError('Please select a date');
            setIsProcessing(false);
            return;
          }

          const date = new Date(buryDate);
          if (isNaN(date.getTime())) {
            setError('Invalid date');
            setIsProcessing(false);
            return;
          }

          updates = flashcardIds.map((id) => ({
            id,
            field: 'buriedUntil',
            value: date.toISOString(),
          }));
          break;
        }
        case 'reset': {
          updates = flashcardIds.map((id) => ({
            id,
            field: 'resetStats',
            value: '',
          }));
          break;
        }
        case 'state': {
          const stateValue = parseInt(newState, 10);
          updates = flashcardIds.map((id) => ({
            id,
            field: 'state',
            value: stateValue,
          }));
          break;
        }
      }

      await invoke('batch_update_flashcards', { updates });

      console.log(`Successfully performed ${operation} operation on ${selectedCount} cards`);

      clearSelection();
      await loadFlashcards();
      onOpenChange(false);

      setBuryDate('');
      setNewState('0');
    } catch (err) {
      console.error(`Failed to perform ${operation} operation:`, err);
      setError(String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {operation === 'bury' && (
            <div className="space-y-2">
              <Label htmlFor="bury-date">Bury until date</Label>
              <Input
                id="bury-date"
                type="date"
                value={buryDate}
                onChange={(e) => setBuryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                Cards will be hidden from review until this date
              </p>
            </div>
          )}

          {operation === 'reset' && (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm">
                This will reset the following for all selected cards:
              </p>
              <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                <li>Difficulty → 0.0</li>
                <li>Stability → 0.0</li>
                <li>Repetitions → 0</li>
                <li>Lapses → 0</li>
                <li>State → New (0)</li>
                <li>Due date → Now</li>
              </ul>
            </div>
          )}

          {operation === 'state' && (
            <div className="space-y-2">
              <Label>New state</Label>
              <Select value={newState} onValueChange={setNewState}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">New</SelectItem>
                  <SelectItem value="1">Learning</SelectItem>
                  <SelectItem value="2">Review</SelectItem>
                  <SelectItem value="3">Relearning</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Change the learning state without affecting other statistics
              </p>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setBuryDate('');
              setNewState('0');
              setError(null);
            }}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button onClick={handleOperation} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
