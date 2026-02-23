import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';
import { dateUtils } from '@/lib/dateUtils';
import { Check, X, Calendar } from 'lucide-react-native';

type CardStatus = 'pending' | 'logging' | 'success' | 'failure';

interface DateAwareMealConfirmationCardProps {
  targetDate: string; // YYYY-MM-DD
  displayDate: string; // "Today", "Yesterday", or specific day name
  mealType: string; // "Breakfast", "Lunch", "Dinner", "Snacks"
  entryName: string;
  totalCalories: number;
  totalNetCarbs: number;
  totalProtein: number;
  totalFat: number;
  onConfirm: () => void;
  onChangeDate: () => void;
  isLoading?: boolean;
  status?: CardStatus;
  errorMessage?: string;
  onRetry?: () => void;
}

export function DateAwareMealConfirmationCard({
  targetDate,
  displayDate,
  mealType,
  entryName,
  totalCalories,
  totalNetCarbs,
  totalProtein,
  totalFat,
  onConfirm,
  onChangeDate,
  isLoading = false,
  status = 'pending',
  errorMessage,
  onRetry,
}: DateAwareMealConfirmationCardProps) {
  const isPastDate = dateUtils.isPast(targetDate);
  const isToday = dateUtils.isToday(targetDate);

  // Determine header color based on date
  const getHeaderColor = () => {
    if (status === 'success') return Colors.green;
    if (status === 'failure') return '#E74C3C';
    if (isPastDate && !dateUtils.isYesterday(targetDate)) return '#F39C12'; // Amber for old dates
    if (isToday) return Colors.green;
    return Colors.textPrimary;
  };

  // Determine card border color
  const getBorderColor = () => {
    switch (status) {
      case 'success':
        return Colors.green;
      case 'failure':
        return '#E74C3C';
      case 'logging':
        return Colors.green;
      case 'pending':
        if (isPastDate && !dateUtils.isYesterday(targetDate)) return '#F39C12';
        if (isToday) return Colors.green;
        return Colors.navy;
      default:
        return Colors.navy;
    }
  };

  // Get header text based on status
  const getHeaderText = () => {
    switch (status) {
      case 'pending':
        return isPastDate && !dateUtils.isYesterday(targetDate) ? 'Updating Past Date' : 'Ready to Log';
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

  // Get warning message for past dates
  const getWarningMessage = () => {
    if (isPastDate && !dateUtils.isYesterday(targetDate)) {
      return 'This will update an earlier date';
    }
    return null;
  };

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View
      testID="date-aware-meal-confirmation-card"
      style={{
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        borderColor: getBorderColor(),
        marginHorizontal: 16,
        marginVertical: 12,
        overflow: 'hidden',
        ...Shadows.elevated,
        backgroundColor: status === 'failure'
          ? 'rgba(231, 76, 60, 0.1)'
          : status === 'success'
          ? 'rgba(46, 204, 113, 0.1)'
          : Colors.surface,
        opacity: status === 'logging' ? 0.7 : 1,
      }}
    >
      {/* Header with status and date info */}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          {status === 'success' && <Check size={20} color={Colors.green} />}
          {status === 'failure' && <X size={20} color="#E74C3C" />}
          {status === 'logging' && <ActivityIndicator size="small" color={Colors.green} />}
          {status === 'pending' && <Calendar size={20} color={getHeaderColor()} />}

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 13,
                color: getHeaderColor(),
              }}
            >
              {getHeaderText()}
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 11,
                color: Colors.textSecondary,
                marginTop: 2,
              }}
            >
              {mealType}
            </Text>
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

      {/* Date information - prominently displayed */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          backgroundColor: isPastDate && !dateUtils.isYesterday(targetDate)
            ? 'rgba(243, 156, 18, 0.1)'
            : isToday
            ? 'rgba(46, 204, 113, 0.05)'
            : Colors.navyCard,
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
          {displayDate}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: Colors.textSecondary,
          }}
        >
          {dateUtils.fullDateTime(targetDate)}
        </Text>

        {/* Warning for past dates */}
        {getWarningMessage() && (
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 11,
              color: '#F39C12',
              marginTop: 6,
            }}
          >
            ⚠ {getWarningMessage()}
          </Text>
        )}
      </View>

      {/* Entry details */}
      {status !== 'logging' && status !== 'success' && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 14,
              color: Colors.textPrimary,
              marginBottom: 6,
            }}
          >
            {entryName}
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: Colors.textSecondary,
            }}
          >
            {totalCalories} cal • {totalNetCarbs}g net carbs • {totalProtein}g protein • {totalFat}g fat
          </Text>
        </View>
      )}

      {/* Nutrition summary row */}
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
          }}
        >
          {totalCalories} cal • {totalNetCarbs}g carbs • {totalProtein}g protein
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
            testID="done-button"
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
              Done
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
              testID="cancel-button"
              onPress={onChangeDate}
              style={{
                flex: 1,
                backgroundColor: Colors.navy,
                borderRadius: BorderRadius.lg,
                paddingVertical: 11,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 14,
                  color: Colors.textPrimary,
                }}
              >
                Cancel
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              testID="confirm-button"
              onPress={onConfirm}
              disabled={isLoading || status === 'logging'}
              style={{
                flex: 1,
                backgroundColor: Colors.green,
                borderRadius: BorderRadius.lg,
                paddingVertical: 11,
                alignItems: 'center',
                opacity: isLoading || status === 'logging' ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 14,
                  color: '#fff',
                }}
              >
                Save to Log
              </Text>
            </Pressable>
            <Pressable
              testID="change-date-button"
              onPress={onChangeDate}
              disabled={isLoading || status === 'logging'}
              style={{
                flex: 1,
                backgroundColor: Colors.navy,
                borderRadius: BorderRadius.lg,
                paddingVertical: 11,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: Colors.green,
                opacity: isLoading || status === 'logging' ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 14,
                  color: Colors.green,
                }}
              >
                Change Date
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
