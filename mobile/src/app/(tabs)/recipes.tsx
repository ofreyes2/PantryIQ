import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  BookOpen,
  Link,
  Search,
  ChefHat,
  Heart,
  Clock,
  Sparkles,
  X,
  Star,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useRecipesStore, Recipe } from '@/lib/stores/recipesStore';
import { usePantryStore } from '@/lib/stores/pantryStore';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// ─── Recipe Card ─────────────────────────────────────────────────────────────

interface RecipeCardProps {
  recipe: Recipe;
  width: number;
  height: number;
  pantryMatchBadge?: string | null;
  onPress: () => void;
  onLongPress: () => void;
  onFavoritePress: (recipeId: string) => void;
}

function RecipeCard({ recipe, width, height, pantryMatchBadge, onPress, onLongPress, onFavoritePress }: RecipeCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const gradColors = getCategoryGradient(recipe.category);
  const totalTime = recipe.prepTime + recipe.cookTime;

  const handlePressIn = () => { scale.value = withSpring(0.96); };
  const handlePressOut = () => { scale.value = withSpring(1); };

  // Build crispiness string
  const crispinessStr = recipe.crispinessRating && recipe.crispinessRating > 0
    ? '🥨'.repeat(recipe.crispinessRating)
    : null;

  // Determine badge top offset based on whether pantryMatchBadge is present
  const cookingMethodTop = pantryMatchBadge ? 34 : 10;

  return (
    <Animated.View style={[animStyle, { width, height, marginRight: 12 }]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden' }}
        testID={`recipe-card-${recipe.id}`}
      >
        <LinearGradient
          colors={gradColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          {/* Overlay gradient at bottom */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.6 }}
          />

          {/* Pantry match badge */}
          {pantryMatchBadge ? (
            <View
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                backgroundColor: Colors.green,
                borderRadius: BorderRadius.full,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 10, color: Colors.navy }}>
                {pantryMatchBadge}
              </Text>
            </View>
          ) : null}

          {/* Cooking method badge */}
          {recipe.cookingMethod ? (
            <View
              style={{
                position: 'absolute',
                top: cookingMethodTop,
                left: 10,
                backgroundColor: 'rgba(0,0,0,0.45)',
                borderRadius: BorderRadius.full,
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.15)',
              }}
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 9, color: 'rgba(255,255,255,0.9)' }}>
                {recipe.cookingMethod}
              </Text>
            </View>
          ) : null}

          {/* Favorite heart */}
          <Pressable
            onPress={() => {
              onFavoritePress(recipe.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 32,
              height: 32,
              borderRadius: BorderRadius.full,
              backgroundColor: 'rgba(0,0,0,0.4)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            testID={`recipe-favorite-${recipe.id}`}
          >
            <Heart
              size={16}
              color={recipe.isFavorite ? '#E74C3C' : 'rgba(255,255,255,0.8)'}
              fill={recipe.isFavorite ? '#E74C3C' : 'transparent'}
            />
          </Pressable>

          {/* Bottom info */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 }}>
            <Text
              style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textPrimary, marginBottom: 6 }}
              numberOfLines={2}
            >
              {recipe.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Clock size={10} color="rgba(255,255,255,0.7)" />
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
                  {totalTime}m
                </Text>
              </View>
              <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' }} />
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
                {recipe.netCarbsPerServing}g carbs
              </Text>
              <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' }} />
              <View style={{ flexDirection: 'row', gap: 1 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={8}
                    color={i < recipe.difficulty ? '#F39C12' : 'rgba(255,255,255,0.2)'}
                    fill={i < recipe.difficulty ? '#F39C12' : 'transparent'}
                  />
                ))}
              </View>
              {crispinessStr ? (
                <>
                  <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                  <Text style={{ fontSize: 9, lineHeight: 12 }}>{crispinessStr}</Text>
                </>
              ) : null}
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ paddingHorizontal: Spacing.md, marginBottom: 12, marginTop: 24 }}>
      <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

interface FilterChip {
  label: string;
  key: string;
}

const FILTER_CHIPS: FilterChip[] = [
  { label: 'All', key: 'All' },
  { label: 'Crispy', key: 'Crispy' },
  { label: 'Quick', key: 'Quick' },
  { label: 'Deep Fried', key: 'Deep Fried' },
  { label: 'Instant Pot', key: 'Instant Pot' },
];

interface FilterBarProps {
  activeFilter: string;
  onFilterChange: (key: string) => void;
}

function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 8, paddingBottom: 4 }}
      style={{ flexGrow: 0, marginBottom: 8 }}
    >
      {FILTER_CHIPS.map((chip) => {
        const isActive = activeFilter === chip.key;
        return (
          <Pressable
            key={chip.key}
            onPress={() => {
              Haptics.selectionAsync();
              onFilterChange(chip.key);
            }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: BorderRadius.full,
              backgroundColor: isActive ? Colors.green : Colors.surface,
              borderWidth: 1,
              borderColor: isActive ? Colors.green : Colors.border,
            }}
            testID={`filter-chip-${chip.key.toLowerCase().replace(' ', '-')}`}
          >
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 13,
                color: isActive ? Colors.navy : Colors.textSecondary,
              }}
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

function applyFilter(recipes: Recipe[], filter: string): Recipe[] {
  switch (filter) {
    case 'Crispy':
      return recipes.filter((r) => r.crispinessRating !== undefined && r.crispinessRating >= 4);
    case 'Quick':
      return recipes.filter((r) => r.prepTime + r.cookTime <= 30);
    case 'Deep Fried':
      return recipes.filter((r) => r.cookingMethod === 'Deep Fried');
    case 'Instant Pot':
      return recipes.filter((r) => r.cookingMethod === 'Instant Pot');
    default:
      return recipes;
  }
}

export default function RecipesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [fabOpen, setFabOpen] = useState(false);
  const [longPressRecipe, setLongPressRecipe] = useState<Recipe | null>(null);

  const recipes = useRecipesStore((s) => s.recipes);
  const recentlyViewedIds = useRecipesStore((s) => s.recentlyViewed);
  const toggleFavorite = useRecipesStore((s) => s.toggleFavorite);
  const pantryItems = usePantryStore((s) => s.items);

  // Compute pantry match for recipes
  const getPantryMatch = useCallback(
    (recipe: Recipe) => {
      const total = recipe.ingredients.length;
      if (total === 0) return null;
      const matched = recipe.ingredients.filter((ing) =>
        pantryItems.some((p) => p.name.toLowerCase().includes(ing.name.toLowerCase()))
      ).length;
      return `${matched}/${total} in pantry`;
    },
    [pantryItems]
  );

  // Suggested from pantry: recipes with most ingredient matches
  const suggestedRecipes = React.useMemo(() => {
    return [...recipes]
      .map((r) => {
        const matched = r.ingredients.filter((ing) =>
          pantryItems.some((p) => p.name.toLowerCase().includes(ing.name.toLowerCase()))
        ).length;
        return { recipe: r, matched };
      })
      .sort((a, b) => b.matched - a.matched)
      .slice(0, 4)
      .map((item) => item.recipe);
  }, [recipes, pantryItems]);

  // Keto favorites
  const ketoRecipes = React.useMemo(
    () => recipes.filter((r) => r.tags.includes('keto')),
    [recipes]
  );

  // Quick under 30 min
  const quickRecipes = React.useMemo(
    () => recipes.filter((r) => r.prepTime + r.cookTime <= 30),
    [recipes]
  );

  // Recently viewed
  const recentRecipes = React.useMemo(() => {
    return recentlyViewedIds
      .map((id) => recipes.find((r) => r.id === id))
      .filter((r): r is Recipe => r !== undefined);
  }, [recipes, recentlyViewedIds]);

  const handleRecipePress = (recipe: Recipe) => {
    router.push(`/recipe-detail?id=${recipe.id}`);
  };

  const handleLongPress = (recipe: Recipe) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLongPressRecipe(recipe);
  };

  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fabScale.value = withSpring(0.9, {}, () => { fabScale.value = withSpring(1); });
    setFabOpen(true);
  };

  // Search results (takes priority)
  const filteredRecipes = searchQuery.trim()
    ? recipes.filter(
        (r) =>
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
          r.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  // Filter results (when no search query and filter is not All)
  const filterResults = !searchQuery.trim() && activeFilter !== 'All'
    ? applyFilter(recipes, activeFilter)
    : null;

  const filterLabel: Record<string, string> = {
    Crispy: 'Crispy recipes (crispiness 4+)',
    Quick: 'Quick recipes (under 30 min)',
    'Deep Fried': 'Deep Fried recipes',
    'Instant Pot': 'Instant Pot recipes',
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }} testID="recipes-screen">
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: Spacing.md,
            paddingBottom: 12,
            paddingTop: 8,
          }}
        >
          <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: Colors.textPrimary }}>
            Recipes
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => router.push('/import-recipe')}
              style={{
                width: 40,
                height: 40,
                borderRadius: BorderRadius.full,
                backgroundColor: Colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: Colors.border,
              }}
              testID="import-recipe-button"
            >
              <Link size={18} color={Colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/recipe-box')}
              style={{
                width: 40,
                height: 40,
                borderRadius: BorderRadius.full,
                backgroundColor: Colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: Colors.border,
              }}
              testID="recipe-box-button"
            >
              <BookOpen size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View
          style={{
            marginHorizontal: Spacing.md,
            marginBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Colors.surface,
            borderRadius: BorderRadius.lg,
            paddingHorizontal: 14,
            paddingVertical: 11,
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <Search size={16} color={Colors.textTertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search recipes or ask Claude..."
            placeholderTextColor={Colors.textTertiary}
            style={{
              flex: 1,
              marginLeft: 10,
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textPrimary,
            }}
            testID="recipe-search-input"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={16} color={Colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Bar */}
        <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {filteredRecipes ? (
            // Search results grid
            <View style={{ paddingHorizontal: Spacing.md, paddingTop: 8 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary, marginBottom: 12 }}>
                {filteredRecipes.length} result{filteredRecipes.length !== 1 ? 's' : ''}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {filteredRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    width={(SCREEN_WIDTH - 44) / 2}
                    height={200}
                    onPress={() => handleRecipePress(recipe)}
                    onLongPress={() => handleLongPress(recipe)}
                    onFavoritePress={toggleFavorite}
                  />
                ))}
              </View>
            </View>
          ) : filterResults ? (
            // Active filter grid
            <View style={{ paddingHorizontal: Spacing.md, paddingTop: 8 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary, marginBottom: 12 }}>
                {filterResults.length} {filterLabel[activeFilter] ?? `${activeFilter} recipes`}
              </Text>
              {filterResults.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.textTertiary }}>
                    No recipes found for this filter.
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {filterResults.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      width={(SCREEN_WIDTH - 44) / 2}
                      height={200}
                      pantryMatchBadge={getPantryMatch(recipe)}
                      onPress={() => handleRecipePress(recipe)}
                      onLongPress={() => handleLongPress(recipe)}
                      onFavoritePress={toggleFavorite}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <>
              {/* Section 1: Suggested From Your Pantry */}
              <SectionHeader
                title="Suggested From Your Pantry"
                subtitle="Recipes you can make right now"
              />
              <FlatList
                data={suggestedRecipes}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: Spacing.md }}
                style={{ flexGrow: 0 }}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <RecipeCard
                    recipe={item}
                    width={200}
                    height={240}
                    pantryMatchBadge={getPantryMatch(item)}
                    onPress={() => handleRecipePress(item)}
                    onLongPress={() => handleLongPress(item)}
                    onFavoritePress={toggleFavorite}
                  />
                )}
              />

              {/* Section 2: Keto Favorites */}
              {ketoRecipes.length > 0 ? (
                <>
                  <SectionHeader title="Keto Favorites" />
                  <FlatList
                    data={ketoRecipes}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: Spacing.md }}
                    style={{ flexGrow: 0 }}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <RecipeCard
                        recipe={item}
                        width={180}
                        height={200}
                        onPress={() => handleRecipePress(item)}
                        onLongPress={() => handleLongPress(item)}
                        onFavoritePress={toggleFavorite}
                      />
                    )}
                  />
                </>
              ) : null}

              {/* Section 3: Quick Under 30 Min */}
              {quickRecipes.length > 0 ? (
                <>
                  <SectionHeader title="Quick Under 30 Min" subtitle="Fast meals when you're busy" />
                  <FlatList
                    data={quickRecipes}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: Spacing.md }}
                    style={{ flexGrow: 0 }}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <RecipeCard
                        recipe={item}
                        width={180}
                        height={200}
                        onPress={() => handleRecipePress(item)}
                        onLongPress={() => handleLongPress(item)}
                        onFavoritePress={toggleFavorite}
                      />
                    )}
                  />
                </>
              ) : null}

              {/* Section 4: Recently Viewed */}
              {recentRecipes.length > 0 ? (
                <>
                  <SectionHeader title="Recently Viewed" />
                  <FlatList
                    data={recentRecipes}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: Spacing.md }}
                    style={{ flexGrow: 0 }}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <RecipeCard
                        recipe={item}
                        width={160}
                        height={160}
                        onPress={() => handleRecipePress(item)}
                        onLongPress={() => handleLongPress(item)}
                        onFavoritePress={toggleFavorite}
                      />
                    )}
                  />
                </>
              ) : null}
            </>
          )}
        </ScrollView>

        {/* FAB */}
        <Animated.View
          style={[
            fabStyle,
            { position: 'absolute', bottom: 100, right: 20 },
          ]}
        >
          <Pressable
            onPress={handleFabPress}
            style={{
              width: 56,
              height: 56,
              borderRadius: BorderRadius.full,
              backgroundColor: Colors.green,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: Colors.green,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }}
            testID="recipe-fab-button"
          >
            <ChefHat size={24} color={Colors.navy} />
          </Pressable>
        </Animated.View>

        {/* FAB Action Sheet Modal */}
        <Modal
          visible={fabOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setFabOpen(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
            onPress={() => setFabOpen(false)}
          >
            <View
              style={{
                backgroundColor: Colors.navyCard,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: Spacing.lg,
                paddingBottom: 40,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: Colors.border,
                  alignSelf: 'center',
                  marginBottom: 20,
                }}
              />
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary, marginBottom: 16, textAlign: 'center' }}>
                Add Recipe
              </Text>

              <Pressable
                onPress={() => {
                  setFabOpen(false);
                  router.push('/generate-recipe');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: Colors.greenMuted,
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(46,204,113,0.3)',
                }}
                testID="generate-recipe-option"
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: BorderRadius.md,
                    backgroundColor: Colors.green,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Sparkles size={22} color={Colors.navy} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary }}>
                    Generate Recipe with AI
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>
                    Claude crafts a custom recipe for you
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  setFabOpen(false);
                  router.push('/import-recipe');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
                testID="import-recipe-option"
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: BorderRadius.md,
                    backgroundColor: Colors.surfaceLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Link size={22} color={Colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary }}>
                    Import from URL
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>
                    Paste a recipe URL or text
                  </Text>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* Long Press Options Modal */}
        <Modal
          visible={longPressRecipe !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setLongPressRecipe(null)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
            onPress={() => setLongPressRecipe(null)}
          >
            <View
              style={{
                backgroundColor: Colors.navyCard,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: Spacing.lg,
                paddingBottom: 40,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              {longPressRecipe ? (
                <>
                  <View
                    style={{
                      width: 36,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: Colors.border,
                      alignSelf: 'center',
                      marginBottom: 16,
                    }}
                  />
                  <Text
                    style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary, marginBottom: 16 }}
                    numberOfLines={1}
                  >
                    {longPressRecipe.title}
                  </Text>

                  <Pressable
                    onPress={() => {
                      if (longPressRecipe) {
                        toggleFavorite(longPressRecipe.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setLongPressRecipe(null);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: Spacing.md,
                      borderRadius: BorderRadius.md,
                      backgroundColor: Colors.surface,
                      marginBottom: 8,
                    }}
                  >
                    <Heart size={18} color={Colors.error} fill={longPressRecipe.isFavorite ? Colors.error : 'transparent'} />
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textPrimary, marginLeft: 12 }}>
                      {longPressRecipe.isFavorite ? 'Remove from Favorites' : 'Save to Favorites'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setLongPressRecipe(null);
                      router.push('/recipe-box');
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: Spacing.md,
                      borderRadius: BorderRadius.md,
                      backgroundColor: Colors.surface,
                    }}
                  >
                    <BookOpen size={18} color={Colors.textSecondary} />
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textPrimary, marginLeft: 12 }}>
                      Add to Recipe Box
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
