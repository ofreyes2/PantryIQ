import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Clock,
  Share2,
  Plus,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useShoppingStore, ShoppingItem } from '@/lib/stores/shoppingStore';
import { usePantryStore } from '@/lib/stores/pantryStore';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

const CATEGORY_COLORS: Record<string, string> = {
  Dairy: '#3498DB',
  Proteins: '#E74C3C',
  Vegetables: '#2ECC71',
  'Pantry Staples': '#F39C12',
  Snacks: '#9B59B6',
  Beverages: '#1ABC9C',
  Other: '#7F8C8D',
};

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ShoppingItemRow({ item }: { item: ShoppingItem }) {
  const toggleCheck = useShoppingStore((s) => s.toggleCheck);
  const deleteItem = useShoppingStore((s) => s.deleteItem);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const categoryColor = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.Other;

  const handleCheck = () => {
    scale.value = withSequence(withSpring(1.2), withSpring(1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleCheck(item.id);
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        opacity: item.isChecked ? 0.5 : 1,
      }}
    >
      {/* Category dot */}
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: categoryColor,
          marginRight: 12,
        }}
      />

      {/* Checkbox */}
      <Animated.View style={animStyle}>
        <Pressable
          onPress={handleCheck}
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: item.isChecked ? Colors.green : Colors.border,
            backgroundColor: item.isChecked ? Colors.green : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
          testID={`check-item-${item.id}`}
        >
          {item.isChecked ? <Check size={14} color={Colors.navy} /> : null}
        </Pressable>
      </Animated.View>

      {/* Item info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 15,
            color: Colors.textPrimary,
            textDecorationLine: item.isChecked ? 'line-through' : 'none',
          }}
        >
          {item.name}
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 1 }}>
          {item.quantity} {item.unit}
          {item.estimatedPrice ? ` · est. $${item.estimatedPrice.toFixed(2)}` : ''}
        </Text>
      </View>

      {/* Delete */}
      <Pressable
        onPress={() => deleteItem(item.id)}
        style={{
          width: 32,
          height: 32,
          borderRadius: BorderRadius.full,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        testID={`delete-item-${item.id}`}
      >
        <Trash2 size={15} color={Colors.textTertiary} />
      </Pressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ShoppingScreen() {
  const router = useRouter();

  const items = useShoppingStore((s) => s.items);
  const stores = useShoppingStore((s) => s.stores);
  const addItem = useShoppingStore((s) => s.addItem);
  const addStore = useShoppingStore((s) => s.addStore);
  const clearChecked = useShoppingStore((s) => s.clearChecked);
  const completeTrip = useShoppingStore((s) => s.completeTrip);
  const getItemsByStore = useShoppingStore((s) => s.getItemsByStore);
  const getEstimatedTotalByStore = useShoppingStore((s) => s.getEstimatedTotalByStore);
  const pantryItems = usePantryStore((s) => s.items);
  const getLowStockItems = usePantryStore((s) => s.getLowStockItems);

  const [activeStore, setActiveStore] = useState('All');
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [completeTripModalVisible, setCompleteTripModalVisible] = useState(false);
  const [cartCollapsed, setCartCollapsed] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [addStoreModalVisible, setAddStoreModalVisible] = useState(false);

  // Add item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('unit');
  const [newItemStore, setNewItemStore] = useState(stores[0] ?? "Sam's Club");
  const [newItemCategory, setNewItemCategory] = useState('Other');

  const itemsByStore = getItemsByStore();
  const estimatedTotals = getEstimatedTotalByStore();

  const lowStockItems = getLowStockItems();
  const lowStockNotInList = lowStockItems.filter(
    (p) => !items.some((i) => i.name.toLowerCase() === p.name.toLowerCase())
  );

  const checkedItems = items.filter((i) => i.isChecked);
  const uncheckedItems = items.filter((i) => !i.isChecked);

  const displayedItems =
    activeStore === 'All'
      ? uncheckedItems
      : uncheckedItems.filter((i) => i.store === activeStore);

  const groupedItems =
    activeStore === 'All'
      ? Object.entries(itemsByStore).filter(([, storeItems]) =>
          storeItems.some((i) => !i.isChecked)
        )
      : [];

  const handleAddAll = () => {
    lowStockNotInList.forEach((p) => {
      addItem({
        name: p.name,
        quantity: p.lowStockThreshold,
        unit: p.unit,
        category: p.category,
        store: stores[0] ?? "Sam's Club",
        isChecked: false,
        isRecurring: false,
      });
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveNewItem = () => {
    if (!newItemName.trim()) return;
    addItem({
      name: newItemName.trim(),
      quantity: parseFloat(newItemQty) || 1,
      unit: newItemUnit,
      category: newItemCategory,
      store: newItemStore,
      isChecked: false,
      isRecurring: false,
    });
    setNewItemName('');
    setNewItemQty('1');
    setAddItemModalVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleShare = async () => {
    const lines: string[] = ['My Shopping List\n'];
    const byStore = getItemsByStore();
    Object.entries(byStore).forEach(([store, storeItems]) => {
      lines.push(`--- ${store} ---`);
      storeItems.filter((i) => !i.isChecked).forEach((item) => {
        lines.push(`• ${item.name} (${item.quantity} ${item.unit})`);
      });
      lines.push('');
    });
    await Share.share({ message: lines.join('\n'), title: 'Shopping List' });
  };

  const handleCompleteTrip = () => {
    if (checkedItems.length === 0) return;
    const store = activeStore === 'All' ? (checkedItems[0]?.store ?? 'Unknown') : activeStore;
    const tripItems = checkedItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      price: item.estimatedPrice ?? 0,
    }));
    completeTrip(store, tripItems);

    // Update linked pantry items
    checkedItems.forEach((item) => {
      if (item.pantryItemId) {
        const pantryItem = pantryItems.find((p) => p.id === item.pantryItemId);
        if (pantryItem) {
          // Restock handled by user manually — don't auto-update here
        }
      }
    });

    setCompleteTripModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const allStores = ['All', ...stores];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }} testID="shopping-screen">
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
            Shopping
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => router.push('/shopping-history')}
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
              testID="history-button"
            >
              <Clock size={18} color={Colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={handleShare}
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
              testID="share-button"
            >
              <Share2 size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Pantry Suggestions */}
          {lowStockNotInList.length > 0 ? (
            <View
              style={{
                marginHorizontal: Spacing.md,
                backgroundColor: Colors.navyCard,
                borderRadius: 16,
                padding: Spacing.md,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary }}>
                    From Your Pantry
                  </Text>
                  <View
                    style={{
                      backgroundColor: Colors.green,
                      borderRadius: BorderRadius.full,
                      width: 22,
                      height: 22,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.navy }}>
                      {lowStockNotInList.length}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={handleAddAll}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: BorderRadius.full,
                    borderWidth: 1,
                    borderColor: Colors.green,
                  }}
                  testID="add-all-button"
                >
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.green }}>
                    Add All
                  </Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {lowStockNotInList.slice(0, 6).map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      addItem({
                        name: item.name,
                        quantity: item.lowStockThreshold,
                        unit: item.unit,
                        category: item.category,
                        store: stores[0] ?? "Sam's Club",
                        isChecked: false,
                        isRecurring: false,
                      });
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: BorderRadius.full,
                      backgroundColor: Colors.surface,
                      borderWidth: 1,
                      borderColor: Colors.border,
                    }}
                  >
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary }}>
                      {item.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* Store Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 12, gap: 8 }}
          >
            {allStores.map((store) => {
              const count =
                store === 'All'
                  ? uncheckedItems.length
                  : uncheckedItems.filter((i) => i.store === store).length;
              const isActive = activeStore === store;
              return (
                <Pressable
                  key={store}
                  onPress={() => setActiveStore(store)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: BorderRadius.full,
                    backgroundColor: isActive ? Colors.green : Colors.surface,
                    borderWidth: 1,
                    borderColor: isActive ? Colors.green : Colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  testID={`store-tab-${store}`}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 13,
                      color: isActive ? Colors.navy : Colors.textSecondary,
                    }}
                  >
                    {store}
                  </Text>
                  {count > 0 ? (
                    <View
                      style={{
                        backgroundColor: isActive ? Colors.navy : Colors.surface,
                        borderRadius: BorderRadius.full,
                        minWidth: 18,
                        height: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'DMSans_700Bold',
                          fontSize: 10,
                          color: isActive ? Colors.green : Colors.textTertiary,
                        }}
                      >
                        {count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setAddStoreModalVisible(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: BorderRadius.full,
                backgroundColor: Colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: Colors.border,
              }}
              testID="add-store-button"
            >
              <Plus size={16} color={Colors.textSecondary} />
            </Pressable>
          </ScrollView>

          {/* Shopping List Content */}
          <View
            style={{
              marginHorizontal: Spacing.md,
              backgroundColor: Colors.navyCard,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: Colors.border,
              marginBottom: 16,
            }}
          >
            {activeStore === 'All' && groupedItems.length > 0 ? (
              groupedItems.map(([store, storeItems]) => (
                <View key={store}>
                  <View
                    style={{
                      paddingHorizontal: Spacing.md,
                      paddingVertical: 10,
                      backgroundColor: Colors.surface,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textSecondary }}>
                      {store}
                    </Text>
                    {estimatedTotals[store] ? (
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.green }}>
                        est. ${estimatedTotals[store].toFixed(2)}
                      </Text>
                    ) : null}
                  </View>
                  {storeItems.filter((i) => !i.isChecked).map((item) => (
                    <ShoppingItemRow key={item.id} item={item} />
                  ))}
                </View>
              ))
            ) : activeStore !== 'All' ? (
              <>
                <View
                  style={{
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 10,
                    backgroundColor: Colors.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textSecondary }}>
                    {activeStore}
                  </Text>
                  {estimatedTotals[activeStore] ? (
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.green }}>
                      est. ${estimatedTotals[activeStore].toFixed(2)}
                    </Text>
                  ) : null}
                </View>
                {displayedItems.length > 0 ? (
                  displayedItems.map((item) => <ShoppingItemRow key={item.id} item={item} />)
                ) : (
                  <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textTertiary }}>
                      No items for {activeStore}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textTertiary }}>
                  Your shopping list is empty
                </Text>
              </View>
            )}
          </View>

          {/* Checked Items */}
          {checkedItems.length > 0 ? (
            <View
              style={{
                marginHorizontal: Spacing.md,
                backgroundColor: Colors.navyCard,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: Colors.border,
                marginBottom: 16,
              }}
            >
              <Pressable
                onPress={() => setCartCollapsed((c) => !c)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: Spacing.md,
                  paddingVertical: 12,
                  backgroundColor: Colors.surface,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textSecondary }}>
                  In Cart ({checkedItems.length})
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Pressable
                    onPress={clearChecked}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: BorderRadius.full,
                      backgroundColor: Colors.errorMuted,
                      borderWidth: 1,
                      borderColor: 'rgba(231,76,60,0.3)',
                    }}
                    testID="clear-cart-button"
                  >
                    <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.error }}>
                      Clear Cart
                    </Text>
                  </Pressable>
                  {cartCollapsed ? (
                    <ChevronDown size={16} color={Colors.textTertiary} />
                  ) : (
                    <ChevronUp size={16} color={Colors.textTertiary} />
                  )}
                </View>
              </Pressable>
              {!cartCollapsed
                ? checkedItems.map((item) => <ShoppingItemRow key={item.id} item={item} />)
                : null}
            </View>
          ) : null}

          {/* Estimated Total Card */}
          {Object.keys(estimatedTotals).length > 0 ? (
            <View
              style={{
                marginHorizontal: Spacing.md,
                backgroundColor: Colors.navyCard,
                borderRadius: 16,
                padding: Spacing.md,
                borderWidth: 1,
                borderColor: Colors.border,
                marginBottom: 8,
              }}
            >
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textSecondary, marginBottom: 10 }}>
                Estimated Total
              </Text>
              {Object.entries(estimatedTotals).map(([store, total]) => (
                <View
                  key={store}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
                >
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary }}>
                    {store}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.green }}>
                    ${total.toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 8 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary }}>
                  Grand Total
                </Text>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.green }}>
                  ${Object.values(estimatedTotals).reduce((s, v) => s + v, 0).toFixed(2)}
                </Text>
              </View>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textTertiary, marginTop: 6 }}>
                Prices based on history
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Complete Trip Banner */}
        {checkedItems.length > 0 ? (
          <View
            style={{
              position: 'absolute',
              bottom: 90,
              left: Spacing.md,
              right: 80,
            }}
          >
            <Pressable
              onPress={() => setCompleteTripModalVisible(true)}
              style={{
                backgroundColor: Colors.green,
                borderRadius: BorderRadius.lg,
                padding: 14,
                alignItems: 'center',
                shadowColor: Colors.green,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              }}
              testID="complete-trip-button"
            >
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy }}>
                Complete Trip ({checkedItems.length} items)
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* FAB */}
        <View style={{ position: 'absolute', bottom: 90, right: 20 }}>
          <Pressable
            onPress={() => setAddItemModalVisible(true)}
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
            testID="add-item-fab"
          >
            <Plus size={24} color={Colors.navy} />
          </Pressable>
        </View>

        {/* Add Item Modal */}
        <Modal
          visible={addItemModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAddItemModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
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
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 }} />
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary, marginBottom: 16 }}>
                Add Item
              </Text>

              <TextInput
                value={newItemName}
                onChangeText={setNewItemName}
                placeholder="Item name..."
                placeholderTextColor={Colors.textTertiary}
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 15,
                  color: Colors.textPrimary,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  marginBottom: 10,
                }}
                autoFocus
                testID="new-item-name-input"
              />

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <TextInput
                  value={newItemQty}
                  onChangeText={setNewItemQty}
                  keyboardType="decimal-pad"
                  placeholder="Qty"
                  placeholderTextColor={Colors.textTertiary}
                  style={{
                    flex: 1,
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.md,
                    padding: Spacing.md,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 15,
                    color: Colors.textPrimary,
                    borderWidth: 1,
                    borderColor: Colors.border,
                  }}
                  testID="new-item-qty-input"
                />
                <TextInput
                  value={newItemUnit}
                  onChangeText={setNewItemUnit}
                  placeholder="Unit"
                  placeholderTextColor={Colors.textTertiary}
                  style={{
                    flex: 1,
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.md,
                    padding: Spacing.md,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 15,
                    color: Colors.textPrimary,
                    borderWidth: 1,
                    borderColor: Colors.border,
                  }}
                  testID="new-item-unit-input"
                />
              </View>

              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textSecondary, marginBottom: 8 }}>
                Store
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, marginBottom: 16 }}
                contentContainerStyle={{ gap: 8 }}
              >
                {stores.map((store) => (
                  <Pressable
                    key={store}
                    onPress={() => setNewItemStore(store)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: BorderRadius.full,
                      backgroundColor: newItemStore === store ? Colors.green : Colors.surface,
                      borderWidth: 1,
                      borderColor: newItemStore === store ? Colors.green : Colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 12,
                        color: newItemStore === store ? Colors.navy : Colors.textSecondary,
                      }}
                    >
                      {store}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textSecondary, marginBottom: 8 }}>
                Category
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, marginBottom: 20 }}
                contentContainerStyle={{ gap: 8 }}
              >
                {Object.keys(CATEGORY_COLORS).map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setNewItemCategory(cat)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: BorderRadius.full,
                      backgroundColor: newItemCategory === cat ? Colors.surface : 'transparent',
                      borderWidth: 1,
                      borderColor: newItemCategory === cat ? CATEGORY_COLORS[cat] : Colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 12,
                        color: newItemCategory === cat ? CATEGORY_COLORS[cat] : Colors.textTertiary,
                      }}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => setAddItemModalVisible(false)}
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
                  onPress={handleSaveNewItem}
                  style={{
                    flex: 2,
                    padding: 14,
                    borderRadius: BorderRadius.md,
                    backgroundColor: Colors.green,
                    alignItems: 'center',
                  }}
                  testID="save-item-button"
                >
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy }}>Save Item</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Store Modal */}
        <Modal
          visible={addStoreModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAddStoreModalVisible(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
            onPress={() => setAddStoreModalVisible(false)}
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
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 }} />
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary, marginBottom: 16 }}>
                Add Store
              </Text>
              <TextInput
                value={newStoreName}
                onChangeText={setNewStoreName}
                placeholder="Store name..."
                placeholderTextColor={Colors.textTertiary}
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 15,
                  color: Colors.textPrimary,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  marginBottom: 16,
                }}
                autoFocus
                testID="new-store-input"
              />
              <Pressable
                onPress={() => {
                  if (newStoreName.trim()) {
                    addStore(newStoreName.trim());
                    setNewStoreName('');
                    setAddStoreModalVisible(false);
                  }
                }}
                style={{
                  backgroundColor: Colors.green,
                  borderRadius: BorderRadius.md,
                  padding: 14,
                  alignItems: 'center',
                }}
                testID="save-store-button"
              >
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy }}>Add Store</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* Complete Trip Modal */}
        <Modal
          visible={completeTripModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setCompleteTripModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
            <View
              style={{
                backgroundColor: Colors.navyCard,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: Spacing.lg,
                paddingBottom: 40,
                maxHeight: '70%',
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16 }} />
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary, marginBottom: 6 }}>
                Complete Trip
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginBottom: 16 }}>
                {checkedItems.length} items checked off — mark this trip as complete?
              </Text>

              <ScrollView style={{ maxHeight: 200 }}>
                {checkedItems.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 6,
                      borderBottomWidth: 1,
                      borderBottomColor: Colors.borderLight,
                    }}
                  >
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary }}>
                      {item.name} ({item.quantity} {item.unit})
                    </Text>
                    {item.estimatedPrice ? (
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.green }}>
                        ${item.estimatedPrice.toFixed(2)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <Pressable
                  onPress={() => setCompleteTripModalVisible(false)}
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
                  onPress={handleCompleteTrip}
                  style={{
                    flex: 2,
                    padding: 14,
                    borderRadius: BorderRadius.md,
                    backgroundColor: Colors.green,
                    alignItems: 'center',
                  }}
                  testID="confirm-trip-button"
                >
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy }}>Complete Trip</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
