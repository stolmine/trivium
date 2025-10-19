import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  linksEnabled: boolean;
  toggleLinks: () => void;
  setLinksEnabled: (enabled: boolean) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  flashcardSidebarCollapsed: boolean;
  setFlashcardSidebarCollapsed: (collapsed: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      linksEnabled: false,
      fontSize: 1.25,
      flashcardSidebarCollapsed: false,

      toggleLinks: () => {
        set((state) => ({ linksEnabled: !state.linksEnabled }));
      },

      setLinksEnabled: (enabled: boolean) => {
        set({ linksEnabled: enabled });
      },

      setFontSize: (size: number) => {
        set({ fontSize: size });
      },

      setFlashcardSidebarCollapsed: (collapsed: boolean) => {
        set({ flashcardSidebarCollapsed: collapsed });
      },
    }),
    {
      name: 'trivium-settings-storage',
    }
  )
);
