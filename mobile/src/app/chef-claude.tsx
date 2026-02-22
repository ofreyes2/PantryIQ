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
import { router } from 'expo-router';
import { ChefHat, ArrowLeft, Send, History, Zap } from 'lucide-react-native';
import { usePantryStore } from '@/lib/stores/pantryStore';
import { useMealsStore } from '@/lib/stores/mealsStore';
import { useAppStore } from '@/lib/stores/appStore';
import { useKitchenStore } from '@/lib/stores/kitchenStore';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';
import { buildPersonalityPrompt } from '@/lib/personalityModes';
import { isMealDescription, getMealTypeEmoji, formatMealType } from '@/lib/mealAnalysis';
import { api } from '@/lib/api/api';
import { MealConfirmationCard } from '@/components/MealConfirmationCard';
import { QuickLogSheet } from '@/components/QuickLogSheet';
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

const QUICK_PROMPTS = [
  "What can I make for dinner tonight?",
  "Am I on track with my carbs today?",
  "What's expiring soon that I should use?",
  "Give me a low carb meal plan for tomorrow",
  "What's the crispiest thing I can make tonight?",
  "What should I eat to hit my protein goal?",
  "Suggest a recipe using my chicken",
  "Show me a double-fry recipe for tonight",
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
  const personalityInstructions = buildPersonalityPrompt(
    userProfile.personalityMode,
    userProfile.customPersonality
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
}: {
  message: Message;
  onMealConfirm?: () => void;
  isMealLogging?: boolean;
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
  const pantryItems = usePantryStore((s) => s.items);
  const userProfile = useAppStore((s) => s.userProfile);
  const getEntriesForDate = useMealsStore((s) => s.getEntriesForDate);
  const getDailyTotals = useMealsStore((s) => s.getDailyTotals);
  const addMealEntry = useMealsStore((s) => s.addEntry);
  const getEquipmentSummary = useKitchenStore((s) => s.getEquipmentSummary);
  const getPreferencesSummary = useKitchenStore((s) => s.getPreferencesSummary);
  const deductPantryServings = usePantryStore((s) => s.deductServings);
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

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [currentMealAnalysis, setCurrentMealAnalysis] = useState<MealAnalysis | null>(null);
  const [isMealAnalyzing, setIsMealAnalyzing] = useState(false);
  const [isMealLogging, setIsMealLogging] = useState(false);
  const [pendingMealAnswers, setPendingMealAnswers] = useState<string[]>([]);
  const [showQuickLogSheet, setShowQuickLogSheet] = useState(false);
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

  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, isTyping]);

  /**
   * Check for proactive meal prompts when screen loads
   */
  useEffect(() => {
    const prompt = getProactiveMealPrompt();
    if (prompt && messages.length === 0) {
      // Only show if this is the first load (no messages yet)
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-proactive`,
        role: 'assistant',
        content: prompt.message,
        timestamp: new Date(),
      };
      setMessages([assistantMessage]);

      // Mark this prompt as shown today
      const setUserProfile = useAppStore.getState().setUserProfile;
      const shown = userProfile.shownMealTimePrompts;
      if (!shown.includes(prompt.mealType)) {
        setUserProfile({
          shownMealTimePrompts: [...shown, prompt.mealType],
        });
      }
    }
  }, []);

  /**
   * Analyze a meal description and get structured data
   */
  const analyzeMealDescription = useCallback(
    async (userMessage: string): Promise<MealAnalysis | null> => {
      if (!isMealDescription(userMessage)) {
        return null;
      }

      try {
        setIsMealAnalyzing(true);

        // Convert pantry items to format expected by backend
        const pantryForBackend = pantryItems.map((item) => ({
          id: item.id,
          name: item.name,
          brand: item.brand,
          nutrition: {
            calories: item.caloriesPerServing,
            carbs: item.carbsPerServing,
            protein: item.proteinPerServing,
            fat: item.fatPerServing,
            fiber: 0,
            netCarbs: item.carbsPerServing,
          },
          servingUnit: item.servingUnit,
        }));

        const response = await api.post<MealAnalysis>('/api/meals/analyze', {
          userMessage,
          pantryItems: pantryForBackend,
          userProfile: {
            dailyCarbGoal: userProfile.dailyCarbGoal,
            dailyCalorieGoal: userProfile.dailyCalorieGoal,
            personalityMode: userProfile.personalityMode,
          },
        });

        return response ?? null;
      } catch (error) {
        console.warn('Meal analysis error:', error);
        return null;
      } finally {
        setIsMealAnalyzing(false);
      }
    },
    [pantryItems, userProfile.dailyCarbGoal, userProfile.dailyCalorieGoal, userProfile.personalityMode]
  );

  /**
   * Log a meal to the meals store
   */
  const logMealFromAnalysis = useCallback(
    (analysis: MealAnalysis) => {
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

        // Deduct from pantry items if they exist
        analysis.pantryItemsToDeduct.forEach((itemName) => {
          const pantryItem = findPantryItem(itemName);
          if (pantryItem) {
            // Deduct one serving of this item
            deductPantryServings(pantryItem.id, 1);
          }
        });

        return true;
      } catch (error) {
        console.error('Failed to log meal:', error);
        return false;
      } finally {
        setIsMealLogging(false);
      }
    },
    [addMealEntry, findPantryItem, deductPantryServings]
  );

  /**
   * Generate a follow-up response from Chef Claude
   */
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

  const generateFollowUpResponse = useCallback(
    (analysis: MealAnalysis): string => {
      const { personalityMode, customPersonality } = userProfile;

      if (analysis.followUpQuestions.length > 0) {
        // Ask the first follow-up question
        const firstQuestion = analysis.followUpQuestions[0];

        // Add personality flavor to the question
        if (personalityMode === 'coach') {
          return `Got it! Just one quick question to nail this down — ${firstQuestion}`;
        } else if (personalityMode === 'gordon-ramsay') {
          return `Interesting! Listen — ${firstQuestion.toLowerCase()}`;
        } else if (personalityMode === 'scientist') {
          return `Let me gather more precise data. ${firstQuestion}`;
        } else if (personalityMode === 'zen') {
          return `Beautiful meal. Just so I have the complete picture — ${firstQuestion}`;
        }
        return firstQuestion;
      }

      // If no follow-up questions, we can log now
      const emoji = getMealTypeEmoji(analysis.mealType);
      if (personalityMode === 'coach') {
        return `Perfect! Here is what I am going to log for your ${analysis.mealType}:`;
      } else if (personalityMode === 'gordon-ramsay') {
        return `Right! That sounds delicious. Here is your ${emoji} ${formatMealType(analysis.mealType)}:`;
      } else if (personalityMode === 'scientist') {
        return `Excellent data. Logging your ${analysis.mealType}:`;
      } else if (personalityMode === 'zen') {
        return `What a wonderful meal. I am logging your ${emoji} ${formatMealType(analysis.mealType)}:`;
      }

      return `Perfect! Here is what I am going to log for your ${analysis.mealType}:`;
    },
    [userProfile.personalityMode, userProfile.customPersonality]
  );


  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping || isMealAnalyzing) return;

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

      try {
        // Check if this is a meal description
        const analysis = await analyzeMealDescription(trimmed);

        if (analysis && analysis.isMealDescription) {
          // This is a meal description - handle specially
          setCurrentMealAnalysis(analysis);

          // Generate a response
          const responseText = generateFollowUpResponse(analysis);

          // Create the assistant message
          const assistantMessage: Message = {
            id: `msg-${Date.now()}-reply`,
            role: 'assistant',
            content: responseText,
            timestamp: new Date(),
            mealAnalysis: analysis.canLogNow ? analysis : undefined,
            isFollowUpQuestion: !analysis.canLogNow,
          };

          setMessages((prev) => [...prev, assistantMessage]);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

          // If we need more info, store the pending answers
          if (!analysis.canLogNow && analysis.followUpQuestions.length > 0) {
            setPendingMealAnswers(analysis.followUpQuestions);
          }

          // If we can log now, don't send to Claude
          if (!analysis.canLogNow) {
            // User will answer follow-up questions
            setIsTyping(false);
            return;
          }
        } else {
          // Not a meal description - send to Claude as normal
          const systemPrompt = buildSystemPrompt(
            pantryItems,
            getEntriesForDate(new Date().toISOString().split('T')[0]),
            getDailyTotals(new Date().toISOString().split('T')[0]),
            userProfile,
            new Date().toISOString().split('T')[0],
            getEquipmentSummary().join(', '),
            getPreferencesSummary()
          );

          const conversationHistory = [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          }));

          const reply = await callClaude(conversationHistory, systemPrompt, apiKey);

          const assistantMessage: Message = {
            id: `msg-${Date.now()}-reply`,
            role: 'assistant',
            content: reply,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
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
      isMealAnalyzing,
      userProfile,
      pantryItems,
      getEntriesForDate,
      getDailyTotals,
      getEquipmentSummary,
      getPreferencesSummary,
      analyzeMealDescription,
      generateFollowUpResponse,
    ]
  );

  /**
   * Handle meal confirmation
   */
  const handleMealConfirm = useCallback(() => {
    if (!currentMealAnalysis) return;

    const success = logMealFromAnalysis(currentMealAnalysis);

    if (success) {
      // Add success message to chat
      const todayStr = new Date().toISOString().split('T')[0];
      const dailyTotals = getDailyTotals(todayStr);
      const mealType = currentMealAnalysis.mealType;

      let successMessage = `Logged! Your ${mealType} has been added. `;

      const carbsUsed = Math.round(dailyTotals.netCarbs);
      const carbGoal = userProfile.dailyCarbGoal;
      const carbsRemaining = carbGoal - carbsUsed;

      if (carbsRemaining >= 0) {
        successMessage += `You have used ${carbsUsed} of your ${carbGoal}g carb budget today — you are doing great.`;
      } else {
        successMessage += `You are now at ${carbsUsed}g of your ${carbGoal}g goal. No worries — tomorrow begins fresh.`;
      }

      // Add pantry deduction message if applicable
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
      const errorMsg: Message = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: 'Sorry, I had trouble logging that meal. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  }, [currentMealAnalysis, logMealFromAnalysis, getDailyTotals, userProfile.dailyCarbGoal]);


  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble
        message={item}
        onMealConfirm={item.mealAnalysis ? handleMealConfirm : undefined}
        isMealLogging={isMealLogging}
      />
    ),
    [handleMealConfirm, isMealLogging]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const handleGoToSettings = useCallback(() => {
    setShowApiKeyModal(false);
    router.back();
    router.push('/(tabs)/settings' as never);
  }, []);

  return (
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
                  {userProfile.personalityMode === 'default' ? '👨‍🍳' : userProfile.personalityMode === 'coach' ? '💪' : userProfile.personalityMode === 'gordon-ramsay' ? '🔥' : userProfile.personalityMode === 'scientist' ? '🧪' : userProfile.personalityMode === 'zen' ? '🧘' : '✨'}
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
              {userProfile.personalityMode === 'default' ? 'Your personal kitchen AI' : userProfile.personalityMode === 'coach' ? 'Coach Mode' : userProfile.personalityMode === 'gordon-ramsay' ? 'Gordon Ramsay Mode' : userProfile.personalityMode === 'scientist' ? 'Scientist Mode' : userProfile.personalityMode === 'zen' ? 'Zen Mode' : 'Custom Mode'}
            </Text>
          </View>

          <Pressable
            testID="history-button"
            onPress={() => {
              // History feature placeholder
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
        isLoading={isTyping || isMealAnalyzing}
      />
    </LinearGradient>
  );
}
