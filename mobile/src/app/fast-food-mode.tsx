import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api/api';
import { Colors, BorderRadius } from '@/constants/theme';
import { useMealsStore } from '@/lib/stores/mealsStore';
import { dateUtils } from '@/lib/dateUtils';
import { useToast } from '@/components/Toast';

interface MenuItem {
  name: string;
  calories: number;
  totalCarbs: number;
  fiber: number;
  netCarbs: number;
  protein: number;
  fat: number;
  ketoStatus: 'keto_friendly' | 'keto_moderate' | 'keto_borderline' | 'not_keto';
  ketoModification?: string | null;
  category: string;
}

const RESTAURANTS = [
  { name: "McDonald's", emoji: '🍟' },
  { name: "Chick-fil-A", emoji: '🐔' },
  { name: "Taco Bell", emoji: '🌮' },
  { name: "Burger King", emoji: '👑' },
  { name: "Chipotle", emoji: '🫕' },
  { name: "Subway", emoji: '🥖' },
  { name: "Wendy's", emoji: '🍔' },
  { name: "KFC", emoji: '🍗' },
  { name: "Starbucks", emoji: '☕' },
  { name: "Panda Express", emoji: '🥡' },
  { name: "Five Guys", emoji: '🧅' },
  { name: "Panera", emoji: '🥐' },
];

const getKetoStatusBadge = (status: string) => {
  switch (status) {
    case 'keto_friendly':
      return { emoji: '🥑', label: 'KETO FRIENDLY', color: Colors.green };
    case 'keto_moderate':
      return { emoji: '✅', label: 'KETO MODERATE', color: Colors.amber };
    case 'keto_borderline':
      return { emoji: '⚠️', label: 'BORDERLINE', color: '#E67E22' };
    case 'not_keto':
      return { emoji: '❌', label: 'NOT KETO', color: Colors.error };
    default:
      return { emoji: '❓', label: 'UNKNOWN', color: '#95A5A6' };
  }
};

const FastFoodModeScreen = () => {
  const [step, setStep] = useState<'restaurant' | 'search' | 'results'>('restaurant');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [customRestaurant, setCustomRestaurant] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const addEntry = useMealsStore((s) => s.addEntry);
  const { showToast } = useToast();

  const handleSelectRestaurant = (restaurantName: string) => {
    setSelectedRestaurant(restaurantName);
    setStep('search');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCustomRestaurant = () => {
    if (customRestaurant.trim()) {
      setSelectedRestaurant(customRestaurant);
      setStep('search');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const queryFastFoodMenu = useCallback(async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const fastFoodQuery = `You are a fast food nutrition expert.
The user is at ${selectedRestaurant}. They searched for: "${searchTerm}"

Return up to 8 menu items matching their search as a JSON array in this exact format:
[
  {
    "name": "Item name exactly as on menu",
    "calories": 540,
    "totalCarbs": 45,
    "fiber": 3,
    "netCarbs": 42,
    "protein": 25,
    "fat": 28,
    "ketoStatus": "not_keto",
    "ketoModification": "Order without the bun for only 3g net carbs",
    "category": "Burger"
  }
]

ketoStatus must be one of:
- "keto_friendly" — under 5g net carbs
- "keto_moderate" — 5 to 10g net carbs
- "keto_borderline" — 10 to 20g net carbs
- "not_keto" — over 20g net carbs

ketoModification — suggest how to make it keto if possible. If already keto friendly set ketoModification to null.

Return ONLY the JSON array. No other text.`;

      const response = await api.post<{ data: string }>('/api/chat', {
        messages: [
          {
            role: 'user',
            content: fastFoodQuery,
          },
        ],
      });

      const content = response.data || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const items: MenuItem[] = JSON.parse(jsonMatch[0]);
        setMenuItems(items);
        setStep('results');
      } else {
        showToast('Unable to parse menu items. Try a different search.', 'error');
      }
    } catch (error) {
      console.error('Fast food menu query error:', error);
      showToast('Error searching menu. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedRestaurant, searchTerm, showToast]);

  const handleLogMeal = useCallback(
    (item: MenuItem) => {
      const today = dateUtils.today(); // YYYY-MM-DD format
      const entry = {
        name: `${item.name} (${selectedRestaurant})`,
        quantity: 1,
        unit: 'serving',
        mealType: 'Lunch' as const,
        date: today,
        servings: 1,
        calories: item.calories,
        carbs: item.totalCarbs,
        netCarbs: item.netCarbs,
        totalCarbs: item.totalCarbs,
        fiber: item.fiber,
        protein: item.protein,
        fat: item.fat,
        isFavorite: false,
      };

      addEntry(entry);
      showToast(`✅ Logged: ${item.name}`, 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        router.back();
      }, 500);
    },
    [selectedRestaurant, addEntry, showToast]
  );

  const handleMakeItKeto = useCallback(
    (item: MenuItem) => {
      if (item.ketoModification) {
        router.push({
          pathname: '/chef-claude',
          params: {
            initialMessage: `How do I order the ${item.name} from ${selectedRestaurant} to keep it keto? What modifications should I ask for? Here's the current item: ${item.calories} calories, ${item.netCarbs}g net carbs. Current suggestion: ${item.ketoModification}`,
          },
        });
      }
    },
    [selectedRestaurant]
  );

  if (step === 'restaurant') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.navy }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1A2637' }}>
          <Pressable onPress={() => router.back()}>
            <ArrowLeft color={Colors.textPrimary} size={24} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginTop: 12 }}>
            Fast Food Mode
          </Text>
          <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>
            Select a restaurant or search for your favorite
          </Text>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          {/* Restaurant Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {RESTAURANTS.map((restaurant) => (
              <Pressable
                key={restaurant.name}
                style={{
                  width: '48.5%',
                  paddingVertical: 20,
                  borderRadius: BorderRadius.xl,
                  backgroundColor: Colors.navyCard,
                  borderWidth: 2,
                  borderColor: '#1A2637',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => handleSelectRestaurant(restaurant.name)}
              >
                <Text style={{ fontSize: 32, marginBottom: 8 }}>{restaurant.emoji}</Text>
                <Text style={{ fontSize: 12, color: Colors.textPrimary, fontWeight: '600', textAlign: 'center' }}>
                  {restaurant.name}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Custom Restaurant Input */}
          <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 24, marginBottom: 8, fontWeight: '600' }}>
            Or type any restaurant name
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={{
                flex: 1,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: BorderRadius.lg,
                backgroundColor: Colors.navyCard,
                color: Colors.textPrimary,
                borderWidth: 1,
                borderColor: '#1A2637',
                fontSize: 14,
              }}
              placeholder="Restaurant name..."
              placeholderTextColor={Colors.textTertiary}
              value={customRestaurant}
              onChangeText={setCustomRestaurant}
            />
            <Pressable
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: BorderRadius.lg,
                backgroundColor: Colors.green,
                justifyContent: 'center',
              }}
              onPress={handleCustomRestaurant}
            >
              <Text style={{ color: Colors.navy, fontWeight: '600', fontSize: 14 }}>Go</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'search') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.navy }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1A2637' }}>
          <Pressable
            onPress={() => {
              setStep('restaurant');
              setSearchTerm('');
              setMenuItems([]);
            }}
          >
            <ArrowLeft color={Colors.textPrimary} size={24} />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 12 }}>
            {selectedRestaurant}
          </Text>
          <Text style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>Search menu items</Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.navyCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: '#1A2637', paddingHorizontal: 12 }}>
              <Search color={Colors.textTertiary} size={20} />
              <TextInput
                style={{
                  flex: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  color: Colors.textPrimary,
                  fontSize: 14,
                }}
                placeholder={`Search ${selectedRestaurant} menu...`}
                placeholderTextColor={Colors.textTertiary}
                value={searchTerm}
                onChangeText={setSearchTerm}
                onSubmitEditing={queryFastFoodMenu}
              />
            </View>

            <Pressable
              style={{
                paddingVertical: 12,
                borderRadius: BorderRadius.lg,
                backgroundColor: Colors.green,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={queryFastFoodMenu}
              disabled={loading || !searchTerm.trim()}
            >
              {loading ? (
                <ActivityIndicator color={Colors.navy} />
              ) : (
                <Text style={{ color: Colors.navy, fontWeight: '600', fontSize: 14 }}>Search Menu</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Results view
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.navy }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1A2637' }}>
        <Pressable
          onPress={() => {
            setStep('search');
            setMenuItems([]);
          }}
        >
          <ArrowLeft color={Colors.textPrimary} size={24} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 12 }}>
          {selectedRestaurant}
        </Text>
        <Text style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>
          {menuItems.length} items • {searchTerm}
        </Text>
      </View>

      <FlatList
        data={menuItems}
        keyExtractor={(_, index) => `menu-item-${index}`}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => {
          const ketoInfo = getKetoStatusBadge(item.ketoStatus);
          const hasModification = !!item.ketoModification;

          return (
            <View
              style={{
                borderRadius: BorderRadius.xl,
                backgroundColor: Colors.navyCard,
                borderWidth: 1,
                borderColor: '#1A2637',
                overflow: 'hidden',
              }}
            >
              <View style={{ padding: 12 }}>
                {/* Item Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.textPrimary }}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 2 }}>
                      {item.category}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginLeft: 8 }}>
                    {item.calories}
                  </Text>
                </View>

                {/* Net Carbs - Large Orange Number */}
                <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1A2637' }}>
                  <Text style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: '500' }}>Net Carbs</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.amber, marginTop: 2 }}>
                    {item.netCarbs}g
                  </Text>
                </View>

                {/* Macro Stats */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  <View>
                    <Text style={{ fontSize: 10, color: Colors.textSecondary }}>Protein</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.textPrimary }}>
                      {item.protein}g
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, color: Colors.textSecondary }}>Fat</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.textPrimary }}>
                      {item.fat}g
                    </Text>
                  </View>
                </View>

                {/* Keto Status Badge */}
                <View
                  style={{
                    marginTop: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: BorderRadius.md,
                    backgroundColor: `${ketoInfo.color}20`,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: ketoInfo.color }}>
                    {ketoInfo.emoji} {ketoInfo.label}
                  </Text>
                </View>

                {/* Keto Modification Tip */}
                {hasModification ? (
                  <View
                    style={{
                      marginTop: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: BorderRadius.md,
                      backgroundColor: '#0D2E1F',
                      borderLeftWidth: 3,
                      borderLeftColor: Colors.green,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: '500' }}>
                      💡 Make it keto:
                    </Text>
                    <Text style={{ fontSize: 11, color: Colors.textPrimary, marginTop: 4 }}>
                      {item.ketoModification}
                    </Text>
                  </View>
                ) : null}

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Pressable
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: BorderRadius.md,
                      backgroundColor: Colors.green,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => handleLogMeal(item)}
                  >
                    <Text style={{ color: Colors.navy, fontWeight: '600', fontSize: 13 }}>
                      Log This Meal
                    </Text>
                  </Pressable>

                  {hasModification ? (
                    <Pressable
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: BorderRadius.md,
                        backgroundColor: '#0D2E1F',
                        borderWidth: 1,
                        borderColor: Colors.green,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      onPress={() => handleMakeItKeto(item)}
                    >
                      <Text style={{ color: Colors.green, fontWeight: '600', fontSize: 13 }}>
                        Make it Keto
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

export default FastFoodModeScreen;
