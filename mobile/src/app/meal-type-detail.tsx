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
  RefreshCw,
  Volume2,
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
  const dateParam = (params.date && typeof params.date === 'string') ? params.date : toDateStr(new Date());

  // State - Parse date string to local date (not UTC)
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const [currentDate, setCurrentDate] = useState(parseLocalDate(dateParam));
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
  const totalItems = entries.length;

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

  // Get current time for the message
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Build AI message from entries
  const getAIMessage = () => {
    if (entries.length === 0) return null;
    const foodList = entries
      .map((e) => `${Math.round(e.servings * e.calories)} cal ${e.name}`)
      .join(', ');
    return `Add ${foodList} to my ${mealType.toLowerCase()}`;
  };

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.navy }}>
        <View style={{ flex: 1, paddingBottom: 16 }}>
          {entries.length === 0 ? (
            // Empty state - original view
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 16,
              }}
            >
              <Pressable
                onPress={() => router.back()}
                style={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  padding: 8,
                  zIndex: 10,
                }}
                hitSlop={8}
              >
                <ChevronLeft size={24} color={Colors.textPrimary} />
              </Pressable>

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
            // Card view with meal details
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 16,
              }}
              showsVerticalScrollIndicator={false}
            >
              {/* Back button */}
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={{
                  marginBottom: 16,
                }}
              >
                <ChevronLeft size={24} color={Colors.textPrimary} />
              </Pressable>

              {/* Header card */}
              <View
                style={{
                  backgroundColor: Colors.navyCard,
                  borderRadius: BorderRadius.lg,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 24 }}>{mealConfig.icon}</Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 20,
                        color: Colors.textPrimary,
                      }}
                    >
                      Chef Claude
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: Colors.green,
                    }}
                  >
                    {mealConfig.label}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable
                    onPress={() => router.push({
                      pathname: '/add-meal-entry',
                      params: { mealType, date: dateStr },
                    })}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: `${Colors.green}20`,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    hitSlop={8}
                  >
                    <Edit3 size={18} color={Colors.green} />
                  </Pressable>
                  <Pressable
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: `${Colors.textTertiary}20`,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    hitSlop={8}
                  >
                    <RefreshCw size={18} color={Colors.textTertiary} />
                  </Pressable>
                  <Pressable
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: `${Colors.textTertiary}20`,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    hitSlop={8}
                  >
                    <Volume2 size={18} color={Colors.textTertiary} />
                  </Pressable>
                </View>
              </View>

              {/* Stats row */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 16,
                  marginBottom: 16,
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 12,
                    color: Colors.green,
                  }}
                >
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 12,
                    color: Colors.amber,
                  }}
                >
                  {Math.round(totalNetCarbs)}g carbs today
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 12,
                    color: Colors.textSecondary,
                  }}
                >
                  {Math.round(totalCals)} cal
                </Text>
              </View>

              {/* AI Assistant message bubble */}
              {getAIMessage() && (
                <View
                  style={{
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: Colors.green,
                      borderRadius: BorderRadius.lg,
                      padding: 12,
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 14,
                        color: '#FFFFFF',
                        lineHeight: 20,
                      }}
                    >
                      {getAIMessage()}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 11,
                      color: Colors.textTertiary,
                      alignSelf: 'flex-end',
                      marginRight: 12,
                    }}
                  >
                    {getCurrentTime()}
                  </Text>
                </View>
              )}

              {/* Ready to Log card */}
              <View
                style={{
                  backgroundColor: Colors.navyCard,
                  borderRadius: BorderRadius.lg,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                {/* Ready to Log header */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>🌙</Text>
                  <View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 14,
                        color: Colors.textPrimary,
                      }}
                    >
                      Ready to Log
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 12,
                        color: Colors.textSecondary,
                      }}
                    >
                      {mealConfig.label}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: Colors.textTertiary,
                      marginLeft: 'auto',
                    }}
                  >
                    {getCurrentTime()}
                  </Text>
                </View>

                {/* Food items list */}
                {entries.map((entry, index) => (
                  <View key={entry.id}>
                    <View
                      style={{
                        marginVertical: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'DMSans_600SemiBold',
                          fontSize: 14,
                          color: Colors.textPrimary,
                          marginBottom: 4,
                        }}
                      >
                        {Math.round(entry.servings)} {entry.servings === 1 ? 'serving' : 'servings'} {entry.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'DMSans_400Regular',
                          fontSize: 12,
                          color: Colors.textSecondary,
                        }}
                      >
                        {Math.round(entry.calories * entry.servings)} cal • {Math.round(entry.netCarbs * entry.servings)}g carbs
                      </Text>
                    </View>
                    {index < entries.length - 1 && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: Colors.border,
                          marginVertical: 8,
                        }}
                      />
                    )}
                  </View>
                ))}

                {/* Total nutrition */}
                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: Colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 13,
                      color: Colors.textPrimary,
                    }}
                  >
                    Total: {Math.round(totalCals)} cal • {Math.round(totalNetCarbs)}g net carbs • {Math.round(totalProtein)}g protein
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                }}
              >
                <Pressable
                  onPress={() => router.push({
                    pathname: '/add-meal-entry',
                    params: { mealType, date: dateStr },
                  })}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: Colors.green,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 14,
                      color: Colors.green,
                    }}
                  >
                    Edit Details
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.back()}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: BorderRadius.md,
                    backgroundColor: Colors.green,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 14,
                      color: '#FFFFFF',
                    }}
                  >
                    Confirm & Select Meal Type
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {/* Move Entry Sheet */}
          {selectedEntry ? (
            <MoveToMealSheet
              visible={moveSheetVisible}
              currentMealType={selectedEntry.mealType}
              foodName={selectedEntry.name}
              currentDate={dateStr}
              onMove={(newMealType, targetDate) => {
                if (targetDate !== dateStr) {
                  deleteEntry(selectedEntry.id);
                  showToast(`Moved to ${newMealType} on another date`, 'success');
                } else {
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
        </View>

        {detailSheetVisible && selectedEntry ? (
          <MealEntryDetailSheet
            visible={detailSheetVisible}
            entry={selectedEntry}
            onClose={() => setDetailSheetVisible(false)}
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
        ) : null}
      </SafeAreaView>
    </>
  );
}
