/**
 * Daily Reset System
 * Handles app-level daily reset on app open/foreground
 * Ensures fresh start each day while maintaining historical data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateUtils } from './dateUtils';
import { useMealsStore } from './stores/mealsStore';

export interface DailyResetResult {
  isNewDay: boolean;
  today: string;
  previousDate?: string;
  showGreeting: boolean;
  yesterdayTotals?: {
    calories: number;
    netCarbs: number;
    protein: number;
    fat: number;
  };
}

const LAST_OPENED_DATE_KEY = 'pantryiq_last_opened_date';
const DAILY_RESET_COMPLETE_KEY = 'pantryiq_daily_reset_complete';

/**
 * Check if a new day has started and handle daily reset
 * Call this on app open and when app comes back from background
 */
export const checkAndHandleDailyReset = async (): Promise<DailyResetResult> => {
  try {
    const today = dateUtils.today();
    const lastOpenedDate = await AsyncStorage.getItem(LAST_OPENED_DATE_KEY);
    const resetComplete = await AsyncStorage.getItem(DAILY_RESET_COMPLETE_KEY);

    // If reset already happened today, return early
    if (resetComplete === today) {
      return { isNewDay: false, today, showGreeting: false };
    }

    const isNewDay = lastOpenedDate !== today && lastOpenedDate !== null;

    if (isNewDay) {
      console.log(`[DailyReset] New day detected — resetting from ${lastOpenedDate} to ${today}`);

      // Save the new date
      await AsyncStorage.setItem(LAST_OPENED_DATE_KEY, today);

      // Mark reset as complete for this day
      await AsyncStorage.setItem(DAILY_RESET_COMPLETE_KEY, today);

      // Clean up old seed entries from meals store
      try {
        useMealsStore.getState().cleanupOldSeedEntries();
      } catch (e) {
        console.warn('Failed to cleanup old seed entries:', e);
      }

      // Get yesterday's totals for the greeting card
      let yesterdayTotals = undefined;
      if (lastOpenedDate) {
        const yesterdayTotalsKey = `pantryiq_daily_totals_${lastOpenedDate}`;
        const yesterdayTotalsStr = await AsyncStorage.getItem(yesterdayTotalsKey);
        if (yesterdayTotalsStr) {
          try {
            yesterdayTotals = JSON.parse(yesterdayTotalsStr);
          } catch (e) {
            console.warn('Failed to parse yesterday totals:', e);
          }
        }
      }

      // Initialize empty meal log for today (if not already present)
      const mealLogKey = `pantryiq_meal_log_${today}`;
      const existingToday = await AsyncStorage.getItem(mealLogKey);
      if (!existingToday) {
        await AsyncStorage.setItem(
          mealLogKey,
          JSON.stringify({
            breakfast: [],
            lunch: [],
            dinner: [],
            snacks: [],
          })
        );
      }

      // Initialize fresh daily totals for today
      const totalsKey = `pantryiq_daily_totals_${today}`;
      const existingTotals = await AsyncStorage.getItem(totalsKey);
      if (!existingTotals) {
        await AsyncStorage.setItem(
          totalsKey,
          JSON.stringify({
            calories: 0,
            netCarbs: 0,
            protein: 0,
            fat: 0,
            fiber: 0,
            carbs: 0,
          })
        );
      }

      // Initialize fresh water log for today
      const waterKey = `pantryiq_water_${today}`;
      const existingWater = await AsyncStorage.getItem(waterKey);
      if (!existingWater) {
        await AsyncStorage.setItem(waterKey, '0');
      }

      // Handle active fasting session (should carry over if started yesterday)
      const fastingKey = 'pantryiq_active_fast';
      const fastingDataStr = await AsyncStorage.getItem(fastingKey);
      if (fastingDataStr) {
        try {
          const fastingData = JSON.parse(fastingDataStr);
          const fastDate = fastingData.startTime?.split('T')[0];
          if (fastDate && fastDate < today) {
            console.log('[DailyReset] Active fasting session carries over from yesterday');
            // Keep the fasting session running across midnight
            // The fasting timer will handle the continuous countdown
          }
        } catch (e) {
          console.warn('Failed to parse fasting data:', e);
        }
      }

      // Check and potentially break streak if user missed a day
      await checkStreakValidity(today, lastOpenedDate);

      return {
        isNewDay: true,
        today,
        previousDate: lastOpenedDate,
        showGreeting: true,
        yesterdayTotals,
      };
    }

    // First app open ever
    if (!lastOpenedDate) {
      console.log('[DailyReset] First app open — initializing daily data');
      await AsyncStorage.setItem(LAST_OPENED_DATE_KEY, today);
      await AsyncStorage.setItem(DAILY_RESET_COMPLETE_KEY, today);

      // Initialize today's data
      const mealLogKey = `pantryiq_meal_log_${today}`;
      await AsyncStorage.setItem(
        mealLogKey,
        JSON.stringify({
          breakfast: [],
          lunch: [],
          dinner: [],
          snacks: [],
        })
      );

      const totalsKey = `pantryiq_daily_totals_${today}`;
      await AsyncStorage.setItem(
        totalsKey,
        JSON.stringify({
          calories: 0,
          netCarbs: 0,
          protein: 0,
          fat: 0,
          fiber: 0,
          carbs: 0,
        })
      );

      return { isNewDay: false, today, showGreeting: false };
    }

    // Same day, reset already happened
    return { isNewDay: false, today, showGreeting: false };
  } catch (error) {
    console.error('[DailyReset] Daily reset error:', error);
    return {
      isNewDay: false,
      today: dateUtils.today(),
      showGreeting: false,
    };
  }
};

/**
 * Check if streak should be broken or freeze should be used
 * Called when a new day is detected
 */
const checkStreakValidity = async (today: string, lastOpenedDate: string | null) => {
  try {
    if (!lastOpenedDate) return;

    const streakKey = 'pantryiq_streak_data';
    const streakStr = await AsyncStorage.getItem(streakKey);
    if (!streakStr) return;

    const streak = JSON.parse(streakStr);

    // Calculate if user missed any days
    const daysDifference = dateUtils.daysDifference(today, lastOpenedDate);

    // If difference is > 1, user missed a day(s)
    if (daysDifference > 1) {
      console.log(
        `[Streak] User missed ${daysDifference - 1} day(s). lastOpenedDate=${lastOpenedDate}, today=${today}`
      );

      const freezes = streak.freezesAvailable || 0;
      if (freezes > 0) {
        // Use a freeze automatically
        console.log('[Streak] Using streak freeze');
        await AsyncStorage.setItem(
          streakKey,
          JSON.stringify({
            ...streak,
            freezesAvailable: freezes - 1,
            freezeUsedDate: today,
          })
        );
      } else {
        // Break the streak
        console.log('[Streak] Breaking streak — no freezes available');
        await AsyncStorage.setItem(
          streakKey,
          JSON.stringify({
            ...streak,
            currentStreak: 0,
            streakBrokenDate: today,
            previousBestStreak: Math.max(
              streak.longestStreak || 0,
              streak.currentStreak || 0
            ),
          })
        );
      }
    } else if (daysDifference === 1) {
      // User opened app yesterday, now it's a new day
      // Increment streak if they logged meals yesterday
      const yesterdayMealLogKey = `pantryiq_meal_log_${lastOpenedDate}`;
      const yesterdayLogStr = await AsyncStorage.getItem(yesterdayMealLogKey);

      if (yesterdayLogStr) {
        try {
          const yesterdayLog = JSON.parse(yesterdayLogStr);
          const hasEntries =
            (yesterdayLog.breakfast?.length || 0) +
            (yesterdayLog.lunch?.length || 0) +
            (yesterdayLog.dinner?.length || 0) +
            (yesterdayLog.snacks?.length || 0) > 0;

          if (hasEntries) {
            console.log('[Streak] Incrementing streak — user logged meals yesterday');
            await AsyncStorage.setItem(
              streakKey,
              JSON.stringify({
                ...streak,
                currentStreak: (streak.currentStreak || 0) + 1,
                longestStreak: Math.max(
                  streak.longestStreak || 0,
                  (streak.currentStreak || 0) + 1
                ),
              })
            );
          }
        } catch (e) {
          console.warn('Failed to check yesterday meal log:', e);
        }
      }
    }
  } catch (error) {
    console.error('[Streak] Streak validity check error:', error);
  }
};

/**
 * Reset the daily reset check (useful for testing)
 * Removes the daily reset completion marker to force a new reset next app open
 */
export const resetDailyCheckForTesting = async () => {
  try {
    await AsyncStorage.removeItem(DAILY_RESET_COMPLETE_KEY);
    await AsyncStorage.removeItem(LAST_OPENED_DATE_KEY);
    console.log('[DailyReset] Reset markers cleared for testing');
  } catch (error) {
    console.error('[DailyReset] Failed to reset for testing:', error);
  }
};
