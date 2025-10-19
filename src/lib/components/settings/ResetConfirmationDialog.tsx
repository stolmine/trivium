import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/lib/components/ui/dialog';
import { Button } from '@/lib/components/ui/button';
import { Input } from '@/lib/components/ui/input';
import { Label } from '@/lib/components/ui/label';
import { AlertTriangle } from 'lucide-react';

export type ResetType = 'reading' | 'flashcards' | 'stats' | 'all';

interface ResetConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resetType: ResetType;
  itemCount?: number;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ResetConfirmationDialog({
  open,
  onOpenChange,
  resetType,
  itemCount,
  onConfirm,
  isLoading = false
}: ResetConfirmationDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState<'warning' | 'confirm'>('warning');

  const requiresTypeConfirmation = resetType === 'all';
  const isConfirmValid = !requiresTypeConfirmation || confirmText === 'DELETE';

  useEffect(() => {
    if (!open) {
      setConfirmText('');
      setStep('warning');
    }
  }, [open]);

  const getDialogContent = () => {
    switch (resetType) {
      case 'reading':
        return {
          title: 'Reset Reading Progress',
          description: 'This will clear all read/unread tracking across all texts.',
          items: [
            `${itemCount ?? 0} read ranges will be deleted`,
            'Reading position markers will be removed',
            'Your texts and flashcards will not be affected'
          ]
        };
      case 'flashcards':
        return {
          title: 'Reset All Flashcards',
          description: 'This will delete all flashcards and marks from your database.',
          items: [
            `${itemCount ?? 0} flashcards will be permanently deleted`,
            'All marks (pending and converted) will be removed',
            'Review history and statistics will be lost',
            'Your texts will not be affected'
          ]
        };
      case 'stats':
        return {
          title: 'Reset Flashcard Statistics',
          description: 'This will reset all review statistics and FSRS state while keeping your cards.',
          items: [
            `${itemCount ?? 0} flashcards will have stats reset`,
            'All cards will return to "new" state',
            'Review history will be cleared',
            'Card content will be preserved'
          ]
        };
      case 'all':
        return {
          title: 'Reset All Data',
          description: 'This will delete EVERYTHING from your database. This action cannot be undone.',
          items: [
            'All texts and folders will be deleted',
            'All flashcards and marks will be deleted',
            'All reading progress will be deleted',
            'All review history will be deleted',
            'Settings will be reset to defaults'
          ]
        };
    }
  };

  const content = getDialogContent();
  const isDangerous = resetType === 'all' || resetType === 'flashcards';

  const handleConfirm = () => {
    if (requiresTypeConfirmation && step === 'warning') {
      setStep('confirm');
    } else if (isConfirmValid) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (step === 'confirm' && requiresTypeConfirmation) {
      setStep('warning');
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDangerous && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {content.title}
          </DialogTitle>
          <DialogDescription>
            {content.description}
          </DialogDescription>
        </DialogHeader>

        {step === 'warning' && (
          <div className="py-4 space-y-4">
            {resetType === 'all' && (
              <div className="p-4 bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 dark:border-destructive/30 rounded-md">
                <p className="text-sm font-medium text-destructive mb-2">
                  Before proceeding, please export your database!
                </p>
                <p className="text-sm text-muted-foreground">
                  Go to Database Management and use the Export button to create a backup.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">The following will be affected:</p>
              <ul className="space-y-1">
                {content.items.map((item, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-destructive mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {step === 'confirm' && requiresTypeConfirmation && (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-text">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isConfirmValid) {
                    handleConfirm();
                  }
                }}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {step === 'confirm' && requiresTypeConfirmation ? 'Back' : 'Cancel'}
          </Button>
          <Button
            variant={isDangerous ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isLoading || (step === 'confirm' && !isConfirmValid)}
          >
            {isLoading
              ? 'Processing...'
              : step === 'warning' && requiresTypeConfirmation
              ? 'Continue'
              : resetType === 'all'
              ? 'Delete Everything'
              : 'Confirm Reset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
