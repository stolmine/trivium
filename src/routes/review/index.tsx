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
  const { config, setFilterType, setFolder, setText, setSessionLimit, setReviewOrder } = useReviewConfig();
  const { folderTree, loadFolderTree } = useFolderStore();
  const [stats, setStats] = useState({ dueCount: 0, newCount: 0 });
  const [loading, setLoading] = useState(false);
  const [texts, setTexts] = useState<Text[]>([]);
  const [localLimit, setLocalLimit] = useState(config.sessionLimit);

  useEffect(() => {
    loadFolderTree();
    loadTexts();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [config.filterType, config.folderId, config.textId]);

  useEffect(() => {
    setLocalLimit(config.sessionLimit);
  }, [config.sessionLimit]);

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

  const buildFilter = (): ReviewFilter => {
    if (config.filterType === 'folder' && config.folderId) {
      return { type: 'folder', folderId: config.folderId };
    } else if (config.filterType === 'text' && config.textId) {
      return { type: 'text', textId: config.textId };
    }
    return { type: 'global' };
  };

  const buildSessionFilter = (): ReviewFilter | undefined => {
    if (config.filterType === 'folder' && config.folderId) {
      return { type: 'folder', folderId: config.folderId };
    } else if (config.filterType === 'text' && config.textId) {
      return { type: 'text', textId: config.textId };
    }
    // Return undefined for "All Cards" to bypass daily limits and use only session limit
    return undefined;
  };

  const getTextName = (textId: number): string => {
    const text = texts.find(t => t.id === textId);
    return text?.title || textId.toString();
  };

  const handleStartReview = () => {
    const filter = buildSessionFilter();
    const params = new URLSearchParams();
    if (filter) {
      params.set('filter', JSON.stringify(filter));
    }
    params.set('limit', config.sessionLimit.toString());
    navigate(`/review/session?${params}`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="container max-w-6xl mx-auto px-8 h-14 flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">Review</h1>
          <BackToReadingButton />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="flex flex-col items-center px-8 pb-8 pt-6">
        <div className="w-full max-w-2xl space-y-8">

        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            What would you like to review?
          </h2>

          <RadioGroup value={config.filterType} onValueChange={(value) => setFilterType(value as 'all' | 'folder' | 'text')}>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 p-4 border border-border rounded-lg bg-card">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex-1 cursor-pointer">
                  <div className="font-medium">All Cards</div>
                  <div className="text-sm text-muted-foreground">
                    {loading ? '...' : `${stats.dueCount ?? 0} cards due · ${stats.newCount ?? 0} new`}
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-4 border border-border rounded-lg bg-card">
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

              <div className="flex items-center space-x-2 p-4 border border-border rounded-lg bg-card">
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

          <div className="p-4 border border-border rounded-lg bg-card space-y-4">
            <div>
              <Label>Cards per session: {localLimit}</Label>
              <Slider
                value={[localLimit]}
                onValueChange={([value]) => setLocalLimit(value)}
                onValueCommit={([value]) => setSessionLimit(value)}
                min={10}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Review Order</Label>
              <Select value={config.reviewOrder} onValueChange={(value) => setReviewOrder(value as 'random' | 'creation')}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Random</SelectItem>
                  <SelectItem value="creation">Creation Order (Oldest First)</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  );
}
