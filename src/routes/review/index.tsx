import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReviewConfig } from '@/lib/stores/reviewConfig';
import { useFolderStore } from '@/lib/stores/folder';
import { api } from '@/lib/utils/tauri';
import { Button } from '@/lib/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/lib/components/ui/radio-group';
import { Label } from '@/lib/components/ui/label';
import { Slider } from '@/lib/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/lib/components/ui/select';
import { FolderSelect } from '@/lib/components/folders/FolderSelect';
import { BackToReadingButton } from '@/lib/components/shared/BackToReadingButton';
import type { ReviewFilter, Text } from '@/lib/types';

export function ReviewHubPage() {
  const navigate = useNavigate();
  const { config, setFilterType, setFolder, setText, setSessionLimit } = useReviewConfig();
  const { folderTree, loadFolderTree } = useFolderStore();
  const [stats, setStats] = useState({ dueCount: 0, newCount: 0 });
  const [loading, setLoading] = useState(false);
  const [texts, setTexts] = useState<Text[]>([]);

  useEffect(() => {
    loadFolderTree();
    loadTexts();
    fetchStats();
  }, [config, folderTree.length]);

  const loadTexts = async () => {
    try {
      const loadedTexts = await api.texts.list();
      setTexts(loadedTexts);
    } catch (error) {
      console.error('Failed to load texts:', error);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const filter = buildFilter();
      const result = await api.review.getReviewStatsFiltered(filter);
      setStats({
        dueCount: result.dueCount ?? 0,
        newCount: result.newCount ?? 0
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats({ dueCount: 0, newCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  const buildFilter = (): ReviewFilter | undefined => {
    if (config.filterType === 'folder' && config.folderId) {
      return { type: 'folder', folderId: config.folderId };
    } else if (config.filterType === 'text' && config.textId) {
      return { type: 'text', textId: config.textId };
    }
    return { type: 'global' };
  };

  const getTextName = (textId: number): string => {
    const text = texts.find(t => t.id === textId);
    return text?.title || textId.toString();
  };

  const handleStartReview = () => {
    const filter = buildFilter();
    const params = new URLSearchParams({
      filter: JSON.stringify(filter),
      limit: config.sessionLimit.toString(),
    });
    navigate(`/review/session?${params}`);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b">
        <div className="container max-w-6xl mx-auto px-8 h-14 flex items-center gap-3">
          <h1 className="text-3xl font-bold">Review</h1>
          <BackToReadingButton />
        </div>
      </div>
      <div className="flex flex-col items-center px-8 pb-8 pt-6">
        <div className="w-full max-w-2xl space-y-8">

        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            What would you like to review?
          </h2>

          <RadioGroup value={config.filterType} onValueChange={(value) => setFilterType(value as 'all' | 'folder' | 'text')}>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex-1 cursor-pointer">
                  <div className="font-medium">All Cards</div>
                  <div className="text-sm text-muted-foreground">
                    {loading ? '...' : `${stats.dueCount ?? 0} cards due · ${stats.newCount ?? 0} new`}
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="folder" id="folder" />
                <Label htmlFor="folder" className="flex-1 cursor-pointer">
                  <div className="font-medium">Specific Folder</div>
                  {config.filterType === 'folder' && (
                    <div className="mt-2">
                      <FolderSelect
                        value={config.folderId ?? null}
                        onChange={(value) => value && setFolder(value)}
                        folders={folderTree}
                      />
                    </div>
                  )}
                  {config.filterType === 'folder' && config.folderId && (
                    <div className="text-sm text-muted-foreground mt-2">
                      {loading ? '...' : `${stats.dueCount ?? 0} cards due · ${stats.newCount ?? 0} new`}
                    </div>
                  )}
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="text" id="text" />
                <Label htmlFor="text" className="flex-1 cursor-pointer">
                  <div className="font-medium">Specific Text</div>
                  {config.filterType === 'text' && (
                    <div className="mt-2">
                      <Select
                        value={config.textId?.toString()}
                        onValueChange={(value) => setText(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select text...">
                            {config.textId ? getTextName(config.textId) : "Select text..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {texts.map(text => (
                            <SelectItem key={text.id} value={text.id.toString()}>
                              {text.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {config.filterType === 'text' && config.textId && (
                    <div className="text-sm text-muted-foreground mt-2">
                      {loading ? '...' : `${stats.dueCount ?? 0} cards due · ${stats.newCount ?? 0} new`}
                    </div>
                  )}
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Session Settings
          </h2>

          <div className="p-4 border rounded-lg space-y-4">
            <div>
              <Label>Cards per session: {config.sessionLimit}</Label>
              <Slider
                value={[config.sessionLimit]}
                onValueChange={([value]) => setSessionLimit(value)}
                min={10}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Limits apply only to this session
            </p>
          </div>
        </div>

        <Button
          onClick={handleStartReview}
          size="lg"
          className="w-full"
          disabled={loading || (stats.dueCount ?? 0) === 0}
        >
          Start Review ({loading ? '...' : Math.min(stats.dueCount ?? 0, config.sessionLimit)})
        </Button>
        </div>
      </div>
    </div>
  );
}
