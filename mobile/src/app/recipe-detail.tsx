import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Share,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Heart,
  Star,
  Clock,
  Users,
  Flame,
  ChevronRight,
  ShoppingCart,
  Check,
  AlertCircle,
  Share2,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRecipesStore, Recipe } from '@/lib/stores/recipesStore';
import { usePantryStore } from '@/lib/stores/pantryStore';
import { useShoppingStore } from '@/lib/stores/shoppingStore';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  Breakfast: ['#F39C12', '#E67E22'],
  Lunch: ['#27AE60', '#2ECC71'],
  Dinner: ['#2C3E50', '#3498DB'],
  Snack: ['#8E44AD', '#9B59B6'],
  Dessert: ['#E74C3C', '#C0392B'],
  Side: ['#16A085', '#1ABC9C'],
  default: ['#0F2040', '#162645'],
};

function getCategoryGradient(category: string): [string, string] {
  return CATEGORY_GRADIENTS[category] ?? CATEGORY_GRADIENTS.default;
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const recipe = useRecipesStore((s) => s.recipes.find((r) => r.id === id));
  const markViewed = useRecipesStore((s) => s.markViewed);
  const toggleFavorite = useRecipesStore((s) => s.toggleFavorite);
  const updateRecipe = useRecipesStore((s) => s.updateRecipe);
  const pantryItems = usePantryStore((s) => s.items);
  const updatePantryItem = usePantryStore((s) => s.updateItem);
  const addShoppingItem = useShoppingStore((s) => s.addItem);

  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [userNotes, setUserNotes] = useState('');
  const [cookModalVisible, setCookModalVisible] = useState(false);
  const [userRating, setUserRating] = useState(0);

  useEffect(() => {
    if (id) markViewed(id);
  }, [id, markViewed]);

  useEffect(() => {
    if (recipe?.userNotes) setUserNotes(recipe.userNotes);
    if (recipe?.rating) setUserRating(recipe.rating);
  }, [recipe]);

  if (!recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.textSecondary, fontFamily: 'DMSans_400Regular' }}>Recipe not found</Text>
      </View>
    );
  }

  const gradColors = getCategoryGradient(recipe.category);

  const getScaledQuantity = (qty: string): string => {
    if (servingMultiplier === 1) return qty;
    const num = parseFloat(qty);
    if (isNaN(num)) return qty;
    const scaled = num * servingMultiplier;
    return scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1);
  };

  const toggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleStep = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const isInPantry = (ingredientName: string) =>
    pantryItems.some((p) => p.name.toLowerCase().includes(ingredientName.toLowerCase()));

  // Fuzzy match ingredient to pantry item
  const matchToPantry = (ingredientName: string) =>
    pantryItems.find((p) => p.name.toLowerCase().includes(ingredientName.toLowerCase()));

  const handleAddToShoppingList = () => {
    const missing = recipe.ingredients.filter((ing) => !isInPantry(ing.name));
    missing.forEach((ing) => {
      addShoppingItem({
        name: ing.name,
        quantity: parseFloat(ing.quantity) || 1,
        unit: ing.unit,
        category: 'Other',
        store: "Mariano's",
        isChecked: false,
        isRecurring: false,
      });
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Added to Shopping List', `${missing.length} missing ingredient${missing.length !== 1 ? 's' : ''} added.`);
  };

  const handleShare = async () => {
    const ingredientLines = recipe.ingredients
      .map((ing) => `  - ${ing.quantity} ${ing.unit} ${ing.name}`)
      .join('\n');
    const instructionLines = recipe.instructions
      .map((step, i) => `${i + 1}. ${step}`)
      .join('\n');
    const text = `${recipe.title}\n\nIngredients:\n${ingredientLines}\n\nInstructions:\n${instructionLines}`;
    await Share.share({ message: text, title: recipe.title });
  };

  const handleWatchYouTube = () => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.title + ' recipe')}`;
    Linking.openURL(url);
  };

  const handleConfirmCook = () => {
    recipe.ingredients.forEach((ing) => {
      const pantryItem = matchToPantry(ing.name);
      if (pantryItem) {
        const deductAmt = parseFloat(ing.quantity) * servingMultiplier;
        const newQty = Math.max(0, pantryItem.quantity - (isNaN(deductAmt) ? 0 : deductAmt));
        updatePantryItem(pantryItem.id, { quantity: newQty });
      }
    });
    setCookModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRating = (rating: number) => {
    setUserRating(rating);
    updateRecipe(recipe.id, { rating });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }} testID="recipe-detail-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View style={{ height: 280, position: 'relative' }}>
          <LinearGradient
            colors={gradColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', inset: 0 } as never}
          />
          <LinearGradient
            colors={['transparent', Colors.navy]}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 }}
          />
          <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md }}>
              <Pressable
                onPress={() => router.back()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: BorderRadius.full,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                testID="back-button"
              >
                <ArrowLeft size={20} color={Colors.textPrimary} />
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={handleShare}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: BorderRadius.full,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Share2 size={18} color={Colors.textPrimary} />
                </Pressable>
                <Pressable
                  onPress={() => { toggleFavorite(recipe.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: BorderRadius.full,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  testID="favorite-button"
                >
                  <Heart
                    size={18}
                    color={recipe.isFavorite ? '#E74C3C' : Colors.textPrimary}
                    fill={recipe.isFavorite ? '#E74C3C' : 'transparent'}
                  />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>

          <View style={{ position: 'absolute', bottom: 20, left: Spacing.md, right: Spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textPrimary }}>
                  {recipe.category}
                </Text>
              </View>
            </View>
            <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: Colors.textPrimary, lineHeight: 32 }}>
              {recipe.title}
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>
              {recipe.description}
            </Text>
          </View>
        </View>

        {/* Stats Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingVertical: 16, gap: 10 }}
        >
          {[
            { icon: <Clock size={16} color={Colors.amber} />, value: `${recipe.prepTime}m`, label: 'Prep' },
            { icon: <Flame size={16} color={Colors.error} />, value: `${recipe.cookTime}m`, label: 'Cook' },
            { icon: <Users size={16} color={Colors.green} />, value: `${recipe.servings * servingMultiplier}`, label: 'Servings' },
            { icon: <ChevronRight size={16} color={Colors.textSecondary} />, value: `${recipe.netCarbsPerServing}g`, label: 'Net Carbs' },
            { icon: <Flame size={16} color={Colors.amber} />, value: `${recipe.caloriesPerServing}`, label: 'Calories' },
            { icon: <Star size={16} color={Colors.amber} />, value: `${recipe.proteinPerServing}g`, label: 'Protein' },
          ].map((stat, i) => (
            <View
              key={i}
              style={{
                backgroundColor: Colors.navyCard,
                borderRadius: BorderRadius.md,
                paddingHorizontal: 14,
                paddingVertical: 12,
                alignItems: 'center',
                minWidth: 72,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              {stat.icon}
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary, marginTop: 4 }}>
                {stat.value}
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Ingredients */}
        <View style={{ paddingHorizontal: Spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary }}>
              Ingredients
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[1, 2, 4].map((mult) => (
                <Pressable
                  key={mult}
                  onPress={() => setServingMultiplier(mult)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: BorderRadius.full,
                    backgroundColor: servingMultiplier === mult ? Colors.green : Colors.surface,
                    borderWidth: 1,
                    borderColor: servingMultiplier === mult ? Colors.green : Colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 12,
                      color: servingMultiplier === mult ? Colors.navy : Colors.textSecondary,
                    }}
                  >
                    {mult}x
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {recipe.ingredients.map((ing, i) => {
            const inPantry = isInPantry(ing.name);
            const checked = checkedIngredients.has(i);
            return (
              <Pressable
                key={i}
                onPress={() => toggleIngredient(i)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  marginBottom: 6,
                  borderRadius: BorderRadius.md,
                  backgroundColor: checked ? Colors.greenMuted : Colors.navyCard,
                  borderWidth: 1,
                  borderColor: checked ? 'rgba(46,204,113,0.3)' : Colors.border,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: checked ? Colors.green : Colors.border,
                    backgroundColor: checked ? Colors.green : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  {checked ? <Check size={12} color={Colors.navy} /> : null}
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: checked ? Colors.textSecondary : Colors.textPrimary,
                    textDecorationLine: checked ? 'line-through' : 'none',
                  }}
                >
                  {getScaledQuantity(ing.quantity)} {ing.unit} {ing.name}
                  {ing.optional ? ' (optional)' : ''}
                </Text>
                {!inPantry ? (
                  <AlertCircle size={14} color={Colors.error} style={{ marginLeft: 6 }} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Instructions */}
        <View style={{ paddingHorizontal: Spacing.md, marginTop: 24 }}>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary, marginBottom: 14 }}>
            Instructions
          </Text>
          {recipe.instructions.map((step, i) => {
            const done = completedSteps.has(i);
            return (
              <Pressable
                key={i}
                onPress={() => toggleStep(i)}
                style={{
                  backgroundColor: done ? Colors.greenMuted : Colors.navyCard,
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: done ? 'rgba(46,204,113,0.3)' : Colors.border,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: BorderRadius.full,
                    backgroundColor: done ? Colors.green : Colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    marginTop: 1,
                  }}
                >
                  {done ? (
                    <Check size={14} color={Colors.navy} />
                  ) : (
                    <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.textSecondary }}>
                      {i + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 15,
                    color: done ? Colors.textSecondary : Colors.textPrimary,
                    lineHeight: 22,
                    textDecorationLine: done ? 'line-through' : 'none',
                  }}
                >
                  {step}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Notes */}
        {recipe.notes ? (
          <View style={{ paddingHorizontal: Spacing.md, marginTop: 20 }}>
            <View
              style={{
                backgroundColor: Colors.amberMuted,
                borderRadius: BorderRadius.md,
                padding: Spacing.md,
                borderWidth: 1,
                borderColor: 'rgba(243,156,18,0.3)',
              }}
            >
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.amber, marginBottom: 6 }}>
                Chef's Notes
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 20 }}>
                {recipe.notes}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Rating */}
        <View style={{ paddingHorizontal: Spacing.md, marginTop: 24 }}>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary, marginBottom: 12 }}>
            Rate This Recipe
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => handleRating(star)}>
                <Star
                  size={32}
                  color={star <= userRating ? Colors.amber : Colors.border}
                  fill={star <= userRating ? Colors.amber : 'transparent'}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* My Notes */}
        <View style={{ paddingHorizontal: Spacing.md, marginTop: 24 }}>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary, marginBottom: 10 }}>
            My Notes
          </Text>
          <TextInput
            value={userNotes}
            onChangeText={setUserNotes}
            onBlur={() => updateRecipe(recipe.id, { userNotes })}
            multiline
            placeholder="Add your personal notes, modifications, tips..."
            placeholderTextColor={Colors.textTertiary}
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              color: Colors.textPrimary,
              minHeight: 100,
              textAlignVertical: 'top',
              borderWidth: 1,
              borderColor: Colors.border,
            }}
            testID="user-notes-input"
          />
        </View>

        {/* Bottom Actions */}
        <View style={{ paddingHorizontal: Spacing.md, marginTop: 24, gap: 10 }}>
          <Pressable
            onPress={() => setCookModalVisible(true)}
            style={{
              backgroundColor: Colors.green,
              borderRadius: BorderRadius.lg,
              padding: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
            testID="cook-recipe-button"
          >
            <Flame size={20} color={Colors.navy} />
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.navy }}>
              Cook This Recipe
            </Text>
          </Pressable>

          <Pressable
            onPress={handleAddToShoppingList}
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              padding: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
            testID="add-to-shopping-button"
          >
            <ShoppingCart size={18} color={Colors.textSecondary} />
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary }}>
              Add Missing to Shopping List
            </Text>
          </Pressable>

          <Pressable
            onPress={handleWatchYouTube}
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              padding: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#FF0000' }}>
              Watch on YouTube
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Cook Modal */}
      <Modal
        visible={cookModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCookModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: Colors.navyCard,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: Spacing.lg,
              paddingBottom: 40,
              maxHeight: '80%',
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary, marginBottom: 6 }}>
              Cook This Recipe
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginBottom: 16 }}>
              The following pantry items will be deducted:
            </Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {recipe.ingredients.map((ing, i) => {
                const pantryItem = matchToPantry(ing.name);
                const deductAmt = (parseFloat(ing.quantity) || 0) * servingMultiplier;
                const remaining = pantryItem ? Math.max(0, pantryItem.quantity - deductAmt) : null;
                return (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: Colors.borderLight,
                    }}
                  >
                    {pantryItem ? (
                      <Check size={14} color={Colors.green} />
                    ) : (
                      <AlertCircle size={14} color={Colors.textTertiary} />
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textPrimary }}>
                        {ing.quantity} {ing.unit} {ing.name}
                      </Text>
                      {pantryItem && remaining !== null ? (
                        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary }}>
                          Pantry: {pantryItem.quantity} {pantryItem.unit} → {remaining.toFixed(1)} {pantryItem.unit} remaining
                        </Text>
                      ) : (
                        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textTertiary }}>
                          Not in pantry — no action
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <Pressable
                onPress={() => setCookModalVisible(false)}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: BorderRadius.md,
                  backgroundColor: Colors.surface,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmCook}
                style={{
                  flex: 2,
                  padding: 14,
                  borderRadius: BorderRadius.md,
                  backgroundColor: Colors.green,
                  alignItems: 'center',
                }}
                testID="confirm-cook-button"
              >
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy }}>Confirm & Deduct</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
