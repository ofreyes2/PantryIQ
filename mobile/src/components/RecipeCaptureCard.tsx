import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { BookmarkPlus, Clock, AlertCircle } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

interface RecipeCaptureCardProps {
  recipeName: string;
  servingTime?: string;
  netCarbs: number;
  description: string;
  onSaveRecipe: () => void;
  onSaveTip: () => void;
  onNotNow: () => void;
  isLoading?: boolean;
  error?: string;
}

export function RecipeCaptureCard({
  recipeName,
  servingTime,
  netCarbs,
  description,
  onSaveRecipe,
  onSaveTip,
  onNotNow,
  isLoading,
  error,
}: RecipeCaptureCardProps) {
  const [selectedAction, setSelectedAction] = useState<'save' | 'tip' | null>(null);

  return (
    <View
      testID="recipe-capture-card"
      style={{
        backgroundColor: Colors.navyCard,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderColor: Colors.green,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 12,
        ...Shadows.card,
      }}
    >
      {/* Header with save icon */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <BookmarkPlus size={20} color={Colors.green} style={{ marginRight: 8 }} />
        <Text
          style={{
            flex: 1,
            fontFamily: 'DMSans_700Bold',
            fontSize: 15,
            color: Colors.textPrimary,
          }}
        >
          Save This to Your Recipes?
        </Text>
      </View>

      {/* Recipe name */}
      <Text
        style={{
          fontFamily: 'DMSans_700Bold',
          fontSize: 16,
          color: Colors.green,
          marginBottom: 8,
        }}
      >
        {recipeName}
      </Text>

      {/* Serving time and carbs */}
      {servingTime ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Clock size={14} color={Colors.textTertiary} />
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary }}>
              {servingTime}
            </Text>
          </View>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.amber }}>
            {netCarbs}g net carbs
          </Text>
        </View>
      ) : null}

      {/* Description */}
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 13,
          color: Colors.textSecondary,
          lineHeight: 18,
          marginBottom: 12,
        }}
        numberOfLines={2}
      >
        {description}
      </Text>

      {/* Error state */}
      {error ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            borderRadius: BorderRadius.md,
            padding: 8,
            marginBottom: 12,
            gap: 8,
          }}
        >
          <AlertCircle size={16} color="#E74C3C" />
          <Text
            style={{
              flex: 1,
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: '#E74C3C',
            }}
          >
            {error}
          </Text>
        </View>
      ) : null}

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          testID="recipe-capture-save-recipe"
          onPress={() => {
            setSelectedAction('save');
            onSaveRecipe();
          }}
          disabled={isLoading}
          style={{
            flex: 1,
            backgroundColor: Colors.green,
            borderRadius: BorderRadius.full,
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading && selectedAction === 'save' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#fff' }}>
              Save Recipe
            </Text>
          )}
        </Pressable>

        <Pressable
          testID="recipe-capture-save-tip"
          onPress={() => {
            setSelectedAction('tip');
            onSaveTip();
          }}
          disabled={isLoading}
          style={{
            flex: 1,
            backgroundColor: Colors.surface,
            borderRadius: BorderRadius.full,
            borderWidth: 1,
            borderColor: Colors.border,
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading && selectedAction === 'tip' ? (
            <ActivityIndicator size="small" color={Colors.textSecondary} />
          ) : (
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textSecondary }}>
              Save as Tip
            </Text>
          )}
        </Pressable>

        <Pressable
          testID="recipe-capture-not-now"
          onPress={onNotNow}
          disabled={isLoading}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 12,
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textTertiary }}>
            Not Now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
