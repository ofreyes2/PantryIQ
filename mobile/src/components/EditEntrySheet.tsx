import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';
import type { FoodEntry, MealType } from '@/lib/stores/mealsStore';

interface EditEntrySheetProps {
  visible: boolean;
  entry: FoodEntry | null;
  onSave: (updatedEntry: Partial<FoodEntry>) => void;
  onCancel: () => void;
}

const UNITS = ['oz', 'grams', 'cups', 'tbsp', 'pieces', 'sticks', 'servings'];
const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export function EditEntrySheet({
  visible,
  entry,
  onSave,
  onCancel,
}: EditEntrySheetProps) {
  const [name, setName] = useState(entry?.name ?? '');
  const [quantity, setQuantity] = useState((entry?.servings ?? 1).toString());
  const [unit, setUnit] = useState('servings');
  const [calories, setCalories] = useState((entry?.calories ?? 0).toString());
  const [netCarbs, setNetCarbs] = useState((entry?.netCarbs ?? 0).toString());
  const [protein, setProtein] = useState((entry?.protein ?? 0).toString());
  const [fat, setFat] = useState((entry?.fat ?? 0).toString());
  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    entry?.mealType ?? 'Breakfast'
  );

  const handleSave = () => {
    const updatedEntry: Partial<FoodEntry> = {
      name: name || entry?.name || 'Unknown Food',
      servings: parseFloat(quantity) || 1,
      calories: parseFloat(calories) || 0,
      netCarbs: parseFloat(netCarbs) || 0,
      protein: parseFloat(protein) || 0,
      fat: parseFloat(fat) || 0,
      mealType: selectedMealType,
    };
    onSave(updatedEntry);
  };

  if (!entry) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Pressable style={{ flex: 1 }} onPress={onCancel} />
        <View
          style={{
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
            }}
          >
            <Text
              style={{
                fontFamily: 'PlayfairDisplay_700Bold',
                fontSize: 20,
                color: Colors.textPrimary,
                flex: 1,
              }}
            >
              Edit Meal Entry
            </Text>
            <Pressable onPress={onCancel} hitSlop={8}>
              <X size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          >
            {/* Food Name */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 13,
                  color: Colors.textSecondary,
                  marginBottom: 8,
                }}
              >
                Food Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Grilled Chicken"
                placeholderTextColor={Colors.textTertiary}
                style={{
                  backgroundColor: Colors.surface,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  borderRadius: BorderRadius.md,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 14,
                  color: Colors.textPrimary,
                }}
              />
            </View>

            {/* Quantity & Unit */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 13,
                    color: Colors.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Quantity
                </Text>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="1"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  style={{
                    backgroundColor: Colors.surface,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderRadius: BorderRadius.md,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: Colors.textPrimary,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 13,
                    color: Colors.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Unit
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{
                    backgroundColor: Colors.surface,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderRadius: BorderRadius.md,
                  }}
                >
                  <View style={{ flexDirection: 'row' }}>
                    {UNITS.map((u) => (
                      <Pressable
                        key={u}
                        onPress={() => setUnit(u)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          backgroundColor:
                            unit === u ? Colors.green : 'transparent',
                          borderRadius: BorderRadius.md,
                          marginHorizontal: 4,
                          marginVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'DMSans_500Medium',
                            fontSize: 12,
                            color: unit === u ? Colors.navy : Colors.textSecondary,
                          }}
                        >
                          {u}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* Nutrition Fields */}
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 13,
                color: Colors.textSecondary,
                marginBottom: 12,
              }}
            >
              Nutrition (per serving)
            </Text>

            <View style={{ gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Calories', value: calories, setValue: setCalories, unit: 'kcal' },
                { label: 'Net Carbs', value: netCarbs, setValue: setNetCarbs, unit: 'g' },
                { label: 'Protein', value: protein, setValue: setProtein, unit: 'g' },
                { label: 'Fat', value: fat, setValue: setFat, unit: 'g' },
              ].map((field) => (
                <View key={field.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: Colors.textTertiary,
                      width: 70,
                    }}
                  >
                    {field.label}
                  </Text>
                  <TextInput
                    value={field.value}
                    onChangeText={field.setValue}
                    placeholder="0"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="decimal-pad"
                    style={{
                      flex: 1,
                      backgroundColor: Colors.surface,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      borderRadius: BorderRadius.md,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: Colors.textPrimary,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: Colors.textTertiary,
                      width: 30,
                    }}
                  >
                    {field.unit}
                  </Text>
                </View>
              ))}
            </View>

            {/* Meal Type Selector */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 13,
                  color: Colors.textSecondary,
                  marginBottom: 12,
                }}
              >
                Meal Type
              </Text>
              <View style={{ gap: 8 }}>
                {MEAL_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setSelectedMealType(type)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      backgroundColor:
                        selectedMealType === type ? Colors.surface : 'transparent',
                      borderWidth: selectedMealType === type ? 2 : 1,
                      borderColor:
                        selectedMealType === type ? Colors.green : Colors.border,
                      borderRadius: BorderRadius.md,
                    }}
                  >
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: Colors.green,
                        backgroundColor:
                          selectedMealType === type ? Colors.green : 'transparent',
                        marginRight: 10,
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 14,
                        color: Colors.textPrimary,
                      }}
                    >
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{ gap: 10 }}>
              <Pressable
                onPress={handleSave}
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
              <Pressable
                onPress={onCancel}
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.lg,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_600SemiBold',
                    fontSize: 15,
                    color: Colors.textSecondary,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
