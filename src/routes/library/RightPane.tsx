import { useLibraryStore } from '../../stores/library';
import { FileText, Folder } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RightPaneProps {
  width: number;
}

export function RightPane({ width }: RightPaneProps) {
  const { selectedItemId, folders, texts } = useLibraryStore();

  if (!selectedItemId) {
    return (
      <div
        className={cn('flex flex-col bg-background')}
        style={{ width: `${width}%` }}
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

  const folder = folders.find((f) => f.id === selectedItemId);
  const text = texts.find((t) => String(t.id) === selectedItemId);

  const selectedItem = folder || text;
  const isFolder = !!folder;

  if (!selectedItem) {
    return (
      <div
        className={cn('flex flex-col bg-background')}
        style={{ width: `${width}%` }}
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
      className={cn('flex flex-col bg-background')}
      style={{ width: `${width}%` }}
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
