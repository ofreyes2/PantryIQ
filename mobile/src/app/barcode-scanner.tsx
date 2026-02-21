import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import axios from 'axios';
import { X, Scan } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';

const CORNER_SIZE = 24;
const VIEWFINDER = 260;

function ViewfinderCorners({ pulse }: { pulse: number }) {
  const color = Colors.green;
  const corners = [
    { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
    { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
    { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
    { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
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
              opacity: 0.5 + pulse * 0.5,
            },
            corner,
          ]}
        />
      ))}
    </>
  );
}

export default function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pulseValue = useSharedValue(0);

  useEffect(() => {
    pulseValue.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0, { duration: 800 })),
      -1,
      false
    );
  }, [pulseValue]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + pulseValue.value * 0.6,
  }));

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    setErrorMsg(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const response = await axios.get(
        `https://world.openfoodfacts.org/api/v2/product/${data}.json`
      );

      const product = response.data?.product;
      if (!product) {
        setErrorMsg('Product not found. You can add it manually.');
        setLoading(false);
        setScanned(false);
        return;
      }

      const nutriments = product.nutriments ?? {};
      const params: Record<string, string> = {
        barcode: data,
        name: product.product_name ?? '',
        brand: product.brands ?? '',
        caloriesPerServing: String(
          nutriments['energy-kcal_serving'] ?? nutriments['energy-kcal_100g'] ?? 0
        ),
        carbsPerServing: String(nutriments['carbohydrates_serving'] ?? nutriments['carbohydrates_100g'] ?? 0),
        proteinPerServing: String(nutriments['proteins_serving'] ?? nutriments['proteins_100g'] ?? 0),
        fatPerServing: String(nutriments['fat_serving'] ?? nutriments['fat_100g'] ?? 0),
        servingSize: product.serving_size ?? '',
        photoUri: product.image_url ?? '',
        category: 'Other',
      };

      setLoading(false);
      router.replace({ pathname: '/add-pantry-item', params });
    } catch {
      setLoading(false);
      setScanned(false);
      setErrorMsg('Could not fetch product data. Try again or add manually.');
    }
  };

  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <LinearGradientFallback>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }} testID="barcode-scanner-screen">
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
            PantryIQ needs camera access to scan barcodes and identify food items.
          </Text>
          <Pressable
            onPress={requestPermission}
            style={{
              backgroundColor: Colors.green,
              borderRadius: BorderRadius.lg,
              paddingHorizontal: 28,
              paddingVertical: 14,
              marginBottom: 16,
            }}
            testID="request-permission-button"
          >
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.navy }}>
              Grant Permission
            </Text>
          </Pressable>
          <Pressable onPress={() => Linking.openSettings()}>
            <Text
              style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary }}
            >
              Open Settings
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={{ marginTop: 24 }}
            testID="cancel-button"
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textTertiary }}>
              Cancel
            </Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradientFallback>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} testID="barcode-scanner-screen">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128', 'code39'],
        }}
      >
        {/* Dark overlay with hole */}
        <View style={{ flex: 1 }}>
          {/* Top overlay */}
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />

          {/* Middle row */}
          <View style={{ flexDirection: 'row', height: VIEWFINDER }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
            {/* Viewfinder */}
            <View
              style={{
                width: VIEWFINDER,
                height: VIEWFINDER,
                position: 'relative',
              }}
            >
              <Animated.View style={[{ flex: 1 }, pulseStyle]}>
                <ViewfinderCorners pulse={0} />
              </Animated.View>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          </View>

          {/* Bottom overlay */}
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <View style={{ alignItems: 'center', paddingTop: 32 }}>
              {loading ? (
                <View style={{ alignItems: 'center', gap: 12 }}>
                  <ActivityIndicator size="large" color={Colors.green} />
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 16,
                      color: Colors.textPrimary,
                    }}
                  >
                    Looking up product...
                  </Text>
                </View>
              ) : errorMsg ? (
                <View
                  style={{
                    backgroundColor: Colors.errorMuted,
                    borderRadius: BorderRadius.lg,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    marginHorizontal: 32,
                    borderWidth: 1,
                    borderColor: Colors.error,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 14,
                      color: Colors.error,
                      textAlign: 'center',
                    }}
                  >
                    {errorMsg}
                  </Text>
                </View>
              ) : (
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.7)',
                    textAlign: 'center',
                    paddingHorizontal: 32,
                  }}
                >
                  Point at a barcode to scan
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Cancel button */}
        <SafeAreaView
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
          edges={['top']}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16 }}>
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(0,0,0,0.5)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              testID="close-scanner-button"
            >
              <X size={20} color="#fff" />
            </Pressable>
          </View>
        </SafeAreaView>

        {/* Manual entry fallback */}
        <SafeAreaView
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
          edges={['bottom']}
        >
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Pressable
              onPress={() => router.replace('/add-pantry-item')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: BorderRadius.lg,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
              testID="manual-entry-button"
            >
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 15,
                  color: '#fff',
                }}
              >
                Add Manually Instead
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

// Small fallback wrapper since we can't import LinearGradient in this module conditionally
function LinearGradientFallback({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }}>
      {children}
    </View>
  );
}
