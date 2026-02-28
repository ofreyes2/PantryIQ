/**
 * CHEF CLAUDE TOOLS INTEGRATION EXAMPLE
 *
 * This file shows exactly where and how to integrate the Chef Claude Tools
 * system into the existing chef-claude.tsx file.
 */

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: ADD IMPORTS AT TOP OF chef-claude.tsx
// ═══════════════════════════════════════════════════════════════════════════

// Add these imports:
import { ChefClaudeAPI } from '@/lib/chefClaudeAPI';
import { CHEF_CLAUDE_TOOLS_REFERENCE } from '@/lib/CHEF_CLAUDE_TOOLS_PROMPT';

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: ADD TOOLS REFERENCE TO buildSystemPrompt()
// ═══════════════════════════════════════════════════════════════════════════

// In the buildSystemPrompt() function, after the recipe format rules, add:

function buildSystemPrompt(
  pantryItems: PantryItem[],
  todayEntries: FoodEntry[],
  dailyTotals: DailyTotals,
  userProfile: UserProfile,
  todayStr: string,
  kitchenEquipmentSummary: string,
  preferencesSummary: string
): string {
  // ... existing code ...

  // Add before the closing backtick:
  return `
    ${EXISTING_SYSTEM_PROMPT}

    ${CHEF_CLAUDE_TOOLS_REFERENCE}

    --- END OF SYSTEM PROMPT ---
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: ADD TOOL PARSING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

// Add this function near the top with other helper functions:

/**
 * Parse tool calls from Claude's response
 * Claude might include: [TOOL: functionName(params)]
 */
function parseToolCallsFromResponse(response: string) {
  const toolMatches = response.match(/\[TOOL:\s*(\w+)\s*\(([^)]*)\)\s*\]/g);
  const toolCalls = [];

  if (toolMatches) {
    for (const match of toolMatches) {
      try {
        // Extract function name and params
        const funcMatch = match.match(/\[TOOL:\s*(\w+)\s*\((.*?)\)\s*\]/);
        if (funcMatch) {
          const [, functionName, paramsStr] = funcMatch;

          // Try to parse params as JSON
          let params;
          if (paramsStr.trim()) {
            try {
              params = JSON.parse(paramsStr);
            } catch {
              params = paramsStr; // Fall back to raw string
            }
          }

          toolCalls.push({
            tool: functionName,
            params,
          });
        }
      } catch (error) {
        console.warn('[ChefClaude] Failed to parse tool call:', error);
      }
    }
  }

  return toolCalls;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: EXECUTE TOOLS IN MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

// In the handleSendMessage() function, after getting Claude's response:

const handleSendMessage = useCallback(
  async (userInput: string) => {
    // ... existing code to get rawReply from Claude ...

    // NEW: Parse and execute any tool calls
    const toolCalls = parseToolCallsFromResponse(rawReply);

    if (toolCalls.length > 0) {
      console.log('[ChefClaude] Found tool calls:', toolCalls);

      const toolResults = [];
      for (const call of toolCalls) {
        try {
          const result = await ChefClaudeAPI.executeTool(call);
          toolResults.push({
            tool: call.tool,
            success: result.success,
            data: result.data,
            error: result.error,
          });
          console.log(`[ChefClaude] Tool ${call.tool} executed:`, result);
        } catch (error) {
          console.error(`[ChefClaude] Error executing tool ${call.tool}:`, error);
          toolResults.push({
            tool: call.tool,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // If tools were executed, add results to conversation context
      if (toolResults.length > 0) {
        const toolResultsMessage: Message = {
          id: `msg-${Date.now()}-tool-results`,
          role: 'assistant',
          content: `Tool execution results:\n${JSON.stringify(toolResults, null, 2)}`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, toolResultsMessage]);
      }
    }

    // ... rest of existing code ...
  },
  [messages, /* ... other dependencies ... */]
);

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: OPTIONAL - ADD QUICK TOOL BUTTONS
// ═══════════════════════════════════════════════════════════════════════════

// You could add quick buttons for common tool calls:

const QuickToolButtons = () => {
  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
      <Pressable
        style={styles.toolButton}
        onPress={() => {
          // Get today's macros directly
          ChefClaudeAPI.getTodaysMacros().then((macros) => {
            console.log('Today macros:', macros);
            // Show in message or modal
          });
        }}
      >
        <Text style={styles.toolButtonText}>📊 My Macros</Text>
      </Pressable>

      <Pressable
        style={styles.toolButton}
        onPress={() => {
          ChefClaudeAPI.getMealSuggestions().then((suggestions) => {
            console.log('Suggestions:', suggestions);
          });
        }}
      >
        <Text style={styles.toolButtonText}>💡 Suggestions</Text>
      </Pressable>

      <Pressable
        style={styles.toolButton}
        onPress={() => {
          ChefClaudeAPI.getAppState().then((state) => {
            console.log('Full app state:', state);
          });
        }}
      >
        <Text style={styles.toolButtonText}>📋 Overview</Text>
      </Pressable>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════

// Once integrated, Claude will automatically:

// Example 1: User asks "How many carbs?"
// Claude's response might include:
// "[TOOL: getTodaysMacros()]"
// System parses this, executes getTodaysMacros(), returns data
// Claude's next message uses real data

// Example 2: User says "Log eggs for breakfast"
// Claude's response might include:
// `[TOOL: logMeal({"name":"Eggs","calories":70,"netCarbs":0.5,"protein":6,"fat":5,"mealType":"Breakfast"})]`
// System parses, executes logMeal(), confirms success
// Meal appears in app instantly

// Example 3: User says "Add salmon to shopping list"
// Claude's response might include:
// `[TOOL: addToShoppingList([{"name":"Salmon","quantity":2,"unit":"filets"}])]`
// System executes, shopping list updated
// Claude confirms "✅ Added salmon to shopping list"

// ═══════════════════════════════════════════════════════════════════════════
// TESTING CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════

const TEST_CHECKLIST = `
□ Ask "How many carbs have I had today?"
  → Claude should call getTodaysMacros() and return real numbers

□ Say "Log eggs and bacon for breakfast"
  → Claude should call logMeal() and confirm in app

□ Ask "What's in my pantry?"
  → Claude should call getPantryItems() and list items

□ Say "Add salmon to shopping list"
  → Claude should call addToShoppingList() and confirm

□ Ask "What's my weight loss progress?"
  → Claude should call getWeightProgress() and show progress

□ Say "Update my carb goal to 30g"
  → Claude should call updateUserGoals() and confirm

□ Refresh app and verify data persisted
  → All updated data should remain after restart

□ Test error cases (invalid tool names, bad params)
  → System should gracefully handle errors
`;

console.log(TEST_CHECKLIST);
