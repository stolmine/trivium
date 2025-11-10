import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSettingsStore } from '../lib/stores/settings';

export type FocusContext = 'sidebar' | 'library-left' | 'library-right' | 'none';

interface FocusContextState {
  activeContext: FocusContext;
  setActiveContext: (context: FocusContext) => void;
  isContextActive: (context: FocusContext) => boolean;
  resetContext: () => void;
}

/**
 * Helper function to determine if we're currently on the library page
 * Based on the current location pathname
 */
export function isLibraryPageActive(): boolean {
  return window.location.pathname === '/library';
}

/**
 * Helper function to determine if focus tracking should be active
 * Focus tracking is only active when:
 * 1. On the library page, AND
 * 2. The enableFocusTracking setting is enabled
 */
export function shouldTrackFocus(): boolean {
  const enableFocusTracking = useSettingsStore.getState().enableFocusTracking;
  return isLibraryPageActive() && enableFocusTracking;
}

export const useFocusContextStore = create<FocusContextState>()(
  persist(
    (set, get) => ({
      activeContext: 'none',

      setActiveContext: (context: FocusContext) => {
        const current = get().activeContext;
        if (current !== context) {
          console.log('[FocusContext] Switching from', current, 'to', context);
          set({ activeContext: context });
        }
      },

      isContextActive: (context: FocusContext) => {
        return get().activeContext === context;
      },

      resetContext: () => {
        set({ activeContext: 'none' });
      },
    }),
    {
      name: 'trivium-focus-context-storage',
      partialize: (state) => ({
        activeContext: state.activeContext,
      }),
    }
  )
);
