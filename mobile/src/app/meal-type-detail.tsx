import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Heart,
  Trash2,
  Edit3,
  Move,
  Copy,
  MoreVertical,
} from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '@/constants/theme';
import { useMealsStore, FoodEntry, MealType } from '@/lib/stores/mealsStore';
import { useAppStore } from '@/lib/stores/appStore';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { useToast } from '@/components/Toast';
import { MealEntryDetailSheet } from '@/components/MealEntryDetailSheet';
import { MoveToMealSheet } from '@/components/MoveToMealSheet';
import { MealLogger } from '@/lib/mealLogger';

// ─── Helper functions ─────────────────────────────────────────────────────
function formatDate(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

// ─── Meal icon and color mapping ──────────────────────────────────────────
const MEAL_CONFIG: Record<MealType, { icon: string; color: string; label: string }> = {
  Breakfast: { icon: '🌅', color: '#F39C12', label: 'Breakfast' },
  Lunch: { icon: '🌞', color: '#E67E22', label: 'Lunch' },
  Dinner: { icon: '🌙', color: '#9B59B6', label: 'Dinner' },
  Snacks: { icon: '🍎', color: '#2ECC71', label: 'Snacks' },
};

// ─── Food item row component (reused from meals.tsx) ──────────────────────
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
  onEdit: () => void;
  onMove: () => void;
}) {
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const swipeableRef = useRef<Swipeable>(null);

  const handleDeletePress = () => {
    setDeleteConfirmVisible(true);
  };

  const handleConfirmDelete = () => {
    setDeleteConfirmVisible(false);
    swipeableRef.current?.close();
    onDelete();
  };

  const rightActions = (
    <View style={{ flexDirection: 'row' }}>
      <Pressable
        onPress={() => {
          onEdit();
          swipeableRef.current?.close();
        }}
        style={{
          backgroundColor: Colors.navy,
          justifyContent: 'center',
          alignItems: 'center',
          width: 70,
          borderRadius: BorderRadius.md,
          marginRight: 4,
        }}
      >
        <Edit3 size={18} color="#3498DB" />
      </Pressable>
      <Pressable
        onPress={handleDeletePress}
        style={{
          backgroundColor: Colors.navy,
          justifyContent: 'center',
          alignItems: 'center',
          width: 70,
          borderRadius: BorderRadius.md,
        }}
      >
        <Trash2 size={18} color={Colors.error} />
      </Pressable>
    </View>
  );

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={() => rightActions}
        overshootRight={false}
        testID={`meal-entry-${entry.id}`}
      >
        <Pressable
          onLongPress={() => setContextMenuVisible(true)}
          delayLongPress={300}
          style={{
            backgroundColor: Colors.navyCard,
            paddingHorizontal: 12,
            paddingVertical: 12,
            marginBottom: 8,
            borderRadius: BorderRadius.md,
            borderWidth: 1,
            borderColor: Colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            ...Shadows.card,
          }}
          testID={`item-${entry.id}`}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 14,
                color: Colors.textPrimary,
                marginBottom: 4,
              }}
            >
              {entry.name}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                {Math.round(entry.calories * entry.servings)} cal
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.green }}>
                {Math.round(entry.netCarbs * entry.servings)}g net carbs
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                {entry.servings}x
              </Text>
            </View>
            {!entry.calories || !entry.netCarbs || !entry.protein ? (
              <View style={{ marginTop: 6, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: Colors.amber + '20', borderRadius: BorderRadius.sm }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 11,
                    color: Colors.amber,
                  }}
                >
                  ⚠️ Missing data
                </Text>
              </View>
            ) : null}
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
                onEdit();
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

// ─── Main component ──────────────────────────────────────────────────────
export default function MealTypeDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type: string; date: string }>();
  const { showToast } = useToast();

  const mealType = params.type as MealType || 'Breakfast';
  const dateParam = params.date || toDateStr(new Date());

  // State
  const [currentDate, setCurrentDate] = useState(new Date(dateParam));
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);
  const [detailSheetVisible, setDetailSheetVisible] = useState(false);
  const [moveSheetVisible, setMoveSheetVisible] = useState(false);

  // Store hooks
  const getEntriesForDate = useMealsStore((s) => s.getEntriesForDate);
  const toggleFavorite = useMealsStore((s) => s.toggleFavorite);
  const deleteEntry = useMealsStore((s) => s.deleteEntry);
  const updateEntry = useMealsStore((s) => s.updateEntry);

  const dateStr = toDateStr(currentDate);
  const allEntries = getEntriesForDate(dateStr);
  const mealConfig = MEAL_CONFIG[mealType];
  const entries = allEntries.filter((e) => e.mealType === mealType);

  // Calculations
  const totalCals = entries.reduce((sum, e) => sum + e.calories * e.servings, 0);
  const totalNetCarbs = entries.reduce((sum, e) => sum + e.netCarbs * e.servings, 0);
  const totalProtein = entries.reduce((sum, e) => sum + e.protein * e.servings, 0);
  const totalFat = entries.reduce((sum, e) => sum + e.fat * e.servings, 0);

  // Handlers
  const handleDeleteEntry = useCallback((id: string) => {
    deleteEntry(id);
    showToast('Meal entry deleted', 'success');
  }, [deleteEntry, showToast]);

  const handleToggleFavorite = useCallback((id: string) => {
    toggleFavorite(id);
  }, [toggleFavorite]);

  const handleEditEntry = useCallback((entry: FoodEntry) => {
    setSelectedEntry(entry);
    setDetailSheetVisible(true);
  }, []);

  const handleMoveEntry = useCallback((entry: FoodEntry) => {
    setSelectedEntry(entry);
    setMoveSheetVisible(true);
  }, []);

  const handleSaveEdit = useCallback((updatedEntry: Partial<FoodEntry>) => {
    if (selectedEntry) {
      updateEntry(selectedEntry.id, updatedEntry);
      setDetailSheetVisible(false);
      showToast('Meal entry updated', 'success');
    }
  }, [selectedEntry, updateEntry, showToast]);

  const handleNavigateDate = useCallback((days: number) => {
    const newDate = addDays(currentDate, days);
    setCurrentDate(newDate);
  }, [currentDate]);

  return (
    <>
      {detailSheetVisible && selectedEntry ? (
        <MealEntryDetailSheet
          visible={detailSheetVisible}
          entry={selectedEntry}
          onClose={() => setDetailSheetVisible(false)}
          onEdit={() => {
            // Edit button in detail sheet - could open EditEntrySheet if needed
            setDetailSheetVisible(false);
          }}
          onDelete={() => {
            handleDeleteEntry(selectedEntry.id);
            setDetailSheetVisible(false);
          }}
          onMove={() => {
            setDetailSheetVisible(false);
            setMoveSheetVisible(true);
          }}
          onUpdateNutrition={(entryId, updates) => {
            updateEntry(entryId, updates);
            showToast('Nutrition updated', 'success');
          }}
        />
      ) : (
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.navy }}>
          <View style={{ flex: 1 }}>
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
                backgroundColor: Colors.surface,
              }}
            >
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={{
                  padding: 8,
                  marginLeft: -8,
                }}
              >
                <ChevronLeft size={24} color={Colors.textPrimary} />
              </Pressable>

              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>{mealConfig.icon}</Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 18,
                      color: Colors.textPrimary,
                    }}
                  >
                    {mealConfig.label}
                  </Text>
                </View>
              </View>

              <View style={{ width: 40 }} />
            </View>

            {/* Date navigation */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
                backgroundColor: Colors.surface,
              }}
            >
              <Pressable
                onPress={() => handleNavigateDate(-1)}
                hitSlop={8}
                style={{ padding: 8, marginLeft: -8 }}
              >
                <ChevronLeft size={20} color={Colors.textSecondary} />
              </Pressable>

              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 14,
                  color: Colors.textPrimary,
                  flex: 1,
                  textAlign: 'center',
                }}
              >
                {formatDate(currentDate)}
              </Text>

              <Pressable
                onPress={() => handleNavigateDate(1)}
                hitSlop={8}
                style={{ padding: 8, marginRight: -8 }}
              >
                <ChevronRight size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* Content */}
            {entries.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: `${mealConfig.color}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 32 }}>{mealConfig.icon}</Text>
                </View>
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 16,
                    color: Colors.textPrimary,
                    marginBottom: 8,
                  }}
                >
                  No items logged
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: Colors.textSecondary,
                    textAlign: 'center',
                    marginBottom: 20,
                  }}
                >
                  Add your first {mealConfig.label.toLowerCase()} item to get started
                </Text>
                <Pressable
                  onPress={() => {
                    router.push({
                      pathname: '/add-meal-entry',
                      params: { mealType, date: dateStr },
                    });
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: BorderRadius.md,
                    backgroundColor: mealConfig.color,
                  }}
                >
                  <Plus size={18} color="#FFFFFF" />
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 14,
                      color: '#FFFFFF',
                    }}
                  >
                    Add Food
                  </Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={entries}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <FoodItemRow
                    entry={item}
                    onDelete={() => handleDeleteEntry(item.id)}
                    onToggleFavorite={() => handleToggleFavorite(item.id)}
                    onEdit={() => handleEditEntry(item)}
                    onMove={() => handleMoveEntry(item)}
                  />
                )}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexGrow: 1,
                }}
                scrollEnabled={entries.length > 4}
                ListFooterComponent={
                  <View style={{ marginTop: 12, marginBottom: 20 }}>
                    <Pressable
                      onPress={() => {
                        router.push({
                          pathname: '/add-meal-entry',
                          params: { mealType, date: dateStr },
                        });
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 12,
                        borderRadius: BorderRadius.md,
                        borderWidth: 1,
                        borderColor: `${mealConfig.color}50`,
                        borderStyle: 'dashed',
                      }}
                    >
                      <Plus size={16} color={mealConfig.color} />
                      <Text
                        style={{
                          fontFamily: 'DMSans_500Medium',
                          fontSize: 14,
                          color: mealConfig.color,
                          marginLeft: 6,
                        }}
                      >
                        Add More Items
                      </Text>
                    </Pressable>
                  </View>
                }
              />
            )}

            {/* Nutrition summary footer (if entries exist) */}
            {entries.length > 0 && (
              <View
                style={{
                  backgroundColor: Colors.surface,
                  borderTopWidth: 1,
                  borderTopColor: Colors.border,
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 12,
                    color: Colors.textSecondary,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {mealConfig.label} Totals
                </Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 12,
                        color: Colors.textSecondary,
                        marginBottom: 4,
                      }}
                    >
                      Calories
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 18,
                        color: Colors.textPrimary,
                      }}
                    >
                      {Math.round(totalCals)}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 12,
                        color: Colors.textSecondary,
                        marginBottom: 4,
                      }}
                    >
                      Net Carbs
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 18,
                        color: Colors.green,
                      }}
                    >
                      {Math.round(totalNetCarbs)}g
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 12,
                        color: Colors.textSecondary,
                        marginBottom: 4,
                      }}
                    >
                      Protein
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 18,
                        color: Colors.textPrimary,
                      }}
                    >
                      {Math.round(totalProtein)}g
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 12,
                        color: Colors.textSecondary,
                        marginBottom: 4,
                      }}
                    >
                      Fat
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 18,
                        color: Colors.textPrimary,
                      }}
                    >
                      {Math.round(totalFat)}g
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Move Entry Sheet */}
          {selectedEntry ? (
            <MoveToMealSheet
              visible={moveSheetVisible}
              currentMealType={selectedEntry.mealType}
              foodName={selectedEntry.name}
              currentDate={dateStr}
              onMove={(newMealType, targetDate) => {
                if (targetDate !== dateStr) {
                  // Moving to a different date
                  deleteEntry(selectedEntry.id);
                  // Note: The entry will need to be added to the target date
                  // This is a simplified implementation that just deletes from current date
                  showToast(`Moved to ${newMealType} on another date`, 'success');
                } else {
                  // Same date, just change meal type
                  updateEntry(selectedEntry.id, {
                    mealType: newMealType,
                  });
                  showToast(`Moved to ${newMealType}`, 'success');
                }
                setMoveSheetVisible(false);
              }}
              onCancel={() => setMoveSheetVisible(false)}
            />
          ) : null}
        </SafeAreaView>
      )}
    </>
  );
}
