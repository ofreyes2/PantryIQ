import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Minus,
  Plus,
  Trash2,
  Edit3,
  Clock,
  TrendingUp,
} from 'lucide-react-native';
import { usePantryStore, PantryItem } from '@/lib/stores/pantryStore';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

const CATEGORY_COLORS: Record<string, string> = {
  Proteins: '#E74C3C',
  Dairy: '#3498DB',
  Vegetables: '#2ECC71',
  Frozen: '#9B59B6',
  'Pantry Staples': '#F39C12',
  Snacks: '#E67E22',
  Condiments: '#1ABC9C',
  Beverages: '#2980B9',
  'Bread & Wraps': '#D35400',
  Other: '#95A5A6',
};

const CATEGORY_EMOJI: Record<string, string> = {
  Proteins: '🥩',
  Dairy: '🥛',
  Vegetables: '🥦',
  Frozen: '❄️',
  'Pantry Staples': '🌾',
  Snacks: '🥜',
  Condiments: '🫙',
  Beverages: '🥤',
  'Bread & Wraps': '🫓',
  Other: '📦',
};

function NutritionStat({
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
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text
        style={{
          fontFamily: 'DMSans_700Bold',
          fontSize: 20,
          color,
          lineHeight: 24,
        }}
      >
        {value}
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary }}>
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

function ConfirmDeleteModal({
  visible,
  itemName,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 32,
        }}
        onPress={onCancel}
      >
        <Pressable onPress={() => {}}>
          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.xl,
              padding: 24,
              width: 300,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 18,
                color: Colors.textPrimary,
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              Delete Item?
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 14,
                color: Colors.textSecondary,
                textAlign: 'center',
                marginBottom: 24,
                lineHeight: 22,
              }}
            >
              Remove {itemName} from your pantry? This cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={onCancel}
                style={{
                  flex: 1,
                  backgroundColor: Colors.navyCard,
                  borderRadius: BorderRadius.lg,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textPrimary }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                style={{
                  flex: 1,
                  backgroundColor: Colors.error,
                  borderRadius: BorderRadius.lg,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                testID="confirm-delete-button"
              >
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#fff' }}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function PantryItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const items = usePantryStore((s) => s.items);
  const updateItem = usePantryStore((s) => s.updateItem);
  const deleteItem = usePantryStore((s) => s.deleteItem);
  const restockItem = usePantryStore((s) => s.restockItem);

  const item = items.find((i) => i.id === itemId);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!item) {
    return (
      <View
        style={{ flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontFamily: 'DMSans_400Regular', color: Colors.textSecondary }}>
          Item not found
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: Colors.green }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const catColor = CATEGORY_COLORS[item.category] ?? '#95A5A6';
  const isLowStock = item.quantity <= item.lowStockThreshold;

  const handleDelete = () => {
    deleteItem(item.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    router.back();
  };

  const handleDecrement = () => {
    if (item.quantity > 0) {
      updateItem(item.id, { quantity: item.quantity - 1 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleIncrement = () => {
    restockItem(item.id, 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <LinearGradient colors={['#0A1628', '#0B1C35']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']} testID="pantry-item-detail-screen">
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
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
            }}
            testID="back-button"
          >
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/add-pantry-item', params: { itemId: item.id } })
              }
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: Colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: Colors.border,
              }}
              testID="edit-button"
            >
              <Edit3 size={18} color={Colors.textPrimary} />
            </Pressable>
            <Pressable
              onPress={() => setShowDeleteModal(true)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: Colors.errorMuted,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: Colors.error,
              }}
              testID="delete-button"
            >
              <Trash2 size={18} color={Colors.error} />
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Hero section */}
          <LinearGradient
            colors={[`${catColor}40`, `${catColor}10`, 'transparent']}
            style={{
              marginHorizontal: 16,
              borderRadius: BorderRadius.xl,
              padding: 24,
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 64, marginBottom: 12 }}>
              {CATEGORY_EMOJI[item.category] ?? '📦'}
            </Text>
            <Text
              style={{
                fontFamily: 'PlayfairDisplay_700Bold',
                fontSize: 26,
                color: Colors.textPrimary,
                textAlign: 'center',
                marginBottom: 4,
              }}
            >
              {item.name}
            </Text>
            {item.brand ? (
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 15,
                  color: Colors.textSecondary,
                  marginBottom: 8,
                }}
              >
                {item.brand}
              </Text>
            ) : null}
            <View
              style={{
                backgroundColor: `${catColor}30`,
                borderRadius: BorderRadius.full,
                paddingHorizontal: 14,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: `${catColor}60`,
              }}
            >
              <Text
                style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: catColor }}
              >
                {item.category}
              </Text>
            </View>
          </LinearGradient>

          {/* Nutrition card */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <View
              style={{
                backgroundColor: Colors.navyCard,
                borderRadius: BorderRadius.xl,
                padding: 16,
                borderWidth: 1,
                borderColor: Colors.border,
                ...Shadows.card,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 14,
                  color: Colors.textSecondary,
                  marginBottom: 16,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Nutrition per {item.servingSize || 'serving'}
              </Text>
              <View style={{ flexDirection: 'row' }}>
                <NutritionStat
                  label="Calories"
                  value={item.caloriesPerServing}
                  unit=" kcal"
                  color={Colors.amber}
                />
                <View style={{ width: 1, backgroundColor: Colors.borderLight }} />
                <NutritionStat
                  label="Net Carbs"
                  value={item.carbsPerServing}
                  unit="g"
                  color={Colors.error}
                />
                <View style={{ width: 1, backgroundColor: Colors.borderLight }} />
                <NutritionStat
                  label="Protein"
                  value={item.proteinPerServing}
                  unit="g"
                  color={Colors.green}
                />
                <View style={{ width: 1, backgroundColor: Colors.borderLight }} />
                <NutritionStat
                  label="Fat"
                  value={item.fatPerServing}
                  unit="g"
                  color="#9B59B6"
                />
              </View>
            </View>
          </View>

          {/* Quantity control */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <View
              style={{
                backgroundColor: Colors.navyCard,
                borderRadius: BorderRadius.xl,
                padding: 16,
                borderWidth: 1,
                borderColor: isLowStock ? Colors.error : Colors.border,
                ...Shadows.card,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 14,
                      color: Colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      marginBottom: 4,
                    }}
                  >
                    Current Stock
                  </Text>
                  {isLowStock ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: Colors.errorMuted,
                        borderRadius: BorderRadius.md,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                      }}
                    >
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.error }} />
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.error }}>
                        Low Stock
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <Pressable
                    onPress={handleDecrement}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: Colors.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: Colors.border,
                    }}
                    testID="decrement-button"
                  >
                    <Minus size={16} color={Colors.textPrimary} />
                  </Pressable>
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 24,
                      color: isLowStock ? Colors.error : Colors.green,
                      minWidth: 60,
                      textAlign: 'center',
                    }}
                  >
                    {item.quantity} {item.unit}
                  </Text>
                  <Pressable
                    onPress={handleIncrement}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: Colors.greenMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: Colors.green,
                    }}
                    testID="increment-button"
                  >
                    <Plus size={16} color={Colors.green} />
                  </Pressable>
                </View>
              </View>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 12,
                  color: Colors.textTertiary,
                  marginTop: 8,
                }}
              >
                Alert threshold: {item.lowStockThreshold} {item.unit}
              </Text>
            </View>
          </View>

          {/* Dates */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <View
              style={{
                backgroundColor: Colors.navyCard,
                borderRadius: BorderRadius.xl,
                padding: 16,
                borderWidth: 1,
                borderColor: Colors.border,
                ...Shadows.card,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary }}>
                  Date Added
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textPrimary }}>
                  {formatDate(item.dateAdded)}
                </Text>
              </View>
              {item.expiryDate ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary }}>
                    Expires
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 14,
                      color: Colors.amber,
                    }}
                  >
                    {item.expiryDate}
                  </Text>
                </View>
              ) : null}
              {item.barcode ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary }}>
                    Barcode
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textTertiary }}>
                    {item.barcode}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Restock history */}
          {item.restockHistory.length > 0 ? (
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <View
                style={{
                  backgroundColor: Colors.navyCard,
                  borderRadius: BorderRadius.xl,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  ...Shadows.card,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Clock size={14} color={Colors.textSecondary} />
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 13,
                      color: Colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                    }}
                  >
                    Restock History
                  </Text>
                </View>
                {item.restockHistory.slice(-5).reverse().map((entry, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 8,
                      borderBottomWidth: i < Math.min(item.restockHistory.length, 5) - 1 ? 1 : 0,
                      borderBottomColor: Colors.borderLight,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 13,
                        color: Colors.textSecondary,
                      }}
                    >
                      {formatDate(entry.date)}
                    </Text>
                    <Text
                      style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.green }}
                    >
                      +{entry.quantity} {item.unit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Usage history placeholder */}
          <View style={{ paddingHorizontal: 16 }}>
            <View
              style={{
                backgroundColor: Colors.navyCard,
                borderRadius: BorderRadius.xl,
                padding: 16,
                borderWidth: 1,
                borderColor: Colors.borderLight,
                alignItems: 'center',
                gap: 8,
              }}
            >
              <TrendingUp size={24} color={Colors.textTertiary} />
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 13,
                  color: Colors.textTertiary,
                  textAlign: 'center',
                }}
              >
                Usage analytics coming soon
              </Text>
            </View>
          </View>
        </ScrollView>

        <ConfirmDeleteModal
          visible={showDeleteModal}
          itemName={item.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}
