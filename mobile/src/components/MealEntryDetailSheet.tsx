import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { X, Edit3, Trash2, Move } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';
import type { FoodEntry } from '@/lib/stores/mealsStore';

interface MealEntryDetailSheetProps {
  visible: boolean;
  entry: FoodEntry | null;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: () => void;
}

export function MealEntryDetailSheet({
  visible,
  entry,
  onClose,
  onEdit,
  onDelete,
  onMove,
}: MealEntryDetailSheetProps) {
  if (!entry) return null;

  const totalCalories = entry.calories * entry.servings;
  const totalNetCarbs = entry.netCarbs * entry.servings;
  const totalCarbs = entry.carbs * entry.servings;
  const totalFiber = entry.fiber * entry.servings;
  const totalProtein = entry.protein * entry.servings;
  const totalFat = entry.fat * entry.servings;

  // Get meal icon and time estimate
  const getMealInfo = () => {
    const mealEmoji = {
      Breakfast: '🌅',
      Lunch: '🌞',
      Dinner: '🌙',
      Snacks: '🍎',
    }[entry.mealType] || '🍽️';
    return mealEmoji;
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
        <View
          style={{
            flex: 1,
            backgroundColor: Colors.navyCard,
            borderTopLeftRadius: BorderRadius.xxl,
            borderTopRightRadius: BorderRadius.xxl,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            paddingBottom: 40,
          }}
        >
          {/* Header */}
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

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Entry Name and Meal Info */}
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 16,
                  color: Colors.textPrimary,
                  marginBottom: 4,
                }}
              >
                {entry.name}
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 13,
                  color: Colors.textSecondary,
                }}
              >
                {getMealInfo()} {entry.mealType} · {entry.servings} {entry.servings === 1 ? 'serving' : 'servings'}
              </Text>
              {entry.brand ? (
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: Colors.textTertiary,
                    marginTop: 2,
                  }}
                >
                  Brand: {entry.brand}
                </Text>
              ) : null}
            </View>

            {/* Nutrition Breakdown */}
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: Colors.border,
                marginHorizontal: 0,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 13,
                  color: Colors.textSecondary,
                  marginBottom: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Nutrition Breakdown
              </Text>

              {/* Two-column layout for nutrition */}
              <View style={{ flexDirection: 'row', gap: 24 }}>
                {/* Left column */}
                <View style={{ flex: 1 }}>
                  {/* Calories */}
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 12,
                        color: Colors.textSecondary,
                        marginBottom: 2,
                      }}
                    >
                      Calories
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 16,
                        color: Colors.green,
                      }}
                    >
                      {Math.round(totalCalories)} kcal
                    </Text>
                  </View>

                  {/* Net Carbs */}
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 12,
                        color: Colors.textSecondary,
                        marginBottom: 2,
                      }}
                    >
                      Net Carbs
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 16,
                        color: Colors.amber,
                      }}
                    >
                      {Math.round(totalNetCarbs)}g
                    </Text>
                  </View>

                  {/* Fiber */}
                  <View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 12,
                        color: Colors.textSecondary,
                        marginBottom: 2,
                      }}
                    >
                      Fiber
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 16,
                        color: Colors.textPrimary,
                      }}
                    >
                      {Math.round(totalFiber)}g
                    </Text>
                  </View>
                </View>

                {/* Right column */}
                <View style={{ flex: 1 }}>
                  {/* Protein */}
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 12,
                        color: Colors.textSecondary,
                        marginBottom: 2,
                      }}
                    >
                      Protein
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 16,
                        color: Colors.textPrimary,
                      }}
                    >
                      {Math.round(totalProtein)}g
                    </Text>
                  </View>

                  {/* Fat */}
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 12,
                        color: Colors.textSecondary,
                        marginBottom: 2,
                      }}
                    >
                      Total Fat
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 16,
                        color: Colors.textPrimary,
                      }}
                    >
                      {Math.round(totalFat)}g
                    </Text>
                  </View>

                  {/* Total Carbs */}
                  <View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 12,
                        color: Colors.textSecondary,
                        marginBottom: 2,
                      }}
                    >
                      Total Carbs
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 16,
                        color: Colors.textPrimary,
                      }}
                    >
                      {Math.round(totalCarbs)}g
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 8,
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
                  <Edit3 size={16} color="#fff" />
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 14,
                      color: '#fff',
                    }}
                  >
                    Edit Entry
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
                    backgroundColor: Colors.navyCard,
                    borderWidth: 1,
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
                    backgroundColor: 'rgba(231,76,60,0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(231,76,60,0.3)',
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
