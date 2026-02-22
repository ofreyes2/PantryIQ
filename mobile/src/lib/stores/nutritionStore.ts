import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MacroGoals {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbsNet: number;
  dailyFat: number;
  dailyFiber: number;
  dailyWaterOz: number;
  lastCalculated: string; // ISO date
}

export interface UserMetrics {
  weight: number;
  weightUnit: 'lbs' | 'kg';
  height: { feet: number; inches: number } | { cm: number };
  age: number;
  sex: 'male' | 'female';
  activityLevel: 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extra-active';
  goal: 'lose-aggressive' | 'lose-moderate' | 'maintain' | 'gain-muscle';
  dietType: 'keto-strict' | 'keto-moderate' | 'low-carb' | 'carnivore';
}

export interface NetCarbEntry {
  id: string;
  timestamp: number;
  ingredient: string;
  quantity: number;
  unit: string;
  totalCarbs: number;
  fiber: number;
  sugarAlcohols: number;
  netCarbs: number;
  lowCarbRating: 'low' | 'moderate' | 'high';
  source: 'usda' | 'openfood' | 'manual';
}

interface NutritionState {
  macroGoals: MacroGoals | null;
  userMetrics: UserMetrics | null;
  recentNetCarbEntries: NetCarbEntry[];

  // Actions
  setMacroGoals: (goals: MacroGoals) => void;
  setUserMetrics: (metrics: UserMetrics) => void;
  addNetCarbEntry: (entry: NetCarbEntry) => void;
  getLastTwentyEntries: () => NetCarbEntry[];
  clearMacroGoals: () => void;
}

const defaultMacroGoals: MacroGoals = {
  dailyCalories: 0,
  dailyProtein: 0,
  dailyCarbsNet: 0,
  dailyFat: 0,
  dailyFiber: 0,
  dailyWaterOz: 0,
  lastCalculated: '',
};

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      macroGoals: null,
      userMetrics: null,
      recentNetCarbEntries: [],

      setMacroGoals: (goals) =>
        set({
          macroGoals: {
            ...goals,
            lastCalculated: new Date().toISOString(),
          },
        }),

      setUserMetrics: (metrics) =>
        set({ userMetrics: metrics }),

      addNetCarbEntry: (entry) =>
        set((state) => ({
          recentNetCarbEntries: [entry, ...state.recentNetCarbEntries].slice(0, 20),
        })),

      getLastTwentyEntries: () => {
        const state = get();
        return state.recentNetCarbEntries.slice(0, 20);
      },

      clearMacroGoals: () =>
        set({
          macroGoals: null,
          userMetrics: null,
        }),
    }),
    {
      name: 'pantryiq-nutrition-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
