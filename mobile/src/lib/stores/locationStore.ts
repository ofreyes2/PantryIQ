import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorageSubZone {
  id: string;
  name: string;
  bestFor?: string;
}

export interface ApplianceInfo {
  applianceName: string;
  brand: string;
  totalCapacityLiters: number | null;
  specialFeatures: string[];
  storageTips: string;
}

export interface StorageLocation {
  id: string;
  name: string;
  fullName?: string;
  type: 'refrigerator' | 'freezer' | 'cabinet' | 'pantry' | 'other';
  icon: string;
  color: string;
  subZones: StorageSubZone[];
  modelNumber?: string;
  applianceInfo?: ApplianceInfo;
  isDefault: boolean;
}

interface LocationState {
  locations: StorageLocation[];
  addLocation: (location: Omit<StorageLocation, 'id'>) => void;
  updateLocation: (id: string, updates: Partial<StorageLocation>) => void;
  deleteLocation: (id: string) => void;
  addSubZone: (locationId: string, subZone: StorageSubZone) => void;
  deleteSubZone: (locationId: string, subZoneId: string) => void;
  setApplianceInfo: (locationId: string, info: ApplianceInfo) => void;
}

const generateId = () => `loc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const defaultLocations: StorageLocation[] = [
  {
    id: 'loc-1',
    name: 'Main Fridge',
    fullName: 'Whirlpool Double Door Refrigerator',
    type: 'refrigerator',
    icon: '🌡️',
    color: '#3498DB',
    subZones: [
      { id: 'Upper Shelf', name: 'Upper Shelf', bestFor: 'Leftovers, drinks, ready-to-eat foods' },
      { id: 'Middle Shelf', name: 'Middle Shelf', bestFor: 'Eggs, dairy products' },
      { id: 'Lower Shelf', name: 'Lower Shelf', bestFor: 'Raw meats, poultry, seafood' },
      { id: 'Crisper Drawer Left', name: 'Crisper Drawer Left', bestFor: 'Vegetables, herbs' },
      { id: 'Crisper Drawer Right', name: 'Crisper Drawer Right', bestFor: 'Fruits' },
      { id: 'Door Shelves', name: 'Door Shelves', bestFor: 'Condiments, juices, butter' },
      { id: 'Deli Drawer', name: 'Deli Drawer', bestFor: 'Cheese, deli meats' },
    ],
    modelNumber: undefined,
    isDefault: true,
  },
  {
    id: 'loc-2',
    name: 'Bottom Freezer',
    fullName: 'Whirlpool Bottom Freezer',
    type: 'freezer',
    icon: '❄️',
    color: '#9B59B6',
    subZones: [
      { id: 'Front', name: 'Front', bestFor: 'Frequently accessed items' },
      { id: 'Back', name: 'Back', bestFor: 'Long-term frozen storage' },
      { id: 'Left Side', name: 'Left Side', bestFor: 'Frozen vegetables, fruits' },
      { id: 'Right Side', name: 'Right Side', bestFor: 'Frozen meats, poultry' },
    ],
    isDefault: false,
  },
  {
    id: 'loc-3',
    name: 'Garage Freezer',
    fullName: 'Garage Upright Freezer',
    type: 'freezer',
    icon: '🧊',
    color: '#2980B9',
    subZones: [
      { id: 'Top Shelf', name: 'Top Shelf', bestFor: 'Ice cream, frozen desserts' },
      { id: 'Middle Shelf', name: 'Middle Shelf', bestFor: 'Frozen meals, leftovers' },
      { id: 'Bottom Shelf', name: 'Bottom Shelf', bestFor: 'Bulk meats, large items' },
      { id: 'Door Shelves', name: 'Door Shelves', bestFor: 'Frozen vegetables, bread' },
    ],
    isDefault: false,
  },
  {
    id: 'loc-4',
    name: 'Mini Fridge',
    fullName: 'Small Pantry Fridge',
    type: 'refrigerator',
    icon: '🔵',
    color: '#1ABC9C',
    subZones: [
      { id: 'Upper Shelf', name: 'Upper Shelf', bestFor: 'Beverages, snacks' },
      { id: 'Lower Shelf', name: 'Lower Shelf', bestFor: 'Leftovers, fruits' },
      { id: 'Door', name: 'Door', bestFor: 'Condiments, small bottles' },
    ],
    isDefault: false,
  },
  {
    id: 'loc-5',
    name: 'Kitchen Cabinets',
    type: 'cabinet',
    icon: '🗄️',
    color: '#F39C12',
    subZones: [
      { id: 'Upper Cabinets', name: 'Upper Cabinets', bestFor: 'Dishes, glasses, seldom-used items' },
      { id: 'Lower Cabinets', name: 'Lower Cabinets', bestFor: 'Pots, pans, heavy items' },
      { id: 'Corner Cabinet', name: 'Corner Cabinet', bestFor: 'Appliances, bulk storage' },
      { id: 'Above Fridge', name: 'Above Fridge', bestFor: 'Rarely used items, extra supplies' },
    ],
    isDefault: false,
  },
  {
    id: 'loc-6',
    name: 'Pantry',
    type: 'pantry',
    icon: '📦',
    color: '#E67E22',
    subZones: [
      { id: 'Top Shelf', name: 'Top Shelf', bestFor: 'Rarely used items, backstock' },
      { id: 'Eye Level Shelf', name: 'Eye Level Shelf', bestFor: 'Everyday snacks, frequently used items' },
      { id: 'Mid Shelf', name: 'Mid Shelf', bestFor: 'Canned goods, grains, cereals' },
      { id: 'Lower Shelf', name: 'Lower Shelf', bestFor: 'Heavier items, oils, vinegars' },
      { id: 'Floor', name: 'Floor', bestFor: 'Large containers, bulk items, beverages' },
    ],
    isDefault: false,
  },
];

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      locations: defaultLocations,

      addLocation: (location) =>
        set((state) => ({
          locations: [
            ...state.locations,
            { ...location, id: generateId() },
          ],
        })),

      updateLocation: (id, updates) =>
        set((state) => ({
          locations: state.locations.map((loc) =>
            loc.id === id ? { ...loc, ...updates } : loc
          ),
        })),

      deleteLocation: (id) =>
        set((state) => ({
          locations: state.locations.filter((loc) => loc.id !== id),
        })),

      addSubZone: (locationId, subZone) =>
        set((state) => ({
          locations: state.locations.map((loc) =>
            loc.id === locationId
              ? { ...loc, subZones: [...loc.subZones, subZone] }
              : loc
          ),
        })),

      deleteSubZone: (locationId, subZoneId) =>
        set((state) => ({
          locations: state.locations.map((loc) =>
            loc.id === locationId
              ? { ...loc, subZones: loc.subZones.filter((sz) => sz.id !== subZoneId) }
              : loc
          ),
        })),

      setApplianceInfo: (locationId, info) =>
        set((state) => ({
          locations: state.locations.map((loc) =>
            loc.id === locationId ? { ...loc, applianceInfo: info } : loc
          ),
        })),
    }),
    {
      name: 'pantryiq-location-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
