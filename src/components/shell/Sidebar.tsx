import { Home, Library, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../stores/app';
import { Button } from '../../lib/components/ui';
import { SIDEBAR_WIDTH, getTransitionStyle, shouldReduceMotion } from '../../lib/animations';
import { cn } from '../../lib/utils';
import { LibraryTree } from '../library/LibraryTree';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
  { id: 'library', label: 'Library', icon: Library, path: '/library' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  const width = sidebarCollapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded;
  const transitionStyle = shouldReduceMotion() ? {} : getTransitionStyle('width', 300);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        shouldReduceMotion() ? '' : 'transition-all duration-300'
      )}
      style={{ width: `${width}px`, ...transitionStyle }}
    >
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
        {!sidebarCollapsed && (
          <h1 className="text-lg font-bold tracking-wide">TRIVIUM</h1>
        )}
        {sidebarCollapsed && (
          <span className="text-lg font-bold">T</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 flex flex-col" role="navigation" aria-label="Main navigation">
        <ul className="space-y-1 px-2 mb-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex-1 overflow-y-auto">
          <LibraryTree collapsed={sidebarCollapsed} />
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="w-full"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>
    </aside>
  );
}
