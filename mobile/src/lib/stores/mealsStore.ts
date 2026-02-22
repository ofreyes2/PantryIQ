import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePantryStore } from './pantryStore';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';

export interface FoodEntry {
  id: string;
  name: string;
  brand?: string;
  mealType: MealType;
  date: string; // YYYY-MM-DD
  servings: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  netCarbs: number;
  photoUri?: string;
  pantryItemId?: string;
  isFavorite: boolean;
}

export interface WaterEntry {
  date: string;
  glasses: number;
}

export interface DailyTotals {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  netCarbs: number;
  fiber: number;
}

interface MealsState {
  entries: FoodEntry[];
  waterIntake: WaterEntry[];
  addEntry: (entry: Omit<FoodEntry, 'id'>) => void;
  updateEntry: (id: string, updates: Partial<FoodEntry>) => void;
  deleteEntry: (id: string) => void;
  getEntriesForDate: (date: string) => FoodEntry[];
  toggleFavorite: (id: string) => void;
  getFavorites: () => FoodEntry[];
  logWater: (date: string) => void;
  removeWaterEntry: (date: string) => void;
  getWaterForDate: (date: string) => number;
  getDailyTotals: (date: string) => DailyTotals;
}

const generateId = () => `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const todayStr = new Date().toISOString().split('T')[0];
const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

const seedEntries: FoodEntry[] = [
  {
    id: 'meal-seed-1',
    name: 'Scrambled Eggs',
    brand: undefined,
    mealType: 'Breakfast',
    date: todayStr,
    servings: 2,
    calories: 140,
    carbs: 1,
    protein: 12,
    fat: 10,
    fiber: 0,
    netCarbs: 1,
    isFavorite: true,
  },
  {
    id: 'meal-seed-2',
    name: 'Avocado',
    brand: undefined,
    mealType: 'Breakfast',
    date: todayStr,
    servings: 1,
    calories: 160,
    carbs: 9,
    protein: 2,
    fat: 15,
    fiber: 7,
    netCarbs: 2,
    isFavorite: false,
  },
  {
    id: 'meal-seed-3',
    name: 'Grilled Chicken Salad',
    brand: undefined,
    mealType: 'Lunch',
    date: todayStr,
    servings: 1,
    calories: 380,
    carbs: 12,
    protein: 42,
    fat: 16,
    fiber: 4,
    netCarbs: 8,
    isFavorite: true,
  },
  {
    id: 'meal-seed-4',
    name: 'Greek Yogurt',
    brand: 'Chobani',
    mealType: 'Snacks',
    date: todayStr,
    servings: 1,
    calories: 90,
    carbs: 6,
    protein: 17,
    fat: 0,
    fiber: 0,
    netCarbs: 6,
    isFavorite: false,
  },
  {
    id: 'meal-seed-5',
    name: 'Salmon with Asparagus',
    brand: undefined,
    mealType: 'Dinner',
    date: todayStr,
    servings: 1,
    calories: 420,
    carbs: 8,
    protein: 38,
    fat: 24,
    fiber: 3,
    netCarbs: 5,
    isFavorite: true,
  },
  {
    id: 'meal-seed-6',
    name: 'Bulletproof Coffee',
    brand: undefined,
    mealType: 'Breakfast',
    date: yesterdayStr,
    servings: 1,
    calories: 230,
    carbs: 0,
    protein: 0,
    fat: 26,
    fiber: 0,
    netCarbs: 0,
    isFavorite: true,
  },
  {
    id: 'meal-seed-7',
    name: 'Keto Chicken Bowl',
    brand: undefined,
    mealType: 'Lunch',
    date: yesterdayStr,
    servings: 1,
    calories: 510,
    carbs: 15,
    protein: 44,
    fat: 28,
    fiber: 5,
    netCarbs: 10,
    isFavorite: false,
  },
  {
    id: 'meal-seed-8',
    name: 'Almonds',
    brand: 'Blue Diamond',
    mealType: 'Snacks',
    date: yesterdayStr,
    servings: 1,
    calories: 160,
    carbs: 6,
    protein: 6,
    fat: 14,
    fiber: 3,
    netCarbs: 3,
    isFavorite: false,
  },
];

export const useMealsStore = create<MealsState>()(
  persist(
    (set, get) => ({
      entries: seedEntries,
      waterIntake: [
        { date: todayStr, glasses: 5 },
        { date: yesterdayStr, glasses: 8 },
      ],

      addEntry: (entry) => {
        set((state) => ({
          entries: [
            ...state.entries,
            { ...entry, id: generateId() },
          ],
        }));
        // Deduct from pantry inventory if linked to a pantry item
        if (entry.pantryItemId) {
          usePantryStore.getState().deductServings(entry.pantryItemId, entry.servings);
        }
      },

      updateEntry: (id, updates) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),

      deleteEntry: (id) => {
        // Find the entry before deleting to potentially restore inventory
        const entry = get().entries.find((e) => e.id === id);
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        }));
        // Re-stock pantry if the entry was linked (restore the servings)
        if (entry?.pantryItemId) {
          const pantryStore = usePantryStore.getState();
          const pantryItem = pantryStore.items.find((i) => i.id === entry.pantryItemId);
          if (pantryItem) {
            const spc = pantryItem.servingsPerContainer && pantryItem.servingsPerContainer > 0 ? pantryItem.servingsPerContainer : 1;
            const restoration = entry.servings / spc;
            pantryStore.updateItem(entry.pantryItemId, {
              quantity: Math.round((pantryItem.quantity + restoration) * 1000) / 1000,
            });
          }
        }
      },

      getEntriesForDate: (date: string) => {
        return get().entries.filter((e) => e.date === date);
      },

      toggleFavorite: (id) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, isFavorite: !e.isFavorite } : e
          ),
        })),

      getFavorites: () => {
        return get().entries.filter((e) => e.isFavorite);
      },

      logWater: (date: string) =>
        set((state) => {
          const existing = state.waterIntake.find((w) => w.date === date);
          if (existing) {
            return {
              waterIntake: state.waterIntake.map((w) =>
                w.date === date ? { ...w, glasses: w.glasses + 1 } : w
              ),
            };
          }
          return {
            waterIntake: [...state.waterIntake, { date, glasses: 1 }],
          };
        }),

      removeWaterEntry: (date: string) =>
        set((state) => ({
          waterIntake: state.waterIntake.map((w) =>
            w.date === date ? { ...w, glasses: Math.max(0, w.glasses - 1) } : w
          ),
        })),

      getWaterForDate: (date: string) => {
        const entry = get().waterIntake.find((w) => w.date === date);
        return entry?.glasses ?? 0;
      },

      getDailyTotals: (date: string): DailyTotals => {
        const entries = get().entries.filter((e) => e.date === date);
        return entries.reduce(
          (totals, entry) => ({
            calories: totals.calories + entry.calories * entry.servings,
            carbs: totals.carbs + entry.carbs * entry.servings,
            protein: totals.protein + entry.protein * entry.servings,
            fat: totals.fat + entry.fat * entry.servings,
            netCarbs: totals.netCarbs + entry.netCarbs * entry.servings,
            fiber: totals.fiber + entry.fiber * entry.servings,
          }),
          { calories: 0, carbs: 0, protein: 0, fat: 0, netCarbs: 0, fiber: 0 }
        );
      },
    }),
    {
      name: 'pantryiq-meals-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/**
 * Hydrate the meals store from AsyncStorage
 * Call this on app startup to restore persisted state
 */
export async function hydrateMealsStore(): Promise<void> {
  try {
    await useMealsStore.persist.rehydrate();
  } catch (error) {
    console.warn('Failed to hydrate meals store:', error);
  }
}
