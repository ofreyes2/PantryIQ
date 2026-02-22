import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  ChevronDown,
  Check,
  Scan,
} from 'lucide-react-native';
import { usePantryStore, PantryCategory, PantryUnit, InventoryUnit, ServingUnit } from '@/lib/stores/pantryStore';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

const CATEGORIES: PantryCategory[] = [
  'Proteins', 'Dairy', 'Vegetables', 'Frozen', 'Pantry Staples',
  'Snacks', 'Condiments', 'Beverages', 'Bread & Wraps', 'Other',
];

const UNITS: PantryUnit[] = ['oz', 'lbs', 'count', 'cups', 'g', 'kg', 'ml', 'L'];
const INVENTORY_UNITS: InventoryUnit[] = ['loaf', 'dozen', 'package', 'bag', 'bottle', 'can', 'box', 'lb', 'oz', 'count', 'other'];
const SERVING_UNITS: ServingUnit[] = ['slice', 'egg', 'strip', 'piece', 'cup', 'oz', 'tbsp', 'g', 'serving'];

function SectionLabel({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontFamily: 'DMSans_700Bold',
        fontSize: 13,
        color: Colors.textSecondary,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 10,
        marginTop: 20,
      }}
    >
      {title}
    </Text>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  required,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  required?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 13,
          color: Colors.textSecondary,
          marginBottom: 6,
        }}
      >
        {label}
        {required ? <Text style={{ color: Colors.error }}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        keyboardType={keyboardType}
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
      />
    </View>
  );
}

function PickerRow({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 13,
          color: Colors.textSecondary,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(!open)}
        style={{
          backgroundColor: Colors.surface,
          borderRadius: BorderRadius.lg,
          borderWidth: 1,
          borderColor: open ? Colors.green : Colors.border,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.textPrimary }}
        >
          {value}
        </Text>
        <ChevronDown
          size={16}
          color={Colors.textSecondary}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {open ? (
        <View
          style={{
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.lg,
            borderWidth: 1,
            borderColor: Colors.border,
            marginTop: 4,
            overflow: 'hidden',
            ...Shadows.card,
          }}
        >
          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => {
                onSelect(opt);
                setOpen(false);
              }}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: Colors.borderLight,
              }}
            >
              <Text
                style={{
                  fontFamily: value === opt ? 'DMSans_700Bold' : 'DMSans_400Regular',
                  fontSize: 15,
                  color: value === opt ? Colors.green : Colors.textPrimary,
                }}
              >
                {opt}
              </Text>
              {value === opt ? <Check size={16} color={Colors.green} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ─── Success Toast ─────────────────────────────────────────────────────────────

function SuccessToast({ visible }: { visible: boolean }) {
  const opacity = useState(() => new RNAnimated.Value(0))[0];

  useEffect(() => {
    if (visible) {
      RNAnimated.sequence([
        RNAnimated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        RNAnimated.delay(900),
        RNAnimated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity]);

  return (
    <RNAnimated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 100,
        alignSelf: 'center',
        opacity,
        backgroundColor: Colors.green,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 20,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 999,
        ...Shadows.elevated,
      }}
    >
      <Check size={16} color={Colors.navy} />
      <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.navy }}>
        Item added
      </Text>
    </RNAnimated.View>
  );
}

export default function AddPantryItemScreen() {
  const params = useLocalSearchParams<{
    name?: string;
    brand?: string;
    category?: string;
    caloriesPerServing?: string;
    carbsPerServing?: string;
    proteinPerServing?: string;
    fatPerServing?: string;
    servingSize?: string;
    barcode?: string;
    photoUri?: string;
    returnTo?: string;
    inventoryUnit?: string;
    servingUnit?: string;
    servingsPerContainer?: string;
  }>();

  const addItem = usePantryStore((s) => s.addItem);

  const returnToScanner = params.returnTo === 'scanner';

  const [photoUri, setPhotoUri] = useState<string>(params.photoUri ?? '');
  const [name, setName] = useState(params.name ?? '');
  const [brand, setBrand] = useState(params.brand ?? '');
  const [category, setCategory] = useState<PantryCategory>(
    (params.category as PantryCategory) ?? 'Other'
  );
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<PantryUnit>('count');
  const [inventoryUnit, setInventoryUnit] = useState<InventoryUnit>((params.inventoryUnit as InventoryUnit) ?? 'count');
  const [servingUnit, setServingUnit] = useState<ServingUnit>((params.servingUnit as ServingUnit) ?? 'serving');
  const [servingsPerContainer, setServingsPerContainer] = useState(params.servingsPerContainer ?? '1');
  const [calories, setCalories] = useState(params.caloriesPerServing ?? '');
  const [carbs, setCarbs] = useState(params.carbsPerServing ?? '');
  const [protein, setProtein] = useState(params.proteinPerServing ?? '');
  const [fat, setFat] = useState(params.fatPerServing ?? '');
  const [servingSize, setServingSize] = useState(params.servingSize ?? '');
  const [expiryDate, setExpiryDate] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState(2);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState(false);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) < 0) {
      errs.quantity = 'Valid quantity required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    addItem({
      name: name.trim(),
      brand: brand.trim() || undefined,
      category,
      quantity: Number(quantity),
      unit,
      inventoryUnit,
      servingUnit,
      servingsPerContainer: Number(servingsPerContainer) || 1,
      lowStockThreshold,
      caloriesPerServing: Number(calories) || 0,
      carbsPerServing: Number(carbs) || 0,
      proteinPerServing: Number(protein) || 0,
      fatPerServing: Number(fat) || 0,
      servingSize: servingSize.trim() || '1 serving',
      photoUri: photoUri || undefined,
      barcode: params.barcode ?? undefined,
      expiryDate: expiryDate.trim() || undefined,
      addedBy: undefined,
    });

    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (returnToScanner) {
      // Show toast then navigate back to scanner
      setShowToast(true);
      setTimeout(() => {
        router.back();
      }, 600);
    } else {
      router.back();
    }
  };

  return (
    <LinearGradient colors={['#0A1628', '#0B1C35']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']} testID="add-pantry-item-screen">
        {/* Success Toast */}
        <SuccessToast visible={showToast} />

        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: Colors.borderLight,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            testID="back-button"
          >
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </Pressable>
          <Text
            style={{
              fontFamily: 'PlayfairDisplay_700Bold',
              fontSize: 20,
              color: Colors.textPrimary,
            }}
          >
            Add Item
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: Colors.green,
              borderRadius: BorderRadius.lg,
              paddingHorizontal: 16,
              paddingVertical: 8,
              opacity: saving ? 0.7 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
            testID="save-button"
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.navy} />
            ) : returnToScanner ? (
              <>
                <Text
                  style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.navy }}
                >
                  Save
                </Text>
                <Scan size={13} color={Colors.navy} />
              </>
            ) : (
              <Text
                style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.navy }}
              >
                Save
              </Text>
            )}
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          >
            {/* Photo section */}
            <SectionLabel title="Photo" />
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: BorderRadius.lg,
                    backgroundColor: Colors.surface,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: BorderRadius.lg,
                    backgroundColor: Colors.surface,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderStyle: 'dashed',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ImageIcon size={28} color={Colors.textTertiary} />
                </View>
              )}
              <View style={{ flex: 1, gap: 8 }}>
                <Pressable
                  onPress={takePhoto}
                  style={{
                    flex: 1,
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: Colors.border,
                    flexDirection: 'row',
                    gap: 8,
                  }}
                  testID="take-photo-button"
                >
                  <Camera size={16} color={Colors.textSecondary} />
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 13,
                      color: Colors.textSecondary,
                    }}
                  >
                    Camera
                  </Text>
                </Pressable>
                <Pressable
                  onPress={pickImage}
                  style={{
                    flex: 1,
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: Colors.border,
                    flexDirection: 'row',
                    gap: 8,
                  }}
                  testID="pick-image-button"
                >
                  <ImageIcon size={16} color={Colors.textSecondary} />
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 13,
                      color: Colors.textSecondary,
                    }}
                  >
                    Gallery
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Basic info */}
            <SectionLabel title="Basic Info" />
            <InputField
              label="Item Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Chicken Breast"
              required
            />
            {errors.name ? (
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 12,
                  color: Colors.error,
                  marginTop: -8,
                  marginBottom: 8,
                }}
              >
                {errors.name}
              </Text>
            ) : null}

            <InputField
              label="Brand (optional)"
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g. Organic Valley"
            />

            <PickerRow
              label="Category"
              options={CATEGORIES}
              value={category}
              onSelect={(v) => setCategory(v as PantryCategory)}
            />

            {/* Quantity & Inventory Unit */}
            <SectionLabel title="What Are You Adding?" />
            <View style={{ backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 12 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 10 }}>
                How many are you adding to your pantry?
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Quantity"
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="1"
                    keyboardType="decimal-pad"
                    required
                  />
                  {errors.quantity ? (
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.error, marginTop: -8, marginBottom: 8 }}>
                      {errors.quantity}
                    </Text>
                  ) : null}
                </View>
                <View style={{ width: 120 }}>
                  <PickerRow
                    label="Inventory Unit"
                    options={INVENTORY_UNITS}
                    value={inventoryUnit}
                    onSelect={(v) => setInventoryUnit(v as InventoryUnit)}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, flex: 1 }}>
                  Servings per {inventoryUnit}:
                </Text>
                <View style={{ width: 80 }}>
                  <InputField
                    label=""
                    value={servingsPerContainer}
                    onChangeText={setServingsPerContainer}
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Serving Unit */}
            <SectionLabel title="Serving Unit (for meal logging)" />
            <View style={{ backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 12 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, marginBottom: 10 }}>
                How will you measure a serving when logging meals?
              </Text>
              <PickerRow
                label="Serving Unit"
                options={SERVING_UNITS}
                value={servingUnit}
                onSelect={(v) => setServingUnit(v as ServingUnit)}
              />

              {/* Low Stock threshold uses inventory unit */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, padding: 10, backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(46,204,113,0.15)' }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.green, flex: 1 }}>
                  Alert when below {lowStockThreshold} {inventoryUnit}{lowStockThreshold !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Nutrition */}
            <SectionLabel title="Nutrition per Serving" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Calories"
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Net Carbs (g)"
                  value={carbs}
                  onChangeText={setCarbs}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Protein (g)"
                  value={protein}
                  onChangeText={setProtein}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Fat (g)"
                  value={fat}
                  onChangeText={setFat}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <InputField
              label="Serving Size"
              value={servingSize}
              onChangeText={setServingSize}
              placeholder="e.g. 1 cup (240g)"
            />

            {/* Expiry */}
            <SectionLabel title="Expiry (Optional)" />
            <InputField
              label="Expiry Date"
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="YYYY-MM-DD"
            />

            {/* Low stock threshold */}
            <SectionLabel title="Low Stock Alert" />
            <View
              style={{
                backgroundColor: Colors.surface,
                borderRadius: BorderRadius.lg,
                borderWidth: 1,
                borderColor: Colors.border,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 14,
                    color: Colors.textSecondary,
                  }}
                >
                  Alert when below
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 16,
                    color: Colors.amber,
                  }}
                >
                  {lowStockThreshold}
                </Text>
              </View>
              <Slider
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={lowStockThreshold}
                onValueChange={setLowStockThreshold}
                minimumTrackTintColor={Colors.amber}
                maximumTrackTintColor={Colors.border}
                thumbTintColor={Colors.amber}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 11,
                    color: Colors.textTertiary,
                  }}
                >
                  1
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 11,
                    color: Colors.textTertiary,
                  }}
                >
                  10
                </Text>
              </View>
            </View>

            {/* Save button */}
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: Colors.green,
                borderRadius: BorderRadius.lg,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 16,
                opacity: saving ? 0.7 : 1,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
              testID="save-bottom-button"
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.navy} />
              ) : returnToScanner ? (
                <>
                  <Text
                    style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.navy }}
                  >
                    Save &amp; Scan Next
                  </Text>
                  <Scan size={18} color={Colors.navy} />
                </>
              ) : (
                <Text
                  style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.navy }}
                >
                  Save to Pantry
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
