import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  USER_PROFILE: 'pantryiq:user_profile',
  PANTRY_ITEMS: 'pantryiq:pantry_items',
  MEALS: 'pantryiq:meals',
  HEALTH_ENTRIES: 'pantryiq:health_entries',
  SHOPPING_LIST: 'pantryiq:shopping_list',
  SETTINGS: 'pantryiq:settings',
  ONBOARDING_COMPLETE: 'pantryiq:onboarding_complete',
  STREAK_DATA: 'pantryiq:streak_data',
} as const;

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently fail
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // silently fail
  }
}
