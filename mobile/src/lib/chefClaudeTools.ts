/**
 * Chef Claude Tools System
 * Provides full read and write access to all app data stores
 * Allows Claude to answer questions with real data and make updates
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalToday } from '@/lib/dateUtils';

// ─── HELPERS ───────────────────────────────────────────────────────────────

const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatLocalDate = (date: Date): string => {
  return getLocalDateString(date);
};

// ─── CHEF CLAUDE TOOLS ──────────────────────────────────────────────────────

export const ChefClaudeTools = {
  // ══════════════════════════════════════════════════════════════════════════
  // MEALS — Full read and write access to meal logs
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get all meals logged for today
   */
  async getTodaysMeals() {
    try {
      const key = `pantryiq_daily_log_${getLocalToday()}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting today meals:', error);
      return [];
    }
  },

  /**
   * Get meals for a specific date (YYYY-MM-DD format)
   */
  async getMealsForDate(dateString: string) {
    try {
      const key = `pantryiq_daily_log_${dateString}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`[ChefClaudeTools] Error getting meals for ${dateString}:`, error);
      return [];
    }
  },

  /**
   * Get all meals for the past 7 days
   */
  async getWeekMeals() {
    try {
      const meals: Record<string, any[]> = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = formatLocalDate(date);
        const key = `pantryiq_daily_log_${dateStr}`;
        const data = await AsyncStorage.getItem(key);
        if (data) {
          meals[dateStr] = JSON.parse(data);
        }
      }
      return meals;
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting week meals:', error);
      return {};
    }
  },

  /**
   * Get daily nutrition totals for today
   */
  async getTodaysTotals() {
    try {
      const meals = await this.getTodaysMeals();
      let totalCalories = 0;
      let totalNetCarbs = 0;
      let totalProtein = 0;
      let totalFat = 0;
      let totalFiber = 0;

      meals.forEach((meal: any) => {
        totalCalories += meal.calories || 0;
        totalNetCarbs += meal.netCarbs || 0;
        totalProtein += meal.protein || 0;
        totalFat += meal.fat || 0;
        totalFiber += meal.fiber || 0;
      });

      return {
        calories: totalCalories,
        netCarbs: totalNetCarbs,
        protein: totalProtein,
        fat: totalFat,
        fiber: totalFiber,
      };
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting totals:', error);
      return { calories: 0, netCarbs: 0, protein: 0, fat: 0, fiber: 0 };
    }
  },

  /**
   * Get daily nutrition totals for a specific date
   */
  async getTotalsForDate(dateString: string) {
    try {
      const meals = await this.getMealsForDate(dateString);
      let totalCalories = 0;
      let totalNetCarbs = 0;
      let totalProtein = 0;
      let totalFat = 0;
      let totalFiber = 0;

      meals.forEach((meal: any) => {
        totalCalories += meal.calories || 0;
        totalNetCarbs += meal.netCarbs || 0;
        totalProtein += meal.protein || 0;
        totalFat += meal.fat || 0;
        totalFiber += meal.fiber || 0;
      });

      return {
        date: dateString,
        calories: totalCalories,
        netCarbs: totalNetCarbs,
        protein: totalProtein,
        fat: totalFat,
        fiber: totalFiber,
      };
    } catch (error) {
      console.error(`[ChefClaudeTools] Error getting totals for ${dateString}:`, error);
      return { date: dateString, calories: 0, netCarbs: 0, protein: 0, fat: 0, fiber: 0 };
    }
  },

  /**
   * Log a new meal
   */
  async logMeal(mealData: {
    name: string;
    calories: number;
    netCarbs: number;
    protein: number;
    fat: number;
    fiber?: number;
    mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
    items?: any[];
  }) {
    try {
      const today = getLocalToday();
      const key = `pantryiq_daily_log_${today}`;
      const existing = await AsyncStorage.getItem(key);
      const meals = existing ? JSON.parse(existing) : [];

      const entry = {
        id: `meal_${Date.now()}`,
        name: mealData.name,
        calories: mealData.calories || 0,
        netCarbs: mealData.netCarbs || 0,
        protein: mealData.protein || 0,
        fat: mealData.fat || 0,
        fiber: mealData.fiber || 0,
        mealType: mealData.mealType,
        items: mealData.items || [],
        loggedAt: new Date().toISOString(),
        date: today,
        servings: 1,
        carbs: mealData.netCarbs || 0,
        isFavorite: false,
      };

      meals.push(entry);
      await AsyncStorage.setItem(key, JSON.stringify(meals));
      console.log('[ChefClaudeTools] Meal logged:', entry);
      return entry;
    } catch (error) {
      console.error('[ChefClaudeTools] Error logging meal:', error);
      return null;
    }
  },

  /**
   * Delete a meal by ID
   */
  async deleteMeal(mealId: string, date?: string) {
    try {
      const dateStr = date || getLocalToday();
      const key = `pantryiq_daily_log_${dateStr}`;
      const data = await AsyncStorage.getItem(key);
      if (!data) return false;

      const meals = JSON.parse(data);
      const filtered = meals.filter((m: any) => m.id !== mealId);
      await AsyncStorage.setItem(key, JSON.stringify(filtered));
      console.log('[ChefClaudeTools] Meal deleted:', mealId);
      return true;
    } catch (error) {
      console.error('[ChefClaudeTools] Error deleting meal:', error);
      return false;
    }
  },

  /**
   * Update a meal
   */
  async updateMeal(mealId: string, updates: any, date?: string) {
    try {
      const dateStr = date || getLocalToday();
      const key = `pantryiq_daily_log_${dateStr}`;
      const data = await AsyncStorage.getItem(key);
      if (!data) return false;

      const meals = JSON.parse(data);
      const updated = meals.map((m: any) =>
        m.id === mealId ? { ...m, ...updates } : m
      );
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      console.log('[ChefClaudeTools] Meal updated:', mealId);
      return true;
    } catch (error) {
      console.error('[ChefClaudeTools] Error updating meal:', error);
      return false;
    }
  },

  /**
   * Clear all meals for a specific date
   */
  async clearMealsForDate(dateString: string) {
    try {
      const key = `pantryiq_daily_log_${dateString}`;
      await AsyncStorage.removeItem(key);
      console.log('[ChefClaudeTools] Cleared meals for date:', dateString);
      return true;
    } catch (error) {
      console.error('[ChefClaudeTools] Error clearing meals:', error);
      return false;
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PANTRY — Full read and write access to pantry items
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get all pantry items
   */
  async getPantryItems() {
    try {
      const data = await AsyncStorage.getItem('pantryiq-pantry-store');
      if (data) {
        const store = JSON.parse(data);
        return store.state?.items || [];
      }
      return [];
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting pantry items:', error);
      return [];
    }
  },

  /**
   * Find pantry items by name or category
   */
  async searchPantry(query: string) {
    try {
      const items = await this.getPantryItems();
      return items.filter((item: any) =>
        item.name?.toLowerCase().includes(query.toLowerCase()) ||
        item.category?.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('[ChefClaudeTools] Error searching pantry:', error);
      return [];
    }
  },

  /**
   * Check if pantry has a specific item
   */
  async hasPantryItem(itemName: string): Promise<boolean> {
    try {
      const items = await this.getPantryItems();
      return items.some((item: any) =>
        item.name?.toLowerCase().includes(itemName.toLowerCase())
      );
    } catch (error) {
      console.error('[ChefClaudeTools] Error checking pantry item:', error);
      return false;
    }
  },

  /**
   * Get low stock items (quantity below threshold)
   */
  async getLowStockItems() {
    try {
      const items = await this.getPantryItems();
      return items.filter((item: any) =>
        item.quantity !== undefined &&
        item.lowStockThreshold !== undefined &&
        item.quantity <= item.lowStockThreshold
      );
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting low stock items:', error);
      return [];
    }
  },

  /**
   * Get items expiring soon
   */
  async getExpiringItems() {
    try {
      const today = new Date();
      const items = await this.getPantryItems();
      return items.filter((item: any) => {
        if (!item.expiryDate) return false;
        const expiry = new Date(item.expiryDate);
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        return expiry <= threeDaysFromNow;
      });
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting expiring items:', error);
      return [];
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SHOPPING LIST — Full read and write access to shopping list
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get current shopping list
   */
  async getShoppingList() {
    try {
      const data = await AsyncStorage.getItem('pantryiq-shopping-store');
      if (data) {
        const store = JSON.parse(data);
        return store.state?.items || [];
      }
      return [];
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting shopping list:', error);
      return [];
    }
  },

  /**
   * Add items to shopping list
   */
  async addToShoppingList(items: any | any[]) {
    try {
      const itemArray = Array.isArray(items) ? items : [items];
      const list = await this.getShoppingList();

      itemArray.forEach((item: any) => {
        const exists = list.find(
          (i: any) => i.name?.toLowerCase() === item.name?.toLowerCase()
        );
        if (!exists) {
          list.push({
            id: `shop_${Date.now()}_${Math.random()}`,
            name: item.name,
            quantity: item.quantity || 1,
            unit: item.unit || '',
            category: item.category || '',
            checked: false,
            addedAt: new Date().toISOString(),
            addedBy: 'chef_claude',
          });
        }
      });

      // Update store
      const data = await AsyncStorage.getItem('pantryiq-shopping-store');
      const store = data ? JSON.parse(data) : { state: { items: [] } };
      store.state.items = list;
      await AsyncStorage.setItem('pantryiq-shopping-store', JSON.stringify(store));

      console.log('[ChefClaudeTools] Items added to shopping list:', itemArray);
      return list;
    } catch (error) {
      console.error('[ChefClaudeTools] Error adding to shopping list:', error);
      return [];
    }
  },

  /**
   * Remove item from shopping list
   */
  async removeFromShoppingList(itemName: string) {
    try {
      const list = await this.getShoppingList();
      const updated = list.filter(
        (i: any) => i.name?.toLowerCase() !== itemName.toLowerCase()
      );

      const data = await AsyncStorage.getItem('pantryiq-shopping-store');
      const store = data ? JSON.parse(data) : { state: { items: [] } };
      store.state.items = updated;
      await AsyncStorage.setItem('pantryiq-shopping-store', JSON.stringify(store));

      console.log('[ChefClaudeTools] Item removed from shopping list:', itemName);
      return true;
    } catch (error) {
      console.error('[ChefClaudeTools] Error removing from shopping list:', error);
      return false;
    }
  },

  /**
   * Clear entire shopping list
   */
  async clearShoppingList() {
    try {
      const data = await AsyncStorage.getItem('pantryiq-shopping-store');
      const store = data ? JSON.parse(data) : { state: { items: [] } };
      store.state.items = [];
      await AsyncStorage.setItem('pantryiq-shopping-store', JSON.stringify(store));
      console.log('[ChefClaudeTools] Shopping list cleared');
      return true;
    } catch (error) {
      console.error('[ChefClaudeTools] Error clearing shopping list:', error);
      return false;
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // USER PROFILE & GOALS — Read and write access to health goals and settings
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get user profile and goals
   */
  async getUserProfile() {
    try {
      const data = await AsyncStorage.getItem('pantryiq-app-store');
      if (data) {
        const store = JSON.parse(data);
        return store.state?.userProfile || {};
      }
      return {};
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting user profile:', error);
      return {};
    }
  },

  /**
   * Get daily goals (carb, calorie, protein, fat targets)
   */
  async getDailyGoals() {
    try {
      const profile = await this.getUserProfile();
      return {
        dailyCarbGoal: profile.dailyCarbGoal || 20,
        dailyCalorieGoal: profile.dailyCalorieGoal || 1800,
        dailyProteinGoal: profile.dailyProteinGoal || 120,
        dailyFatGoal: profile.dailyFatGoal || 140,
        waterGoal: profile.waterGoal || 80,
      };
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting daily goals:', error);
      return {
        dailyCarbGoal: 20,
        dailyCalorieGoal: 1800,
        dailyProteinGoal: 120,
        dailyFatGoal: 140,
        waterGoal: 80,
      };
    }
  },

  /**
   * Update user goals
   */
  async updateUserGoals(updates: any) {
    try {
      const data = await AsyncStorage.getItem('pantryiq-app-store');
      const store = data ? JSON.parse(data) : { state: { userProfile: {} } };
      store.state.userProfile = { ...store.state.userProfile, ...updates };
      await AsyncStorage.setItem('pantryiq-app-store', JSON.stringify(store));
      console.log('[ChefClaudeTools] User goals updated:', updates);
      return store.state.userProfile;
    } catch (error) {
      console.error('[ChefClaudeTools] Error updating user goals:', error);
      return null;
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HEALTH TRACKING — Weight and body metrics
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get weight log history
   */
  async getWeightLog() {
    try {
      const data = await AsyncStorage.getItem('pantryiq-health-store');
      if (data) {
        const store = JSON.parse(data);
        return store.state?.weightEntries || [];
      }
      return [];
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting weight log:', error);
      return [];
    }
  },

  /**
   * Get current weight (most recent entry)
   */
  async getCurrentWeight() {
    try {
      const entries = await this.getWeightLog();
      if (entries.length === 0) return null;
      const sorted = entries.sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      return sorted[0];
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting current weight:', error);
      return null;
    }
  },

  /**
   * Get weight progress (from first logged to now)
   */
  async getWeightProgress() {
    try {
      const entries = await this.getWeightLog();
      if (entries.length < 2) return null;

      const sorted = entries.sort(
        (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const first = sorted[0];
      const latest = sorted[sorted.length - 1];
      const loss = first.weight - latest.weight;

      return {
        startWeight: first.weight,
        currentWeight: latest.weight,
        weightLost: loss,
        startDate: first.date,
        days: Math.floor(
          (new Date(latest.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24)
        ),
      };
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting weight progress:', error);
      return null;
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // RECIPES & FAVORITES — Recipe box and favorite meals
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get saved recipes
   */
  async getSavedRecipes() {
    try {
      const data = await AsyncStorage.getItem('pantryiq-recipes-store');
      if (data) {
        const store = JSON.parse(data);
        return store.state?.recipes || [];
      }
      return [];
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting recipes:', error);
      return [];
    }
  },

  /**
   * Get favorite meals
   */
  async getFavoriteMeals() {
    try {
      const meals = await this.getTodaysMeals();
      return meals.filter((m: any) => m.isFavorite === true);
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting favorite meals:', error);
      return [];
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // STREAKS & ACHIEVEMENTS — Gamification data
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get current streak data
   */
  async getStreakData() {
    try {
      const data = await AsyncStorage.getItem('pantryiq-app-store');
      if (data) {
        const store = JSON.parse(data);
        return store.state?.streak || { currentStreak: 0, longestStreak: 0 };
      }
      return { currentStreak: 0, longestStreak: 0 };
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting streak data:', error);
      return { currentStreak: 0, longestStreak: 0 };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SUMMARY — High-level insights and analysis
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get complete daily summary (meals, totals, goals, progress)
   */
  async getDailySummary(dateString?: string) {
    try {
      const date = dateString || getLocalToday();
      const meals = await this.getMealsForDate(date);
      const totals = await this.getTotalsForDate(date);
      const goals = await this.getDailyGoals();

      return {
        date,
        meals,
        totals,
        goals,
        progress: {
          caloriePercent: Math.round((totals.calories / goals.dailyCalorieGoal) * 100),
          carbPercent: Math.round((totals.netCarbs / goals.dailyCarbGoal) * 100),
          proteinPercent: Math.round((totals.protein / goals.dailyProteinGoal) * 100),
          fatPercent: Math.round((totals.fat / goals.dailyFatGoal) * 100),
        },
        remaining: {
          calories: Math.max(0, goals.dailyCalorieGoal - totals.calories),
          carbs: Math.max(0, goals.dailyCarbGoal - totals.netCarbs),
          protein: Math.max(0, goals.dailyProteinGoal - totals.protein),
          fat: Math.max(0, goals.dailyFatGoal - totals.fat),
        },
      };
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting daily summary:', error);
      return null;
    }
  },

  /**
   * Get week overview (7-day summary)
   */
  async getWeekOverview() {
    try {
      const weekMeals = await ChefClaudeTools.getWeekMeals();
      const weekSummary: any = {};

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = formatLocalDate(date);
        const summary = await ChefClaudeTools.getDailySummary(dateStr);
        weekSummary[dateStr] = summary;
      }

      return weekSummary;
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting week overview:', error);
      return {};
    }
  },

  /**
   * Get complete app snapshot with all critical data
   * Used by Chef Claude system prompt to have real-time access to app state
   */
  async getFullAppSnapshot() {
    try {
      // Get daily summary using existing function
      const dailySummary = await ChefClaudeTools.getDailySummary();

      // Get week overview using existing function
      const weekOverview = await ChefClaudeTools.getWeekOverview();

      // Read streak directly with CORRECT key
      const streakRaw = await AsyncStorage.getItem('pantryiq_streak_data');
      const streak = streakRaw
        ? JSON.parse(streakRaw)
        : {
            currentStreak: 0,
            longestStreak: 0,
            lastLoggedDate: null,
          };

      // Read yesterday's meals with CORRECT key format
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = [
        yesterday.getFullYear(),
        String(yesterday.getMonth() + 1).padStart(2, '0'),
        String(yesterday.getDate()).padStart(2, '0'),
      ].join('-');

      const yesterdayRaw = await AsyncStorage.getItem('pantryiq_daily_log_' + yStr);
      const yesterdayMeals = yesterdayRaw ? JSON.parse(yesterdayRaw) : [];

      // Read fasting from correct key
      const fastingRaw = await AsyncStorage.getItem('pantryiq_active_fast');
      const fasting = fastingRaw ? JSON.parse(fastingRaw) : null;

      return {
        dailySummary,
        weekOverview,
        streak,
        yesterdayMeals,
        yesterdayDate: yStr,
        fasting,
      };
    } catch (error) {
      console.error('[ChefClaudeTools] Error getting full app snapshot:', error);
      return {
        dailySummary: null,
        weekOverview: {},
        streak: { currentStreak: 0, longestStreak: 0, lastLoggedDate: null },
        yesterdayMeals: [],
        yesterdayDate: '',
        fasting: null,
      };
    }
  },
};

export type ChefClaudeToolsType = typeof ChefClaudeTools;

/**
 * Get complete app snapshot - exported for direct use in system prompt
 */
export const getFullAppSnapshot = ChefClaudeTools.getFullAppSnapshot;
