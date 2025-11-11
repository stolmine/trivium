import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/lib/components/ui/dialog';
import { Button } from '@/lib/components/ui/button';
import { Label } from '@/lib/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/lib/components/ui/radio-group';
import { FileText, Download, Folder } from 'lucide-react';
import { useLibraryStore } from '@/stores/library';
import { invoke } from '@tauri-apps/api/core';
import type { Text } from '@/lib/types/article';
import type { Folder as FolderType } from '@/lib/types/folder';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportFormat = 'markdown' | 'plain';

interface ExportResult {
  successCount: number;
  failureCount: number;
  exportedFiles: string[];
  errors: string[];
}

// Recursively collect all texts from a folder and its subfolders
function collectTextsFromFolders(
  folders: FolderType[],
  texts: Text[],
  selectedFolderIds: string[]
): Text[] {
  const result: Text[] = [];

  // Helper to recursively collect descendant folder IDs
  const collectDescendantFolders = (folderId: string): Set<string> => {
    const descendants = new Set<string>([folderId]);
    const children = folders.filter(f => f.parentId === folderId);
    for (const child of children) {
      const childDescendants = collectDescendantFolders(child.id);
      childDescendants.forEach(id => descendants.add(id));
    }
    return descendants;
  };

  // Collect all folder IDs (selected + descendants)
  const allFolderIds = new Set<string>();
  for (const folderId of selectedFolderIds) {
    const descendants = collectDescendantFolders(folderId);
    descendants.forEach(id => allFolderIds.add(id));
  }

  // Collect all texts from these folders
  for (const text of texts) {
    if (text.folderId && allFolderIds.has(text.folderId)) {
      result.push(text);
    }
  }

  return result;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [isExporting, setIsExporting] = useState(false);
  const getSelectedLibraryItems = useLibraryStore((state) => state.getSelectedLibraryItems);
  const folders = useLibraryStore((state) => state.folders);
  const texts = useLibraryStore((state) => state.texts);

  const { folders: selectedFolders, texts: selectedTexts } = getSelectedLibraryItems();

  // Collect all texts: directly selected + texts from selected folders (recursive)
  const allTextsToExport = useMemo(() => {
    const textsFromFolders = collectTextsFromFolders(
      folders,
      texts,
      selectedFolders.map(f => f.id)
    );

    // Combine and deduplicate
    const textIdSet = new Set<number>();
    const result: Text[] = [];

    // Add directly selected texts
    for (const text of selectedTexts) {
      if (!textIdSet.has(text.id)) {
        textIdSet.add(text.id);
        result.push(text);
      }
    }

    // Add texts from folders
    for (const text of textsFromFolders) {
      if (!textIdSet.has(text.id)) {
        textIdSet.add(text.id);
        result.push(text);
      }
    }

    return result;
  }, [selectedTexts, selectedFolders, folders, texts]);

  const folderCount = selectedFolders.length;
  const textCount = allTextsToExport.length;

  const handleExport = async () => {
    if (allTextsToExport.length === 0) return;

    setIsExporting(true);
    try {
      const textIds = allTextsToExport.map(t => t.id);

      const result = await invoke<ExportResult>('export_texts', { textIds, format });

      onOpenChange(false);

      if (result.failureCount > 0) {
        console.warn(`Export completed with ${result.failureCount} failures:`, result.errors);
        alert(`Export completed with errors. ${result.successCount} succeeded, ${result.failureCount} failed.`);
      } else {
        console.log(`Successfully exported ${result.successCount} texts`);
      }
    } catch (error) {
      console.error('Failed to export texts:', error);
      if (error === 'No directory selected') {
        onOpenChange(false);
      } else {
        alert(`Failed to export texts: ${error}`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {textCount} {textCount === 1 ? 'Text' : 'Texts'}
          </DialogTitle>
          <DialogDescription>
            {folderCount > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <span>Including texts from {folderCount} {folderCount === 1 ? 'folder' : 'folders'}.</span>
              </div>
            )}
            Choose an export format. A folder picker will appear to select the destination.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="markdown" id="markdown" />
                <Label htmlFor="markdown" className="font-normal cursor-pointer">
                  <div className="space-y-1">
                    <div className="font-medium">Markdown (.md)</div>
                    <div className="text-sm text-muted-foreground">
                      Preserve formatting with markdown syntax
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="plain" id="plain" />
                <Label htmlFor="plain" className="font-normal cursor-pointer">
                  <div className="space-y-1">
                    <div className="font-medium">Plain Text (.txt)</div>
                    <div className="text-sm text-muted-foreground">
                      Export as plain text without formatting
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {(textCount > 0 || folderCount > 0) && (
            <div className="p-3 bg-muted/50 rounded-md space-y-2">
              {folderCount > 0 && (
                <div className="flex items-start gap-2">
                  <Folder className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {folderCount} {folderCount === 1 ? 'folder' : 'folders'} selected (texts will be exported recursively)
                  </p>
                </div>
              )}
              {textCount > 0 && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {textCount} {textCount === 1 ? 'text' : 'texts'} will be exported as individual files
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-md">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              After clicking Export, a folder picker will appear to choose the destination.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || textCount === 0}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
