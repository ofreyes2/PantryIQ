import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { ChefHat, ArrowLeft, Send, History } from 'lucide-react-native';
import { usePantryStore } from '@/lib/stores/pantryStore';
import { useMealsStore } from '@/lib/stores/mealsStore';
import { useAppStore } from '@/lib/stores/appStore';
import { useKitchenStore } from '@/lib/stores/kitchenStore';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';
import { buildPersonalityPrompt } from '@/lib/personalityModes';
import type { PantryItem } from '@/lib/stores/pantryStore';
import type { FoodEntry, DailyTotals } from '@/lib/stores/mealsStore';
import type { UserProfile } from '@/lib/stores/appStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
  const getEquipmentSummary = useKitchenStore((s) => s.getEquipmentSummary);
  const getPreferencesSummary = useKitchenStore((s) => s.getPreferencesSummary);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntries = getEntriesForDate(todayStr);
  const dailyTotals = getDailyTotals(todayStr);

  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, isTyping]);

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

      try {
        const systemPrompt = buildSystemPrompt(
          pantryItems,
          todayEntries,
          dailyTotals,
          userProfile,
          todayStr,
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
    [messages, isTyping, pantryItems, todayEntries, dailyTotals, userProfile, todayStr, getEquipmentSummary, getPreferencesSummary]
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => <MessageBubble message={item} />,
    []
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
    </LinearGradient>
  );
}
