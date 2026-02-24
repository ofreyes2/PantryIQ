import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Edit2 } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';
import type { FoodEntry } from '@/lib/stores/mealsStore';

interface MealEntryDetailSheetProps {
  visible: boolean;
  entry: FoodEntry | null;
  onClose: () => void;
  onDelete?: () => void;
  onMove?: () => void;
  onUpdateNutrition?: (entryId: string, updates: Partial<FoodEntry>) => void;
}

export function MealEntryDetailSheet({
  visible,
  entry,
  onClose,
  onDelete,
  onMove,
  onUpdateNutrition,
}: MealEntryDetailSheetProps) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  if (!entry) return null;

  const getMealEmoji = () => {
    const emojis: Record<string, string> = {
      Breakfast: '🌅',
      Lunch: '🌞',
      Dinner: '🌙',
      Snacks: '🍎',
    };
    return emojis[entry.mealType] || '🍽️';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handle single food entry - create a foods array representation
  const foods = [
    {
      id: entry.id,
      name: entry.name,
      quantity: entry.servings,
      unit: 'serving',
      calories: entry.calories,
      netCarbs: entry.netCarbs,
      protein: entry.protein,
      fat: entry.fat,
      fiber: entry.fiber,
    },
  ];

  const totalCalories = foods.reduce((sum, food) => sum + food.calories * food.quantity, 0);
  const totalNetCarbs = foods.reduce((sum, food) => sum + food.netCarbs * food.quantity, 0);
  const totalProtein = foods.reduce((sum, food) => sum + food.protein * food.quantity, 0);
  const totalFat = foods.reduce((sum, food) => sum + food.fat * food.quantity, 0);
  const totalFiber = foods.reduce((sum, food) => sum + food.fiber * food.quantity, 0);
  const totalSugar = foods.reduce((sum, food) => sum + (food.calories - food.fat * 9 - (food.protein * 4)) / 4 * food.quantity, 0);

  const handleEditItem = (itemId: string, food: typeof foods[0]) => {
    setExpandedItemId(itemId);
    setEditValues({
      name: food.name,
      calories: String(food.calories),
      netCarbs: String(food.netCarbs),
      protein: String(food.protein),
      fat: String(food.fat),
    });
  };

  const handleSaveItem = (itemId: string) => {
    if (onUpdateNutrition) {
      onUpdateNutrition(entry.id, {
        name: editValues.name || entry.name,
        calories: parseFloat(editValues.calories) || entry.calories,
        netCarbs: parseFloat(editValues.netCarbs) || entry.netCarbs,
        protein: parseFloat(editValues.protein) || entry.protein,
        fat: parseFloat(editValues.fat) || entry.fat,
      });
      setExpandedItemId(null);
      setEditValues({});
    }
  };

  const isItemExpanded = (itemId: string) => expandedItemId === itemId;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={80}
          style={{
            flex: 1,
            backgroundColor: Colors.navy,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            overflow: 'hidden',
          }}
        >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {/* HEADER */}
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
                <Pressable
                  onPress={onClose}
                  hitSlop={16}
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    marginLeft: -12,
                    marginTop: -6,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 16,
                      color: Colors.textSecondary,
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 20,
                    color: '#FFFFFF',
                  }}
                >
                  Meal Details
                </Text>
                <View style={{ width: 60 }} />
              </View>

              {/* Meal type and time */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 13,
                    color: Colors.textSecondary,
                  }}
                >
                  {getMealEmoji()} {entry.mealType} • Logged at {formatTime(entry.date)}
                </Text>
              </View>

              {/* FOOD ITEMS LIST */}
              <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 13,
                    color: Colors.textSecondary,
                    marginBottom: 12,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Food Items
                </Text>
                {foods.map((food, idx) => (
                  <View key={food.id}>
                    {isItemExpanded(food.id) ? (
                      // EXPANDED EDIT VIEW
                      <View
                        style={{
                          backgroundColor: Colors.surface,
                          borderRadius: BorderRadius.md,
                          padding: 16,
                          marginBottom: 12,
                        }}
                      >
                        {/* Name */}
                        <View style={{ marginBottom: 12 }}>
                          <Text
                            style={{
                              fontFamily: 'DMSans_500Medium',
                              fontSize: 12,
                              color: Colors.textSecondary,
                              marginBottom: 6,
                            }}
                          >
                            Name
                          </Text>
                          <TextInput
                            value={editValues.name || ''}
                            onChangeText={(text) => setEditValues({ ...editValues, name: text })}
                            style={{
                              backgroundColor: Colors.navy,
                              borderWidth: 1,
                              borderColor: Colors.border,
                              borderRadius: BorderRadius.sm,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              fontFamily: 'DMSans_400Regular',
                              fontSize: 13,
                              color: Colors.textPrimary,
                            }}
                          />
                        </View>

                        {/* Calories */}
                        <View style={{ marginBottom: 12 }}>
                          <Text
                            style={{
                              fontFamily: 'DMSans_500Medium',
                              fontSize: 12,
                              color: Colors.textSecondary,
                              marginBottom: 6,
                            }}
                          >
                            Calories
                          </Text>
                          <TextInput
                            value={editValues.calories || ''}
                            onChangeText={(text) => setEditValues({ ...editValues, calories: text })}
                            keyboardType="decimal-pad"
                            style={{
                              backgroundColor: Colors.navy,
                              borderWidth: 1,
                              borderColor: Colors.border,
                              borderRadius: BorderRadius.sm,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              fontFamily: 'DMSans_400Regular',
                              fontSize: 13,
                              color: Colors.textPrimary,
                            }}
                          />
                        </View>

                        {/* Net Carbs */}
                        <View style={{ marginBottom: 12 }}>
                          <Text
                            style={{
                              fontFamily: 'DMSans_500Medium',
                              fontSize: 12,
                              color: Colors.textSecondary,
                              marginBottom: 6,
                            }}
                          >
                            Net Carbs
                          </Text>
                          <TextInput
                            value={editValues.netCarbs || ''}
                            onChangeText={(text) => setEditValues({ ...editValues, netCarbs: text })}
                            keyboardType="decimal-pad"
                            style={{
                              backgroundColor: Colors.navy,
                              borderWidth: 1,
                              borderColor: Colors.border,
                              borderRadius: BorderRadius.sm,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              fontFamily: 'DMSans_400Regular',
                              fontSize: 13,
                              color: Colors.textPrimary,
                            }}
                          />
                        </View>

                        {/* Protein */}
                        <View style={{ marginBottom: 12 }}>
                          <Text
                            style={{
                              fontFamily: 'DMSans_500Medium',
                              fontSize: 12,
                              color: Colors.textSecondary,
                              marginBottom: 6,
                            }}
                          >
                            Protein
                          </Text>
                          <TextInput
                            value={editValues.protein || ''}
                            onChangeText={(text) => setEditValues({ ...editValues, protein: text })}
                            keyboardType="decimal-pad"
                            style={{
                              backgroundColor: Colors.navy,
                              borderWidth: 1,
                              borderColor: Colors.border,
                              borderRadius: BorderRadius.sm,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              fontFamily: 'DMSans_400Regular',
                              fontSize: 13,
                              color: Colors.textPrimary,
                            }}
                          />
                        </View>

                        {/* Fat */}
                        <View style={{ marginBottom: 16 }}>
                          <Text
                            style={{
                              fontFamily: 'DMSans_500Medium',
                              fontSize: 12,
                              color: Colors.textSecondary,
                              marginBottom: 6,
                            }}
                          >
                            Fat
                          </Text>
                          <TextInput
                            value={editValues.fat || ''}
                            onChangeText={(text) => setEditValues({ ...editValues, fat: text })}
                            keyboardType="decimal-pad"
                            style={{
                              backgroundColor: Colors.navy,
                              borderWidth: 1,
                              borderColor: Colors.border,
                              borderRadius: BorderRadius.sm,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              fontFamily: 'DMSans_400Regular',
                              fontSize: 13,
                              color: Colors.textPrimary,
                            }}
                          />
                        </View>

                        {/* Action buttons */}
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <Pressable
                            onPress={() => {
                              setExpandedItemId(null);
                              setEditValues({});
                            }}
                            style={{
                              flex: 1,
                              backgroundColor: Colors.surface,
                              borderWidth: 1,
                              borderColor: Colors.border,
                              borderRadius: BorderRadius.md,
                              paddingVertical: 10,
                              alignItems: 'center',
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: 'DMSans_600SemiBold',
                                fontSize: 13,
                                color: Colors.textSecondary,
                              }}
                            >
                              Cancel
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleSaveItem(food.id)}
                            style={{
                              flex: 1,
                              backgroundColor: Colors.green,
                              borderRadius: BorderRadius.md,
                              paddingVertical: 10,
                              alignItems: 'center',
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: 'DMSans_600SemiBold',
                                fontSize: 13,
                                color: Colors.navy,
                              }}
                            >
                              Update
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      // NORMAL ROW VIEW - Like food log entry style
                      <Pressable
                        onPress={() => handleEditItem(food.id, food)}
                        style={{
                          backgroundColor: Colors.navyCard,
                          borderRadius: BorderRadius.md,
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          marginBottom: 10,
                          borderWidth: 1,
                          borderColor: Colors.border,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
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
                            {food.quantity} {food.unit} {food.name}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <Text
                              style={{
                                fontFamily: 'DMSans_400Regular',
                                fontSize: 12,
                                color: Colors.textSecondary,
                              }}
                            >
                              {Math.round(food.calories * food.quantity)} cal
                            </Text>
                            <Text
                              style={{
                                fontFamily: 'DMSans_400Regular',
                                fontSize: 12,
                                color: Colors.green,
                              }}
                            >
                              {Math.round(food.netCarbs * food.quantity * 10) / 10}g carbs
                            </Text>
                            <Text
                              style={{
                                fontFamily: 'DMSans_400Regular',
                                fontSize: 12,
                                color: Colors.textSecondary,
                              }}
                            >
                              {Math.round(food.protein * food.quantity)}g protein
                            </Text>
                          </View>
                        </View>

                        <View style={{ marginLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text
                            style={{
                              fontFamily: 'DMSans_700Bold',
                              fontSize: 13,
                              color: Colors.textPrimary,
                            }}
                          >
                            {Math.round(food.calories * food.quantity)} cal
                          </Text>
                          <Edit2 size={16} color={Colors.textTertiary} />
                        </View>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>

              {/* TOTAL ROW */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  marginTop: 8,
                  borderTopWidth: 1.5,
                  borderTopColor: Colors.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 13,
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                  }}
                >
                  Total
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 16,
                      color: '#FFFFFF',
                    }}
                  >
                    {Math.round(totalCalories)} cal
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 14,
                      color: Colors.green,
                      marginTop: 2,
                    }}
                  >
                    {Math.round(totalNetCarbs * 10) / 10}g net carbs
                  </Text>
                </View>
              </View>

              {/* NUTRITION SUMMARY CARD */}
              <View
                style={{
                  marginHorizontal: 20,
                  marginTop: 16,
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.lg,
                  padding: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  {/* Protein */}
                  <View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 13,
                        color: Colors.textSecondary,
                        marginBottom: 4,
                      }}
                    >
                      Protein
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 16,
                        color: '#FFFFFF',
                      }}
                    >
                      {Math.round(totalProtein * 10) / 10}g
                    </Text>
                  </View>

                  {/* Fat */}
                  <View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 13,
                        color: Colors.textSecondary,
                        marginBottom: 4,
                      }}
                    >
                      Fat
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 16,
                        color: '#FFFFFF',
                      }}
                    >
                      {Math.round(totalFat * 10) / 10}g
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Fiber */}
                  <View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 13,
                        color: Colors.textSecondary,
                        marginBottom: 4,
                      }}
                    >
                      Fiber
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 16,
                        color: '#FFFFFF',
                      }}
                    >
                      {Math.round(totalFiber * 10) / 10}g
                    </Text>
                  </View>

                  {/* Sugar */}
                  <View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 13,
                        color: Colors.textSecondary,
                        marginBottom: 4,
                      }}
                    >
                      Sugar
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: 16,
                        color: '#FFFFFF',
                      }}
                    >
                      {Math.round(totalSugar * 10) / 10}g
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* ACTION BUTTONS - Always above keyboard */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: Colors.surface,
                borderTopWidth: 1,
                borderTopColor: Colors.border,
                gap: 10,
              }}
            >
              {/* Save Changes */}
              <Pressable
                onPress={onClose}
                style={{
                  backgroundColor: Colors.green,
                  borderRadius: BorderRadius.lg,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 15,
                    color: Colors.navy,
                  }}
                >
                  Save Changes
                </Text>
              </Pressable>

              {/* Move to Different Meal */}
              {onMove ? (
                <Pressable
                  onPress={() => {
                    onMove();
                    onClose();
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderColor: Colors.border,
                    borderRadius: BorderRadius.lg,
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 15,
                      color: Colors.textSecondary,
                    }}
                  >
                    Move to Different Meal
                  </Text>
                </Pressable>
              ) : null}

              {/* Delete Entry */}
              {onDelete ? (
                <Pressable
                  onPress={() => {
                    onDelete();
                    onClose();
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    borderRadius: BorderRadius.lg,
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 15,
                      color: Colors.error,
                    }}
                  >
                    Delete Entry
                  </Text>
                </Pressable>
              ) : null}
            </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
