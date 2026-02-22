/**
 * Food Exploration Utility
 * Detects when Chef Claude is in exploration mode and extracts relevant context
 */

export interface ExplorationTrigger {
  isExploration: boolean;
  triggerType?: 'pairing' | 'elevation' | 'substitution' | 'preparation' | 'flavor' | 'suggestion';
  detectedFoods: string[];
  context: string;
}

// Triggers that indicate exploration mode (asking for ideas, pairings, etc.)
const EXPLORATION_TRIGGERS = [
  'what goes good with',
  'what pairs with',
  'what can i pair',
  'how do i elevate',
  'how do i make this better',
  'what sauce goes with',
  'what spices work with',
  'give me ideas for',
  'what can i do with',
  'how do i use this',
  'suggestions for',
  'what would complement',
  'how should i prepare',
  'best way to cook',
  'what seasonings',
  'flavor combinations',
];

/**
 * Detects if user message is exploring food ideas
 */
export function detectExplorationTrigger(userMessage: string): ExplorationTrigger {
  const lowerMessage = userMessage.toLowerCase();

  for (const trigger of EXPLORATION_TRIGGERS) {
    if (lowerMessage.includes(trigger)) {
      let triggerType: ExplorationTrigger['triggerType'] = 'suggestion';

      if (
        trigger.includes('pair') ||
        trigger.includes('goes') ||
        trigger.includes('complement')
      ) {
        triggerType = 'pairing';
      } else if (trigger.includes('elevate') || trigger.includes('better')) {
        triggerType = 'elevation';
      } else if (trigger.includes('use') || trigger.includes('prepare')) {
        triggerType = 'preparation';
      } else if (trigger.includes('sauce') || trigger.includes('seasoning') || trigger.includes('spice')) {
        triggerType = 'flavor';
      }

      return {
        isExploration: true,
        triggerType,
        detectedFoods: extractFoodsFromMessage(userMessage),
        context: userMessage.substring(0, 100),
      };
    }
  }

  return {
    isExploration: false,
    detectedFoods: [],
    context: '',
  };
}

/**
 * Extract potential food items from user message
 */
export function extractFoodsFromMessage(message: string): string[] {
  // Simple extraction - looks for capitalized words and common food terms
  const words = message.split(/\s+/);
  const foods: string[] = [];

  const commonFoods = [
    'chicken',
    'beef',
    'pork',
    'fish',
    'salmon',
    'shrimp',
    'bacon',
    'egg',
    'cheese',
    'cream',
    'butter',
    'oil',
    'garlic',
    'onion',
    'pepper',
    'salt',
    'herb',
    'spice',
    'sauce',
    'rice',
    'pasta',
    'bread',
    'vegetable',
    'carrot',
    'spinach',
    'broccoli',
    'cauliflower',
    'tomato',
    'cucumber',
    'lettuce',
    'basil',
    'parmesan',
    'sriracha',
    'lemon',
    'lime',
    'mushroom',
    'avocado',
  ];

  for (const word of words) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (commonFoods.includes(clean) && !foods.includes(clean)) {
      foods.push(clean);
    }
  }

  return foods;
}

/**
 * Cross-reference mentioned foods with available pantry items
 */
export function crossReferencePantryItems(
  mentionedFoods: string[],
  pantryItems: { name: string; brand?: string }[]
): {
  available: string[];
  missing: string[];
} {
  const available: string[] = [];
  const missing: string[] = [];

  for (const food of mentionedFoods) {
    const found = pantryItems.some(
      (item) =>
        item.name.toLowerCase().includes(food) ||
        food.includes(item.name.toLowerCase())
    );

    if (found) {
      available.push(food);
    } else {
      missing.push(food);
    }
  }

  return { available, missing };
}

/**
 * Build context string for Claude about current exploration
 */
export function buildExplorationContext(
  trigger: ExplorationTrigger,
  availableFoods: string[],
  missingFoods: string[],
  userPreferences: string
): string {
  if (!trigger.isExploration) return '';

  let context = `\n[EXPLORATION MODE ACTIVE]\nUser is exploring food ideas.\n`;
  context += `Trigger type: ${trigger.triggerType}\n`;

  if (availableFoods.length > 0) {
    context += `User has these items available: ${availableFoods.join(', ')}\n`;
  }

  if (missingFoods.length > 0) {
    context += `User mentioned these items they don't have: ${missingFoods.join(', ')}\n`;
  }

  if (userPreferences) {
    context += `User preferences: ${userPreferences}\n`;
  }

  context += `When responding, provide specific preparation methods and exact measurements. Ask follow-up questions to narrow down suggestions. Mention what user has vs missing. Check if any of their pantry items would work.\n`;

  return context;
}

/**
 * Detect when user gives positive response to a suggestion
 */
export function detectPositiveResponse(userMessage: string): boolean {
  const positiveIndicators = [
    'sounds good',
    'i like that',
    'that sounds great',
    'perfect',
    'i will try',
    'i\'ll try',
    'that sounds delicious',
    'yes please',
    'yum',
    'love that',
    'excellent',
    'amazing',
    'awesome',
    'great idea',
    'let\'s do it',
    'save that',
  ];

  const lower = userMessage.toLowerCase();
  return positiveIndicators.some((indicator) => lower.includes(indicator));
}

/**
 * Extract recipe from Claude response when it contains preparation instructions
 */
export function extractRecipeFromResponse(claudeResponse: string): {
  hasRecipe: boolean;
  recipeName?: string;
  servingTime?: string;
  ingredients?: string[];
  instructions?: string[];
} {
  // Look for numbered steps (1. 2. 3.) or ingredient lists
  const hasNumberedSteps =
    /^\s*\d+\.\s/m.test(claudeResponse);
  const hasIngredientMarkers = /[-•]\s+\d+\s+(tbsp|tsp|oz|cup|lb|g)/i.test(
    claudeResponse
  );

  if (!hasNumberedSteps && !hasIngredientMarkers) {
    return { hasRecipe: false };
  }

  // Extract prep time if mentioned
  const timeMatch = claudeResponse.match(/(\d+)\s*(minute|min|second|sec)\s+/i);
  const servingTime = timeMatch ? timeMatch[0].trim() : undefined;

  // Extract instructions (numbered lines)
  const instructions: string[] = [];
  const stepRegex = /^\s*\d+\.\s+(.+?)(?=\n\s*\d+\.|$)/gm;
  let match;
  while ((match = stepRegex.exec(claudeResponse)) !== null) {
    instructions.push(match[1].trim());
  }

  return {
    hasRecipe: true,
    servingTime,
    instructions: instructions.length > 0 ? instructions : undefined,
  };
}
