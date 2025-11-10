import { useLibraryStore } from '../../stores/library';
import { useFocusContextStore, shouldTrackFocus } from '../../stores/focusContext';
import { MousePointerClick } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TextInfoView } from '../../components/library/TextInfoView';
import { FolderInfoView } from '../../components/library/FolderInfoView';
import { MultiSelectInfoView } from '../../components/library/MultiSelectInfoView';

interface RightPaneProps {
  width: number;
}

export function RightPane({ width }: RightPaneProps) {
  const librarySelectedItemIds = useLibraryStore(state => state.librarySelectedItemIds);
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

  // Determine what to render based on selection
  const selectedCount = librarySelectedItemIds.size;
  const firstItemId = selectedCount > 0 ? Array.from(librarySelectedItemIds)[0] : null;

  return (
    <div
      className={cn(
        'flex flex-col bg-background overflow-y-auto',
        // Only apply focus-related classes when focus tracking is enabled
        trackingEnabled && 'focusable-pane library-right-pane',
        trackingEnabled && (showFocusUI ? 'focusable-pane--focused' : 'focusable-pane--unfocused')
      )}
      style={{ width: `${width}%` }}
      onClick={handleClick}
    >
      {selectedCount === 0 && (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <MousePointerClick className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Selection</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Select a text or folder from the library to view details and statistics.
          </p>
        </div>
      )}

      {selectedCount === 1 && firstItemId?.startsWith('text-') && (
        <TextInfoView textId={parseInt(firstItemId.replace('text-', ''))} />
      )}

      {selectedCount === 1 && firstItemId && !firstItemId.startsWith('text-') && (
        <FolderInfoView folderId={firstItemId} />
      )}

      {selectedCount > 1 && (
        <MultiSelectInfoView selectedItemIds={librarySelectedItemIds} />
      )}
    </div>
  );
}
