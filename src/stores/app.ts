import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type View = 'dashboard' | 'library' | 'read' | 'review' | 'ingest';

interface AppState {
  currentView: View;
  previousView: View | null;
  sidebarCollapsed: boolean;
  setView: (view: View) => void;
  toggleSidebar: () => void;
  goBack: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentView: 'dashboard',
      previousView: null,
      sidebarCollapsed: false,

      setView: (view: View) => {
        const currentView = get().currentView;
        set({ currentView: view, previousView: currentView });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      goBack: () => {
        const { previousView } = get();
        if (previousView) {
          set({ currentView: previousView, previousView: null });
        }
      },
    }),
    {
      name: 'trivium-app-storage',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
