import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ChevronLeft, Minus, Plus } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';
import type { FoodEntry } from '@/lib/stores/mealsStore';

interface ManualFoodEntryFormProps {
  onSave: (entry: Omit<FoodEntry, 'id' | 'date' | 'mealType'>) => void;
  onCancel: () => void;
}

export function ManualFoodEntryForm({ onSave, onCancel }: ManualFoodEntryFormProps) {
  const [foodName, setFoodName] = useState('');
  const [brand, setBrand] = useState('');
  const [servingDesc, setServingDesc] = useState('1 serving');
  const [servings, setServings] = useState<number>(1);
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fiber, setFiber] = useState('0');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const carbsNum = parseFloat(carbs || '0');
  const fiberNum = parseFloat(fiber || '0');
  const netCarbs = Math.max(0, carbsNum - fiberNum);

  const validateEntry = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!foodName.trim()) {
      newErrors.foodName = 'Food name is required';
    }
    if (!calories) {
      newErrors.calories = 'Calories is required';
    } else if (isNaN(parseFloat(calories))) {
      newErrors.calories = 'Must be a valid number';
    }
    if (!carbs) {
      newErrors.carbs = 'Total carbs is required';
    } else if (isNaN(parseFloat(carbs))) {
      newErrors.carbs = 'Must be a valid number';
    }
    if (!protein) {
      newErrors.protein = 'Protein is required';
    } else if (isNaN(parseFloat(protein))) {
      newErrors.protein = 'Must be a valid number';
    }
    if (!fat) {
      newErrors.fat = 'Fat is required';
    } else if (isNaN(parseFloat(fat))) {
      newErrors.fat = 'Must be a valid number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateEntry()) return;

    const entry: Omit<FoodEntry, 'id' | 'date' | 'mealType'> = {
      name: foodName.trim(),
      brand: brand.trim() || undefined,
      servings,
      calories: Math.round(parseFloat(calories)),
      carbs: carbsNum,
      fiber: fiberNum,
      netCarbs: netCarbs,
      protein: parseFloat(protein),
      fat: parseFloat(fat),
      isFavorite: saveAsFavorite,
    };

    onSave(entry);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <Pressable
          onPress={onCancel}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
        >
          <ChevronLeft size={16} color={Colors.textSecondary} />
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary }}>
            Back
          </Text>
        </Pressable>

        <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: Colors.textPrimary, marginBottom: 20 }}>
          Enter Food Details
        </Text>

        {/* Food Name */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 8 }}>
            FOOD NAME
          </Text>
          <TextInput
            value={foodName}
            onChangeText={setFoodName}
            placeholder="e.g., Grilled Chicken Breast"
            placeholderTextColor={Colors.textTertiary}
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: errors.foodName ? Colors.error : Colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textPrimary,
            }}
            testID="manual-food-name-input"
          />
          {errors.foodName ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.error, marginTop: 4 }}>
              {errors.foodName}
            </Text>
          ) : null}
        </View>

        {/* Brand */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 8 }}>
            BRAND (OPTIONAL)
          </Text>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g., Organic Valley"
            placeholderTextColor={Colors.textTertiary}
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: Colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textPrimary,
            }}
            testID="manual-brand-input"
          />
        </View>

        {/* Serving Description */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 8 }}>
            SERVING SIZE DESCRIPTION
          </Text>
          <TextInput
            value={servingDesc}
            onChangeText={setServingDesc}
            placeholder="e.g., 100g, 1 cup, 2 slices"
            placeholderTextColor={Colors.textTertiary}
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: Colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textPrimary,
            }}
            testID="manual-serving-desc-input"
          />
        </View>

        {/* Servings Stepper */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 10 }}>
            NUMBER OF SERVINGS
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
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
        </View>

        {/* Calories */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 8 }}>
            CALORIES
          </Text>
          <TextInput
            value={calories}
            onChangeText={setCalories}
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: errors.calories ? Colors.error : Colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textPrimary,
            }}
            testID="manual-calories-input"
          />
          {errors.calories ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.error, marginTop: 4 }}>
              {errors.calories}
            </Text>
          ) : null}
        </View>

        {/* Total Carbs */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 8 }}>
            TOTAL CARBOHYDRATES (G)
          </Text>
          <TextInput
            value={carbs}
            onChangeText={setCarbs}
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: errors.carbs ? Colors.error : Colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textPrimary,
            }}
            testID="manual-carbs-input"
          />
          {errors.carbs ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.error, marginTop: 4 }}>
              {errors.carbs}
            </Text>
          ) : null}
        </View>

        {/* Dietary Fiber */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 8 }}>
            DIETARY FIBER (G)
          </Text>
          <TextInput
            value={fiber}
            onChangeText={setFiber}
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: Colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textPrimary,
            }}
            testID="manual-fiber-input"
          />
        </View>

        {/* Net Carbs Display */}
        <View style={{
          backgroundColor: `${Colors.green}15`,
          borderRadius: BorderRadius.lg,
          borderWidth: 1,
          borderColor: `${Colors.green}40`,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.green }}>
            NET CARBS
          </Text>
          <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 18, color: Colors.green }}>
            {netCarbs.toFixed(1)}g
          </Text>
        </View>

        {/* Protein */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 8 }}>
            PROTEIN (G)
          </Text>
          <TextInput
            value={protein}
            onChangeText={setProtein}
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: errors.protein ? Colors.error : Colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textPrimary,
            }}
            testID="manual-protein-input"
          />
          {errors.protein ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.error, marginTop: 4 }}>
              {errors.protein}
            </Text>
          ) : null}
        </View>

        {/* Total Fat */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 8 }}>
            TOTAL FAT (G)
          </Text>
          <TextInput
            value={fat}
            onChangeText={setFat}
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: errors.fat ? Colors.error : Colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textPrimary,
            }}
            testID="manual-fat-input"
          />
          {errors.fat ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.error, marginTop: 4 }}>
              {errors.fat}
            </Text>
          ) : null}
        </View>

        {/* Sugar */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 8 }}>
            SUGAR (G) (OPTIONAL)
          </Text>
          <TextInput
            value={sugar}
            onChangeText={setSugar}
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: Colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textPrimary,
            }}
            testID="manual-sugar-input"
          />
        </View>

        {/* Sodium */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 8 }}>
            SODIUM (MG) (OPTIONAL)
          </Text>
          <TextInput
            value={sodium}
            onChangeText={setSodium}
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: Colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textPrimary,
            }}
            testID="manual-sodium-input"
          />
        </View>

        {/* Save as Favorite Toggle */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: Colors.surface,
          borderRadius: BorderRadius.lg,
          borderWidth: 1,
          borderColor: Colors.border,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 20,
        }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary }}>
            Save as Favorite
          </Text>
          <Pressable
            onPress={() => setSaveAsFavorite(!saveAsFavorite)}
            style={{
              width: 50,
              height: 30,
              borderRadius: 15,
              backgroundColor: saveAsFavorite ? Colors.green : Colors.navyCard,
              borderWidth: 1,
              borderColor: Colors.border,
              justifyContent: 'center',
              paddingHorizontal: 2,
            }}
            testID="save-as-favorite-toggle"
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: '#fff',
                alignSelf: saveAsFavorite ? 'flex-end' : 'flex-start',
              }}
            />
          </Pressable>
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleSave}
          style={{
            backgroundColor: Colors.green,
            borderRadius: BorderRadius.lg,
            paddingVertical: 14,
            alignItems: 'center',
            marginBottom: 10,
          }}
          testID="save-manual-food-button"
        >
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.navy }}>
            Save to Meal Log
          </Text>
        </Pressable>

        {/* Cancel Button */}
        <Pressable
          onPress={onCancel}
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: BorderRadius.lg,
            paddingVertical: 12,
            alignItems: 'center',
          }}
          testID="cancel-manual-entry"
        >
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.textSecondary }}>
            Cancel
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
