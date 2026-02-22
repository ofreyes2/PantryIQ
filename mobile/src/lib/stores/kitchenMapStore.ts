import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface KitchenZone {
  zoneId: string;
  zoneName: string;
  zoneType: 'shelf' | 'drawer' | 'door shelf' | 'bin' | 'rack' | 'compartment';
  position: string;
  approximateSize: 'small' | 'medium' | 'large';
  bestStoredItems: string[];
  temperatureZone?: string;
  specialNotes: string | null;
  estimatedCapacity: string;
  // For zone overlay on photo (percentages 0-100)
  overlayX?: number;
  overlayY?: number;
  overlayWidth?: number;
  overlayHeight?: number;
}

export interface MappedArea {
  id: string;
  locationId: string; // links to locationStore location
  areaName: string;
  areaType: 'refrigerator' | 'freezer' | 'cupboard' | 'pantry';
  photoUris: string[]; // local URIs of captured photos
  zones: KitchenZone[];
  applianceObservations: string;
  organizationSuggestions: string[];
  currentItemsVisible: string[]; // food items Claude spotted
  overallStorageTips: string;
  mappedAt: string; // ISO date
  isComplete: boolean;
}

interface KitchenMapState {
  mappedAreas: MappedArea[];
  onboardingComplete: boolean;
  completeOnboarding: () => void;
  saveMappedArea: (area: MappedArea) => void;
  updateMappedArea: (id: string, updates: Partial<MappedArea>) => void;
  deleteMappedArea: (id: string) => void;
  getMappedAreaForLocation: (locationId: string) => MappedArea | undefined;
}

const generateId = () => `km-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useKitchenMapStore = create<KitchenMapState>()(
  persist(
    (set, get) => ({
      mappedAreas: [],
      onboardingComplete: false,

      completeOnboarding: () => set({ onboardingComplete: true }),

      saveMappedArea: (area) =>
        set((state) => {
          const exists = state.mappedAreas.find((a) => a.id === area.id);
          if (exists) {
            return {
              mappedAreas: state.mappedAreas.map((a) => (a.id === area.id ? area : a)),
            };
          }
          return { mappedAreas: [...state.mappedAreas, area] };
        }),

      updateMappedArea: (id, updates) =>
        set((state) => ({
          mappedAreas: state.mappedAreas.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),

      deleteMappedArea: (id) =>
        set((state) => ({
          mappedAreas: state.mappedAreas.filter((a) => a.id !== id),
        })),

      getMappedAreaForLocation: (locationId) => {
        return get().mappedAreas.find((a) => a.locationId === locationId);
      },
    }),
    {
      name: 'pantryiq-kitchen-map-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export { generateId };
