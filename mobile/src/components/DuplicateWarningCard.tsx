import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';
import type { FoodEntry } from '@/lib/stores/mealsStore';

interface DuplicateWarningCardProps {
  foodName: string;
  mealType: string;
  existingEntry?: FoodEntry & { id: string };
  onLogAgain: () => void;
  onUpdateExisting: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DuplicateWarningCard({
  foodName,
  mealType,
  existingEntry,
  onLogAgain,
  onUpdateExisting,
  onCancel,
  isLoading = false,
}: DuplicateWarningCardProps) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(243, 156, 18, 0.08)',
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(243, 156, 18, 0.3)',
        marginHorizontal: 16,
        marginVertical: 12,
        padding: 14,
        ...Shadows.card,
      }}
      testID="duplicate-warning-card"
    >
      {/* Header with icon */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: BorderRadius.md,
            backgroundColor: 'rgba(243, 156, 18, 0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AlertTriangle size={18} color={Colors.amber} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 14,
              color: Colors.amber,
            }}
          >
            Possible Duplicate
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: Colors.textSecondary,
              marginTop: 2,
            }}
          >
            {foodName} is already logged in {mealType}
          </Text>
        </View>
      </View>

      {/* Existing entry details (if available) */}
      {existingEntry ? (
        <View
          style={{
            backgroundColor: 'rgba(243, 156, 18, 0.05)',
            borderRadius: BorderRadius.md,
            padding: 10,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: 'rgba(243, 156, 18, 0.2)',
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 11,
              color: Colors.textTertiary,
              marginBottom: 4,
            }}
          >
            EXISTING ENTRY
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 12,
              color: Colors.textPrimary,
            }}
          >
            {existingEntry.name}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              marginTop: 6,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 11,
                color: Colors.textSecondary,
              }}
            >
              {Math.round(existingEntry.calories * existingEntry.servings)} cal
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 11,
                color: Colors.amber,
              }}
            >
              {Math.round(existingEntry.netCarbs * existingEntry.servings)}g net carbs
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 11,
                color: Colors.green,
              }}
            >
              {Math.round(existingEntry.protein * existingEntry.servings)}g protein
            </Text>
          </View>
        </View>
      ) : null}

      {/* Action buttons */}
      <View style={{ gap: 8 }}>
        <Pressable
          onPress={onLogAgain}
          disabled={isLoading}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Colors.green,
            borderRadius: BorderRadius.md,
            paddingVertical: 10,
            opacity: isLoading ? 0.6 : 1,
          }}
          testID="duplicate-log-again-button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 13,
                color: '#fff',
              }}
            >
              Log Again
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={onUpdateExisting}
          disabled={isLoading}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.md,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: '#3498DB',
            opacity: isLoading ? 0.6 : 1,
          }}
          testID="duplicate-update-existing-button"
        >
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 13,
              color: '#3498DB',
            }}
          >
            Update Existing
          </Text>
        </Pressable>

        <Pressable
          onPress={onCancel}
          disabled={isLoading}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            borderRadius: BorderRadius.md,
            paddingVertical: 10,
            opacity: isLoading ? 0.6 : 1,
          }}
          testID="duplicate-cancel-button"
        >
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 13,
              color: Colors.textSecondary,
            }}
          >
            Cancel
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
