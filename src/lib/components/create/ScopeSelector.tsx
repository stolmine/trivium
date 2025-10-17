import { useEffect, useState } from 'react';
import { Library, Folder as FolderIcon, FileText } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FolderSelect } from '../folders/FolderSelect';
import { useCardCreationStore } from '../../stores/cardCreation';
import { useFolderStore } from '../../stores/folder';
import { useReadingStore } from '../../stores/reading';
import type { HubScope } from '../../types';

export function ScopeSelector() {
  const scope = useCardCreationStore((state) => state.scope);
  const selectedId = useCardCreationStore((state) => state.selectedId);
  const setScope = useCardCreationStore((state) => state.setScope);

  const folderTree = useFolderStore((state) => state.folderTree);
  const loadFolderTree = useFolderStore((state) => state.loadFolderTree);

  const texts = useReadingStore((state) => state.texts);
  const loadTexts = useReadingStore((state) => state.loadTexts);

  const [localScope, setLocalScope] = useState<HubScope>(scope);
  const [localSelectedId, setLocalSelectedId] = useState<string | number | null>(selectedId);

  useEffect(() => {
    if (scope === 'folder' && folderTree.length === 0) {
      loadFolderTree();
    }
    if (scope === 'text' && texts.length === 0) {
      loadTexts();
    }
  }, [scope, folderTree.length, texts.length, loadFolderTree, loadTexts]);

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
    if (newScope === 'library') {
      setLocalSelectedId(null);
      setScope(newScope, null);
    } else {
      setLocalSelectedId(null);
    }
  };

  const handleFolderChange = (folderId: string | null) => {
    setLocalSelectedId(folderId);
    setScope('folder', folderId);
  };

  const handleTextChange = (textId: string) => {
    const numericId = parseInt(textId, 10);
    setLocalSelectedId(numericId);
    setScope('text', numericId);
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
      const text = texts.find((t) => t.id === localSelectedId);
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
          <div className="mt-4">
            <Select
              value={localSelectedId?.toString() || undefined}
              onValueChange={handleTextChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a text..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {texts.map((text) => (
                  <SelectItem key={text.id} value={text.id.toString()}>
                    {text.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
