import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRecipesStore } from '@/lib/stores/recipesStore';
import { Clock, Users, Flame, AlertCircle, Heart, ChevronDown } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '@/constants/theme';
import { openURL } from '@/lib/messageFormatter';
import * as Haptics from 'expo-haptics';

interface RecipeCardProps {
  recipeName: string;
  ingredients: string[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  netCarbsPerServing: number;
  caloriesPerServing: number;
  description?: string;
  difficulty?: number;
  crispiness?: number;
  equipment?: string;
  videoUrl?: string;
  imageUrl?: string;
  onSave?: () => void;
}

export function RecipeCard({
  recipeName,
  ingredients,
  instructions,
  prepTime,
  cookTime,
  servings,
  netCarbsPerServing,
  caloriesPerServing,
  description,
  difficulty,
  crispiness,
  equipment,
  videoUrl,
  imageUrl,
  onSave,
}: RecipeCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Check if this recipe exists in store to show correct heart state
  const recipes = useRecipesStore((s) => s.recipes);
  const addRecipe = useRecipesStore((s) => s.addRecipe);
  const toggleFavorite = useRecipesStore((s) => s.toggleFavorite);

  const existingRecipe = recipes.find(
    (r) => r.title.toLowerCase() === recipeName.toLowerCase()
  );
  const isSaved = !!existingRecipe;

  const handleSave = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsSaving(true);

      if (!isSaved) {
        // Create and save new recipe
        addRecipe({
          title: recipeName,
          description: description || 'Recipe from Chef Claude',
          ingredients: ingredients.map((ingredient) => {
            // Parse ingredient string to extract name, quantity, unit
            const match = ingredient.match(/^([\d./\s]+)?\s*([a-zA-Z]*)\s+(.+)$/);
            if (match) {
              return {
                name: match[3] || ingredient,
                quantity: match[1]?.trim() || '1',
                unit: match[2]?.trim() || 'serving',
                optional: false,
              };
            }
            return {
              name: ingredient,
              quantity: '1',
              unit: 'serving',
              optional: false,
            };
          }),
          instructions,
          prepTime,
          cookTime,
          servings,
          difficulty: 2,
          netCarbsPerServing,
          caloriesPerServing,
          proteinPerServing: 0,
          fatPerServing: 0,
          category: 'User Created',
          tags: ['chef-claude'],
          isFavorite: true,
          isUserCreated: true,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Just toggle favorite if already exists
        toggleFavorite(existingRecipe.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      onSave?.();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Failed to save recipe:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const totalTime = prepTime + cookTime;

  return (
    <View
      style={{
        backgroundColor: Colors.navyCard,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderColor: Colors.green,
        overflow: 'hidden',
        marginHorizontal: Spacing.md,
        marginVertical: Spacing.sm,
        ...Shadows.card,
      }}
    >
      {/* Header with recipe name and save button */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 16,
              color: Colors.green,
              marginBottom: 4,
            }}
          >
            {recipeName}
          </Text>
          {description ? (
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 12,
                color: Colors.textSecondary,
              }}
              numberOfLines={1}
            >
              {description}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={{
            width: 40,
            height: 40,
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: Spacing.sm,
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          <Heart
            size={18}
            color={isSaved ? '#E74C3C' : Colors.textSecondary}
            fill={isSaved ? '#E74C3C' : 'transparent'}
          />
        </Pressable>
      </View>

      {/* Quick info row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          gap: Spacing.sm,
          flexWrap: 'wrap',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Clock size={14} color={Colors.textSecondary} />
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary }}>
            {totalTime}m
          </Text>
        </View>

        <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: Colors.border }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Users size={14} color={Colors.textSecondary} />
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary }}>
            {servings} servings
          </Text>
        </View>

        <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: Colors.border }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Flame size={14} color={Colors.amber} />
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.amber }}>
            {netCarbsPerServing}g net carbs
          </Text>
        </View>
      </View>

      {/* Expandable content */}
      {isExpanded ? (
        <>
          {/* Ingredients */}
          <View style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textPrimary, marginBottom: 8 }}>
              Ingredients
            </Text>
            {ingredients.map((ingredient, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  backgroundColor: Colors.navy,
                  borderRadius: BorderRadius.md,
                  marginBottom: idx < ingredients.length - 1 ? 6 : 0,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.green, marginRight: 8 }}>
                  •
                </Text>
                <Text style={{ flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                  {ingredient}
                </Text>
              </View>
            ))}
          </View>

          {/* Instructions */}
          <View style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textPrimary, marginBottom: 8 }}>
              Instructions
            </Text>
            {instructions.map((instruction, idx) => (
              <View key={idx} style={{ marginBottom: idx < instructions.length - 1 ? 12 : 0 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 12,
                      color: Colors.green,
                      minWidth: 24,
                    }}
                  >
                    {idx + 1}.
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: Colors.textSecondary,
                      lineHeight: 18,
                    }}
                  >
                    {instruction}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Nutrition info */}
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.sm,
              borderTopWidth: 1,
              borderTopColor: Colors.border,
              gap: Spacing.md,
              flexWrap: 'wrap',
            }}
          >
            <View style={{ flex: 1, minWidth: 100 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.textTertiary, marginBottom: 4 }}>
                Calories
              </Text>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.green }}>
                {caloriesPerServing}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 100 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.textTertiary, marginBottom: 4 }}>
                Net Carbs
              </Text>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.amber }}>
                {netCarbsPerServing}g
              </Text>
            </View>
            {difficulty ? (
              <View style={{ flex: 1, minWidth: 100 }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.textTertiary, marginBottom: 4 }}>
                  Difficulty
                </Text>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.amber }}>
                  {'⭐'.repeat(difficulty)}
                </Text>
              </View>
            ) : null}
            {crispiness ? (
              <View style={{ flex: 1, minWidth: 100 }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.textTertiary, marginBottom: 4 }}>
                  Crispiness
                </Text>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#F39C12' }}>
                  {'🥨'.repeat(crispiness)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Equipment info */}
          {equipment ? (
            <View style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }}>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textPrimary, marginBottom: 8 }}>
                Equipment
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                {equipment}
              </Text>
            </View>
          ) : null}

          {/* Video link */}
          {videoUrl ? (
            <View style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }}>
              <Pressable
                onPress={() => openURL(videoUrl)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.green }}>
                  📺 Watch Cooking Video
                </Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}

      {/* Expand/Collapse button */}
      <Pressable
        onPress={() => {
          setIsExpanded(!isExpanded);
          Haptics.selectionAsync();
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: Spacing.sm,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          backgroundColor: Colors.surface,
        }}
      >
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary, marginRight: 6 }}>
          {isExpanded ? 'Hide Details' : 'View Recipe'}
        </Text>
        <ChevronDown
          size={14}
          color={Colors.textSecondary}
          style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>
    </View>
  );
}
