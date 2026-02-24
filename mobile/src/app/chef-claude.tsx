import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { router, useLocalSearchParams } from 'expo-router';
import { ChefHat, ArrowLeft, Send, History, Zap, Edit3, Volume2 } from 'lucide-react-native';
import { usePantryStore } from '@/lib/stores/pantryStore';
import { useMealsStore } from '@/lib/stores/mealsStore';
import { useAppStore } from '@/lib/stores/appStore';
import { useKitchenStore } from '@/lib/stores/kitchenStore';
import { useChefPreferencesStore } from '@/lib/stores/chefPreferencesStore';
import { useSyncChefConversation } from '@/lib/hooks/useSyncChefConversation';
import { dateUtils } from '@/lib/dateUtils';
import {
  detectExplorationTrigger,
  extractFoodsFromMessage,
  crossReferencePantryItems,
  buildExplorationContext,
  detectPositiveResponse,
  extractRecipeFromResponse,
} from '@/lib/foodExplorationUtil';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';
import { buildPersonalityPrompt, getPersonalityConfig } from '@/lib/personalityModes';
import { getMealTypeEmoji, formatMealType } from '@/lib/mealAnalysis';
import { MealLogger } from '@/lib/mealLogger';
import { api } from '@/lib/api/api';
import { parseMessageSegments, openURL, detectImageReference, extractImageDescription } from '@/lib/messageFormatter';
import { MealConfirmationCard } from '@/components/MealConfirmationCard';
import { MealConfirmationModal } from '@/components/MealConfirmationModal';
import { MealUpdateConfirmationCard } from '@/components/MealUpdateConfirmationCard';
import { QuickLogSheet } from '@/components/QuickLogSheet';
import { RecipeCaptureCard } from '@/components/RecipeCaptureCard';
import { RecipeCreationModal } from '@/components/RecipeCreationModal';
import { DuplicateWarningCard } from '@/components/DuplicateWarningCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ChatImagePlaceholder } from '@/components/ChatImagePlaceholder';
import type { PantryItem } from '@/lib/stores/pantryStore';
import type { FoodEntry, DailyTotals } from '@/lib/stores/mealsStore';
import type { UserProfile } from '@/lib/stores/appStore';
import type { MealAnalysis } from '@/lib/mealAnalysis';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mealAnalysis?: MealAnalysis;
  isFollowUpQuestion?: boolean;
  mealUpdateAction?: {
    type: 'move' | 'edit' | 'delete';
    pending: boolean;
    details: {
      entryName: string;
      fromMealType?: string;
      toMealType?: string;
      changedFields?: string[];
    };
    additionalActions?: any[]; // Additional operations like delete duplicates
  };
}

interface ConversationMetadata {
  id: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
}

type MealCardStatus = 'pending' | 'logging' | 'success' | 'failure' | 'loading';

const QUICK_PROMPTS = [
  "Log my morning coffee",
  "What can I make for dinner tonight?",
  "How are my carbs today",
  "What's expiring soon",
  "Suggest a crispy recipe",
  "Give me a meal plan",
  "Log my water intake",
  "How is my streak",
];

function buildSystemPrompt(
  pantryItems: PantryItem[],
  todayEntries: FoodEntry[],
  dailyTotals: DailyTotals,
  userProfile: UserProfile,
  todayStr: string,
  kitchenEquipmentSummary: string,
  preferencesSummary: string
): string {
  // Safe personality prompt building with null safety
  const personalityInstructions = buildPersonalityPrompt(
    userProfile?.personalityMode ?? 'default',
    userProfile?.customPersonality ?? null
  );

  // Get current date and time context
  const now = new Date();
  const dayOfWeek = dateUtils.dayOfWeek();
  const timeOfDay = dateUtils.timeOfDay();
  const yesterdayStr = dateUtils.yesterday();
  const currentTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const expiringItems = pantryItems.filter((item) => {
    if (!item.expiryDate) return false;
    const expiry = new Date(item.expiryDate);
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    return expiry <= threeDaysFromNow;
  });

  const pantryList = pantryItems
    .map(
      (item) =>
        `- ${item.name}${item.brand ? ` (${item.brand})` : ''}: ${item.quantity} ${item.inventoryUnit ?? item.unit}${item.servingsPerContainer > 1 ? `, ${item.quantity * item.servingsPerContainer} ${item.servingUnit}s total` : ''}`
    )
    .join('\n');

  const mealsToday = todayEntries
    .map(
      (e) =>
        `- ${e.mealType}: ${e.name} (${e.calories} cal, ${e.netCarbs}g net carbs, ${e.protein}g protein)`
    )
    .join('\n');

  return `${personalityInstructions}

CURRENT DATE AND TIME CONTEXT:
- Today: ${dayOfWeek}, ${todayStr}
- Current time: ${currentTime}
- Time of day: ${timeOfDay}

User name: ${userProfile.name || 'there'}

HEALTH GOALS:
- Daily net carb goal: ${userProfile.dailyCarbGoal}g
- Daily calorie goal: ${userProfile.dailyCalorieGoal} calories
- Current weight: ${userProfile.startingWeight ? userProfile.startingWeight + ' lbs' : 'not set'}
- Goal weight: ${userProfile.targetWeight ? userProfile.targetWeight + ' lbs' : 'not set'}

TODAY'S FOOD LOG:
${mealsToday || 'Nothing logged yet today'}

TODAY'S RUNNING TOTALS:
- Calories: ${dailyTotals.calories} / ${userProfile.dailyCalorieGoal}
- Net Carbs: ${dailyTotals.netCarbs}g / ${userProfile.dailyCarbGoal}g
- Protein: ${dailyTotals.protein}g
- Fat: ${dailyTotals.fat}g

PANTRY INVENTORY (${pantryItems.length} items):
${pantryList || 'Pantry is empty'}

${expiringItems.length > 0 ? `EXPIRING WITHIN 3 DAYS:\n${expiringItems.map((i) => `- ${i.name}: expires ${i.expiryDate}`).join('\n')}` : 'No items expiring soon.'}

KITCHEN EQUIPMENT AVAILABLE:
${kitchenEquipmentSummary || 'No equipment configured'}

COOKING PREFERENCES:
${preferencesSummary || 'No preferences set'}

CRISPY FOOD PRIORITY RULE: This user has a strong preference for crispy, crunchy textures. Whenever possible, suggest cooking methods that maximize crispiness. Always mention when a technique will produce a crunchy result. Proactively suggest pork rind coatings, parmesan crusts, double-fry techniques, broiler finishing, and air-fry finishing. When the user asks what to make for dinner, always LEAD with the crispiest, most satisfying option first.

TWO INSTANT POT STRATEGY: This user has both a 3qt and 8qt Instant Pot. When suggesting meals, proactively recommend using both simultaneously when it would reduce cook time or improve the meal. Always specify which size to use for which component.

DEEP FRYER AWARENESS: User has a deep fryer available. For proteins and vegetables where deep frying produces exceptional results, always offer it as an option with low-carb coating suggestions (pork rinds, parmesan, almond flour, coconut flour).

LOW-CARB CRISPY TECHNIQUES (reference these proactively):
- Pork rind breading: crush fine, coat protein, fry/bake — zero carbs, insanely crunchy
- Parmesan crust: grated parmesan pressed onto surface before frying or broiling — hard cheesy crust
- Almond flour breading: great for deep frying, similar to regular breading but low carb
- Coconut flour coating: light and crispy, works well for fish and shrimp
- Direct deep fry (no coating): chicken wings, pork belly, cauliflower — naturally crispy
- Air fryer finishing: pressure cook in Instant Pot first, then air fry 5 min for crispy exterior + juicy interior
- Broiler finishing: last 3 min under broiler transforms any roasted protein to crispy perfection
- Cast iron sear: screaming hot cast iron with avocado oil creates restaurant-quality crust

INSTANT POT TIMING REFERENCE:
- Chicken thighs boneless: 10 min high pressure
- Chicken thighs bone-in: 15 min high pressure
- Chicken breast: 8 min high pressure
- Ground beef: 5 min high pressure
- Beef chuck roast: 60-90 min high pressure
- Pork shoulder: 90 min high pressure
- Ribs: 25 min high pressure
- Eggs hard boiled: 5-5-5 method (5 min HP, 5 min natural release, 5 min ice bath)
- Broccoli: 0 min high pressure, immediate release
- Cauliflower whole: 3 min high pressure
- Bone broth: 120 min high pressure

DOUBLE FRY TECHNIQUE: For maximum crunch — fry once at 325°F to cook through, rest 5 min, fry again at 375°F for the crunch. This is Chef's secret weapon.

EQUIPMENT MATCHING RULE: Never suggest a cooking method that requires equipment the user does not have. Always match suggestions to available equipment. When multiple methods are possible, rank them by which produces the crispiest result first.

When suggesting any recipe, always include:
- Which specific equipment to use and why
- Estimated total cook time
- Crispiness rating: 🥨 (1) to 🥨🥨🥨🥨🥨 (5)
- Difficulty rating: ⭐ (1) to ⭐⭐⭐⭐⭐ (5)

MEAL LOGGING PROTOCOL:
IMPORTANT — DATE AWARENESS FOR MEAL LOGGING:

CRITICAL DATE PARSING RULES:
- "yesterday" = use ${yesterdayStr}
- "today" = use ${todayStr}
- "this morning" = today if before 2pm, yesterday if after 2pm
- "last night" = ${yesterdayStr}
- "Monday" or any day name = find most recent occurrence
- "for breakfast yesterday" = parse as yesterday's breakfast
- "earlier today" = ${todayStr}
- "just now" = ${todayStr}

IMPORTANT:
- ALWAYS confirm the date before logging any meal
- Never assume today if user mentions past time reference
- If unsure which date user means, ASK before logging
- Never confuse today's entries with previous days
- Show confirmation card with target date prominently displayed

YOU MUST ALWAYS DO THIS WHEN USER DESCRIBES FOOD:
1. Write friendly response about the food they ate
2. COPY AND PASTE THIS EXACT JSON BLOCK AT THE END (replace example numbers with real data)

<MEAL_DATA>
{
  "hasMealData": true,
  "action": "log",
  "targetDate": "YYYY-MM-DD",
  "displayDate": "Today | Yesterday | specific day name",
  "mealName": "two eggs with bacon",
  "mealType": "Breakfast",
  "mealTypeConfidence": "high",
  "foods": [
    {"name": "eggs", "quantity": "2", "unit": "count", "calories": 140, "netCarbs": 1, "protein": 12, "fat": 10},
    {"name": "bacon", "quantity": "3", "unit": "strips", "calories": 120, "netCarbs": 0, "protein": 8, "fat": 10}
  ],
  "totalCalories": 260,
  "totalNetCarbs": 1,
  "totalProtein": 20,
  "totalFat": 20,
  "needsDateConfirmation": true,
  "confirmationMessage": "Logging to YESTERDAY — Sunday February 23 — Breakfast",
  "needsMealType": false,
  "missingInfo": null
}
</MEAL_DATA>

CRITICAL:
- ALWAYS include <MEAL_DATA>...</MEAL_DATA> when user eats food
- ALWAYS set hasMealData to true for meals
- NEVER skip the JSON block
- ALWAYS estimate nutrition from the description
- ALWAYS include targetDate in YYYY-MM-DD format
- ALWAYS include needsDateConfirmation field
- If unsure about meal type, ask first, THEN provide JSON
- targetDate must match one of: today (${todayStr}), yesterday (${yesterdayStr}), or specific YYYY-MM-DD

IMPORTANT: When a user asks about logging/modifying entries, say things like:
- For logging: "Here is what I have for your breakfast — tap the button below to save it to your log"
- For moving: "I'll move that to snacks for you — just confirm below"
- For editing: "Let me update that entry with the new nutrition — confirm below"
- For deleting: "I'll remove that from your log — confirm below"

NATURAL LANGUAGE COMMAND HANDLING:

Date-specific logging commands:
- "Log yesterday's breakfast — I had eggs and bacon" → action: "log", targetDate: yesterday
- "Add this to last night's dinner" → action: "log", targetDate: yesterday
- "I forgot to log my lunch on Sunday" → action: "log", targetDate: find most recent Sunday
- "Put this under Monday's dinner" → action: "log", targetDate: find most recent Monday

Moving entries between dates:
- "Move my breakfast from today to yesterday" → action: "move", fromDate: today, toDate: yesterday
- "That omelette should be under yesterday not today" → action: "move", fromDate: today, toDate: yesterday
- "Move this to Monday's log" → action: "move", toDate: find most recent Monday

Moving entries between meal types:
- "Move my string cheese from breakfast to snacks" → action: "move", fromMealType: Breakfast, toMealType: Snacks
- "That should be lunch not dinner" → action: "move", fromMealType: Dinner, toMealType: Lunch

Deleting from specific dates:
- "Delete the duplicate eggs from today's breakfast" → action: "delete", targetDate: today, mealType: Breakfast
- "Remove the second entry from this morning" → action: "delete", targetDate: today, mealType: Breakfast

WHEN HANDLING THESE COMMANDS:
1. Parse the date reference correctly using the date parsing rules
2. Extract the food/entry name being modified
3. If action is ambiguous, ASK the user to clarify
4. ALWAYS provide confirmation card before executing the action
5. Return appropriate MEAL_DATA structure with action type (log, move, delete)

INSTRUCTIONS:
- Always check actual pantry inventory before suggesting recipes
- Flag missing ingredients clearly
- Be specific with carb counts when asked
- Use conversational tone that matches your personality mode
- Keep responses concise (3-5 sentences max unless a detailed recipe is requested)
- When suggesting meals, always mention net carb count per serving
- If the user is over their carb goal, be tactful but honest`;
}

async function callClaude(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return (data as any).content?.[0]?.text ?? 'Sorry, I had trouble responding. Please try again.';
}

function TypingIndicator() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const animate = (sv: SharedValue<number>, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(withTiming(-6, { duration: 300 }), withTiming(0, { duration: 300 })),
          -1,
          false
        )
      );
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  const dot1Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const dot2Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const dot3Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  const dotBase = { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green } as const;

  return (
    <View
      testID="typing-indicator"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 6,
        backgroundColor: Colors.navyCard,
        borderRadius: BorderRadius.xl,
        borderTopLeftRadius: 4,
        alignSelf: 'flex-start',
        marginLeft: 52,
        marginBottom: 8,
        marginHorizontal: 16,
      }}
    >
      <Animated.View style={[dotBase, dot1Style]} />
      <Animated.View style={[dotBase, dot2Style]} />
      <Animated.View style={[dotBase, dot3Style]} />
    </View>
  );
}

interface MessageBubbleProps {
  message: Message;
  onMealConfirm?: () => void;
  onMealUpdate?: (action: any) => Promise<void>;
  onMealUpdateCancel?: () => void;
  isMealLogging?: boolean;
  cardStatus?: MealCardStatus;
  cardError?: string;
  onRetry?: () => void;
}

// Link-aware text component
function LinkAwareText({ text, style }: { text: string; style?: any }) {
  const segments = parseMessageSegments(text);

  return (
    <Text style={style}>
      {segments.map((segment, idx) => {
        if (segment.type === 'link') {
          return (
            <Text
              key={idx}
              style={[style, { color: Colors.green, textDecorationLine: 'underline' }]}
              onPress={() => openURL(segment.url!)}
            >
              {segment.content}
            </Text>
          );
        }
        return (
          <Text key={idx} style={style}>
            {segment.content}
          </Text>
        );
      })}
    </Text>
  );
}

function MessageBubble({
  message,
  onMealConfirm,
  onMealUpdate,
  onMealUpdateCancel,
  isMealLogging,
  cardStatus,
  cardError,
  onRetry,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const userProfile = useAppStore((s) => s.userProfile);
  const personalityIcon = getPersonalityConfig(userProfile?.personalityMode)?.icon ?? '👨‍🍳';

  const handleCopy = useCallback(async () => {
    try {
      Clipboard.setString(message.content);
      // Show feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error copying text:', error);
    }
  }, [message.content]);

  // Show meal update confirmation card if this message has a meal update action pending
  if (message.mealUpdateAction?.pending && onMealUpdate && onMealUpdateCancel) {
    return (
      <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
        <MealUpdateConfirmationCard
          action={message.mealUpdateAction.type}
          entryName={message.mealUpdateAction.details.entryName}
          details={message.mealUpdateAction.details}
          onConfirm={() => onMealUpdate(message.mealUpdateAction)}
          onCancel={onMealUpdateCancel}
          isLoading={isMealLogging}
          status={cardStatus === 'logging' ? 'loading' : cardStatus === 'success' ? 'success' : cardStatus === 'failure' ? 'failure' : 'pending'}
          errorMessage={cardError}
          additionalActions={message.mealUpdateAction.additionalActions}
        />
      </View>
    );
  }

  // Show meal confirmation card if this message has meal analysis
  if (message.mealAnalysis && onMealConfirm) {
    return (
      <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
        <MealConfirmationCard
          analysis={message.mealAnalysis}
          onConfirm={onMealConfirm}
          onEdit={() => {
            // TODO: Open meal editing modal
          }}
          isLoading={isMealLogging}
          status={(cardStatus === 'loading' ? 'logging' : cardStatus) as 'pending' | 'logging' | 'success' | 'failure' | undefined}
          errorMessage={cardError}
          onRetry={onRetry}
        />
      </View>
    );
  }

  if (isUser) {
    return (
      <Pressable
        testID="message-bubble-user"
        onLongPress={handleCopy}
        style={{ alignItems: 'flex-end', marginBottom: 12, paddingHorizontal: 16 }}
      >
        <View
          style={{
            backgroundColor: Colors.green,
            borderRadius: BorderRadius.xl,
            borderBottomRightRadius: 4,
            maxWidth: '78%',
            paddingHorizontal: 14,
            paddingVertical: 10,
            ...Shadows.card,
          }}
        >
          <Text
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#fff', lineHeight: 22 }}
          >
            {message.content}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 11,
            color: Colors.textTertiary,
            marginTop: 4,
          }}
        >
          {time}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID="message-bubble-assistant"
      onLongPress={handleCopy}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: Colors.surface,
          borderWidth: 1.5,
          borderColor: Colors.green,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
          marginTop: 4,
          flexShrink: 0,
        }}
      >
        <Text style={{ fontSize: 16 }}>{personalityIcon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        {detectImageReference(message.content) ? (
          <ChatImagePlaceholder description={extractImageDescription(message.content) || undefined} />
        ) : null}
        <View
          style={{
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.xl,
            borderBottomLeftRadius: 4,
            borderWidth: 1,
            borderColor: Colors.border,
            maxWidth: '90%',
            paddingHorizontal: 14,
            paddingVertical: 10,
            ...Shadows.card,
          }}
        >
          <LinkAwareText
            text={message.content}
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textPrimary,
              lineHeight: 22,
            }}
          />
        </View>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 11,
            color: Colors.textTertiary,
            marginTop: 4,
          }}
        >
          {time}
        </Text>
      </View>
    </Pressable>
  );
}

function WelcomeCard({ onSelectPrompt }: { onSelectPrompt: (p: string) => void }) {
  const userProfile = useAppStore((s) => s.userProfile);
  const personalityIcon = getPersonalityConfig(userProfile?.personalityMode)?.icon ?? '👨‍🍳';

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: Colors.surface,
            borderWidth: 1.5,
            borderColor: Colors.green,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Text style={{ fontSize: 16 }}>{personalityIcon}</Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.xl,
            borderBottomLeftRadius: 4,
            borderWidth: 1,
            borderColor: Colors.border,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 15,
              color: Colors.textPrimary,
              marginBottom: 4,
            }}
          >
            Hi! I'm Chef Claude
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              color: Colors.textSecondary,
              lineHeight: 20,
            }}
          >
            Your personal kitchen AI. I know everything in your pantry and I'm here to help you eat
            well, stay on track with your low carb goals, and make the most of what you have.
            {'\n\n'}
            What can I help you with today?
          </Text>
        </View>
      </View>

      <Text
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 12,
          color: Colors.textTertiary,
          marginBottom: 10,
          marginLeft: 46,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
      >
        Quick questions
      </Text>
      <View style={{ marginLeft: 46 }}>
        {QUICK_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt}
            testID={`quick-prompt-${prompt.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`}
            onPress={() => onSelectPrompt(prompt)}
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.full,
              borderWidth: 1,
              borderColor: Colors.border,
              paddingHorizontal: 14,
              paddingVertical: 9,
              marginBottom: 8,
              alignSelf: 'flex-start',
            }}
          >
            <Text
              style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary }}
            >
              {prompt}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ApiKeyModal({
  visible,
  onClose,
  onGoToSettings,
}: {
  visible: boolean;
  onClose: () => void;
  onGoToSettings: () => void;
}) {
  const userProfile = useAppStore((s) => s.userProfile);
  const personalityIcon = getPersonalityConfig(userProfile?.personalityMode)?.icon ?? '👨‍🍳';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.lg,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: 24,
            width: '100%',
            ...Shadows.elevated,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: Colors.greenMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              alignSelf: 'center',
            }}
          >
            <Text style={{ fontSize: 28 }}>{personalityIcon}</Text>
          </View>
          <Text
            style={{
              fontFamily: 'PlayfairDisplay_700Bold',
              fontSize: 20,
              color: Colors.textPrimary,
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            Claude API Key Required
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              color: Colors.textSecondary,
              textAlign: 'center',
              lineHeight: 20,
              marginBottom: 24,
            }}
          >
            Please add your Claude API key in Settings to use Chef Claude, your personal kitchen AI.
          </Text>
          <Pressable
            testID="modal-go-to-settings"
            onPress={onGoToSettings}
            style={{
              backgroundColor: Colors.green,
              borderRadius: BorderRadius.full,
              paddingVertical: 14,
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <Text
              style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#fff' }}
            >
              Go to Settings
            </Text>
          </Pressable>
          <Pressable
            testID="modal-cancel"
            onPress={onClose}
            style={{
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 14,
                color: Colors.textTertiary,
              }}
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function ChefClaudeScreen() {
  const { conversationId: paramConversationId, mealType: paramMealType } = useLocalSearchParams<{ conversationId?: string; mealType?: string }>();
  const pantryItems = usePantryStore((s) => s.items);
  const userProfile = useAppStore((s) => s.userProfile);
  const getEntriesForDate = useMealsStore((s) => s.getEntriesForDate);
  const getDailyTotals = useMealsStore((s) => s.getDailyTotals);
  const addMealEntry = useMealsStore((s) => s.addEntry);
  const getEquipmentSummary = useKitchenStore((s) => s.getEquipmentSummary);
  const getPreferencesSummary = useKitchenStore((s) => s.getPreferencesSummary);
  const deductPantryServings = usePantryStore((s) => s.deductServings);

  const conversationIdRef = useRef<string>(paramConversationId || `conv-${Date.now()}`);
  const contextMealType = paramMealType as 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks' | undefined;

  const findPantryItem = useCallback(
    (name: string) => {
      const normalized = name.toLowerCase();
      return pantryItems.find(
        (item) =>
          item.name.toLowerCase() === normalized ||
          item.name.toLowerCase().includes(normalized) ||
          normalized.includes(item.name.toLowerCase())
      );
    },
    [pantryItems]
  );

  // Conversation persistence helpers
  const saveConversationToStorage = useCallback(
    async (conversationId: string, messagesToSave: Message[]) => {
      try {
        const key = `pantryiq_chef_chat_${conversationId}`;
        const messagesJson = messagesToSave.map((m) => ({
          ...m,
          timestamp: m.timestamp.toISOString(),
          mealAnalysis: m.mealAnalysis ? JSON.stringify(m.mealAnalysis) : undefined,
        }));
        await AsyncStorage.setItem(key, JSON.stringify(messagesJson));

        // Update conversation index
        const indexKey = 'pantryiq_chef_conversations_index';
        const existingIndex = await AsyncStorage.getItem(indexKey);
        const conversations: ConversationMetadata[] = existingIndex ? JSON.parse(existingIndex) : [];

        // Get conversation title from first user message
        const firstUserMsg = messagesToSave.find((m) => m.role === 'user');
        const title = firstUserMsg?.content?.substring(0, 50) || 'Untitled Conversation';

        const now = new Date().toISOString();
        const existingIdx = conversations.findIndex((c) => c.id === conversationId);

        if (existingIdx >= 0) {
          conversations[existingIdx] = {
            id: conversationId,
            title,
            createdAt: conversations[existingIdx].createdAt,
            lastMessageAt: now,
            messageCount: messagesToSave.length,
          };
        } else {
          conversations.unshift({
            id: conversationId,
            title,
            createdAt: now,
            lastMessageAt: now,
            messageCount: messagesToSave.length,
          });
        }

        // Keep last 50 conversations
        if (conversations.length > 50) {
          conversations.pop();
        }

        await AsyncStorage.setItem(indexKey, JSON.stringify(conversations));
      } catch (error) {
        console.warn('Failed to save conversation:', error);
      }
    },
    []
  );

  const loadConversationFromStorage = useCallback(
    async (conversationId: string): Promise<Message[]> => {
      try {
        const key = `pantryiq_chef_chat_${conversationId}`;
        const data = await AsyncStorage.getItem(key);
        if (!data) return [];

        const parsed = JSON.parse(data);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
          mealAnalysis: m.mealAnalysis ? JSON.parse(m.mealAnalysis) : undefined,
        }));
      } catch (error) {
        console.warn('Failed to load conversation:', error);
        return [];
      }
    },
    []
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [currentMealAnalysis, setCurrentMealAnalysis] = useState<MealAnalysis | null>(null);
  const [isMealLogging, setIsMealLogging] = useState(false);
  const [pendingMealAnswers, setPendingMealAnswers] = useState<string[]>([]);
  const [showQuickLogSheet, setShowQuickLogSheet] = useState(false);
  const [mealCardStates, setMealCardStates] = useState<Record<string, MealCardStatus>>({});
  const [mealCardErrors, setMealCardErrors] = useState<Record<string, string>>({});
  const [mealUpdateCardState, setMealUpdateCardState] = useState<MealCardStatus>('pending');
  const [mealUpdateCardError, setMealUpdateCardError] = useState<string>('');
  const [showMealConfirmationModal, setShowMealConfirmationModal] = useState(false);
  const [showRecipeCapture, setShowRecipeCapture] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recipeToCapture, setRecipeToCapture] = useState<{
    name: string;
    servingTime?: string;
    netCarbs: number;
    description: string;
    foods: string[];
    instructions: string[];
  } | null>(null);
  const [pendingDuplicateCheck, setPendingDuplicateCheck] = useState<MealAnalysis | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateEntry, setDuplicateEntry] = useState<FoodEntry & { id: string } | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  // Sync messages with persistent Zustand store for cross-tab persistence
  useSyncChefConversation(messages, conversationIdRef.current, (loadedMessages) => {
    setMessages(loadedMessages);
  });

  // If opened from Add Food modal with a specific meal type, send a context message
  useEffect(() => {
    if (contextMealType && messages.length === 0) {
      const contextMessage = `I'm looking to add something to my ${contextMealType.toLowerCase()}. What should I log?`;
      const assistantMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Sure! I'll help you log something for your ${contextMealType.toLowerCase()}. What did you eat or drink?`,
        timestamp: new Date(),
      };
      setMessages([assistantMsg]);
    }
  }, [contextMealType]);

  const todayStr = dateUtils.today();
  const todayEntries = getEntriesForDate(todayStr);
  const dailyTotals = getDailyTotals(todayStr);

  // Get recent meals and favorites for quick log sheet
  const allEntries = useMealsStore((s) => s.entries);
  const recentMeals = useMemo(() => {
    const sevenDaysAgo = dateUtils.daysAgo(7);
    return allEntries
      .filter((m) => m.date >= sevenDaysAgo && !m.isFavorite)
      .slice(-5)
      .reverse();
  }, [allEntries]);

  const favoriteMeals = useMemo(() => {
    return allEntries.filter((m) => m.isFavorite).slice(0, 5);
  }, [allEntries]);

  /**
   * Check if we should show a proactive meal prompt
   */
  const getProactiveMealPrompt = useCallback((): { mealType: string; message: string } | null => {
    if (!userProfile?.proactiveMealPrompts) return null;

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const todayStr = dateUtils.today();
    const todayEntries = getEntriesForDate(todayStr);
    const personalityMode: string = userProfile?.personalityMode ?? 'default';

    // Check if we've already shown a prompt today for each meal
    const alreadyShown = userProfile?.shownMealTimePrompts ?? [];

    const getMessageForMode = (
      messages: Record<string, string>,
      mode: string
    ): string => {
      if (mode && mode in messages) {
        return messages[mode];
      }
      return messages.default;
    };

    // Breakfast: 6 AM - 10 AM
    if (hour >= 6 && hour < 10 && !alreadyShown.includes('breakfast')) {
      const hasBreakfast = todayEntries.some((e) => e.mealType === 'Breakfast');
      if (!hasBreakfast) {
        const messages: Record<string, string> = {
          default: "Hey — it's around breakfast time and you haven't logged yet. What did you have?",
          coach: "It's breakfast time. What did you eat? Let's start the day on track.",
          'gordon-ramsay': "Morning! What did you eat? Let's make sure it was brilliant.",
          scientist: "It's breakfast time. What did you consume? Log it for me.",
          zen: "Good morning — did you nourish yourself this morning? Tell me what you had.",
        };
        return {
          mealType: 'breakfast',
          message: getMessageForMode(messages, personalityMode),
        };
      }
    }

    // Lunch: 11:30 AM - 1:30 PM
    if (hour === 11 && minute >= 30) {
      // 11:30 AM onwards
      if (!alreadyShown.includes('lunch')) {
        const hasLunch = todayEntries.some((e) => e.mealType === 'Lunch');
        if (!hasLunch) {
          const messages: Record<string, string> = {
            default: "It's around lunchtime and you haven't logged yet. What did you have for lunch?",
            coach: "Lunch time is here. What did you eat? Keep your carbs in check.",
            'gordon-ramsay': "It's lunchtime. What did you prepare for yourself?",
            scientist: "Lunchtime data collection time. What did you eat?",
            zen: "Mindful eating time — what did you nourish yourself with at lunch?",
          };
          return {
            mealType: 'lunch',
            message: getMessageForMode(messages, personalityMode),
          };
        }
      }
    } else if (hour === 12 || hour === 13) {
      // 12 PM - 1:30 PM
      if (hour === 13 && minute > 30) {
        // Past 1:30 PM
      } else if (!alreadyShown.includes('lunch')) {
        const hasLunch = todayEntries.some((e) => e.mealType === 'Lunch');
        if (!hasLunch) {
          const messages: Record<string, string> = {
            default: "It's around lunchtime and you haven't logged yet. What did you have for lunch?",
            coach: "Lunch time is here. What did you eat? Keep your carbs in check.",
            'gordon-ramsay': "It's lunchtime. What did you prepare for yourself?",
            scientist: "Lunchtime data collection time. What did you eat?",
            zen: "Mindful eating time — what did you nourish yourself with at lunch?",
          };
          return {
            mealType: 'lunch',
            message: getMessageForMode(messages, personalityMode),
          };
        }
      }
    }

    // Snack 1: 3 PM - 4 PM
    if (hour === 15 && !alreadyShown.includes('snack-1')) {
      const hasSnack = todayEntries.some((e) => e.mealType === 'Snacks');
      if (!hasSnack) {
        const messages: Record<string, string> = {
          default: "Snack time — did you have anything? Just let me know what you ate.",
          coach: "Snack time. Watch your portions and tell me what you had.",
          'gordon-ramsay': "A little snack, perhaps? Tell me what you enjoyed.",
          scientist: "Afternoon snack data. What did you consume?",
          zen: "A moment of nourishment — did you have a snack?",
        };
        return {
          mealType: 'snack-1',
          message: getMessageForMode(messages, personalityMode),
        };
      }
    }

    // Dinner: 5:30 PM - 8 PM
    if (hour >= 17 && hour < 20 && !alreadyShown.includes('dinner')) {
      if (hour === 17 && minute < 30) {
        // Before 5:30 PM
      } else {
        const hasDinner = todayEntries.some((e) => e.mealType === 'Dinner');
        if (!hasDinner) {
          const messages: Record<string, string> = {
            default: "It's around dinner time — did you have dinner yet? Tell me what you ate.",
            coach: "Dinner time. What did you eat? Final push to hit your goals today.",
            'gordon-ramsay': "Dinner time. What culinary masterpiece did you create?",
            scientist: "Evening meal time. What did you prepare?",
            zen: "It's dinner time — what beautiful meal did you prepare?",
          };
          return {
            mealType: 'dinner',
            message: getMessageForMode(messages, personalityMode),
          };
        }
      }
    }

    // Snack 2: 8 PM - 9 PM
    if (hour === 20 && !alreadyShown.includes('snack-2')) {
      const hasSnack = todayEntries.some((e) => e.mealType === 'Snacks');
      if (!hasSnack) {
        const messages: Record<string, string> = {
          default: "Evening snack time — did you have anything? Let me know what you ate.",
          coach: "Snack time. Light and smart — what did you have?",
          'gordon-ramsay': "A light evening treat? What did you enjoy?",
          scientist: "Evening snack data. What did you consume?",
          zen: "A gentle evening nourishment — what did you have?",
        };
        return {
          mealType: 'snack-2',
          message: getMessageForMode(messages, personalityMode),
        };
      }
    }

    return null;
  }, [userProfile.proactiveMealPrompts, userProfile.personalityMode, getEntriesForDate, userProfile.shownMealTimePrompts]);

  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, isTyping]);

  // Load existing conversation on mount
  useEffect(() => {
    const loadConversation = async () => {
      const conversationId = conversationIdRef.current;
      const loadedMessages = await loadConversationFromStorage(conversationId);

      if (loadedMessages.length > 0) {
        setMessages(loadedMessages);
      } else {
        // Show proactive prompt only if this is a new conversation
        const prompt = getProactiveMealPrompt();
        if (prompt) {
          const assistantMessage: Message = {
            id: `msg-${Date.now()}-proactive`,
            role: 'assistant',
            content: prompt.message,
            timestamp: new Date(),
          };
          setMessages([assistantMessage]);

          const setUserProfile = useAppStore.getState().setUserProfile;
          const shown = useAppStore.getState().userProfile.shownMealTimePrompts;
          if (!shown.includes(prompt.mealType)) {
            setUserProfile({
              shownMealTimePrompts: [...shown, prompt.mealType],
            });
          }
        }
      }
    };

    loadConversation();
  }, [loadConversationFromStorage, getProactiveMealPrompt]);

  /**
   * Process Claude's raw response and extract meal data if present
   * Returns the display text (with JSON block removed) and any extracted meal data
   */
  const processClaudeResponse = useCallback(
    (rawResponse: string): { displayText: string; mealData: any | null } => {
      // Extract the MEAL_DATA JSON block if present
      const mealDataMatch = rawResponse.match(/<MEAL_DATA>([\s\S]*?)<\/MEAL_DATA>/);

      // Clean display text — remove the JSON block from what user sees
      const displayText = rawResponse.replace(/<MEAL_DATA>[\s\S]*?<\/MEAL_DATA>/g, '').trim();

      if (mealDataMatch) {
        try {
          const mealData = JSON.parse(mealDataMatch[1]);
          console.log('✅ Extracted MEAL_DATA:', mealData);

          // Mark move/edit/delete actions as pending
          if (mealData.action === 'move' && mealData.moveAction) {
            mealData.isPendingMove = true;
          } else if (mealData.action === 'edit' && mealData.editAction) {
            mealData.isPendingEdit = true;
          } else if (mealData.action === 'delete') {
            // For delete actions, either deleteAction or deleteAll indicates a delete operation
            if (mealData.deleteAction || mealData.deleteAll || mealData.entriesToDelete) {
              mealData.isPendingDelete = true;
            }
          }

          // Preserve additionalActions if present
          if (mealData.additionalActions && Array.isArray(mealData.additionalActions)) {
            console.log('✅ Found additionalActions:', mealData.additionalActions);
          }

          return { displayText, mealData };
        } catch (parseError) {
          console.warn('❌ Failed to parse meal data from Claude response:', parseError, 'Raw match:', mealDataMatch[1]);
          return { displayText, mealData: null };
        }
      } else {
        console.log('⚠️ No MEAL_DATA found in Claude response. Raw response:', rawResponse);
      }

      return { displayText, mealData: null };
    },
    []
  );

  /**
   * Clean text for speech synthesis (remove markdown)
   */
  const cleanTextForSpeech = useCallback((text: string): string => {
    return text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/`/g, '')
      .trim();
  }, []);

  /**
   * Speak response using expo-speech (JARVIS voice mode)
   */
  const speakResponse = useCallback(
    (text: string) => {
      if (!isVoiceMode) return;

      const cleanText = cleanTextForSpeech(text);
      if (!cleanText) return;

      Speech.speak(cleanText, {
        language: 'en-GB',
        pitch: 0.85,
        rate: 0.92,
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    },
    [isVoiceMode, cleanTextForSpeech]
  );

  /**
   * Stop current speech
   */
  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  /**
   * Toggle voice mode
   */
  const toggleVoiceMode = useCallback(() => {
    setIsVoiceMode((prev) => !prev);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  /**
   * Fallback: detect meal from conversational response if no JSON was provided
   */
  const detectMealFromConversation = useCallback((text: string, userMessage: string): MealAnalysis | null => {
    // Check if this looks like Claude is confirming/discussing a meal
    const mealKeywords = ['logged', 'saved', 'recorded', 'tracked', 'here\'s what i have', 'you had', 'you ate', 'you just', 'got it'];
    const looksLikeMealLogging = mealKeywords.some(kw => text.toLowerCase().includes(kw));

    if (!looksLikeMealLogging) {
      return null;
    }

    // Try to extract meal type from user message
    const timeOfDayMatch = userMessage.match(/\b(breakfast|lunch|dinner|snacks?|morning|afternoon|evening|supper)\b/i);
    let mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'unknown' = 'unknown';

    if (timeOfDayMatch) {
      const time = timeOfDayMatch[1].toLowerCase();
      if (time.includes('breakfast') || time.includes('morning')) mealType = 'breakfast';
      else if (time.includes('lunch') || time.includes('afternoon')) mealType = 'lunch';
      else if (time.includes('dinner') || time.includes('supper') || time.includes('evening')) mealType = 'dinner';
      else if (time.includes('snack')) mealType = 'snack';
    }

    // Extract any food names mentioned
    const foodMatches = userMessage.match(/\b(eggs?|bacon|toast|coffee|steak|chicken|fish|cheese|bread|rice|beans|salad|pasta)\b/gi) || [];

    if (foodMatches.length === 0) {
      return null;
    }

    // Simple calorie estimation based on foods mentioned
    const estimatedFoods = foodMatches.map(food => ({
      name: food,
      quantity: null,
      unit: null,
      cookingMethod: null,
      inPantry: false,
      estimatedCalories: 200, // placeholder
      estimatedNetCarbs: 5,
      estimatedProtein: 15,
      estimatedFat: 10,
      confidence: 'low' as const,
    }));

    return {
      isMealDescription: true,
      identifiedFoods: estimatedFoods,
      mealType,
      mealTypeConfidence: 'low',
      missingInfo: ['Nutrition data not provided - please edit to add calories, carbs, protein, fat'],
      canLogNow: false,
      followUpQuestions: [],
      totalEstimatedCalories: estimatedFoods.length * 200,
      totalEstimatedNetCarbs: estimatedFoods.length * 5,
      totalEstimatedProtein: estimatedFoods.length * 15,
      totalEstimatedFat: estimatedFoods.length * 10,
      pantryItemsToDeduct: [],
      logConfidenceMessage: 'Low confidence - please review and edit nutrition data',
    };
  }, []);

  /**
   * Convert Claude's meal data to internal MealAnalysis format
   */
  const convertClaudeMealDataToAnalysis = useCallback(
    (claudeMealData: any): MealAnalysis | null => {
      if (!claudeMealData || !claudeMealData.hasMealData) {
        return null;
      }

      try {
        // Use targetDate from Claude data, or default to today
        const targetDate = claudeMealData.targetDate || dateUtils.today();
        const displayDate = claudeMealData.displayDate || dateUtils.displayLabel(targetDate);

        return {
          isMealDescription: claudeMealData.hasMealData ?? false,
          identifiedFoods: (claudeMealData.foods || []).map((food: any) => ({
            name: food.name || '',
            quantity: food.quantity ? food.quantity.toString() : null,
            unit: food.unit || null,
            cookingMethod: null,
            inPantry: false,
            estimatedCalories: food.calories || 0,
            estimatedNetCarbs: food.netCarbs || 0,
            estimatedProtein: food.protein || 0,
            estimatedFat: food.fat || 0,
            confidence: claudeMealData.mealTypeConfidence === 'high' ? 'high' : 'medium',
          })),
          mealType: (claudeMealData.mealType || 'unknown').toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'unknown',
          mealTypeConfidence: claudeMealData.mealTypeConfidence || 'medium',
          missingInfo: claudeMealData.missingInfo ? [claudeMealData.missingInfo] : [],
          canLogNow: !claudeMealData.needsMealType && claudeMealData.mealType !== 'unknown',
          followUpQuestions: [],
          totalEstimatedCalories: claudeMealData.totalCalories || 0,
          totalEstimatedNetCarbs: claudeMealData.totalNetCarbs || 0,
          totalEstimatedProtein: claudeMealData.totalProtein || 0,
          totalEstimatedFat: claudeMealData.totalFat || 0,
          pantryItemsToDeduct: [],
          logConfidenceMessage: '',
          targetDate,
          displayDate,
        };
      } catch (error) {
        console.warn('Failed to convert Claude meal data:', error);
        return null;
      }
    },
    []
  );

  /**
   * Delete duplicate meal entries
   */
  const handleDeleteDuplicates = useCallback(
    async (date: string, mealType: string, deleteCount: number): Promise<{ success: boolean; message: string }> => {
      try {
        const entries = getEntriesForDate(date);
        const deleteEntry = useMealsStore.getState().deleteEntry;

        // Get all entries for this date/meal type
        const relevantEntries = entries.filter(
          (e) => e.mealType === mealType
        );

        if (relevantEntries.length === 0) {
          return {
            success: false,
            message: `No ${mealType} entries found on this date to delete`,
          };
        }

        // Sort by creation time (newest first/by ID) so we delete the most recent duplicates
        const entriesToDelete = relevantEntries
          .sort((a, b) => b.id.localeCompare(a.id))
          .slice(0, Math.min(deleteCount, relevantEntries.length - 1)); // Keep at least 1 entry

        // Delete each entry
        let deletedCount = 0;
        for (const entry of entriesToDelete) {
          try {
            deleteEntry(entry.id);
            deletedCount++;
          } catch (e) {
            console.warn('Failed to delete entry:', entry.id, e);
          }
        }

        return {
          success: deletedCount > 0,
          message: `Deleted ${deletedCount} duplicate ${deletedCount === 1 ? 'entry' : 'entries'}`,
        };
      } catch (error) {
        console.error('Error deleting duplicates:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to delete duplicates',
        };
      }
    },
    [getEntriesForDate]
  );

  /**
   * Handle move/edit/delete operations
   */
  const handleMealUpdate = useCallback(
    async (mealData: any): Promise<{ success: boolean; message: string }> => {
      const today = new Date().toISOString().split('T')[0];
      const entries = getEntriesForDate(today);
      const deleteEntry = useMealsStore.getState().deleteEntry;
      const updateEntry = useMealsStore.getState().updateEntry;
      const allEntries = useMealsStore.getState().entries;

      try {
        if (mealData.action === 'move' && mealData.moveAction) {
          const { searchTerm, fromMealType, toMealType } = mealData.moveAction;

          // Find matching entry
          const entry = entries.find(
            (e) =>
              e.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
              e.mealType === fromMealType
          );

          if (!entry) {
            return {
              success: false,
              message: `Could not find "${searchTerm}" in ${fromMealType}`,
            };
          }

          // Update the entry with new meal type
          const updatedEntry = { ...entry, mealType: toMealType };
          updateEntry(entry.id, updatedEntry);

          return {
            success: true,
            message: `Moved "${entry.name}" from ${fromMealType} to ${toMealType}`,
          };
        }

        if (mealData.action === 'edit' && mealData.editAction) {
          const { searchTerm, mealType, fieldsToUpdate } = mealData.editAction;

          // Find matching entry
          const entry = entries.find(
            (e) =>
              e.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
              e.mealType === mealType
          );

          if (!entry) {
            return {
              success: false,
              message: `Could not find "${searchTerm}" in ${mealType}`,
            };
          }

          // Build updated fields
          const updatedEntry = { ...entry };
          if (fieldsToUpdate.calories !== null && fieldsToUpdate.calories !== undefined) {
            updatedEntry.calories = Math.round(fieldsToUpdate.calories);
          }
          if (fieldsToUpdate.netCarbs !== null && fieldsToUpdate.netCarbs !== undefined) {
            updatedEntry.netCarbs = Math.round(fieldsToUpdate.netCarbs * 10) / 10;
          }
          if (fieldsToUpdate.protein !== null && fieldsToUpdate.protein !== undefined) {
            updatedEntry.protein = Math.round(fieldsToUpdate.protein * 10) / 10;
          }
          if (fieldsToUpdate.fat !== null && fieldsToUpdate.fat !== undefined) {
            updatedEntry.fat = Math.round(fieldsToUpdate.fat * 10) / 10;
          }
          if (fieldsToUpdate.quantity !== null && fieldsToUpdate.quantity !== undefined) {
            // For quantity updates, we might want to keep the name as-is
          }

          updateEntry(entry.id, updatedEntry);

          const changedFields = Object.keys(fieldsToUpdate)
            .filter((k) => fieldsToUpdate[k] !== null && fieldsToUpdate[k] !== undefined)
            .join(', ');

          return {
            success: true,
            message: `Updated "${entry.name}" — ${changedFields} changed`,
          };
        }

        if (mealData.action === 'delete' && (mealData.deleteAction || mealData.searchTerm)) {
          const searchTerm = mealData.deleteAction?.searchTerm || mealData.searchTerm;
          const mealType = mealData.deleteAction?.mealType || mealData.mealType;

          if (!searchTerm || !mealType) {
            return {
              success: false,
              message: 'Delete action missing required fields',
            };
          }

          // Search across ALL entries (not just today) to find the entry to delete
          let entry = allEntries.find(
            (e) =>
              e.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
              e.mealType === mealType
          );

          // If not found in all entries, try a more lenient match with word boundaries
          if (!entry && searchTerm.length > 2) {
            const searchWords = searchTerm.toLowerCase().split(/[,\s]+/).filter((w: string) => w.length > 2);
            entry = allEntries.find((e) => {
              if (e.mealType !== mealType) return false;
              const entryWords = e.name.toLowerCase().split(/[,\s]+/).filter((w: string) => w.length > 2);
              // Match if at least 3 key words match (catches exact duplicates)
              const matchCount = searchWords.filter((w: string) => entryWords.includes(w)).length;
              return matchCount >= Math.min(3, searchWords.length);
            });
          }

          if (!entry) {
            return {
              success: false,
              message: `Could not find "${searchTerm}" in ${mealType}`,
            };
          }

          // Delete the entry
          deleteEntry(entry.id);

          return {
            success: true,
            message: `Removed "${entry.name}" from your log`,
          };
        }

        return {
          success: false,
          message: 'Unknown action',
        };
      } catch (error) {
        console.error('Failed to handle meal update:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
    [getEntriesForDate]
  );
  const logMealFromAnalysis = useCallback(
    async (analysis: MealAnalysis): Promise<{ success: boolean; entry: FoodEntry | null; error: string | null }> => {
      try {
        setIsMealLogging(true);

        // Use targetDate from analysis if available, otherwise default to today
        const targetDate = analysis.targetDate || dateUtils.today();

        const mealTypeMap: Record<string, 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'> = {
          breakfast: 'Breakfast',
          lunch: 'Lunch',
          dinner: 'Dinner',
          snack: 'Snacks',
        };

        // Combine identified foods into a single entry
        let totalCalories = 0;
        let totalCarbs = 0;
        let totalProtein = 0;
        let totalFat = 0;
        let totalFiber = 0;
        let totalNetCarbs = 0;

        analysis.identifiedFoods.forEach((food) => {
          totalCalories += food.estimatedCalories;
          totalNetCarbs += food.estimatedNetCarbs;
          totalProtein += food.estimatedProtein;
          totalFat += food.estimatedFat;
        });

        // Create a descriptive name from foods
        const foodNames = analysis.identifiedFoods
          .map((f) => (f.quantity && f.unit ? `${f.quantity} ${f.unit} ${f.name}` : f.name))
          .join(', ');

        const entry: Omit<FoodEntry, 'id'> = {
          name: foodNames,
          mealType: mealTypeMap[analysis.mealType] || 'Snacks',
          date: targetDate,
          servings: 1,
          calories: Math.round(totalCalories),
          carbs: Math.round(totalCarbs * 10) / 10,
          protein: Math.round(totalProtein * 10) / 10,
          fat: Math.round(totalFat * 10) / 10,
          fiber: totalFiber,
          netCarbs: Math.round(totalNetCarbs * 10) / 10,
          isFavorite: false,
        };

        // Add entry directly to Zustand store (which persists to AsyncStorage via middleware)
        addMealEntry(entry);

        console.log('[ChefClaude] Meal entry added to store:', {
          mealType: entry.mealType,
          name: entry.name,
          date: targetDate,
        });

        // Verify the entry was actually saved to the store
        const savedEntries = getEntriesForDate(targetDate);
        const verifiedEntry = savedEntries.find((e) => e.name === entry.name && e.mealType === entry.mealType);

        if (!verifiedEntry) {
          console.error('[ChefClaude] Failed to verify meal was saved to store');
          return {
            success: false,
            entry: null,
            error: 'Meal failed to save',
          };
        }

        console.log('[ChefClaude] Meal verified in store:', {
          mealType: verifiedEntry.mealType,
          name: verifiedEntry.name,
          entryId: verifiedEntry.id,
        });

        // Deduct from pantry items if they exist
        analysis.pantryItemsToDeduct.forEach((itemName) => {
          const pantryItem = findPantryItem(itemName);
          if (pantryItem) {
            deductPantryServings(pantryItem.id, 1);
          }
        });

        // Persist conversation to AsyncStorage
        if (messages.length > 0 || inputText.trim()) {
          const currentConversationId = conversationIdRef.current;
          await saveConversationToStorage(currentConversationId, messages);
        }

        console.log('[ChefClaude] Meal successfully logged:', {
          mealType: verifiedEntry.mealType,
          name: verifiedEntry.name,
          date: targetDate,
          entryId: verifiedEntry.id,
        });

        return {
          success: true,
          entry: verifiedEntry,
          error: null,
        };
      } catch (error) {
        console.error('Failed to log meal:', error);
        return {
          success: false,
          entry: null,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      } finally {
        setIsMealLogging(false);
      }
    },
    [addMealEntry, getEntriesForDate, findPantryItem, deductPantryServings, messages, inputText, saveConversationToStorage]
  );


  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      const apiKey = userProfile.claudeApiKey;
      if (!apiKey) {
        setShowApiKeyModal(true);
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      setIsTyping(true);

      // Special handling for coffee shortcut
      if (trimmed.toLowerCase().includes('morning coffee') || trimmed.toLowerCase().includes('log my morning coffee')) {
        const coffeeResponse = 'The usual? 18oz coffee with 4oz half and half and 4 Splenda?';
        const assistantMsg: Message = {
          id: `msg-${Date.now()}-coffee`,
          role: 'assistant',
          content: coffeeResponse,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsTyping(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      // Check for coffee confirmation (yes/no response to coffee prompt)
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.content?.includes('The usual? 18oz coffee')) {
        if (trimmed.toLowerCase() === 'yes' || trimmed.toLowerCase() === 'y') {
          // Log coffee as breakfast
          const coffeeEntry = {
            name: 'Morning Coffee',
            servings: 1,
            calories: 160,
            carbs: 10,
            fiber: 0,
            netCarbs: 10,
            protein: 4,
            fat: 10,
            isFavorite: true,
          };
          addMealEntry({
            ...coffeeEntry,
            mealType: 'Breakfast',
            date: todayStr,
          });

          const successMsg: Message = {
            id: `msg-${Date.now()}-success`,
            role: 'assistant',
            content: 'Logged! Your morning coffee has been added to breakfast. That coffee will use 10g of your carb budget.',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, successMsg]);
          setIsTyping(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        } else if (trimmed.toLowerCase() === 'no' || trimmed.toLowerCase() === 'n') {
          const askMsg: Message = {
            id: `msg-${Date.now()}-ask`,
            role: 'assistant',
            content: 'No problem! What did you change? Tell me what\'s in your coffee and I\'ll log it.',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, askMsg]);
          setIsTyping(false);
          return;
        }
      }

      try {
        // Check for food exploration triggers
        const explorationTrigger = detectExplorationTrigger(trimmed);
        const mentionedFoods = extractFoodsFromMessage(trimmed);
        const { available: availableFoods, missing: missingFoods } = crossReferencePantryItems(
          mentionedFoods,
          pantryItems
        );

        const preferencesStore = useChefPreferencesStore.getState();
        const preferencesSummary = preferencesStore.getPreferenceSummary();

        // Build exploration context if applicable
        let explorationContextStr = '';
        if (explorationTrigger.isExploration) {
          explorationContextStr = buildExplorationContext(
            explorationTrigger,
            availableFoods,
            missingFoods,
            preferencesSummary
          );
        }

        // Send all messages to Claude - Claude will handle meal logging detection
        let systemPrompt = buildSystemPrompt(
          pantryItems,
          getEntriesForDate(new Date().toISOString().split('T')[0]),
          getDailyTotals(new Date().toISOString().split('T')[0]),
          userProfile,
          new Date().toISOString().split('T')[0],
          getEquipmentSummary().join(', '),
          getPreferencesSummary()
        );

        // Append exploration context if applicable
        if (explorationContextStr) {
          systemPrompt += explorationContextStr;
        }

        const conversationHistory = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const rawReply = await callClaude(conversationHistory, systemPrompt, apiKey);

        // Process the response to extract meal data
        const { displayText, mealData } = processClaudeResponse(rawReply);

        // Check if meal data was extracted
        let mealAnalysis: MealAnalysis | null = null;
        let mealUpdateAction: Message['mealUpdateAction'] = undefined;

        if (mealData) {
          // Check for move/edit/delete actions
          if (mealData.isPendingMove || mealData.isPendingEdit || mealData.isPendingDelete) {
            const actionType = mealData.isPendingMove ? 'move' : mealData.isPendingEdit ? 'edit' : 'delete';
            let entryName = '';

            if (mealData.moveAction) {
              entryName = mealData.moveAction.searchTerm;
            } else if (mealData.editAction) {
              entryName = mealData.editAction.searchTerm;
            } else if (mealData.deleteAction) {
              entryName = mealData.deleteAction.searchTerm;
            } else if (mealData.deleteAll) {
              // For deleteAll, show that we're deleting all entries
              entryName = `All ${mealData.mealType} entries`;
            } else if (mealData.entriesToDelete && mealData.entriesToDelete.length > 0) {
              // For specific entries to delete - entriesToDelete is an array of strings
              const entryList = mealData.entriesToDelete
                .filter((e: any) => e && (typeof e === 'string' ? e.trim() : (e.name || '')))
                .slice(0, 3)
                .map((e: any) => typeof e === 'string' ? e : e.name)
                .join(', ');
              const moreCount = mealData.entriesToDelete.length > 3 ? ` +${mealData.entriesToDelete.length - 3} more` : '';
              entryName = entryList ? `${entryList}${moreCount}` : `${mealData.entriesToDelete.length} entries`;
            }

            mealUpdateAction = {
              type: actionType as 'move' | 'edit' | 'delete',
              pending: true,
              details: {
                entryName,
                fromMealType: mealData.moveAction?.fromMealType || mealData.deleteAction?.mealType || mealData.mealType,
                toMealType: mealData.moveAction?.toMealType,
                changedFields: mealData.editAction ? Object.keys(mealData.editAction.fieldsToUpdate || {}) : undefined,
              },
              additionalActions: mealData.additionalActions, // Include additional actions (like delete duplicates)
            };
          } else {
            // Regular meal logging
            mealAnalysis = convertClaudeMealDataToAnalysis(mealData);
            if (mealAnalysis) {
              console.log('✅ Meal analysis created:', mealAnalysis);
              setCurrentMealAnalysis(mealAnalysis);
            } else {
              console.warn('⚠️ Meal analysis conversion failed for mealData:', mealData);
            }
          }
        }

        // Fallback: if no meal data extracted and Claude appears to be talking about a meal, try to detect from conversation
        if (!mealData && !mealUpdateAction) {
          const fallbackAnalysis = detectMealFromConversation(displayText, trimmed);
          if (fallbackAnalysis) {
            console.log('✅ Fallback meal detection triggered:', fallbackAnalysis);
            mealAnalysis = fallbackAnalysis;
            setCurrentMealAnalysis(fallbackAnalysis);
          }
        }

        // Check for recipe in response and positive user response
        const hasPositiveResponse = detectPositiveResponse(trimmed);
        const lastAssistantMsg = messages.filter((m) => m.role === 'assistant').pop();
        const recipeData = extractRecipeFromResponse(lastAssistantMsg?.content || '');

        // Show recipe capture card if:
        // 1. User gave positive response to a suggestion
        // 2. Claude's previous message contained recipe instructions
        // 3. Current message is exploration related
        if (hasPositiveResponse && recipeData.hasRecipe && explorationTrigger.isExploration) {
          const mealName = explorationTrigger.detectedFoods?.[0] || 'New Recipe';
          setRecipeToCapture({
            name: mealName,
            servingTime: recipeData.servingTime,
            netCarbs: 0,
            description: displayText.substring(0, 100),
            foods: mentionedFoods,
            instructions: recipeData.instructions || [],
          });
          setShowRecipeCapture(true);
        }

        // Create the assistant message with extracted meal analysis or update action
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-reply`,
          role: 'assistant',
          content: displayText,
          timestamp: new Date(),
          mealAnalysis: mealAnalysis && mealAnalysis.isMealDescription ? mealAnalysis : undefined,
          mealUpdateAction: mealUpdateAction,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Auto-speak if in voice mode
        if (isVoiceMode && displayText) {
          setTimeout(() => speakResponse(displayText), 300);
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (err: unknown) {
        const errorMessage: Message = {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content: `Sorry, I had trouble connecting. Please check your API key in Settings and try again.\n\nError: ${err instanceof Error ? err.message : 'Unknown error'}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    },
    [
      messages,
      isTyping,
      userProfile,
      pantryItems,
      getEntriesForDate,
      getDailyTotals,
      getEquipmentSummary,
      getPreferencesSummary,
      processClaudeResponse,
      convertClaudeMealDataToAnalysis,
      detectMealFromConversation,
      todayStr,
      isVoiceMode,
      speakResponse,
    ]
  );

  /**
   * Handle meal confirmation - show modal instead of logging immediately
   */
  const handleMealConfirm = useCallback(async () => {
    if (!currentMealAnalysis) return;

    // Check for duplicate
    const foodName = currentMealAnalysis.identifiedFoods[0]?.name || 'Unknown food';
    const mealTypeFormatted = formatMealType(currentMealAnalysis.mealType);
    const mealType = mealTypeFormatted as 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';

    const duplicate = await MealLogger.checkForDuplicate(
      foodName,
      dateUtils.today(),
      mealType
    );

    if (duplicate) {
      setDuplicateEntry(duplicate);
      setPendingDuplicateCheck(currentMealAnalysis);
      setShowDuplicateWarning(true);
    } else {
      // No duplicate, proceed to confirmation
      setShowMealConfirmationModal(true);
    }
  }, [currentMealAnalysis]);

  /**
   * Handle duplicate warning response
   */
  const handleDuplicateResponse = useCallback(
    (action: 'log' | 'update' | 'cancel') => {
      if (action === 'cancel') {
        setShowDuplicateWarning(false);
        setPendingDuplicateCheck(null);
        setDuplicateEntry(null);
      } else if (action === 'log') {
        // User wants to log again despite duplicate
        setShowDuplicateWarning(false);
        setShowMealConfirmationModal(true);
      } else if (action === 'update') {
        // User wants to update existing entry instead
        // TODO: Navigate to edit existing entry
        setShowDuplicateWarning(false);
        setPendingDuplicateCheck(null);
        setDuplicateEntry(null);
      }
    },
    []
  );

  /**
   * Handle meal update (move/edit/delete) confirmation
   */
  const handleMealUpdateConfirm = useCallback(
    async (mealUpdateAction: Message['mealUpdateAction']) => {
      if (!mealUpdateAction) return;

      setMealUpdateCardState('loading');
      setMealUpdateCardError('');

      try {
        // Special handling for bulk delete operations (deleteAll or entriesToDelete)
        if (mealUpdateAction.type === 'delete' && mealUpdateAction.details.entryName.toLowerCase().includes('all')) {
          // This is a deleteAll operation
          const mealType = mealUpdateAction.details.fromMealType;

          if (!mealType) {
            setMealUpdateCardState('failure');
            setMealUpdateCardError('Meal type not specified');
            return;
          }

          const deleteEntry = useMealsStore.getState().deleteEntry;
          const entries = useMealsStore.getState().entries;

          // Get all entries of this meal type
          const relevantEntries = entries.filter((e) => e.mealType === mealType);

          if (relevantEntries.length === 0) {
            setMealUpdateCardState('failure');
            setMealUpdateCardError(`No ${mealType} entries found to delete`);
            return;
          }

          let deletedCount = 0;
          for (const entry of relevantEntries) {
            try {
              deleteEntry(entry.id);
              deletedCount++;
            } catch (e) {
              console.warn('Failed to delete entry:', entry.id, e);
            }
          }

          setMealUpdateCardState('success');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          const successMsg: Message = {
            id: `msg-${Date.now()}-success`,
            role: 'assistant',
            content: `Successfully removed ${deletedCount} ${mealType.toLowerCase()} ${deletedCount === 1 ? 'entry' : 'entries'} from your log.`,
            timestamp: new Date(),
          };

          setTimeout(() => {
            setMessages((prev) => [...prev, successMsg]);
            setMealUpdateCardState('pending');
          }, 500);
          return;
        }

        // Handle bulk delete with specific entries (entriesToDelete from Claude)
        if (mealUpdateAction.type === 'delete' && mealUpdateAction.details.entryName.match(/^\d+\s+entries?$/)) {
          // Pattern: "2 entries", "3 entries", etc. - this comes from entriesToDelete array
          const mealType = mealUpdateAction.details.fromMealType;

          if (!mealType) {
            setMealUpdateCardState('failure');
            setMealUpdateCardError('Meal type not specified');
            return;
          }

          const deleteEntry = useMealsStore.getState().deleteEntry;
          const entries = useMealsStore.getState().entries;

          // Get all entries of this meal type for today
          const today = new Date().toISOString().split('T')[0];
          const relevantEntries = entries.filter(
            (e) => e.mealType === mealType && e.date === today
          );

          if (relevantEntries.length === 0) {
            setMealUpdateCardState('failure');
            setMealUpdateCardError(`No ${mealType} entries found to delete`);
            return;
          }

          let deletedCount = 0;
          for (const entry of relevantEntries) {
            try {
              deleteEntry(entry.id);
              deletedCount++;
            } catch (e) {
              console.warn('Failed to delete entry:', entry.id, e);
            }
          }

          setMealUpdateCardState('success');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          const successMsg: Message = {
            id: `msg-${Date.now()}-success`,
            role: 'assistant',
            content: `Successfully removed ${deletedCount} ${mealType.toLowerCase()} ${deletedCount === 1 ? 'entry' : 'entries'} from your log.`,
            timestamp: new Date(),
          };

          setTimeout(() => {
            setMessages((prev) => [...prev, successMsg]);
            setMealUpdateCardState('pending');
          }, 500);
          return;
        }

        // Regular single-entry update (move/edit/delete specific entry)
        const mealData = {
          action: mealUpdateAction.type,
          moveAction: mealUpdateAction.type === 'move' ? {
            searchTerm: mealUpdateAction.details.entryName,
            fromMealType: mealUpdateAction.details.fromMealType,
            toMealType: mealUpdateAction.details.toMealType,
          } : undefined,
          editAction: mealUpdateAction.type === 'edit' ? {
            searchTerm: mealUpdateAction.details.entryName,
            mealType: mealUpdateAction.details.fromMealType,
            fieldsToUpdate: {},
          } : undefined,
          deleteAction: mealUpdateAction.type === 'delete' ? {
            searchTerm: mealUpdateAction.details.entryName,
            mealType: mealUpdateAction.details.fromMealType,
          } : undefined,
        };

        const result = await handleMealUpdate(mealData);

        if (result.success) {
          // Process additional actions (like delete duplicates)
          let additionalActionsMessages = '';
          if (mealUpdateAction.additionalActions && mealUpdateAction.additionalActions.length > 0) {
            for (const additionalAction of mealUpdateAction.additionalActions) {
              if (additionalAction.action === 'delete') {
                const deleteResult = await handleDeleteDuplicates(
                  additionalAction.targetDate || new Date().toISOString().split('T')[0],
                  additionalAction.mealType || mealUpdateAction.details.fromMealType || 'unknown',
                  additionalAction.deleteCount || 1
                );
                if (deleteResult.success) {
                  additionalActionsMessages += ` ${deleteResult.message}`;
                  console.log('Deleted duplicates:', deleteResult.message);
                }
              }
            }
          }

          setMealUpdateCardState('success');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Add success message with both main action and additional actions
          const successMsg: Message = {
            id: `msg-${Date.now()}-success`,
            role: 'assistant',
            content: result.message + additionalActionsMessages,
            timestamp: new Date(),
          };

          setTimeout(() => {
            setMessages((prev) => [...prev, successMsg]);
            setMealUpdateCardState('pending');
          }, 500);
        } else {
          setMealUpdateCardState('failure');
          setMealUpdateCardError(result.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } catch (error) {
        setMealUpdateCardState('failure');
        setMealUpdateCardError(error instanceof Error ? error.message : 'Unknown error');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [handleMealUpdate, handleDeleteDuplicates]
  );

  /**
   * Cancel meal update
   */
  const handleMealUpdateCancel = useCallback(() => {
    setMealUpdateCardState('pending');
    setMealUpdateCardError('');
  }, []);

  /**
   * Handle logging meal from confirmation modal
   */
  const handleConfirmLogMeal = useCallback(
    async (mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks', date: string) => {
      if (!currentMealAnalysis) return;

      const cardId = `card-${currentMealAnalysis.mealType}-${Date.now()}`;

      try {
        setMealCardStates((prev) => ({ ...prev, [cardId]: 'logging' }));

        // Create a modified analysis with the selected meal type, preserving targetDate
        const analysisForLogging: MealAnalysis = {
          ...currentMealAnalysis,
          mealType: mealType.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          targetDate: currentMealAnalysis.targetDate || dateUtils.today(),
        };

        const result = await logMealFromAnalysis(analysisForLogging);

        if (result.success && result.entry) {
          setMealCardStates((prev) => ({ ...prev, [cardId]: 'success' }));
          setShowMealConfirmationModal(false);

          // Use the actual targetDate from the analysis for the success message
          const loggedDate = currentMealAnalysis.targetDate || dateUtils.today();
          const dailyTotals = getDailyTotals(loggedDate);

          // Format the date for display
          const dateStr = new Date(loggedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          });

          let successMessage = `Logged! Your ${mealType.toLowerCase()} — ${dateStr} has been added. `;

          const carbsUsed = Math.round(dailyTotals.netCarbs);
          const carbGoal = userProfile.dailyCarbGoal;
          const carbsRemaining = carbGoal - carbsUsed;

          if (carbsRemaining >= 0) {
            successMessage += `You have used ${carbsUsed} of your ${carbGoal}g carb budget — you are doing great.`;
          } else {
            successMessage += `You are now at ${carbsUsed}g of your ${carbGoal}g goal. No worries — tomorrow begins fresh.`;
          }

          if (currentMealAnalysis.pantryItemsToDeduct.length > 0) {
            const items = currentMealAnalysis.pantryItemsToDeduct.join(', ').toLowerCase();
            successMessage += ` I also updated your pantry — reduced your ${items}.`;
          }

          const successMsg: Message = {
            id: `msg-${Date.now()}-success`,
            role: 'assistant',
            content: successMessage,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, successMsg]);
          setCurrentMealAnalysis(null);
          setPendingMealAnswers([]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          setMealCardStates((prev) => ({ ...prev, [cardId]: 'failure' }));
          setMealCardErrors((prev) => ({ ...prev, [cardId]: result.error || 'Unknown error' }));

          const errorMsg: Message = {
            id: `msg-${Date.now()}-err`,
            role: 'assistant',
            content: `Sorry, I had trouble logging that meal: ${result.error}. Please try again.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } catch (error) {
        const cardId = `card-${currentMealAnalysis.mealType}-${Date.now()}`;
        setMealCardStates((prev) => ({ ...prev, [cardId]: 'failure' }));
        setMealCardErrors((prev) => ({
          ...prev,
          [cardId]: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    },
    [currentMealAnalysis, logMealFromAnalysis, getDailyTotals, userProfile.dailyCarbGoal]
  );

  /**
   * Handle logging meal and keeping modal open for next meal
   */
  const handleConfirmLogAndAddMore = useCallback(
    async (mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks', date: string) => {
      if (!currentMealAnalysis) return;

      const cardId = `card-${currentMealAnalysis.mealType}-${Date.now()}`;

      try {
        setMealCardStates((prev) => ({ ...prev, [cardId]: 'logging' }));

        const analysisForLogging: MealAnalysis = {
          ...currentMealAnalysis,
          mealType: mealType.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          targetDate: currentMealAnalysis.targetDate || dateUtils.today(),
        };

        const result = await logMealFromAnalysis(analysisForLogging);

        if (result.success && result.entry) {
          setMealCardStates((prev) => ({ ...prev, [cardId]: 'success' }));

          // Use the actual targetDate from the analysis
          const loggedDate = currentMealAnalysis.targetDate || dateUtils.today();
          const dailyTotals = getDailyTotals(loggedDate);

          // Format the date for display
          const dateStr = new Date(loggedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          });

          let successMessage = `Logged! Your ${mealType.toLowerCase()} — ${dateStr} has been added. `;

          const carbsUsed = Math.round(dailyTotals.netCarbs);
          const carbGoal = userProfile.dailyCarbGoal;
          const carbsRemaining = carbGoal - carbsUsed;

          if (carbsRemaining >= 0) {
            successMessage += `You have used ${carbsUsed} of your ${carbGoal}g carb budget. Ready for the next meal?`;
          } else {
            successMessage += `You are at ${carbsUsed}g of your ${carbGoal}g goal. Ready for the next meal?`;
          }

          const successMsg: Message = {
            id: `msg-${Date.now()}-success`,
            role: 'assistant',
            content: successMessage,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, successMsg]);
          setCurrentMealAnalysis(null);
          setPendingMealAnswers([]);

          // Keep modal open and focus on input
          setTimeout(() => {
            // Set focus to input - this will be handled by user interaction
            // Show a hint message
          }, 100);

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          setMealCardStates((prev) => ({ ...prev, [cardId]: 'failure' }));
          setMealCardErrors((prev) => ({ ...prev, [cardId]: result.error || 'Unknown error' }));

          const errorMsg: Message = {
            id: `msg-${Date.now()}-err`,
            role: 'assistant',
            content: `Sorry, I had trouble logging that meal: ${result.error}. Please try again.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } catch (error) {
        const cardId = `card-${currentMealAnalysis.mealType}-${Date.now()}`;
        setMealCardStates((prev) => ({ ...prev, [cardId]: 'failure' }));
        setMealCardErrors((prev) => ({
          ...prev,
          [cardId]: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    },
    [currentMealAnalysis, logMealFromAnalysis, getDailyTotals, userProfile.dailyCarbGoal]
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const cardKey = `card-${item.mealAnalysis?.mealType}-${item.id}`;
      return (
        <MessageBubble
          message={item}
          onMealConfirm={item.mealAnalysis ? handleMealConfirm : undefined}
          onMealUpdate={item.mealUpdateAction ? handleMealUpdateConfirm : undefined}
          onMealUpdateCancel={item.mealUpdateAction ? handleMealUpdateCancel : undefined}
          isMealLogging={isMealLogging}
          cardStatus={item.mealUpdateAction ? mealUpdateCardState : mealCardStates[cardKey]}
          cardError={item.mealUpdateAction ? mealUpdateCardError : mealCardErrors[cardKey]}
          onRetry={item.mealAnalysis ? handleMealConfirm : undefined}
        />
      );
    },
    [handleMealConfirm, handleMealUpdateConfirm, handleMealUpdateCancel, isMealLogging, mealCardStates, mealCardErrors, mealUpdateCardState, mealUpdateCardError]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const handleGoToSettings = useCallback(() => {
    setShowApiKeyModal(false);
    router.back();
    router.push('/(tabs)/settings' as never);
  }, []);

  return (
    <ErrorBoundary>
      <LinearGradient
        colors={isVoiceMode ? ['#0a0f1f', '#0d1b3a', '#0a0f1f'] : ['#0A1628', '#0B1C35']}
        style={{ flex: 1 }}
      >
        <SafeAreaView testID="chef-claude-screen" style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          <Pressable
            testID="back-button"
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: 'rgba(46,204,113,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 16 }}>
                  {getPersonalityConfig(userProfile?.personalityMode)?.icon ?? '👨‍🍳'}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: 'PlayfairDisplay_700Bold',
                  fontSize: 18,
                  color: Colors.textPrimary,
                }}
              >
                Chef Claude
              </Text>
            </View>
            {isVoiceMode ? (
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 10,
                  color: '#1E90FF',
                  marginTop: 1,
                  letterSpacing: 1,
                }}
              >
                JARVIS — ONLINE
              </Text>
            ) : (
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 11,
                  color: Colors.green,
                  marginTop: 1,
                }}
              >
                {userProfile?.personalityMode === 'custom' && userProfile?.customPersonality?.description
                  ? 'Custom Mode'
                  : getPersonalityConfig(userProfile?.personalityMode)?.name ?? 'Your personal kitchen AI'}
              </Text>
            )}
          </View>

          <Pressable
            testID="new-conversation-button"
            onPress={() => {
              conversationIdRef.current = `conv-${Date.now()}`;
              setMessages([]);
              setInputText('');
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Edit3 size={18} color={Colors.textSecondary} />
          </Pressable>

          <Pressable
            testID="history-button"
            onPress={() => {
              router.push('/chef-claude-history' as never);
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <History size={18} color={Colors.textSecondary} />
          </Pressable>

          <Pressable
            testID="jarvis-voice-button"
            onPress={toggleVoiceMode}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isVoiceMode ? 'rgba(30,144,255,0.2)' : Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: isVoiceMode ? 2 : 1,
              borderColor: isVoiceMode ? '#1E90FF' : Colors.border,
            }}
          >
            <Volume2 size={18} color={isVoiceMode ? '#1E90FF' : Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Context strip */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: Colors.navyCard,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
            gap: 16,
          }}
        >
          <Text
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textTertiary }}
          >
            <Text style={{ color: Colors.green, fontFamily: 'DMSans_700Bold' }}>
              {pantryItems.length}
            </Text>
            {' pantry items'}
          </Text>
          <Text
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textTertiary }}
          >
            <Text style={{ color: Colors.amber, fontFamily: 'DMSans_700Bold' }}>
              {Math.round(dailyTotals.netCarbs)}g
            </Text>
            {' carbs today'}
          </Text>
          <Text
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textTertiary }}
          >
            <Text style={{ color: Colors.textSecondary, fontFamily: 'DMSans_700Bold' }}>
              {Math.round(dailyTotals.calories)}
            </Text>
            {' cal'}
          </Text>
        </View>

        {/* Messages + Input */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            testID="messages-list"
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 8, flexGrow: 1 }}
            ListEmptyComponent={<WelcomeCard onSelectPrompt={(p) => sendMessage(p)} />}
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
            showsVerticalScrollIndicator={false}
          />

          {/* Input area */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 10,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: Colors.border,
              backgroundColor: Colors.navy,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: Colors.surface,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: Colors.border,
                paddingHorizontal: 16,
                paddingVertical: 10,
                maxHeight: 120,
              }}
            >
              <TextInput
                testID="chat-input"
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask Chef Claude anything..."
                placeholderTextColor={Colors.textTertiary}
                multiline
                returnKeyType="send"
                onSubmitEditing={() => sendMessage(inputText)}
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 15,
                  color: Colors.textPrimary,
                  maxHeight: 100,
                }}
              />
            </View>
            <Pressable
              testID="quick-log-button"
              onPress={() => setShowQuickLogSheet(true)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: Colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                ...Shadows.card,
              }}
            >
              <Zap size={18} color={Colors.green} />
            </Pressable>
            <Pressable
              testID="send-button"
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isTyping}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor:
                  inputText.trim() && !isTyping ? Colors.green : Colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                ...Shadows.card,
              }}
            >
              {isTyping ? (
                <ActivityIndicator size="small" color={Colors.textSecondary} />
              ) : (
                <Send size={18} color={inputText.trim() ? '#fff' : Colors.textTertiary} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ApiKeyModal
        visible={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onGoToSettings={handleGoToSettings}
      />

      <QuickLogSheet
        visible={showQuickLogSheet}
        onClose={() => setShowQuickLogSheet(false)}
        onSendMessage={sendMessage}
        recentMeals={recentMeals}
        favoriteMeals={favoriteMeals}
        isLoading={isTyping}
      />

      {/* Duplicate Warning Card */}
      {showDuplicateWarning && pendingDuplicateCheck ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: 16,
            paddingBottom: 32,
          }}
        >
          <DuplicateWarningCard
            foodName={pendingDuplicateCheck.identifiedFoods[0]?.name || 'Unknown food'}
            mealType={formatMealType(pendingDuplicateCheck.mealType)}
            existingEntry={duplicateEntry ?? undefined}
            onLogAgain={() => handleDuplicateResponse('log')}
            onUpdateExisting={() => handleDuplicateResponse('update')}
            onCancel={() => handleDuplicateResponse('cancel')}
            isLoading={isMealLogging}
          />
        </View>
      ) : null}

      <MealConfirmationModal
        visible={showMealConfirmationModal}
        analysis={currentMealAnalysis}
        onClose={() => setShowMealConfirmationModal(false)}
        onConfirm={handleConfirmLogMeal}
        onLogAndAddMore={handleConfirmLogAndAddMore}
        isLoading={isMealLogging}
        targetDate={currentMealAnalysis?.targetDate}
      />

      {recipeToCapture ? (
        <RecipeCaptureCard
          recipeName={recipeToCapture.name}
          servingTime={recipeToCapture.servingTime}
          netCarbs={recipeToCapture.netCarbs}
          description={recipeToCapture.description}
          onSaveRecipe={() => {
            setShowRecipeCapture(true);
          }}
          onSaveTip={() => {
            setShowRecipeCapture(true);
          }}
          onNotNow={() => {
            setRecipeToCapture(null);
            setShowRecipeCapture(false);
          }}
        />
      ) : null}

      <RecipeCreationModal
        visible={showRecipeCapture}
        onClose={() => {
          setShowRecipeCapture(false);
          setRecipeToCapture(null);
        }}
        initialData={
          recipeToCapture
            ? {
                recipeName: recipeToCapture.name,
                description: recipeToCapture.description,
                ingredients: recipeToCapture.foods,
                instructions: recipeToCapture.instructions,
                servingTime: recipeToCapture.servingTime,
                netCarbs: recipeToCapture.netCarbs,
              }
            : undefined
        }
        saveAsType="recipe"
      />
    </LinearGradient>
    </ErrorBoundary>
  );
}
