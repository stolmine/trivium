import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { type ThemeMode, initializeTheme } from '../utils/theme';

export interface CustomColors {
  light: Record<string, string>;
  dark: Record<string, string>;
}

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
  enableFocusTracking: boolean;
  setEnableFocusTracking: (enabled: boolean) => void;
  showLibraryControlsInSidebar: boolean;
  setShowLibraryControlsInSidebar: (show: boolean) => void;
  databaseSize: number;
  setDatabaseSize: (size: number) => void;
  loadDatabaseSize: () => Promise<void>;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  customColors: CustomColors;
  setCustomColors: (colors: CustomColors) => void;
  initTheme: () => () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      linksEnabled: false,
      fontSize: 1.25,
      flashcardSidebarCollapsed: false,
      defaultLinksVisible: false,
      enableFocusTracking: false,
      showLibraryControlsInSidebar: true,
      databaseSize: 0,
      themeMode: 'adaptive',
      customColors: {
        light: {},
        dark: {},
      },

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

      setEnableFocusTracking: (enabled: boolean) => {
        set({ enableFocusTracking: enabled });
      },

      setShowLibraryControlsInSidebar: (show: boolean) => {
        set({ showLibraryControlsInSidebar: show });
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

      setThemeMode: (mode: ThemeMode) => {
        console.log('[Settings Store] setThemeMode called with mode:', mode);
        console.log('[Settings Store] Current state before update:', get().themeMode);
        set({ themeMode: mode });
        console.log('[Settings Store] State updated to:', get().themeMode);
        console.log('[Settings Store] Calling initializeTheme with mode:', mode);
        initializeTheme(mode);
        console.log('[Settings Store] initializeTheme completed');
      },

      setCustomColors: (colors: CustomColors) => {
        set({ customColors: colors });
        // TODO: Apply custom colors when theme customization is implemented
      },

      initTheme: () => {
        const { themeMode } = get();
        return initializeTheme(themeMode);
      },
    }),
    {
      name: 'trivium-settings-storage',
    }
  )
);
