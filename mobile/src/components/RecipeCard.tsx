import React from 'react';
import { View, Text, Pressable, ScrollView, TouchableOpacity, Modal, Share, Image, Linking, ActivityIndicator } from 'react-native';
import { useRecipesStore } from '@/lib/stores/recipesStore';
import { Clock, Users, Flame, AlertCircle, Heart, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Shadows, Spacing } from '@/constants/theme';
import { openURL } from '@/lib/messageFormatter';
import * as Haptics from 'expo-haptics';
import { useToast } from './Toast';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as MediaLibrary from 'expo-media-library';

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
  onCookNow?: (recipe: any) => void;
  onAddToShoppingList?: (ingredients: string[]) => void;
}

/**
 * Get emoji based on recipe name keywords
 */
const getCategoryEmoji = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('chicken')) return '🍗';
  if (lower.includes('beef') || lower.includes('steak')) return '🥩';
  if (lower.includes('pork') || lower.includes('bacon')) return '🥓';
  if (lower.includes('egg')) return '🍳';
  if (lower.includes('salad')) return '🥗';
  if (lower.includes('soup')) return '🍲';
  if (lower.includes('fish') || lower.includes('salmon')) return '🐟';
  if (lower.includes('taco') || lower.includes('wrap')) return '🌮';
  if (lower.includes('pizza')) return '🍕';
  if (lower.includes('burger')) return '🍔';
  return '🍽️';
};

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
  onCookNow,
  onAddToShoppingList,
}: RecipeCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [descExpanded, setDescExpanded] = React.useState(false);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [savedToBox, setSavedToBox] = React.useState(false);
  const [showShareOptions, setShowShareOptions] = React.useState(false);
  const { showToast } = useToast();
  const cardRef = React.useRef(null);

  // Check if this recipe exists in store to show correct heart state
  const recipes = useRecipesStore((s) => s.recipes);
  const addRecipe = useRecipesStore((s) => s.addRecipe);
  const toggleFavorite: any = useRecipesStore((s) => s.toggleFavorite);

  const existingRecipe = recipes.find(
    (r) => r.title.toLowerCase() === recipeName.toLowerCase()
  );
  const isSaved = !!existingRecipe;

  // Initialize favorite state from store
  React.useEffect(() => {
    if (existingRecipe) {
      setIsFavorite(existingRecipe.isFavorite || false);
      setSavedToBox(true);
    }
  }, [existingRecipe]);

  const handleSaveToRecipeBox = async () => {
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
          difficulty: (difficulty || 2) as 1 | 2 | 3 | 4 | 5,
          netCarbsPerServing,
          caloriesPerServing,
          proteinPerServing: 0,
          fatPerServing: 0,
          category: 'User Created',
          tags: ['chef-claude'],
          isFavorite: isFavorite,
          isUserCreated: true,
        });

        setSavedToBox(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Saved to Recipe Box ✓', 'success');
      } else {
        showToast('Already saved to Recipe Box', 'info');
        setSavedToBox(true);
      }

      onSave?.();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Could not save — please try again', 'error');
      console.error('Failed to save recipe:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const openYouTubeSearch = (name: string) => {
    try {
      const searchQuery = encodeURIComponent(name + ' keto recipe how to make');
      const youtubeUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
      Linking.openURL(youtubeUrl);
    } catch (error) {
      showToast('Could not open YouTube', 'error');
      console.error('YouTube link error:', error);
    }
  };

  const toggleFavoriteHeart = async () => {
    try {
      const newFavoriteState = !isFavorite;
      setIsFavorite(newFavoriteState);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // If recipe is already in store, update favorite status there
      if (existingRecipe) {
        toggleFavorite(existingRecipe.id);
      } else if (newFavoriteState) {
        // If favoriting before saving to box, mark the flag
        // It will be saved with isFavorite=true when user hits Save to Recipe Box
      }

      showToast(
        newFavoriteState ? '❤️ Added to Favorites' : 'Removed from Favorites',
        'success'
      );
    } catch (error) {
      setIsFavorite(!isFavorite);
      showToast('Could not update favorite', 'error');
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleShareRecipe = () => {
    setShowShareOptions(true);
  };

  const shareAsImage = async () => {
    setShowShareOptions(false);
    try {
      showToast('Preparing image...');

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Share ${recipeName}`,
          UTI: 'public.png',
        });
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(uri);
          showToast('Recipe card saved to Photos ✓', 'success');
        }
      }
    } catch (error) {
      console.error('Share image error:', error);
      showToast('Could not share image — try sharing as text instead', 'error');
    }
  };

  const shareAsPDF = async () => {
    setShowShareOptions(false);
    try {
      showToast('Creating PDF...');

      const ingredientsList = (ingredients || [])
        .map((i) => `<li style="margin-bottom: 6px; color: #333;">${i}</li>`)
        .join('');

      const instructionsList = (instructions || [])
        .map(
          (step, idx) => `
        <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
          <span style="
            background: #2ECC71;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            margin-right: 12px;
            flex-shrink: 0;
            line-height: 24px;
            text-align: center;
          ">${idx + 1}</span>
          <span style="color: #333; font-size: 14px; line-height: 1.6;">${step}</span>
        </div>
      `
        )
        .join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              margin: 0;
              padding: 0;
              background: white;
            }
            .header {
              background: linear-gradient(135deg, #0A1628, #1A2B4A);
              padding: 32px 24px;
              color: white;
            }
            .app-badge {
              display: inline-block;
              background: #2ECC71;
              color: #0A1628;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 2px;
              padding: 4px 12px;
              border-radius: 20px;
              margin-bottom: 12px;
              text-transform: uppercase;
            }
            .recipe-name {
              font-size: 28px;
              font-weight: 800;
              color: white;
              margin: 0 0 8px 0;
              line-height: 1.2;
            }
            .description {
              color: rgba(255,255,255,0.7);
              font-size: 14px;
              line-height: 1.6;
              margin: 0;
            }
            .stats-row {
              display: flex;
              gap: 16px;
              padding: 20px 24px;
              background: #f8f9fa;
              border-bottom: 1px solid #eee;
              flex-wrap: wrap;
            }
            .stat-pill {
              background: white;
              border: 1px solid #e0e0e0;
              border-radius: 20px;
              padding: 6px 14px;
              font-size: 13px;
              color: #333;
              font-weight: 600;
            }
            .stat-pill.green { color: #2ECC71; border-color: #2ECC71; }
            .content {
              padding: 24px;
            }
            .section-title {
              font-size: 13px;
              font-weight: 800;
              color: #0A1628;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 14px;
              margin-top: 24px;
            }
            .ingredients-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .ingredients-list li::before {
              content: "●";
              color: #2ECC71;
              font-size: 8px;
              margin-right: 10px;
              vertical-align: middle;
            }
            .footer {
              margin-top: 32px;
              padding: 16px 24px;
              background: #f8f9fa;
              border-top: 1px solid #eee;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .footer-brand {
              font-size: 13px;
              font-weight: 800;
              color: #0A1628;
              letter-spacing: 1px;
            }
            .footer-sub {
              font-size: 11px;
              color: #999;
              margin-top: 2px;
            }
            .footer-carbs {
              font-size: 13px;
              color: #2ECC71;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="app-badge">PantryIQ Recipe</div>
            <h1 class="recipe-name">${recipeName}</h1>
            <p class="description">${description || ''}</p>
          </div>

          <div class="stats-row">
            ${totalTime ? `<span class="stat-pill">⏱ ${totalTime}m</span>` : ''}
            ${netCarbsPerServing ? `<span class="stat-pill green">🥦 ${netCarbsPerServing}g</span>` : ''}
            ${caloriesPerServing ? `<span class="stat-pill">🔥 ${caloriesPerServing} cal</span>` : ''}
            ${equipment ? `<span class="stat-pill">🍳 ${equipment}</span>` : ''}
            ${difficulty ? `<span class="stat-pill">${'⭐'.repeat(difficulty)}</span>` : ''}
          </div>

          <div class="content">
            <div class="section-title">Ingredients</div>
            <ul class="ingredients-list">
              ${ingredientsList}
            </ul>

            <div class="section-title">Instructions</div>
            ${instructionsList}
          </div>

          <div class="footer">
            <div>
              <div class="footer-brand">PANTRYIQ</div>
              <div class="footer-sub">Your Kitchen AI</div>
            </div>
            <div class="footer-carbs">
              ${netCarbsPerServing || '—'} net carbs per serving
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${recipeName}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('Share PDF error:', error);
      showToast('Could not create PDF — try sharing as text instead', 'error');
    }
  };

  const shareAsText = async () => {
    setShowShareOptions(false);
    try {
      const ingredientsText = (ingredients || [])
        .map((i) => `• ${i}`)
        .join('\n');

      const instructionsText = (instructions || [])
        .map((step, idx) => `${idx + 1}. ${step}`)
        .join('\n');

      const message = `
🍽️ ${recipeName}
${description || ''}

⏱ ${totalTime}m  |  🥦 ${netCarbsPerServing}g  |  🔥 ${caloriesPerServing} cal

📋 INGREDIENTS
${ingredientsText}

👨‍🍳 INSTRUCTIONS
${instructionsText}

${crispiness ? `Crispiness: ${'🥨'.repeat(crispiness)}` : ''}
${difficulty ? `Difficulty: ${'⭐'.repeat(difficulty)}` : ''}

Shared from PantryIQ — Your Kitchen AI 🍳
      `.trim();

      await Share.share({
        message,
        title: recipeName,
      });
    } catch (error) {
      if ((error as any).message !== 'The user did not share') {
        showToast('Could not share — please try again', 'error');
      }
    }
  };

  const totalTime = prepTime + cookTime;

  return (
    <>
      <View
        ref={cardRef}
        collapsable={false}
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
      {/* Recipe Image or Placeholder */}
      {imageUrl ? (
        <View style={{ position: 'relative', backgroundColor: '#1a2a3a' }}>
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: '100%',
              height: 200,
              backgroundColor: '#2a3a4a',
            }}
            resizeMode="cover"
            onError={() => console.log('Image failed to load')}
          />
          {/* Gradient overlay for text readability */}
          <LinearGradient
            colors={['transparent', 'rgba(10,22,40,0.95)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
            }}
          />
          {/* Medal badge on image */}
          <View
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontSize: 18 }}>🥇</Text>
          </View>
        </View>
      ) : (
        <View
          style={{
            width: '100%',
            height: 140,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            backgroundColor: '#0D1F3C',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 32 }}>
            {getCategoryEmoji(recipeName)}
          </Text>
          <Text
            style={{
              color: '#2D3748',
              fontSize: 13,
              fontWeight: '600',
            }}
          >
            {recipeName}
          </Text>
        </View>
      )}

      {/* Header with recipe name and action buttons */}
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
            <TouchableOpacity
              onPress={() => setDescExpanded(!descExpanded)}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color: '#A0AEC0',
                  fontSize: 13,
                  lineHeight: 20,
                }}
                numberOfLines={descExpanded ? undefined : 2}
              >
                {description}
              </Text>

              {description && description.length > 80 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 4,
                  }}
                >
                  <Text
                    style={{
                      color: '#2ECC71',
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {descExpanded ? 'Show less' : 'Read more'}
                  </Text>
                  <Text
                    style={{
                      color: '#2ECC71',
                      fontSize: 12,
                    }}
                  >
                    {descExpanded ? '▲' : '▼'}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Heart and Share buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: Spacing.sm }}>
          <Pressable
            onPress={toggleFavoriteHeart}
            disabled={isSaving}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isFavorite ? 'rgba(231, 76, 60, 0.15)' : 'rgba(255,255,255,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: isFavorite ? 'rgba(231, 76, 60, 0.4)' : 'rgba(255,255,255,0.1)',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            <Text style={{ fontSize: 16 }}>
              {isFavorite ? '❤️' : '🤍'}
            </Text>
          </Pressable>

          <TouchableOpacity
            onPress={handleShareRecipe}
            disabled={isSaving}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            <Text style={{ fontSize: 16 }}>↗️</Text>
          </TouchableOpacity>
        </View>
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

      {/* Action buttons — single row of 4 */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          padding: 10,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {/* Save to Recipe Box */}
          <TouchableOpacity
            onPress={handleSaveToRecipeBox}
            style={{
              flex: 1,
              backgroundColor: savedToBox ? '#27AE60' : '#1A3A2A',
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              borderWidth: 1,
              borderColor: savedToBox ? '#27AE60' : '#2ECC71',
            }}
          >
            <Text style={{ fontSize: 14 }}>
              {savedToBox ? '✓' : '💾'}
            </Text>
            <Text
              style={{
                color: '#2ECC71',
                fontSize: 9,
                fontWeight: '800',
                textAlign: 'center',
              }}
            >
              {savedToBox ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>

          {/* YouTube */}
          <TouchableOpacity
            onPress={() => openYouTubeSearch(recipeName)}
            style={{
              flex: 1,
              backgroundColor: '#CC0000',
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            <Text style={{ fontSize: 14 }}>▶️</Text>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 9,
                fontWeight: '800',
              }}
            >
              YouTube
            </Text>
          </TouchableOpacity>

          {/* Cook Now */}
          <TouchableOpacity
            onPress={() => onCookNow && onCookNow({
              title: recipeName,
              description: description,
              ingredients,
              instructions,
              prepTime,
              cookTime,
              servings,
              netCarbsPerServing,
              caloriesPerServing,
              difficulty: (difficulty || 2) as 1 | 2 | 3 | 4 | 5,
            })}
            style={{
              flex: 1,
              backgroundColor: '#0A1628',
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              borderWidth: 1,
              borderColor: '#2ECC71',
            }}
          >
            <Text style={{ fontSize: 14 }}>👨‍🍳</Text>
            <Text
              style={{
                color: '#2ECC71',
                fontSize: 9,
                fontWeight: '800',
              }}
            >
              Cook Now
            </Text>
          </TouchableOpacity>

          {/* Add to List */}
          <TouchableOpacity
            onPress={() => onAddToShoppingList && onAddToShoppingList(ingredients)}
            style={{
              flex: 1,
              backgroundColor: '#0A1628',
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              borderWidth: 1,
              borderColor: '#4A6FA5',
            }}
          >
            <Text style={{ fontSize: 14 }}>🛒</Text>
            <Text
              style={{
                color: '#A0AEC0',
                fontSize: 9,
                fontWeight: '800',
              }}
            >
              Add to List
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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

      {/* Share Options Bottom Sheet */}
      <Modal
        visible={showShareOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareOptions(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setShowShareOptions(false)}
          activeOpacity={1}
        >
          <TouchableOpacity activeOpacity={1}>
            <View
              style={{
                backgroundColor: '#152033',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: 40,
              }}
            >
              {/* Handle bar */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: '#2D3748',
                  borderRadius: 2,
                  alignSelf: 'center',
                  marginBottom: 20,
                }}
              />

              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontWeight: '700',
                  marginBottom: 6,
                }}
              >
                Share Recipe
              </Text>
              <Text
                style={{
                  color: '#A0AEC0',
                  fontSize: 13,
                  marginBottom: 24,
                }}
              >
                {recipeName}
              </Text>

              {/* Share as Image */}
              <TouchableOpacity
                onPress={() => shareAsImage()}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#1A2B4A',
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 10,
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: '#2ECC71',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22 }}>🖼️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                  >
                    Share as Image
                  </Text>
                  <Text
                    style={{
                      color: '#A0AEC0',
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Beautiful recipe card — perfect for Messages or Instagram
                  </Text>
                </View>
                <Text style={{ color: '#4A6FA5', fontSize: 18 }}>›</Text>
              </TouchableOpacity>

              {/* Share as PDF */}
              <TouchableOpacity
                onPress={() => shareAsPDF()}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#1A2B4A',
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 10,
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: '#E74C3C',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22 }}>📄</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                  >
                    Share as PDF
                  </Text>
                  <Text
                    style={{
                      color: '#A0AEC0',
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Full recipe document — great for email or saving to Files
                  </Text>
                </View>
                <Text style={{ color: '#4A6FA5', fontSize: 18 }}>›</Text>
              </TouchableOpacity>

              {/* Share as Text */}
              <TouchableOpacity
                onPress={() => shareAsText()}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#1A2B4A',
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 20,
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: '#4A6FA5',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22 }}>💬</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                  >
                    Share as Text
                  </Text>
                  <Text
                    style={{
                      color: '#A0AEC0',
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Plain text recipe — works in any messaging app instantly
                  </Text>
                </View>
                <Text style={{ color: '#4A6FA5', fontSize: 18 }}>›</Text>
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity
                onPress={() => setShowShareOptions(false)}
                style={{
                  backgroundColor: '#0A1628',
                  borderRadius: 14,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#A0AEC0',
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
