import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { useSettingsStore } from '../../stores/settings';
import { useLibraryStore } from '../../../stores/library';
import { api } from '../../utils/tauri';

export function DefaultsSection() {
  const { defaultLinksVisible, setDefaultLinksVisible } = useSettingsStore();
  const syncSidebarSelection = useLibraryStore((state) => state.syncSidebarSelection);
  const toggleSyncSidebarSelection = useLibraryStore((state) => state.toggleSyncSidebarSelection);

  const handleLinksVisibleToggle = async (checked: boolean) => {
    try {
      await api.settings.updateSetting('defaultLinksVisible', String(checked));
      setDefaultLinksVisible(checked);
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Default Settings</h2>
        <div className="h-px bg-border mb-6" />
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="space-y-1">
          <Label htmlFor="links-visible" className="cursor-pointer">
            Links Visible in Reading View
          </Label>
          <p className="text-sm text-muted-foreground">
            Show Wikipedia links by default when reading texts
          </p>
        </div>
        <Switch
          id="links-visible"
          checked={defaultLinksVisible}
          onCheckedChange={handleLinksVisibleToggle}
          aria-label="Toggle links visibility in reading view"
        />
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="space-y-1">
          <Label htmlFor="sync-sidebar" className="cursor-pointer">
            Sync Library and Sidebar Selection
          </Label>
          <p className="text-sm text-muted-foreground">
            When enabled, selecting items in the library page will update the sidebar navigation
          </p>
        </div>
        <Switch
          id="sync-sidebar"
          checked={syncSidebarSelection}
          onCheckedChange={toggleSyncSidebarSelection}
          aria-label="Toggle library and sidebar selection sync"
        />
      </div>
    </div>
  );
}
