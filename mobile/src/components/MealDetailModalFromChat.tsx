import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Heart, Edit2, Trash2 } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';
import { formatNutrient } from '@/lib/mealAnalysis';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import type { FoodEntry } from '@/lib/stores/mealsStore';
import * as Haptics from 'expo-haptics';

interface MealDetailModalFromChatProps {
  visible: boolean;
  entry: (FoodEntry & { id: string }) | null;
  onClose: () => void;
  onFavorite?: (entry: FoodEntry & { id: string }) => void;
  onEdit?: (entry: FoodEntry & { id: string }) => void;
  onDelete?: (entryId: string) => void;
  onMove?: (entry: FoodEntry & { id: string }, targetDate: string) => void;
}

export function MealDetailModalFromChat({
  visible,
  entry,
  onClose,
  onFavorite,
  onEdit,
  onDelete,
  onMove,
}: MealDetailModalFromChatProps) {
  const [isActioning, setIsActioning] = useState(false);
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const isFavorited = useFavoritesStore((s) => s.isFavorited);

  if (!entry) return null;

  const mealId = `meal-${entry.mealType}-${entry.calories}`;
  const isCurrentlyFavorited = isFavorited(mealId);

  const handleToggleFavorite = async () => {
    if (isActioning) return;
    setIsActioning(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (isCurrentlyFavorited) {
        removeFavorite(mealId);
      } else {
        // Parse food name to extract individual items if possible
        const foods = entry.name
          .split(',')
          .map((name) => ({
            name: name.trim(),
            quantity: 1,
            unit: 'serving',
            calories: Math.round(entry.calories / entry.name.split(',').length),
            carbs: Math.round(entry.carbs * 10) / 10,
            protein: Math.round(entry.protein * 10) / 10,
            fat: Math.round(entry.fat * 10) / 10,
            fiber: entry.fiber,
            netCarbs: Math.round(entry.netCarbs * 10) / 10,
          }));

        addFavorite({
          id: mealId,
          name: entry.name,
          mealType: entry.mealType,
          foods,
          nutrition: {
            calories: entry.calories,
            carbs: entry.carbs,
            protein: entry.protein,
            fat: entry.fat,
            fiber: entry.fiber,
            netCarbs: entry.netCarbs,
          },
          timesLogged: 1,
          createdAt: new Date().toISOString(),
          lastLoggedAt: new Date().toISOString(),
        });
      }

      if (onFavorite) {
        onFavorite(entry);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleDelete = async () => {
    if (isActioning || !onDelete) return;
    setIsActioning(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onDelete(entry.id);
      onClose();
    } catch (error) {
      console.error('Error deleting entry:', error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleEdit = async () => {
    if (isActioning || !onEdit) return;
    setIsActioning(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onEdit(entry);
      onClose();
    } catch (error) {
      console.error('Error editing entry:', error);
    } finally {
      setIsActioning(false);
    }
  };

  // Format the date for display
  const displayDate = new Date(entry.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          justifyContent: 'flex-end',
        }}
      >
        <SafeAreaView
          style={{
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: Colors.navyCard,
              borderTopLeftRadius: BorderRadius.lg,
              borderTopRightRadius: BorderRadius.lg,
              borderTopWidth: 1,
              borderTopColor: Colors.border,
              maxHeight: '85%',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'PlayfairDisplay_700Bold',
                    fontSize: 16,
                    color: Colors.textPrimary,
                    marginBottom: 4,
                  }}
                >
                  {entry.name}
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: Colors.textSecondary,
                  }}
                >
                  {displayDate} • {entry.mealType}
                </Text>
              </View>
              <Pressable onPress={onClose} testID="close-meal-detail-modal" hitSlop={8}>
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Nutrition Breakdown */}
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 12,
                    color: Colors.textSecondary,
                    marginBottom: 12,
                    textTransform: 'uppercase',
                  }}
                >
                  Nutrition
                </Text>

                {/* Main nutrients grid */}
                <View
                  style={{
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.md,
                    padding: 16,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 13,
                        color: Colors.textSecondary,
                      }}
                    >
                      Calories
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 16,
                        color: Colors.textPrimary,
                      }}
                    >
                      {Math.round(entry.calories * entry.servings)}
                    </Text>
                  </View>

                  <View style={{ height: 1, backgroundColor: Colors.border }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text
                        style={{
                          fontFamily: 'DMSans_500Medium',
                          fontSize: 11,
                          color: Colors.amber,
                          marginBottom: 4,
                        }}
                      >
                        Net Carbs
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'DMSans_600SemiBold',
                          fontSize: 14,
                          color: Colors.textPrimary,
                        }}
                      >
                        {formatNutrient(
                          Math.round(entry.netCarbs * entry.servings * 10) / 10,
                          'g'
                        )}
                      </Text>
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <Text
                        style={{
                          fontFamily: 'DMSans_500Medium',
                          fontSize: 11,
                          color: '#3498DB',
                          marginBottom: 4,
                        }}
                      >
                        Protein
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'DMSans_600SemiBold',
                          fontSize: 14,
                          color: Colors.textPrimary,
                        }}
                      >
                        {formatNutrient(
                          Math.round(entry.protein * entry.servings * 10) / 10,
                          'g'
                        )}
                      </Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text
                        style={{
                          fontFamily: 'DMSans_500Medium',
                          fontSize: 11,
                          color: Colors.amber,
                          marginBottom: 4,
                        }}
                      >
                        Fat
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'DMSans_600SemiBold',
                          fontSize: 14,
                          color: Colors.textPrimary,
                        }}
                      >
                        {formatNutrient(
                          Math.round(entry.fat * entry.servings * 10) / 10,
                          'g'
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={{ height: 1, backgroundColor: Colors.border }} />

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 13,
                        color: Colors.textSecondary,
                      }}
                    >
                      Fiber
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 14,
                        color: Colors.textPrimary,
                      }}
                    >
                      {formatNutrient(
                        Math.round(entry.fiber * entry.servings * 10) / 10,
                        'g'
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Entry Details */}
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 12,
                    color: Colors.textSecondary,
                    marginBottom: 12,
                    textTransform: 'uppercase',
                  }}
                >
                  Entry Details
                </Text>

                <View
                  style={{
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.md,
                    padding: 16,
                    gap: 12,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 11,
                        color: Colors.textSecondary,
                        marginBottom: 4,
                        textTransform: 'uppercase',
                      }}
                    >
                      Date
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 13,
                        color: Colors.textPrimary,
                      }}
                    >
                      {displayDate}
                    </Text>
                  </View>

                  <View style={{ height: 1, backgroundColor: Colors.border }} />

                  <View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 11,
                        color: Colors.textSecondary,
                        marginBottom: 4,
                        textTransform: 'uppercase',
                      }}
                    >
                      Meal Type
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 13,
                        color: Colors.textPrimary,
                      }}
                    >
                      {entry.mealType}
                    </Text>
                  </View>

                  <View style={{ height: 1, backgroundColor: Colors.border }} />

                  <View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 11,
                        color: Colors.textSecondary,
                        marginBottom: 4,
                        textTransform: 'uppercase',
                      }}
                    >
                      Servings
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 13,
                        color: Colors.textPrimary,
                      }}
                    >
                      {entry.servings} serving{entry.servings !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: Colors.border,
                paddingHorizontal: 20,
                paddingVertical: 12,
                gap: 8,
              }}
            >
              {/* Favorite Button */}
              <Pressable
                onPress={handleToggleFavorite}
                disabled={isActioning}
                testID="toggle-favorite-button"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: BorderRadius.md,
                  backgroundColor: isCurrentlyFavorited ? Colors.errorMuted : Colors.surface,
                  borderWidth: 1,
                  borderColor: isCurrentlyFavorited ? Colors.error : Colors.border,
                  opacity: isActioning ? 0.6 : 1,
                }}
              >
                <Heart
                  size={18}
                  color={isCurrentlyFavorited ? Colors.error : Colors.textSecondary}
                  fill={isCurrentlyFavorited ? Colors.error : 'none'}
                />
                <Text
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 14,
                    color: isCurrentlyFavorited ? Colors.error : Colors.textPrimary,
                  }}
                >
                  {isCurrentlyFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                </Text>
              </Pressable>

              {/* Edit and Delete Row */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {onEdit ? (
                  <Pressable
                    onPress={handleEdit}
                    disabled={isActioning}
                    testID="edit-entry-button"
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      borderRadius: BorderRadius.md,
                      backgroundColor: Colors.surface,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      opacity: isActioning ? 0.6 : 1,
                    }}
                  >
                    <Edit2 size={16} color={Colors.textPrimary} />
                    <Text
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 13,
                        color: Colors.textPrimary,
                      }}
                    >
                      Edit
                    </Text>
                  </Pressable>
                ) : null}

                {onDelete ? (
                  <Pressable
                    onPress={handleDelete}
                    disabled={isActioning}
                    testID="delete-entry-button"
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      borderRadius: BorderRadius.md,
                      backgroundColor: Colors.errorMuted,
                      borderWidth: 1,
                      borderColor: Colors.error,
                      opacity: isActioning ? 0.6 : 1,
                    }}
                  >
                    {isActioning ? (
                      <ActivityIndicator size="small" color={Colors.error} />
                    ) : (
                      <Trash2 size={16} color={Colors.error} />
                    )}
                    <Text
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 13,
                        color: Colors.error,
                      }}
                    >
                      Delete
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <Pressable
                onPress={onClose}
                disabled={isActioning}
                style={{
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 14,
                    color: Colors.textSecondary,
                  }}
                >
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
