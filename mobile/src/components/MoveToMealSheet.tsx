import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';
import type { MealType } from '@/lib/stores/mealsStore';

interface MoveToMealSheetProps {
  visible: boolean;
  currentMealType: MealType;
  foodName: string;
  currentDate: string; // ISO date string (YYYY-MM-DD)
  onMove: (mealType: MealType, targetDate: string) => void;
  onCancel: () => void;
}

const MEAL_TYPES: { type: MealType; label: string; emoji: string; color: string }[] = [
  { type: 'Breakfast', label: 'Breakfast', emoji: '🌅', color: '#F39C12' },
  { type: 'Lunch', label: 'Lunch', emoji: '🌞', color: '#E67E22' },
  { type: 'Dinner', label: 'Dinner', emoji: '🌙', color: '#9B59B6' },
  { type: 'Snacks', label: 'Snacks', emoji: '🍎', color: '#2ECC71' },
];

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${newMonth}-${newDay}`;
}

export function MoveToMealSheet({
  visible,
  currentMealType,
  foodName,
  currentDate,
  onMove,
  onCancel,
}: MoveToMealSheetProps) {
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);

  const handleConfirmMove = () => {
    if (selectedMealType) {
      onMove(selectedMealType, selectedDate);
      setSelectedDate(currentDate);
      setSelectedMealType(null);
    }
  };

  const handleCancel = () => {
    setSelectedDate(currentDate);
    setSelectedMealType(null);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Pressable style={{ flex: 1 }} onPress={handleCancel} />
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
            maxHeight: '80%',
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
                Move Meal
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 13,
                  color: Colors.textSecondary,
                }}
              >
                {foodName}
              </Text>
            </View>
            <Pressable onPress={handleCancel} hitSlop={8}>
              <X size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Date Picker */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 13,
                  color: Colors.textSecondary,
                  marginBottom: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Select Date
              </Text>
              <View
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.lg,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Pressable
                  onPress={() => setSelectedDate(addDays(selectedDate, -1))}
                  hitSlop={8}
                >
                  <ChevronLeft size={20} color={Colors.textSecondary} />
                </Pressable>

                <Text
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 15,
                    color: Colors.textPrimary,
                    flex: 1,
                    textAlign: 'center',
                  }}
                >
                  {formatDate(selectedDate)}
                </Text>

                <Pressable
                  onPress={() => setSelectedDate(addDays(selectedDate, 1))}
                  hitSlop={8}
                >
                  <ChevronRight size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>
              {selectedDate !== currentDate && (
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: Colors.amber,
                    marginTop: 8,
                    textAlign: 'center',
                  }}
                >
                  Moving to {formatDate(selectedDate)}
                </Text>
              )}
            </View>

            {/* Meal Type Buttons */}
            <View style={{ gap: 12, marginBottom: 20 }}>
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 13,
                  color: Colors.textSecondary,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Select Meal Type
              </Text>
              {MEAL_TYPES.map((meal) => {
                const isCurrent = meal.type === currentMealType && selectedDate === currentDate;
                const isSelected = meal.type === selectedMealType;
                return (
                  <Pressable
                    key={meal.type}
                    onPress={() => setSelectedMealType(isSelected ? null : meal.type)}
                    disabled={isCurrent}
                    style={{
                      backgroundColor: Colors.surface,
                      borderRadius: BorderRadius.lg,
                      padding: 16,
                      borderWidth: 2,
                      borderColor: isSelected ? Colors.amber : isCurrent ? Colors.green : Colors.border,
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
                      ) : isSelected ? (
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: Colors.amber,
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
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ gap: 12, marginTop: 16 }}>
            <Pressable
              onPress={handleConfirmMove}
              disabled={!selectedMealType}
              style={{
                backgroundColor: selectedMealType ? Colors.amber : Colors.surface,
                borderRadius: BorderRadius.lg,
                paddingVertical: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: selectedMealType ? Colors.amber : Colors.border,
                opacity: selectedMealType ? 1 : 0.5,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 15,
                  color: selectedMealType ? Colors.navy : Colors.textSecondary,
                }}
              >
                Confirm Move
              </Text>
            </Pressable>

            <Pressable
              onPress={handleCancel}
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
      </View>
    </Modal>
  );
}
