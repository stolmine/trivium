import { useLibraryStore } from '../../stores/library';
import { MousePointerClick } from 'lucide-react';
import { TextInfoView } from '../../components/library/TextInfoView';
import { FolderInfoView } from '../../components/library/FolderInfoView';
import { MultiSelectInfoView } from '../../components/library/MultiSelectInfoView';
import { TextPreviewView } from '../../components/library/TextPreviewView';

interface RightPaneProps {
  width: number;
}

export function RightPane({ width }: RightPaneProps) {
  const librarySelectedItemIds = useLibraryStore(state => state.librarySelectedItemIds);

  // Determine what to render based on selection
  const selectedCount = librarySelectedItemIds.size;
  const firstItemId = selectedCount > 0 ? Array.from(librarySelectedItemIds)[0] : null;

  return (
    <div
      className="flex flex-col bg-background"
      style={{ width: `${width}%` }}
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
        <div className="flex flex-col h-full overflow-y-auto">
          <TextInfoView textId={parseInt(firstItemId.replace('text-', ''))} />
          <TextPreviewView textId={parseInt(firstItemId.replace('text-', ''))} />
        </div>
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
