import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  store: string;
  estimatedPrice?: number;
  isChecked: boolean;
  isRecurring: boolean;
  recurringThreshold?: number;
  dateAdded: string;
  checkedAt?: string;
  pantryItemId?: string;
  priceHistory: { date: string; price: number; store: string }[];
}

export interface ShoppingTrip {
  id: string;
  date: string;
  store: string;
  items: { name: string; quantity: number; unit: string; price: number }[];
  totalSpent: number;
}

interface ShoppingState {
  items: ShoppingItem[];
  trips: ShoppingTrip[];
  stores: string[];
  addItem: (item: Omit<ShoppingItem, 'id' | 'dateAdded' | 'priceHistory'>) => void;
  updateItem: (id: string, updates: Partial<ShoppingItem>) => void;
  deleteItem: (id: string) => void;
  toggleCheck: (id: string) => void;
  clearChecked: () => void;
  addStore: (name: string) => void;
  completeTrip: (store: string, items: ShoppingTrip['items']) => void;
  getPriceHistory: (itemName: string) => { date: string; price: number; store: string }[];
  getItemsByStore: () => Record<string, ShoppingItem[]>;
  getEstimatedTotalByStore: () => Record<string, number>;
}

const generateId = () => `shop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const seedItems: ShoppingItem[] = [
  {
    id: 'shop-seed-1',
    name: 'Heavy Cream',
    quantity: 2,
    unit: 'cups',
    category: 'Dairy',
    store: "Sam's Club",
    estimatedPrice: 4.99,
    isChecked: false,
    isRecurring: true,
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    priceHistory: [
      { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), price: 4.79, store: "Sam's Club" },
      { date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), price: 4.99, store: "Sam's Club" },
    ],
  },
  {
    id: 'shop-seed-2',
    name: 'Chicken Thighs',
    quantity: 3,
    unit: 'lbs',
    category: 'Proteins',
    store: 'Costco',
    estimatedPrice: 12.99,
    isChecked: false,
    isRecurring: false,
    dateAdded: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    priceHistory: [
      { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), price: 12.49, store: 'Costco' },
    ],
  },
  {
    id: 'shop-seed-3',
    name: 'Almond Flour',
    quantity: 5,
    unit: 'lbs',
    category: 'Pantry Staples',
    store: "Sam's Club",
    estimatedPrice: 14.99,
    isChecked: false,
    isRecurring: true,
    dateAdded: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    priceHistory: [],
  },
  {
    id: 'shop-seed-4',
    name: 'Baby Spinach',
    quantity: 1,
    unit: 'bag',
    category: 'Vegetables',
    store: "Mariano's",
    estimatedPrice: 3.49,
    isChecked: false,
    isRecurring: false,
    dateAdded: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    priceHistory: [
      { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), price: 3.29, store: "Mariano's" },
    ],
  },
  {
    id: 'shop-seed-5',
    name: 'Grass-fed Butter',
    quantity: 1,
    unit: 'lb',
    category: 'Dairy',
    store: 'Walmart',
    estimatedPrice: 6.99,
    isChecked: false,
    isRecurring: true,
    dateAdded: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    priceHistory: [
      { date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), price: 6.49, store: 'Walmart' },
      { date: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString(), price: 6.99, store: 'Walmart' },
    ],
  },
  {
    id: 'shop-seed-6',
    name: 'Quest Protein Bars',
    quantity: 1,
    unit: 'box',
    category: 'Snacks',
    store: 'Walmart',
    estimatedPrice: 18.99,
    isChecked: false,
    isRecurring: false,
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    priceHistory: [],
  },
];

export const useShoppingStore = create<ShoppingState>()(
  persist(
    (set, get) => ({
      items: seedItems,
      trips: [],
      stores: ["Sam's Club", "Mariano's", 'Walmart', 'Costco', 'Whole Foods', 'Target'],

      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              ...item,
              id: generateId(),
              dateAdded: new Date().toISOString(),
              priceHistory: [],
            },
          ],
        })),

      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        })),

      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      toggleCheck: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  isChecked: !item.isChecked,
                  checkedAt: !item.isChecked ? new Date().toISOString() : undefined,
                }
              : item
          ),
        })),

      clearChecked: () =>
        set((state) => ({
          items: state.items.filter((item) => !item.isChecked),
        })),

      addStore: (name) =>
        set((state) => ({
          stores: state.stores.includes(name)
            ? state.stores
            : [...state.stores, name],
        })),

      completeTrip: (store, tripItems) =>
        set((state) => {
          const totalSpent = tripItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
          const newTrip: ShoppingTrip = {
            id: `trip-${Date.now()}`,
            date: new Date().toISOString(),
            store,
            items: tripItems,
            totalSpent,
          };

          const updatedItems = state.items.map((item) => {
            if (!item.isChecked) return item;
            const tripItem = tripItems.find((ti) => ti.name.toLowerCase() === item.name.toLowerCase());
            if (!tripItem) return item;
            return {
              ...item,
              priceHistory: [
                ...item.priceHistory,
                { date: new Date().toISOString(), price: tripItem.price, store },
              ],
            };
          });

          return {
            trips: [newTrip, ...state.trips],
            items: updatedItems.filter((item) => !item.isChecked),
          };
        }),

      getPriceHistory: (itemName) => {
        const { items } = get();
        const item = items.find(
          (i) => i.name.toLowerCase() === itemName.toLowerCase()
        );
        return item?.priceHistory ?? [];
      },

      getItemsByStore: () => {
        const { items } = get();
        return items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
          const store = item.store || 'Other';
          if (!acc[store]) acc[store] = [];
          acc[store].push(item);
          return acc;
        }, {});
      },

      getEstimatedTotalByStore: () => {
        const { items } = get();
        return items.reduce<Record<string, number>>((acc, item) => {
          if (!item.isChecked && item.estimatedPrice) {
            const store = item.store || 'Other';
            acc[store] = (acc[store] ?? 0) + item.estimatedPrice;
          }
          return acc;
        }, {});
      },
    }),
    {
      name: 'pantryiq-shopping-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/**
 * Hydrate the shopping store from AsyncStorage
 * Call this on app startup to restore persisted state
 */
export async function hydrateShoppingStore(): Promise<void> {
  try {
    await useShoppingStore.persist.rehydrate();
  } catch (error) {
    console.warn('Failed to hydrate shopping store:', error);
  }
}
