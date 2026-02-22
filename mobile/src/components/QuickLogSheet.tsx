import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Mic, X } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '@/constants/theme';
import type { FoodEntry } from '@/lib/stores/mealsStore';

interface QuickLogSheetProps {
  visible: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => void;
  recentMeals: FoodEntry[];
  favoriteMeals: FoodEntry[];
  isLoading?: boolean;
}

function formatTime(dateStr: string, timeStr?: string): string {
  const date = new Date(dateStr);
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let dayStr = '';
  if (dateStr === today) {
    dayStr = 'Today';
  } else if (dateStr === yesterday) {
    dayStr = 'Yesterday';
  } else {
    dayStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // Extract time from entry if available (would need to be added to FoodEntry in future)
  // For now, return just the day
  return dayStr;
}

function getRecentMeals(meals: FoodEntry[], limit: number = 5): FoodEntry[] {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return meals
    .filter((meal) => meal.date >= sevenDaysAgo)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

function getUniqueMealNames(meals: FoodEntry[]): FoodEntry[] {
  const seen = new Set<string>();
  return meals.filter((meal) => {
    if (seen.has(meal.name)) return false;
    seen.add(meal.name);
    return true;
  });
}

export function QuickLogSheet({
  visible,
  onClose,
  onSendMessage,
  recentMeals,
  favoriteMeals,
  isLoading = false,
}: QuickLogSheetProps) {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const uniqueRecent = getUniqueMealNames(getRecentMeals(recentMeals, 5));
  const uniqueFavorites = getUniqueMealNames(favoriteMeals.slice(0, 5));

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;

    onSendMessage(trimmed);
    setInputText('');
    // Close sheet after sending
    setTimeout(onClose, 100);
  }, [inputText, isLoading, onSendMessage, onClose]);

  const handleMealSelect = useCallback(
    (mealName: string) => {
      setInputText(mealName);
      // Auto-send if it's a simple meal name
      setTimeout(() => {
        onSendMessage(mealName);
        setInputText('');
        setTimeout(onClose, 100);
      }, 200);
    },
    [onSendMessage, onClose]
  );

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View
        testID="quick-log-sheet"
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
        onTouchEnd={onClose}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={onClose}
          testID="quick-log-overlay"
        />

        <View
          onTouchEnd={(e) => e.stopPropagation()}
          style={{
            backgroundColor: Colors.navy,
            borderTopLeftRadius: BorderRadius.xxl,
            borderTopRightRadius: BorderRadius.xxl,
            maxHeight: '85%',
            ...Shadows.elevated,
          }}
        >
          {/* Grabber */}
          <View
            style={{
              alignItems: 'center',
              paddingTop: 10,
              paddingBottom: 6,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: Colors.border,
              }}
            />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: Colors.greenMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={16} color={Colors.green} />
            </View>
            <Text
              style={{
                flex: 1,
                fontFamily: 'PlayfairDisplay_700Bold',
                fontSize: 18,
                color: Colors.textPrimary,
                marginLeft: 10,
              }}
            >
              Quick Log
            </Text>
            <Pressable
              testID="quick-log-close"
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: Colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Input area */}
            <View style={{ marginBottom: 20 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: 10,
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
                    paddingVertical: 12,
                    maxHeight: 100,
                  }}
                >
                  <TextInput
                    ref={inputRef}
                    testID="quick-log-input"
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="What did you eat?"
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    editable={!isLoading}
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 15,
                      color: Colors.textPrimary,
                      maxHeight: 80,
                    }}
                  />
                </View>

                {/* Voice button (disabled for now) */}
                <Pressable
                  disabled
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: Colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.5,
                  }}
                  testID="quick-log-voice-btn"
                >
                  <Mic size={18} color={Colors.textTertiary} />
                </Pressable>

                {/* Send button */}
                <Pressable
                  testID="quick-log-send"
                  onPress={handleSend}
                  disabled={!inputText.trim() || isLoading}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor:
                      inputText.trim() && !isLoading ? Colors.green : Colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...Shadows.card,
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={Colors.textSecondary} />
                  ) : (
                    <Zap
                      size={18}
                      color={inputText.trim() ? '#fff' : Colors.textTertiary}
                    />
                  )}
                </Pressable>
              </View>
              {/* Voice tooltip */}
              <Text
                style={{
                  fontSize: 11,
                  color: Colors.textTertiary,
                  marginTop: 6,
                  marginLeft: 16,
                  fontFamily: 'DMSans_400Regular',
                  fontStyle: 'italic',
                }}
              >
                Voice input coming soon
              </Text>
            </View>

            {/* Recent meals section */}
            {uniqueRecent.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 12,
                    color: Colors.textTertiary,
                    marginBottom: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                  }}
                >
                  Recent Meals
                </Text>
                <FlatList
                  data={uniqueRecent}
                  horizontal
                  scrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                  style={{ flexGrow: 0 }}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <Pressable
                      testID={`recent-meal-${item.id}`}
                      onPress={() => handleMealSelect(item.name)}
                      style={{
                        backgroundColor: Colors.surface,
                        borderRadius: BorderRadius.full,
                        borderWidth: 1,
                        borderColor: Colors.border,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'DMSans_400Regular',
                          fontSize: 13,
                          color: Colors.textSecondary,
                        }}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'DMSans_400Regular',
                          fontSize: 10,
                          color: Colors.textTertiary,
                          marginTop: 2,
                        }}
                      >
                        {formatTime(item.date)}
                      </Text>
                    </Pressable>
                  )}
                />
              </View>
            )}

            {uniqueRecent.length === 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 13,
                    color: Colors.textTertiary,
                    fontStyle: 'italic',
                  }}
                >
                  No recent meals yet — start describing what you eat above!
                </Text>
              </View>
            )}

            {/* Favorites section */}
            {uniqueFavorites.length > 0 && (
              <View>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 12,
                    color: Colors.textTertiary,
                    marginBottom: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                  }}
                >
                  Favorites
                </Text>
                <FlatList
                  data={uniqueFavorites}
                  horizontal
                  scrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                  style={{ flexGrow: 0 }}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <Pressable
                      testID={`favorite-meal-${item.id}`}
                      onPress={() => handleMealSelect(item.name)}
                      style={{
                        backgroundColor: 'rgba(46,204,113,0.15)',
                        borderRadius: BorderRadius.full,
                        borderWidth: 1,
                        borderColor: Colors.green,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'DMSans_500Medium',
                          fontSize: 13,
                          color: Colors.green,
                        }}
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  )}
                />
              </View>
            )}

            {uniqueFavorites.length === 0 && uniqueRecent.length > 0 && (
              <View>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 13,
                    color: Colors.textTertiary,
                    fontStyle: 'italic',
                  }}
                >
                  Mark meals as favorites to quick-log them!
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
