import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface EquipmentItem {
  id: string;
  enabled: boolean;
  details?: Record<string, unknown>;
}

export interface KitchenEquipment {
  // Countertop Appliances
  instantPots: { id: string; size: '3qt' | '6qt' | '8qt'; nickname: string }[];
  deepFryer: { enabled: boolean; oilCapacity?: string };
  airFryer: { enabled: boolean; size?: '2qt' | '4qt' | '6qt' | '8qt+' };
  kitchenAid: { enabled: boolean; attachments: string[] };
  breadMaker: { enabled: boolean; loafSize?: '1lb' | '1.5lb' | '2lb' };
  waffleMaker: { enabled: boolean; type?: 'Regular' | 'Belgian' | 'Mini' };
  crepePan: { enabled: boolean; size?: '8inch' | '10inch' | '12inch' };
  microwave: { enabled: boolean; wattage?: string };
  blender: boolean;
  immersionBlender: boolean;
  foodProcessor: boolean;
  riceCooker: boolean;
  slowCooker: { enabled: boolean; size?: '4qt' | '6qt' | '8qt' };
  electricGriddle: boolean;
  sandwichPress: boolean;
  toasterOven: boolean;
  sousVide: boolean;
  dehydrator: boolean;
  pressureCanner: boolean;
  electricSkillet: boolean;
  juicer: boolean;
  espressoMachine: boolean;
  // Cooking Surfaces
  gasStove: { enabled: boolean; burners?: number };
  electricStove: { enabled: boolean; burners?: number };
  inductionCooktop: boolean;
  standardOven: { enabled: boolean; type?: 'Conventional' | 'Convection' };
  doubleOven: boolean;
  broiler: boolean;
  castIronSkillet: { enabled: boolean; sizes: string[] };
  carbonSteelPan: boolean;
  stainlessSteelSet: boolean;
  nonStickSet: boolean;
  dutchOven: { enabled: boolean; size?: '4qt' | '6qt' | '8qt' };
  wok: boolean;
  grillPan: boolean;
  // Outdoor
  gasGrill: { enabled: boolean; burners?: number };
  charcoalGrill: boolean;
  pelletSmoker: boolean;
  offsetSmoker: boolean;
  kamado: boolean;
  flatTopGriddle: boolean;
  outdoorPizzaOven: boolean;
  // Custom
  customEquipment: { id: string; name: string; description: string }[];
}

export interface CookingPreferences {
  texturePreferences: string[];
  cookTimeAvailability: 'quick' | 'standard' | 'weekend' | 'allday';
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  favoriteMethods: string[];
  dietaryFocus: string[];
  cuisinePreferences: string[];
}

interface KitchenState {
  equipment: KitchenEquipment;
  preferences: CookingPreferences;
  // Actions
  updateEquipment: (updates: Partial<KitchenEquipment>) => void;
  addInstantPot: (pot: { size: '3qt' | '6qt' | '8qt'; nickname: string }) => void;
  removeInstantPot: (id: string) => void;
  addCustomEquipment: (name: string, description: string) => void;
  removeCustomEquipment: (id: string) => void;
  updatePreferences: (updates: Partial<CookingPreferences>) => void;
  // Helpers
  getEquipmentSummary: () => string[];
  getPreferencesSummary: () => string;
}

// ─── Defaults ──────────────────────────────────────────────────────────────────

const defaultEquipment: KitchenEquipment = {
  // Countertop Appliances
  instantPots: [
    { id: 'ip-1', size: '3qt', nickname: 'Small Instant Pot 3qt' },
    { id: 'ip-2', size: '8qt', nickname: 'Large Instant Pot 8qt' },
  ],
  deepFryer: { enabled: true, oilCapacity: '' },
  airFryer: { enabled: false, size: undefined },
  kitchenAid: { enabled: false, attachments: [] },
  breadMaker: { enabled: false, loafSize: undefined },
  waffleMaker: { enabled: false, type: undefined },
  crepePan: { enabled: false, size: undefined },
  microwave: { enabled: false, wattage: undefined },
  blender: false,
  immersionBlender: false,
  foodProcessor: false,
  riceCooker: false,
  slowCooker: { enabled: false, size: undefined },
  electricGriddle: false,
  sandwichPress: false,
  toasterOven: false,
  sousVide: false,
  dehydrator: false,
  pressureCanner: false,
  electricSkillet: false,
  juicer: false,
  espressoMachine: false,
  // Cooking Surfaces
  gasStove: { enabled: false, burners: undefined },
  electricStove: { enabled: false, burners: undefined },
  inductionCooktop: false,
  standardOven: { enabled: true, type: 'Conventional' },
  doubleOven: false,
  broiler: true,
  castIronSkillet: { enabled: false, sizes: [] },
  carbonSteelPan: false,
  stainlessSteelSet: false,
  nonStickSet: false,
  dutchOven: { enabled: false, size: undefined },
  wok: false,
  grillPan: false,
  // Outdoor
  gasGrill: { enabled: false, burners: undefined },
  charcoalGrill: false,
  pelletSmoker: false,
  offsetSmoker: false,
  kamado: false,
  flatTopGriddle: false,
  outdoorPizzaOven: false,
  // Custom
  customEquipment: [],
};

const defaultPreferences: CookingPreferences = {
  texturePreferences: ['crispy'],
  cookTimeAvailability: 'standard',
  skillLevel: 'intermediate',
  favoriteMethods: [],
  dietaryFocus: ['low-carb'],
  cuisinePreferences: [],
};

// ─── ID Generator ─────────────────────────────────────────────────────────────

const generateId = () => `eq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useKitchenStore = create<KitchenState>()(
  persist(
    (set, get) => ({
      equipment: defaultEquipment,
      preferences: defaultPreferences,

      updateEquipment: (updates) =>
        set((state) => ({
          equipment: { ...state.equipment, ...updates },
        })),

      addInstantPot: (pot) =>
        set((state) => ({
          equipment: {
            ...state.equipment,
            instantPots: [
              ...state.equipment.instantPots,
              { ...pot, id: generateId() },
            ],
          },
        })),

      removeInstantPot: (id) =>
        set((state) => ({
          equipment: {
            ...state.equipment,
            instantPots: state.equipment.instantPots.filter((p) => p.id !== id),
          },
        })),

      addCustomEquipment: (name, description) =>
        set((state) => ({
          equipment: {
            ...state.equipment,
            customEquipment: [
              ...state.equipment.customEquipment,
              { id: generateId(), name, description },
            ],
          },
        })),

      removeCustomEquipment: (id) =>
        set((state) => ({
          equipment: {
            ...state.equipment,
            customEquipment: state.equipment.customEquipment.filter((e) => e.id !== id),
          },
        })),

      updatePreferences: (updates) =>
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),

      getEquipmentSummary: () => {
        const { equipment } = get();
        const items: string[] = [];

        if (equipment.instantPots.length > 0) {
          equipment.instantPots.forEach((p) => items.push(p.nickname || `Instant Pot ${p.size}`));
        }
        if (equipment.deepFryer.enabled) items.push('Deep Fryer');
        if (equipment.airFryer.enabled) {
          items.push(`Air Fryer${equipment.airFryer.size ? ` (${equipment.airFryer.size})` : ''}`);
        }
        if (equipment.kitchenAid.enabled) {
          const atts = equipment.kitchenAid.attachments;
          items.push(`KitchenAid Mixer${atts.length > 0 ? ` (${atts.join(', ')})` : ''}`);
        }
        if (equipment.breadMaker.enabled) items.push('Bread Maker');
        if (equipment.waffleMaker.enabled) items.push('Waffle Maker');
        if (equipment.crepePan.enabled) items.push('Crepe Pan');
        if (equipment.microwave.enabled) items.push('Microwave');
        if (equipment.blender) items.push('Blender');
        if (equipment.immersionBlender) items.push('Immersion Blender');
        if (equipment.foodProcessor) items.push('Food Processor');
        if (equipment.riceCooker) items.push('Rice Cooker');
        if (equipment.slowCooker.enabled) {
          items.push(`Slow Cooker${equipment.slowCooker.size ? ` (${equipment.slowCooker.size})` : ''}`);
        }
        if (equipment.electricGriddle) items.push('Electric Griddle');
        if (equipment.sandwichPress) items.push('Sandwich Press');
        if (equipment.toasterOven) items.push('Toaster Oven');
        if (equipment.sousVide) items.push('Sous Vide');
        if (equipment.dehydrator) items.push('Dehydrator');
        if (equipment.pressureCanner) items.push('Pressure Canner');
        if (equipment.electricSkillet) items.push('Electric Skillet');
        if (equipment.juicer) items.push('Juicer');
        if (equipment.espressoMachine) items.push('Espresso Machine');
        if (equipment.gasStove.enabled) {
          items.push(`Gas Stove${equipment.gasStove.burners ? ` (${equipment.gasStove.burners} burners)` : ''}`);
        }
        if (equipment.electricStove.enabled) {
          items.push(`Electric Stove${equipment.electricStove.burners ? ` (${equipment.electricStove.burners} burners)` : ''}`);
        }
        if (equipment.inductionCooktop) items.push('Induction Cooktop');
        if (equipment.standardOven.enabled) {
          items.push(`${equipment.standardOven.type ?? 'Conventional'} Oven`);
        }
        if (equipment.doubleOven) items.push('Double Oven');
        if (equipment.broiler) items.push('Broiler');
        if (equipment.castIronSkillet.enabled) {
          items.push(`Cast Iron Skillet${equipment.castIronSkillet.sizes.length > 0 ? ` (${equipment.castIronSkillet.sizes.join(', ')})` : ''}`);
        }
        if (equipment.carbonSteelPan) items.push('Carbon Steel Pan');
        if (equipment.stainlessSteelSet) items.push('Stainless Steel Cookware');
        if (equipment.nonStickSet) items.push('Non-Stick Cookware');
        if (equipment.dutchOven.enabled) {
          items.push(`Dutch Oven${equipment.dutchOven.size ? ` (${equipment.dutchOven.size})` : ''}`);
        }
        if (equipment.wok) items.push('Wok');
        if (equipment.grillPan) items.push('Grill Pan');
        if (equipment.gasGrill.enabled) {
          items.push(`Gas Grill${equipment.gasGrill.burners ? ` (${equipment.gasGrill.burners} burners)` : ''}`);
        }
        if (equipment.charcoalGrill) items.push('Charcoal Grill');
        if (equipment.pelletSmoker) items.push('Pellet Smoker');
        if (equipment.offsetSmoker) items.push('Offset Smoker');
        if (equipment.kamado) items.push('Kamado Grill');
        if (equipment.flatTopGriddle) items.push('Flat Top Griddle');
        if (equipment.outdoorPizzaOven) items.push('Outdoor Pizza Oven');
        equipment.customEquipment.forEach((e) => items.push(e.name));

        return items;
      },

      getPreferencesSummary: () => {
        const { preferences } = get();
        const lines: string[] = [];

        const cookTimeMap: Record<string, string> = {
          quick: 'Quick (under 20 min)',
          standard: 'Standard (20-45 min)',
          weekend: 'Weekend Cook (up to 90 min)',
          allday: 'All Day (slow cooks & braises)',
        };
        const skillMap: Record<string, string> = {
          beginner: 'Beginner',
          intermediate: 'Intermediate',
          advanced: 'Advanced',
        };

        lines.push(`Skill Level: ${skillMap[preferences.skillLevel] ?? preferences.skillLevel}`);
        lines.push(`Cook Time: ${cookTimeMap[preferences.cookTimeAvailability] ?? preferences.cookTimeAvailability}`);
        if (preferences.texturePreferences.length > 0) {
          lines.push(`Texture Preferences: ${preferences.texturePreferences.join(', ')}`);
        }
        if (preferences.favoriteMethods.length > 0) {
          lines.push(`Preferred Methods: ${preferences.favoriteMethods.join(', ')}`);
        }
        if (preferences.dietaryFocus.length > 0) {
          lines.push(`Dietary Focus: ${preferences.dietaryFocus.join(', ')}`);
        }
        if (preferences.cuisinePreferences.length > 0) {
          lines.push(`Cuisine Preferences: ${preferences.cuisinePreferences.join(', ')}`);
        }

        return lines.join('\n');
      },
    }),
    {
      name: 'pantryiq-kitchen-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
