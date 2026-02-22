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
import { Colors, BorderRadius, Shadows } from '@/constants/theme';
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
  "How many carbs are in my pantry staples?",
  "What should I eat to hit my protein goal?",
  "Suggest a recipe using my chicken",
  "Is this a good low carb day so far?",
];

function buildSystemPrompt(
  pantryItems: PantryItem[],
  todayEntries: FoodEntry[],
  dailyTotals: DailyTotals,
  userProfile: UserProfile,
  todayStr: string
): string {
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

  return `You are Chef Claude, a personal AI nutritionist, chef, and pantry manager integrated into PantryIQ. You are friendly, encouraging, warm, and deeply knowledgeable about nutrition, cooking, and low carb / keto eating. You speak conversationally — this is a chat, not an essay. Keep responses concise and practical.

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

INSTRUCTIONS:
- Always check actual pantry inventory before suggesting recipes
- Flag missing ingredients clearly
- Be specific with carb counts when asked
- Use friendly, encouraging tone
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
          todayStr
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
    [messages, isTyping, pantryItems, todayEntries, dailyTotals, userProfile, todayStr]
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
                <ChefHat size={15} color={Colors.green} />
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
              Your personal kitchen AI
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
