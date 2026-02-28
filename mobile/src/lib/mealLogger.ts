import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodEntry, MealType } from '@/lib/stores/mealsStore';
import { dateUtils, getLocalToday } from '@/lib/dateUtils';

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
   * Log a meal to a specific date with verification
   */
  async logMealToDate(
    mealData: Omit<FoodEntry, 'id'>,
    targetDate: string = dateUtils.today()
  ): Promise<MealLogResult> {
    try {
      const date = targetDate || dateUtils.today();
      console.log(`[MealLogger] Saving to date ${date}`);

      // Validate meal type
      const validMealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
      if (!validMealTypes.includes(mealData.mealType)) {
        return {
          success: false,
          entry: null,
          error: `Invalid meal type: ${mealData.mealType}`,
        };
      }

      const entryId = `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const entry: FoodEntry & { id: string } = {
        ...mealData,
        id: entryId,
        date, // Use the provided date
      };

      const logKey = `${DAILY_LOG_KEY_PREFIX}${date}`;
      const existingLogData = await AsyncStorage.getItem(logKey);
      const existingEntries: (FoodEntry & { id: string })[] = existingLogData ? JSON.parse(existingLogData) : [];

      const updatedEntries = [...existingEntries, entry];
      await AsyncStorage.setItem(logKey, JSON.stringify(updatedEntries));

      // Verify write
      const verifyData = await AsyncStorage.getItem(logKey);
      if (!verifyData) {
        return { success: false, entry: null, error: 'Failed to write meal to storage' };
      }

      const verifiedEntries: (FoodEntry & { id: string })[] = JSON.parse(verifyData);
      const savedEntry = verifiedEntries.find((e: FoodEntry & { id: string }) => e.id === entryId);

      if (!savedEntry) {
        return { success: false, entry: null, error: 'Meal verification failed' };
      }

      console.log(`[MealLogger] Saved to ${date}:`, savedEntry);
      return { success: true, entry: savedEntry, error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[MealLogger] Error logging meal:', errorMsg);
      return { success: false, entry: null, error: errorMsg };
    }
  }

  /**
   * Log a meal to AsyncStorage with verification (defaults to today)
   */
  async logMeal(
    mealData: Omit<FoodEntry, 'id'>,
  ): Promise<MealLogResult> {
    try {
      console.log('[MealLogger] Starting meal log process:', mealData);

      // Use logMealToDate with the provided date (or today if not specified)
      const result = await this.logMealToDate(mealData, mealData.date);

      if (result.success && result.entry) {
        // Track log frequency for favorites (3+ times = favorite)
        await this.trackFoodFrequency(mealData.name, mealData.mealType);
      }

      return result;
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
      const todayStr = dateUtils.today();
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
        // Format date using local time, not UTC
        const year = checkDate.getFullYear();
        const month = String(checkDate.getMonth() + 1).padStart(2, '0');
        const day = String(checkDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
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
   * Check for duplicate entries on a specific date
   */
  async checkForDuplicate(
    entryName: string,
    date: string,
    mealType: MealType
  ): Promise<(FoodEntry & { id: string }) | null> {
    try {
      const logKey = `${DAILY_LOG_KEY_PREFIX}${date}`;
      const stored = await AsyncStorage.getItem(logKey);
      if (!stored) return null;

      const entries: (FoodEntry & { id: string })[] = JSON.parse(stored);
      const mealEntries = entries.filter((e: FoodEntry & { id: string }) => e.mealType === mealType);
      const nameLower = entryName.toLowerCase();

      // Check for very similar entry logged within last 5 minutes
      const recentDuplicate = mealEntries.find((e: FoodEntry & { id: string }) => {
        const nameMatch =
          e.name?.toLowerCase().includes(nameLower) ||
          nameLower.includes(e.name?.toLowerCase());
        const loggedAt = new Date().getTime();
        const entryTime = new Date().getTime();
        const fiveMinutesAgo = loggedAt - 5 * 60 * 1000;
        const isRecent = entryTime > fiveMinutesAgo;
        return nameMatch && isRecent;
      });

      // Also check for exact same entry
      const exactDuplicate = mealEntries.find((e: FoodEntry & { id: string }) => {
        const nameMatch = e.name?.toLowerCase() === nameLower;
        const sameCalories = e.calories === entries[0]?.calories;
        return nameMatch && sameCalories;
      });

      return recentDuplicate || exactDuplicate || null;
    } catch (error) {
      console.error('[MealLogger] Error checking duplicates:', error);
      return null;
    }
  }

  /**
   * Clean up duplicate entries for a specific date
   */
  async cleanupDuplicatesForDate(date: string): Promise<void> {
    try {
      const logKey = `${DAILY_LOG_KEY_PREFIX}${date}`;
      const stored = await AsyncStorage.getItem(logKey);
      if (!stored) return;

      let entries: (FoodEntry & { id: string })[] = JSON.parse(stored);
      const seen = new Set<string>();

      entries = entries.filter((entry: FoodEntry & { id: string }) => {
        const signature = `${entry.name?.toLowerCase()}_${entry.calories}`;
        if (seen.has(signature)) {
          console.log(`[MealLogger] Removing duplicate: ${signature}`);
          return false;
        }
        seen.add(signature);
        return true;
      });

      await AsyncStorage.setItem(logKey, JSON.stringify(entries));
      console.log(`[MealLogger] Cleaned duplicates for ${date}`);
    } catch (error) {
      console.error('[MealLogger] Error cleaning duplicates:', error);
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
    toMealType: MealType,
    dateStr?: string
  ): Promise<{ success: boolean; entry?: FoodEntry; error?: string }> {
    try {
      const date = dateStr || dateUtils.today();
      const key = `${DAILY_LOG_KEY_PREFIX}${date}`;
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
      const today = dateUtils.today();
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
      const today = dateUtils.today();
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
