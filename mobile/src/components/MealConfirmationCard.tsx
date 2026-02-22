import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';
import type { MealAnalysis } from '@/lib/mealAnalysis';
import { getMealTypeEmoji, formatMealType, formatNutrient } from '@/lib/mealAnalysis';
import { Check, X } from 'lucide-react-native';

type CardStatus = 'pending' | 'logging' | 'success' | 'failure';

interface MealConfirmationCardProps {
  analysis: MealAnalysis;
  onConfirm: () => void;
  onEdit: () => void;
  isLoading?: boolean;
  status?: CardStatus;
  errorMessage?: string;
  onRetry?: () => void;
  onLogManually?: () => void;
}

export function MealConfirmationCard({
  analysis,
  onConfirm,
  onEdit,
  isLoading = false,
  status = 'pending',
  errorMessage,
  onRetry,
  onLogManually,
}: MealConfirmationCardProps) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Determine card styling based on status
  const getCardStyle = () => {
    const baseStyle = {
      borderRadius: BorderRadius.lg,
      borderWidth: 2,
      marginHorizontal: 16,
      marginVertical: 12,
      overflow: 'hidden' as const,
      ...Shadows.elevated,
    };

    switch (status) {
      case 'pending':
        return {
          ...baseStyle,
          backgroundColor: Colors.surface,
          borderColor: Colors.navy,
        };
      case 'logging':
        return {
          ...baseStyle,
          backgroundColor: Colors.surface,
          borderColor: Colors.green,
          opacity: 0.7,
        };
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          borderColor: Colors.green,
        };
      case 'failure':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderColor: '#E74C3C',
        };
      default:
        return baseStyle;
    }
  };

  const getHeaderText = () => {
    switch (status) {
      case 'pending':
        return 'Ready to Log';
      case 'logging':
        return 'Logging Meal...';
      case 'success':
        return 'Logged Successfully ✓';
      case 'failure':
        return 'Failed to Log';
      default:
        return 'Ready to Log';
    }
  };

  const getHeaderColor = () => {
    switch (status) {
      case 'success':
        return Colors.green;
      case 'failure':
        return '#E74C3C';
      default:
        return Colors.textPrimary;
    }
  };

  return (
    <View
      testID="meal-confirmation-card"
      style={getCardStyle()}
    >
      {/* Header with status */}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {status === 'success' && (
            <Check size={20} color={Colors.green} />
          )}
          {status === 'failure' && (
            <X size={20} color="#E74C3C" />
          )}
          {status === 'logging' && (
            <ActivityIndicator size="small" color={Colors.green} />
          )}
          {status === 'pending' && (
            <Text style={{ fontSize: 14 }}>{getMealTypeEmoji(analysis.mealType)}</Text>
          )}
          <View>
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 13,
                color: getHeaderColor(),
              }}
            >
              {getHeaderText()}
            </Text>
            {status === 'pending' && (
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 11,
                  color: Colors.green,
                }}
              >
                {formatMealType(analysis.mealType)}
              </Text>
            )}
          </View>
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

      {/* Foods list - hide on success/logging to show compact view */}
      {status !== 'logging' && status !== 'success' && (
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
      )}

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

      {/* Error message - show on failure */}
      {status === 'failure' && errorMessage ? (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: '#E74C3C',
            backgroundColor: 'rgba(231, 76, 60, 0.05)',
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: '#E74C3C',
            }}
          >
            {errorMessage}
          </Text>
        </View>
      ) : null}

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
        {status === 'success' ? (
          <Pressable
            testID="view-in-meal-log-button"
            onPress={onConfirm}
            style={{
              flex: 1,
              backgroundColor: Colors.green,
              borderRadius: BorderRadius.lg,
              paddingVertical: 11,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 14,
                color: '#fff',
              }}
            >
              View in Meal Log
            </Text>
          </Pressable>
        ) : status === 'failure' ? (
          <>
            <Pressable
              testID="try-again-button"
              onPress={onRetry}
              disabled={!onRetry}
              style={{
                flex: 1,
                backgroundColor: Colors.green,
                borderRadius: BorderRadius.lg,
                paddingVertical: 11,
                alignItems: 'center',
                opacity: onRetry ? 1 : 0.5,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 14,
                  color: '#fff',
                }}
              >
                Try Again
              </Text>
            </Pressable>
            <Pressable
              testID="log-manually-button"
              onPress={onLogManually}
              disabled={!onLogManually}
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: Colors.green,
                borderRadius: BorderRadius.lg,
                paddingVertical: 11,
                alignItems: 'center',
                opacity: onLogManually ? 1 : 0.5,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 14,
                  color: Colors.green,
                }}
              >
                Log Manually
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              testID="edit-details-button"
              onPress={onEdit}
              disabled={status === 'logging'}
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: Colors.green,
                borderRadius: BorderRadius.lg,
                paddingVertical: 11,
                alignItems: 'center',
                opacity: status === 'logging' ? 0.6 : 1,
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
              disabled={status === 'logging'}
              style={{
                flex: 1,
                backgroundColor: status === 'logging' ? Colors.greenMuted : Colors.green,
                borderRadius: BorderRadius.lg,
                paddingVertical: 11,
                alignItems: 'center',
                opacity: status === 'logging' ? 0.7 : 1,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 14,
                  color: '#fff',
                }}
              >
                {status === 'logging' ? 'Logging...' : 'Confirm & Select Meal Type'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
