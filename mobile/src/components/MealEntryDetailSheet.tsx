import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { X, Edit3, Trash2, Move, Plus, Minus, ChefHat, Send } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';
import type { FoodEntry } from '@/lib/stores/mealsStore';
import { useMealsStore } from '@/lib/stores/mealsStore';

interface NutritionItem {
  label: string;
  key: keyof Omit<FoodEntry, 'id' | 'name' | 'brand' | 'mealType' | 'date' | 'servings' | 'photoUri' | 'pantryItemId' | 'isFavorite'>;
  unit: string;
  color: string;
  value: number;
}

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
  const [editingNutrition, setEditingNutrition] = useState<string | null>(null);
  const [chefRequest, setChefRequest] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const mealsStore = useMealsStore();

  if (!entry) return null;

  // Get all entries for this meal type and date to show them grouped
  const mealEntries = mealsStore.getEntriesForDate(entry.date).filter(
    (e) => e.mealType === entry.mealType
  );

  // Check if this entry is part of a grouped meal (multiple items logged together)
  const isGroupedMeal = mealEntries.length > 1;

  const nutritionItems: NutritionItem[] = [
    { label: 'Calories', key: 'calories', unit: 'kcal', color: Colors.green, value: entry.calories * entry.servings },
    { label: 'Net Carbs', key: 'netCarbs', unit: 'g', color: Colors.amber, value: entry.netCarbs * entry.servings },
    { label: 'Protein', key: 'protein', unit: 'g', color: Colors.textPrimary, value: entry.protein * entry.servings },
    { label: 'Total Fat', key: 'fat', unit: 'g', color: Colors.textPrimary, value: entry.fat * entry.servings },
    { label: 'Fiber', key: 'fiber', unit: 'g', color: Colors.textPrimary, value: entry.fiber * entry.servings },
    { label: 'Total Carbs', key: 'carbs', unit: 'g', color: Colors.textPrimary, value: entry.carbs * entry.servings },
  ];

  const getMealInfo = () => {
    const mealEmoji = {
      Breakfast: '🌅',
      Lunch: '🌞',
      Dinner: '🌙',
      Snacks: '🍎',
    }[entry.mealType] || '🍽️';
    return mealEmoji;
  };

  const handleNutritionEdit = (key: string) => {
    const item = nutritionItems.find((n) => n.key === key);
    if (item) {
      setEditingNutrition(key);
      setEditValues({ [key]: item.value.toString() });
    }
  };

  const handleNutritionSave = (key: string) => {
    const newValue = parseFloat(editValues[key] || '0');
    if (!isNaN(newValue) && onUpdateNutrition) {
      onUpdateNutrition(entry.id, { [key]: newValue });
      setEditingNutrition(null);
      setEditValues({});
    }
  };

  const handleNutritionAdjust = (key: string, delta: number) => {
    const item = nutritionItems.find((n) => n.key === key);
    if (item && onUpdateNutrition) {
      const newValue = Math.max(0, item.value + delta);
      onUpdateNutrition(entry.id, { [key]: newValue });
    }
  };

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          style={{ flex: 1, maxHeight: '90%' }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: Colors.navyCard,
              borderTopLeftRadius: BorderRadius.xxl,
              borderTopRightRadius: BorderRadius.xxl,
              borderTopWidth: 1,
              borderTopColor: Colors.border,
            }}
          >
            {/* Header - Fixed at top */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              }}
            >
              <Text
                style={{
                  fontFamily: 'PlayfairDisplay_700Bold',
                  fontSize: 18,
                  color: Colors.textPrimary,
                  flex: 1,
                }}
              >
                Meal Details
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* ScrollView with proper keyboard handling */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              scrollEnabled={true}
              nestedScrollEnabled={true}
            >
              {/* Grouped Meal Indicator */}
              {isGroupedMeal ? (
                <View
                  style={{
                    paddingHorizontal: 20,
                    paddingTop: 12,
                    paddingBottom: 8,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: 'rgba(52, 211, 153, 0.1)',
                      borderRadius: BorderRadius.md,
                      borderWidth: 1,
                      borderColor: Colors.green,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 12,
                        color: Colors.green,
                      }}
                    >
                      Part of a meal with {mealEntries.length} items
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* This Food Item - Main content */}
              <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 18,
                    color: Colors.textPrimary,
                    marginBottom: 8,
                  }}
                >
                  {entry.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 13,
                      color: Colors.textSecondary,
                      backgroundColor: Colors.surface,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: BorderRadius.sm,
                    }}
                  >
                    {entry.servings} {entry.servings === 1 ? 'serving' : 'servings'}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: Colors.textSecondary,
                    }}
                  >
                    {getMealInfo()} {entry.mealType}
                  </Text>
                </View>
                {entry.brand ? (
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: Colors.textTertiary,
                    }}
                  >
                    Brand: {entry.brand}
                  </Text>
                ) : null}
              </View>

              {/* Food Items List Section */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderTopWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                {/* Single food item row - Like Ready to Log format */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 14,
                        color: Colors.textPrimary,
                      }}
                    >
                      {entry.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 12,
                        color: Colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {entry.servings} {entry.servings === 1 ? 'serving' : 'servings'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 14,
                        color: Colors.green,
                      }}
                    >
                      {Math.round(entry.calories * entry.servings)} cal
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 11,
                        color: Colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {Math.round((entry.netCarbs * entry.servings) * 10) / 10}g carbs
                    </Text>
                  </View>
                  <Pressable hitSlop={8}>
                    <Edit3 size={16} color={Colors.textSecondary} />
                  </Pressable>
                </View>

                {/* Total Row */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 14,
                      color: Colors.textPrimary,
                    }}
                  >
                    Total
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 14,
                        color: Colors.green,
                      }}
                    >
                      {Math.round(entry.calories * entry.servings)} cal
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 14,
                        color: Colors.green,
                        marginTop: 2,
                      }}
                    >
                      {Math.round((entry.netCarbs * entry.servings) * 10) / 10}g net carbs
                    </Text>
                  </View>
                </View>

                {/* Nutrition Summary Card */}
                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: BorderRadius.lg,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text
                        style={{
                          fontFamily: 'DMSans_500Medium',
                          fontSize: 12,
                          color: Colors.textSecondary,
                        }}
                      >
                        Protein
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'DMSans_600SemiBold',
                          fontSize: 12,
                          color: Colors.textPrimary,
                        }}
                      >
                        {Math.round((entry.protein * entry.servings) * 10) / 10}g
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text
                        style={{
                          fontFamily: 'DMSans_500Medium',
                          fontSize: 12,
                          color: Colors.textSecondary,
                        }}
                      >
                        Fat
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'DMSans_600SemiBold',
                          fontSize: 12,
                          color: Colors.textPrimary,
                        }}
                      >
                        {Math.round((entry.fat * entry.servings) * 10) / 10}g
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text
                        style={{
                          fontFamily: 'DMSans_500Medium',
                          fontSize: 12,
                          color: Colors.textSecondary,
                        }}
                      >
                        Fiber
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'DMSans_600SemiBold',
                          fontSize: 12,
                          color: Colors.textPrimary,
                        }}
                      >
                        {Math.round((entry.fiber * entry.servings) * 10) / 10}g
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text
                        style={{
                          fontFamily: 'DMSans_500Medium',
                          fontSize: 12,
                          color: Colors.textSecondary,
                        }}
                      >
                        Sugar
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'DMSans_600SemiBold',
                          fontSize: 12,
                          color: Colors.textPrimary,
                        }}
                      >
                        {Math.round(((entry.carbs - entry.fiber) * entry.servings) * 10) / 10}g
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Chef Claude Section */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderTopWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                  <ChefHat size={16} color={Colors.amber} />
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 13,
                      color: Colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Chef Claude
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: Colors.textTertiary,
                    marginBottom: 12,
                  }}
                >
                  Describe what you want to change, e.g. "add 50 calories" or "double the protein"
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                  <TextInput
                    value={chefRequest}
                    onChangeText={setChefRequest}
                    placeholder="Ask Chef Claude..."
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    maxLength={200}
                    editable={!isProcessing}
                    style={{
                      flex: 1,
                      backgroundColor: Colors.surface,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      borderRadius: BorderRadius.md,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: Colors.textPrimary,
                      maxHeight: 80,
                    }}
                  />
                  <Pressable
                    onPress={handleChefRequest}
                    disabled={isProcessing || !chefRequest.trim()}
                    style={{
                      backgroundColor: isProcessing || !chefRequest.trim() ? Colors.textTertiary : Colors.amber,
                      borderRadius: BorderRadius.md,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 44,
                      minHeight: 44,
                    }}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={Colors.navy} />
                    ) : (
                      <Send size={16} color={Colors.navy} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Action Buttons - At bottom with spacing for keyboard */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 16,
                  paddingBottom: 24,
                  gap: 10,
                }}
              >
                {onEdit ? (
                  <Pressable
                    onPress={() => {
                      onEdit();
                      onClose();
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
                    <Text
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 14,
                        color: '#fff',
                      }}
                    >
                      Save Changes
                    </Text>
                  </Pressable>
                ) : null}

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
                      borderWidth: 1,
                      borderColor: Colors.border,
                      borderRadius: BorderRadius.lg,
                      paddingVertical: 12,
                      gap: 8,
                    }}
                  >
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
                    <Text
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 14,
                        color: Colors.error,
                      }}
                    >
                      Delete This Entry
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
