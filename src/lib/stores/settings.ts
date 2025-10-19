import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

interface SettingsState {
  linksEnabled: boolean;
  toggleLinks: () => void;
  setLinksEnabled: (enabled: boolean) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  flashcardSidebarCollapsed: boolean;
  setFlashcardSidebarCollapsed: (collapsed: boolean) => void;
  defaultLinksVisible: boolean;
  setDefaultLinksVisible: (visible: boolean) => void;
  databaseSize: number;
  setDatabaseSize: (size: number) => void;
  loadDatabaseSize: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      linksEnabled: false,
      fontSize: 1.25,
      flashcardSidebarCollapsed: false,
      defaultLinksVisible: false,
      databaseSize: 0,

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

      setDefaultLinksVisible: (visible: boolean) => {
        set({ defaultLinksVisible: visible });
      },

      setDatabaseSize: (size: number) => {
        set({ databaseSize: size });
      },

      loadDatabaseSize: async () => {
        try {
          const size = await invoke<number>('get_database_size');
          set({ databaseSize: size });
        } catch (error) {
          console.error('Failed to load database size:', error);
        }
      },
    }),
    {
      name: 'trivium-settings-storage',
    }
  )
);
