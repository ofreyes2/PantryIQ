import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  Pressable,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Search,
  SlidersHorizontal,
  BarChart2,
  Plus,
  Package,
  Camera,
  Edit3,
  Scan,
  Trash2,
  Calendar,
} from 'lucide-react-native';
import { usePantryStore, PantryItem, PantryCategory } from '@/lib/stores/pantryStore';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

// ─── Category Color Map ────────────────────────────────────────────────────────

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

const ALL_CATEGORIES: (PantryCategory | 'All')[] = [
  'All',
  'Proteins',
  'Dairy',
  'Vegetables',
  'Frozen',
  'Pantry Staples',
  'Snacks',
  'Condiments',
  'Beverages',
  'Bread & Wraps',
];

type SortOption = 'name' | 'dateAdded' | 'lowStock' | 'category';

// ─── Pantry Item Card ──────────────────────────────────────────────────────────

function PantryItemCard({
  item,
  onDelete,
  onRestock,
  onPress,
}: {
  item: PantryItem;
  onDelete: () => void;
  onRestock: () => void;
  onPress: () => void;
}) {
  const catColor = CATEGORY_COLORS[item.category] ?? '#95A5A6';
  const isLowStock = item.quantity <= item.lowStockThreshold;
  const qtyColor =
    item.quantity <= item.lowStockThreshold
      ? Colors.error
      : item.quantity <= item.lowStockThreshold * 1.5
      ? Colors.amber
      : Colors.green;

  // Format expiry date for display
  const formatExpiry = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDelete();
      }}
      style={{
        backgroundColor: Colors.error,
        justifyContent: 'center',
        alignItems: 'center',
        width: 72,
        marginVertical: 6,
        borderRadius: BorderRadius.xl,
        marginLeft: 4,
      }}
      testID={`delete-item-${item.id}`}
    >
      <Trash2 size={20} color="#fff" />
      <Text
        style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#fff', marginTop: 4 }}
      >
        Delete
      </Text>
    </Pressable>
  );

  const renderLeftActions = () => (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onRestock();
      }}
      style={{
        backgroundColor: Colors.green,
        justifyContent: 'center',
        alignItems: 'center',
        width: 72,
        marginVertical: 6,
        borderRadius: BorderRadius.xl,
        marginRight: 4,
      }}
      testID={`restock-item-${item.id}`}
    >
      <Plus size={20} color={Colors.navy} />
      <Text
        style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.navy, marginTop: 4 }}
      >
        +1
      </Text>
    </Pressable>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} renderLeftActions={renderLeftActions}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        testID={`pantry-item-${item.id}`}
      >
        <View
          style={{
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.xl,
            marginHorizontal: 16,
            marginVertical: 6,
            padding: 16,
            borderWidth: 1,
            borderColor: Colors.border,
            ...Shadows.card,
          }}
        >
          {/* ROW 1: Category + Low Stock badge */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: catColor,
                }}
              />
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 11,
                  color: Colors.textSecondary,
                  letterSpacing: 0.3,
                }}
              >
                {item.category}
              </Text>
            </View>

            {isLowStock ? (
              <View
                style={{
                  backgroundColor: `${Colors.error}20`,
                  borderRadius: BorderRadius.full,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderWidth: 1,
                  borderColor: `${Colors.error}50`,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 10,
                    color: Colors.error,
                    letterSpacing: 0.3,
                  }}
                >
                  Low Stock
                </Text>
              </View>
            ) : null}
          </View>

          {/* ROW 2: Main content */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* LEFT: name, brand, quantity */}
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 17,
                  color: Colors.textPrimary,
                  marginBottom: 4,
                }}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              {item.brand ? (
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: 8,
                  }}
                  numberOfLines={1}
                >
                  {item.brand}
                </Text>
              ) : (
                <View style={{ height: 8 }} />
              )}

              {/* Quantity row */}
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 15,
                    color: qtyColor,
                  }}
                >
                  {item.quantity}
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 13,
                    color: Colors.textSecondary,
                  }}
                >
                  {item.unit}
                </Text>
              </View>
            </View>

            {/* RIGHT: nutrition info */}
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 13,
                  color: Colors.textPrimary,
                  marginBottom: 2,
                }}
              >
                {item.caloriesPerServing} kcal
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 15,
                  color: Colors.green,
                  marginBottom: 2,
                }}
              >
                {item.carbsPerServing}g carbs
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 10,
                  color: Colors.textSecondary,
                }}
              >
                per serving
              </Text>
            </View>
          </View>

          {/* BOTTOM ROW: expiry date if set */}
          {item.expiryDate ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                marginTop: 12,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <Calendar size={12} color={Colors.amber} />
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 12,
                  color: Colors.amber,
                }}
              >
                Expires {formatExpiry(item.expiryDate)}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Swipeable>
  );
}

// ─── FAB ──────────────────────────────────────────────────────────────────────

function FloatingActionButton({ onBatchScan, onSingleScan, onPhoto, onManual }: {
  onBatchScan: () => void;
  onSingleScan: () => void;
  onPhoto: () => void;
  onManual: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rotation = useSharedValue(0);
  const option1Opacity = useSharedValue(0);
  const option1Y = useSharedValue(20);
  const option2Opacity = useSharedValue(0);
  const option2Y = useSharedValue(20);
  const option3Opacity = useSharedValue(0);
  const option3Y = useSharedValue(20);
  const option4Opacity = useSharedValue(0);
  const option4Y = useSharedValue(20);

  const toggle = () => {
    const newOpen = !open;
    setOpen(newOpen);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    rotation.value = withSpring(newOpen ? 45 : 0);

    if (newOpen) {
      option4Opacity.value = withTiming(1, { duration: 120 });
      option4Y.value = withSpring(0);
      option3Opacity.value = withTiming(1, { duration: 160 });
      option3Y.value = withSpring(0);
      option2Opacity.value = withTiming(1, { duration: 200 });
      option2Y.value = withSpring(0);
      option1Opacity.value = withTiming(1, { duration: 250 });
      option1Y.value = withSpring(0);
    } else {
      option1Opacity.value = withTiming(0, { duration: 150 });
      option1Y.value = withTiming(20, { duration: 150 });
      option2Opacity.value = withTiming(0, { duration: 110 });
      option2Y.value = withTiming(20, { duration: 110 });
      option3Opacity.value = withTiming(0, { duration: 80 });
      option3Y.value = withTiming(20, { duration: 80 });
      option4Opacity.value = withTiming(0, { duration: 60 });
      option4Y.value = withTiming(20, { duration: 60 });
    }
  };

  const mainRotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const opt1Style = useAnimatedStyle(() => ({
    opacity: option1Opacity.value,
    transform: [{ translateY: option1Y.value }],
  }));
  const opt2Style = useAnimatedStyle(() => ({
    opacity: option2Opacity.value,
    transform: [{ translateY: option2Y.value }],
  }));
  const opt3Style = useAnimatedStyle(() => ({
    opacity: option3Opacity.value,
    transform: [{ translateY: option3Y.value }],
  }));
  const opt4Style = useAnimatedStyle(() => ({
    opacity: option4Opacity.value,
    transform: [{ translateY: option4Y.value }],
  }));

  return (
    <>
      {open ? (
        <Pressable
          onPress={toggle}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
          }}
        />
      ) : null}
      <View style={{ position: 'absolute', bottom: 100, right: 20, alignItems: 'flex-end' }}>
        {/* Option 1: Manual Entry */}
        <Animated.View style={[opt1Style, { marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary }}>
            Manual Entry
          </Text>
          <Pressable
            onPress={() => { toggle(); onManual(); }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: Colors.border,
              ...Shadows.card,
            }}
            testID="fab-manual-entry"
          >
            <Edit3 size={20} color={Colors.textPrimary} />
          </Pressable>
        </Animated.View>

        {/* Option 2: Take Photo */}
        <Animated.View style={[opt2Style, { marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary }}>
            Take Photo
          </Text>
          <Pressable
            onPress={() => { toggle(); onPhoto(); }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: Colors.border,
              ...Shadows.card,
            }}
            testID="fab-take-photo"
          >
            <Camera size={20} color={Colors.textPrimary} />
          </Pressable>
        </Animated.View>

        {/* Option 3: Scan Single Item */}
        <Animated.View style={[opt3Style, { marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary }}>
            Scan Single Item
          </Text>
          <Pressable
            onPress={() => { toggle(); onSingleScan(); }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: Colors.border,
              ...Shadows.card,
            }}
            testID="fab-scan-single"
          >
            <Scan size={20} color={Colors.textPrimary} />
          </Pressable>
        </Animated.View>

        {/* Option 4: Batch Scan (Rapid) — highlighted */}
        <Animated.View style={[opt4Style, { marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.green }}>
              Batch Scan (Rapid)
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary }}>
              Scan multiple items quickly
            </Text>
          </View>
          <Pressable
            onPress={() => { toggle(); onBatchScan(); }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: Colors.greenMuted,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: Colors.green,
              ...Shadows.card,
            }}
            testID="fab-batch-scan"
          >
            <Scan size={20} color={Colors.green} />
          </Pressable>
        </Animated.View>

        {/* Main FAB */}
        <Pressable
          onPress={toggle}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: Colors.green,
            alignItems: 'center',
            justifyContent: 'center',
            ...Shadows.elevated,
          }}
          testID="fab-main"
        >
          <Animated.View style={mainRotStyle}>
            <Plus size={28} color={Colors.navy} />
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}

// ─── Sort Modal ────────────────────────────────────────────────────────────────

function SortModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: SortOption;
  onSelect: (o: SortOption) => void;
  onClose: () => void;
}) {
  const options: { key: SortOption; label: string }[] = [
    { key: 'name', label: 'Name (A–Z)' },
    { key: 'dateAdded', label: 'Date Added' },
    { key: 'lowStock', label: 'Low Stock First' },
    { key: 'category', label: 'Category' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}}>
          <View
            style={{
              backgroundColor: Colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: 40,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 16,
                color: Colors.textPrimary,
                marginBottom: 16,
              }}
            >
              Sort By
            </Text>
            {options.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => {
                  onSelect(opt.key);
                  onClose();
                }}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.borderLight,
                }}
              >
                <Text
                  style={{
                    fontFamily: selected === opt.key ? 'DMSans_700Bold' : 'DMSans_400Regular',
                    fontSize: 15,
                    color: selected === opt.key ? Colors.green : Colors.textPrimary,
                  }}
                >
                  {opt.label}
                </Text>
                {selected === opt.key ? (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: Colors.green,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: Colors.navy, fontSize: 12, fontFamily: 'DMSans_700Bold' }}>
                      ✓
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Pantry Screen ───────────────────────────────────────────────────────

export default function PantryScreen() {
  const items = usePantryStore((s) => s.items);
  const deleteItem = usePantryStore((s) => s.deleteItem);
  const restockItem = usePantryStore((s) => s.restockItem);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PantryCategory | 'All'>('All');
  const [sortOption, setSortOption] = useState<SortOption>('dateAdded');
  const [showSortModal, setShowSortModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  // Filter and sort
  const filteredItems = React.useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.brand?.toLowerCase().includes(q) ?? false)
      );
    }

    if (selectedCategory !== 'All') {
      result = result.filter((item) => item.category === selectedCategory);
    }

    switch (sortOption) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'dateAdded':
        result.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        break;
      case 'lowStock':
        result.sort((a, b) => {
          const aLow = a.quantity <= a.lowStockThreshold ? 0 : 1;
          const bLow = b.quantity <= b.lowStockThreshold ? 0 : 1;
          return aLow - bLow;
        });
        break;
      case 'category':
        result.sort((a, b) => a.category.localeCompare(b.category));
        break;
    }

    return result;
  }, [items, searchQuery, selectedCategory, sortOption]);

  const lowStockCount = items.filter((item) => item.quantity <= item.lowStockThreshold).length;

  return (
    <LinearGradient colors={['#0A1628', '#0B1C35']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']} testID="pantry-screen">
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 16,
          }}
        >
          <Text
            style={{
              fontFamily: 'PlayfairDisplay_700Bold',
              fontSize: 28,
              color: Colors.textPrimary,
            }}
          >
            Pantry
          </Text>
          <Pressable
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
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
            testID="pantry-analytics-button"
          >
            <BarChart2 size={20} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {/* Search bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 16,
            marginBottom: 12,
            gap: 10,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: Colors.border,
              paddingHorizontal: 16,
              height: 48,
              gap: 8,
            }}
          >
            <Search size={18} color={Colors.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search pantry..."
              placeholderTextColor={Colors.textTertiary}
              style={{
                flex: 1,
                fontFamily: 'DMSans_400Regular',
                fontSize: 15,
                color: Colors.textPrimary,
              }}
              testID="pantry-search-input"
            />
          </View>
          <Pressable
            onPress={() => setShowSortModal(true)}
            style={{
              width: 48,
              height: 48,
              borderRadius: BorderRadius.lg,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: Colors.border,
            }}
            testID="pantry-filter-button"
          >
            <SlidersHorizontal size={18} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 4 }}
          style={{ flexGrow: 0, marginBottom: 8 }}
        >
          {ALL_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => {
                  setSelectedCategory(cat as PantryCategory | 'All');
                  Haptics.selectionAsync();
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: BorderRadius.full,
                  backgroundColor: isActive ? Colors.green : Colors.surface,
                  borderWidth: 1,
                  borderColor: isActive ? Colors.green : Colors.border,
                  marginRight: 0,
                }}
                testID={`category-chip-${cat}`}
              >
                <Text
                  style={{
                    fontFamily: isActive ? 'DMSans_700Bold' : 'DMSans_400Regular',
                    fontSize: 13,
                    color: isActive ? Colors.navy : Colors.textSecondary,
                  }}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Item count */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary }}
          >
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            {lowStockCount > 0 ? (
              ` · `
            ) : null}
            {lowStockCount > 0 ? (
              <Text style={{ color: Colors.error }}>
                {lowStockCount} low stock
              </Text>
            ) : null}
          </Text>
        </View>

        {/* Items list */}
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PantryItemCard
              item={item}
              onDelete={() => deleteItem(item.id)}
              onRestock={() => restockItem(item.id, 1)}
              onPress={() => router.push({ pathname: '/pantry-item-detail', params: { itemId: item.id } })}
            />
          )}
          contentContainerStyle={{ paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.green}
            />
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 32 }} />
          )}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: Colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Package size={36} color={Colors.textTertiary} />
              </View>
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 18,
                  color: Colors.textPrimary,
                  marginBottom: 8,
                  textAlign: 'center',
                }}
              >
                {searchQuery ? 'No items found' : 'Pantry is empty'}
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 14,
                  color: Colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: 22,
                }}
              >
                {searchQuery
                  ? 'Try a different search term'
                  : 'Tap the + button to add your first pantry item'}
              </Text>
            </View>
          )}
        />

        {/* FAB */}
        <FloatingActionButton
          onBatchScan={() => router.push('/barcode-scanner?mode=rapid')}
          onSingleScan={() => router.push('/barcode-scanner')}
          onPhoto={() => router.push('/add-pantry-item')}
          onManual={() => router.push('/add-pantry-item')}
        />

        {/* Sort Modal */}
        <SortModal
          visible={showSortModal}
          selected={sortOption}
          onSelect={setSortOption}
          onClose={() => setShowSortModal(false)}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}
