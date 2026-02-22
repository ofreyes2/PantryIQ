import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const nutritionRouter = new Hono();

// Zod schema for macro calculation input
const calculateMacrosSchema = z.object({
  weight: z.number().min(1).max(500),
  height: z.union([
    z.object({
      feet: z.number().min(1).max(8),
      inches: z.number().min(0).max(11),
    }),
    z.object({
      cm: z.number().min(50).max(300),
    }),
  ]),
  age: z.number().min(10).max(120),
  sex: z.enum(["male", "female"]),
  activityLevel: z.enum([
    "sedentary",
    "lightly-active",
    "moderately-active",
    "very-active",
    "extra-active",
  ]),
  goal: z.enum([
    "lose-aggressive",
    "lose-moderate",
    "maintain",
    "gain-muscle",
  ]),
  dietType: z.enum([
    "keto-strict",
    "keto-moderate",
    "low-carb",
    "carnivore",
  ]),
});

type CalculateMacrosInput = z.infer<typeof calculateMacrosSchema>;

interface MacroCalculationResponse {
  calorieTarget: number;
  proteinGrams: number;
  carbsNetGrams: number;
  fatGrams: number;
  fiberGrams: number;
  waterOunces: number;
  bmr: number;
  tdee: number;
  carbPercentage: number;
  explanation: string;
}

/**
 * Convert pounds to kilograms
 */
function poundsToKg(lbs: number): number {
  return lbs / 2.20462;
}

/**
 * Convert feet and inches to centimeters
 */
function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

/**
 * Extract height in cm from either format
 */
function getHeightInCm(
  height: CalculateMacrosInput["height"]
): number {
  if ("cm" in height) {
    return height.cm as number;
  }
  const feet = (height as { feet: number; inches: number }).feet;
  const inches = (height as { feet: number; inches: number }).inches;
  return feetInchesToCm(feet, inches);
}

/**
 * Calculate BMR using Mifflin-St Jeor formula
 */
function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: "male" | "female"
): number {
  if (sex === "male") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
}

/**
 * Get activity multiplier
 */
function getActivityMultiplier(
  activityLevel: CalculateMacrosInput["activityLevel"]
): number {
  switch (activityLevel) {
    case "sedentary":
      return 1.2;
    case "lightly-active":
      return 1.375;
    case "moderately-active":
      return 1.55;
    case "very-active":
      return 1.725;
    case "extra-active":
      return 1.9;
    default:
      return 1.2;
  }
}

/**
 * Apply goal adjustment to TDEE
 */
function applyGoalAdjustment(
  tdee: number,
  goal: CalculateMacrosInput["goal"]
): number {
  switch (goal) {
    case "lose-aggressive":
      return tdee - 750;
    case "lose-moderate":
      return tdee - 500;
    case "maintain":
      return tdee;
    case "gain-muscle":
      return tdee + 300;
    default:
      return tdee;
  }
}

/**
 * Calculate macros based on diet type
 */
function calculateMacros(
  calorieTarget: number,
  weightKg: number,
  dietType: CalculateMacrosInput["dietType"]
): {
  proteinGrams: number;
  carbsNetGrams: number;
  fatGrams: number;
} {
  let proteinGrams: number;
  let carbsNetGrams: number;
  let fatGrams: number;

  switch (dietType) {
    case "keto-strict":
      carbsNetGrams = 20;
      proteinGrams = Math.round(weightKg * 0.9); // 0.8-1.0 average to 0.9
      fatGrams = Math.round(
        (calorieTarget - (carbsNetGrams * 4 + proteinGrams * 4)) / 9
      );
      break;

    case "keto-moderate":
      carbsNetGrams = 50;
      proteinGrams = Math.round(weightKg * 0.8);
      fatGrams = Math.round(
        (calorieTarget - (carbsNetGrams * 4 + proteinGrams * 4)) / 9
      );
      break;

    case "low-carb":
      carbsNetGrams = 100;
      proteinGrams = Math.round(weightKg * 0.7);
      fatGrams = Math.round(
        (calorieTarget - (carbsNetGrams * 4 + proteinGrams * 4)) / 9
      );
      break;

    case "carnivore":
      carbsNetGrams = 0;
      proteinGrams = Math.round(weightKg * 1.35); // 1.2-1.5 average to 1.35
      fatGrams = Math.round(
        (calorieTarget - proteinGrams * 4) / 9
      );
      break;

    default:
      throw new Error("Unknown diet type");
  }

  return { proteinGrams, carbsNetGrams, fatGrams };
}

/**
 * Calculate carb percentage
 */
function calculateCarbPercentage(
  carbsGrams: number,
  calorieTarget: number
): number {
  if (calorieTarget === 0) return 0;
  return Math.round((carbsGrams * 4) / calorieTarget * 100);
}

/**
 * Generate explanation string
 */
function generateExplanation(
  bmr: number,
  tdee: number,
  calorieTarget: number,
  goal: CalculateMacrosInput["goal"],
  dietType: CalculateMacrosInput["dietType"]
): string {
  let explanation = `Your BMR is ${Math.round(bmr)} calories/day. `;
  explanation += `With your activity level, your TDEE is ${Math.round(tdee)} calories/day. `;

  if (goal === "lose-aggressive") {
    explanation += `To lose weight aggressively (1.5-2 lbs/week), we subtracted 750 calories, `;
  } else if (goal === "lose-moderate") {
    explanation += `To lose weight moderately (0.5-1 lb/week), we subtracted 500 calories, `;
  } else if (goal === "gain-muscle") {
    explanation += `To gain muscle, we added 300 calories, `;
  }

  explanation += `bringing your target to ${Math.round(calorieTarget)} calories/day. `;

  if (dietType === "keto-strict") {
    explanation += "Your strict keto macros keep net carbs under 20g to maintain ketosis.";
  } else if (dietType === "keto-moderate") {
    explanation += "Your moderate keto macros allow up to 50g net carbs for flexibility.";
  } else if (dietType === "low-carb") {
    explanation += "Your low-carb macros limit carbs to 100g for metabolic benefits.";
  } else if (dietType === "carnivore") {
    explanation += "Your carnivore macros emphasize protein and fat with zero carbs.";
  }

  return explanation;
}

/**
 * POST /api/nutrition/calculate-macros
 * Calculate daily macro targets based on user metrics and goals
 */
nutritionRouter.post(
  "/calculate-macros",
  zValidator("json", calculateMacrosSchema),
  (c) => {
    try {
      const input = c.req.valid("json");

      // Convert weight to kg (input assumed to be in lbs for imperial)
      const weightKg = "cm" in input.height ? input.weight : poundsToKg(input.weight);

      // Get height in cm
      const heightCm = getHeightInCm(input.height);

      // Calculate BMR
      const bmr = calculateBMR(weightKg, heightCm, input.age, input.sex);

      // Calculate TDEE
      const activityMultiplier = getActivityMultiplier(input.activityLevel);
      const tdee = bmr * activityMultiplier;

      // Apply goal adjustment
      const calorieTarget = applyGoalAdjustment(tdee, input.goal);

      // Calculate macros
      const { proteinGrams, carbsNetGrams, fatGrams } = calculateMacros(
        calorieTarget,
        weightKg,
        input.dietType
      );

      // Set fiber recommendation
      const fiberGrams = 25;

      // Calculate water recommendation (weight in lbs / 2)
      const weightLbs = "cm" in input.height ? weightKg * 2.20462 : input.weight;
      const waterOunces = Math.round(weightLbs / 2);

      // Calculate carb percentage
      const carbPercentage = calculateCarbPercentage(carbsNetGrams, calorieTarget);

      // Generate explanation
      const explanation = generateExplanation(bmr, tdee, calorieTarget, input.goal, input.dietType);

      const response: MacroCalculationResponse = {
        calorieTarget: Math.round(calorieTarget),
        proteinGrams,
        carbsNetGrams,
        fatGrams,
        fiberGrams,
        waterOunces,
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        carbPercentage,
        explanation,
      };

      return c.json({ data: response }, 200);
    } catch (error) {
      console.error("Macro calculation error:", error);
      return c.json(
        {
          error: {
            message: "Failed to calculate macros",
            code: "CALCULATION_ERROR",
          },
        },
        500
      );
    }
  }
);

export { nutritionRouter };
