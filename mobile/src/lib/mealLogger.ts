import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodEntry, MealType } from '@/lib/stores/mealsStore';

const DAILY_LOG_KEY_PREFIX = 'pantryiq_daily_log_';
const FAVORITES_KEY = 'pantryiq_favorites';

interface MealLogResult {
  success: boolean;
  entry: (FoodEntry & { id: string }) | null;
  error: string | null;
}

interface RecalculateResult {
  success: boolean;
  totals: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
    netCarbs: number;
  } | null;
}

class MealLoggerService {
  /**
   * Log a meal to AsyncStorage with verification
   */
  async logMeal(
    mealData: Omit<FoodEntry, 'id'>,
  ): Promise<MealLogResult> {
    try {
      console.log('[MealLogger] Starting meal log process:', mealData);

      // Validate meal type
      const validMealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
      if (!validMealTypes.includes(mealData.mealType)) {
        return {
          success: false,
          entry: null,
          error: `Invalid meal type: ${mealData.mealType}`,
        };
      }

      // Create entry with ID and current timestamp
      const entryId = `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const entry: FoodEntry & { id: string } = {
        ...mealData,
        id: entryId,
      };

      console.log('[MealLogger] Created entry:', entry);

      // Read current daily log
      const logKey = `${DAILY_LOG_KEY_PREFIX}${mealData.date}`;
      const existingLogData = await AsyncStorage.getItem(logKey);
      const existingEntries: (FoodEntry & { id: string })[] = existingLogData ? JSON.parse(existingLogData) : [];

      console.log('[MealLogger] Existing entries count:', existingEntries.length);

      // Add new entry to daily log
      const updatedEntries = [...existingEntries, entry];
      await AsyncStorage.setItem(logKey, JSON.stringify(updatedEntries));

      console.log('[MealLogger] Wrote to AsyncStorage, verifying...');

      // VERIFY the write succeeded by reading back
      const verifyData = await AsyncStorage.getItem(logKey);
      if (!verifyData) {
        return {
          success: false,
          entry: null,
          error: 'Failed to write meal to storage - verification failed',
        };
      }

      const verifiedEntries: (FoodEntry & { id: string })[] = JSON.parse(verifyData);
      const savedEntry = verifiedEntries.find((e) => e.id === entryId);

      if (!savedEntry) {
        return {
          success: false,
          entry: null,
          error: 'Meal was written but could not be verified in storage',
        };
      }

      console.log('[MealLogger] Verification successful! Entry saved:', savedEntry);

      // Track log frequency for favorites (3+ times = favorite)
      await this.trackFoodFrequency(mealData.name, mealData.mealType);

      return {
        success: true,
        entry: savedEntry,
        error: null,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[MealLogger] Error logging meal:', errorMsg);
      return {
        success: false,
        entry: null,
        error: errorMsg,
      };
    }
  }

  /**
   * Recalculate daily totals for a specific date
   */
  async recalculateTotals(dateStr: string): Promise<RecalculateResult> {
    try {
      console.log('[MealLogger] Recalculating totals for:', dateStr);

      const logKey = `${DAILY_LOG_KEY_PREFIX}${dateStr}`;
      const logData = await AsyncStorage.getItem(logKey);
      const entries: FoodEntry[] = logData ? JSON.parse(logData) : [];

      console.log('[MealLogger] Found entries:', entries.length);

      // Sum all nutrition values
      const totals = {
        calories: 0,
        carbs: 0,
        protein: 0,
        fat: 0,
        fiber: 0,
        netCarbs: 0,
      };

      entries.forEach((entry) => {
        const servingMultiplier = entry.servings || 1;
        totals.calories += entry.calories * servingMultiplier;
        totals.carbs += entry.carbs * servingMultiplier;
        totals.protein += entry.protein * servingMultiplier;
        totals.fat += entry.fat * servingMultiplier;
        totals.fiber += entry.fiber * servingMultiplier;
        totals.netCarbs += entry.netCarbs * servingMultiplier;
      });

      // Round to 1 decimal place
      Object.keys(totals).forEach((key) => {
        totals[key as keyof typeof totals] = Math.round(totals[key as keyof typeof totals] * 10) / 10;
      });

      console.log('[MealLogger] Calculated totals:', totals);

      return {
        success: true,
        totals,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[MealLogger] Error recalculating totals:', errorMsg);
      return {
        success: false,
        totals: null,
      };
    }
  }

  /**
   * Get today's meal log
   */
  async getTodayLog(): Promise<(FoodEntry & { id: string })[]> {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const logKey = `${DAILY_LOG_KEY_PREFIX}${todayStr}`;
      const logData = await AsyncStorage.getItem(logKey);
      return logData ? JSON.parse(logData) : [];
    } catch (error) {
      console.error('[MealLogger] Error getting today log:', error);
      return [];
    }
  }

  /**
   * Track food frequency for favorites
   * If a food is logged 3+ times, it becomes a favorite
   */
  private async trackFoodFrequency(foodName: string, mealType: MealType): Promise<void> {
    try {
      // Get all entries from past 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let foodCount = 0;

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(thirtyDaysAgo);
        checkDate.setDate(checkDate.getDate() + i);
        const dateStr = checkDate.toISOString().split('T')[0];
        const logKey = `${DAILY_LOG_KEY_PREFIX}${dateStr}`;
        const logData = await AsyncStorage.getItem(logKey);

        if (logData) {
          const entries: FoodEntry[] = JSON.parse(logData);
          foodCount += entries.filter((e) => e.name.toLowerCase() === foodName.toLowerCase()).length;
        }
      }

      console.log(`[MealLogger] Food "${foodName}" logged ${foodCount} times in last 30 days`);

      // If 3 or more times, add to favorites
      if (foodCount >= 3) {
        const favoritesData = await AsyncStorage.getItem(FAVORITES_KEY);
        const favorites: string[] = favoritesData ? JSON.parse(favoritesData) : [];

        if (!favorites.includes(foodName)) {
          favorites.push(foodName);
          await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
          console.log(`[MealLogger] Added "${foodName}" to favorites`);
        }
      }
    } catch (error) {
      console.warn('[MealLogger] Error tracking food frequency:', error);
    }
  }

  /**
   * Get favorite foods
   */
  async getFavorites(): Promise<string[]> {
    try {
      const favoritesData = await AsyncStorage.getItem(FAVORITES_KEY);
      return favoritesData ? JSON.parse(favoritesData) : [];
    } catch (error) {
      console.error('[MealLogger] Error getting favorites:', error);
      return [];
    }
  }

  /**
   * Check for duplicate entries in today's log
   */
  async checkForDuplicate(newEntry: FoodEntry, mealType: MealType): Promise<(FoodEntry & { id: string }) | false> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `${DAILY_LOG_KEY_PREFIX}${today}`;
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return false;

      const log: (FoodEntry & { id: string })[] = JSON.parse(stored);
      const entries = log.filter((e) => e.mealType === mealType) || [];
      const nameLower = newEntry.name?.toLowerCase() || '';

      const duplicate = entries.find((e) => {
        const existingName = e.name?.toLowerCase() || '';
        return existingName.includes(nameLower) || nameLower.includes(existingName);
      });

      return duplicate || false;
    } catch (error) {
      console.warn('[MealLogger] Error checking for duplicate:', error);
      return false;
    }
  }

  /**
   * Validate that entry has nutrition data
   */
  validateEntry(entry: FoodEntry): { valid: boolean; reason?: string } {
    const hasNutrition =
      (entry.calories > 0) || (entry.netCarbs > 0) || (entry.protein > 0);

    if (!hasNutrition) {
      return {
        valid: false,
        reason: 'Nutrition data appears to be missing — please verify before saving',
      };
    }
    return { valid: true };
  }

  /**
   * Move entry between meal types
   */
  async moveEntry(
    entryId: string,
    fromMealType: MealType,
    toMealType: MealType
  ): Promise<{ success: boolean; entry?: FoodEntry; error?: string }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `${DAILY_LOG_KEY_PREFIX}${today}`;
      const stored = await AsyncStorage.getItem(key);

      if (!stored) return { success: false, error: 'No meal log found' };

      const entries: FoodEntry[] = JSON.parse(stored);
      const entryIndex = entries.findIndex((e) => e.id === entryId);

      if (entryIndex === -1) return { success: false, error: 'Entry not found' };

      const entry = entries[entryIndex];
      if (entry.mealType !== fromMealType) {
        return { success: false, error: 'Entry not in source meal type' };
      }

      entry.mealType = toMealType;

      entries[entryIndex] = entry;
      await AsyncStorage.setItem(key, JSON.stringify(entries));

      return { success: true, entry };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Edit entry fields
   */
  async editEntry(
    entryId: string,
    fieldsToUpdate: Partial<FoodEntry>
  ): Promise<{ success: boolean; updatedEntry?: FoodEntry; error?: string }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `${DAILY_LOG_KEY_PREFIX}${today}`;
      const stored = await AsyncStorage.getItem(key);

      if (!stored) return { success: false, error: 'No meal log found' };

      const entries: FoodEntry[] = JSON.parse(stored);
      const entryIndex = entries.findIndex((e) => e.id === entryId);

      if (entryIndex === -1) return { success: false, error: 'Entry not found' };

      entries[entryIndex] = {
        ...entries[entryIndex],
        ...fieldsToUpdate,
      };

      await AsyncStorage.setItem(key, JSON.stringify(entries));
      await this.recalculateTotals(today);

      return { success: true, updatedEntry: entries[entryIndex] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Delete entry
   */
  async deleteEntry(entryId: string): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `${DAILY_LOG_KEY_PREFIX}${today}`;
      const stored = await AsyncStorage.getItem(key);

      if (!stored) return { success: false, error: 'No meal log found' };

      const entries: FoodEntry[] = JSON.parse(stored);
      const beforeCount = entries.length;
      const filtered = entries.filter((e) => e.id !== entryId);
      const afterCount = filtered.length;

      if (beforeCount === afterCount) return { success: false, error: 'Entry not found' };

      await AsyncStorage.setItem(key, JSON.stringify(filtered));
      await this.recalculateTotals(today);

      return { success: true, deletedCount: beforeCount - afterCount };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }
}

// Export singleton instance
export const MealLogger = new MealLoggerService();
