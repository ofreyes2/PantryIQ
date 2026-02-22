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
import { router, useLocalSearchParams } from 'expo-router';
import { ChefHat, ArrowLeft, Send, History, Zap, Edit3 } from 'lucide-react-native';
import { usePantryStore } from '@/lib/stores/pantryStore';
import { useMealsStore } from '@/lib/stores/mealsStore';
import { useAppStore } from '@/lib/stores/appStore';
import { useKitchenStore } from '@/lib/stores/kitchenStore';
import { useChefPreferencesStore } from '@/lib/stores/chefPreferencesStore';
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
import { api } from '@/lib/api/api';
import { MealConfirmationCard } from '@/components/MealConfirmationCard';
import { MealConfirmationModal } from '@/components/MealConfirmationModal';
import { QuickLogSheet } from '@/components/QuickLogSheet';
import { RecipeCaptureCard } from '@/components/RecipeCaptureCard';
import { RecipeCreationModal } from '@/components/RecipeCreationModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
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
}

interface ConversationMetadata {
  id: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
}

type MealCardStatus = 'pending' | 'logging' | 'success' | 'failure';

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

Today's date: ${todayStr}
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
When a user describes eating something, you MUST:
1. Respond conversationally as normal
2. At the END of your response, include a hidden JSON block wrapped in these exact tags (the user will never see this):

<MEAL_DATA>
{
  "hasMealData": true or false,
  "mealName": "descriptive name of what was eaten or null",
  "mealType": "breakfast or lunch or dinner or snacks or unknown",
  "mealTypeConfidence": "high or medium or low",
  "foods": [
    {
      "name": "food item name",
      "quantity": "amount or null",
      "unit": "unit of measurement or null",
      "calories": number,
      "netCarbs": number,
      "protein": number,
      "fat": number
    }
  ],
  "totalCalories": number,
  "totalNetCarbs": number,
  "totalProtein": number,
  "totalFat": number,
  "needsMealType": true or false,
  "missingInfo": "what info is needed or null"
}
</MEAL_DATA>

CRITICAL MEAL LOGGING RULES:
- If the user is NOT describing eating something, set hasMealData to false and skip the JSON block
- ALWAYS include the JSON block when the user describes food they ate
- If you cannot determine the meal type (breakfast/lunch/dinner/snacks), set needsMealType to true
- Set mealTypeConfidence to "low" if unsure
- The app will parse this JSON automatically — the user never sees it
- NEVER claim you logged a meal or saved it — you provide the data, the app handles saving
- NEVER say "I cannot log your meal" — the app handles this, not you
- When uncertain, ask clarifying questions FIRST, then provide the JSON block after getting answers
- Always estimate nutrition as accurately as possible from the description

IMPORTANT: When a user asks about logging, NEVER say things like "I have logged your meal" or "I cannot write to the food log". Instead say things like "Here is what I have for your breakfast — tap the button below to save it to your log" or "Let me capture this in the system for you to confirm".

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

function MessageBubble({
  message,
  onMealConfirm,
  isMealLogging,
  cardStatus,
  cardError,
  onRetry,
}: {
  message: Message;
  onMealConfirm?: () => void;
  isMealLogging?: boolean;
  cardStatus?: MealCardStatus;
  cardError?: string;
  onRetry?: () => void;
}) {
  const isUser = message.role === 'user';
  const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
          status={cardStatus ?? 'pending'}
          errorMessage={cardError}
          onRetry={onRetry}
        />
      </View>
    );
  }

  if (isUser) {
    return (
      <View
        testID="message-bubble-user"
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
      </View>
    );
  }

  return (
    <View
      testID="message-bubble-assistant"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
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
          flexShrink: 0,
        }}
      >
        <ChefHat size={18} color={Colors.green} />
      </View>
      <View style={{ flex: 1 }}>
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
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textPrimary,
              lineHeight: 22,
            }}
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
      </View>
    </View>
  );
}

function WelcomeCard({ onSelectPrompt }: { onSelectPrompt: (p: string) => void }) {
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
          <ChefHat size={18} color={Colors.green} />
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
            <ChefHat size={26} color={Colors.green} />
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
  const { conversationId: paramConversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const pantryItems = usePantryStore((s) => s.items);
  const userProfile = useAppStore((s) => s.userProfile);
  const getEntriesForDate = useMealsStore((s) => s.getEntriesForDate);
  const getDailyTotals = useMealsStore((s) => s.getDailyTotals);
  const addMealEntry = useMealsStore((s) => s.addEntry);
  const getEquipmentSummary = useKitchenStore((s) => s.getEquipmentSummary);
  const getPreferencesSummary = useKitchenStore((s) => s.getPreferencesSummary);
  const deductPantryServings = usePantryStore((s) => s.deductServings);

  const conversationIdRef = useRef<string>(paramConversationId || `conv-${Date.now()}`);

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
  const [showMealConfirmationModal, setShowMealConfirmationModal] = useState(false);
  const [showRecipeCapture, setShowRecipeCapture] = useState(false);
  const [recipeToCapture, setRecipeToCapture] = useState<{
    name: string;
    servingTime?: string;
    netCarbs: number;
    description: string;
    foods: string[];
    instructions: string[];
  } | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntries = getEntriesForDate(todayStr);
  const dailyTotals = getDailyTotals(todayStr);

  // Get recent meals and favorites for quick log sheet
  const allEntries = useMealsStore((s) => s.entries);
  const recentMeals = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
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
    if (!userProfile.proactiveMealPrompts) return null;

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const todayStr = now.toISOString().split('T')[0];
    const todayEntries = getEntriesForDate(todayStr);
    const { personalityMode } = userProfile;

    // Check if we've already shown a prompt today for each meal
    const alreadyShown = userProfile.shownMealTimePrompts;

    const getMessageForMode = (
      messages: Record<string, string>,
      mode: string
    ): string => {
      if (mode in messages) {
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
          const shown = userProfile.shownMealTimePrompts;
          if (!shown.includes(prompt.mealType)) {
            setUserProfile({
              shownMealTimePrompts: [...shown, prompt.mealType],
            });
          }
        }
      }
    };

    loadConversation();
  }, [loadConversationFromStorage, getProactiveMealPrompt, userProfile]);

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
          return { displayText, mealData };
        } catch (parseError) {
          console.warn('Failed to parse meal data from Claude response:', parseError);
          return { displayText, mealData: null };
        }
      }

      return { displayText, mealData: null };
    },
    []
  );

  /**
   * Convert Claude's meal data to internal MealAnalysis format
   */
  const convertClaudeMealDataToAnalysis = useCallback(
    (claudeMealData: any): MealAnalysis | null => {
      if (!claudeMealData || !claudeMealData.hasMealData) {
        return null;
      }

      try {
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
        };
      } catch (error) {
        console.warn('Failed to convert Claude meal data:', error);
        return null;
      }
    },
    []
  );


  /**
   * Log a meal to the meals store with verification
   */
  const logMealFromAnalysis = useCallback(
    async (analysis: MealAnalysis): Promise<{ success: boolean; entry: FoodEntry | null; error: string | null }> => {
      try {
        setIsMealLogging(true);

        const todayStr = new Date().toISOString().split('T')[0];
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
          date: todayStr,
          servings: 1,
          calories: Math.round(totalCalories),
          carbs: Math.round(totalCarbs * 10) / 10,
          protein: Math.round(totalProtein * 10) / 10,
          fat: Math.round(totalFat * 10) / 10,
          fiber: totalFiber,
          netCarbs: Math.round(totalNetCarbs * 10) / 10,
          isFavorite: false,
        };

        // Add entry to store
        addMealEntry(entry);

        // Verify the entry was actually saved by reading back from store
        const savedEntries = getEntriesForDate(todayStr);
        const verifiedEntry = savedEntries.find((e) => e.name === entry.name && e.mealType === entry.mealType);

        if (!verifiedEntry) {
          return {
            success: false,
            entry: null,
            error: 'Meal was not saved. Please try again.',
          };
        }

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
    [addMealEntry, findPantryItem, deductPantryServings, getEntriesForDate, messages, inputText]
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
        if (mealData) {
          mealAnalysis = convertClaudeMealDataToAnalysis(mealData);
          if (mealAnalysis) {
            setCurrentMealAnalysis(mealAnalysis);
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

        // Create the assistant message with extracted meal analysis if present
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-reply`,
          role: 'assistant',
          content: displayText,
          timestamp: new Date(),
          mealAnalysis: mealAnalysis && mealAnalysis.isMealDescription ? mealAnalysis : undefined,
        };

        setMessages((prev) => [...prev, assistantMessage]);
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
      todayStr,
    ]
  );

  /**
   * Handle meal confirmation - show modal instead of logging immediately
   */
  const handleMealConfirm = useCallback(() => {
    if (!currentMealAnalysis) return;
    setShowMealConfirmationModal(true);
  }, [currentMealAnalysis]);

  /**
   * Handle logging meal from confirmation modal
   */
  const handleConfirmLogMeal = useCallback(
    async (mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks', date: string) => {
      if (!currentMealAnalysis) return;

      const cardId = `card-${currentMealAnalysis.mealType}-${Date.now()}`;

      try {
        setMealCardStates((prev) => ({ ...prev, [cardId]: 'logging' }));

        // Create a modified analysis with the selected meal type
        const analysisForLogging: MealAnalysis = {
          ...currentMealAnalysis,
          mealType: mealType.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        };

        const result = await logMealFromAnalysis(analysisForLogging);

        if (result.success && result.entry) {
          setMealCardStates((prev) => ({ ...prev, [cardId]: 'success' }));
          setShowMealConfirmationModal(false);

          const dailyTotals = getDailyTotals(date);
          let successMessage = `Logged! Your ${mealType.toLowerCase()} has been added. `;

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
        };

        const result = await logMealFromAnalysis(analysisForLogging);

        if (result.success && result.entry) {
          setMealCardStates((prev) => ({ ...prev, [cardId]: 'success' }));

          const dailyTotals = getDailyTotals(date);
          let successMessage = `Logged! Your ${mealType.toLowerCase()} has been added. `;

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
          isMealLogging={isMealLogging}
          cardStatus={mealCardStates[cardKey]}
          cardError={mealCardErrors[cardKey]}
          onRetry={item.mealAnalysis ? handleMealConfirm : undefined}
        />
      );
    },
    [handleMealConfirm, isMealLogging, mealCardStates, mealCardErrors]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const handleGoToSettings = useCallback(() => {
    setShowApiKeyModal(false);
    router.back();
    router.push('/(tabs)/settings' as never);
  }, []);

  return (
    <ErrorBoundary>
      <LinearGradient colors={['#0A1628', '#0B1C35']} style={{ flex: 1 }}>
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

      <MealConfirmationModal
        visible={showMealConfirmationModal}
        analysis={currentMealAnalysis}
        onClose={() => setShowMealConfirmationModal(false)}
        onConfirm={handleConfirmLogMeal}
        onLogAndAddMore={handleConfirmLogAndAddMore}
        isLoading={isMealLogging}
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
