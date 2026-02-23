import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useRouter, useFocusEffect } from 'expo-router';
import { dateUtils } from '@/lib/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Heart,
  Trash2,
  ScanLine,
  Camera,
  Search,
  Droplets,
  Sparkles,
  BarChart2,
  Calendar,
  RefreshCw,
  X,
  Minus,
  Edit3,
  Copy,
  Share2,
  Move,
  MoreVertical,
} from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '@/constants/theme';
import { useMealsStore, FoodEntry, MealType } from '@/lib/stores/mealsStore';
import { useAppStore } from '@/lib/stores/appStore';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { useToast } from '@/components/Toast';
import { ManualFoodEntryForm } from '@/components/ManualFoodEntryForm';
import { EditEntrySheet } from '@/components/EditEntrySheet';
import { MoveToMealSheet } from '@/components/MoveToMealSheet';
import { MealLogger } from '@/lib/mealLogger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Mock food database ───────────────────────────────────────────────────────
interface FoodItem {
  id: string;
  name: string;
  brand: string;
  caloriesPerServing: number;
  carbsPerServing: number;
  proteinPerServing: number;
  fatPerServing: number;
  fiberPerServing: number;
  netCarbsPerServing: number;
  servingDescription: string;
}

const MOCK_FOODS: FoodItem[] = [
  { id: 'f1', name: 'Scrambled Eggs', brand: 'Generic', caloriesPerServing: 140, carbsPerServing: 1, proteinPerServing: 12, fatPerServing: 10, fiberPerServing: 0, netCarbsPerServing: 1, servingDescription: '2 large eggs' },
  { id: 'f2', name: 'Avocado', brand: 'Generic', caloriesPerServing: 160, carbsPerServing: 9, proteinPerServing: 2, fatPerServing: 15, fiberPerServing: 7, netCarbsPerServing: 2, servingDescription: '1 whole (150g)' },
  { id: 'f3', name: 'Greek Yogurt', brand: 'Chobani', caloriesPerServing: 90, carbsPerServing: 6, proteinPerServing: 17, fatPerServing: 0, fiberPerServing: 0, netCarbsPerServing: 6, servingDescription: '1 container (150g)' },
  { id: 'f4', name: 'Grilled Chicken Breast', brand: 'Generic', caloriesPerServing: 165, carbsPerServing: 0, proteinPerServing: 31, fatPerServing: 4, fiberPerServing: 0, netCarbsPerServing: 0, servingDescription: '100g' },
  { id: 'f5', name: 'Almonds', brand: 'Blue Diamond', caloriesPerServing: 160, carbsPerServing: 6, proteinPerServing: 6, fatPerServing: 14, fiberPerServing: 3, netCarbsPerServing: 3, servingDescription: '28g (about 23 almonds)' },
  { id: 'f6', name: 'Salmon Fillet', brand: 'Generic', caloriesPerServing: 208, carbsPerServing: 0, proteinPerServing: 28, fatPerServing: 10, fiberPerServing: 0, netCarbsPerServing: 0, servingDescription: '100g' },
  { id: 'f7', name: 'Broccoli', brand: 'Generic', caloriesPerServing: 31, carbsPerServing: 6, proteinPerServing: 3, fatPerServing: 0, fiberPerServing: 2, netCarbsPerServing: 4, servingDescription: '1 cup (91g)' },
  { id: 'f8', name: 'Cheddar Cheese', brand: 'Kraft', caloriesPerServing: 110, carbsPerServing: 0, proteinPerServing: 7, fatPerServing: 9, fiberPerServing: 0, netCarbsPerServing: 0, servingDescription: '1 slice (28g)' },
  { id: 'f9', name: 'Bulletproof Coffee', brand: 'Generic', caloriesPerServing: 230, carbsPerServing: 0, proteinPerServing: 0, fatPerServing: 26, fiberPerServing: 0, netCarbsPerServing: 0, servingDescription: '1 cup (240ml)' },
  { id: 'f10', name: 'Cauliflower Rice', brand: 'Green Giant', caloriesPerServing: 25, carbsPerServing: 5, proteinPerServing: 2, fatPerServing: 0, fiberPerServing: 2, netCarbsPerServing: 3, servingDescription: '1 cup (85g)' },
  { id: 'f11', name: 'Bacon', brand: 'Oscar Mayer', caloriesPerServing: 90, carbsPerServing: 0, proteinPerServing: 6, fatPerServing: 7, fiberPerServing: 0, netCarbsPerServing: 0, servingDescription: '2 slices (15g)' },
  { id: 'f12', name: 'Beef Steak', brand: 'Generic', caloriesPerServing: 271, carbsPerServing: 0, proteinPerServing: 26, fatPerServing: 18, fiberPerServing: 0, netCarbsPerServing: 0, servingDescription: '100g' },
  { id: 'f13', name: 'Cottage Cheese', brand: 'Daisy', caloriesPerServing: 110, carbsPerServing: 5, proteinPerServing: 14, fatPerServing: 5, fiberPerServing: 0, netCarbsPerServing: 5, servingDescription: '½ cup (113g)' },
  { id: 'f14', name: 'Walnut Halves', brand: 'Planters', caloriesPerServing: 185, carbsPerServing: 4, proteinPerServing: 4, fatPerServing: 18, fiberPerServing: 2, netCarbsPerServing: 2, servingDescription: '28g (about 14 halves)' },
  { id: 'f15', name: 'Asparagus', brand: 'Generic', caloriesPerServing: 20, carbsPerServing: 4, proteinPerServing: 2, fatPerServing: 0, fiberPerServing: 2, netCarbsPerServing: 2, servingDescription: '5 spears (60g)' },
  { id: 'f16', name: 'Whole Milk', brand: 'Generic', caloriesPerServing: 150, carbsPerServing: 12, proteinPerServing: 8, fatPerServing: 8, fiberPerServing: 0, netCarbsPerServing: 12, servingDescription: '1 cup (240ml)' },
  { id: 'f17', name: 'Butter', brand: 'Kerrygold', caloriesPerServing: 100, carbsPerServing: 0, proteinPerServing: 0, fatPerServing: 11, fiberPerServing: 0, netCarbsPerServing: 0, servingDescription: '1 tbsp (14g)' },
  { id: 'f18', name: 'Hard Boiled Egg', brand: 'Generic', caloriesPerServing: 78, carbsPerServing: 1, proteinPerServing: 6, fatPerServing: 5, fiberPerServing: 0, netCarbsPerServing: 1, servingDescription: '1 large egg (50g)' },
  { id: 'f19', name: 'Tuna (canned)', brand: 'Starkist', caloriesPerServing: 100, carbsPerServing: 0, proteinPerServing: 22, fatPerServing: 1, fiberPerServing: 0, netCarbsPerServing: 0, servingDescription: '1 can (85g)' },
  { id: 'f20', name: 'Mixed Nuts', brand: 'Planters', caloriesPerServing: 170, carbsPerServing: 6, proteinPerServing: 5, fatPerServing: 15, fiberPerServing: 2, netCarbsPerServing: 4, servingDescription: '28g' },
];

const QUICK_ADD_ITEMS = [
  { name: 'Eggs', food: MOCK_FOODS[0] },
  { name: 'Coffee', food: MOCK_FOODS[8] },
  { name: 'Almonds', food: MOCK_FOODS[4] },
  { name: 'Chicken', food: MOCK_FOODS[3] },
  { name: 'Avocado', food: MOCK_FOODS[1] },
];

// ─── Meal config ──────────────────────────────────────────────────────────────
interface MealSection {
  type: MealType;
  label: string;
  icon: string;
  color: string;
}

const MEAL_SECTIONS: MealSection[] = [
  { type: 'Breakfast', label: 'Breakfast', icon: '🌅', color: '#F39C12' },
  { type: 'Lunch', label: 'Lunch', icon: '🌞', color: '#E67E22' },
  { type: 'Dinner', label: 'Dinner', icon: '🌙', color: '#9B59B6' },
  { type: 'Snacks', label: 'Snacks', icon: '🍎', color: '#2ECC71' },
];

// ─── Circular Progress Ring ───────────────────────────────────────────────────
function CircularProgress({ size, strokeWidth, progress, color, bg }: {
  size: number;
  strokeWidth: number;
  progress: number; // 0-1
  color: string;
  bg: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <View style={{ width: size, height: size }}>
      {/* Background ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: bg,
        }}
      />
      {/* Progress ring using a View-based approach */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: clampedProgress > 0 ? color : 'transparent',
          borderRightColor: clampedProgress > 0.25 ? color : 'transparent',
          borderBottomColor: clampedProgress > 0.5 ? color : 'transparent',
          borderLeftColor: clampedProgress > 0.75 ? color : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }}
      />
      {/* Inner fill for partial segments */}
      {clampedProgress > 0 && clampedProgress <= 0.25 && (
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            borderTopColor: color,
            borderRightColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
            transform: [{ rotate: `${-90 + clampedProgress * 360}deg` }],
          }}
        />
      )}
    </View>
  );
}

// Simple arc-based circular progress using overlapping views
function RingProgress({ size, progress, color, strokeWidth = 6 }: {
  size: number;
  progress: number;
  color: string;
  strokeWidth?: number;
}) {
  const clamp = Math.min(1, Math.max(0, progress));
  const deg = clamp * 360;
  const bgColor = 'rgba(255,255,255,0.08)';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* BG circle */}
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: bgColor,
      }} />
      {/* Filled arc approximation using conic-gradient-like approach with 4 quadrant views */}
      {deg > 0 && (
        <View style={{ position: 'absolute', width: size, height: size }}>
          {/* Top-right quadrant */}
          {deg > 0 && (
            <View style={{
              position: 'absolute', width: size / 2, height: size / 2,
              top: 0, right: 0, overflow: 'hidden',
            }}>
              <View style={{
                position: 'absolute', width: size, height: size,
                left: -size / 2,
                borderRadius: size / 2,
                borderWidth: strokeWidth,
                borderColor: 'transparent',
                borderTopColor: deg >= 0 ? color : 'transparent',
                borderRightColor: deg >= 90 ? color : 'transparent',
                transform: [{ rotate: `${Math.min(deg, 90)}deg` }],
              }} />
            </View>
          )}
          {/* Bottom-right quadrant */}
          {deg > 90 && (
            <View style={{
              position: 'absolute', width: size / 2, height: size / 2,
              bottom: 0, right: 0, overflow: 'hidden',
            }}>
              <View style={{
                position: 'absolute', width: size, height: size,
                left: -size / 2, top: -size / 2,
                borderRadius: size / 2,
                borderWidth: strokeWidth,
                borderColor: 'transparent',
                borderRightColor: color,
                borderBottomColor: deg >= 180 ? color : 'transparent',
                transform: [{ rotate: `${Math.min(deg - 90, 90)}deg` }],
              }} />
            </View>
          )}
          {/* Bottom-left quadrant */}
          {deg > 180 && (
            <View style={{
              position: 'absolute', width: size / 2, height: size / 2,
              bottom: 0, left: 0, overflow: 'hidden',
            }}>
              <View style={{
                position: 'absolute', width: size, height: size,
                top: -size / 2,
                borderRadius: size / 2,
                borderWidth: strokeWidth,
                borderColor: 'transparent',
                borderBottomColor: color,
                borderLeftColor: deg >= 270 ? color : 'transparent',
                transform: [{ rotate: `${Math.min(deg - 180, 90)}deg` }],
              }} />
            </View>
          )}
          {/* Top-left quadrant */}
          {deg > 270 && (
            <View style={{
              position: 'absolute', width: size / 2, height: size / 2,
              top: 0, left: 0, overflow: 'hidden',
            }}>
              <View style={{
                position: 'absolute', width: size, height: size,
                borderRadius: size / 2,
                borderWidth: strokeWidth,
                borderColor: 'transparent',
                borderLeftColor: color,
                borderTopColor: deg >= 360 ? color : 'transparent',
                transform: [{ rotate: `${Math.min(deg - 270, 90)}deg` }],
              }} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Nutrition Bar ────────────────────────────────────────────────────────────
function NutritionBar({ value, goal, color, label, unit = 'g' }: {
  value: number;
  goal: number;
  color: string;
  label: string;
  unit?: string;
}) {
  const progress = goal > 0 ? Math.min(1, value / goal) : 0;
  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withTiming(progress, { duration: 700 });
  }, [progress]);

  const animatedBar = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }));

  const isOver = value > goal;

  return (
    <View style={{ flex: 1, marginHorizontal: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.textSecondary }}>{label}</Text>
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 11, color: isOver ? Colors.error : Colors.textPrimary }}>
          {Math.round(value)}{unit !== 'kcal' ? unit : ''} {unit === 'kcal' ? 'kcal' : null}
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <Animated.View style={[{ height: 6, backgroundColor: isOver ? Colors.error : color, borderRadius: 3 }, animatedBar]} />
      </View>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textTertiary, marginTop: 2 }}>
        of {goal}{unit !== 'kcal' ? unit : ' kcal'} goal
      </Text>
    </View>
  );
}

// ─── Food item row ────────────────────────────────────────────────────────────
function FoodItemRow({
  entry,
  onDelete,
  onToggleFavorite,
  onEdit,
  onMove,
}: {
  entry: FoodEntry;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onEdit?: () => void;
  onMove?: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const { showToast } = useToast();

  const handleDeletePress = () => {
    setDeleteConfirmVisible(true);
    swipeRef.current?.close();
  };

  const handleConfirmDelete = () => {
    onDelete();
    setDeleteConfirmVisible(false);
    showToast(`${entry.name} deleted`, 'success');
  };

  const handleLongPress = () => {
    setContextMenuVisible(true);
  };

  const renderRightActions = () => (
    <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}>
      <Pressable
        onPress={() => {
          onEdit?.();
          swipeRef.current?.close();
        }}
        style={{
          backgroundColor: '#3498DB',
          justifyContent: 'center',
          alignItems: 'center',
          width: 72,
          borderRadius: BorderRadius.md,
        }}
        testID={`edit-food-entry-button-${entry.id}`}
      >
        <Edit3 size={18} color="#fff" />
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: '#fff', marginTop: 2 }}>
          Edit
        </Text>
      </Pressable>
      <Pressable
        onPress={handleDeletePress}
        style={{
          backgroundColor: Colors.error,
          justifyContent: 'center',
          alignItems: 'center',
          width: 72,
          borderRadius: BorderRadius.md,
        }}
        testID={`delete-food-entry-button-${entry.id}`}
      >
        <Trash2 size={18} color="#fff" />
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: '#fff', marginTop: 2 }}>
          Delete
        </Text>
      </Pressable>
    </View>
  );

  return (
    <>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        friction={2}
        overshootRight={false}
      >
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 14,
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.md,
            marginBottom: 6,
          }}
        >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 14,
                  color: Colors.textPrimary,
                }}
                numberOfLines={1}
              >
                {entry.name}
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 12,
                  color: Colors.textSecondary,
                  marginTop: 1,
                }}
              >
                {entry.servings} {entry.servings === 1 ? 'serving' : 'servings'}
                {entry.brand ? ` · ${entry.brand}` : null}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary }}>
                {Math.round(entry.calories * entry.servings)} cal
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.amber }}>
                {Math.round(entry.netCarbs * entry.servings)}g net carbs
              </Text>
              {(() => {
                const hasNutrition = (entry.calories > 0) || (entry.netCarbs > 0) || (entry.protein > 0);
                return !hasNutrition ? (
                  <View
                    style={{
                      backgroundColor: 'rgba(243,156,18,0.15)',
                      borderRadius: BorderRadius.md,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      marginTop: 4,
                      borderWidth: 1,
                      borderColor: 'rgba(243,156,18,0.3)',
                    }}
                    testID={`nutrition-missing-badge-${entry.id}`}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 9,
                        color: Colors.amber,
                      }}
                    >
                      ⚠️ Missing data
                    </Text>
                  </View>
                ) : null;
              })()}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                onPress={onEdit}
                testID={`edit-btn-${entry.id}`}
                hitSlop={8}
              >
                <Edit3 size={16} color={Colors.textTertiary} />
              </Pressable>
              <Pressable
                onPress={onToggleFavorite}
                testID={`favorite-btn-${entry.id}`}
                hitSlop={8}
              >
                <Heart
                  size={18}
                  color={entry.isFavorite ? Colors.error : Colors.textTertiary}
                  fill={entry.isFavorite ? Colors.error : 'transparent'}
                />
              </Pressable>
            </View>
        </Pressable>
      </Swipeable>

      {/* Long Press Context Menu */}
      <Modal visible={contextMenuVisible} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setContextMenuVisible(false)}
        >
          <View
            style={{
              position: 'absolute',
              bottom: '30%',
              right: 16,
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: Colors.border,
              overflow: 'hidden',
              minWidth: 180,
            }}
          >
            <Pressable
              onPress={() => {
                onEdit?.();
                setContextMenuVisible(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 10,
              }}
            >
              <Edit3 size={16} color={Colors.textSecondary} />
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 14,
                  color: Colors.textSecondary,
                }}
              >
                Edit
              </Text>
            </Pressable>
            {onMove ? (
              <Pressable
                onPress={() => {
                  onMove();
                  setContextMenuVisible(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  gap: 10,
                  borderTopWidth: 1,
                  borderTopColor: Colors.border,
                }}
              >
                <Move size={16} color={Colors.textSecondary} />
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 14,
                    color: Colors.textSecondary,
                  }}
                >
                  Move
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                onToggleFavorite();
                setContextMenuVisible(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 10,
                borderTopWidth: 1,
                borderTopColor: Colors.border,
              }}
            >
              <Heart
                size={16}
                color={entry.isFavorite ? Colors.error : Colors.textSecondary}
                fill={entry.isFavorite ? Colors.error : 'transparent'}
              />
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 14,
                  color: entry.isFavorite ? Colors.error : Colors.textSecondary,
                }}
              >
                {entry.isFavorite ? 'Remove' : 'Favorite'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                handleDeletePress();
                setContextMenuVisible(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 10,
                borderTopWidth: 1,
                borderTopColor: Colors.border,
              }}
            >
              <Trash2 size={16} color={Colors.error} />
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 14,
                  color: Colors.error,
                }}
              >
                Delete
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <DeleteConfirmationModal
        visible={deleteConfirmVisible}
        title="Delete Meal Entry?"
        message="This meal entry will be permanently removed and linked pantry items will be restocked."
        itemName={entry.name}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </>
  );
}

// ─── Collapsible meal section ─────────────────────────────────────────────────
function MealSectionCard({
  section,
  entries,
  onAddFood,
  onDeleteEntry,
  onToggleFavorite,
  onEditEntry,
  onMoveEntry,
  dateStr,
}: {
  section: MealSection;
  entries: FoodEntry[];
  onAddFood: () => void;
  onDeleteEntry: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onEditEntry?: (entry: FoodEntry) => void;
  onMoveEntry?: (entry: FoodEntry) => void;
  dateStr: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [showSectionMenu, setShowSectionMenu] = useState(false);
  const rotateAnim = useSharedValue(expanded ? 1 : 0);

  const totalCals = entries.reduce((sum, e) => sum + e.calories * e.servings, 0);
  const totalNetCarbs = entries.reduce((sum, e) => sum + e.netCarbs * e.servings, 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotateAnim.value, [0, 1], [0, 180], Extrapolation.CLAMP)}deg` }],
  }));

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    rotateAnim.value = withTiming(next ? 1 : 0, { duration: 250 });
  };

  return (
    <View style={{
      backgroundColor: Colors.navyCard,
      borderRadius: BorderRadius.lg,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: Colors.border,
      ...Shadows.card,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        <Pressable
          onPress={() => {
            router.push({
              pathname: '/meal-type-detail',
              params: { type: section.type, date: dateStr },
            });
          }}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
          testID={`meal-section-${section.type}`}
        >
          <View style={{
            width: 36,
            height: 36,
            borderRadius: BorderRadius.md,
            backgroundColor: `${section.color}20`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}>
            <Text style={{ fontSize: 18 }}>{section.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary }}>
              {section.label}
            </Text>
            {entries.length > 0 && (
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                {Math.round(totalCals)} cal · {Math.round(totalNetCarbs)}g net carbs
              </Text>
            )}
            {entries.length === 0 && (
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary }}>
                Nothing logged
              </Text>
            )}
          </View>
          <Pressable
            onPress={toggle}
            hitSlop={8}
            style={{ padding: 4 }}
          >
            <Animated.View style={chevronStyle}>
              <ChevronDown size={18} color={Colors.textSecondary} />
            </Animated.View>
          </Pressable>
        </Pressable>

        {/* Section menu button */}
        <Pressable
          onPress={() => setShowSectionMenu(true)}
          style={{ padding: 8, marginLeft: 4 }}
          testID={`section-menu-${section.type}`}
        >
          <MoreVertical size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Content */}
      {expanded ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          {entries.map((entry) => (
            <FoodItemRow
              key={entry.id}
              entry={entry}
              onDelete={() => onDeleteEntry(entry.id)}
              onToggleFavorite={() => onToggleFavorite(entry.id)}
              onEdit={() => onEditEntry?.(entry)}
              onMove={() => onMoveEntry?.(entry)}
            />
          ))}
          <Pressable
            onPress={onAddFood}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              borderRadius: BorderRadius.md,
              borderWidth: 1,
              borderColor: `${section.color}50`,
              borderStyle: 'dashed',
              marginTop: entries.length > 0 ? 4 : 0,
            }}
            testID={`add-food-${section.type}`}
          >
            <Plus size={14} color={section.color} />
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: section.color, marginLeft: 6 }}>
              Add Food
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Section Menu Modal */}
      <Modal visible={showSectionMenu} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowSectionMenu(false)}
        >
          <View
            style={{
              position: 'absolute',
              bottom: '30%',
              right: 16,
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: Colors.border,
              overflow: 'hidden',
              minWidth: 200,
            }}
          >
            <Pressable
              onPress={() => {
                setShowSectionMenu(false);
                onAddFood();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 10,
              }}
              testID={`section-menu-add-food-${section.type}`}
            >
              <Plus size={16} color={Colors.textSecondary} />
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 14,
                  color: Colors.textSecondary,
                }}
              >
                Add Food
              </Text>
            </Pressable>
            {entries.length > 0 ? (
              <>
                <Pressable
                  onPress={() => {
                    setShowSectionMenu(false);
                    // TODO: Implement clear section
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    gap: 10,
                    borderTopWidth: 1,
                    borderTopColor: Colors.border,
                  }}
                  testID={`section-menu-clear-${section.type}`}
                >
                  <Trash2 size={16} color={Colors.error} />
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 14,
                      color: Colors.error,
                    }}
                  >
                    Clear Section
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowSectionMenu(false);
                    // TODO: Implement move all
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    gap: 10,
                    borderTopWidth: 1,
                    borderTopColor: Colors.border,
                  }}
                  testID={`section-menu-move-all-${section.type}`}
                >
                  <Move size={16} color={Colors.textSecondary} />
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 14,
                      color: Colors.textSecondary,
                    }}
                  >
                    Move All to...
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Weekly Bar Chart ─────────────────────────────────────────────────────────
function WeeklyChart({ selectedDate }: { selectedDate: string }) {
  const getDailyTotals = useMealsStore((s) => s.getDailyTotals);
  const calorieGoal = useAppStore((s) => s.userProfile.dailyCalorieGoal);
  const carbGoal = useAppStore((s) => s.userProfile.dailyCarbGoal);

  const days = Array.from({ length: 7 }, (_, i) => {
    const str = dateUtils.daysAgo(6 - i);
    return { dateStr: str };
  });

  const dayData = days.map((d) => {
    const totals = getDailyTotals(d.dateStr);
    return { ...d, calories: totals.calories, netCarbs: totals.netCarbs };
  });

  const maxCal = Math.max(...dayData.map((d) => d.calories), calorieGoal);
  const avgCal = Math.round(dayData.reduce((s, d) => s + d.calories, 0) / 7);
  const avgCarbs = Math.round(dayData.reduce((s, d) => s + d.netCarbs, 0) / 7);
  const bestDay = dayData.reduce((best, d) => (d.calories > best.calories ? d : best), dayData[0]);

  return (
    <View style={{
      backgroundColor: Colors.navyCard,
      borderRadius: BorderRadius.lg,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: Colors.border,
    }}>
      <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 18, color: Colors.textPrimary, marginBottom: 4 }}>
        Weekly Overview
      </Text>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginBottom: 16 }}>
        Last 7 days · Avg {avgCal} kcal · {avgCarbs}g net carbs
      </Text>

      {/* Bar chart */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4 }}>
        {dayData.map((d) => {
          const isToday = dateUtils.isToday(d.dateStr);
          const isBest = d.dateStr === bestDay.dateStr && bestDay.calories > 0;
          const barH = maxCal > 0 ? Math.max(4, (d.calories / maxCal) * 80) : 4;
          const carbH = maxCal > 0 ? Math.max(2, (d.netCarbs / (carbGoal * 2)) * 80) : 2;
          const dayLabel = new Date(d.dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'narrow' });

          return (
            <View key={d.dateStr} style={{ flex: 1, alignItems: 'center' }}>
              {isBest ? (
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 8, color: Colors.green, marginBottom: 2 }}>
                  BEST
                </Text>
              ) : null}
              <View style={{ width: '100%', alignItems: 'center', height: 80, justifyContent: 'flex-end' }}>
                {/* Calorie bar */}
                <View style={{
                  width: '65%',
                  height: barH,
                  backgroundColor: isToday ? Colors.green : isBest ? `${Colors.green}80` : 'rgba(255,255,255,0.15)',
                  borderRadius: 3,
                  position: 'absolute',
                  bottom: 0,
                }} />
                {/* Net carbs overlay */}
                <View style={{
                  width: '35%',
                  height: Math.min(carbH, barH),
                  backgroundColor: Colors.amber,
                  borderRadius: 2,
                  position: 'absolute',
                  bottom: 0,
                  opacity: 0.7,
                }} />
              </View>
              <Text style={{
                fontFamily: isToday ? 'DMSans_700Bold' : 'DMSans_400Regular',
                fontSize: 10,
                color: isToday ? Colors.green : Colors.textTertiary,
                marginTop: 4,
              }}>
                {dayLabel}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', marginTop: 12, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.green }} />
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary }}>Calories</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.amber }} />
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textSecondary }}>Net Carbs</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Claude coaching card ─────────────────────────────────────────────────────
function ClaudeCoachingCard({ dateStr, entries }: { dateStr: string; entries: FoodEntry[] }) {
  const claudeApiKey = useAppStore((s) => s.userProfile.claudeApiKey);
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lastFetchDate, setLastFetchDate] = useState<string>('');

  const fetchInsight = useCallback(async () => {
    if (!claudeApiKey) return;
    setLoading(true);
    setInsight('');
    try {
      const summary = entries.length === 0
        ? 'No food logged today.'
        : entries.map((e) =>
          `${e.name} (${e.servings} serving${e.servings !== 1 ? 's' : ''}, ${Math.round(e.calories * e.servings)} cal, ${Math.round(e.netCarbs * e.servings)}g net carbs) for ${e.mealType}`
        ).join('; ');

      const totalCal = entries.reduce((s, e) => s + e.calories * e.servings, 0);
      const totalNetCarbs = entries.reduce((s, e) => s + e.netCarbs * e.servings, 0);
      const totalProtein = entries.reduce((s, e) => s + e.protein * e.servings, 0);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 150,
          messages: [{
            role: 'user',
            content: `You are a friendly nutrition coach helping someone on a low-carb or keto diet. Based on today's food log, give 2-3 sentences of personalized coaching. Be encouraging, specific, and actionable.

Today's log: ${summary}
Total: ${Math.round(totalCal)} calories, ${Math.round(totalNetCarbs)}g net carbs, ${Math.round(totalProtein)}g protein

Keep response under 80 words. No bullet points, just conversational text.`,
          }],
        }),
      });

      if (!response.ok) throw new Error('API error');
      const data = await response.json() as { content: { type: string; text: string }[] };
      const text = data.content?.[0]?.text ?? '';
      setInsight(text);
      setLastFetchDate(dateStr);
    } catch {
      setInsight('Unable to fetch coaching insight. Please check your API key in Settings.');
    } finally {
      setLoading(false);
    }
  }, [claudeApiKey, entries, dateStr]);

  useEffect(() => {
    if (claudeApiKey && lastFetchDate !== dateStr && entries.length > 0) {
      fetchInsight();
    }
  }, [dateStr]);

  if (!claudeApiKey) {
    return (
      <View style={{
        backgroundColor: Colors.navyCard,
        borderRadius: BorderRadius.lg,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: BorderRadius.md,
          backgroundColor: 'rgba(155,89,182,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Sparkles size={20} color="#9B59B6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary, marginBottom: 2 }}>
            AI Nutrition Coach
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
            Add your Claude API key in Settings to get personalized nutrition coaching
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{
      backgroundColor: Colors.navyCard,
      borderRadius: BorderRadius.lg,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(155,89,182,0.3)',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{
          width: 32,
          height: 32,
          borderRadius: BorderRadius.sm,
          backgroundColor: 'rgba(155,89,182,0.2)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
        }}>
          <Sparkles size={16} color="#9B59B6" />
        </View>
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary, flex: 1 }}>
          AI Nutrition Coaching
        </Text>
        <Pressable
          onPress={fetchInsight}
          disabled={loading}
          hitSlop={8}
          testID="refresh-coaching-btn"
        >
          <RefreshCw size={16} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator size="small" color="#9B59B6" />
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary }}>
            Analyzing today's nutrition...
          </Text>
        </View>
      ) : insight ? (
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 20 }}>
          {insight}
        </Text>
      ) : (
        <Pressable onPress={fetchInsight} testID="get-coaching-btn">
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#9B59B6' }}>
            Tap to get today's coaching insight →
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Bottom summary card ──────────────────────────────────────────────────────
function DailySummaryCard({ dateStr }: { dateStr: string }) {
  const getDailyTotals = useMealsStore((s) => s.getDailyTotals);
  const getWaterForDate = useMealsStore((s) => s.getWaterForDate);
  const logWater = useMealsStore((s) => s.logWater);
  const removeWaterEntry = useMealsStore((s) => s.removeWaterEntry);
  const calorieGoal = useAppStore((s) => s.userProfile.dailyCalorieGoal);
  const carbGoal = useAppStore((s) => s.userProfile.dailyCarbGoal);

  const totals = getDailyTotals(dateStr);
  const water = getWaterForDate(dateStr);
  const calProgress = calorieGoal > 0 ? totals.calories / calorieGoal : 0;

  const proteinPct = totals.calories > 0 ? (totals.protein * 4 / totals.calories) * 100 : 0;
  const fatPct = totals.calories > 0 ? (totals.fat * 9 / totals.calories) * 100 : 0;
  const carbPct = totals.calories > 0 ? (totals.carbs * 4 / totals.calories) * 100 : 0;

  return (
    <View style={{
      backgroundColor: Colors.surface,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      ...Shadows.elevated,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* Circular calories ring */}
        <View style={{ alignItems: 'center', justifyContent: 'center', width: 60, height: 60 }}>
          <RingProgress size={60} progress={calProgress} color={Colors.green} strokeWidth={5} />
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.textPrimary }}>
              {Math.round(totals.calories)}
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 8, color: Colors.textTertiary }}>kcal</Text>
          </View>
        </View>

        {/* Macro bars */}
        <View style={{ flex: 1, gap: 4 }}>
          {/* Net carbs bar */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: Colors.textSecondary }}>Net Carbs</Text>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 10, color: totals.netCarbs > carbGoal ? Colors.error : Colors.amber }}>
                {Math.round(totals.netCarbs)}g / {carbGoal}g
              </Text>
            </View>
            <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
              <View style={{
                height: 4,
                width: `${Math.min(100, (totals.netCarbs / carbGoal) * 100)}%`,
                backgroundColor: totals.netCarbs > carbGoal ? Colors.error : Colors.amber,
                borderRadius: 2,
              }} />
            </View>
          </View>
          {/* Protein */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 }}>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 9, color: Colors.textTertiary }}>Protein</Text>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 9, color: Colors.textSecondary }}>{Math.round(totals.protein)}g</Text>
              </View>
              <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                <View style={{ height: 3, width: `${Math.min(100, proteinPct)}%`, backgroundColor: '#3498DB', borderRadius: 2 }} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 }}>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 9, color: Colors.textTertiary }}>Fat</Text>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 9, color: Colors.textSecondary }}>{Math.round(totals.fat)}g</Text>
              </View>
              <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                <View style={{ height: 3, width: `${Math.min(100, fatPct)}%`, backgroundColor: '#E74C3C', borderRadius: 2 }} />
              </View>
            </View>
          </View>
        </View>

        {/* Water tracker */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Droplets size={16} color="#3498DB" />
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary }}>{water}</Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 9, color: Colors.textTertiary }}>glasses</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Pressable
              onPress={() => removeWaterEntry(dateStr)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              testID="remove-water-btn"
            >
              <Minus size={10} color={Colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => logWater(dateStr)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: 'rgba(52,152,219,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              testID="add-water-btn"
            >
              <Plus size={10} color="#3498DB" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Portion selector ─────────────────────────────────────────────────────────
interface PortionSelectorProps {
  food: FoodItem;
  mealType: MealType;
  onLog: (servings: number) => void;
  onCancel: () => void;
}

function PortionSelector({ food, mealType, onLog, onCancel }: PortionSelectorProps) {
  const [servings, setServings] = useState<number>(1);

  const cal = Math.round(food.caloriesPerServing * servings);
  const netCarbs = Math.round(food.netCarbsPerServing * servings * 10) / 10;
  const protein = Math.round(food.proteinPerServing * servings * 10) / 10;
  const fat = Math.round(food.fatPerServing * servings * 10) / 10;

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
      {/* Back button */}
      <Pressable onPress={onCancel} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <ChevronLeft size={16} color={Colors.textSecondary} />
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary }}>Back</Text>
      </Pressable>

      {/* Food name */}
      <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: Colors.textPrimary, marginBottom: 2 }}>
        {food.name}
      </Text>
      {food.brand !== 'Generic' && (
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginBottom: 4 }}>
          {food.brand}
        </Text>
      )}
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary, marginBottom: 20 }}>
        Serving size: {food.servingDescription}
      </Text>

      {/* Servings stepper */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 10 }}>
          Servings
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Pressable
            onPress={() => setServings((s) => Math.max(0.5, s - 0.5))}
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
            testID="decrement-servings"
          >
            <Minus size={16} color={Colors.textPrimary} />
          </Pressable>
          <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 36, color: Colors.textPrimary, minWidth: 60, textAlign: 'center' }}>
            {servings % 1 === 0 ? servings.toString() : servings.toFixed(1)}
          </Text>
          <Pressable
            onPress={() => setServings((s) => s + 0.5)}
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
            testID="increment-servings"
          >
            <Plus size={16} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {/* Quick portion pills */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {[0.5, 1, 2].map((s) => (
            <Pressable
              key={s}
              onPress={() => setServings(s)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: BorderRadius.full,
                backgroundColor: servings === s ? Colors.green : Colors.surface,
                borderWidth: 1,
                borderColor: servings === s ? Colors.green : Colors.border,
              }}
              testID={`quick-portion-${s}`}
            >
              <Text style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 13,
                color: servings === s ? Colors.navy : Colors.textSecondary,
              }}>
                {s === 0.5 ? '½' : s}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Live nutrition preview */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: 14,
        marginBottom: 20,
        gap: 4,
      }}>
        {[
          { label: 'Cal', value: cal.toString(), color: Colors.green },
          { label: 'Net Carbs', value: `${netCarbs}g`, color: Colors.amber },
          { label: 'Protein', value: `${protein}g`, color: '#3498DB' },
          { label: 'Fat', value: `${fat}g`, color: '#E74C3C' },
        ].map((m) => (
          <View key={m.label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: m.color }}>{m.value}</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textTertiary }}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Log button */}
      <Pressable
        onPress={() => onLog(servings)}
        style={{
          backgroundColor: Colors.green,
          borderRadius: BorderRadius.lg,
          paddingVertical: 14,
          alignItems: 'center',
          marginBottom: 10,
        }}
        testID="log-food-button"
      >
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.navy }}>
          Log to {mealType}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Add Food Modal ───────────────────────────────────────────────────────────
type ModalView = 'options' | 'search' | 'favorites' | 'portion' | 'manual';

interface AddFoodModalProps {
  visible: boolean;
  mealType: MealType;
  onClose: () => void;
  onAddEntry: (food: FoodItem, servings: number) => void;
  onAddManualEntry?: (entry: Omit<FoodEntry, 'id' | 'date' | 'mealType'>, mealType: MealType) => void;
}

function AddFoodModal({ visible, mealType, onClose, onAddEntry, onAddManualEntry }: AddFoodModalProps) {
  const router = useRouter();
  const [view, setView] = useState<ModalView>('options');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [recentSearches] = useState<string[]>(['Chicken', 'Eggs', 'Avocado', 'Salmon']);

  const getFavorites = useMealsStore((s) => s.getFavorites);
  const favorites = getFavorites();

  const filteredFoods = searchQuery.length > 0
    ? MOCK_FOODS.filter(
      (f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.brand.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  const handleClose = () => {
    setView('options');
    setSearchQuery('');
    setSelectedFood(null);
    onClose();
  };

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setView('portion');
  };

  const handleLog = (servings: number) => {
    if (!selectedFood) return;
    onAddEntry(selectedFood, servings);
    handleClose();
  };

  const handleSelectFavorite = (entry: FoodEntry) => {
    const food: FoodItem = {
      id: entry.id,
      name: entry.name,
      brand: entry.brand ?? 'Generic',
      caloriesPerServing: entry.calories,
      carbsPerServing: entry.carbs,
      proteinPerServing: entry.protein,
      fatPerServing: entry.fat,
      fiberPerServing: entry.fiber,
      netCarbsPerServing: entry.netCarbs,
      servingDescription: '1 serving',
    };
    setSelectedFood(food);
    setView('portion');
  };

  const mealSection = MEAL_SECTIONS.find((m) => m.type === mealType) ?? MEAL_SECTIONS[0];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown}
          style={{
            backgroundColor: Colors.navyCard,
            borderTopLeftRadius: BorderRadius.xxl,
            borderTopRightRadius: BorderRadius.xxl,
            maxHeight: '92%',
            borderTopWidth: 1,
            borderTopColor: Colors.border,
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border }} />
          </View>

          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingBottom: 16,
            paddingTop: 8,
          }}>
            <View style={{
              width: 28,
              height: 28,
              borderRadius: BorderRadius.sm,
              backgroundColor: `${mealSection.color}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}>
              <Text style={{ fontSize: 14 }}>{mealSection.icon}</Text>
            </View>
            <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: Colors.textPrimary, flex: 1 }}>
              {view === 'options' ? `Add to ${mealType}` : view === 'search' ? 'Search Foods' : view === 'favorites' ? 'Favorites' : view === 'manual' ? 'Enter Food Details' : 'Portion Size'}
            </Text>
            <Pressable onPress={handleClose} testID="close-add-food-modal" hitSlop={8}>
              <X size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* MANUAL ENTRY VIEW - Rendered outside ScrollView */}
          {view === 'manual' ? (
            <View style={{ flex: 1 }}>
              <ManualFoodEntryForm
                onSave={(entry) => {
                  onAddManualEntry?.(entry, mealType);
                  handleClose();
                }}
                onCancel={() => setView('options')}
              />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* OPTIONS VIEW */}
              {view === 'options' && (
                <View style={{ paddingHorizontal: 20, gap: 10 }}>
                  {[
                    {
                      icon: <ScanLine size={24} color={Colors.green} />,
                      title: 'Scan Barcode',
                      subtitle: 'Scan a product barcode',
                      bg: Colors.greenMuted,
                      onPress: () => { handleClose(); router.push('/barcode-scanner'); },
                      testID: 'scan-barcode-option',
                    },
                    {
                      icon: <Camera size={24} color="#9B59B6" />,
                      title: 'Identify by Photo',
                      subtitle: 'Use AI to identify food',
                      bg: 'rgba(155,89,182,0.15)',
                      onPress: () => { handleClose(); router.push('/photo-recognition'); },
                      testID: 'photo-option',
                    },
                    {
                      icon: <Search size={24} color="#3498DB" />,
                      title: 'Search Food Database',
                      subtitle: 'Find from 500k+ foods',
                      bg: 'rgba(52,152,219,0.15)',
                      onPress: () => setView('search'),
                      testID: 'search-option',
                    },
                    {
                      icon: <Heart size={24} color={Colors.error} />,
                      title: 'Choose from Favorites',
                      subtitle: `${favorites.length} saved items`,
                      bg: Colors.errorMuted,
                      onPress: () => setView('favorites'),
                      testID: 'favorites-option',
                    },
                    {
                      icon: <Edit3 size={24} color="#F39C12" />,
                      title: 'Enter Manually',
                      subtitle: 'Fill in details yourself',
                      bg: 'rgba(243,156,18,0.15)',
                      onPress: () => setView('manual'),
                      testID: 'manual-entry-option',
                    },
                  ].map((opt) => (
                    <Pressable
                      key={opt.testID}
                      onPress={opt.onPress}
                      testID={opt.testID}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: Colors.surface,
                        borderRadius: BorderRadius.lg,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: Colors.border,
                      }}
                    >
                      <View style={{
                        width: 44,
                        height: 44,
                        borderRadius: BorderRadius.md,
                        backgroundColor: opt.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                      }}>
                        {opt.icon}
                      </View>
                      <View>
                        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary }}>
                          {opt.title}
                        </Text>
                        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                          {opt.subtitle}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={Colors.textTertiary} style={{ marginLeft: 'auto' }} />
                    </Pressable>
                  ))}
                </View>
              )}

              {/* SEARCH VIEW */}
              {view === 'search' && (
                <View style={{ paddingHorizontal: 20 }}>
                  <Pressable
                    onPress={() => setView('options')}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}
                  >
                    <ChevronLeft size={16} color={Colors.textSecondary} />
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary }}>Back</Text>
                  </Pressable>

                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.lg,
                    paddingHorizontal: 12,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: Colors.border,
                  }}>
                    <Search size={16} color={Colors.textTertiary} />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search foods..."
                      placeholderTextColor={Colors.textTertiary}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        paddingHorizontal: 10,
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 15,
                        color: Colors.textPrimary,
                      }}
                      autoFocus
                      testID="food-search-input"
                    />
                    {searchQuery.length > 0 && (
                      <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                        <X size={14} color={Colors.textTertiary} />
                      </Pressable>
                    )}
                  </View>

                  {searchQuery.length === 0 ? (
                    <View>
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 8 }}>
                        RECENT SEARCHES
                      </Text>
                      {recentSearches.map((s) => (
                        <Pressable
                          key={s}
                          onPress={() => setSearchQuery(s)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 10,
                            borderBottomWidth: 1,
                            borderBottomColor: Colors.borderLight,
                            gap: 10,
                          }}
                        >
                          <Search size={14} color={Colors.textTertiary} />
                          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary }}>
                            {s}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : filteredFoods.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingTop: 32 }}>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary }}>
                        No results for "{searchQuery}"
                      </Text>
                    </View>
                  ) : (
                    filteredFoods.map((food) => (
                      <Pressable
                        key={food.id}
                        onPress={() => handleSelectFood(food)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: Colors.borderLight,
                        }}
                        testID={`food-result-${food.id}`}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary }}>
                            {food.name}
                          </Text>
                          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                            {food.brand !== 'Generic' ? food.brand + ' · ' : null}{food.servingDescription}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textPrimary }}>
                            {food.caloriesPerServing} cal
                          </Text>
                          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.amber }}>
                            {food.netCarbsPerServing}g carbs
                          </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.textTertiary} />
                      </Pressable>
                    ))
                  )}
                </View>
              )}

              {/* FAVORITES VIEW */}
              {view === 'favorites' && (
                <View style={{ paddingHorizontal: 20 }}>
                  <Pressable
                    onPress={() => setView('options')}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}
                  >
                    <ChevronLeft size={16} color={Colors.textSecondary} />
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary }}>Back</Text>
                  </Pressable>

                  {favorites.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingTop: 32 }}>
                      <Heart size={32} color={Colors.textTertiary} />
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 12 }}>
                        No favorites yet
                      </Text>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary, marginTop: 4 }}>
                        Tap the heart on any food to save it
                      </Text>
                    </View>
                  ) : (
                    favorites.map((entry) => (
                      <Pressable
                        key={entry.id}
                        onPress={() => handleSelectFavorite(entry)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: Colors.borderLight,
                        }}
                        testID={`favorite-${entry.id}`}
                      >
                        <View style={{
                          width: 32,
                          height: 32,
                          borderRadius: BorderRadius.sm,
                          backgroundColor: Colors.errorMuted,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}>
                          <Heart size={14} color={Colors.error} fill={Colors.error} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary }}>
                            {entry.name}
                          </Text>
                          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                            {entry.mealType} · {entry.calories} cal/serving
                          </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.textTertiary} />
                      </Pressable>
                    ))
                  )}
                </View>
              )}

              {/* PORTION VIEW */}
              {view === 'portion' && selectedFood ? (
                <PortionSelector
                  food={selectedFood}
                  mealType={mealType}
                  onLog={handleLog}
                  onCancel={() => setView(selectedFood ? (view === 'portion' ? 'search' : 'options') : 'options')}
                />
              ) : null}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyDayState({ onQuickAdd, selectedMeal }: {
  onQuickAdd: (food: FoodItem) => void;
  selectedMeal: MealType;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 }}>
      {/* Illustration */}
      <View style={{ marginBottom: 24, alignItems: 'center' }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: Colors.greenMuted,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}>
          <Text style={{ fontSize: 36 }}>🥗</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['🥚', '☕', '🥑'].map((emoji, i) => (
            <View key={i} style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: Colors.border,
            }}>
              <Text style={{ fontSize: 20 }}>{emoji}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
        Nothing logged yet today
      </Text>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
        Start tracking your meals to hit your daily goals
      </Text>

      {/* Quick add buttons */}
      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 10 }}>
        QUICK ADD
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {QUICK_ADD_ITEMS.map((item) => (
          <Pressable
            key={item.name}
            onPress={() => onQuickAdd(item.food)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: BorderRadius.full,
              backgroundColor: Colors.navyCard,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
            testID={`quick-add-${item.name}`}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textPrimary }}>
              {item.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MealsScreen() {
  const [selectedDate, setSelectedDate] = useState<string>(dateUtils.today());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [addFoodModalVisible, setAddFoodModalVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>('Breakfast');
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [movingEntry, setMovingEntry] = useState<FoodEntry | null>(null);
  const [moveSheetVisible, setMoveSheetVisible] = useState(false);

  const getEntriesForDate = useMealsStore((s) => s.getEntriesForDate);
  const addEntry = useMealsStore((s) => s.addEntry);
  const deleteEntry = useMealsStore((s) => s.deleteEntry);
  const updateEntry = useMealsStore((s) => s.updateEntry);
  const toggleFavorite = useMealsStore((s) => s.toggleFavorite);
  const clearMeals = useMealsStore((s) => s.clearMeals);
  const { showToast } = useToast();

  const calorieGoal = useAppStore((s) => s.userProfile.dailyCalorieGoal);
  const carbGoal = useAppStore((s) => s.userProfile.dailyCarbGoal);

  // Reset to today whenever the Meals tab is focused
  useFocusEffect(
    useCallback(() => {
      setSelectedDate(dateUtils.today());
    }, [])
  );

  const entries = getEntriesForDate(selectedDate);
  const totalCal = entries.reduce((s, e) => s + e.calories * e.servings, 0);
  const totalNetCarbs = entries.reduce((s, e) => s + e.netCarbs * e.servings, 0);
  const hasEntries = entries.length > 0;

  const isToday = dateUtils.isToday(selectedDate);

  const navigateDay = (dir: -1 | 1) => {
    const newDate = dir === -1
      ? dateUtils.daysAgo(dateUtils.daysDifference(dateUtils.today(), selectedDate) - 1)
      : dateUtils.daysFromNow(dateUtils.daysDifference(selectedDate, dateUtils.today()) + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => setSelectedDate(dateUtils.today());

  const handleAddFood = (mealType: MealType) => {
    setActiveMealType(mealType);
    setAddFoodModalVisible(true);
  };

  const handleAddEntry = (food: FoodItem, servings: number) => {
    addEntry({
      name: food.name,
      brand: food.brand !== 'Generic' ? food.brand : undefined,
      mealType: activeMealType,
      date: selectedDate,
      servings,
      calories: food.caloriesPerServing,
      carbs: food.carbsPerServing,
      protein: food.proteinPerServing,
      fat: food.fatPerServing,
      fiber: food.fiberPerServing,
      netCarbs: food.netCarbsPerServing,
      isFavorite: false,
    });
  };

  const handleAddManualEntry = (entry: Omit<FoodEntry, 'id' | 'date' | 'mealType'>, mealType: MealType) => {
    addEntry({
      ...entry,
      mealType,
      date: selectedDate,
    });
    showToast(`${entry.name} added to ${mealType}`, 'success');
  };

  const handleQuickAdd = (food: FoodItem) => {
    setActiveMealType('Breakfast');
    setAddFoodModalVisible(true);
  };

  const dateLabel = dateUtils.displayLabel(selectedDate);
  const fullDateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const handleClearMeals = () => {
    clearMeals(selectedDate);
    setClearConfirmVisible(false);
    const dateName = isToday ? "today's" : 'that day\'s';
    showToast(`${dateName} meal log cleared`, 'success');
  };

  const handleEditEntry = (entry: FoodEntry) => {
    setEditingEntry(entry);
    setEditSheetVisible(true);
  };

  const handleMoveEntry = (entry: FoodEntry) => {
    setMovingEntry(entry);
    setMoveSheetVisible(true);
  };

  const handleSaveEdit = async (updates: Partial<FoodEntry>) => {
    if (!editingEntry) return;
    try {
      updateEntry(editingEntry.id, updates);
      showToast(`${editingEntry.name} updated`, 'success');
      setEditSheetVisible(false);
      setEditingEntry(null);
    } catch (error) {
      showToast('Failed to update entry', 'error');
    }
  };

  const handleMoveToMealType = async (targetMealType: MealType) => {
    if (!movingEntry) return;
    try {
      const result = await MealLogger.moveEntry(movingEntry.id, movingEntry.mealType, targetMealType);
      if (result.success) {
        updateEntry(movingEntry.id, { mealType: targetMealType });
        showToast(`${movingEntry.name} moved to ${targetMealType}`, 'success');
        setMoveSheetVisible(false);
        setMovingEntry(null);
      } else {
        showToast(result.error || 'Failed to move entry', 'error');
      }
    } catch (error) {
      showToast('Failed to move entry', 'error');
    }
  };

  return (
    <LinearGradient colors={['#0A1628', '#0B1C35', '#0A1628']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']} testID="meals-screen">
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: Colors.textPrimary, flex: 1 }}>
              Meals
            </Text>
            {!!hasEntries && (
              <Pressable
                onPress={() => setClearConfirmVisible(true)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginRight: 10,
                  borderRadius: BorderRadius.md,
                  backgroundColor: `${Colors.error}20`,
                  borderWidth: 1,
                  borderColor: `${Colors.error}40`,
                }}
                testID="clear-today-btn"
              >
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: Colors.error }}>
                  Clear
                </Text>
              </Pressable>
            )}
            {/* Week/Day toggle */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.full,
              padding: 2,
              borderWidth: 1,
              borderColor: Colors.border,
            }}>
              {(['day', 'week'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: BorderRadius.full,
                    backgroundColor: viewMode === mode ? Colors.green : 'transparent',
                  }}
                  testID={`view-mode-${mode}`}
                >
                  {mode === 'day'
                    ? <Calendar size={14} color={viewMode === mode ? Colors.navy : Colors.textSecondary} />
                    : <BarChart2 size={14} color={viewMode === mode ? Colors.navy : Colors.textSecondary} />
                  }
                </Pressable>
              ))}
            </View>
          </View>

          {/* Day navigator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <Pressable
              onPress={() => navigateDay(-1)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: Colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: Colors.border,
              }}
              testID="prev-day-btn"
            >
              <ChevronLeft size={16} color={Colors.textSecondary} />
            </Pressable>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: Colors.green, marginBottom: 2 }}>
                {dateLabel}
              </Text>
              {!dateUtils.isToday(selectedDate) && (
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                  {fullDateLabel}
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                onPress={goToToday}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: BorderRadius.full,
                  backgroundColor: isToday ? Colors.greenMuted : Colors.surface,
                  borderWidth: 1,
                  borderColor: isToday ? `${Colors.green}40` : Colors.border,
                }}
                testID="today-btn"
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: isToday ? Colors.green : Colors.textSecondary }}>
                  Today
                </Text>
              </Pressable>
              <Pressable
                onPress={() => navigateDay(1)}
                disabled={isToday}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isToday ? Colors.surfaceLight : Colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: Colors.border,
                  opacity: isToday ? 0.4 : 1,
                }}
                testID="next-day-btn"
              >
                <ChevronRight size={16} color={isToday ? Colors.textTertiary : Colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Daily nutrition summary bars */}
          {viewMode === 'day' && (
            <View style={{
              flexDirection: 'row',
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.lg,
              padding: 12,
              borderWidth: 1,
              borderColor: Colors.border,
              marginBottom: 4,
            }}>
              <NutritionBar
                value={totalCal}
                goal={calorieGoal}
                color={Colors.green}
                label="Calories"
                unit="kcal"
              />
              <View style={{ width: 1, backgroundColor: Colors.border, marginHorizontal: 8 }} />
              <NutritionBar
                value={totalNetCarbs}
                goal={carbGoal}
                color={Colors.amber}
                label="Net Carbs"
                unit="g"
              />
            </View>
          )}
        </View>

        {/* Main content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {viewMode === 'week' ? (
            <WeeklyChart selectedDate={selectedDate} />
          ) : (
            <>
              {!hasEntries && (
                <EmptyDayState
                  onQuickAdd={handleQuickAdd}
                  selectedMeal={activeMealType}
                />
              )}

              {MEAL_SECTIONS.map((section) => {
                const sectionEntries = entries.filter((e) => e.mealType === section.type);
                return (
                  <MealSectionCard
                    key={section.type}
                    section={section}
                    entries={sectionEntries}
                    onAddFood={() => handleAddFood(section.type)}
                    onDeleteEntry={deleteEntry}
                    onToggleFavorite={toggleFavorite}
                    onEditEntry={handleEditEntry}
                    onMoveEntry={handleMoveEntry}
                    dateStr={selectedDate}
                  />
                );
              })}

              {/* Claude coaching card */}
              <ClaudeCoachingCard dateStr={selectedDate} entries={entries} />
            </>
          )}
        </ScrollView>

        {/* Bottom summary card */}
        <DailySummaryCard dateStr={selectedDate} />

        {/* Add food modal */}
        <AddFoodModal
          visible={addFoodModalVisible}
          mealType={activeMealType}
          onClose={() => {
            setAddFoodModalVisible(false);
          }}
          onAddEntry={handleAddEntry}
          onAddManualEntry={handleAddManualEntry}
        />

        {/* Edit entry sheet */}
        <EditEntrySheet
          visible={editSheetVisible}
          entry={editingEntry}
          onSave={handleSaveEdit}
          onCancel={() => {
            setEditSheetVisible(false);
            setEditingEntry(null);
          }}
        />

        {/* Move to meal sheet */}
        {movingEntry ? (
          <MoveToMealSheet
            visible={moveSheetVisible}
            currentMealType={movingEntry.mealType}
            foodName={movingEntry.name}
            onMove={handleMoveToMealType}
            onCancel={() => {
              setMoveSheetVisible(false);
              setMovingEntry(null);
            }}
          />
        ) : null}

        <DeleteConfirmationModal
          visible={clearConfirmVisible}
          title="Clear all meals?"
          message={isToday ? "This will remove all breakfast, lunch, dinner, and snack entries for today. Linked pantry items will be restocked." : "This will remove all meals for this date."}
          confirmText="Clear All"
          onConfirm={handleClearMeals}
          onCancel={() => setClearConfirmVisible(false)}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}
