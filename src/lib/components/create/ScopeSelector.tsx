import { useEffect, useState, useCallback } from 'react';
import { Library, Folder as FolderIcon, FileText, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { FolderSelect } from '../folders/FolderSelect';
import { useCardCreationStore } from '../../stores/cardCreation';
import { useFolderStore } from '../../stores/folder';
import { api } from '../../utils/tauri';
import type { HubScope, Text } from '../../types';

export function ScopeSelector() {
  const scope = useCardCreationStore((state) => state.scope);
  const selectedId = useCardCreationStore((state) => state.selectedId);
  const setScope = useCardCreationStore((state) => state.setScope);

  const folderTree = useFolderStore((state) => state.folderTree);
  const loadFolderTree = useFolderStore((state) => state.loadFolderTree);

  const [localScope, setLocalScope] = useState<HubScope>(scope);
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(selectedId as string | null);
  const [textsWithMarks, setTextsWithMarks] = useState<Text[]>([]);
  const [isLoadingTexts, setIsLoadingTexts] = useState(false);
  const [textsError, setTextsError] = useState<string | null>(null);

  const handleLoadTexts = useCallback(async () => {
    console.log('[ScopeSelector] handleLoadTexts() called - loading texts with available marks');
    setIsLoadingTexts(true);
    setTextsError(null);
    try {
      console.log('[ScopeSelector] Calling api.texts.listWithAvailableMarks()...');
      const texts = await api.texts.listWithAvailableMarks();
      console.log('[ScopeSelector] Received texts with marks:', texts.length, texts);
      setTextsWithMarks(texts);
    } catch (error) {
      console.error('[ScopeSelector] Failed to load texts with marks:', error);
      setTextsError(error instanceof Error ? error.message : 'Failed to load texts with marks');
    } finally {
      setIsLoadingTexts(false);
    }
  }, []);

  useEffect(() => {
    console.log('[ScopeSelector] useEffect triggered', {
      scope,
      textsWithMarksLength: textsWithMarks.length,
      folderTreeLength: folderTree.length
    });

    if (scope === 'folder' && folderTree.length === 0) {
      console.log('[ScopeSelector] Loading folder tree...');
      loadFolderTree();
    }
    if (scope === 'text' && textsWithMarks.length === 0) {
      console.log('[ScopeSelector] Loading texts via handleLoadTexts...');
      handleLoadTexts();
    }
  }, [scope, folderTree.length, textsWithMarks.length, loadFolderTree, handleLoadTexts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          handleScopeChange('library');
        } else if (e.key === '2') {
          e.preventDefault();
          handleScopeChange('folder');
        } else if (e.key === '3') {
          e.preventDefault();
          handleScopeChange('text');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleScopeChange = (newScope: HubScope) => {
    setLocalScope(newScope);
    setLocalSelectedId(null);
    setScope(newScope, null);
  };

  const handleFolderChange = (folderId: string | null) => {
    setLocalSelectedId(folderId);
    setScope('folder', folderId);
  };

  const handleTextChange = (textId: string) => {
    setLocalSelectedId(textId);
    setScope('text', textId);
  };

  const getBreadcrumb = () => {
    if (localScope === 'library') {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Library className="h-4 w-4" />
          <span>All Library</span>
        </div>
      );
    }

    if (localScope === 'folder' && localSelectedId) {
      const findFolder = (nodes: typeof folderTree, id: string): string | null => {
        for (const node of nodes) {
          if (node.folder.id === id) {
            return node.folder.name;
          }
          if (node.children.length > 0) {
            const found = findFolder(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const folderName = findFolder(folderTree, localSelectedId as string);
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FolderIcon className="h-4 w-4" />
          <span>{folderName || 'Unknown Folder'}</span>
        </div>
      );
    }

    if (localScope === 'text' && localSelectedId) {
      const text = textsWithMarks.find((t) => t.id.toString() === localSelectedId);
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{text?.title || 'Unknown Text'}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-6 border border-border rounded-lg mb-6">
      <Label className="text-sm font-semibold mb-4 block">Scope</Label>

      <div className="space-y-4">
        <RadioGroup value={localScope} onValueChange={(value) => handleScopeChange(value as HubScope)}>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="library" id="scope-library" />
              <Label htmlFor="scope-library" className="cursor-pointer">
                <span className="flex items-center gap-2">
                  <Library className="h-4 w-4" />
                  All Library
                  <span className="text-xs text-muted-foreground">(Ctrl+1)</span>
                </span>
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <RadioGroupItem value="folder" id="scope-folder" />
              <Label htmlFor="scope-folder" className="cursor-pointer">
                <span className="flex items-center gap-2">
                  <FolderIcon className="h-4 w-4" />
                  Folder
                  <span className="text-xs text-muted-foreground">(Ctrl+2)</span>
                </span>
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <RadioGroupItem value="text" id="scope-text" />
              <Label htmlFor="scope-text" className="cursor-pointer">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Text
                  <span className="text-xs text-muted-foreground">(Ctrl+3)</span>
                </span>
              </Label>
            </div>
          </div>
        </RadioGroup>

        {localScope === 'folder' && (
          <div className="mt-4">
            <FolderSelect
              value={localSelectedId as string | null}
              onChange={handleFolderChange}
              folders={folderTree}
            />
          </div>
        )}

        {localScope === 'text' && (
          <div className="mt-4 space-y-3">
            <Select
              value={localSelectedId?.toString() || undefined}
              onValueChange={handleTextChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a text...">
                  {isLoadingTexts ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading texts...</span>
                    </span>
                  ) : localSelectedId ? (
                    textsWithMarks.find((t) => t.id.toString() === localSelectedId)?.title || 'Select a text...'
                  ) : (
                    'Select a text...'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {isLoadingTexts ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading texts...</span>
                  </div>
                ) : textsError ? (
                  <div className="px-2 py-4 space-y-3">
                    <div className="flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Failed to load texts</div>
                        <div className="text-xs mt-1">{textsError}</div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadTexts}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Retry
                    </Button>
                  </div>
                ) : textsWithMarks.length === 0 ? (
                  <div className="px-2 py-6 space-y-2 text-center">
                    <div className="flex justify-center">
                      <div className="rounded-full bg-muted p-3">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">No texts with marks available</div>
                      <div className="text-xs text-muted-foreground">
                        Create marks while reading or all marks have been converted to cards
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {textsWithMarks.map((text) => (
                      <SelectItem key={text.id} value={text.id.toString()}>
                        {text.title}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            {!isLoadingTexts && !textsError && textsWithMarks.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {textsWithMarks.length} text{textsWithMarks.length !== 1 ? 's' : ''} with marks available
              </div>
            )}
          </div>
        )}

        {getBreadcrumb() && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Selected:</span>
              {getBreadcrumb()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
