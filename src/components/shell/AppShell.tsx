import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ShortcutHelp } from '../shared/ShortcutHelp';
import { useGlobalShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAppStore } from '../../stores/app';

export function AppShell() {
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const { toggleSidebar } = useAppStore();

  const shortcuts = useGlobalShortcuts(
    toggleSidebar,
    () => setShowShortcutHelp(true)
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <ShortcutHelp
        shortcuts={shortcuts}
        open={showShortcutHelp}
        onClose={() => setShowShortcutHelp(false)}
      />
    </div>
  );
}
