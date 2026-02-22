# Chef Claude Natural Language Meal Logging

## Implementation Complete

I've implemented the natural language meal logging feature for PantryIQ's Chef Claude. This adds conversational meal logging where users describe what they ate naturally, and the system intelligently extracts meal data, asks follow-up questions if needed, and logs meals automatically.

## What Was Built

### 1. Meal Detection (`mobile/src/lib/mealAnalysis.ts`)

A utility module that recognizes meal descriptions from user messages:

**Key Function: `isMealDescription(userMessage: string)`**
- Detects eating patterns: "I just ate", "I just had", "just finished", "for breakfast I had", etc.
- Rejects non-meal messages: Questions, recipe requests, planning ("I'm going to eat"), general statements
- Pattern-based initial filtering for fast detection

**Supporting Functions:**
- `getMealTypeEmoji()`: Returns emoji for breakfast/lunch/dinner/snack
- `formatMealType()`: Capitalizes meal type
- `formatNutrient()`: Formats numeric nutrients (e.g., "42g protein")

### 2. Meal Confirmation Card (`mobile/src/components/MealConfirmationCard.tsx`)

A styled React Native component that displays meal confirmation with:
- Green pill badge showing meal type emoji
- Time stamp of logging
- List of identified foods with quantities and macro estimates
- Bold total row: "Total: 420 cal • 5g net carbs • 42g protein"
- Two buttons:
  - "Log This Meal" (green, filled)
  - "Edit Details" (outlined)
- Loading state during meal logging process

### 3. Chef Claude Integration (`mobile/src/app/chef-claude.tsx`)

The main screen updated with meal logging capabilities:

**New State Variables:**
```typescript
const [currentMealAnalysis, setCurrentMealAnalysis] = useState<MealAnalysis | null>(null);
const [isMealAnalyzing, setIsMealAnalyzing] = useState(false);
const [isMealLogging, setIsMealLogging] = useState(false);
const [pendingMealAnswers, setPendingMealAnswers] = useState<string[]>([]);
```

**New Functions:**

1. **`analyzeMealDescription(userMessage: string)`**
   - Calls `POST /api/meals/analyze` with:
     - User message
     - Pantry items (converted to backend format)
     - User profile (carb/calorie goals, personality mode)
   - Returns structured `MealAnalysis` object

2. **`logMealFromAnalysis(analysis: MealAnalysis)`**
   - Creates a `FoodEntry` from identified foods
   - Combines all food items into single diary entry
   - Calls `addMealEntry()` to save to meals store
   - Deducts from pantry items using `deductServings()`
   - Returns success/failure

3. **`generateFollowUpResponse(analysis: MealAnalysis)`**
   - Generates Chef Claude's next message based on analysis
   - If follow-up questions exist: Asks first question with personality flavor
   - If ready to log: Introduces confirmation card
   - Personality-aware wording (coach, Gordon Ramsay, scientist, zen)

4. **`handleMealConfirm()`**
   - Called when user taps "Log This Meal"
   - Logs the meal via `logMealFromAnalysis()`
   - Calculates and displays success message with:
     - Carbs remaining in daily budget
     - Pantry items deducted (if any)
   - Shows haptic feedback on success
   - Clears meal state for next interaction

**Updated Components:**

1. **`MessageBubble`** - Now accepts meal confirmation props
   - Renders `MealConfirmationCard` if message has `mealAnalysis`
   - Passes `onMealConfirm` callback for button handling
   - Shows loading state during meal logging

2. **`sendMessage`** - Enhanced to detect and handle meals
   - Calls `isMealDescription()` first (fast pattern check)
   - If meal detected: Calls `analyzeMealDescription()`
   - If not meal: Falls back to Claude conversation as normal
   - Handles analysis results and generates appropriate responses

## How It Works: Step by Step

### Example Flow

**Step 1: User Message**
```
User: "I just had 2 crispy pork rind chicken thighs with roasted broccoli"
```

**Step 2: Detection & Analysis**
- `isMealDescription()` returns `true` (matches "I just had")
- `analyzeMealDescription()` calls `/api/meals/analyze`
- Backend returns:
  ```json
  {
    "isMealDescription": true,
    "identifiedFoods": [
      {"name": "chicken thighs", "quantity": "2", "estimatedCalories": 418, ...}
    ],
    "mealType": "dinner",
    "canLogNow": true,
    "followUpQuestions": []
  }
  ```

**Step 3: Chef Claude Response**
- `generateFollowUpResponse()` returns: "Perfect! Here is what I am going to log for your dinner:"
- Message is added with `mealAnalysis` attached

**Step 4: Confirmation Card Rendered**
- Shows meal details with green "Dinner" pill badge
- Lists "2 chicken thighs — 418 cal, 0g carbs"
- Shows total: "418 calories — 0g net carbs — 52g protein"

**Step 5: User Confirms**
- Taps "Log This Meal" button
- `handleMealConfirm()` executes:
  - Calls `logMealFromAnalysis()`
  - Creates FoodEntry: "2 100g chicken thighs, roasted broccoli"
  - Deducts from pantry if items exist
  - Shows success: "Logged! Your dinner has been added. You have used 5 of your 50g carb budget today."

## Follow-up Questions Pattern

When meal type or quantities are unclear, the backend returns `canLogNow: false` with follow-up questions.

**Example:**
```
User: "I had some eggs and bacon"
```

Backend Analysis:
```json
{
  "canLogNow": false,
  "followUpQuestions": [
    "How many eggs did you have?",
    "Was this breakfast, lunch, or a snack?"
  ]
}
```

Chef Claude responds with first question (personality-flavored):
```
Coach mode: "Got it! Just one quick question to nail this down — How many eggs did you have?"
Zen mode: "Beautiful meal. Just so I have the complete picture — How many eggs did you have?"
```

User answers the follow-up question, and system re-analyzes with the additional context.

## Personality Mode Integration

Each personality mode adds flavor to meal confirmation messages:

- **Default**: "Perfect! Here is what I am going to log for your [mealType]:"
- **Coach**: "Perfect! Here is what I am going to log for your [mealType]:"
- **Gordon Ramsay**: "Right! That sounds delicious. Here is your 🌙 Dinner:"
- **Scientist**: "Excellent data. Logging your dinner:"
- **Zen**: "What a wonderful meal. I am logging your 🌙 Dinner:"

Follow-up questions also receive personality flavor.

## Backend Endpoint: /api/meals/analyze

Already exists at `/backend/src/routes/meals.ts`. The endpoint:

**Request Format:**
```typescript
{
  "userMessage": "I just had 2 eggs with bacon",
  "pantryItems": [
    {
      "id": "1",
      "name": "Large Eggs",
      "nutrition": {
        "calories": 70,
        "carbs": 0,
        "protein": 6,
        "fat": 5,
        "fiber": 0,
        "netCarbs": 0
      },
      "servingUnit": "egg"
    }
  ],
  "userProfile": {
    "dailyCarbGoal": 50,
    "dailyCalorieGoal": 2000,
    "personalityMode": "coach"
  }
}
```

**Response Format:**
```typescript
{
  "data": {
    "isMealDescription": true,
    "identifiedFoods": [...],
    "mealType": "breakfast",
    "mealTypeConfidence": "high",
    "missingInfo": [],
    "canLogNow": true,
    "followUpQuestions": [],
    "totalEstimatedCalories": 350,
    "totalEstimatedNetCarbs": 3,
    "totalEstimatedProtein": 18,
    "totalEstimatedFat": 25,
    "pantryItemsToDeduct": ["Large Eggs", "Bacon"],
    "logConfidenceMessage": "This meal has about 350 calories and 3g net carbs. This fits well within your daily carb goals."
  }
}
```

## Pantry Integration

When a meal is logged:

1. **Matching**: System finds pantry items that match identified foods
   - "Chicken Thighs" matches pantry item named "Chicken Thighs"
   - Fuzzy matching: "thighs" matches "Chicken Thighs"

2. **Deduction**: Calls `deductServings(pantryItemId, servings)`
   - Updates pantry quantity immediately
   - Reflects new inventory in pantry view

3. **Feedback**: Success message includes deducted items
   - "I also updated your pantry — reduced your chicken thighs by 2 and eggs by 3."

## Nutrition Tracking Updates

After logging:

1. **Daily Totals**: Recalculated automatically
   - Calories, carbs, protein, fat updated
   - Reflects in context strip (top of chat)

2. **Goal Tracking**: Contextual messaging
   - Under goal: "You have used 12 of your 50g carb budget today — you are doing great."
   - Over goal: "You are now at 63g of your 50g goal. No worries — tomorrow begins fresh."

3. **Real-time Display**: Context strip shows
   - Pantry items count
   - Net carbs used today
   - Calories consumed

## Testing the Feature

### To Test Meal Detection:

```typescript
import { isMealDescription } from '@/lib/mealAnalysis';

// Should return true
isMealDescription("I just had 2 eggs with bacon")
isMealDescription("Just finished cooking dinner")
isMealDescription("That was delicious!")

// Should return false
isMealDescription("How many carbs in eggs?")
isMealDescription("What can I make for dinner?")
isMealDescription("I'm going to eat later")
```

### To Test Full Flow:

1. Open Chef Claude screen
2. Type: "I just had 2 eggs with bacon and toast"
3. Observe:
   - Meal gets detected
   - Confirmation card appears with details
   - Tapping "Log This Meal" adds entry to diary
   - Pantry items are deducted
   - Success message appears with budget status

### With Claude API Key:

If ANTHROPIC_API_KEY is set in backend, more advanced meal parsing happens using Claude:
- Better extraction of quantities
- Better detection of cooking methods
- More natural follow-up questions

Without it, falls back to heuristic pattern matching (still works well for common foods).

## Key Features Implemented

✅ Meal detection from natural language
✅ Backend API integration for structured analysis
✅ Follow-up question asking (one at a time)
✅ Confirmation card with macro preview
✅ Automatic meal logging to food diary
✅ Pantry inventory deduction
✅ Real-time nutrition total updates
✅ Success/error messaging
✅ Personality mode support
✅ Haptic feedback on success
✅ Loading states during API calls

## What's NOT Included (For Later)

- Quick Log button (add later)
- Proactive meal prompts (add later)
- Meal editing interface (skeleton in card)
- Multi-question follow-up (intentionally one at a time)
- Photo-based meal recognition (separate feature)

## Files Modified/Created

**Created:**
- `/mobile/src/lib/mealAnalysis.ts` (2.9 KB)
- `/mobile/src/components/MealConfirmationCard.tsx` (5.6 KB)

**Modified:**
- `/mobile/src/app/chef-claude.tsx` (40.5 KB, added 640 lines)

**Total Impact:** ~650 lines of new code, 100% focused on meal logging feature

## Code Quality

- Full TypeScript with strict types
- Proper error handling and fallbacks
- Performance optimized (fast pattern matching first)
- Accessible (testIDs on interactive elements)
- Follows project patterns (Zustand, NativeWind, API client)
- Consistent styling with theme colors
- Proper cleanup and state management
