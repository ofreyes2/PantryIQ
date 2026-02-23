import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';
import type { MealAnalysis } from '@/lib/mealAnalysis';
import { formatNutrient } from '@/lib/mealAnalysis';

interface MealConfirmationModalProps {
  visible: boolean;
  analysis: MealAnalysis | null;
  onClose: () => void;
  onConfirm: (mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks', date: string) => Promise<void>;
  onLogAndAddMore: (mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks', date: string) => Promise<void>;
  isLoading?: boolean;
  currentDate?: string; // Optional date override, defaults to today
}

export function MealConfirmationModal({
  visible,
  analysis,
  onClose,
  onConfirm,
  onLogAndAddMore,
  isLoading = false,
  currentDate,
}: MealConfirmationModalProps) {
  const [selectedMealType, setSelectedMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'>('Breakfast');
  const selectedDate = currentDate || new Date().toISOString().split('T')[0];
  const [isConfirming, setIsConfirming] = useState(false);

  if (!analysis) {
    return null;
  }

  const mealTypeOptions: { value: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'; label: string; icon: string }[] = [
    { value: 'Breakfast', label: 'Breakfast', icon: '🌅' },
    { value: 'Lunch', label: 'Lunch', icon: '🌤️' },
    { value: 'Dinner', label: 'Dinner', icon: '🌙' },
    { value: 'Snacks', label: 'Snacks', icon: '🍿' },
  ];

  const handleConfirm = async () => {
    if (isConfirming || isLoading) return;
    setIsConfirming(true);
    try {
      await onConfirm(selectedMealType, selectedDate);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleLogAndAddMore = async () => {
    if (isConfirming || isLoading) return;
    setIsConfirming(true);
    try {
      await onLogAndAddMore(selectedMealType, selectedDate);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}
      >
        <SafeAreaView style={{ width: '100%', maxWidth: 400 }}>
          <View
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: Colors.border,
              overflow: 'hidden',
              ...Shadows.elevated,
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
                Confirm Meal
              </Text>
              <Pressable onPress={onClose} testID="close-meal-confirmation-modal" hitSlop={8}>
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: 500 }}
              contentContainerStyle={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Meal Summary */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 12,
                    color: Colors.textSecondary,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                  }}
                >
                  Meal Summary
                </Text>
                {analysis.identifiedFoods.map((food, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: Colors.surface,
                      borderRadius: BorderRadius.md,
                      padding: 12,
                      marginBottom: idx < analysis.identifiedFoods.length - 1 ? 8 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 14,
                        color: Colors.textPrimary,
                        marginBottom: 4,
                      }}
                    >
                      {food.quantity && food.unit ? `${food.quantity} ${food.unit}` : '1 serving'} {food.name}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                        {formatNutrient(food.estimatedCalories, ' cal')}
                      </Text>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.amber }}>
                        {formatNutrient(food.estimatedNetCarbs, 'g carbs')}
                      </Text>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#3498DB' }}>
                        {formatNutrient(food.estimatedProtein, 'g protein')}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Total */}
                <View
                  style={{
                    backgroundColor: Colors.greenMuted,
                    borderRadius: BorderRadius.md,
                    padding: 12,
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: `${Colors.green}40`,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 13,
                      color: Colors.green,
                      marginBottom: 4,
                    }}
                  >
                    Total
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                    <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.textPrimary }}>
                      {formatNutrient(analysis.totalEstimatedCalories, ' cal')}
                    </Text>
                    <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.amber }}>
                      {formatNutrient(analysis.totalEstimatedNetCarbs, 'g net carbs')}
                    </Text>
                    <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: '#3498DB' }}>
                      {formatNutrient(analysis.totalEstimatedProtein, 'g protein')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Meal Type Selector */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 12,
                    color: Colors.textSecondary,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                  }}
                >
                  Meal Type
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {mealTypeOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setSelectedMealType(option.value)}
                      testID={`meal-type-${option.value.toLowerCase()}`}
                      style={{
                        flex: 1,
                        minWidth: '45%',
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: BorderRadius.md,
                        backgroundColor:
                          selectedMealType === option.value ? Colors.green : Colors.surface,
                        borderWidth: 1,
                        borderColor:
                          selectedMealType === option.value ? Colors.green : Colors.border,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 16, marginBottom: 4 }}>{option.icon}</Text>
                      <Text
                        style={{
                          fontFamily: 'DMSans_600SemiBold',
                          fontSize: 12,
                          color:
                            selectedMealType === option.value
                              ? Colors.navy
                              : Colors.textPrimary,
                        }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Date Picker */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 12,
                    color: Colors.textSecondary,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                  }}
                >
                  Date
                </Text>
                <View
                  style={{
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 14,
                      color: Colors.textPrimary,
                    }}
                  >
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: Colors.textTertiary,
                      marginTop: 4,
                    }}
                  >
                    (Today)
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Buttons */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: Colors.border,
                paddingHorizontal: 20,
                paddingVertical: 16,
                gap: 10,
              }}
            >
              <Pressable
                onPress={handleConfirm}
                disabled={isLoading || isConfirming}
                testID="confirm-meal-button"
                style={{
                  backgroundColor: isLoading || isConfirming ? Colors.greenMuted : Colors.green,
                  borderRadius: BorderRadius.md,
                  paddingVertical: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: isLoading || isConfirming ? 0.7 : 1,
                }}
              >
                {isLoading || isConfirming ? (
                  <ActivityIndicator size="small" color={Colors.navy} />
                ) : null}
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 15,
                    color: Colors.navy,
                  }}
                >
                  {isLoading || isConfirming ? 'Logging...' : 'Log Meal'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleLogAndAddMore}
                disabled={isLoading || isConfirming}
                testID="log-and-add-more-button"
                style={{
                  borderWidth: 1.5,
                  borderColor: Colors.green,
                  borderRadius: BorderRadius.md,
                  paddingVertical: 12,
                  alignItems: 'center',
                  opacity: isLoading || isConfirming ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 15,
                    color: Colors.green,
                  }}
                >
                  Log & Add More
                </Text>
              </Pressable>

              <Pressable
                onPress={onClose}
                disabled={isLoading || isConfirming}
                testID="cancel-confirmation-button"
                style={{
                  paddingVertical: 12,
                  alignItems: 'center',
                  opacity: isLoading || isConfirming ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 14,
                    color: Colors.textSecondary,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
