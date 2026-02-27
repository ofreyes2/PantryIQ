/**
 * Food Exploration Utility
 * Detects when Chef Claude is in exploration mode and extracts relevant context
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Extract RECIPE_DATA JSON block from Claude response
 * Returns parsed recipes and cleaned text without the JSON block
 */
export function extractRecipeDataJSON(responseText: string): {
  recipes: Array<{
    recipeName?: string;
    description?: string;
    ingredients?: string[];
    instructions?: string[];
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    netCarbsPerServing?: number;
    caloriesPerServing?: number;
    difficulty?: number;
    crispiness?: number;
    equipment?: string;
    videoUrl?: string;
    imageUrl?: string;
  }>;
  cleanedText: string;
} {
  const recipeDataMatch = responseText.match(/<RECIPE_DATA>([\s\S]*?)<\/RECIPE_DATA>/);

  if (!recipeDataMatch) {
    return { recipes: [], cleanedText: responseText };
  }

  try {
    const jsonStr = recipeDataMatch[1].trim();
    const parsed = JSON.parse(jsonStr);

    if (!parsed.hasRecipeData || !Array.isArray(parsed.recipes)) {
      return { recipes: [], cleanedText: responseText };
    }

    // Transform the recipes to match our internal format
    const transformedRecipes = parsed.recipes.map((recipe: any) => {
      // Handle ingredients: could be array of objects or array of strings
      let ingredients: string[] = [];
      if (Array.isArray(recipe.ingredients)) {
        ingredients = recipe.ingredients.map((ing: any) => {
          if (typeof ing === 'string') return ing;
          if (typeof ing === 'object' && ing.name) {
            const qty = ing.quantity ? `${ing.quantity} ` : '';
            const unit = ing.unit ? `${ing.unit} ` : '';
            return `${qty}${unit}${ing.name}`.trim();
          }
          return '';
        }).filter(Boolean);
      }

      // Ensure equipment is a string, not array
      let equipmentStr: string | undefined;
      if (typeof recipe.equipment === 'string') {
        equipmentStr = recipe.equipment;
      } else if (Array.isArray(recipe.equipment)) {
        equipmentStr = recipe.equipment.join(', ');
      }

      return {
        recipeName: recipe.name || recipe.recipeName || 'Recipe',
        description: recipe.description,
        prepTime: recipe.prepTime || recipe.timeMinutes,
        cookTime: recipe.cookTime || recipe.timeMinutes,
        servings: recipe.servings || 1,
        ingredients: ingredients.length > 0 ? ingredients : undefined,
        instructions: recipe.instructions,
        netCarbsPerServing: recipe.netCarbsPerServing,
        caloriesPerServing: recipe.caloriesPerServing,
        difficulty: recipe.difficultyRating,
        crispiness: recipe.crispinessRating,
        equipment: equipmentStr,
        videoUrl: recipe.videoUrl,
        imageUrl: recipe.imageUrl,
      };
    });

    // Remove the RECIPE_DATA block from the display text
    const cleanedText = responseText.replace(/<RECIPE_DATA>[\s\S]*?<\/RECIPE_DATA>\s*/g, '').trim();

    return { recipes: transformedRecipes, cleanedText };
  } catch (error) {
    console.log('Error parsing RECIPE_DATA JSON:', error);
    return { recipes: [], cleanedText: responseText };
  }
}

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

    // VALIDATE: Apply 4-condition check for recipe cards
    // Condition 1: At least 3 ingredients
    if (ingredients.length < 3) {
      console.log(`  ❌ Skipped: Only ${ingredients.length} ingredients (need 3+)`);
      return; // Skip this "recipe"
    }

    // Condition 2: At least 2 instructions
    if (instructions.length < 2) {
      console.log(`  ❌ Skipped: Only ${instructions.length} instructions (need 2+)`);
      return; // Skip this "recipe"
    }

    // Condition 3: Calories > 0
    if (!calories || calories <= 0) {
      console.log(`  ❌ Skipped: Calories ${calories} (need > 0)`);
      return; // Skip this "recipe"
    }

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

    // Condition 4: Net carbs is not null and not "0" / "0g"
    if (netCarbsPerServing === undefined || netCarbsPerServing === 0) {
      console.log(`  ❌ Skipped: Net carbs ${netCarbsPerServing}g (need > 0g)`);
      return; // Skip this "recipe"
    }

    console.log(`  ✅ Valid recipe — all 4 conditions met`);

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
      caloriesPerServing: calories,
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
 *
 * A response is ONLY considered a recipe if ALL 4 conditions are true:
 * 1. Response contains "INGREDIENTS" header with at least 3 items listed below it
 * 2. Response contains "INSTRUCTIONS" header with at least 2 numbered steps below it
 * 3. Calories value is greater than 0
 * 4. Net carbs value is not null and not "0g"
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
  // Find INGREDIENTS section
  const ingredientHeaderMatch = claudeResponse.match(/\*?\*?INGREDIENTS\*?\*?/i);
  if (!ingredientHeaderMatch) {
    return { hasRecipe: false };
  }

  // Extract ingredients (lines with bullet points after INGREDIENTS header)
  const ingredients: string[] = [];
  const ingredientText = claudeResponse.substring(ingredientHeaderMatch.index! + ingredientHeaderMatch[0].length);
  const ingredientLines = ingredientText.split('\n').slice(0, 20); // Look at next 20 lines

  for (const line of ingredientLines) {
    const trimmed = line.trim();
    // Stop at next section header
    if (trimmed.match(/\*?\*?(INSTRUCTIONS|PREPARATION|STEPS|DIRECTIONS|MISSING|NOTES)\*?\*?/i)) {
      break;
    }
    // Collect ingredient lines that start with - or •
    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      ingredients.push(trimmed.replace(/^[-•]\s*/, '').trim());
    }
  }

  // Condition 1: At least 3 ingredients
  if (ingredients.length < 3) {
    return { hasRecipe: false };
  }

  // Find INSTRUCTIONS section
  const instructionHeaderMatch = claudeResponse.match(/\*?\*?INSTRUCTIONS\*?\*?/i);
  if (!instructionHeaderMatch) {
    return { hasRecipe: false };
  }

  // Extract numbered instructions
  const instructions: string[] = [];
  const instructionText = claudeResponse.substring(instructionHeaderMatch.index! + instructionHeaderMatch[0].length);
  const instructionLines = instructionText.split('\n').slice(0, 30); // Look at next 30 lines

  for (const line of instructionLines) {
    const trimmed = line.trim();
    // Stop at next section header
    if (trimmed.match(/\*?\*?(NUTRITION|MISSING|NOTES|EQUIPMENT|TIPS|SERVING)\*?\*?/i) && !trimmed.match(/^\d+\./)) {
      break;
    }
    // Collect numbered steps (1. 2. 3. etc)
    const stepMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (stepMatch) {
      instructions.push(stepMatch[1]);
    }
  }

  // Condition 2: At least 2 instructions
  if (instructions.length < 2) {
    return { hasRecipe: false };
  }

  // Extract nutrition info
  const calorieMatch = claudeResponse.match(/(\d+)\s*(?:calories?|kcal|cal)/i);
  const caloriesPerServing = calorieMatch ? parseInt(calorieMatch[1]) : undefined;

  // Condition 3: Calories > 0
  if (!caloriesPerServing || caloriesPerServing <= 0) {
    return { hasRecipe: false };
  }

  // Extract net carbs
  const carbMatch = claudeResponse.match(/(\d+)\s*g(?:rams?)?\s*(?:net\s+)?carb/i);
  const netCarbsPerServing = carbMatch ? parseInt(carbMatch[1]) : undefined;

  // Condition 4: Net carbs is not null and not "0g"
  if (netCarbsPerServing === undefined || netCarbsPerServing === 0) {
    return { hasRecipe: false };
  }

  // All 4 conditions passed - extract remaining fields for the recipe

  // Extract recipe name (usually in first line or after common headers)
  const nameMatch = claudeResponse.match(/^(?:##\s+)?([A-Z][A-Za-z\s]+?)(?:\n|$)/);
  const recipeName = nameMatch ? nameMatch[1].trim() : undefined;

  // Extract prep/cook time if mentioned
  const prepTimeMatch = claudeResponse.match(/(?:prep|preparation)\s+(?:time)?:?\s*(\d+)\s*(?:minute|min)/i);
  const cookTimeMatch = claudeResponse.match(/cook(?:ing)?\s+time:?\s*(\d+)\s*(?:minute|min)/i);
  const servingMatch = claudeResponse.match(/(?:yield|serves?):\s*(\d+)\s*(?:serving)?/i);

  const prepTime = prepTimeMatch ? parseInt(prepTimeMatch[1]) : undefined;
  const cookTime = cookTimeMatch ? parseInt(cookTimeMatch[1]) : undefined;
  const servings = servingMatch ? parseInt(servingMatch[1]) : undefined;

  // Extract first time mentioned if no specific labels (for servingTime display)
  const timeMatch = claudeResponse.match(/(\d+)\s*(?:minute|min|second|sec)\s*/i);
  const servingTime = timeMatch ? timeMatch[0].trim() : undefined;

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
 * Get cached image from AsyncStorage
 */
async function getCachedImage(recipeName: string): Promise<{ url: string; source: string } | null> {
  try {
    const cache = await AsyncStorage.getItem('pantryiq_recipe_image_cache');
    if (!cache) return null;

    const cacheData = JSON.parse(cache);
    return cacheData[recipeName] || null;
  } catch (error) {
    console.log('Cache read error:', error);
    return null;
  }
}

/**
 * Cache image to AsyncStorage
 */
async function setCachedImage(
  recipeName: string,
  imageUrl: string,
  source: 'mealdb' | 'pexels'
): Promise<void> {
  try {
    const cache = await AsyncStorage.getItem('pantryiq_recipe_image_cache');
    const cacheData = cache ? JSON.parse(cache) : {};

    cacheData[recipeName] = { url: imageUrl, source };
    await AsyncStorage.setItem('pantryiq_recipe_image_cache', JSON.stringify(cacheData));
  } catch (error) {
    console.log('Cache write error:', error);
  }
}

/**
 * Search TheMealDB for recipe image (free, no key required)
 */
async function getFoodImageFromMealDB(recipeName: string): Promise<string | null> {
  try {
    const searchTerm = recipeName
      .replace(/crispy|keto|low.carb|low-carb|easy|quick|instant pot|air fryer/gi, '')
      .replace(/[^a-zA-Z\s]/g, '')
      .trim()
      .split(' ')
      .slice(0, 2)
      .join(' ');

    console.log('TheMealDB searching for:', searchTerm);

    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchTerm)}`
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data.meals && data.meals.length > 0) {
      console.log('TheMealDB found image for:', recipeName);
      return data.meals[0].strMealThumb;
    }

    console.log('TheMealDB no match for:', recipeName);
    return null;
  } catch (error) {
    console.log('TheMealDB error:', error);
    return null;
  }
}

/**
 * Search Pexels for recipe image (requires API key)
 */
async function getFoodImageFromPexels(recipeName: string): Promise<string | null> {
  try {
    const pexelsKey = await AsyncStorage.getItem('pantryiq_pexels_api_key');

    if (!pexelsKey) {
      console.log('No Pexels key — skipping Pexels search');
      return null;
    }

    // Clean recipe name for better search results
    const searchTerm = recipeName
      .replace(/crispy|keto|low.carb|low-carb|easy|quick|instant pot|air fryer/gi, '')
      .replace(/[^a-zA-Z\s]/g, '')
      .trim()
      .split(' ')
      .slice(0, 3)
      .join(' ');

    const query = encodeURIComponent(searchTerm + ' food dish');

    console.log('Pexels searching for:', query);

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
      console.log('Pexels found image for:', recipeName);
      return data.photos[0].src.landscape || data.photos[0].src.large;
    }

    console.log('Pexels no match for:', recipeName);
    return null;
  } catch (error) {
    console.log('Pexels error:', error);
    return null;
  }
}

/**
 * Get food image — tries TheMealDB first (free), then Pexels, with caching
 */
export async function getFoodImage(recipeName: string): Promise<string | null> {
  if (!recipeName) return null;

  // Step 1 — Check cache first
  const cached = await getCachedImage(recipeName);
  if (cached) return cached.url;

  // Step 2 — Try TheMealDB first (free, no key needed)
  let imageUrl = await getFoodImageFromMealDB(recipeName);
  let source: 'mealdb' | 'pexels' = 'mealdb';

  // Step 3 — Fall back to Pexels if TheMealDB fails
  if (!imageUrl) {
    imageUrl = await getFoodImageFromPexels(recipeName);
    source = 'pexels';
  }

  // Step 4 — Cache result
  if (imageUrl) {
    await setCachedImage(recipeName, imageUrl, source);
  }

  return imageUrl;
}
