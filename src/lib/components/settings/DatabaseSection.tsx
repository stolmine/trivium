import { useState, useEffect } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { useSettingsStore } from '../../stores/settings';
import { api } from '../../utils/tauri';
import { formatBytes } from '../../utils/format';

export function DatabaseSection() {
  const { databaseSize, loadDatabaseSize } = useSettingsStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDatabaseSize();
  }, [loadDatabaseSize]);

  const handleRefreshSize = async () => {
    setIsRefreshing(true);
    try {
      await loadDatabaseSize();
    } catch (error) {
      console.error('Failed to refresh database size:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await api.settings.exportDatabase();
    } catch (error) {
      console.error('Failed to export database:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Database Management</h2>
        <div className="h-px bg-border mb-6" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-4">
          <div className="space-y-1">
            <Label>Database Size</Label>
            <p className="text-sm text-muted-foreground">
              Current size of your database
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium tabular-nums">
              {formatBytes(databaseSize)}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefreshSize}
              disabled={isRefreshing}
              aria-label="Refresh database size"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between py-4">
          <div className="space-y-1">
            <Label>Export Database</Label>
            <p className="text-sm text-muted-foreground">
              Save a copy of your database to a file
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>
    </div>
  );
}
