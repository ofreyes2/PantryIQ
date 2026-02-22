import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Linking,
  Modal,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInDown,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { X, Scan, CheckCircle, AlertCircle, Plus, Minus, ChevronDown } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';
import { useAppStore } from '@/lib/stores/appStore';
import { usePantryStore } from '@/lib/stores/pantryStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CORNER_SIZE = 28;
const VIEWFINDER = 260;

// ─── Debug Log ───────────────────────────────────────────────────────────────

interface DebugEntry {
  barcode: string;
  off: { status: number | string; found: boolean };
  goUpc: { status: number | string; found: boolean } | null;
  claude: { triggered: boolean; found: boolean } | null;
}

// ─── Animated Viewfinder Corners ─────────────────────────────────────────────

function ViewfinderCorners({ scanSuccess }: { scanSuccess: boolean }) {
  const color = scanSuccess ? '#22C55E' : Colors.green;
  const corners = [
    { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
    { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
    { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
    { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  ];
  return (
    <>
      {corners.map((corner, i) => (
        <View
          key={i}
          style={[
            {
              position: 'absolute',
              width: CORNER_SIZE,
              height: CORNER_SIZE,
              borderColor: color,
            },
            corner,
          ]}
        />
      ))}
    </>
  );
}

// ─── Product Result Sheet ─────────────────────────────────────────────────────

interface ProductData {
  barcode: string;
  name: string;
  brand: string;
  caloriesPerServing: number;
  carbsPerServing: number;
  proteinPerServing: number;
  fatPerServing: number;
  fiberPerServing: number;
  sodiumPerServing: number;
  servingSize: string;
  photoUri: string;
  category: string;
}

interface ProductSheetProps {
  product: ProductData;
  visible: boolean;
  onAddToPantry: (product: ProductData, quantity: number, inventoryUnit: InventoryUnit, servingUnit: ServingUnit, servingsPerContainer: number) => void;
  onScanAnother: () => void;
}

// ─── Smart Unit Detection ─────────────────────────────────────────────────────

type InventoryUnit = 'loaf' | 'dozen' | 'package' | 'bag' | 'bottle' | 'can' | 'box' | 'lb' | 'oz' | 'count' | 'other';
type ServingUnit = 'slice' | 'egg' | 'strip' | 'piece' | 'cup' | 'oz' | 'tbsp' | 'g' | 'serving';

interface SmartUnits {
  inventoryUnit: InventoryUnit;
  servingUnit: ServingUnit;
  inventoryLabel: string; // human label for quantity question: "How many loaves?"
}

function detectSmartUnits(productName: string, servingSize: string): SmartUnits {
  const name = productName.toLowerCase();
  const serving = servingSize.toLowerCase();

  if (/bread|loaf|loaves/.test(name)) {
    return { inventoryUnit: 'loaf', servingUnit: 'slice', inventoryLabel: 'How many loaves are you adding?' };
  }
  if (/egg/.test(name)) {
    return { inventoryUnit: 'dozen', servingUnit: 'egg', inventoryLabel: 'How many dozens are you adding?' };
  }
  if (/bacon|turkey bacon|ham|deli/.test(name)) {
    return { inventoryUnit: 'package', servingUnit: 'strip', inventoryLabel: 'How many packages are you adding?' };
  }
  if (/shredded cheese|cheese block|cheese bag|parmesan/.test(name)) {
    return { inventoryUnit: 'bag', servingUnit: 'oz', inventoryLabel: 'How many bags are you adding?' };
  }
  if (/ground beef|ground turkey|chicken|meat/.test(name) && !/nugget|strip/.test(name)) {
    return { inventoryUnit: 'lb', servingUnit: 'oz', inventoryLabel: 'How many lbs are you adding?' };
  }
  if (/canned|can /.test(name) || /\bcan\b/.test(name)) {
    return { inventoryUnit: 'can', servingUnit: 'oz', inventoryLabel: 'How many cans are you adding?' };
  }
  if (/bottle|sauce|oil|dressing|vinegar|syrup/.test(name)) {
    return { inventoryUnit: 'bottle', servingUnit: 'tbsp', inventoryLabel: 'How many bottles are you adding?' };
  }
  if (/box|cereal|pasta|crackers|granola/.test(name)) {
    return { inventoryUnit: 'box', servingUnit: 'cup', inventoryLabel: 'How many boxes are you adding?' };
  }
  if (/bag|chips|nuts|almond|walnut|popcorn/.test(name)) {
    return { inventoryUnit: 'bag', servingUnit: 'oz', inventoryLabel: 'How many bags are you adding?' };
  }

  // Try to detect from serving size
  if (/slice/.test(serving)) return { inventoryUnit: 'loaf', servingUnit: 'slice', inventoryLabel: 'How many loaves are you adding?' };
  if (/egg/.test(serving)) return { inventoryUnit: 'dozen', servingUnit: 'egg', inventoryLabel: 'How many dozens are you adding?' };
  if (/tbsp|tablespoon/.test(serving)) return { inventoryUnit: 'bottle', servingUnit: 'tbsp', inventoryLabel: 'How many bottles are you adding?' };

  return { inventoryUnit: 'count', servingUnit: 'serving', inventoryLabel: 'How many are you adding?' };
}

const INVENTORY_UNITS: InventoryUnit[] = ['loaf', 'dozen', 'package', 'bag', 'bottle', 'can', 'box', 'lb', 'oz', 'count', 'other'];
const SERVING_UNITS: ServingUnit[] = ['slice', 'egg', 'strip', 'piece', 'cup', 'oz', 'tbsp', 'g', 'serving'];

function ProductSheet({ product, visible, onAddToPantry, onScanAnother }: ProductSheetProps) {
  const smartUnits = detectSmartUnits(product?.name ?? '', product?.servingSize ?? '');
  const [quantity, setQuantity] = useState(1);
  const [inventoryUnit, setInventoryUnit] = useState<InventoryUnit>(smartUnits.inventoryUnit);
  const [servingUnit, setServingUnit] = useState<ServingUnit>(smartUnits.servingUnit);
  const [servingsPerContainer, setServingsPerContainer] = useState('1');
  const [showInventoryUnitPicker, setShowInventoryUnitPicker] = useState(false);
  const [showServingUnitPicker, setShowServingUnitPicker] = useState(false);
  const translateY = useSharedValue(SCREEN_HEIGHT);

  // Reset units whenever a new product appears
  useEffect(() => {
    if (product) {
      const detected = detectSmartUnits(product.name, product.servingSize ?? '');
      setInventoryUnit(detected.inventoryUnit);
      setServingUnit(detected.servingUnit);
      setQuantity(1);
      setServingsPerContainer('1');
    }
  }, [product?.name]);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible || !product) return null;

  const detectedUnits = detectSmartUnits(product.name, product.servingSize ?? '');
  const remainingServings = quantity * (Number(servingsPerContainer) || 1);

  return (
    <View
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
      }}
    >
      <Animated.View
        style={[
          {
            backgroundColor: Colors.navy,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            overflow: 'hidden',
            maxHeight: SCREEN_HEIGHT * 0.92,
          },
          sheetStyle,
        ]}
      >
        {/* Handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Product Image */}
          {product.photoUri ? (
            <Image
              source={{ uri: product.photoUri }}
              style={{ width: '100%', height: 160, resizeMode: 'cover' }}
            />
          ) : (
            <View
              style={{
                width: '100%', height: 80,
                backgroundColor: Colors.surface,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Scan size={36} color={Colors.textTertiary} />
            </View>
          )}

          <View style={{ padding: 20 }}>
            {/* Product name + brand */}
            <View style={{ marginBottom: 12 }}>
              {product.brand ? (
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.green, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {product.brand}
                </Text>
              ) : null}
              <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: Colors.textPrimary, lineHeight: 26, marginBottom: 4 }}>
                {product.name || 'Unknown Product'}
              </Text>
              {product.servingSize ? (
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                  Serving size: {product.servingSize}
                </Text>
              ) : null}
            </View>

            {/* Nutrition row */}
            <View style={{ flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 16 }}>
              {[
                { label: 'Cal', value: Math.round(product.caloriesPerServing) },
                { label: 'Carbs', value: `${Math.round(product.carbsPerServing)}g` },
                { label: 'Protein', value: `${Math.round(product.proteinPerServing)}g` },
                { label: 'Fat', value: `${Math.round(product.fatPerServing)}g` },
              ].map((item, i, arr) => (
                <View
                  key={item.label}
                  style={{
                    flex: 1, alignItems: 'center',
                    borderRightWidth: i < arr.length - 1 ? 1 : 0,
                    borderRightColor: Colors.border,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary }}>{item.value}</Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.textSecondary, marginTop: 1 }}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* SECTION 1: Inventory (how you buy it) */}
            <View style={{ backgroundColor: Colors.navyCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 12 }}>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.green, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                Adding to Pantry
              </Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 10 }}>
                {detectedUnits.inventoryLabel}
              </Text>

              {/* Quantity + Inventory Unit row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                {/* Minus */}
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQuantity(Math.max(1, quantity - 1)); }}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Minus size={16} color={Colors.textPrimary} />
                </Pressable>

                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 24, color: Colors.textPrimary, minWidth: 32, textAlign: 'center' }}>
                  {quantity}
                </Text>

                {/* Plus */}
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQuantity(quantity + 1); }}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={16} color={Colors.textPrimary} />
                </Pressable>

                {/* Inventory Unit Picker */}
                <Pressable
                  onPress={() => { setShowInventoryUnitPicker(!showInventoryUnitPicker); setShowServingUnitPicker(false); }}
                  style={{ flex: 1, height: 40, backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: showInventoryUnitPicker ? Colors.green : Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 }}
                >
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 15, color: Colors.textPrimary }}>{inventoryUnit}</Text>
                  <ChevronDown size={14} color={Colors.textSecondary} />
                </Pressable>
              </View>

              {showInventoryUnitPicker ? (
                <View style={{ backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 8, overflow: 'hidden' }}>
                  {INVENTORY_UNITS.map((u) => (
                    <Pressable
                      key={u}
                      onPress={() => { setInventoryUnit(u); setShowInventoryUnitPicker(false); }}
                      style={{ paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: u === inventoryUnit ? 'rgba(46,204,113,0.1)' : 'transparent' }}
                    >
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: u === inventoryUnit ? Colors.green : Colors.textPrimary }}>{u}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {/* Servings per container */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, flex: 1 }}>
                  Servings per {inventoryUnit}:
                </Text>
                <View style={{ backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, width: 70, height: 36, justifyContent: 'center', alignItems: 'center' }}>
                  <TextInput
                    value={servingsPerContainer}
                    onChangeText={setServingsPerContainer}
                    keyboardType="numeric"
                    style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary, textAlign: 'center', width: '100%' }}
                    placeholderTextColor={Colors.textTertiary}
                    placeholder="1"
                  />
                </View>
              </View>
            </View>

            {/* SECTION 2: Serving info */}
            <View style={{ backgroundColor: Colors.navyCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 12 }}>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.amber, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                Serving Unit (for meal logging)
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, flex: 1 }}>
                  Deduct per serving:
                </Text>
                <Pressable
                  onPress={() => { setShowServingUnitPicker(!showServingUnitPicker); setShowInventoryUnitPicker(false); }}
                  style={{ height: 36, backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: showServingUnitPicker ? Colors.amber : Colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6, minWidth: 110 }}
                >
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.textPrimary }}>{servingUnit}</Text>
                  <ChevronDown size={13} color={Colors.textSecondary} />
                </Pressable>
              </View>

              {showServingUnitPicker ? (
                <View style={{ backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 8, overflow: 'hidden' }}>
                  {SERVING_UNITS.map((u) => (
                    <Pressable
                      key={u}
                      onPress={() => { setServingUnit(u); setShowServingUnitPicker(false); }}
                      style={{ paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: u === servingUnit ? 'rgba(243,156,18,0.1)' : 'transparent' }}
                    >
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: u === servingUnit ? Colors.amber : Colors.textPrimary }}>{u}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {/* Inventory preview */}
              <View style={{ backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 10, padding: 12, marginTop: 4, borderWidth: 1, borderColor: 'rgba(46,204,113,0.2)' }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.green, textAlign: 'center' }}>
                  {quantity} {inventoryUnit}{quantity > 1 ? 's' : ''} • {remainingServings} {servingUnit}s total
                </Text>
              </View>
            </View>

            {/* Add button */}
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onAddToPantry(product, quantity, inventoryUnit, servingUnit, Number(servingsPerContainer) || 1);
              }}
              style={{ backgroundColor: Colors.green, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 }}
            >
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 17, color: '#fff' }}>Add to Pantry</Text>
            </Pressable>

            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onScanAnother(); }}
              style={{ backgroundColor: Colors.navyCard, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginBottom: 8 }}
            >
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 17, color: Colors.textPrimary }}>Scan Another</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Not Found Sheet ──────────────────────────────────────────────────────────

function NotFoundSheet({
  barcode,
  visible,
  onTryAgain,
  onAddManually,
  debugLog,
}: {
  barcode: string;
  visible: boolean;
  onTryAgain: () => void;
  onAddManually: () => void;
  debugLog?: string;
}) {
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
      }}
    >
      <Animated.View
        style={[
          {
            backgroundColor: Colors.navy,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
          },
          sheetStyle,
        ]}
      >
        <View style={{ alignItems: 'center', paddingBottom: 8 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, marginBottom: 20 }} />
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: 'rgba(239,68,68,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <AlertCircle size={36} color="#EF4444" />
          </View>
          <Text
            style={{
              fontFamily: 'PlayfairDisplay_700Bold',
              fontSize: 22,
              color: Colors.textPrimary,
              marginBottom: 8,
            }}
          >
            Product Not Found
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 8,
            }}
          >
            We couldn't find this barcode in our databases.
          </Text>
          {barcode ? (
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 12,
                color: Colors.textTertiary,
                marginBottom: 24,
              }}
            >
              Barcode: {barcode}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={onTryAgain}
          style={{
            backgroundColor: Colors.green,
            borderRadius: BorderRadius.lg,
            paddingVertical: 16,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 17, color: '#fff' }}>
            Try Again
          </Text>
        </Pressable>

        <Pressable
          onPress={onAddManually}
          style={{
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.lg,
            paddingVertical: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: Colors.border,
            marginBottom: debugLog ? 12 : 16,
          }}
        >
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 17, color: Colors.textPrimary }}>
            Add Manually
          </Text>
        </Pressable>

        {debugLog ? (
          <View
            style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderRadius: 8,
              padding: 10,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: Colors.textTertiary, marginBottom: 4 }}>
              API Debug Log
            </Text>
            <ScrollView style={{ maxHeight: 90 }} showsVerticalScrollIndicator={false}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.55)', lineHeight: 16 }}>
                {debugLog}
              </Text>
            </ScrollView>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

// ─── Success Toast ────────────────────────────────────────────────────────────

function SuccessToast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(300)}
      style={{
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        backgroundColor: '#16A34A',
        borderRadius: BorderRadius.lg,
        paddingVertical: 14,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 999,
      }}
    >
      <CheckCircle size={22} color="#fff" />
      <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#fff', flex: 1 }}>
        {message}
      </Text>
    </Animated.View>
  );
}

// ─── Main Scanner Screen ──────────────────────────────────────────────────────

export default function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [flashOverlay, setFlashOverlay] = useState<'none' | 'green' | 'red'>('none');
  const [foundProduct, setFoundProduct] = useState<ProductData | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugEntry | null>(null);
  const [scanDebugLog, setScanDebugLog] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const lastScannedBarcode = useRef<string | null>(null);

  const claudeApiKey = useAppStore((s) => s.userProfile.claudeApiKey);
  const addItem = usePantryStore((s) => s.addItem);

  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isRapidMode = mode === 'rapid';

  const pulseValue = useSharedValue(0);
  const viewfinderScale = useSharedValue(1);

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setLoading(false);
      setFoundProduct(null);
      setNotFoundBarcode(null);
      setFlashOverlay('none');
      lastScannedBarcode.current = null;
    }, [])
  );

  useEffect(() => {
    pulseValue.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + pulseValue.value * 0.5,
    transform: [{ scale: 0.98 + pulseValue.value * 0.04 }],
  }));

  const viewfinderStyle = useAnimatedStyle(() => ({
    transform: [{ scale: viewfinderScale.value }],
  }));

  // ─── API Cascade ──────────────────────────────────────────────────────────

  const fetchWithTimeout = (url: string, options: RequestInit = {}, ms = 10000): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
  };

  const lookupOpenFoodFacts = async (barcode: string): Promise<ProductData | null> => {
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
      console.log('[Scanner] API-1 Open Food Facts:', url);
      const res = await fetchWithTimeout(url, {}, 10000);
      const data = await res.json();
      const found = data?.status === 1 && !!data?.product?.product_name;
      console.log('[Scanner] API-1 OFF status:', res.status, '| product found:', found);

      if (!found) return null;

      const p = data.product;
      const n = p.nutriments ?? {};
      return {
        barcode,
        name: p.product_name ?? p.product_name_en ?? '',
        brand: p.brands ?? '',
        caloriesPerServing: Number(n['energy-kcal_serving'] ?? n['energy-kcal_100g'] ?? 0),
        carbsPerServing: Number(n['carbohydrates_serving'] ?? n['carbohydrates_100g'] ?? 0),
        proteinPerServing: Number(n['proteins_serving'] ?? n['proteins_100g'] ?? 0),
        fatPerServing: Number(n['fat_serving'] ?? n['fat_100g'] ?? 0),
        fiberPerServing: Number(n['fiber_serving'] ?? n['fiber_100g'] ?? 0),
        sodiumPerServing: Number(n['sodium_serving'] ?? n['sodium_100g'] ?? 0),
        servingSize: p.serving_size ?? '',
        photoUri: p.image_url ?? p.image_front_url ?? '',
        category: 'Other',
      };
    } catch (err) {
      console.log('[Scanner] API-1 OFF error:', err);
      return null;
    }
  };

  const lookupUPCitemdb = async (barcode: string): Promise<ProductData | null> => {
    try {
      const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;
      console.log('[Scanner] API-2 UPCitemdb:', url);
      const res = await fetchWithTimeout(url, {
        headers: { 'Content-Type': 'application/json' },
      }, 10000);
      const data = await res.json();
      const item = data?.items?.[0];
      const found = !!item?.title;
      console.log('[Scanner] API-2 UPCitemdb status:', res.status, '| found:', found, '| title:', item?.title);

      if (!found) return null;

      // UPCitemdb nutrition is in item.nutrition object (may not always be present)
      const n = item.nutrition ?? {};
      return {
        barcode,
        name: item.title ?? '',
        brand: item.brand ?? '',
        caloriesPerServing: Number(n.calories ?? 0),
        carbsPerServing: Number(n.carbohydrate_g ?? 0),
        proteinPerServing: Number(n.protein_g ?? 0),
        fatPerServing: Number(n.fat_g ?? 0),
        fiberPerServing: Number(n.fiber_g ?? 0),
        sodiumPerServing: Number(n.sodium_mg ? n.sodium_mg / 1000 : 0),
        servingSize: item.size ?? '',
        photoUri: item.images?.[0] ?? '',
        category: 'Other',
      };
    } catch (err) {
      console.log('[Scanner] API-2 UPCitemdb error:', err);
      return null;
    }
  };

  const lookupClaude = async (barcode: string): Promise<ProductData | null> => {
    if (!claudeApiKey) {
      console.log('[Scanner] API-3 Claude skipped (no API key)');
      return null;
    }
    try {
      console.log('[Scanner] API-3 Claude fallback triggered for barcode:', barcode);
      const prompt = `The user scanned barcode number ${barcode}. Based on this UPC code can you identify what product this likely is and provide estimated nutritional information? Many US grocery products have predictable UPC prefixes. Respond ONLY with a JSON object in this exact format (no markdown, no explanation):
{
  "identified": true,
  "name": "Product Name",
  "brand": "Brand Name",
  "caloriesPerServing": 0,
  "carbsPerServing": 0,
  "proteinPerServing": 0,
  "fatPerServing": 0,
  "fiberPerServing": 0,
  "sodiumPerServing": 0,
  "servingSize": "1 serving"
}
If you cannot identify it, respond with: {"identified": false}`;

      const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }],
        }),
      }, 12000);

      const data = await res.json();
      console.log('[Scanner] API-3 Claude response status:', res.status);

      const text = data?.content?.[0]?.text ?? '';
      const parsed = JSON.parse(text) as {
        identified: boolean;
        name?: string;
        brand?: string;
        caloriesPerServing?: number;
        carbsPerServing?: number;
        proteinPerServing?: number;
        fatPerServing?: number;
        fiberPerServing?: number;
        sodiumPerServing?: number;
        servingSize?: string;
      };
      if (!parsed.identified || !parsed.name) {
        console.log('[Scanner] API-3 Claude: product not identified');
        return null;
      }

      console.log('[Scanner] API-3 Claude identified:', parsed.name);
      return {
        barcode,
        name: parsed.name ?? '',
        brand: parsed.brand ?? '',
        caloriesPerServing: parsed.caloriesPerServing ?? 0,
        carbsPerServing: parsed.carbsPerServing ?? 0,
        proteinPerServing: parsed.proteinPerServing ?? 0,
        fatPerServing: parsed.fatPerServing ?? 0,
        fiberPerServing: parsed.fiberPerServing ?? 0,
        sodiumPerServing: parsed.sodiumPerServing ?? 0,
        servingSize: parsed.servingSize ?? '',
        photoUri: '',
        category: 'Other',
      };
    } catch (err) {
      console.log('[Scanner] API-3 Claude error:', err);
      return null;
    }
  };

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    if (lastScannedBarcode.current === data) return;
    lastScannedBarcode.current = data;

    setScanned(true);
    setLoading(true);
    setFoundProduct(null);
    setNotFoundBarcode(null);
    setDebugInfo(null);
    setScanDebugLog('');

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFlashOverlay('green');
    setTimeout(() => setFlashOverlay('none'), 300);

    console.log('[Scanner] ──── Barcode scanned:', data, '────');

    let log = `Barcode: ${data}\n`;

    const debugEntry: DebugEntry = {
      barcode: data,
      off: { status: '...', found: false },
      goUpc: null,
      claude: null,
    };

    try {
      // ── API 1: Open Food Facts ──
      log += 'API-1 Open Food Facts... ';
      const offResult = await lookupOpenFoodFacts(data);
      debugEntry.off = { status: offResult ? 200 : 'not found', found: !!offResult };
      log += offResult ? `FOUND: ${offResult.name}\n` : 'not found\n';
      setScanDebugLog(log);
      setDebugInfo({ ...debugEntry });

      if (offResult) {
        console.log('[Scanner] SUCCESS via Open Food Facts:', offResult.name);
        setFoundProduct(offResult);
        setLoading(false);
        return;
      }

      // ── API 2: UPCitemdb (free, no key) ──
      log += 'API-2 UPCitemdb... ';
      setScanDebugLog(log);
      console.log('[Scanner] OFF failed, trying UPCitemdb...');
      const upcResult = await lookupUPCitemdb(data);
      debugEntry.goUpc = { status: upcResult ? 200 : 'not found', found: !!upcResult };
      log += upcResult ? `FOUND: ${upcResult.name}\n` : 'not found\n';
      setScanDebugLog(log);
      setDebugInfo({ ...debugEntry });

      if (upcResult) {
        console.log('[Scanner] SUCCESS via UPCitemdb:', upcResult.name);
        setFoundProduct(upcResult);
        setLoading(false);
        return;
      }

      // ── API 3: Claude fallback ──
      log += claudeApiKey ? 'API-3 Claude fallback... ' : 'API-3 Claude SKIPPED (no key)\n';
      setScanDebugLog(log);
      console.log('[Scanner] Go-UPC failed, trying Claude fallback...');
      const claudeResult = await lookupClaude(data);
      if (claudeApiKey) {
        debugEntry.claude = { triggered: true, found: !!claudeResult };
        log += claudeResult ? `FOUND: ${claudeResult.name}\n` : 'not identified\n';
        setScanDebugLog(log);
        setDebugInfo({ ...debugEntry });
      }

      if (claudeResult) {
        console.log('[Scanner] SUCCESS via Claude fallback:', claudeResult.name);
        setFoundProduct(claudeResult);
        setLoading(false);
        return;
      }

      // ── All APIs failed ──
      log += 'All APIs failed.';
      setScanDebugLog(log);
      console.log('[Scanner] All 3 APIs failed for barcode:', data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFlashOverlay('red');
      setTimeout(() => setFlashOverlay('none'), 400);
      setNotFoundBarcode(data);
      setLoading(false);
    } catch (err) {
      log += `ERROR: ${String(err)}`;
      setScanDebugLog(log);
      console.log('[Scanner] Unexpected lookup error:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFlashOverlay('red');
      setTimeout(() => setFlashOverlay('none'), 400);
      setNotFoundBarcode(data);
      setLoading(false);
    }
  };

  const handleAddToPantry = (product: ProductData, quantity: number, inventoryUnit: import('@/lib/stores/pantryStore').InventoryUnit, servingUnit: import('@/lib/stores/pantryStore').ServingUnit, servingsPerContainer: number) => {
    addItem({
      name: product.name,
      brand: product.brand,
      category: 'Other',
      quantity,
      unit: 'count',
      inventoryUnit,
      servingUnit,
      servingsPerContainer,
      lowStockThreshold: 1,
      caloriesPerServing: product.caloriesPerServing,
      carbsPerServing: product.carbsPerServing,
      proteinPerServing: product.proteinPerServing,
      fatPerServing: product.fatPerServing,
      servingSize: product.servingSize,
      photoUri: product.photoUri || undefined,
      barcode: product.barcode,
    });

    setSessionCount((c) => c + 1);
    setFoundProduct(null);
    setScanned(false);
    lastScannedBarcode.current = null;

    const toastMsg = `${product.name} added to pantry`;
    setSuccessToast(toastMsg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleScanAnother = () => {
    setFoundProduct(null);
    setScanned(false);
    lastScannedBarcode.current = null;
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  };

  // ─── Permission not yet loaded ──────────────────────────────────────────

  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  // ─── Permission denied ──────────────────────────────────────────────────

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.navy }}>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Scan size={36} color={Colors.textSecondary} />
          </View>
          <Text
            style={{
              fontFamily: 'PlayfairDisplay_700Bold',
              fontSize: 22,
              color: Colors.textPrimary,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            Camera Access Required
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 32,
            }}
          >
            PantryIQ needs camera access to scan barcodes and identify your food items so we can track their nutritional information automatically.
          </Text>
          <Pressable
            onPress={requestPermission}
            style={{
              backgroundColor: Colors.green,
              borderRadius: BorderRadius.lg,
              paddingHorizontal: 28,
              paddingVertical: 16,
              marginBottom: 16,
              minWidth: 200,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#fff' }}>
              Grant Camera Access
            </Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openSettings()}
            style={{ marginBottom: 12 }}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary }}>
              Open Settings
            </Text>
          </Pressable>
          <Pressable onPress={handleClose} style={{ paddingVertical: 12, paddingHorizontal: 24 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textTertiary }}>
              Cancel
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Main Scanner UI ────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} testID="barcode-scanner-screen">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={scanned || foundProduct !== null || notFoundBarcode !== null ? undefined : handleBarcodeScan}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128', 'code39', 'code93', 'itf14'],
        }}
      >
        {/* Dark overlay with clear viewfinder window */}
        <View style={{ flex: 1 }}>
          {/* Top overlay */}
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} />

          {/* Middle row with viewfinder */}
          <View style={{ flexDirection: 'row', height: VIEWFINDER }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} />
            {/* Clear viewfinder area */}
            <Animated.View
              style={[
                {
                  width: VIEWFINDER,
                  height: VIEWFINDER,
                  position: 'relative',
                },
                viewfinderStyle,
              ]}
            >
              <Animated.View style={[{ flex: 1 }, pulseStyle]}>
                <ViewfinderCorners scanSuccess={flashOverlay === 'green'} />
              </Animated.View>
            </Animated.View>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }} />
          </View>

          {/* Bottom overlay with status */}
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }}>
            <View style={{ alignItems: 'center', paddingTop: 28 }}>
              {loading ? (
                <View style={{ alignItems: 'center', gap: 12 }}>
                  <ActivityIndicator size="large" color={Colors.green} />
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: 16,
                      color: '#fff',
                    }}
                  >
                    Looking up product...
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    Checking multiple databases
                  </Text>
                </View>
              ) : (
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.8)',
                    textAlign: 'center',
                    paddingHorizontal: 32,
                  }}
                >
                  {isRapidMode
                    ? 'Point at a barcode — tap Done when finished'
                    : 'Point at a barcode to scan'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Flash overlay (green success / red fail) */}
        {flashOverlay !== 'none' && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor:
                flashOverlay === 'green' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* ─── TOP BAR: Close + counter + done ─── */}
        <SafeAreaView
          style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          edges={['top']}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            {/* CLOSE BUTTON — top right, large tap target */}
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => ({
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: pressed ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.3)',
              })}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              testID="close-scanner-button"
            >
              <X size={24} color="#fff" strokeWidth={2.5} />
            </Pressable>

            {/* Session counter (rapid mode) */}
            {isRapidMode ? (
              <View
                style={{
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  borderRadius: BorderRadius.full,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: Colors.green,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 14,
                    color: Colors.green,
                  }}
                  testID="session-count-badge"
                >
                  {sessionCount} scanned
                </Text>
              </View>
            ) : (
              <View />
            )}

            {/* Done button (rapid mode) */}
            {isRapidMode ? (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.back();
                }}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: BorderRadius.full,
                  backgroundColor: Colors.green,
                }}
                testID="done-scanning-button"
              >
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#fff' }}>
                  Done
                </Text>
              </Pressable>
            ) : (
              <View style={{ width: 52 }} />
            )}
          </View>
        </SafeAreaView>

        {/* ─── BOTTOM DISMISS BAR ─── */}
        <SafeAreaView
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
          edges={['bottom']}
        >
          <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
            {/* Manual entry */}
            <Pressable
              onPress={() =>
                router.replace(
                  isRapidMode
                    ? { pathname: '/add-pantry-item', params: { returnTo: 'scanner' } }
                    : '/add-pantry-item'
                )
              }
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderRadius: BorderRadius.lg,
                paddingVertical: 13,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
              testID="manual-entry-button"
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#fff' }}>
                Add Manually Instead
              </Text>
            </Pressable>

            {/* Tap to cancel bar */}
            <Pressable
              onPress={handleClose}
              style={{
                backgroundColor: 'rgba(255,255,255,0.92)',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 17,
                  color: '#1a1a2e',
                }}
              >
                Tap to Cancel
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>

        {/* ─── DEBUG INDICATOR (dev) ─── */}
        {debugInfo ? (
          <View
            style={{
              position: 'absolute',
              bottom: 180,
              left: 12,
              right: 12,
              backgroundColor: 'rgba(0,0,0,0.8)',
              borderRadius: 8,
              padding: 10,
              gap: 3,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.9)', marginBottom: 2 }}>
              Debug — Barcode: {debugInfo.barcode}
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: debugInfo.off.found ? '#22C55E' : 'rgba(255,255,255,0.5)' }}>
              API-1 Open Food Facts: {String(debugInfo.off.status)} | {debugInfo.off.found ? 'FOUND' : 'not found'}
            </Text>
            {debugInfo.goUpc !== null ? (
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: debugInfo.goUpc.found ? '#22C55E' : 'rgba(255,255,255,0.5)' }}>
                API-2 UPCitemdb: {String(debugInfo.goUpc.status)} | {debugInfo.goUpc.found ? 'FOUND' : 'not found'}
              </Text>
            ) : null}
            {debugInfo.claude !== null ? (
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: debugInfo.claude.found ? '#22C55E' : 'rgba(255,255,255,0.5)' }}>
                API-3 Claude: triggered | {debugInfo.claude.found ? 'FOUND' : 'not identified'}
              </Text>
            ) : null}
          </View>
        ) : null}
      </CameraView>

      {/* ─── PRODUCT FOUND SHEET ─── */}
      {foundProduct ? (
        <ProductSheet
          product={foundProduct}
          visible={!!foundProduct}
          onAddToPantry={handleAddToPantry}
          onScanAnother={handleScanAnother}
        />
      ) : null}

      {/* ─── NOT FOUND SHEET ─── */}
      {notFoundBarcode !== null && !foundProduct ? (
        <NotFoundSheet
          barcode={notFoundBarcode}
          visible
          debugLog={scanDebugLog}
          onTryAgain={() => {
            setNotFoundBarcode(null);
            setScanned(false);
            lastScannedBarcode.current = null;
          }}
          onAddManually={() =>
            router.replace({
              pathname: '/add-pantry-item',
              params: {
                barcode: notFoundBarcode,
                returnTo: isRapidMode ? 'scanner' : undefined,
              },
            })
          }
        />
      ) : null}

      {/* ─── SUCCESS TOAST ─── */}
      {successToast !== null ? <SuccessToast message={successToast} visible /> : null}
    </View>
  );
}
