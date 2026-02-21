import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Plus,
  Star,
  Package,
} from 'lucide-react-native';
import { useMealsStore, MealType, FoodEntry } from '@/lib/stores/mealsStore';
import { usePantryStore } from '@/lib/stores/pantryStore';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

type Tab = 'search' | 'pantry' | 'favorites';

interface PortionOption {
  label: string;
  multiplier: number;
}

const PORTION_OPTIONS: PortionOption[] = [
  { label: '1/2 serving', multiplier: 0.5 },
  { label: '1 serving', multiplier: 1 },
  { label: '1.5 servings', multiplier: 1.5 },
  { label: '2 servings', multiplier: 2 },
];

function MacroChip({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text
        style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color, lineHeight: 20 }}
      >
        {Math.round(value)}
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textTertiary }}>
          {unit}
        </Text>
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 11,
          color: Colors.textSecondary,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AddMealEntryScreen() {
  const params = useLocalSearchParams<{ mealType?: string; date?: string }>();

  const mealType = (params.mealType as MealType) ?? 'Breakfast';
  const date =
    params.date ?? new Date().toISOString().split('T')[0];

  const addEntry = useMealsStore((s) => s.addEntry);
  const allEntries = useMealsStore((s) => s.entries);
  const pantryItems = usePantryStore((s) => s.items);

  const [activeTab, setActiveTab] = useState<Tab>('pantry');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<{
    name: string;
    brand?: string;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
    pantryItemId?: string;
  } | null>(null);
  const [selectedPortion, setSelectedPortion] = useState<PortionOption>(PORTION_OPTIONS[1]);
  const [customServings, setCustomServings] = useState('1');

  const favorites = useMemo(
    () => allEntries.filter((e) => e.isFavorite),
    [allEntries]
  );

  const filteredPantry = useMemo(() => {
    if (!searchQuery.trim()) return pantryItems;
    const q = searchQuery.toLowerCase();
    return pantryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.brand?.toLowerCase().includes(q) ?? false)
    );
  }, [pantryItems, searchQuery]);

  const filteredFavorites = useMemo(() => {
    if (!searchQuery.trim()) return favorites;
    const q = searchQuery.toLowerCase();
    return favorites.filter((e) => e.name.toLowerCase().includes(q));
  }, [favorites, searchQuery]);

  const effectiveMultiplier =
    selectedPortion.label === 'custom'
      ? Number(customServings) || 1
      : selectedPortion.multiplier;

  const previewNutrition = selectedItem
    ? {
        calories: Math.round(selectedItem.calories * effectiveMultiplier),
        carbs: Math.round(selectedItem.carbs * effectiveMultiplier),
        protein: Math.round(selectedItem.protein * effectiveMultiplier),
        fat: Math.round(selectedItem.fat * effectiveMultiplier),
        fiber: Math.round(selectedItem.fiber * effectiveMultiplier),
      }
    : null;

  const handleAdd = () => {
    if (!selectedItem) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const netCarbs = Math.max(
      0,
      Math.round((selectedItem.carbs - selectedItem.fiber) * effectiveMultiplier)
    );

    addEntry({
      name: selectedItem.name,
      brand: selectedItem.brand,
      mealType,
      date,
      servings: effectiveMultiplier,
      calories: selectedItem.calories,
      carbs: selectedItem.carbs,
      protein: selectedItem.protein,
      fat: selectedItem.fat,
      fiber: selectedItem.fiber,
      netCarbs,
      pantryItemId: selectedItem.pantryItemId,
      isFavorite: false,
    });

    router.back();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pantry', label: 'Pantry Items' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'search', label: 'Search' },
  ];

  return (
    <LinearGradient colors={['#0A1628', '#0B1C35']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']} testID="add-meal-entry-screen">
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: Colors.borderLight,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
            testID="back-button"
          >
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'PlayfairDisplay_700Bold',
                fontSize: 20,
                color: Colors.textPrimary,
              }}
            >
              Add to {mealType}
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 12,
                color: Colors.textSecondary,
              }}
            >
              {date}
            </Text>
          </View>
          {selectedItem ? (
            <Pressable
              onPress={handleAdd}
              style={{
                backgroundColor: Colors.green,
                borderRadius: BorderRadius.lg,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
              testID="add-entry-button"
            >
              <Text
                style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.navy }}
              >
                Add
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 8,
          }}
        >
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => {
                setActiveTab(tab.key);
                setSearchQuery('');
              }}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: BorderRadius.lg,
                backgroundColor: activeTab === tab.key ? Colors.green : Colors.surface,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: activeTab === tab.key ? Colors.green : Colors.border,
              }}
              testID={`tab-${tab.key}`}
            >
              <Text
                style={{
                  fontFamily: activeTab === tab.key ? 'DMSans_700Bold' : 'DMSans_400Regular',
                  fontSize: 12,
                  color: activeTab === tab.key ? Colors.navy : Colors.textSecondary,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Search bar (for search and pantry tabs) */}
        {activeTab !== 'favorites' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginHorizontal: 16,
              marginBottom: 8,
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: Colors.border,
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 8,
            }}
          >
            <Search size={16} color={Colors.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                activeTab === 'pantry' ? 'Search pantry items...' : 'Search foods...'
              }
              placeholderTextColor={Colors.textTertiary}
              style={{
                flex: 1,
                fontFamily: 'DMSans_400Regular',
                fontSize: 15,
                color: Colors.textPrimary,
              }}
              testID="search-input"
            />
          </View>
        ) : null}

        {/* Portion selector (shown when item selected) */}
        {selectedItem ? (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 8,
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.xl,
              padding: 14,
              borderWidth: 1,
              borderColor: Colors.green,
              ...Shadows.card,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 14,
                color: Colors.textPrimary,
                marginBottom: 10,
              }}
            >
              {selectedItem.name}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {PORTION_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={() => setSelectedPortion(opt)}
                  style={{
                    flex: 1,
                    paddingVertical: 6,
                    borderRadius: BorderRadius.md,
                    backgroundColor:
                      selectedPortion.label === opt.label
                        ? Colors.green
                        : Colors.surface,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor:
                      selectedPortion.label === opt.label ? Colors.green : Colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily:
                        selectedPortion.label === opt.label
                          ? 'DMSans_700Bold'
                          : 'DMSans_400Regular',
                      fontSize: 11,
                      color:
                        selectedPortion.label === opt.label
                          ? Colors.navy
                          : Colors.textSecondary,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {previewNutrition ? (
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.lg,
                  padding: 10,
                }}
              >
                <MacroChip
                  label="Calories"
                  value={previewNutrition.calories}
                  unit=" kcal"
                  color={Colors.amber}
                />
                <MacroChip
                  label="Carbs"
                  value={previewNutrition.carbs}
                  unit="g"
                  color={Colors.error}
                />
                <MacroChip
                  label="Protein"
                  value={previewNutrition.protein}
                  unit="g"
                  color={Colors.green}
                />
                <MacroChip
                  label="Fat"
                  value={previewNutrition.fat}
                  unit="g"
                  color="#9B59B6"
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Content */}
        {activeTab === 'pantry' ? (
          <FlatList
            data={filteredPantry}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setSelectedItem({
                    name: item.name,
                    brand: item.brand,
                    calories: item.caloriesPerServing,
                    carbs: item.carbsPerServing,
                    protein: item.proteinPerServing,
                    fat: item.fatPerServing,
                    fiber: 0,
                    pantryItemId: item.id,
                  });
                  setSelectedPortion(PORTION_OPTIONS[1]);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                testID={`pantry-item-${item.id}`}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor:
                      selectedItem?.pantryItemId === item.id
                        ? Colors.greenMuted
                        : Colors.navyCard,
                    borderRadius: BorderRadius.xl,
                    padding: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor:
                      selectedItem?.pantryItemId === item.id
                        ? Colors.green
                        : Colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: Colors.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Package size={18} color={Colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 14,
                        color: Colors.textPrimary,
                      }}
                    >
                      {item.name}
                    </Text>
                    {item.brand ? (
                      <Text
                        style={{
                          fontFamily: 'DMSans_400Regular',
                          fontSize: 12,
                          color: Colors.textSecondary,
                        }}
                      >
                        {item.brand}
                      </Text>
                    ) : null}
                    <Text
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 12,
                        color: Colors.textTertiary,
                      }}
                    >
                      {item.caloriesPerServing} cal · {item.carbsPerServing}g carbs
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setSelectedItem({
                        name: item.name,
                        brand: item.brand,
                        calories: item.caloriesPerServing,
                        carbs: item.carbsPerServing,
                        protein: item.proteinPerServing,
                        fat: item.fatPerServing,
                        fiber: 0,
                        pantryItemId: item.id,
                      });
                      setSelectedPortion(PORTION_OPTIONS[1]);
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor:
                        selectedItem?.pantryItemId === item.id
                          ? Colors.green
                          : Colors.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus
                      size={16}
                      color={
                        selectedItem?.pantryItemId === item.id ? Colors.navy : Colors.textSecondary
                      }
                    />
                  </Pressable>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={() => (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 15,
                    color: Colors.textSecondary,
                  }}
                >
                  No items found
                </Text>
              </View>
            )}
          />
        ) : activeTab === 'favorites' ? (
          <FlatList
            data={filteredFavorites}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setSelectedItem({
                    name: item.name,
                    brand: item.brand,
                    calories: item.calories,
                    carbs: item.carbs,
                    protein: item.protein,
                    fat: item.fat,
                    fiber: item.fiber,
                  });
                  setSelectedPortion(PORTION_OPTIONS[1]);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                testID={`favorite-item-${item.id}`}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor:
                      selectedItem?.name === item.name ? Colors.greenMuted : Colors.navyCard,
                    borderRadius: BorderRadius.xl,
                    padding: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor:
                      selectedItem?.name === item.name ? Colors.green : Colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: Colors.amberMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Star size={18} color={Colors.amber} fill={Colors.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 14,
                        color: Colors.textPrimary,
                      }}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 12,
                        color: Colors.textTertiary,
                      }}
                    >
                      {item.calories} cal · {item.netCarbs}g net carbs
                    </Text>
                  </View>
                  <Plus size={16} color={Colors.textSecondary} />
                </View>
              </Pressable>
            )}
            ListEmptyComponent={() => (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Star size={32} color={Colors.textTertiary} style={{ marginBottom: 12 }} />
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 15,
                    color: Colors.textSecondary,
                    textAlign: 'center',
                  }}
                >
                  No favorites yet.{'\n'}Star a meal entry to add it here.
                </Text>
              </View>
            )}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <Search size={36} color={Colors.textTertiary} style={{ marginBottom: 16 }} />
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 16,
                color: Colors.textSecondary,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Search Foods
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 14,
                color: Colors.textTertiary,
                textAlign: 'center',
              }}
            >
              Use the Pantry Items tab to add foods from your pantry, or favorites for quick access.
            </Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}
