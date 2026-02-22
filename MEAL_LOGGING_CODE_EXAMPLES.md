# Chef Claude Meal Logging - Code Examples & API Reference

## Meal Analysis Types

### MealAnalysis Interface
```typescript
interface MealAnalysis {
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
}
```

### IdentifiedFood Interface
```typescript
interface IdentifiedFood {
  name: string;
  quantity: string | null;        // "2", "1.5", null
  unit: string | null;            // "pieces", "cups", "g", "oz"
  cookingMethod: string | null;   // "fried", "roasted", "boiled"
  inPantry: boolean;              // Item found in user's pantry
  estimatedCalories: number;
  estimatedNetCarbs: number;
  estimatedProtein: number;
  estimatedFat: number;
  confidence: 'high' | 'medium' | 'low';
}
```

## API Examples

### Example 1: Simple Meal (Can Log Now)

**Request:**
```bash
curl -X POST http://localhost:3000/api/meals/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "I just had 2 eggs with bacon",
    "pantryItems": [
      {
        "id": "1",
        "name": "Large Eggs",
        "brand": "Pete and Gerry'\''s",
        "nutrition": {
          "calories": 70,
          "carbs": 0,
          "protein": 6,
          "fat": 5,
          "fiber": 0,
          "netCarbs": 0
        },
        "servingUnit": "egg"
      },
      {
        "id": "2",
        "name": "Bacon",
        "nutrition": {
          "calories": 80,
          "carbs": 0,
          "protein": 6,
          "fat": 6,
          "fiber": 0,
          "netCarbs": 0
        },
        "servingUnit": "strip"
      }
    ],
    "userProfile": {
      "dailyCarbGoal": 50,
      "dailyCalorieGoal": 2000,
      "personalityMode": "coach"
    }
  }'
```

**Response:**
```json
{
  "data": {
    "isMealDescription": true,
    "identifiedFoods": [
      {
        "name": "Large Eggs",
        "quantity": "2",
        "unit": "egg",
        "cookingMethod": null,
        "inPantry": true,
        "estimatedCalories": 140,
        "estimatedNetCarbs": 0,
        "estimatedProtein": 12,
        "estimatedFat": 10,
        "confidence": "high"
      },
      {
        "name": "Bacon",
        "quantity": null,
        "unit": null,
        "cookingMethod": null,
        "inPantry": true,
        "estimatedCalories": 80,
        "estimatedNetCarbs": 0,
        "estimatedProtein": 6,
        "estimatedFat": 6,
        "confidence": "medium"
      }
    ],
    "mealType": "breakfast",
    "mealTypeConfidence": "high",
    "missingInfo": [],
    "canLogNow": true,
    "followUpQuestions": [],
    "totalEstimatedCalories": 220,
    "totalEstimatedNetCarbs": 0,
    "totalEstimatedProtein": 18,
    "totalEstimatedFat": 16,
    "pantryItemsToDeduct": ["Large Eggs", "Bacon"],
    "logConfidenceMessage": "This meal has about 220 calories and 0g net carbs. This fits well within your daily carb goals."
  }
}
```

### Example 2: Vague Meal (Needs Follow-up)

**Request:**
```bash
curl -X POST http://localhost:3000/api/meals/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "I had some leftovers",
    "pantryItems": [...],
    "userProfile": {
      "dailyCarbGoal": 50,
      "dailyCalorieGoal": 2000,
      "personalityMode": "zen"
    }
  }'
```

**Response:**
```json
{
  "data": {
    "isMealDescription": true,
    "identifiedFoods": [],
    "mealType": "unknown",
    "mealTypeConfidence": "low",
    "missingInfo": [
      "meal type",
      "food descriptions",
      "quantities"
    ],
    "canLogNow": false,
    "followUpQuestions": [
      "What leftovers did you have? Please be specific about the foods.",
      "Was that breakfast, lunch, dinner, or a snack?",
      "About how much did you eat — a small bowl or a full plate?"
    ],
    "totalEstimatedCalories": 0,
    "totalEstimatedNetCarbs": 0,
    "totalEstimatedProtein": 0,
    "totalEstimatedFat": 0,
    "pantryItemsToDeduct": [],
    "logConfidenceMessage": "I need more information about what you ate to log this accurately."
  }
}
```

### Example 3: Not a Meal Description

**Request:**
```bash
curl -X POST http://localhost:3000/api/meals/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "How many carbs are in a banana?",
    "pantryItems": [...],
    "userProfile": {...}
  }'
```

**Response:**
```json
{
  "data": {
    "isMealDescription": false,
    "identifiedFoods": [],
    "mealType": "unknown",
    "mealTypeConfidence": "low",
    "missingInfo": [
      "This doesn'\''t appear to be a meal description"
    ],
    "canLogNow": false,
    "followUpQuestions": [
      "Could you describe a meal you just ate? For example: '\''I just had 2 eggs with bacon and toast'\''"
    ],
    "totalEstimatedCalories": 0,
    "totalEstimatedNetCarbs": 0,
    "totalEstimatedProtein": 0,
    "totalEstimatedFat": 0,
    "pantryItemsToDeduct": [],
    "logConfidenceMessage": "This message doesn'\''t describe a meal. Please tell me what you ate."
  }
}
```

## Code Usage Examples

### Using Meal Detection

```typescript
import { isMealDescription, getMealTypeEmoji, formatMealType } from '@/lib/mealAnalysis';

// Check if a message is about eating
const userInput = "I just had 2 eggs with bacon";
if (isMealDescription(userInput)) {
  console.log("This is a meal description!");

  // Get emoji for display
  const emoji = getMealTypeEmoji('breakfast'); // Returns '🌅'

  // Format meal type
  const formatted = formatMealType('breakfast'); // Returns 'Breakfast'
}
```

### Calling the Backend API

```typescript
import { api } from '@/lib/api/api';
import type { MealAnalysis } from '@/lib/mealAnalysis';

async function analyzeMeal(userMessage: string, pantryItems, userProfile) {
  try {
    const analysis = await api.post<MealAnalysis>('/api/meals/analyze', {
      userMessage,
      pantryItems,
      userProfile
    });

    if (analysis.isMealDescription) {
      if (analysis.canLogNow) {
        console.log("Ready to log:", analysis);
      } else {
        console.log("Ask user:", analysis.followUpQuestions[0]);
      }
    } else {
      console.log("Not a meal description");
    }

    return analysis;
  } catch (error) {
    console.error('Failed to analyze meal:', error);
    return null;
  }
}
```

### Logging a Meal

```typescript
import { useMealsStore } from '@/lib/stores/mealsStore';
import { usePantryStore } from '@/lib/stores/pantryStore';
import type { FoodEntry } from '@/lib/stores/mealsStore';

function logMeal(analysis: MealAnalysis) {
  const addEntry = useMealsStore((s) => s.addEntry);
  const deductServings = usePantryStore((s) => s.deductServings);
  const pantryItems = usePantryStore((s) => s.items);

  // Create food entry
  const todayStr = new Date().toISOString().split('T')[0];

  const mealTypeMap = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snacks'
  } as const;

  const entry: Omit<FoodEntry, 'id'> = {
    name: analysis.identifiedFoods.map(f => f.name).join(', '),
    mealType: mealTypeMap[analysis.mealType] || 'Snacks',
    date: todayStr,
    servings: 1,
    calories: Math.round(analysis.totalEstimatedCalories),
    carbs: Math.round(analysis.totalEstimatedNetCarbs * 10) / 10,
    protein: Math.round(analysis.totalEstimatedProtein * 10) / 10,
    fat: Math.round(analysis.totalEstimatedFat * 10) / 10,
    fiber: 0,
    netCarbs: Math.round(analysis.totalEstimatedNetCarbs * 10) / 10,
    isFavorite: false,
  };

  // Add to meals store
  addEntry(entry);

  // Deduct from pantry
  analysis.pantryItemsToDeduct.forEach((itemName) => {
    const pantryItem = pantryItems.find(p =>
      p.name.toLowerCase() === itemName.toLowerCase()
    );
    if (pantryItem) {
      deductServings(pantryItem.id, 1);
    }
  });
}
```

### Rendering Confirmation Card

```typescript
import { MealConfirmationCard } from '@/components/MealConfirmationCard';

export function MealDialog({ analysis }: { analysis: MealAnalysis }) {
  const [isLogging, setIsLogging] = useState(false);

  async function handleConfirm() {
    setIsLogging(true);
    try {
      logMeal(analysis);
      // Show success message
    } finally {
      setIsLogging(false);
    }
  }

  return (
    <MealConfirmationCard
      analysis={analysis}
      onConfirm={handleConfirm}
      onEdit={() => {
        // Handle edit modal
      }}
      isLoading={isLogging}
    />
  );
}
```

### Message with Meal Data

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mealAnalysis?: MealAnalysis;      // Attached if meal detected
  isFollowUpQuestion?: boolean;     // True if asking for more info
}

// Creating a message with meal analysis
const assistantMessage: Message = {
  id: `msg-${Date.now()}`,
  role: 'assistant',
  content: 'Here is what I am going to log:',
  timestamp: new Date(),
  mealAnalysis: analysis,           // If canLogNow=true
  isFollowUpQuestion: false,
};

// In MessageBubble, check for meal analysis
{message.mealAnalysis && (
  <MealConfirmationCard
    analysis={message.mealAnalysis}
    onConfirm={handleConfirm}
    onEdit={handleEdit}
  />
)}
```

## Hook Pattern for Meal Analysis

```typescript
// In Chef Claude component
const [currentMealAnalysis, setCurrentMealAnalysis] = useState<MealAnalysis | null>(null);
const [isMealAnalyzing, setIsMealAnalyzing] = useState(false);

const analyzeMealDescription = useCallback(
  async (userMessage: string): Promise<MealAnalysis | null> => {
    if (!isMealDescription(userMessage)) {
      return null;
    }

    setIsMealAnalyzing(true);
    try {
      const response = await api.post<MealAnalysis>('/api/meals/analyze', {
        userMessage,
        pantryItems: pantryForBackend,
        userProfile: {
          dailyCarbGoal: userProfile.dailyCarbGoal,
          dailyCalorieGoal: userProfile.dailyCalorieGoal,
          personalityMode: userProfile.personalityMode,
        },
      });

      setCurrentMealAnalysis(response);
      return response ?? null;
    } catch (error) {
      console.warn('Meal analysis error:', error);
      return null;
    } finally {
      setIsMealAnalyzing(false);
    }
  },
  [pantryItems, userProfile]
);

// Call it in sendMessage
const analysis = await analyzeMealDescription(userMessage);

if (analysis?.isMealDescription) {
  // Handle meal
  setCurrentMealAnalysis(analysis);

  if (analysis.canLogNow) {
    // Show confirmation card
  } else {
    // Ask follow-up question
  }
}
```

## Error Handling Patterns

```typescript
// API Error
try {
  const response = await api.post<MealAnalysis>('/api/meals/analyze', {...});
} catch (error) {
  console.error('Analysis failed:', error);
  // Fall back to basic Claude conversation
  // Or show error to user
}

// Logging Error
try {
  logMealFromAnalysis(analysis);
} catch (error) {
  console.error('Failed to log meal:', error);
  // Show error message to user
  // Offer to retry
}

// Missing API Key
if (!userProfile.claudeApiKey) {
  setShowApiKeyModal(true);
  return;
}
```

## Constants & Helpers

```typescript
// In mealAnalysis.ts
export const MEAL_PATTERNS = [
  'i just ate',
  'i just had',
  'just finished',
  // ... more patterns
];

export const EXCLUDE_PATTERNS = [
  'how many',
  'how much',
  'what can i make',
  // ... more patterns
];

export function getMealTypeEmoji(mealType: string): string {
  const emojis = {
    'breakfast': '🌅',
    'lunch': '🌤️',
    'dinner': '🌙',
    'snack': '🍿',
    'unknown': '🍽️',
  };
  return emojis[mealType] || emojis.unknown;
}

export function formatNutrient(value: number, unit: string): string {
  if (Math.abs(value) < 0.1) return `0${unit}`;
  if (value % 1 === 0) return `${Math.round(value)}${unit}`;
  return `${(Math.round(value * 10) / 10).toFixed(1)}${unit}`;
}

// Usage
formatNutrient(42.5, 'g') // Returns "42.5g"
formatNutrient(42, 'g')   // Returns "42g"
formatNutrient(0.05, 'g') // Returns "0g"
```

## Testing Utilities

```typescript
// Test meal detection
import { isMealDescription } from '@/lib/mealAnalysis';

const testCases = [
  { input: "I just had eggs", expected: true },
  { input: "How many carbs?", expected: false },
];

testCases.forEach(({ input, expected }) => {
  const result = isMealDescription(input);
  expect(result).toBe(expected);
});

// Test API response
import { api } from '@/lib/api/api';

const mockAnalysis = await api.post<MealAnalysis>('/api/meals/analyze', {
  userMessage: 'I just had 2 eggs',
  pantryItems: [],
  userProfile: { dailyCarbGoal: 50, dailyCalorieGoal: 2000, personalityMode: 'default' }
});

expect(mockAnalysis?.isMealDescription).toBe(true);
expect(mockAnalysis?.mealType).toBe('breakfast');
```

## Performance Considerations

```typescript
// Fast path: Pattern matching happens first
if (!isMealDescription(userMessage)) {
  // Skip expensive API call, go straight to Claude
  return normalClaude(userMessage);
}

// Only call backend if pattern matches
const analysis = await api.post<MealAnalysis>('/api/meals/analyze', {...});

// Limit API calls during analysis
setIsMealAnalyzing(true); // Prevent concurrent calls
try {
  // ... API call
} finally {
  setIsMealAnalyzing(false);
}

// Debounce input while analyzing
if (isTyping || isMealAnalyzing) {
  return; // Ignore new messages
}
```

These examples should help integrate and test the meal logging feature successfully!
