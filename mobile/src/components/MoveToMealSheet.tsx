import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';
import type { MealType } from '@/lib/stores/mealsStore';

interface MoveToMealSheetProps {
  visible: boolean;
  currentMealType: MealType;
  foodName: string;
  onMove: (mealType: MealType) => void;
  onCancel: () => void;
}

const MEAL_TYPES: { type: MealType; label: string; emoji: string; color: string }[] = [
  { type: 'Breakfast', label: 'Breakfast', emoji: '🌅', color: '#F39C12' },
  { type: 'Lunch', label: 'Lunch', emoji: '🌞', color: '#E67E22' },
  { type: 'Dinner', label: 'Dinner', emoji: '🌙', color: '#9B59B6' },
  { type: 'Snacks', label: 'Snacks', emoji: '🍎', color: '#2ECC71' },
];

export function MoveToMealSheet({
  visible,
  currentMealType,
  foodName,
  onMove,
  onCancel,
}: MoveToMealSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Pressable style={{ flex: 1 }} onPress={onCancel} />
        <View
          style={{
            backgroundColor: Colors.navyCard,
            borderTopLeftRadius: BorderRadius.xxl,
            borderTopRightRadius: BorderRadius.xxl,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 40,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'PlayfairDisplay_700Bold',
                  fontSize: 20,
                  color: Colors.textPrimary,
                  marginBottom: 4,
                }}
              >
                Move to Meal Type
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 13,
                  color: Colors.textSecondary,
                }}
              >
                Moving {foodName}
              </Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={8}>
              <X size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Meal Type Buttons */}
          <View style={{ gap: 12, marginBottom: 20 }}>
            {MEAL_TYPES.map((meal) => {
              const isCurrent = meal.type === currentMealType;
              return (
                <Pressable
                  key={meal.type}
                  onPress={() => !isCurrent && onMove(meal.type)}
                  disabled={isCurrent}
                  style={{
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.lg,
                    padding: 16,
                    borderWidth: 2,
                    borderColor: isCurrent ? Colors.green : Colors.border,
                    opacity: isCurrent ? 0.7 : 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: BorderRadius.md,
                          backgroundColor: `${meal.color}20`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 24 }}>{meal.emoji}</Text>
                      </View>
                      <View>
                        <Text
                          style={{
                            fontFamily: 'DMSans_700Bold',
                            fontSize: 15,
                            color: Colors.textPrimary,
                          }}
                        >
                          {meal.label}
                        </Text>
                        {isCurrent ? (
                          <Text
                            style={{
                              fontFamily: 'DMSans_500Medium',
                              fontSize: 12,
                              color: Colors.green,
                              marginTop: 2,
                            }}
                          >
                            Current
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    {isCurrent ? (
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: Colors.green,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 12, color: Colors.navy }}>✓</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Cancel Button */}
          <Pressable
            onPress={onCancel}
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              paddingVertical: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 15,
                color: Colors.textSecondary,
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
