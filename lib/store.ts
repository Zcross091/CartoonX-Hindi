import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppSettingsState {
  parentalPin: string | null;
  isParentalEnabled: boolean;
  isParentalLocked: boolean;
  preferredQuality: '720p' | '1080p' | '480p';
  kidsMode: boolean;
  autoplayNext: boolean;
  volume: number;

  setParentalPin: (pin: string | null) => void;
  setParentalEnabled: (enabled: boolean) => void;
  unlockParental: (pin: string) => boolean;
  lockParental: () => void;
  setPreferredQuality: (quality: '720p' | '1080p' | '480p') => void;
  setKidsMode: (enabled: boolean) => void;
  setAutoplayNext: (enabled: boolean) => void;
  setVolume: (val: number) => void;
}

export const useSettingsStore = create<AppSettingsState>()(
  persist(
    (set, get) => ({
      parentalPin: null,
      isParentalEnabled: false,
      isParentalLocked: false,
      preferredQuality: '720p', // User selected 720p default
      kidsMode: true,
      autoplayNext: true,
      volume: 1.0,

      setParentalPin: (pin) => set({ parentalPin: pin, isParentalEnabled: !!pin }),
      setParentalEnabled: (enabled) => set({ isParentalEnabled: enabled }),
      unlockParental: (enteredPin) => {
        const { parentalPin } = get();
        if (!parentalPin || enteredPin === parentalPin) {
          set({ isParentalLocked: false });
          return true;
        }
        return false;
      },
      lockParental: () => {
        if (get().isParentalEnabled) {
          set({ isParentalLocked: true });
        }
      },
      setPreferredQuality: (quality) => set({ preferredQuality: quality }),
      setKidsMode: (kidsMode) => set({ kidsMode }),
      setAutoplayNext: (autoplayNext) => set({ autoplayNext }),
      setVolume: (volume) => set({ volume })
    }),
    {
      name: 'cartoonx-settings-store',
    }
  )
);

