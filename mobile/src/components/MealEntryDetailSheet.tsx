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
  ActivityIndicator,
} from 'react-native';
import { X, Edit3, Trash2, Move, Plus, Minus, ChefHat, Send } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';
import type { FoodEntry } from '@/lib/stores/mealsStore';

interface NutritionItem {
  label: string;
  key: keyof Omit<FoodEntry, 'id' | 'name' | 'brand' | 'mealType' | 'date' | 'servings' | 'photoUri' | 'pantryItemId' | 'isFavorite'>;
  unit: string;
  color: string;
  perServing: number;
}

interface MealEntryDetailSheetProps {
  visible: boolean;
  entry: FoodEntry | null;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: () => void;
  onUpdateNutrition?: (entryId: string, updates: Partial<FoodEntry>) => void;
}

export function MealEntryDetailSheet({
  visible,
  entry,
  onClose,
  onEdit,
  onDelete,
  onMove,
  onUpdateNutrition,
}: MealEntryDetailSheetProps) {
  const [editingNutrition, setEditingNutrition] = useState<string | null>(null);
  const [chefRequest, setChefRequest] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  if (!entry) return null;

  const nutritionItems: NutritionItem[] = [
    { label: 'Calories', key: 'calories', unit: 'kcal', color: Colors.green, perServing: entry.calories },
    { label: 'Net Carbs', key: 'netCarbs', unit: 'g', color: Colors.amber, perServing: entry.netCarbs },
    { label: 'Protein', key: 'protein', unit: 'g', color: Colors.textPrimary, perServing: entry.protein },
    { label: 'Total Fat', key: 'fat', unit: 'g', color: Colors.textPrimary, perServing: entry.fat },
    { label: 'Fiber', key: 'fiber', unit: 'g', color: Colors.textPrimary, perServing: entry.fiber },
    { label: 'Total Carbs', key: 'carbs', unit: 'g', color: Colors.textPrimary, perServing: entry.carbs },
  ];

  const getMealInfo = () => {
    const mealEmoji = {
      Breakfast: '🌅',
      Lunch: '🌞',
      Dinner: '🌙',
      Snacks: '🍎',
    }[entry.mealType] || '🍽️';
    return mealEmoji;
  };

  const handleNutritionEdit = (key: string) => {
    const item = nutritionItems.find((n) => n.key === key);
    if (item) {
      setEditingNutrition(key);
      setEditValues({ [key]: item.perServing.toString() });
    }
  };

  const handleNutritionSave = (key: string) => {
    const newValue = parseFloat(editValues[key] || '0');
    if (!isNaN(newValue) && onUpdateNutrition) {
      onUpdateNutrition(entry.id, { [key]: newValue });
      setEditingNutrition(null);
      setEditValues({});
    }
  };

  const handleNutritionAdjust = (key: string, delta: number) => {
    const item = nutritionItems.find((n) => n.key === key);
    if (item && onUpdateNutrition) {
      const newValue = Math.max(0, item.perServing + delta);
      onUpdateNutrition(entry.id, { [key]: newValue });
    }
  };

  const handleChefRequest = async () => {
    if (!chefRequest.trim() || !onUpdateNutrition) return;

    setIsProcessing(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
      const response = await fetch(`${baseUrl}/api/chef-claude/interpret-nutrition-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: chefRequest,
          currentNutrition: {
            calories: entry.calories,
            carbs: entry.carbs,
            protein: entry.protein,
            fat: entry.fat,
            fiber: entry.fiber,
            netCarbs: entry.netCarbs,
          },
        }),
      });

      const json = await response.json();
      if (json.data && json.data.updates) {
        onUpdateNutrition(entry.id, json.data.updates);
        setChefRequest('');
      }
    } catch (error) {
      console.error('Chef Claude error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: Colors.navyCard,
              borderTopLeftRadius: BorderRadius.xxl,
              borderTopRightRadius: BorderRadius.xxl,
              borderTopWidth: 1,
              borderTopColor: Colors.border,
              paddingBottom: 40,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              }}
            >
              <Text
                style={{
                  fontFamily: 'PlayfairDisplay_700Bold',
                  fontSize: 18,
                  color: Colors.textPrimary,
                  flex: 1,
                }}
              >
                Meal Details
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Entry Name and Meal Info */}
              <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
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
                    fontSize: 13,
                    color: Colors.textSecondary,
                  }}
                >
                  {getMealInfo()} {entry.mealType} · {entry.servings} {entry.servings === 1 ? 'serving' : 'servings'}
                </Text>
                {entry.brand ? (
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: Colors.textTertiary,
                      marginTop: 2,
                    }}
                  >
                    Brand: {entry.brand}
                  </Text>
                ) : null}
              </View>

              {/* Editable Nutrition Items - Vertical Stack */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 13,
                    color: Colors.textSecondary,
                    marginBottom: 16,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Nutrition (per serving)
                </Text>

                {/* Vertical stack of nutrition items */}
                <View style={{ gap: 12 }}>
                  {nutritionItems.map((item) => (
                    <Pressable
                      key={item.key}
                      onPress={() => handleNutritionEdit(item.key as string)}
                      style={{
                        backgroundColor: Colors.surface,
                        borderRadius: BorderRadius.md,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderWidth: editingNutrition === item.key ? 2 : 1,
                        borderColor: editingNutrition === item.key ? Colors.green : Colors.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        {/* Left: Label and value */}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontFamily: 'DMSans_500Medium',
                              fontSize: 12,
                              color: Colors.textSecondary,
                              marginBottom: 6,
                            }}
                          >
                            {item.label}
                          </Text>
                          {editingNutrition === item.key ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <TextInput
                                value={editValues[item.key] || ''}
                                onChangeText={(text) =>
                                  setEditValues({ ...editValues, [item.key]: text })
                                }
                                placeholder="0"
                                placeholderTextColor={Colors.textTertiary}
                                keyboardType="decimal-pad"
                                style={{
                                  flex: 1,
                                  backgroundColor: Colors.navyCard,
                                  borderWidth: 1,
                                  borderColor: Colors.border,
                                  borderRadius: BorderRadius.sm,
                                  paddingHorizontal: 10,
                                  paddingVertical: 8,
                                  fontFamily: 'DMSans_600SemiBold',
                                  fontSize: 14,
                                  color: item.color,
                                }}
                              />
                              <Text
                                style={{
                                  fontFamily: 'DMSans_500Medium',
                                  fontSize: 12,
                                  color: Colors.textTertiary,
                                  minWidth: 20,
                                }}
                              >
                                {item.unit}
                              </Text>
                              <Pressable
                                onPress={() => handleNutritionSave(item.key as string)}
                                style={{
                                  backgroundColor: Colors.green,
                                  borderRadius: BorderRadius.sm,
                                  paddingHorizontal: 8,
                                  paddingVertical: 6,
                                }}
                              >
                                <Text style={{ color: Colors.navy, fontSize: 11, fontWeight: '600' }}>Save</Text>
                              </Pressable>
                            </View>
                          ) : (
                            <Text
                              style={{
                                fontFamily: 'DMSans_700Bold',
                                fontSize: 16,
                                color: item.color,
                              }}
                            >
                              {Math.round(item.perServing * 10) / 10} {item.unit}
                            </Text>
                          )}
                        </View>

                        {/* Right: +/- buttons */}
                        {editingNutrition !== item.key && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Pressable
                              onPress={() => handleNutritionAdjust(item.key as string, -1)}
                              style={{
                                backgroundColor: Colors.navyCard,
                                borderRadius: BorderRadius.sm,
                                padding: 6,
                                borderWidth: 1,
                                borderColor: Colors.border,
                              }}
                            >
                              <Minus size={16} color={Colors.textSecondary} />
                            </Pressable>
                            <Pressable
                              onPress={() => handleNutritionAdjust(item.key as string, 1)}
                              style={{
                                backgroundColor: Colors.green,
                                borderRadius: BorderRadius.sm,
                                padding: 6,
                              }}
                            >
                              <Plus size={16} color={Colors.navy} />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Chef Claude Section */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                  <ChefHat size={16} color={Colors.amber} />
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 13,
                      color: Colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Chef Claude
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: Colors.textTertiary,
                    marginBottom: 12,
                  }}
                >
                  Describe what you want to change, e.g. "add 50 calories" or "double the protein"
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                  <TextInput
                    value={chefRequest}
                    onChangeText={setChefRequest}
                    placeholder="Ask Chef Claude..."
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    maxLength={200}
                    editable={!isProcessing}
                    style={{
                      flex: 1,
                      backgroundColor: Colors.surface,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      borderRadius: BorderRadius.md,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: Colors.textPrimary,
                      maxHeight: 80,
                    }}
                  />
                  <Pressable
                    onPress={handleChefRequest}
                    disabled={isProcessing || !chefRequest.trim()}
                    style={{
                      backgroundColor: isProcessing || !chefRequest.trim() ? Colors.textTertiary : Colors.amber,
                      borderRadius: BorderRadius.md,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 44,
                      minHeight: 44,
                    }}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={Colors.navy} />
                    ) : (
                      <Send size={16} color={Colors.navy} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Action Buttons */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 16,
                  paddingBottom: 8,
                  gap: 10,
                }}
              >
                {onEdit ? (
                  <Pressable
                    onPress={() => {
                      onEdit();
                      onClose();
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: Colors.green,
                      borderRadius: BorderRadius.lg,
                      paddingVertical: 12,
                      gap: 8,
                    }}
                  >
                    <Edit3 size={16} color="#fff" />
                    <Text
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 14,
                        color: '#fff',
                      }}
                    >
                      Edit Entry
                    </Text>
                  </Pressable>
                ) : null}

                {onMove ? (
                  <Pressable
                    onPress={() => {
                      onMove();
                      onClose();
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: Colors.navyCard,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      borderRadius: BorderRadius.lg,
                      paddingVertical: 12,
                      gap: 8,
                    }}
                  >
                    <Move size={16} color={Colors.textSecondary} />
                    <Text
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 14,
                        color: Colors.textSecondary,
                      }}
                    >
                      Move to Different Meal
                    </Text>
                  </Pressable>
                ) : null}

                {onDelete ? (
                  <Pressable
                    onPress={() => {
                      onDelete();
                      onClose();
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(231,76,60,0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(231,76,60,0.3)',
                      borderRadius: BorderRadius.lg,
                      paddingVertical: 12,
                      gap: 8,
                    }}
                  >
                    <Trash2 size={16} color={Colors.error} />
                    <Text
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 14,
                        color: Colors.error,
                      }}
                    >
                      Delete Entry
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
