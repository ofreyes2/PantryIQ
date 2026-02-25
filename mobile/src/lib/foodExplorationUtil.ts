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
 * Extract multiple recipes from Claude response in numbered list or markdown format
 */
export function extractMultipleRecipesFromResponse(claudeResponse: string): Array<{
  recipeName?: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients?: string[];
  instructions?: string[];
  netCarbsPerServing?: number;
  caloriesPerServing?: number;
  difficulty?: number;
  crispiness?: number;
  equipment?: string;
  videoUrl?: string;
  imageUrl?: string;
}> {
  const recipes: Array<{
    recipeName?: string;
    description?: string;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    ingredients?: string[];
    instructions?: string[];
    netCarbsPerServing?: number;
    caloriesPerServing?: number;
    difficulty?: number;
    crispiness?: number;
    equipment?: string;
    videoUrl?: string;
    imageUrl?: string;
  }> = [];

  // Try markdown format first (## emoji NAME or # NAME)
  let recipeBlocks: string[];
  let isMarkdownFormat = false;

  if (claudeResponse.includes('##')) {
    recipeBlocks = claudeResponse.split(/\n##\s+(?:🍳|🧀|🍛|[^\n]*?)\s+([^\n]+)\n/);
    isMarkdownFormat = true;
  } else {
    // Fall back to numbered list format (1. Name, 2. Name, etc.)
    recipeBlocks = claudeResponse.split(/\n\d+\.\s+([^\n]+)\n/);
  }

  // First block is usually intro text, skip it
  for (let i = 1; i < recipeBlocks.length; i += 2) {
    const recipeName = recipeBlocks[i]?.trim();
    const recipeContent = recipeBlocks[i + 1] || '';

    if (!recipeName || !recipeContent.trim()) continue;

    // Extract description (text before table or bullet points)
    const descMatch = recipeContent.match(/^([^|•\-*]+?)(?=\||•|\-|\*|\n\n|$)/);
    const description = descMatch ? descMatch[1].trim().substring(0, 150) : undefined;

    // Extract table-based nutrition info
    const tableLines = recipeContent.split('\n').filter(line => line.includes('|'));

    let netCarbsPerServing: number | undefined;
    let caloriesPerServing: number | undefined;
    let cookTime: number | undefined;
    let equipment: string | undefined;
    let crispiness: number | undefined;
    let difficulty: number | undefined;
    let videoUrl: string | undefined;

    for (const line of tableLines) {
      if (line.includes('Net Carbs')) {
        const carbMatch = line.match(/(\d+)\s*g/);
        if (carbMatch) netCarbsPerServing = parseInt(carbMatch[1]);
      }
      if (line.includes('Calories')) {
        const calMatch = line.match(/~?(\d+)/);
        if (calMatch) caloriesPerServing = parseInt(calMatch[1]);
      }
      if (line.includes('Cook Time')) {
        const timeMatch = line.match(/(\d+)\s*(?:minute|min)/i);
        if (timeMatch) cookTime = parseInt(timeMatch[1]);
      }
      if (line.includes('Equipment')) {
        const eqMatch = line.match(/\|\s*([^|]+)\s*\|/);
        if (eqMatch) equipment = eqMatch[1].trim();
      }
      if (line.includes('Crispiness')) {
        const cripMatch = line.match(/🥨/g);
        if (cripMatch) crispiness = cripMatch.length;
      }
      if (line.includes('Difficulty')) {
        const diffMatch = line.match(/⭐/g);
        if (diffMatch) difficulty = diffMatch.length;
      }
    }

    // Extract ingredients (lines with bullet points or dashes)
    const ingredients: string[] = [];
    const ingredientRegex = /^\s*[-•*]\s+(.+?)$/gm;
    let match;
    while ((match = ingredientRegex.exec(recipeContent)) !== null) {
      const ingredient = match[1].trim();
      if (!ingredient.match(/^(mix|stir|heat|add|combine|cook|bake|fry|boil|season|serve|Table|\|)/i)) {
        ingredients.push(ingredient);
      }
    }

    // Extract instructions (numbered steps)
    const instructions: string[] = [];
    const instructionRegex = /^\s*\d+\.\s+(.+?)$/gm;
    while ((match = instructionRegex.exec(recipeContent)) !== null) {
      instructions.push(match[1].trim());
    }

    // Only add if it has a name and at least some content
    if (recipeName) {
      recipes.push({
        recipeName,
        description,
        prepTime: undefined,
        cookTime,
        servings: 1,
        ingredients: ingredients.length > 0 ? ingredients : undefined,
        instructions: instructions.length > 0 ? instructions : undefined,
        netCarbsPerServing,
        caloriesPerServing,
        difficulty,
        crispiness,
        equipment,
        videoUrl,
        imageUrl: undefined,
      });
    }
  }

  return recipes;
}

/**
 * Extract single recipe from Claude response when it contains preparation instructions
 */
export function extractRecipeFromResponse(claudeResponse: string): {
  hasRecipe: boolean;
  recipeName?: string;
  servingTime?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients?: string[];
  instructions?: string[];
  netCarbsPerServing?: number;
  caloriesPerServing?: number;
} {
  // Look for numbered steps (1. 2. 3.) or ingredient lists
  const hasNumberedSteps =
    /^\s*\d+\.\s/m.test(claudeResponse);
  const hasIngredientMarkers = /[-•]\s+\d+\s+(tbsp|tsp|oz|cup|lb|g|ml|serving)/i.test(
    claudeResponse
  );

  if (!hasNumberedSteps && !hasIngredientMarkers) {
    return { hasRecipe: false };
  }

  // Extract recipe name (usually in first line or after common headers)
  const nameMatch = claudeResponse.match(/^(?:##\s+)?([A-Z][A-Za-z\s]+?)(?:\n|$)/);
  const recipeName = nameMatch ? nameMatch[1].trim() : undefined;

  // Extract prep/cook time if mentioned
  const prepTimeMatch = claudeResponse.match(/(?:prep|preparation)\s+(?:time|time)?:?\s*(\d+)\s*(?:minute|min)/i);
  const cookTimeMatch = claudeResponse.match(/cook(?:ing)?\s+time:?\s*(\d+)\s*(?:minute|min)/i);
  const servingMatch = claudeResponse.match(/(?:yield|serves?):\s*(\d+)\s*(?:serving)?/i);

  const prepTime = prepTimeMatch ? parseInt(prepTimeMatch[1]) : undefined;
  const cookTime = cookTimeMatch ? parseInt(cookTimeMatch[1]) : undefined;
  const servings = servingMatch ? parseInt(servingMatch[1]) : undefined;

  // Extract first time mentioned if no specific labels (for servingTime display)
  const timeMatch = claudeResponse.match(/(\d+)\s*(?:minute|min|second|sec)\s*/i);
  const servingTime = timeMatch ? timeMatch[0].trim() : undefined;

  // Extract ingredients (lines with bullet points, dashes, or numbers)
  const ingredients: string[] = [];
  const ingredientRegex = /^\s*[-•*]\s+(.+?)$/gm;
  let match;
  while ((match = ingredientRegex.exec(claudeResponse)) !== null) {
    const ingredient = match[1].trim();
    // Filter out lines that look like instructions
    if (!ingredient.match(/^(mix|stir|heat|add|combine|cook|bake|fry|boil|season|serve)/i)) {
      ingredients.push(ingredient);
    }
  }

  // Extract instructions (numbered lines)
  const instructions: string[] = [];
  const stepRegex = /^\s*\d+\.\s+(.+?)(?=\n\s*\d+\.|$)/gm;
  while ((match = stepRegex.exec(claudeResponse)) !== null) {
    instructions.push(match[1].trim());
  }

  // Extract nutrition info if mentioned
  const carbMatch = claudeResponse.match(/(\d+)\s*(?:g|grams?)\s*(?:net\s+)?carb/i);
  const calorieMatch = claudeResponse.match(/(\d+)\s*(?:calories?|kcal)/i);

  const netCarbsPerServing = carbMatch ? parseInt(carbMatch[1]) : undefined;
  const caloriesPerServing = calorieMatch ? parseInt(calorieMatch[1]) : undefined;

  return {
    hasRecipe: true,
    recipeName,
    servingTime,
    prepTime,
    cookTime,
    servings,
    ingredients: ingredients.length > 0 ? ingredients : undefined,
    instructions: instructions.length > 0 ? instructions : undefined,
    netCarbsPerServing,
    caloriesPerServing,
  };
}
