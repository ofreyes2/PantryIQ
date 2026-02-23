import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MealType } from './mealsStore';

export interface FavoritedFood {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  netCarbs: number;
}

export interface FavoriteMeal {
  id: string;
  name: string;
  mealType: MealType;
  foods: FavoritedFood[];
  nutrition: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
    netCarbs: number;
  };
  timesLogged: number;
  createdAt: string;
  lastLoggedAt?: string;
}

interface FavoritesState {
  favorites: FavoriteMeal[];
  addFavorite: (meal: FavoriteMeal) => void;
  removeFavorite: (mealId: string) => void;
  getFavorites: () => FavoriteMeal[];
  getFavoritesByMealType: (mealType: MealType) => FavoriteMeal[];
  incrementUseCount: (mealId: string) => void;
  isFavorited: (mealId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      addFavorite: (meal) =>
        set((state) => {
          // Don't add duplicates
          if (state.favorites.some((m) => m.id === meal.id)) {
            return state;
          }
          return {
            favorites: [
              ...state.favorites,
              {
                ...meal,
                createdAt: meal.createdAt || new Date().toISOString(),
              },
            ],
          };
        }),

      removeFavorite: (mealId) =>
        set((state) => ({
          favorites: state.favorites.filter((m) => m.id !== mealId),
        })),

      getFavorites: () => get().favorites,

      getFavoritesByMealType: (mealType) =>
        get().favorites.filter((m) => m.mealType === mealType),

      incrementUseCount: (mealId) =>
        set((state) => ({
          favorites: state.favorites.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  timesLogged: (m.timesLogged || 0) + 1,
                  lastLoggedAt: new Date().toISOString(),
                }
              : m
          ),
        })),

      isFavorited: (mealId) => {
        return get().favorites.some((m) => m.id === mealId);
      },
    }),
    {
      name: 'pantryiq-favorites-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
