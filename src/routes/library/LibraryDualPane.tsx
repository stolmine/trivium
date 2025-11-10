import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLibraryStore } from '../../stores/library';
import { LeftPane } from './LeftPane';
import { RightPane } from './RightPane';
import { ResizableHandle } from '../../components/library/ResizableHandle';

export function LibraryDualPane() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paneSizes = useLibraryStore((state) => state.paneSizes);
  const setPaneSize = useLibraryStore((state) => state.setPaneSize);
  const loadLibrary = useLibraryStore((state) => state.loadLibrary);
  const currentFolderId = useLibraryStore((state) => state.currentFolderId);
  const setCurrentFolder = useLibraryStore((state) => state.setCurrentFolder);
  const isInfoViewCollapsed = useLibraryStore((state) => state.isInfoViewCollapsed);

  // Load library data on mount
  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Restore last folder location from localStorage on mount
  useEffect(() => {
    const folderParam = searchParams.get('folder');

    // If no URL param but we have a persisted currentFolderId, restore it to URL
    if (!folderParam && currentFolderId) {
      setSearchParams({ folder: currentFolderId });
    }
    // If URL param exists, sync it to store
    else if (folderParam !== currentFolderId) {
      setCurrentFolder(folderParam);
    }
  }, []);

  const handleResize = (leftWidth: number) => {
    setPaneSize(leftWidth, 100 - leftWidth);
  };

  return (
    <div className="h-full flex flex-row overflow-hidden">
      <LeftPane width={isInfoViewCollapsed ? 100 : paneSizes.left} />
      {!isInfoViewCollapsed && (
        <>
          <ResizableHandle onResize={handleResize} />
          <RightPane width={paneSizes.right} />
        </>
      )}
    </div>
  );
}
