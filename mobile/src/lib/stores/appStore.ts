import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  name: string;
  age: number | null;
  height: { feet: number; inches: number } | null;
  dailyCarbGoal: number;
  dailyCalorieGoal: number;
  targetWeight: number | null;
  startingWeight: number | null;
  avatarUri: string | null;
  claudeApiKey: string;
  usdaApiKey: string;
}

export interface AppSettings {
  darkMode: boolean;
  units: 'imperial' | 'metric';
  notifications: boolean;
}

export interface StreakData {
  current: number;
  longest: number;
  lastLogDate: string | null;
}

interface AppState {
  userProfile: UserProfile;
  settings: AppSettings;
  onboardingComplete: boolean;
  streak: StreakData;

  // Actions
  setUserProfile: (profile: Partial<UserProfile>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setOnboardingComplete: (complete: boolean) => void;
  updateStreak: (streak: Partial<StreakData>) => void;
}

const defaultUserProfile: UserProfile = {
  name: '',
  age: null,
  height: null,
  dailyCarbGoal: 50,
  dailyCalorieGoal: 1800,
  targetWeight: null,
  startingWeight: null,
  avatarUri: null,
  claudeApiKey: '',
  usdaApiKey: '',
};

const defaultSettings: AppSettings = {
  darkMode: true,
  units: 'imperial',
  notifications: true,
};

const defaultStreak: StreakData = {
  current: 0,
  longest: 0,
  lastLogDate: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userProfile: defaultUserProfile,
      settings: defaultSettings,
      onboardingComplete: false,
      streak: defaultStreak,

      setUserProfile: (profile) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
        })),

      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      setOnboardingComplete: (complete) =>
        set({ onboardingComplete: complete }),

      updateStreak: (streak) =>
        set((state) => ({
          streak: { ...state.streak, ...streak },
        })),
    }),
    {
      name: 'pantryiq-app-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/**
 * Hydrate the app store from AsyncStorage
 * Call this on app startup to restore persisted state
 */
export async function hydrateAppStore(): Promise<void> {
  try {
    await useAppStore.persist.rehydrate();
  } catch (error) {
    console.warn('Failed to hydrate app store:', error);
  }
}
