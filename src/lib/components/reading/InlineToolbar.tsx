import { Eye, Code, Loader2 } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '@/lib/utils';

interface InlineToolbarProps {
  mode: 'styled' | 'literal';
  characterCount: number;
  hasChanges: boolean;
  isSaving: boolean;
  onModeToggle: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function InlineToolbar({
  mode,
  characterCount,
  hasChanges,
  isSaving,
  onModeToggle,
  onCancel,
  onSave
}: InlineToolbarProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 mt-2',
        'flex items-center justify-between gap-4',
        'px-4 py-2',
        'border-t border-border',
        'backdrop-blur-sm bg-background/80',
        'rounded-b-md',
        'animate-in slide-in-from-bottom-2 fade-in duration-150'
      )}
      style={{ animationDelay: '50ms' }}
    >
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onModeToggle}
          disabled={isSaving}
          title={mode === 'styled' ? 'Switch to literal mode (M)' : 'Switch to styled mode (M)'}
          aria-label={mode === 'styled' ? 'Switch to literal mode' : 'Switch to styled mode'}
          className="gap-1.5"
        >
          {mode === 'styled' ? (
            <>
              <Eye className="h-4 w-4" />
              <span className="font-medium">Styled</span>
            </>
          ) : (
            <>
              <Code className="h-4 w-4" />
              <span className="font-medium">LITERAL</span>
            </>
          )}
          <kbd className="ml-1 px-1 py-0.5 bg-muted border border-border rounded text-[10px]">
            M
          </kbd>
        </Button>

        <span className="text-sm text-muted-foreground">
          {characterCount.toLocaleString()} chars
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
          title="Cancel editing (Esc)"
          aria-label="Cancel editing"
        >
          <kbd className="mr-1.5 px-1 py-0.5 bg-background border border-border rounded text-[10px]">
            Esc
          </kbd>
          Cancel
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={onSave}
          disabled={!hasChanges || isSaving}
          title="Save changes (Cmd+S)"
          aria-label="Save changes"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <kbd className="mr-1.5 px-1 py-0.5 bg-primary-foreground/20 border border-primary-foreground/30 rounded text-[10px]">
                ⌘S
              </kbd>
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
