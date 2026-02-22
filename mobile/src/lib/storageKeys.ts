/**
 * Centralized AsyncStorage key constants for PantryIQ
 * All keys follow a consistent naming pattern for easy management
 */

// ─── Meals Store ──────────────────────────────────────────────────────────
export const MEAL_LOG_KEY = 'mealLog';
export const getMealLogKey = (dateYYYYMMDD: string) => `${MEAL_LOG_KEY}_${dateYYYYMMDD}`;
export const MEALS_STORE_KEY = 'pantryiq-meals-store';

// ─── Pantry Store ─────────────────────────────────────────────────────────
export const PANTRY_STORE_KEY = 'pantryiq-pantry-store';
export const PANTRY_ITEM_KEY = 'pantryItem';
export const getPantryItemKey = (itemId: string) => `${PANTRY_ITEM_KEY}_${itemId}`;

// ─── Shopping Store ───────────────────────────────────────────────────────
export const SHOPPING_STORE_KEY = 'pantryiq-shopping-store';
export const SHOPPING_LIST_KEY = 'shoppingList';
export const SHOPPING_TRIP_KEY = 'shoppingTrip';
export const getShoppingTripKey = (tripId: string) => `${SHOPPING_TRIP_KEY}_${tripId}`;

// ─── Health Store ─────────────────────────────────────────────────────────
export const HEALTH_STORE_KEY = 'pantryiq-health-store';
export const WEIGHT_ENTRY_KEY = 'weightEntry';
export const getWeightEntryKey = (dateYYYYMMDD: string) => `${WEIGHT_ENTRY_KEY}_${dateYYYYMMDD}`;
export const MEASUREMENT_ENTRY_KEY = 'measurementEntry';
export const getMeasurementEntryKey = (dateYYYYMMDD: string) => `${MEASUREMENT_ENTRY_KEY}_${dateYYYYMMDD}`;
export const PROGRESS_PHOTO_KEY = 'progressPhoto';
export const getProgressPhotoKey = (photoId: string) => `${PROGRESS_PHOTO_KEY}_${photoId}`;

// ─── Recipes Store ────────────────────────────────────────────────────────
export const RECIPES_STORE_KEY = 'pantryiq-recipes-store';
export const RECIPE_KEY = 'recipe';
export const getRecipeKey = (recipeId: string) => `${RECIPE_KEY}_${recipeId}`;
export const RECIPE_FOLDER_KEY = 'recipeFolder';
export const getRecipeFolderKey = (folderId: string) => `${RECIPE_FOLDER_KEY}_${folderId}`;

// ─── Fasting Store ────────────────────────────────────────────────────────
export const FASTING_STORE_KEY = 'pantryiq-fasting-store';
export const FASTING_SESSION_KEY = 'fastingSession';
export const getFastingSessionKey = (sessionId: string) => `${FASTING_SESSION_KEY}_${sessionId}`;
export const FASTING_HISTORY_KEY = 'fastingHistory';
export const getFastingHistoryKey = (dateYYYYMMDD: string) => `${FASTING_HISTORY_KEY}_${dateYYYYMMDD}`;

// ─── Nutrition Store ──────────────────────────────────────────────────────
export const NUTRITION_STORE_KEY = 'pantryiq-nutrition-store';
export const MACRO_GOALS_KEY = 'macroGoals';
export const USER_METRICS_KEY = 'userMetrics';
export const NET_CARB_ENTRY_KEY = 'netCarbEntry';
export const getNetCarbEntryKey = (entryId: string) => `${NET_CARB_ENTRY_KEY}_${entryId}`;

// ─── App Store ────────────────────────────────────────────────────────────
export const APP_STORE_KEY = 'pantryiq-app-store';

// ─── Utility: Date format helper ───────────────────────────────────────────
export const getDateKey = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};
