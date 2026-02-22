import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';
import type { MealAnalysis } from '@/lib/mealAnalysis';
import { getMealTypeEmoji, formatMealType, formatNutrient } from '@/lib/mealAnalysis';

interface MealConfirmationCardProps {
  analysis: MealAnalysis;
  onConfirm: () => void;
  onEdit: () => void;
  isLoading?: boolean;
}

export function MealConfirmationCard({
  analysis,
  onConfirm,
  onEdit,
  isLoading = false,
}: MealConfirmationCardProps) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View
      testID="meal-confirmation-card"
      style={{
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        borderColor: Colors.green,
        marginHorizontal: 16,
        marginVertical: 12,
        overflow: 'hidden',
        ...Shadows.elevated,
      }}
    >
      {/* Header with meal type pill */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            backgroundColor: Colors.greenMuted,
            borderRadius: BorderRadius.full,
            paddingHorizontal: 12,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 14 }}>{getMealTypeEmoji(analysis.mealType)}</Text>
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 13,
              color: Colors.green,
              textTransform: 'capitalize',
            }}
          >
            {formatMealType(analysis.mealType)}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: Colors.textTertiary,
          }}
        >
          {time}
        </Text>
      </View>

      {/* Foods list */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border }}>
        {analysis.identifiedFoods.map((food, idx) => (
          <View key={idx} style={{ marginBottom: idx < analysis.identifiedFoods.length - 1 ? 10 : 0 }}>
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 14,
                color: Colors.textPrimary,
              }}
            >
              {food.quantity && food.unit ? `${food.quantity} ${food.unit}` : 'serving'} {food.name}
              {food.cookingMethod ? ` — ${food.cookingMethod}` : ''}
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 12,
                color: Colors.textSecondary,
                marginTop: 3,
              }}
            >
              {formatNutrient(food.estimatedCalories, ' cal')} • {formatNutrient(food.estimatedNetCarbs, 'g carbs')}
            </Text>
          </View>
        ))}
      </View>

      {/* Total row */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          backgroundColor: Colors.navyCard,
        }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 13,
            color: Colors.textPrimary,
            marginBottom: 4,
          }}
        >
          Total: {formatNutrient(analysis.totalEstimatedCalories, ' cal')} • {formatNutrient(analysis.totalEstimatedNetCarbs, 'g net carbs')} • {formatNutrient(analysis.totalEstimatedProtein, 'g protein')}
        </Text>
      </View>

      {/* Buttons */}
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        }}
      >
        <Pressable
          testID="edit-details-button"
          onPress={onEdit}
          disabled={isLoading}
          style={{
            flex: 1,
            borderWidth: 1.5,
            borderColor: Colors.green,
            borderRadius: BorderRadius.lg,
            paddingVertical: 11,
            alignItems: 'center',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 14,
              color: Colors.green,
            }}
          >
            Edit Details
          </Text>
        </Pressable>

        <Pressable
          testID="log-meal-button"
          onPress={onConfirm}
          disabled={isLoading}
          style={{
            flex: 1,
            backgroundColor: isLoading ? Colors.greenMuted : Colors.green,
            borderRadius: BorderRadius.lg,
            paddingVertical: 11,
            alignItems: 'center',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 14,
              color: '#fff',
            }}
          >
            {isLoading ? 'Logging...' : 'Log This Meal'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
