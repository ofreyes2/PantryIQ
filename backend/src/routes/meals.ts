import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const mealsRouter = new Hono();

// Initialize Claude client - use ANTHROPIC_API_KEY from environment
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Zod schema for pantry item
const pantryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string().optional(),
  nutrition: z.object({
    calories: z.number().min(0),
    carbs: z.number().min(0),
    protein: z.number().min(0),
    fat: z.number().min(0),
    fiber: z.number().min(0),
    netCarbs: z.number().min(0),
  }),
  servingUnit: z.string(),
});

// Zod schema for user profile
const userProfileSchema = z.object({
  dailyCarbGoal: z.number().min(0),
  dailyCalorieGoal: z.number().min(0),
  personalityMode: z.string(),
});

// Zod schema for meal analysis input
const analyzeMealSchema = z.object({
  userMessage: z.string().min(1),
  pantryItems: z.array(pantryItemSchema),
  userProfile: userProfileSchema,
});

type AnalyzeMealInput = z.infer<typeof analyzeMealSchema>;
type PantryItem = z.infer<typeof pantryItemSchema>;

// Types for response
interface IdentifiedFood {
  name: string;
  quantity: string | null;
  unit: string | null;
  cookingMethod: string | null;
  inPantry: boolean;
  estimatedCalories: number;
  estimatedNetCarbs: number;
  estimatedProtein: number;
  estimatedFat: number;
  confidence: "high" | "medium" | "low";
}

interface MealAnalysisResponse {
  isMealDescription: boolean;
  identifiedFoods: IdentifiedFood[];
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "unknown";
  mealTypeConfidence: "high" | "medium" | "low";
  missingInfo: string[];
  canLogNow: boolean;
  followUpQuestions: string[];
  totalEstimatedCalories: number;
  totalEstimatedNetCarbs: number;
  totalEstimatedProtein: number;
  totalEstimatedFat: number;
  pantryItemsToDeduct: string[];
  logConfidenceMessage: string;
}

/**
 * Common USDA nutritional values for foods (per 100g)
 */
const nutritionDatabase: Record<
  string,
  {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
  }
> = {
  "chicken thigh": {
    calories: 209,
    carbs: 0,
    protein: 26,
    fat: 11,
    fiber: 0,
  },
  "chicken breast": {
    calories: 165,
    carbs: 0,
    protein: 31,
    fat: 3.6,
    fiber: 0,
  },
  broccoli: {
    calories: 34,
    carbs: 7,
    protein: 2.8,
    fat: 0.4,
    fiber: 2.4,
  },
  "roasted broccoli": {
    calories: 34,
    carbs: 7,
    protein: 2.8,
    fat: 0.4,
    fiber: 2.4,
  },
  rice: {
    calories: 130,
    carbs: 28,
    protein: 2.7,
    fat: 0.3,
    fiber: 0.4,
  },
  potato: {
    calories: 77,
    carbs: 17,
    protein: 2,
    fat: 0.1,
    fiber: 2.1,
  },
  steak: {
    calories: 271,
    carbs: 0,
    protein: 26,
    fat: 17,
    fiber: 0,
  },
  salmon: {
    calories: 206,
    carbs: 0,
    protein: 25,
    fat: 11,
    fiber: 0,
  },
  fish: {
    calories: 82,
    carbs: 0,
    protein: 17,
    fat: 0.8,
    fiber: 0,
  },
  egg: {
    calories: 155,
    carbs: 1.1,
    protein: 13,
    fat: 11,
    fiber: 0,
  },
  eggs: {
    calories: 155,
    carbs: 1.1,
    protein: 13,
    fat: 11,
    fiber: 0,
  },
  "pork rind": {
    calories: 918,
    carbs: 0,
    protein: 19,
    fat: 97,
    fiber: 0,
  },
  pork: {
    calories: 242,
    carbs: 0,
    protein: 27,
    fat: 14,
    fiber: 0,
  },
  beef: {
    calories: 250,
    carbs: 0,
    protein: 26,
    fat: 15,
    fiber: 0,
  },
  spinach: {
    calories: 23,
    carbs: 3.6,
    protein: 2.9,
    fat: 0.4,
    fiber: 2.2,
  },
  lettuce: {
    calories: 15,
    carbs: 2.9,
    protein: 1.2,
    fat: 0.2,
    fiber: 1.3,
  },
  apple: {
    calories: 52,
    carbs: 14,
    protein: 0.3,
    fat: 0.2,
    fiber: 2.4,
  },
  banana: {
    calories: 89,
    carbs: 23,
    protein: 1.1,
    fat: 0.3,
    fiber: 2.6,
  },
  milk: {
    calories: 61,
    carbs: 4.8,
    protein: 3.2,
    fat: 3.3,
    fiber: 0,
  },
  cheese: {
    calories: 402,
    carbs: 1.3,
    protein: 25,
    fat: 33,
    fiber: 0,
  },
  yogurt: {
    calories: 59,
    carbs: 3.6,
    protein: 10,
    fat: 0.4,
    fiber: 0,
  },
  bread: {
    calories: 265,
    carbs: 49,
    protein: 9,
    fat: 3.3,
    fiber: 2.7,
  },
  pasta: {
    calories: 131,
    carbs: 25,
    protein: 5,
    fat: 1.1,
    fiber: 1.8,
  },
  olive_oil: {
    calories: 884,
    carbs: 0,
    protein: 0,
    fat: 100,
    fiber: 0,
  },
  butter: {
    calories: 717,
    carbs: 0,
    protein: 0.9,
    fat: 81,
    fiber: 0,
  },
};

/**
 * Get USDA nutritional values for a food
 */
function getNutritionFor(
  foodName: string,
  grams: number = 100
): {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  netCarbs: number;
} {
  const normalizedName = foodName.toLowerCase();

  // Try exact match
  let nutrition = nutritionDatabase[normalizedName];

  // Try partial match
  if (!nutrition) {
    const keys = Object.keys(nutritionDatabase);
    const match = keys.find((key) => normalizedName.includes(key) || key.includes(normalizedName));
    if (match) {
      nutrition = nutritionDatabase[match];
    }
  }

  // Default if not found
  if (!nutrition) {
    nutrition = {
      calories: 200,
      carbs: 20,
      protein: 15,
      fat: 10,
      fiber: 2,
    };
  }

  const scaled = {
    calories: Math.round((nutrition.calories * grams) / 100),
    carbs: Math.round((nutrition.carbs * grams) / 100 * 10) / 10,
    protein: Math.round((nutrition.protein * grams) / 100 * 10) / 10,
    fat: Math.round((nutrition.fat * grams) / 100 * 10) / 10,
    fiber: Math.round((nutrition.fiber * grams) / 100 * 10) / 10,
  };

  return {
    ...scaled,
    netCarbs: Math.round((scaled.carbs - scaled.fiber) * 10) / 10,
  };
}

/**
 * Check if a food name matches a pantry item
 */
function findInPantry(foodName: string, pantryItems: PantryItem[]): PantryItem | null {
  const normalizedFood = foodName.toLowerCase();
  return (
    pantryItems.find(
      (item) =>
        item.name.toLowerCase() === normalizedFood ||
        item.name.toLowerCase().includes(normalizedFood) ||
        normalizedFood.includes(item.name.toLowerCase())
    ) || null
  );
}

/**
 * Simple heuristic-based meal detection (fallback)
 */
function detectMealHeuristic(
  userMessage: string
): {
  isMealDescription: boolean;
  foods: Array<{
    name: string;
    quantity: number | null;
    unit: string | null;
    cookingMethod: string | null;
  }>;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "unknown";
  mealTypeConfidence: "high" | "medium" | "low";
  missingInfo: string[];
  followUpQuestions: string[];
} {
  const msg = userMessage.toLowerCase();

  // Meal detection patterns
  const mealIndicators = [
    "i just ate",
    "i just had",
    "just finished",
    "i had",
    "for breakfast",
    "for lunch",
    "for dinner",
    "for snack",
    "just made",
    "finished cooking",
    "just fried",
    "just roasted",
    "just baked",
    "that was",
    "i destroyed",
    "ate some",
    "earlier i",
    "at breakfast",
    "at lunch",
    "at dinner",
  ];

  const isMealDescription = mealIndicators.some((indicator) =>
    msg.includes(indicator)
  );

  if (!isMealDescription) {
    return {
      isMealDescription: false,
      foods: [],
      mealType: "unknown",
      mealTypeConfidence: "low",
      missingInfo: [],
      followUpQuestions: ["Could you describe a meal you just ate?"],
    };
  }

  // Try to extract meal type
  let mealType: "breakfast" | "lunch" | "dinner" | "snack" | "unknown" = "unknown";
  let mealTypeConfidence: "high" | "medium" | "low" = "medium";

  if (msg.includes("breakfast")) {
    mealType = "breakfast";
    mealTypeConfidence = "high";
  } else if (msg.includes("lunch")) {
    mealType = "lunch";
    mealTypeConfidence = "high";
  } else if (msg.includes("dinner")) {
    mealType = "dinner";
    mealTypeConfidence = "high";
  } else if (msg.includes("snack")) {
    mealType = "snack";
    mealTypeConfidence = "high";
  }

  // Try to extract foods and quantities using regex
  const foodPattern =
    /(\d+\.?\d*)\s*(g|gram|oz|ounce|piece|pieces|cup|cups|tbsp|serving)?\s+(?:of\s+)?([a-z\s]+?)(?:\s+(?:with|and|or)|$)/gi;
  const foods: Array<{
    name: string;
    quantity: number | null;
    unit: string | null;
    cookingMethod: string | null;
  }> = [];

  let match;
  const regex = new RegExp(foodPattern);
  while ((match = regex.exec(msg)) !== null) {
    if (match[3]) {
      foods.push({
        name: match[3].trim(),
        quantity: match[1] ? parseFloat(match[1]) : null,
        unit: match[2] || null,
        cookingMethod: null,
      });
    }
  }

  // If no structured matches, try to extract individual words
  if (foods.length === 0) {
    const commonFoods = [
      "eggs",
      "egg",
      "chicken",
      "steak",
      "fish",
      "salmon",
      "beef",
      "pork",
      "turkey",
      "bacon",
      "ham",
      "rice",
      "pasta",
      "bread",
      "broccoli",
      "spinach",
      "lettuce",
      "apple",
      "banana",
      "milk",
      "cheese",
      "yogurt",
      "butter",
      "thighs",
      "breast",
      "vegetables",
      "salad",
      "steak",
    ];

    for (const food of commonFoods) {
      if (msg.includes(food)) {
        foods.push({
          name: food,
          quantity: null,
          unit: null,
          cookingMethod: null,
        });
      }
    }
  }

  // Extract cooking methods
  const cookingMethods = ["fried", "roasted", "baked", "boiled", "grilled", "steamed"];
  for (const food of foods) {
    for (const method of cookingMethods) {
      if (msg.includes(method)) {
        food.cookingMethod = method;
        break;
      }
    }
  }

  const missingInfo: string[] = [];
  if (mealType === "unknown") {
    missingInfo.push("meal type");
  }
  if (foods.some((f) => !f.quantity)) {
    missingInfo.push("quantities for some foods");
  }

  const followUpQuestions: string[] = [];
  if (mealType === "unknown") {
    followUpQuestions.push("What type of meal was this - breakfast, lunch, dinner, or snack?");
  }
  if (foods.some((f) => !f.quantity)) {
    followUpQuestions.push(
      "Can you tell me how much of each item you had? (e.g., how many grams or ounces)"
    );
  }

  return {
    isMealDescription: foods.length > 0,
    foods,
    mealType,
    mealTypeConfidence,
    missingInfo,
    followUpQuestions: followUpQuestions.slice(0, 3),
  };
}

/**
 * Parse Claude's response and extract meal information
 */
async function analyzeMealWithClaude(
  userMessage: string,
  pantryItems: PantryItem[],
  userProfile: AnalyzeMealInput["userProfile"]
): Promise<{
  isMealDescription: boolean;
  foods: Array<{
    name: string;
    quantity: number | null;
    unit: string | null;
    cookingMethod: string | null;
  }>;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "unknown";
  mealTypeConfidence: "high" | "medium" | "low";
  missingInfo: string[];
  followUpQuestions: string[];
}> {
  // Check if API key is available
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("ANTHROPIC_API_KEY not set, using heuristic analysis");
    return detectMealHeuristic(userMessage);
  }

  const systemPrompt = `You are a meal analysis AI assistant for a nutrition tracking app called PantryIQ. Your job is to analyze user messages and determine:

1. Whether the message describes a meal they ate
2. What foods were mentioned
3. Quantities if mentioned
4. Cooking methods if mentioned
5. What type of meal (breakfast, lunch, dinner, snack)
6. What information is missing
7. What clarifying questions to ask

MEAL DETECTION RULES:
- Accept: "I just ate", "I just had", "just finished", "for breakfast I had", "Just made", "finished cooking", "just fried up", "That was delicious", "I destroyed that"
- REJECT: questions about recipes, recipe requests, general statements, planning ("I'm going to eat", "I want to make"), ingredient lists without eating context

Return a JSON response with this exact structure:
{
  "isMealDescription": boolean,
  "foods": [
    {
      "name": "food name",
      "quantity": number or null,
      "unit": "grams/ounces/cups/pieces or null",
      "cookingMethod": "fried/roasted/boiled or null"
    }
  ],
  "mealType": "breakfast|lunch|dinner|snack|unknown",
  "mealTypeConfidence": "high|medium|low",
  "missingInfo": ["list", "of", "missing", "details"],
  "followUpQuestions": ["max 3 questions in order of importance"]
}

User message to analyze: "${userMessage}"`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: systemPrompt,
        },
      ],
    });

    // Extract text from response
    const responseText =
      message.content[0] && message.content[0].type === "text"
        ? message.content[0].text
        : "";

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Claude response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      isMealDescription: parsed.isMealDescription || false,
      foods: parsed.foods || [],
      mealType: parsed.mealType || "unknown",
      mealTypeConfidence: parsed.mealTypeConfidence || "low",
      missingInfo: parsed.missingInfo || [],
      followUpQuestions: (parsed.followUpQuestions || []).slice(0, 3),
    };
  } catch (error) {
    console.warn("Claude API error, falling back to heuristic analysis:", error);
    // Fall back to heuristic analysis
    return detectMealHeuristic(userMessage);
  }
}

/**
 * POST /api/meals/analyze
 * Analyze a natural language meal description
 */
mealsRouter.post(
  "/analyze",
  zValidator("json", analyzeMealSchema),
  async (c) => {
    try {
      const { userMessage, pantryItems, userProfile } = c.req.valid("json");

      // Analyze meal with Claude
      const analysis = await analyzeMealWithClaude(
        userMessage,
        pantryItems,
        userProfile
      );

      if (!analysis.isMealDescription) {
        return c.json(
          {
            data: {
              isMealDescription: false,
              identifiedFoods: [],
              mealType: "unknown" as const,
              mealTypeConfidence: "low" as const,
              missingInfo: ["This doesn't appear to be a meal description"],
              canLogNow: false,
              followUpQuestions: [
                "Could you describe a meal you just ate? For example: 'I just had 2 eggs with bacon and toast'",
              ],
              totalEstimatedCalories: 0,
              totalEstimatedNetCarbs: 0,
              totalEstimatedProtein: 0,
              totalEstimatedFat: 0,
              pantryItemsToDeduct: [],
              logConfidenceMessage:
                "This message doesn't describe a meal. Please tell me what you ate.",
            },
          },
          200
        );
      }

      // Process identified foods
      let totalCalories = 0;
      let totalNetCarbs = 0;
      let totalProtein = 0;
      let totalFat = 0;
      const pantryItemsToDeduct: string[] = [];
      const identifiedFoods: IdentifiedFood[] = [];

      for (const food of analysis.foods) {
        // Estimate quantity in grams if not provided
        let grams = 100; // Default serving
        if (food.quantity) {
          if (food.unit === "grams" || food.unit === "g") {
            grams = food.quantity;
          } else if (food.unit === "ounces" || food.unit === "oz") {
            grams = Math.round(food.quantity * 28.35);
          } else if (food.unit === "cups") {
            grams = Math.round(food.quantity * 240); // Approximate
          } else if (food.unit === "pieces" || food.unit === null) {
            // For pieces, estimate based on food type
            if (
              food.name.toLowerCase().includes("egg") ||
              food.name.toLowerCase().includes("thigh")
            ) {
              grams = Math.round(food.quantity * 50); // ~50g per piece
            } else {
              grams = Math.round(food.quantity * 100);
            }
          }
        }

        // Get nutrition estimates
        const nutrition = getNutritionFor(food.name, grams);

        // Check if in pantry
        const pantryMatch = findInPantry(food.name, pantryItems);
        if (pantryMatch) {
          pantryItemsToDeduct.push(pantryMatch.name);
        }

        // Determine confidence
        let confidence: "high" | "medium" | "low" = "medium";
        if (food.quantity && food.unit) {
          confidence = "high";
        } else if (analysis.foods.length === 1 || pantryMatch) {
          confidence = "high";
        } else if (analysis.missingInfo.length > 0) {
          confidence = "low";
        }

        identifiedFoods.push({
          name: food.name,
          quantity: food.quantity ? food.quantity.toString() : null,
          unit: food.unit || null,
          cookingMethod: food.cookingMethod || null,
          inPantry: !!pantryMatch,
          estimatedCalories: nutrition.calories,
          estimatedNetCarbs: nutrition.netCarbs,
          estimatedProtein: nutrition.protein,
          estimatedFat: nutrition.fat,
          confidence,
        });

        totalCalories += nutrition.calories;
        totalNetCarbs += nutrition.netCarbs;
        totalProtein += nutrition.protein;
        totalFat += nutrition.fat;
      }

      // Determine if we can log now
      let canLogNow = analysis.isMealDescription && analysis.foods.length > 0;

      // Additional validation
      const missingQuantities = identifiedFoods.filter(
        (f) => !f.quantity && f.confidence === "low"
      );
      if (missingQuantities.length > 0 && analysis.missingInfo.length > 0) {
        canLogNow = false;
      }

      // If meal type is unknown, ask about it
      if (analysis.mealType === "unknown") {
        canLogNow = false;
      }

      // Generate confidence message
      let logConfidenceMessage = "";
      if (canLogNow) {
        const carbRatio = totalNetCarbs / userProfile.dailyCarbGoal;
        const calorieRatio = totalCalories / userProfile.dailyCalorieGoal;

        logConfidenceMessage = `This meal has about ${totalCalories} calories and ${Math.round(totalNetCarbs)}g net carbs. `;
        if (carbRatio > 0.8) {
          logConfidenceMessage +=
            "This is a significant portion of your daily carb goal.";
        } else if (carbRatio > 0.5) {
          logConfidenceMessage += "This is a moderate portion of your daily carbs.";
        } else {
          logConfidenceMessage += "This fits well within your daily carb goals.";
        }
      } else if (analysis.missingInfo.length > 0) {
        logConfidenceMessage = `I need clarification: ${analysis.missingInfo.join(", ")}`;
      } else if (analysis.mealType === "unknown") {
        logConfidenceMessage = "Please tell me what type of meal this was.";
      } else {
        logConfidenceMessage =
          "I need more information about the quantities to log this accurately.";
      }

      const response: MealAnalysisResponse = {
        isMealDescription: analysis.isMealDescription,
        identifiedFoods,
        mealType: analysis.mealType,
        mealTypeConfidence: analysis.mealTypeConfidence,
        missingInfo: analysis.missingInfo,
        canLogNow,
        followUpQuestions: analysis.followUpQuestions,
        totalEstimatedCalories: Math.round(totalCalories),
        totalEstimatedNetCarbs: Math.round(totalNetCarbs * 10) / 10,
        totalEstimatedProtein: Math.round(totalProtein * 10) / 10,
        totalEstimatedFat: Math.round(totalFat * 10) / 10,
        pantryItemsToDeduct,
        logConfidenceMessage,
      };

      return c.json({ data: response }, 200);
    } catch (error) {
      console.error("Meal analysis error:", error);
      return c.json(
        {
          error: {
            message: "Failed to analyze meal",
            code: "ANALYSIS_ERROR",
          },
        },
        500
      );
    }
  }
);

export { mealsRouter };
