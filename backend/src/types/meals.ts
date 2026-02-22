/**
 * API Contract for Meal Analysis Endpoint
 *
 * This file documents the types and contract for the meal analysis endpoint.
 * Use these types in your mobile app to ensure end-to-end type safety.
 */

/**
 * Request Types
 */

export interface PantryItem {
  id: string;
  name: string;
  brand?: string;
  nutrition: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
    netCarbs: number;
  };
  servingUnit: string;
}

export interface UserProfile {
  dailyCarbGoal: number;
  dailyCalorieGoal: number;
  personalityMode: string;
}

export interface AnalyzeMealRequest {
  userMessage: string; // Natural language description of meal (e.g., "I just had 2 eggs with bacon")
  pantryItems: PantryItem[]; // User's current pantry for matching
  userProfile: UserProfile; // User's dietary goals and preferences
}

/**
 * Response Types
 */

export interface IdentifiedFood {
  name: string; // Name of the food item
  quantity: string | null; // Numeric quantity if mentioned
  unit: string | null; // Unit of measurement (grams, ounces, pieces, cups, etc.)
  cookingMethod: string | null; // How the food was prepared (fried, roasted, boiled, etc.)
  inPantry: boolean; // Whether this item exists in the user's pantry
  estimatedCalories: number; // Estimated calories based on quantity and USDA data
  estimatedNetCarbs: number; // Estimated net carbs (carbs - fiber)
  estimatedProtein: number; // Estimated protein in grams
  estimatedFat: number; // Estimated fat in grams
  confidence: "high" | "medium" | "low"; // Confidence in the estimate
}

export interface MealAnalysisResponse {
  isMealDescription: boolean; // Whether the message describes an actual meal eaten
  identifiedFoods: IdentifiedFood[]; // List of identified food items
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "unknown"; // Type of meal
  mealTypeConfidence: "high" | "medium" | "low"; // Confidence in meal type detection
  missingInfo: string[]; // Information needed for accurate logging
  canLogNow: boolean; // Whether the meal can be logged with current information
  followUpQuestions: string[]; // Up to 3 follow-up questions ordered by importance
  totalEstimatedCalories: number; // Sum of all food calories
  totalEstimatedNetCarbs: number; // Sum of all food net carbs
  totalEstimatedProtein: number; // Sum of all food protein
  totalEstimatedFat: number; // Sum of all food fat
  pantryItemsToDeduct: string[]; // Names of pantry items to reduce quantities
  logConfidenceMessage: string; // User-friendly message about logging confidence
}

/**
 * Endpoint Details
 *
 * POST /api/meals/analyze
 *
 * Accepts a natural language meal description and returns comprehensive analysis
 * including identified foods, nutritional estimates, and guidance on logging.
 *
 * Features:
 * - Meal detection using Claude API (with heuristic fallback)
 * - Food item extraction with quantity and cooking method parsing
 * - Automatic pantry item matching
 * - USDA-based nutritional estimates with quantity scaling
 * - Meal type detection (breakfast, lunch, dinner, snack)
 * - Follow-up question generation for missing information
 * - Confidence levels for all estimates
 *
 * Example Request:
 * {
 *   "userMessage": "I just had 2 crispy pork rind chicken thighs with roasted broccoli",
 *   "pantryItems": [
 *     {
 *       "id": "1",
 *       "name": "chicken thighs",
 *       "nutrition": { ... },
 *       "servingUnit": "100g"
 *     }
 *   ],
 *   "userProfile": {
 *     "dailyCarbGoal": 50,
 *     "dailyCalorieGoal": 2000,
 *     "personalityMode": "casual"
 *   }
 * }
 *
 * Example Response (when canLogNow = true):
 * {
 *   "data": {
 *     "isMealDescription": true,
 *     "identifiedFoods": [
 *       {
 *         "name": "chicken thighs",
 *         "quantity": "2",
 *         "unit": null,
 *         "cookingMethod": "roasted",
 *         "inPantry": true,
 *         "estimatedCalories": 418,
 *         "estimatedNetCarbs": 0,
 *         "estimatedProtein": 52,
 *         "estimatedFat": 22,
 *         "confidence": "high"
 *       }
 *     ],
 *     "mealType": "dinner",
 *     "mealTypeConfidence": "high",
 *     "missingInfo": [],
 *     "canLogNow": true,
 *     "followUpQuestions": [],
 *     "totalEstimatedCalories": 418,
 *     "totalEstimatedNetCarbs": 0,
 *     "totalEstimatedProtein": 52,
 *     "totalEstimatedFat": 22,
 *     "pantryItemsToDeduct": ["chicken thighs"],
 *     "logConfidenceMessage": "This meal has about 418 calories and 0g net carbs. This fits well within your daily carb goals."
 *   }
 * }
 */
