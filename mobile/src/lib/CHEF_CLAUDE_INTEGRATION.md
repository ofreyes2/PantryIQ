/**
 * CHEF CLAUDE TOOLS SYSTEM — INTEGRATION GUIDE
 *
 * This guide explains how to enable Chef Claude to use the tools system
 * to read and write data throughout the app.
 */

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════
//
// Two new files have been created:
//
// 1. src/lib/chefClaudeTools.ts (950+ lines)
//    └─ Pure data access layer (read and write)
//    └─ 40+ functions for accessing all app stores
//    └─ Safe AsyncStorage operations with error handling
//
// 2. src/lib/chefClaudeAPI.ts (280+ lines)
//    └─ Higher-level API for Claude integration
//    └─ Tool validation and execution
//    └─ Helper functions for common queries
//    └─ Whitelist-based security

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: ADD TOOL DESCRIPTIONS TO CLAUDE'S SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════
//
// In chef-claude.tsx, add this section to buildSystemPrompt():

const CLAUDE_TOOLS_DESCRIPTION = `
---DATA ACCESS TOOLS---

You have access to real-time app data through these tools:

MEALS & NUTRITION:
- getTodaysMeals() → returns array of meals logged today
- getTodaysTotals() → returns { calories, netCarbs, protein, fat, fiber }
- logMeal({ name, calories, netCarbs, protein, fat, mealType }) → logs new meal
- deleteMeal(mealId) → removes meal by ID
- getMealsForDate(dateString) → meals for specific date (YYYY-MM-DD)

PANTRY:
- getPantryItems() → returns all pantry items with quantities
- searchPantry(query) → search items by name or category
- hasPantryItem(name) → true/false if item exists
- getLowStockItems() → items below restock threshold
- getExpiringItems() → items expiring within 3 days

SHOPPING:
- getShoppingList() → current shopping list
- addToShoppingList([items]) → add one or more items
- removeFromShoppingList(itemName) → remove item

HEALTH & GOALS:
- getDailyGoals() → { carbs, calories, protein, fat, water }
- updateUserGoals(updates) → update target goals
- getCurrentWeight() → most recent weight entry
- getWeightProgress() → weight loss progress from start

ANALYSIS:
- getDailySummary(date?) → complete daily overview with progress
- getWeekOverview() → last 7 days summary
- getTodaysMacros() → consumed vs remaining budget

EXAMPLE USAGE:
When user asks: "How many carbs have I had today?"
  1. You recognize this needs getTodaysMacros()
  2. You request: { "tool": "getTodaysMacros" }
  3. System executes and returns real data
  4. You answer with actual numbers from the data

When user says: "Log chicken and broccoli for lunch"
  1. You extract: name="chicken and broccoli", mealType="Lunch"
  2. You estimate or ask about: calories, carbs, protein, fat
  3. You request: { "tool": "logMeal", "params": { ... } }
  4. System updates the app and confirms

TOOL EXECUTION EXAMPLES:

Get today's meals:
{
  "tool": "getTodaysMeals"
}
→ Returns: [{ id, name, calories, netCarbs, mealType, loggedAt, ... }, ...]

Get today's macros:
{
  "tool": "getTodaysMacros"
}
→ Returns: { consumed: {...}, goals: {...}, remaining: {...}, percentages: {...} }

Log a meal:
{
  "tool": "logMeal",
  "params": {
    "name": "Grilled chicken with broccoli",
    "calories": 450,
    "netCarbs": 8,
    "protein": 45,
    "fat": 22,
    "mealType": "Lunch"
  }
}
→ Returns: { id, name, calories, netCarbs, ... }

Add to shopping list:
{
  "tool": "addToShoppingList",
  "params": {
    "items": [
      { "name": "Olive oil", "quantity": 1, "unit": "bottle" },
      { "name": "Salmon", "quantity": 2, "unit": "lbs" }
    ]
  }
}
→ Returns: Updated shopping list

IMPORTANT GUIDELINES:
- Always use tools to get REAL data before answering questions
- Tools return actual AsyncStorage data, not estimates
- When logging meals, include all macros (calories, carbs, protein, fat)
- Ask user for clarification if data is incomplete
- Tools are read-safe: safe to call multiple times
- Tools are write-safe: validate data before writing
`;

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: PARSE TOOL CALLS FROM CLAUDE'S RESPONSE
// ═══════════════════════════════════════════════════════════════════════════
//
// Modify processClaudeResponse() to detect and handle tool calls:

async function parseClaudeToolCalls(claudeResponse: string) {
  // Claude might include tool calls in the response like:
  // "I'll check your meals... [TOOL: getTodaysMeals]"
  // Or as JSON block: <TOOLS>{"tool":"getTodaysMeals"}</TOOLS>

  const toolMatches = claudeResponse.match(/<TOOLS>([\s\S]*?)<\/TOOLS>/g);
  const toolCalls = [];

  if (toolMatches) {
    for (const match of toolMatches) {
      try {
        const jsonStr = match.replace(/<\/?TOOLS>/g, '').trim();
        const toolCall = JSON.parse(jsonStr);
        toolCalls.push(toolCall);
      } catch (e) {
        console.warn('Failed to parse tool call:', e);
      }
    }
  }

  return toolCalls;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: EXECUTE TOOLS AND BUILD CONTEXT
// ═══════════════════════════════════════════════════════════════════════════
//
// After Claude responds, before displaying:

async function executeClaudeTool(toolCall) {
  const { ChefClaudeAPI } = await import('@/lib/chefClaudeAPI');
  return await ChefClaudeAPI.executeTool(toolCall);
}

// If Claude made tool calls, execute them and include results in next Claude context:
if (toolCalls.length > 0) {
  const toolResults = [];
  for (const call of toolCalls) {
    const result = await executeClaudeTool(call);
    toolResults.push({
      tool: call.tool,
      result: result.data,
      success: result.success,
    });
  }

  // Include in next message to Claude:
  const toolContextMessage = {
    role: 'user',
    content: `Tool execution results:\n${JSON.stringify(toolResults, null, 2)}`,
  };
  messages.push(toolContextMessage);
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: DEMONSTRATE WITH EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════

// Example 1: User asks "How many carbs have I had today?"
//
// Flow:
// 1. User: "How many carbs have I had today?"
// 2. Claude recognizes carb question, requests: getTodaysMacros()
// 3. System executes tool, gets real data
// 4. Claude responds: "You've had 17.5g net carbs, goal is 20g"

// Example 2: User says "Log eggs and bacon for breakfast"
//
// Flow:
// 1. User: "Log eggs and bacon for breakfast"
// 2. Claude recognizes meal log request
// 3. Claude estimates macros: eggs (70cal, 0.5g carbs, 6g protein, 5g fat)
// 4. Claude estimates macros: bacon (50cal per strip, 0g carbs, 4g protein, 4g fat)
// 5. Claude calls logMeal() with totals for 2 eggs + 2 bacon strips
// 6. System stores in app, updates daily totals
// 7. Claude confirms: "✅ Logged: 2 eggs + 2 bacon strips (290 cal, 1.5g carbs)"

// Example 3: User asks "What's in my pantry?"
//
// Flow:
// 1. User: "What's in my pantry?"
// 2. Claude calls getPantryItems()
// 3. System returns all pantry items
// 4. Claude organizes by category and responds with formatted list

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════

const INTEGRATION_CHECKLIST = `
✅ chefClaudeTools.ts created (40+ read/write functions)
✅ chefClaudeAPI.ts created (API wrapper and helpers)
✅ TypeScript compilation passes (no errors)

STILL NEEDED:
□ Add tool descriptions to Claude's system prompt in chef-claude.tsx
□ Import ChefClaudeAPI in chef-claude.tsx
□ Modify processClaudeResponse() to detect tool calls
□ Add tool execution logic to handle Claude tool requests
□ Add tool result context to Claude's next message
□ Test tool execution with real user queries
□ Update MEAL_DATA JSON format to include tool calls if needed
□ Document tool usage in system prompt

ESTIMATED COMPLETION TIME:
- Add to system prompt: 10 minutes
- Integrate tool parsing: 20 minutes
- Test execution: 30 minutes
- Debug and refine: as needed

TESTING STRATEGY:
1. Test read-only tools first: getTodaysMeals, getDailyGoals, getPantryItems
2. Test write operations: logMeal, addToShoppingList
3. Test with actual user queries
4. Verify data persistence across app restart
5. Test error handling with invalid inputs
`;

console.log(INTEGRATION_CHECKLIST);

// ═══════════════════════════════════════════════════════════════════════════
// API DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export const API_DOCS = {
  // All 40+ functions are documented in chefClaudeTools.ts
  // All integration helpers are documented in chefClaudeAPI.ts
  //
  // Key files:
  // - src/lib/chefClaudeTools.ts ← All data access functions
  // - src/lib/chefClaudeAPI.ts ← Integration API
  // - src/app/chef-claude.tsx ← Integration point
};
