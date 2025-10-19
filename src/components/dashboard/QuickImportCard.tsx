import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { Button } from '../../lib/components/ui';
import { Input } from '../../lib/components/ui/input';
import { Label } from '../../lib/components/ui/label';
import { FolderSelect } from '@/lib/components/folders/FolderSelect';
import { useFolderStore } from '../../lib/stores/folder';

export function QuickImportCard() {
  const navigate = useNavigate();
  const { folderTree, loadFolderTree } = useFolderStore();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [wikipediaUrl, setWikipediaUrl] = useState('');

  useEffect(() => {
    loadFolderTree();
  }, [loadFolderTree]);

  const handleImport = () => {
    navigate('/ingest', {
      state: {
        wikipediaUrl: wikipediaUrl || undefined,
        selectedFolderId: selectedFolderId || undefined,
      },
    });
  };

  const handleJustImport = () => {
    navigate('/ingest');
  };

  return (
    <div className="border rounded-lg p-8 shadow-card bg-card">
      <div className="flex items-center gap-3 mb-6">
        <Download className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Quick Ingest</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Start ingesting content with optional pre-filled folder or Wikipedia link
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="quick-folder">Folder (Optional)</Label>
          <FolderSelect
            value={selectedFolderId}
            onChange={setSelectedFolderId}
            folders={folderTree}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quick-wiki-url">Wikipedia URL (Optional)</Label>
          <Input
            id="quick-wiki-url"
            value={wikipediaUrl}
            onChange={(e) => setWikipediaUrl(e.target.value)}
            placeholder="https://en.wikipedia.org/wiki/..."
          />
        </div>

        <div className="space-y-2 pt-2">
          <Button onClick={handleImport} className="w-full">
            Ingest with Settings
          </Button>
          <Button onClick={handleJustImport} variant="ghost" className="w-full">
            Just Ingest
          </Button>
        </div>
      </div>
    </div>
  );
}
