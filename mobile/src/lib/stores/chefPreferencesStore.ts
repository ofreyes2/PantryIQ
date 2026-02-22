import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FoodPreference {
  name: string;
  category: 'ingredient' | 'flavor' | 'cuisine' | 'brand' | 'technique';
  strength: 'strong' | 'medium' | 'mild'; // how much user prefers this
  mentionedIn: string[]; // message IDs where this was mentioned
  firstMentioned: string; // ISO date
  frequency: number; // how many times mentioned
}

export interface ConversationContext {
  messagesSummary: string; // brief summary of what was discussed
  ingredionsAvailable: string[]; // items user has in pantry
  ingredientsMissing: string[]; // items mentioned but not in pantry
  topics: string[]; // themes discussed (pairings, elevation, substitutions, etc.)
}

export interface ChefPreferencesState {
  preferences: FoodPreference[];
  isExplorationMode: boolean;
  currentConversationContext: ConversationContext | null;

  addPreference: (preference: Omit<FoodPreference, 'firstMentioned' | 'mentionedIn' | 'frequency'>) => void;
  updatePreference: (name: string, updates: Partial<FoodPreference>) => void;
  deletePreference: (name: string) => void;
  setExplorationMode: (isActive: boolean) => void;
  setConversationContext: (context: ConversationContext | null) => void;
  getPreferenceSummary: () => string;
  getPreferencesByCategory: (category: FoodPreference['category']) => FoodPreference[];
}

const generateId = () => `pref-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useChefPreferencesStore = create<ChefPreferencesState>()(
  persist(
    (set, get) => ({
      preferences: [],
      isExplorationMode: false,
      currentConversationContext: null,

      addPreference: (preference) =>
        set((state) => {
          const existing = state.preferences.find((p) => p.name.toLowerCase() === preference.name.toLowerCase());

          if (existing) {
            // Update existing preference
            return {
              preferences: state.preferences.map((p) =>
                p.name.toLowerCase() === preference.name.toLowerCase()
                  ? {
                      ...p,
                      strength: preference.strength,
                      frequency: p.frequency + 1,
                      mentionedIn: [...p.mentionedIn],
                    }
                  : p
              ),
            };
          }

          // Add new preference
          return {
            preferences: [
              ...state.preferences,
              {
                ...preference,
                firstMentioned: new Date().toISOString(),
                mentionedIn: [],
                frequency: 1,
              },
            ],
          };
        }),

      updatePreference: (name, updates) =>
        set((state) => ({
          preferences: state.preferences.map((p) =>
            p.name.toLowerCase() === name.toLowerCase()
              ? { ...p, ...updates }
              : p
          ),
        })),

      deletePreference: (name) =>
        set((state) => ({
          preferences: state.preferences.filter(
            (p) => p.name.toLowerCase() !== name.toLowerCase()
          ),
        })),

      setExplorationMode: (isActive) =>
        set({ isExplorationMode: isActive }),

      setConversationContext: (context) =>
        set({ currentConversationContext: context }),

      getPreferenceSummary: () => {
        const { preferences } = get();
        if (preferences.length === 0) return '';

        const strongPrefs = preferences
          .filter((p) => p.strength === 'strong')
          .map((p) => p.name)
          .join(', ');

        const mediumPrefs = preferences
          .filter((p) => p.strength === 'medium')
          .map((p) => p.name)
          .join(', ');

        const brandPrefs = preferences
          .filter((p) => p.category === 'brand')
          .map((p) => p.name)
          .join(', ');

        let summary = '';
        if (strongPrefs) summary += `Loves: ${strongPrefs}. `;
        if (mediumPrefs) summary += `Also enjoys: ${mediumPrefs}. `;
        if (brandPrefs) summary += `Preferred brands: ${brandPrefs}. `;

        return summary;
      },

      getPreferencesByCategory: (category) => {
        const { preferences } = get();
        return preferences.filter((p) => p.category === category);
      },
    }),
    {
      name: 'pantryiq_chef_preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export async function hydrateChefPreferencesStore(): Promise<void> {
  try {
    await useChefPreferencesStore.persist.rehydrate();
  } catch (error) {
    console.warn('Failed to hydrate chef preferences store:', error);
  }
}
