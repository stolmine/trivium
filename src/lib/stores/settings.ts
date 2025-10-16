import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  linksEnabled: boolean;
  toggleLinks: () => void;
  setLinksEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      linksEnabled: false,

      toggleLinks: () => {
        set((state) => ({ linksEnabled: !state.linksEnabled }));
      },

      setLinksEnabled: (enabled: boolean) => {
        set({ linksEnabled: enabled });
      },
    }),
    {
      name: 'trivium-settings-storage',
    }
  )
);
