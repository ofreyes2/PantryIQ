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

export type InventoryUnit =
  | 'loaf'
  | 'dozen'
  | 'package'
  | 'bag'
  | 'bottle'
  | 'can'
  | 'box'
  | 'lb'
  | 'oz'
  | 'count'
  | 'other';

export type ServingUnit =
  | 'slice'
  | 'egg'
  | 'strip'
  | 'piece'
  | 'cup'
  | 'oz'
  | 'tbsp'
  | 'tsp'
  | 'g'
  | 'ml'
  | 'serving'
  | '1/2 cup'
  | '1/3 cup'
  | '1/4 cup'
  | '1/2 tsp'
  | '1/3 tsp'
  | '1/4 tsp'
  | '1 tbsp'
  | '2 tbsp'
  | '1/2 tbsp';

export interface PantryItem {
  id: string;
  name: string;
  brand?: string;
  category: PantryCategory;
  quantity: number;
  unit: PantryUnit;
  inventoryUnit: InventoryUnit;
  servingUnit: ServingUnit;
  servingsPerContainer: number;
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
  locationId?: string;
  subZoneId?: string;
  specificSpot?: string;
}

interface PantryState {
  items: PantryItem[];
  addItem: (item: Omit<PantryItem, 'id' | 'dateAdded' | 'lastUpdated' | 'restockHistory'>) => void;
  updateItem: (id: string, updates: Partial<PantryItem>) => void;
  deleteItem: (id: string) => void;
  restockItem: (id: string, quantity: number) => void;
  deductServings: (id: string, servings: number) => void;
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
    unit: 'count',
    inventoryUnit: 'lb',
    servingUnit: 'oz',
    servingsPerContainer: 4,
    lowStockThreshold: 3,
    caloriesPerServing: 165,
    carbsPerServing: 0,
    proteinPerServing: 31,
    fatPerServing: 3.6,
    servingSize: '4 oz (113g)',
    dateAdded: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    restockHistory: [],
    locationId: 'loc-1',
    subZoneId: 'Lower Shelf',
  },
  {
    id: 'seed-2',
    name: 'Large Eggs',
    brand: "Pete and Gerry's",
    category: 'Dairy',
    quantity: 12,
    unit: 'count',
    inventoryUnit: 'dozen',
    servingUnit: 'egg',
    servingsPerContainer: 12,
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
    locationId: 'loc-1',
    subZoneId: 'Middle Shelf',
  },
  {
    id: 'seed-3',
    name: 'Baby Spinach',
    brand: undefined,
    category: 'Vegetables',
    quantity: 1,
    unit: 'count',
    inventoryUnit: 'bag',
    servingUnit: 'cup',
    servingsPerContainer: 6,
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
    locationId: 'loc-1',
    subZoneId: 'Crisper Drawer Left',
  },
  {
    id: 'seed-4',
    name: 'Cheddar Cheese',
    brand: 'Tillamook',
    category: 'Dairy',
    quantity: 1,
    unit: 'count',
    inventoryUnit: 'bag',
    servingUnit: 'oz',
    servingsPerContainer: 8,
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
    locationId: 'loc-1',
    subZoneId: 'Deli Drawer',
  },
  {
    id: 'seed-5',
    name: 'Raw Almonds',
    brand: 'Blue Diamond',
    category: 'Snacks',
    quantity: 1,
    unit: 'count',
    inventoryUnit: 'bag',
    servingUnit: 'oz',
    servingsPerContainer: 12,
    lowStockThreshold: 4,
    caloriesPerServing: 160,
    carbsPerServing: 6,
    proteinPerServing: 6,
    fatPerServing: 14,
    servingSize: '1 oz / 23 almonds (28g)',
    dateAdded: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    restockHistory: [],
    locationId: 'loc-6',
    subZoneId: 'Eye Level Shelf',
  },
  {
    id: 'seed-6',
    name: 'Extra Virgin Olive Oil',
    brand: 'California Olive Ranch',
    category: 'Condiments',
    quantity: 1,
    unit: 'count',
    inventoryUnit: 'bottle',
    servingUnit: 'tbsp',
    servingsPerContainer: 32,
    lowStockThreshold: 4,
    caloriesPerServing: 120,
    carbsPerServing: 0,
    proteinPerServing: 0,
    fatPerServing: 14,
    servingSize: '1 tbsp (14g)',
    dateAdded: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    restockHistory: [],
    locationId: 'loc-5',
    subZoneId: 'Lower Cabinets',
  },
  {
    id: 'seed-7',
    name: 'Almond Flour',
    brand: "Bob's Red Mill",
    category: 'Pantry Staples',
    quantity: 1,
    unit: 'count',
    inventoryUnit: 'bag',
    servingUnit: 'cup',
    servingsPerContainer: 15,
    lowStockThreshold: 8,
    caloriesPerServing: 160,
    carbsPerServing: 6,
    proteinPerServing: 6,
    fatPerServing: 14,
    servingSize: '1/4 cup (28g)',
    dateAdded: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    restockHistory: [],
    locationId: 'loc-6',
    subZoneId: 'Mid Shelf',
  },
  {
    id: 'seed-8',
    name: 'Greek Yogurt',
    brand: 'Chobani',
    category: 'Dairy',
    quantity: 2,
    unit: 'count',
    inventoryUnit: 'count',
    servingUnit: 'serving',
    servingsPerContainer: 1,
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
    locationId: 'loc-1',
    subZoneId: 'Upper Shelf',
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

      deductServings: (id, servings) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== id) return item;
            const spc = item.servingsPerContainer && item.servingsPerContainer > 0 ? item.servingsPerContainer : 1;
            const deduction = servings / spc;
            const newQty = Math.max(0, item.quantity - deduction);
            return {
              ...item,
              quantity: Math.round(newQty * 1000) / 1000,
              lastUpdated: new Date().toISOString(),
            };
          }),
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

/**
 * Hydrate the pantry store from AsyncStorage
 * Call this on app startup to restore persisted state
 */
export async function hydratePantryStore(): Promise<void> {
  try {
    await usePantryStore.persist.rehydrate();
  } catch (error) {
    console.warn('Failed to hydrate pantry store:', error);
  }
}
