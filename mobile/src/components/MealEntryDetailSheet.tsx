import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, ChefHat, Send, Trash2, Move, Heart } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';
import type { FoodEntry } from '@/lib/stores/mealsStore';
import { useMealsStore } from '@/lib/stores/mealsStore';

interface MealEntryDetailSheetProps {
  visible: boolean;
  entry: FoodEntry | null;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: () => void;
  onUpdateNutrition?: (entryId: string, updates: Partial<FoodEntry>) => void;
}

export function MealEntryDetailSheet({
  visible,
  entry,
  onClose,
  onEdit,
  onDelete,
  onMove,
  onUpdateNutrition,
}: MealEntryDetailSheetProps) {
  const [chefRequest, setChefRequest] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mealsStore = useMealsStore();

  if (!entry || !visible) return null;

  // Get all entries for this meal type and date
  const mealEntries = mealsStore.getEntriesForDate(entry.date).filter(
    (e) => e.mealType === entry.mealType
  );

  const handleChefRequest = async () => {
    if (!chefRequest.trim() || !onUpdateNutrition) return;

    setIsProcessing(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const response = await fetch(`${baseUrl}/api/chef-claude/interpret-nutrition-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: chefRequest,
          currentNutrition: {
            calories: entry.calories,
            carbs: entry.carbs,
            protein: entry.protein,
            fat: entry.fat,
            fiber: entry.fiber,
            netCarbs: entry.netCarbs,
          },
        }),
      });

      const json = await response.json();
      if (json.data && json.data.updates) {
        onUpdateNutrition(entry.id, json.data.updates);
        setChefRequest('');
      }
    } catch (error) {
      console.error('Chef Claude error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getMealEmoji = () => {
    const emojis: Record<string, string> = {
      Breakfast: '🌅',
      Lunch: '🌞',
      Dinner: '🌙',
      Snacks: '🍎',
    };
    return emojis[entry.mealType] || '🍽️';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.navy }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
            backgroundColor: Colors.surface,
          }}
        >
          <Pressable onPress={onClose} hitSlop={8}>
            <ChevronLeft size={24} color={Colors.textPrimary} />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center', marginLeft: 8 }}>
            <Text style={{ fontSize: 20 }}>{getMealEmoji()}</Text>
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 16,
                color: Colors.textPrimary,
                marginTop: 4,
              }}
            >
              {entry.mealType}
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Food Item Card - Ready to Log Style */}
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: Colors.border,
              overflow: 'hidden',
              ...Shadows.card,
            }}
          >
            {/* Header */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: Colors.surface,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>{getMealEmoji()}</Text>
                <View>
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 13,
                      color: Colors.textPrimary,
                    }}
                  >
                    Ready to Log
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 11,
                      color: Colors.green,
                      marginTop: 2,
                    }}
                  >
                    {entry.mealType}
                  </Text>
                </View>
              </View>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={{ fontSize: 20, color: Colors.textSecondary }}>✕</Text>
              </Pressable>
            </View>

            {/* Food Item Details */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 15,
                      color: Colors.textPrimary,
                      marginBottom: 6,
                    }}
                  >
                    {entry.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: Colors.textSecondary,
                    }}
                  >
                    {entry.servings} {entry.servings === 1 ? 'serving' : 'servings'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 16,
                      color: Colors.green,
                      marginBottom: 4,
                    }}
                  >
                    {Math.round(entry.calories * entry.servings)} cal
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 12,
                      color: Colors.textSecondary,
                    }}
                  >
                    {Math.round((entry.netCarbs * entry.servings) * 10) / 10}g carbs
                  </Text>
                </View>
              </View>

              {/* Nutrition Breakdown */}
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: BorderRadius.md,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  marginTop: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary }}>
                    Protein
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.textPrimary }}>
                    {Math.round((entry.protein * entry.servings) * 10) / 10}g
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary }}>
                    Fat
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.textPrimary }}>
                    {Math.round((entry.fat * entry.servings) * 10) / 10}g
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary }}>
                    Fiber
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.textPrimary }}>
                    {Math.round((entry.fiber * entry.servings) * 10) / 10}g
                  </Text>
                </View>
              </View>
            </View>

            {/* Chef Claude Section */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                <ChefHat size={14} color={Colors.amber} />
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 11,
                    color: Colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Refine with Chef Claude
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 11,
                  color: Colors.textTertiary,
                  marginBottom: 10,
                }}
              >
                e.g. "add 50 calories" or "double the protein"
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                <TextInput
                  value={chefRequest}
                  onChangeText={setChefRequest}
                  placeholder="Ask Chef Claude..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  maxLength={150}
                  editable={!isProcessing}
                  style={{
                    flex: 1,
                    backgroundColor: Colors.surface,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderRadius: BorderRadius.md,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: Colors.textPrimary,
                    maxHeight: 60,
                  }}
                />
                <Pressable
                  onPress={handleChefRequest}
                  disabled={isProcessing || !chefRequest.trim()}
                  style={{
                    backgroundColor:
                      isProcessing || !chefRequest.trim() ? Colors.textTertiary : Colors.amber,
                    borderRadius: BorderRadius.md,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 40,
                    minHeight: 40,
                  }}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={Colors.navy} />
                  ) : (
                    <Send size={14} color={Colors.navy} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Action Buttons */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 10,
              }}
            >
              <Pressable
                onPress={() => {
                  // Toggle favorite
                  if (onUpdateNutrition) {
                    const isFavorite = entry.isFavorite;
                    onUpdateNutrition(entry.id, { isFavorite: !isFavorite });
                  }
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: Colors.green,
                  borderRadius: BorderRadius.lg,
                  paddingVertical: 12,
                  gap: 8,
                }}
              >
                <Heart
                  size={16}
                  color="#fff"
                  fill={entry.isFavorite ? '#fff' : 'none'}
                />
                <Text
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 14,
                    color: '#fff',
                  }}
                >
                  {entry.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </Text>
              </Pressable>

              {onMove ? (
                <Pressable
                  onPress={() => {
                    onMove();
                    onClose();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderColor: Colors.border,
                    borderRadius: BorderRadius.lg,
                    paddingVertical: 12,
                    gap: 8,
                  }}
                >
                  <Move size={16} color={Colors.textSecondary} />
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 14,
                      color: Colors.textSecondary,
                    }}
                  >
                    Move to Different Meal
                  </Text>
                </Pressable>
              ) : null}

              {onDelete ? (
                <Pressable
                  onPress={() => {
                    onDelete();
                    onClose();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent',
                    borderRadius: BorderRadius.lg,
                    paddingVertical: 12,
                    gap: 8,
                  }}
                >
                  <Trash2 size={16} color={Colors.error} />
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 14,
                      color: Colors.error,
                    }}
                  >
                    Delete Entry
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
