/**
 * Meal Analysis Types and Utilities
 * Handles natural language meal detection and backend integration
 */

export interface IdentifiedFood {
  name: string;
  quantity: string | null;
  unit: string | null;
  cookingMethod: string | null;
  inPantry: boolean;
  estimatedCalories: number;
  estimatedNetCarbs: number;
  estimatedProtein: number;
  estimatedFat: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface AdditionalAction {
  action: 'delete' | 'move';
  deleteCount?: number; // For delete actions - how many duplicate entries to remove
  targetDate?: string; // For delete actions - which date to delete from
  mealType?: string; // For delete actions - which meal type to delete from
}

export interface MealAnalysis {
  isMealDescription: boolean;
  identifiedFoods: IdentifiedFood[];
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'unknown';
  mealTypeConfidence: 'high' | 'medium' | 'low';
  missingInfo: string[];
  canLogNow: boolean;
  followUpQuestions: string[];
  totalEstimatedCalories: number;
  totalEstimatedNetCarbs: number;
  totalEstimatedProtein: number;
  totalEstimatedFat: number;
  pantryItemsToDeduct: string[];
  logConfidenceMessage: string;
  targetDate?: string; // YYYY-MM-DD format, defaults to today if not specified
  displayDate?: string; // Human-readable date like "Today", "Yesterday", or day name
  additionalActions?: AdditionalAction[]; // Additional operations (delete duplicates, etc.)
  restaurant?: string | null; // Restaurant name if fast food item
  ketoStatus?: 'keto_friendly' | 'keto_moderate' | 'keto_borderline' | 'not_keto' | null; // Keto status
  ketoModification?: string | null; // Suggestion to make item keto
}

/**
 * Check if a user message describes a meal they ate
 * Uses pattern matching for fast initial detection
 */
export function isMealDescription(userMessage: string): boolean {
  const msg = userMessage.toLowerCase();

  // Meal patterns - things that indicate eating
  const mealPatterns = [
    'i just ate',
    'i just had',
    'just finished',
    'i had',
    'for breakfast',
    'for lunch',
    'for dinner',
    'for snack',
    'at breakfast',
    'at lunch',
    'at dinner',
    'just made',
    'finished cooking',
    'just fried',
    'just roasted',
    'just baked',
    'that was delicious',
    'i destroyed',
    'ate some',
    'earlier i',
  ];

  // Exclude patterns - things that are NOT meal descriptions
  const excludePatterns = [
    'how many',
    'how much',
    'what can i make',
    'recipe',
    'can i',
    'could i',
    'should i',
    "what's the",
    'how do',
    'i am going',
    "i'm going",
    'i want to make',
    'i love',
    'i like',
  ];

  // Check for exclude patterns first
  if (excludePatterns.some((pattern) => msg.includes(pattern))) {
    return false;
  }

  // Check for meal patterns
  return mealPatterns.some((pattern) => msg.includes(pattern));
}

/**
 * Get meal type icon emoji based on meal type
 */
export function getMealTypeEmoji(mealType: string): string {
  switch (mealType) {
    case 'breakfast':
      return '🌅';
    case 'lunch':
      return '🌤️';
    case 'dinner':
      return '🌙';
    case 'snack':
      return '🍿';
    default:
      return '🍽️';
  }
}

/**
 * Format meal type for display
 */
export function formatMealType(mealType: string): string {
  return mealType.charAt(0).toUpperCase() + mealType.slice(1);
}

/**
 * Convert nutrient estimate to display string
 */
export function formatNutrient(value: number, unit: string): string {
  if (Math.abs(value) < 0.1) return `0${unit}`;
  if (value % 1 === 0) return `${Math.round(value)}${unit}`;
  return `${(Math.round(value * 10) / 10).toFixed(1)}${unit}`;
}
