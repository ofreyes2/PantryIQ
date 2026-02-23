import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';
import { Check, X } from 'lucide-react-native';

type CardStatus = 'pending' | 'loading' | 'success' | 'failure';

interface MealUpdateConfirmationCardProps {
  action: 'move' | 'edit' | 'delete';
  entryName: string;
  details: {
    fromMealType?: string;
    toMealType?: string;
    changedFields?: string[];
  };
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  status?: CardStatus;
  errorMessage?: string;
}

export function MealUpdateConfirmationCard({
  action,
  entryName,
  details,
  onConfirm,
  onCancel,
  isLoading = false,
  status = 'pending',
  errorMessage,
}: MealUpdateConfirmationCardProps) {
  // Determine styling based on action and status
  const getCardStyle = () => {
    const baseStyle = {
      borderRadius: BorderRadius.lg,
      borderWidth: 2,
      marginHorizontal: 16,
      marginVertical: 12,
      overflow: 'hidden' as const,
      ...Shadows.elevated,
    };

    // Purple theme for updates (instead of green for logging)
    const purpleColor = '#8B5CF6';
    const purpleLightBg = 'rgba(139, 92, 246, 0.1)';

    switch (status) {
      case 'pending':
        return {
          ...baseStyle,
          backgroundColor: Colors.surface,
          borderColor: purpleColor,
        };
      case 'loading':
        return {
          ...baseStyle,
          backgroundColor: purpleLightBg,
          borderColor: purpleColor,
          opacity: 0.8,
        };
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          borderColor: purpleColor,
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
    const actionNames = {
      move: 'Moving',
      edit: 'Updating',
      delete: 'Removing',
    };

    switch (status) {
      case 'pending':
        return `📋 Meal Log Update`;
      case 'loading':
        return `${actionNames[action]}...`;
      case 'success':
        return `${actionNames[action]} Complete ✓`;
      case 'failure':
        return `Failed to ${action}`;
      default:
        return '📋 Meal Log Update';
    }
  };

  const getHeaderColor = () => {
    const purpleColor = '#8B5CF6';
    switch (status) {
      case 'success':
        return Colors.green;
      case 'failure':
        return '#E74C3C';
      default:
        return purpleColor;
    }
  };

  const getActionDescription = () => {
    switch (action) {
      case 'move':
        return `Moving: ${entryName}\nFrom ${details.fromMealType} to ${details.toMealType}`;
      case 'edit':
        return `Updating: ${entryName}${details.changedFields && details.changedFields.length > 0 ? `\nChanged: ${details.changedFields.join(', ')}` : ''}`;
      case 'delete':
        return `Removing: ${entryName}\nfrom ${details.fromMealType}`;
      default:
        return entryName;
    }
  };

  return (
    <View style={getCardStyle()}>
      {/* Header */}
      <View
        style={{
          backgroundColor: status === 'failure' ? 'rgba(231, 76, 60, 0.1)' : 'rgba(139, 92, 246, 0.08)',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: status === 'failure' ? '#E74C3C' : '#8B5CF6',
        }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 14,
            color: getHeaderColor(),
            marginBottom: 4,
          }}
        >
          {getHeaderText()}
        </Text>
      </View>

      {/* Details */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 14,
            color: Colors.textPrimary,
            lineHeight: 20,
            marginBottom: 12,
          }}
        >
          {getActionDescription()}
        </Text>

        {errorMessage ? (
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 13,
              color: '#E74C3C',
              lineHeight: 18,
              marginBottom: 12,
            }}
          >
            {errorMessage}
          </Text>
        ) : null}

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={onConfirm}
            disabled={isLoading || status === 'success'}
            style={{
              flex: 1,
              backgroundColor: status === 'success' ? Colors.green : '#8B5CF6',
              borderRadius: BorderRadius.full,
              paddingVertical: 12,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              opacity: isLoading || status === 'success' ? 0.7 : 1,
            }}
          >
            {isLoading ? <ActivityIndicator size="small" color="#fff" /> : null}
            {status === 'success' ? <Check size={16} color="#fff" /> : null}
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 14,
                color: '#fff',
              }}
            >
              {status === 'success' ? 'Confirmed' : 'Confirm'}
            </Text>
          </Pressable>

          <Pressable
            onPress={onCancel}
            disabled={isLoading || status === 'success'}
            style={{
              flex: 1,
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.full,
              borderWidth: 1,
              borderColor: Colors.border,
              paddingVertical: 12,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              opacity: isLoading || status === 'success' ? 0.5 : 1,
            }}
          >
            <X size={16} color={Colors.textSecondary} />
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 14,
                color: Colors.textSecondary,
              }}
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
