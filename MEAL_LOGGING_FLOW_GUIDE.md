# Chef Claude Meal Logging - Visual Flow Guide

## User Interface Flow

### 1. Meal Input
```
┌─────────────────────────────────────────┐
│ Chef Claude Screen                      │
├─────────────────────────────────────────┤
│                                         │
│ User types meal description:            │
│ "I just had 2 crispy chicken thighs    │
│  with roasted broccoli"                 │
│                                         │
│                                    [SEND]
│                                         │
└─────────────────────────────────────────┘
```

### 2. Detection & Analysis
```
System Logic:
  ↓
  isMealDescription("I just had...") → TRUE
  ↓
  analyzeMealDescription() called
  ↓
  POST /api/meals/analyze
  ↓
  Backend returns MealAnalysis object
```

### 3. Confirmation Card (if canLogNow=true)
```
┌───────────────────────────────────────────────────┐
│ 🌙 Dinner                            12:34 PM     │
├───────────────────────────────────────────────────┤
│                                                   │
│ 2 pieces chicken thighs — roasted                 │
│ 418 cal • 0g carbs                                │
│                                                   │
│ 1 cup roasted broccoli                            │
│ 34 cal • 4g carbs                                 │
│                                                   │
├───────────────────────────────────────────────────┤
│ Total: 452 cal • 4g net carbs • 50g protein      │
│                                                   │
│ [Edit Details]           [Log This Meal]         │
│                                                   │
└───────────────────────────────────────────────────┘
```

### 4. Success Confirmation
```
Chef: "Logged! Your dinner has been added.
       You have used 23 of your 50g carb
       budget today — you are doing great.
       I also updated your pantry — reduced
       your chicken thighs by 2."

[Chat bubbles update with success message]
```

## Alternative Flow: Follow-up Questions

When meal data is incomplete:

### 3b. Follow-up Question (if canLogNow=false)
```
System: Detects incomplete information
        ↓
        Returns followUpQuestions: [
          "How many chicken thighs did you have?",
          "Was that breakfast, lunch, or dinner?"
        ]
        ↓
        canLogNow = false

Chef Claude displays:
┌──────────────────────────────┐
│ Got it! Just one quick      │
│ question to nail this down —│
│ How many chicken thighs did │
│ you have?                   │
│                            │
│ (Coach mode personality)   │
└──────────────────────────────┘

User answers:
"I had 2 thighs"

System re-analyzes with new information
→ canLogNow becomes true
→ Shows confirmation card
→ Flow continues to step 4
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ User Input                                              │
│ "I just had 2 eggs with bacon"                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────────┐
        │ isMealDescription()        │
        │ Pattern matching (fast)    │
        └────────────┬───────────────┘
                     │ YES
                     ↓
    ┌────────────────────────────────────────┐
    │ analyzeMealDescription()                │
    │ Call: POST /api/meals/analyze          │
    │ Send:                                  │
    │  - userMessage                         │
    │  - pantryItems (converted)             │
    │  - userProfile                         │
    └────────┬─────────────────────────────┬─┘
             │                             │
             ↓ canLogNow=true              ↓ canLogNow=false
       ┌──────────────────┐        ┌──────────────────┐
       │ Show Confirmation│        │ Ask Follow-up    │
       │ Card             │        │ Question         │
       └────────┬─────────┘        │ (one at a time)  │
                │                  └────────┬─────────┘
                │ User taps button          │
                │ "Log This Meal"           │ User answers
                │                           │
                ↓                           ↓
          ┌──────────────────────────────────────┐
          │ logMealFromAnalysis()                │
          │                                      │
          │ 1. Create FoodEntry                  │
          │ 2. Add to mealsStore                 │
          │ 3. Deduct from pantry                │
          └─────────────┬────────────────────────┘
                        │
                        ↓
          ┌──────────────────────────────────────┐
          │ Show Success Message                 │
          │ "Logged! Your breakfast has been     │
          │  added. You have used 5 of your      │
          │  50g carb budget today — you are    │
          │  doing great."                       │
          └──────────────────────────────────────┘
                        │
                        ↓
          ┌──────────────────────────────────────┐
          │ Real-time Updates                    │
          │ - Daily totals recalculated          │
          │ - Pantry inventory updated           │
          │ - Context strip refreshed            │
          └──────────────────────────────────────┘
```

## State Management

### Component States
```typescript
// Meal analysis state
currentMealAnalysis: MealAnalysis | null
isMealAnalyzing: boolean       // During API call
isMealLogging: boolean         // During meal creation

// Conversation state
messages: Message[]
inputText: string
isTyping: boolean              // During Claude API call

// Follow-up tracking
pendingMealAnswers: string[]   // Questions awaiting answers
```

### Message Structure
```typescript
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string                    // Text to display
  timestamp: Date
  mealAnalysis?: MealAnalysis       // Only if meal detected
  isFollowUpQuestion?: boolean      // True if asking for more info
}
```

## Integration Points

### Zustand Stores Used
- **mealsStore**: `addEntry()` - Add FoodEntry to diary
- **pantryStore**: `deductServings()` - Reduce pantry inventory
- **appStore**: Read user goals and personality mode
- **kitchenStore**: Read equipment and preferences

### API Endpoints Called
- **POST /api/meals/analyze** - Backend meal analysis
- **POST /api/messages** - Claude API (for non-meal messages)

### Components
- **MessageBubble** - Display messages and confirmation cards
- **MealConfirmationCard** - Styled card for meal confirmation
- **TypingIndicator** - Show when Chef is thinking
- **WelcomeCard** - Initial greeting and quick prompts

## Personality Mode Responses

### When showing confirmation card:

**Default/Coach:**
```
"Perfect! Here is what I am going to log for your dinner:"
```

**Gordon Ramsay:**
```
"Right! That sounds delicious. Here is your 🌙 Dinner:"
```

**Scientist:**
```
"Excellent data. Logging your dinner:"
```

**Zen:**
```
"What a wonderful meal. I am logging your 🌙 Dinner:"
```

### When asking follow-up question:

**Coach:**
```
"Got it! Just one quick question to nail this down — [question]"
```

**Gordon Ramsay:**
```
"Interesting! Listen — [question in lowercase]"
```

**Scientist:**
```
"Let me gather more precise data. [question]"
```

**Zen:**
```
"Beautiful meal. Just so I have the complete picture — [question]"
```

## Error Handling

```
User: "I just ate something"
      ↓
      Backend: identifiedFoods = [], isMealDescription = true
      ↓
      canLogNow = false, followUpQuestions = ["What did you eat?"]
      ↓
      Chef: Asks clarifying question
      ↓
      User: "Eggs and toast"
      ↓
      System: Re-analyzes and continues

────────────────────────────────────────

Meal Logging Error:
      ↓
      logMealFromAnalysis() catches error
      ↓
      Shows: "Sorry, I had trouble logging that meal. Please try again."
      ↓
      User can retry or modify
```

## Performance Optimizations

1. **Fast Pattern Matching First**
   - `isMealDescription()` runs immediately (no API call)
   - Excludes non-meals before expensive backend call

2. **Smart Follow-up Questions**
   - Only asks questions for critical missing info
   - One question at a time (not overwhelming)
   - Ordered by importance

3. **Deferred Pantry Updates**
   - Pantry deduction happens after meal is logged
   - Doesn't block confirmation display

4. **Haptic Feedback**
   - Light impact on send
   - Success notification on confirm
   - User knows action completed

## Testing Checklist

- [ ] User can log meal with complete information
- [ ] Confirmation card displays correctly with all macros
- [ ] Meal entries appear in food diary
- [ ] Pantry items are deducted appropriately
- [ ] Follow-up questions appear when needed
- [ ] Personality mode affects response wording
- [ ] Success message shows carb budget status
- [ ] Daily totals update in real-time
- [ ] Context strip (top) refreshes with new totals
- [ ] Haptic feedback works on success
- [ ] API errors are handled gracefully
- [ ] Non-meal messages still go to Claude
