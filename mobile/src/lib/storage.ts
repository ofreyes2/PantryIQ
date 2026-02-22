import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  APP_STORE: 'pantryiq-app-store',
  PANTRY_STORE: 'pantryiq-pantry-store',
  MEALS_STORE: 'pantryiq-meals-store',
  LOCATION_STORE: 'pantryiq-location-store',
  HEALTH_STORE: 'pantryiq-health-store',
  SHOPPING_STORE: 'pantryiq-shopping-store',
  RECIPES_STORE: 'pantryiq-recipes-store',
  KITCHEN_MAP_STORE: 'pantryiq-kitchen-map-store',
  KITCHEN_STORE: 'pantryiq-kitchen-store',
} as const;

/**
 * Retrieve a value from AsyncStorage
 * @param key Storage key
 * @returns Parsed value or null if not found
 */
export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to retrieve item from AsyncStorage for key "${key}":`, error);
    return null;
  }
}

/**
 * Store a value in AsyncStorage
 * @param key Storage key
 * @param value Value to store (will be JSON stringified)
 */
export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to store item in AsyncStorage for key "${key}":`, error);
  }
}

/**
 * Remove a value from AsyncStorage
 * @param key Storage key
 */
export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove item from AsyncStorage for key "${key}":`, error);
  }
}

/**
 * Clear all AsyncStorage data (useful for testing or reset)
 */
export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.warn('Failed to clear AsyncStorage:', error);
  }
}
