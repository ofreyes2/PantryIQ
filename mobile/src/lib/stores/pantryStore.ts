import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PantryCategory =
  | 'Proteins'
  | 'Dairy'
  | 'Vegetables'
  | 'Frozen'
  | 'Pantry Staples'
  | 'Snacks'
  | 'Condiments'
  | 'Beverages'
  | 'Bread & Wraps'
  | 'Other';

export type PantryUnit = 'oz' | 'lbs' | 'count' | 'cups' | 'g' | 'kg' | 'ml' | 'L';

export interface PantryItem {
  id: string;
  name: string;
  brand?: string;
  category: PantryCategory;
  quantity: number;
  unit: PantryUnit;
  lowStockThreshold: number;
  caloriesPerServing: number;
  carbsPerServing: number;
  proteinPerServing: number;
  fatPerServing: number;
  servingSize: string;
  photoUri?: string;
  barcode?: string;
  dateAdded: string;
  expiryDate?: string;
  lastUpdated: string;
  addedBy?: string;
  restockHistory: { date: string; quantity: number }[];
}

interface PantryState {
  items: PantryItem[];
  addItem: (item: Omit<PantryItem, 'id' | 'dateAdded' | 'lastUpdated' | 'restockHistory'>) => void;
  updateItem: (id: string, updates: Partial<PantryItem>) => void;
  deleteItem: (id: string) => void;
  restockItem: (id: string, quantity: number) => void;
  getLowStockItems: () => PantryItem[];
  getItemsByCategory: (cat: string) => PantryItem[];
}

const generateId = () => `pantry-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const seedItems: PantryItem[] = [
  {
    id: 'seed-1',
    name: 'Chicken Breast',
    brand: 'Organic Valley',
    category: 'Proteins',
    quantity: 2,
    unit: 'lbs',
    lowStockThreshold: 3,
    caloriesPerServing: 165,
    carbsPerServing: 0,
    proteinPerServing: 31,
    fatPerServing: 3.6,
    servingSize: '4 oz (113g)',
    dateAdded: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    restockHistory: [],
  },
  {
    id: 'seed-2',
    name: 'Large Eggs',
    brand: 'Pete and Gerry\'s',
    category: 'Dairy',
    quantity: 12,
    unit: 'count',
    lowStockThreshold: 4,
    caloriesPerServing: 70,
    carbsPerServing: 0,
    proteinPerServing: 6,
    fatPerServing: 5,
    servingSize: '1 large egg (50g)',
    dateAdded: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    restockHistory: [],
  },
  {
    id: 'seed-3',
    name: 'Baby Spinach',
    brand: undefined,
    category: 'Vegetables',
    quantity: 1,
    unit: 'oz',
    lowStockThreshold: 3,
    caloriesPerServing: 7,
    carbsPerServing: 1,
    proteinPerServing: 0.9,
    fatPerServing: 0.1,
    servingSize: '1 cup (30g)',
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    restockHistory: [],
  },
  {
    id: 'seed-4',
    name: 'Cheddar Cheese',
    brand: 'Tillamook',
    category: 'Dairy',
    quantity: 8,
    unit: 'oz',
    lowStockThreshold: 2,
    caloriesPerServing: 110,
    carbsPerServing: 0,
    proteinPerServing: 7,
    fatPerServing: 9,
    servingSize: '1 oz (28g)',
    dateAdded: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    restockHistory: [],
  },
  {
    id: 'seed-5',
    name: 'Raw Almonds',
    brand: 'Blue Diamond',
    category: 'Snacks',
    quantity: 12,
    unit: 'oz',
    lowStockThreshold: 4,
    caloriesPerServing: 160,
    carbsPerServing: 6,
    proteinPerServing: 6,
    fatPerServing: 14,
    servingSize: '1 oz / 23 almonds (28g)',
    dateAdded: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    restockHistory: [],
  },
  {
    id: 'seed-6',
    name: 'Extra Virgin Olive Oil',
    brand: 'California Olive Ranch',
    category: 'Condiments',
    quantity: 16,
    unit: 'oz',
    lowStockThreshold: 4,
    caloriesPerServing: 120,
    carbsPerServing: 0,
    proteinPerServing: 0,
    fatPerServing: 14,
    servingSize: '1 tbsp (14g)',
    dateAdded: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    restockHistory: [],
  },
  {
    id: 'seed-7',
    name: 'Almond Flour',
    brand: 'Bob\'s Red Mill',
    category: 'Pantry Staples',
    quantity: 32,
    unit: 'oz',
    lowStockThreshold: 8,
    caloriesPerServing: 160,
    carbsPerServing: 6,
    proteinPerServing: 6,
    fatPerServing: 14,
    servingSize: '1/4 cup (28g)',
    dateAdded: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    restockHistory: [],
  },
  {
    id: 'seed-8',
    name: 'Greek Yogurt',
    brand: 'Chobani',
    category: 'Dairy',
    quantity: 2,
    unit: 'count',
    lowStockThreshold: 3,
    caloriesPerServing: 90,
    carbsPerServing: 6,
    proteinPerServing: 17,
    fatPerServing: 0,
    servingSize: '5.3 oz container (150g)',
    dateAdded: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    restockHistory: [],
  },
];

export const usePantryStore = create<PantryState>()(
  persist(
    (set, get) => ({
      items: seedItems,

      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              ...item,
              id: generateId(),
              dateAdded: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
              restockHistory: [],
            },
          ],
        })),

      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, ...updates, lastUpdated: new Date().toISOString() }
              : item
          ),
        })),

      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      restockItem: (id, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  lastUpdated: new Date().toISOString(),
                  restockHistory: [
                    ...item.restockHistory,
                    { date: new Date().toISOString(), quantity },
                  ],
                }
              : item
          ),
        })),

      getLowStockItems: () => {
        const { items } = get();
        return items.filter((item) => item.quantity <= item.lowStockThreshold);
      },

      getItemsByCategory: (cat: string) => {
        const { items } = get();
        if (cat === 'All') return items;
        return items.filter((item) => item.category === cat);
      },
    }),
    {
      name: 'pantryiq-pantry-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
