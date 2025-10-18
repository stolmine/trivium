import { useEffect } from 'react';
import { X } from 'lucide-react';
import { KeyboardShortcut, getShortcutLabel } from '../../hooks/useKeyboardShortcuts';
import { Button } from '../../lib/components/ui';

interface ShortcutHelpProps {
  shortcuts: KeyboardShortcut[];
  open: boolean;
  onClose: () => void;
}

export function ShortcutHelp({ shortcuts, open, onClose }: ShortcutHelpProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const categorizedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryLabels = {
    navigation: 'Navigation',
    actions: 'Actions',
    view: 'View',
    ingest: 'Text Editing (Ingest)',
    review: 'Review',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-card rounded-lg shadow-modal border m-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="shortcut-help-title"
        aria-modal="true"
      >
        <div className="sticky top-0 flex items-center justify-between p-6 border-b bg-card/95 backdrop-blur">
          <h2 id="shortcut-help-title" className="text-2xl font-semibold">
            Keyboard Shortcuts
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close shortcuts dialog"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-8">
          {Object.entries(categorizedShortcuts).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-4">
                {categoryLabels[category as keyof typeof categoryLabels] || category}
              </h3>
              <div className="space-y-3">
                {items.map((shortcut, index) => (
                  <div
                    key={`${category}-${index}`}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm text-foreground">
                      {shortcut.description}
                    </span>
                    <kbd className="px-3 py-1.5 text-xs font-semibold bg-muted text-muted-foreground rounded border border-border">
                      {getShortcutLabel(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 p-4 border-t bg-card/95 backdrop-blur">
          <p className="text-sm text-muted-foreground text-center">
            Press <kbd className="px-2 py-1 text-xs font-semibold bg-muted text-muted-foreground rounded border border-border">Esc</kbd> or <kbd className="px-2 py-1 text-xs font-semibold bg-muted text-muted-foreground rounded border border-border">Enter</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
