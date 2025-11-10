import { useLibraryStore } from '../../stores/library';
import { useFocusContextStore, shouldTrackFocus } from '../../stores/focusContext';
import { FileText, Folder } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RightPaneProps {
  width: number;
}

export function RightPane({ width }: RightPaneProps) {
  const { librarySelectedItemId, folders, texts } = useLibraryStore();
  const { setActiveContext, isContextActive } = useFocusContextStore();
  const isFocused = isContextActive('library-right');

  // Only show focus tracking UI when on library page
  const trackingEnabled = shouldTrackFocus();
  const showFocusUI = trackingEnabled && isFocused;

  const handleClick = () => {
    // Only set active context if focus tracking is enabled
    if (trackingEnabled) {
      setActiveContext('library-right');
    }
  };

  if (!librarySelectedItemId) {
    return (
      <div
        className={cn(
          'flex flex-col bg-background',
          // Only apply focus-related classes when focus tracking is enabled
          trackingEnabled && 'focusable-pane library-right-pane',
          trackingEnabled && (showFocusUI ? 'focusable-pane--focused' : 'focusable-pane--unfocused')
        )}
        style={{ width: `${width}%` }}
        onClick={handleClick}
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a folder or text to view details</p>
          </div>
        </div>
      </div>
    );
  }

  const folder = folders.find((f) => f.id === librarySelectedItemId);
  const text = texts.find((t) => `text-${t.id}` === librarySelectedItemId);

  const selectedItem = folder || text;
  const isFolder = !!folder;

  if (!selectedItem) {
    return (
      <div
        className={cn(
          'flex flex-col bg-background',
          // Only apply focus-related classes when focus tracking is enabled
          trackingEnabled && 'focusable-pane library-right-pane',
          trackingEnabled && (showFocusUI ? 'focusable-pane--focused' : 'focusable-pane--unfocused')
        )}
        style={{ width: `${width}%` }}
        onClick={handleClick}
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a folder or text to view details</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-background',
        // Only apply focus-related classes when focus tracking is enabled
        trackingEnabled && 'focusable-pane library-right-pane',
        trackingEnabled && (showFocusUI ? 'focusable-pane--focused' : 'focusable-pane--unfocused')
      )}
      style={{ width: `${width}%` }}
      onClick={handleClick}
    >
      <div className="p-6">
        <div className="flex items-center gap-3">
          {isFolder ? (
            <Folder className="h-6 w-6 text-muted-foreground" />
          ) : (
            <FileText className="h-6 w-6 text-muted-foreground" />
          )}
          <h2 className="text-xl font-semibold">
            {isFolder ? folder.name : text?.title}
          </h2>
        </div>
      </div>
    </div>
  );
}
