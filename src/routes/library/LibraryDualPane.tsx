import { useEffect } from 'react';
import { useLibraryStore } from '../../stores/library';
import { LeftPane } from './LeftPane';
import { RightPane } from './RightPane';
import { ResizableHandle } from '../../components/library/ResizableHandle';

export function LibraryDualPane() {
  const paneSizes = useLibraryStore((state) => state.paneSizes);
  const setPaneSize = useLibraryStore((state) => state.setPaneSize);
  const loadLibrary = useLibraryStore((state) => state.loadLibrary);

  // Load library data on mount
  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const handleResize = (leftWidth: number) => {
    setPaneSize(leftWidth, 100 - leftWidth);
  };

  return (
    <div className="h-full flex flex-row overflow-hidden">
      <LeftPane width={paneSizes.left} />
      <ResizableHandle onResize={handleResize} />
      <RightPane width={paneSizes.right} />
    </div>
  );
}
