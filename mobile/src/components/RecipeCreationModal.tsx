import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { X, Check } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';
import { useRecipesStore, type Recipe, type RecipeIngredient, type ChefTip } from '@/lib/stores/recipesStore';
import * as Haptics from 'expo-haptics';

interface RecipeCreationModalProps {
  visible: boolean;
  onClose: () => void;
  initialData?: {
    recipeName?: string;
    description?: string;
    ingredients?: string[];
    instructions?: string[];
    servingTime?: string;
    netCarbs?: number;
  };
  saveAsType: 'recipe' | 'tip';
}

export function RecipeCreationModal({
  visible,
  onClose,
  initialData,
  saveAsType,
}: RecipeCreationModalProps) {
  const addRecipe = useRecipesStore((s) => s.addRecipe);
  const addTip = useRecipesStore((s) => s.addTip);

  // Recipe state
  const [recipeName, setRecipeName] = useState(initialData?.recipeName || '');
  const [category, setCategory] = useState('Snacks');
  const [description, setDescription] = useState(initialData?.description || '');
  const [ingredients, setIngredients] = useState<string[]>(initialData?.ingredients || ['']);
  const [instructions, setInstructions] = useState<string[]>(initialData?.instructions || ['']);
  const [servingSize, setServingSize] = useState('1');
  const [netCarbs, setNetCarbs] = useState(initialData?.netCarbs?.toString() || '0');
  const [calories, setCalories] = useState('0');
  const [chefNotes, setChefNotes] = useState('');
  const [tags, setTags] = useState<string[]>(['keto', 'quick']);

  // Tip state (when saveAsType === 'tip')
  const [tipTitle, setTipTitle] = useState(initialData?.recipeName || '');
  const [tipContent, setTipContent] = useState(description);
  const [tipList, setTipList] = useState<string[]>([]);
  const [tipTags, setTipTags] = useState<string[]>(['chef-claude']);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      if (saveAsType === 'tip') {
        if (!tipTitle.trim() || !tipContent.trim()) {
          setError('Title and content are required');
          return;
        }

        const newTip: ChefTip = {
          id: `tip-${Date.now()}`,
          title: tipTitle.trim(),
          content: tipContent.trim(),
          quickList: tipList.length > 0 ? tipList : undefined,
          tags: tipTags,
          createdAt: new Date().toISOString(),
          isFromConversation: true,
        };

        addTip(newTip);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      } else {
        // Save as recipe
        if (!recipeName.trim() || ingredients.filter((i) => i.trim()).length === 0) {
          setError('Recipe name and at least one ingredient are required');
          return;
        }

        const prepTime = parseInt(initialData?.servingTime?.match(/\d+/)?.[0] || '10');
        const parsedNetCarbs = parseInt(netCarbs) || 0;
        const parsedCalories = parseInt(calories) || 0;

        const newRecipe: Omit<Recipe, 'id' | 'dateAdded'> = {
          title: recipeName.trim(),
          description: description.trim() || 'Recipe from Chef Claude',
          category: category,
          prepTime,
          cookTime: 0,
          servings: parseInt(servingSize) || 1,
          difficulty: 2,
          netCarbsPerServing: parsedNetCarbs,
          caloriesPerServing: parsedCalories,
          proteinPerServing: 0,
          fatPerServing: 0,
          tags,
          ingredients: ingredients
            .filter((i) => i.trim())
            .map((ing) => ({
              name: ing.trim(),
              quantity: '1',
              unit: 'serving',
              optional: false,
            })),
          instructions: instructions.filter((i) => i.trim()),
          notes: chefNotes || undefined,
          isFavorite: false,
          isUserCreated: true,
        };

        addRecipe(newRecipe);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [saveAsType, tipTitle, tipContent, tipList, tipTags, recipeName, description, category, ingredients, instructions, servingSize, netCarbs, calories, chefNotes, tags, initialData, addTip, addRecipe, onClose]);

  if (!visible) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.navy }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1, backgroundColor: Colors.navy }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: 'PlayfairDisplay_700Bold',
                fontSize: 18,
                color: Colors.textPrimary,
              }}
            >
              {saveAsType === 'tip' ? 'Save Chef Tip' : 'Save Recipe'}
            </Text>
            <Pressable
              testID="modal-close"
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: Colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} color={Colors.textPrimary} />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {error ? (
              <View
                style={{
                  backgroundColor: 'rgba(231, 76, 60, 0.1)',
                  borderRadius: BorderRadius.md,
                  padding: 12,
                  marginBottom: 12,
                  borderLeftWidth: 3,
                  borderLeftColor: '#E74C3C',
                }}
              >
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#E74C3C' }}>
                  {error}
                </Text>
              </View>
            ) : null}

            {saveAsType === 'tip' ? (
              <>
                {/* Tip Title */}
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 6 }}>
                  Tip Title
                </Text>
                <TextInput
                  testID="tip-title-input"
                  value={tipTitle}
                  onChangeText={setTipTitle}
                  placeholder="e.g., How to Double Fry Chicken"
                  placeholderTextColor={Colors.textTertiary}
                  style={{
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: Colors.textPrimary,
                    marginBottom: 16,
                  }}
                />

                {/* Tip Content */}
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 6 }}>
                  Content
                </Text>
                <TextInput
                  testID="tip-content-input"
                  value={tipContent}
                  onChangeText={setTipContent}
                  placeholder="Describe the tip or technique..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  style={{
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: Colors.textPrimary,
                    textAlignVertical: 'top',
                    marginBottom: 16,
                  }}
                />

                {/* Tip List Items */}
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 6 }}>
                  Quick Tips (Optional)
                </Text>
                {tipList.map((item, idx) => (
                  <TextInput
                    key={idx}
                    value={item}
                    onChangeText={(text) => {
                      const updated = [...tipList];
                      updated[idx] = text;
                      setTipList(updated);
                    }}
                    placeholder={`Tip ${idx + 1}`}
                    placeholderTextColor={Colors.textTertiary}
                    style={{
                      backgroundColor: Colors.surface,
                      borderRadius: BorderRadius.md,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: Colors.textPrimary,
                      marginBottom: 8,
                    }}
                  />
                ))}
                <Pressable
                  testID="add-tip-item"
                  onPress={() => setTipList([...tipList, ''])}
                  style={{
                    paddingVertical: 10,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.green }}>
                    + Add Another Tip
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                {/* Recipe Name */}
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 6 }}>
                  Recipe Name
                </Text>
                <TextInput
                  testID="recipe-name-input"
                  value={recipeName}
                  onChangeText={setRecipeName}
                  placeholder="Recipe name..."
                  placeholderTextColor={Colors.textTertiary}
                  style={{
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: Colors.textPrimary,
                    marginBottom: 16,
                  }}
                />

                {/* Category */}
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 6 }}>
                  Category
                </Text>
                <TextInput
                  testID="recipe-category-input"
                  value={category}
                  onChangeText={setCategory}
                  placeholder="e.g., Snacks, Dinner"
                  placeholderTextColor={Colors.textTertiary}
                  style={{
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: Colors.textPrimary,
                    marginBottom: 16,
                  }}
                />

                {/* Description */}
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 6 }}>
                  Description
                </Text>
                <TextInput
                  testID="recipe-description-input"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="One-line description..."
                  placeholderTextColor={Colors.textTertiary}
                  style={{
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: Colors.textPrimary,
                    marginBottom: 16,
                  }}
                />

                {/* Nutrition Info */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.textTertiary, marginBottom: 6 }}>
                      Net Carbs
                    </Text>
                    <TextInput
                      testID="recipe-netcarbs-input"
                      value={netCarbs}
                      onChangeText={setNetCarbs}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                      style={{
                        backgroundColor: Colors.surface,
                        borderRadius: BorderRadius.md,
                        borderWidth: 1,
                        borderColor: Colors.border,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 13,
                        color: Colors.textPrimary,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.textTertiary, marginBottom: 6 }}>
                      Calories
                    </Text>
                    <TextInput
                      testID="recipe-calories-input"
                      value={calories}
                      onChangeText={setCalories}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                      style={{
                        backgroundColor: Colors.surface,
                        borderRadius: BorderRadius.md,
                        borderWidth: 1,
                        borderColor: Colors.border,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 13,
                        color: Colors.textPrimary,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.textTertiary, marginBottom: 6 }}>
                      Servings
                    </Text>
                    <TextInput
                      testID="recipe-servings-input"
                      value={servingSize}
                      onChangeText={setServingSize}
                      keyboardType="numeric"
                      placeholder="1"
                      placeholderTextColor={Colors.textTertiary}
                      style={{
                        backgroundColor: Colors.surface,
                        borderRadius: BorderRadius.md,
                        borderWidth: 1,
                        borderColor: Colors.border,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 13,
                        color: Colors.textPrimary,
                      }}
                    />
                  </View>
                </View>

                {/* Ingredients */}
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 6 }}>
                  Ingredients
                </Text>
                {ingredients.map((ingredient, idx) => (
                  <TextInput
                    key={idx}
                    testID={`ingredient-input-${idx}`}
                    value={ingredient}
                    onChangeText={(text) => {
                      const updated = [...ingredients];
                      updated[idx] = text;
                      setIngredients(updated);
                    }}
                    placeholder={`Ingredient ${idx + 1}`}
                    placeholderTextColor={Colors.textTertiary}
                    style={{
                      backgroundColor: Colors.surface,
                      borderRadius: BorderRadius.md,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: Colors.textPrimary,
                      marginBottom: 8,
                    }}
                  />
                ))}
                <Pressable
                  testID="add-ingredient"
                  onPress={() => setIngredients([...ingredients, ''])}
                  style={{ paddingVertical: 10, marginBottom: 16 }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.green }}>
                    + Add Ingredient
                  </Text>
                </Pressable>

                {/* Instructions */}
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 6 }}>
                  Instructions
                </Text>
                {instructions.map((instruction, idx) => (
                  <TextInput
                    key={idx}
                    testID={`instruction-input-${idx}`}
                    value={instruction}
                    onChangeText={(text) => {
                      const updated = [...instructions];
                      updated[idx] = text;
                      setInstructions(updated);
                    }}
                    placeholder={`Step ${idx + 1}`}
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    numberOfLines={2}
                    style={{
                      backgroundColor: Colors.surface,
                      borderRadius: BorderRadius.md,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: Colors.textPrimary,
                      textAlignVertical: 'top',
                      marginBottom: 8,
                    }}
                  />
                ))}
                <Pressable
                  testID="add-instruction"
                  onPress={() => setInstructions([...instructions, ''])}
                  style={{ paddingVertical: 10, marginBottom: 16 }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.green }}>
                    + Add Step
                  </Text>
                </Pressable>

                {/* Chef Notes */}
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 6 }}>
                  Chef Notes (Optional)
                </Text>
                <TextInput
                  testID="recipe-notes-input"
                  value={chefNotes}
                  onChangeText={setChefNotes}
                  placeholder="Tips and variations..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  style={{
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 13,
                    color: Colors.textPrimary,
                    textAlignVertical: 'top',
                    marginBottom: 24,
                  }}
                />
              </>
            )}
          </ScrollView>

          {/* Save Button */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: Colors.border,
              backgroundColor: Colors.navy,
            }}
          >
            <Pressable
              testID="recipe-modal-save"
              onPress={handleSave}
              disabled={isLoading}
              style={{
                backgroundColor: Colors.green,
                borderRadius: BorderRadius.full,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Check size={20} color="#fff" />
              )}
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#fff' }}>
                {saveAsType === 'tip' ? 'Save Tip' : 'Save Recipe'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
