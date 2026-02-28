/**
 * Chef Claude API Integration
 * Exposes ChefClaudeTools to Claude AI for data access and updates
 *
 * This module provides Claude with a safe way to:
 * - Read meal logs, pantry data, goals, health metrics
 * - Answer questions with real app data
 * - Update meals, shopping lists, user goals
 * - Provide insights and recommendations
 */

import { ChefClaudeTools } from '@/lib/chefClaudeTools';

export const ChefClaudeAPI = {
  /**
   * Get all available data that Claude needs to answer a question
   * Returns comprehensive snapshot of user's current state
   */
  async getAppState() {
    const [
      todaysMeals,
      todaysTotals,
      dailyGoals,
      pantryItems,
      shoppingList,
      weightProgress,
      streakData,
    ] = await Promise.all([
      ChefClaudeTools.getTodaysMeals(),
      ChefClaudeTools.getTodaysTotals(),
      ChefClaudeTools.getDailyGoals(),
      ChefClaudeTools.getPantryItems(),
      ChefClaudeTools.getShoppingList(),
      ChefClaudeTools.getWeightProgress(),
      ChefClaudeTools.getStreakData(),
    ]);

    return {
      today: {
        meals: todaysMeals,
        totals: todaysTotals,
        goals: dailyGoals,
      },
      pantry: {
        items: pantryItems,
        lowStock: await ChefClaudeTools.getLowStockItems(),
        expiring: await ChefClaudeTools.getExpiringItems(),
      },
      shopping: {
        list: shoppingList,
      },
      health: {
        weightProgress,
        streak: streakData,
      },
    };
  },

  /**
   * Execute a tool command with validation and error handling
   * Format: { tool: 'getMeals', params: { date: '2026-02-27' } }
   */
  async executeTool(command: {
    tool: string;
    params?: Record<string, any>;
  }): Promise<any> {
    try {
      const { tool, params = {} } = command;

      // Safety: Only allow whitelisted tools
      const allowedTools = [
        'getTodaysMeals',
        'getMealsForDate',
        'getWeekMeals',
        'getTodaysTotals',
        'getTotalsForDate',
        'logMeal',
        'deleteMeal',
        'updateMeal',
        'clearMealsForDate',
        'getPantryItems',
        'searchPantry',
        'hasPantryItem',
        'getLowStockItems',
        'getExpiringItems',
        'getShoppingList',
        'addToShoppingList',
        'removeFromShoppingList',
        'clearShoppingList',
        'getUserProfile',
        'getDailyGoals',
        'updateUserGoals',
        'getWeightLog',
        'getCurrentWeight',
        'getWeightProgress',
        'getSavedRecipes',
        'getFavoriteMeals',
        'getStreakData',
        'getDailySummary',
        'getWeekOverview',
      ];

      if (!allowedTools.includes(tool)) {
        throw new Error(`Tool "${tool}" is not allowed`);
      }

      const toolFn = (ChefClaudeTools as any)[tool];
      if (typeof toolFn !== 'function') {
        throw new Error(`Tool "${tool}" not found`);
      }

      // Call the tool with params
      const result = await toolFn.call(ChefClaudeTools, ...Object.values(params));
      return { success: true, data: result };
    } catch (error) {
      console.error('[ChefClaudeAPI] Tool execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * Helper: Get today's macros and remaining budget
   * Useful for quick macro questions
   */
  async getTodaysMacros() {
    const [totals, goals] = await Promise.all([
      ChefClaudeTools.getTodaysTotals(),
      ChefClaudeTools.getDailyGoals(),
    ]);

    return {
      consumed: totals,
      goals,
      remaining: {
        calories: Math.max(0, goals.dailyCalorieGoal - totals.calories),
        carbs: Math.max(0, goals.dailyCarbGoal - totals.netCarbs),
        protein: Math.max(0, goals.dailyProteinGoal - totals.protein),
        fat: Math.max(0, goals.dailyFatGoal - totals.fat),
      },
      percentages: {
        calories: Math.round((totals.calories / goals.dailyCalorieGoal) * 100),
        carbs: Math.round((totals.netCarbs / goals.dailyCarbGoal) * 100),
        protein: Math.round((totals.protein / goals.dailyProteinGoal) * 100),
        fat: Math.round((totals.fat / goals.dailyFatGoal) * 100),
      },
    };
  },

  /**
   * Helper: Check if user is on track with goals
   */
  async getGoalsStatus() {
    const macros = await this.getTodaysMacros();

    return {
      carbsOnTrack: macros.percentages.carbs <= 100,
      caloriesOnTrack: macros.percentages.calories <= 100,
      proteinOnTrack: macros.percentages.protein >= 80,
      fatOnTrack: macros.percentages.fat <= 100,
      overallOnTrack:
        macros.percentages.carbs <= 100 &&
        macros.percentages.calories <= 100 &&
        macros.percentages.protein >= 80 &&
        macros.percentages.fat <= 100,
    };
  },

  /**
   * Helper: Get what meals were logged today by type
   */
  async getMealsByType() {
    const meals = await ChefClaudeTools.getTodaysMeals();

    return {
      breakfast: meals.filter((m: any) => m.mealType === 'Breakfast'),
      lunch: meals.filter((m: any) => m.mealType === 'Lunch'),
      dinner: meals.filter((m: any) => m.mealType === 'Dinner'),
      snacks: meals.filter((m: any) => m.mealType === 'Snacks'),
    };
  },

  /**
   * Helper: Check if a specific food is in pantry
   */
  async canMakeFood(foodName: string) {
    // This would need recipe database to properly check
    // For now, just check if main ingredients are available
    const hasItem = await ChefClaudeTools.hasPantryItem(foodName);
    return hasItem;
  },

  /**
   * Helper: Get meal recommendations based on goals and pantry
   * Returns suggestions for next meal
   */
  async getMealSuggestions() {
    const [meals, pantry, macros] = await Promise.all([
      ChefClaudeTools.getTodaysMeals(),
      ChefClaudeTools.getPantryItems(),
      this.getTodaysMacros(),
    ]);

    const mealCount = meals.length;
    let nextMealType = 'Breakfast';

    if (mealCount === 0) nextMealType = 'Breakfast';
    else if (mealCount === 1) nextMealType = 'Lunch';
    else if (mealCount === 2) nextMealType = 'Dinner';
    else if (mealCount >= 3) nextMealType = 'Snack';

    return {
      nextMealType,
      caloriesBudget: macros.remaining.calories,
      carbsBudget: macros.remaining.carbs,
      availableIngredients: pantry.map((item: any) => item.name),
    };
  },
};

export type ChefClaudeAPIType = typeof ChefClaudeAPI;
