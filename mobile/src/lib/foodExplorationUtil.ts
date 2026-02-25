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

  // Split by ### or ## headers (handle both formats)
  // Pattern matches "### 1. **Recipe Name**" or "## Recipe Name" or variations
  const headerPattern = /^#{2,3}\s+(?:\d+\.\s+)?(?:🥇|🥈|🥉|🍳|🧀|🍛)?\s*(?:\*\*)?([^*\n]+?)(?:\*\*)?\s*(?:\([^)]*\))?$/gm;

  let match;
  const headerMatches: Array<{ name: string; index: number }> = [];

  while ((match = headerPattern.exec(claudeResponse)) !== null) {
    headerMatches.push({
      name: match[1].trim(),
      index: match.index,
    });
  }

  // If no headers found, return empty array
  if (headerMatches.length === 0) {
    return recipes;
  }

  // Extract recipe content between each header
  for (let i = 0; i < headerMatches.length; i++) {
    const currentHeader = headerMatches[i];
    const nextHeader = headerMatches[i + 1];

    // Get the content from current header to next header (or end of string)
    const startIdx = currentHeader.index;
    const endIdx = nextHeader ? nextHeader.index : claudeResponse.length;
    const recipeContent = claudeResponse.substring(startIdx, endIdx);

    const recipeName = currentHeader.name;

    if (!recipeName) continue;

    // Extract description - first paragraph before any dashes or bullet points
    const descMatch = recipeContent.match(/(?:###.*?\n)([\s\S]*?)(?=\n-|\n•|\*\*|---|\n\n|$)/);
    let description: string | undefined;
    if (descMatch && descMatch[1]) {
      description = descMatch[1]
        .trim()
        .replace(/\*\*/g, '') // Remove markdown bold
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .substring(0, 150);
    }

    let netCarbsPerServing: number | undefined;
    let caloriesPerServing: number | undefined;
    let cookTime: number | undefined;
    let prepTime: number | undefined;
    let equipment: string | undefined;
    let crispiness: number | undefined;
    let difficulty: number | undefined;
    let servings: number | undefined;
    let videoUrl: string | undefined;

    // Extract key-value pairs from markdown format
    // Matches patterns like "- **Equipment:** Deep Fryer" or "- Time: ~15 min"
    const keyValueRegex = /[-•]\s+(?:\*\*)?([^:*]+?)(?:\*\*)?\s*:\s*\*?\*?(.+?)(?:\*\*)?(?=\n|$)/g;
    let kvMatch;
    while ((kvMatch = keyValueRegex.exec(recipeContent)) !== null) {
      const key = kvMatch[1].trim().toLowerCase();
      let value = kvMatch[2].trim();
      // Remove trailing markdown
      value = value.replace(/\*\*\s*$/, '').trim();

      if (key.includes('net carb')) {
        const carbMatch = value.match(/(\d+)\s*g/);
        if (carbMatch) netCarbsPerServing = parseInt(carbMatch[1]);
      } else if (key.includes('calorie')) {
        const calMatch = value.match(/~?(\d+)/);
        if (calMatch) caloriesPerServing = parseInt(calMatch[1]);
      } else if (key.includes('time') && !key.includes('prep')) {
        const timeMatch = value.match(/~?(\d+)\s*(?:minute|min)/i);
        if (timeMatch) cookTime = parseInt(timeMatch[1]);
      } else if (key.includes('prep')) {
        const timeMatch = value.match(/(\d+)\s*(?:minute|min)/i);
        if (timeMatch) prepTime = parseInt(timeMatch[1]);
      } else if (key.includes('equipment')) {
        equipment = value.replace(/\*\*/g, '').trim();
      } else if (key.includes('serving')) {
        const servMatch = value.match(/(\d+)/);
        if (servMatch) servings = parseInt(servMatch[1]);
      }
    }

    // Count difficulty stars ⭐
    const diffMatch = recipeContent.match(/Difficulty[^:]*:\s*(\*\*)?([⭐]+)/i);
    if (diffMatch) {
      difficulty = diffMatch[2].length;
    }

    // Count crispiness pretzels 🥨
    const crispMatch = recipeContent.match(/Crispiness[^:]*:\s*(\*\*)?([🥨]+)/i);
    if (crispMatch) {
      crispiness = crispMatch[2].length;
    }

    // Extract ingredients (lines starting with - or •)
    const ingredients: string[] = [];
    const ingredientLines = recipeContent.split('\n').filter(line => /^[-•]\s/.test(line));

    for (const line of ingredientLines) {
      // Remove bullet points and clean markdown
      let ingredient = line.replace(/^[-•]\s+/, '').trim();

      // Skip non-ingredient lines
      if (ingredient.match(/^(?:mix|stir|heat|add|combine|cook|bake|fry|boil|season|serve|you have|missing|✅|⚠️|equipment|time|carb|difficulty|crispiness|net|calories)/i)) {
        continue;
      }

      // Remove markdown formatting
      ingredient = ingredient
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .trim();

      if (ingredient && ingredient.length > 0) {
        ingredients.push(ingredient);
      }
    }

    // Only add if it has a name
    if (recipeName) {
      recipes.push({
        recipeName,
        description: description || undefined,
        prepTime,
        cookTime,
        servings: servings || 1,
        ingredients: ingredients.length > 0 ? ingredients : undefined,
        instructions: undefined, // Claude's format doesn't include detailed instructions in list format
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
