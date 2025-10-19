import { useState, useEffect } from 'react';
import { Download, RefreshCw, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { useSettingsStore } from '../../stores/settings';
import { api } from '../../utils/tauri';
import { formatBytes } from '../../utils/format';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { useLibraryStore } from '../../../stores/library';

export function DatabaseSection() {
  const { databaseSize, loadDatabaseSize } = useSettingsStore();
  const { loadLibrary } = useLibraryStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

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

  const handleImportClick = () => {
    setShowImportDialog(true);
    setImportError(null);
    setImportSuccess(false);
  };

  const handleImportConfirm = async () => {
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(false);

    try {
      const result = await api.settings.importDatabase();
      setImportSuccess(true);
      await loadLibrary();
      await loadDatabaseSize();
      console.log(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('cancelled')) {
        setShowImportDialog(false);
      } else {
        setImportError(errorMessage);
      }
      console.error('Failed to import database:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseImportDialog = () => {
    setShowImportDialog(false);
    setImportError(null);
    setImportSuccess(false);
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

        <div className="flex items-center justify-between py-4">
          <div className="space-y-1">
            <Label>Import Database</Label>
            <p className="text-sm text-muted-foreground">
              Replace your current database with a backup file
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleImportClick}
            disabled={isImporting}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </div>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {importSuccess ? 'Import Successful' : 'Import Database'}
            </DialogTitle>
          </DialogHeader>

          {!importSuccess && !importError && (
            <div className="space-y-4 py-4">
              <DialogDescription>
                This will replace your current database with the imported file.
              </DialogDescription>

              <div className="space-y-2 text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-500">
                  Important:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>An automatic backup will be created before import</li>
                  <li>We recommend exporting your current database first</li>
                  <li>All current data will be replaced</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </div>
          )}

          {importSuccess && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Database imported successfully. Please restart the application for all changes to take effect.
              </p>
            </div>
          )}

          {importError && (
            <div className="py-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                {importError}
              </p>
            </div>
          )}

          <DialogFooter>
            {!importSuccess && !importError && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseImportDialog}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleImportConfirm}
                  disabled={isImporting}
                  variant="default"
                >
                  {isImporting ? 'Importing...' : 'Import'}
                </Button>
              </>
            )}

            {(importSuccess || importError) && (
              <Button
                type="button"
                onClick={handleCloseImportDialog}
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
