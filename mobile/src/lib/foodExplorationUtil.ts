/**
 * Food Exploration Utility
 * Detects when Chef Claude is in exploration mode and extracts relevant context
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // Remove any <MEAL_DATA> blocks first
  const cleanText = claudeResponse.replace(/<MEAL_DATA>[\s\S]*?<\/MEAL_DATA>/g, '');

  // Split on numbered recipe markers — handles ### 1. ### 2. ### 3.
  // Also handles --- dividers between recipes
  const recipeBlocks: string[] = [];

  // Find all positions where a new recipe starts
  const parts = cleanText.split(/###\s*\d+\.\s*/);

  // Filter out empty parts and intro text
  parts.forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;

    // Must contain recipe content to be a recipe block
    const hasContent =
      trimmed.toLowerCase().includes('ingredient') ||
      trimmed.toLowerCase().includes('instruction') ||
      trimmed.toLowerCase().includes('net carb') ||
      trimmed.toLowerCase().includes('equipment') ||
      trimmed.toLowerCase().includes('time:');

    if (hasContent) recipeBlocks.push(trimmed);
  });

  console.log(`Recipe parser found ${recipeBlocks.length} recipe blocks`);

  recipeBlocks.forEach((block, index) => {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    // Recipe name — first line cleaned of markdown and emojis
    const name = lines[0]
      .replace(/\*\*/g, '')
      .replace(/[🥇🥈🥉🏅🎖️]/g, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/\(Best.*?\)/gi, '')
      .trim();

    if (!name) return;

    // Description — second line if not a dash field
    const descLine = lines[1] || '';
    const description =
      !descLine.startsWith('-') && !descLine.includes(':')
        ? descLine
        : '';

    // Helper to extract field value after colon
    const getField = (label: string): string | undefined => {
      const line = lines.find(
        (l) =>
          l.replace(/\*\*/g, '')
            .toLowerCase()
            .startsWith(`- ${label.toLowerCase()}`) ||
          l.replace(/\*\*/g, '')
            .toLowerCase()
            .startsWith(label.toLowerCase() + ':')
      );
      if (!line) return undefined;
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return undefined;
      return line.slice(colonIndex + 1).replace(/\*\*/g, '').trim();
    };

    // Find INGREDIENTS section
    const ingStart = lines.findIndex((l) =>
      l.replace(/\*\*/g, '').toUpperCase().includes('INGREDIENT')
    );

    // Find INSTRUCTIONS section
    const instStart = lines.findIndex((l) =>
      l.replace(/\*\*/g, '').toUpperCase().includes('INSTRUCTION')
    );

    // Find missing warning
    const missingIdx = lines.findIndex(
      (l) =>
        l.includes('⚠') || l.toLowerCase().includes('missing:')
    );

    // Extract ingredients between INGREDIENTS and INSTRUCTIONS
    let ingredients: string[] = [];
    if (ingStart !== -1) {
      const endIdx =
        instStart !== -1
          ? instStart
          : missingIdx !== -1
            ? missingIdx
            : lines.length;
      ingredients = lines
        .slice(ingStart + 1, endIdx)
        .filter((l) => l.startsWith('-') || l.startsWith('•'))
        .map((l) =>
          l.replace(/^[-•]\s*/, '').replace(/\*\*/g, '').trim()
        )
        .filter((l) => l.length > 0);
    }

    // Extract instructions after INSTRUCTIONS
    let instructions: string[] = [];
    if (instStart !== -1) {
      const endIdx =
        missingIdx !== -1 ? missingIdx : lines.length;
      instructions = lines
        .slice(instStart + 1, endIdx)
        .filter((l) => /^\d+[.)]\s/.test(l))
        .map((l) =>
          l.replace(/^\d+[.)]\s*/, '').replace(/\*\*/g, '').trim()
        )
        .filter((l) => l.length > 0);
    }

    // Extract calories from anywhere in the block
    const caloriesLine = lines.find(
      (l) =>
        l.toLowerCase().includes('calorie') ||
        l.toLowerCase().includes('cal:') ||
        l.toLowerCase().includes('kcal')
    );
    const caloriesMatch = caloriesLine?.match(/(\d+)\s*(cal|kcal|calorie)/i);
    const calories = caloriesMatch
      ? parseInt(caloriesMatch[1])
      : null;

    // Extract missing warning text
    const missing =
      missingIdx !== -1
        ? lines[missingIdx]
          .replace(/⚠️?/g, '')
          .replace(/Missing:/gi, '')
          .replace(/\*\*/g, '')
          .trim()
        : null;

    console.log(`Recipe ${index + 1}: ${name}`);
    console.log(`  Ingredients: ${ingredients.length}`);
    console.log(`  Instructions: ${instructions.length}`);
    console.log(`  Calories: ${calories}`);

    // Parse time, prep time, servings, etc from fields
    const timeStr = getField('Time');
    const prepTimeStr = getField('Prep Time');
    const servingsStr = getField('Servings');
    const netCarbsStr = getField('Net Carbs');

    let cookTime: number | undefined;
    let prepTime: number | undefined;
    let servings: number | undefined;
    let netCarbsPerServing: number | undefined;

    if (timeStr) {
      const timeMatch = timeStr.match(/(\d+)/);
      if (timeMatch) cookTime = parseInt(timeMatch[1]);
    }
    if (prepTimeStr) {
      const timeMatch = prepTimeStr.match(/(\d+)/);
      if (timeMatch) prepTime = parseInt(timeMatch[1]);
    }
    if (servingsStr) {
      const servMatch = servingsStr.match(/(\d+)/);
      if (servMatch) servings = parseInt(servMatch[1]);
    }
    if (netCarbsStr) {
      const carbMatch = netCarbsStr.match(/(\d+)/);
      if (carbMatch) netCarbsPerServing = parseInt(carbMatch[1]);
    }

    // Count difficulty stars ⭐
    const difficultyStr = getField('Difficulty');
    let difficulty: number | undefined;
    if (difficultyStr) {
      difficulty = (difficultyStr.match(/⭐/g) || []).length;
    }

    // Count crispiness pretzels 🥨
    const crispinessStr = getField('Crispiness');
    let crispiness: number | undefined;
    if (crispinessStr) {
      crispiness = (crispinessStr.match(/🥨/g) || []).length;
    }

    recipes.push({
      recipeName: name,
      description: description || undefined,
      prepTime,
      cookTime,
      servings: servings || 1,
      ingredients: ingredients.length > 0 ? ingredients : undefined,
      instructions: instructions.length > 0 ? instructions : undefined,
      netCarbsPerServing,
      caloriesPerServing: calories || undefined,
      difficulty,
      crispiness,
      equipment: getField('Equipment'),
      videoUrl: undefined,
      imageUrl: undefined,
    });
  });

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

/**
 * Generate a food image URL from Pexels API using the recipe name
 */
export async function getFoodImage(recipeName: string): Promise<string | null> {
  try {
    const pexelsKey = await AsyncStorage.getItem('pantryiq_pexels_api_key');

    if (!pexelsKey) {
      console.log('No Pexels key — skipping recipe image');
      return null;
    }

    // Clean recipe name for better search results
    const searchTerm = recipeName
      .replace(/crispy|keto|low.carb|low-carb|easy|quick/gi, '')
      .replace(/[^a-zA-Z\s]/g, '')
      .trim()
      .split(' ')
      .slice(0, 3)
      .join(' ');

    const query = encodeURIComponent(searchTerm + ' food dish');

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=landscape`,
      {
        headers: {
          'Authorization': pexelsKey,
        },
      }
    );

    if (!response.ok) {
      console.log('Pexels request failed:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.photos && data.photos.length > 0) {
      return data.photos[0].src.landscape || data.photos[0].src.large;
    }

    return null;
  } catch (error) {
    console.error('getFoodImage error:', error);
    return null;
  }
}
