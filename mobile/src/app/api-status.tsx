import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { X, CheckCircle, XCircle, Circle, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/lib/stores/appStore';
import { Colors, BorderRadius } from '@/constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskKey(key: string): string {
  if (!key || key.length < 4) return 'NOT SET';
  return '••••••••' + key.slice(-4);
}

function KeyStatusRow({
  label,
  value,
  always,
}: {
  label: string;
  value: string;
  always?: boolean;
}) {
  const isSet = always || (!!value && value.length > 3);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
      }}
    >
      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textPrimary }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {isSet ? (
          <CheckCircle size={16} color="#22C55E" />
        ) : (
          <XCircle size={16} color="#EF4444" />
        )}
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: isSet ? '#22C55E' : '#EF4444',
          }}
        >
          {always ? 'READY' : isSet ? maskKey(value) : 'NOT SET'}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ApiStatusScreen() {
  const claudeApiKey = useAppStore((s) => s.userProfile.claudeApiKey);
  const goUpcApiKey = useAppStore((s) => s.userProfile.goUpcApiKey);
  const usdaApiKey = useAppStore((s) => s.userProfile.usdaApiKey);

  const [testBarcode, setTestBarcode] = useState('073416000469');
  const [testLog, setTestLog] = useState('');
  const [testing, setTesting] = useState(false);
  const [testTarget, setTestTarget] = useState<'off' | 'goupc' | null>(null);

  const fetchWithTimeout = (url: string, options: RequestInit = {}, ms = 10000): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
  };

  const testOpenFoodFacts = async () => {
    if (!testBarcode.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTesting(true);
    setTestTarget('off');
    setTestLog('Testing Open Food Facts...\n');
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${testBarcode.trim()}.json`;
      setTestLog((l) => l + `URL: ${url}\n`);
      const res = await fetchWithTimeout(url, {}, 10000);
      setTestLog((l) => l + `HTTP Status: ${res.status}\n`);
      const data = await res.json();
      setTestLog((l) => l + `OFF status field: ${data?.status}\n`);
      setTestLog((l) => l + `product_name: ${data?.product?.product_name ?? 'N/A'}\n`);
      setTestLog((l) => l + `brands: ${data?.product?.brands ?? 'N/A'}\n`);
      setTestLog((l) => l + `image_url: ${data?.product?.image_url ? 'present' : 'N/A'}\n`);
      if (data?.product?.nutriments) {
        const n = data.product.nutriments;
        setTestLog((l) => l + `calories/100g: ${n['energy-kcal_100g'] ?? 'N/A'}\n`);
        setTestLog((l) => l + `carbs/100g: ${n['carbohydrates_100g'] ?? 'N/A'}\n`);
      }
      setTestLog((l) => l + '\nRaw (first 400 chars):\n' + JSON.stringify(data).substring(0, 400));
    } catch (err) {
      setTestLog((l) => l + `ERROR: ${String(err)}\n`);
    } finally {
      setTesting(false);
      setTestTarget(null);
    }
  };

  const testGoUpc = async () => {
    if (!testBarcode.trim()) return;
    if (!goUpcApiKey) {
      setTestLog('Go-UPC key is NOT SET in Settings. Add your key first.\n');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTesting(true);
    setTestTarget('goupc');
    setTestLog('Testing Go-UPC...\n');
    try {
      const url = `https://go-upc.com/api/v1/code/${testBarcode.trim()}`;
      setTestLog((l) => l + `URL: ${url}\n`);
      setTestLog((l) => l + `Key (last 4): ...${goUpcApiKey.slice(-4)}\n`);
      const res = await fetchWithTimeout(url, {
        headers: {
          Authorization: `Bearer ${goUpcApiKey}`,
          'Content-Type': 'application/json',
        },
      }, 10000);
      setTestLog((l) => l + `HTTP Status: ${res.status}\n`);
      const data = await res.json();
      setTestLog((l) => l + `product.name: ${data?.product?.name ?? 'N/A'}\n`);
      setTestLog((l) => l + `product.brand: ${data?.product?.brand ?? 'N/A'}\n`);
      setTestLog((l) => l + `product.imageUrl: ${data?.product?.imageUrl ? 'present' : 'N/A'}\n`);
      setTestLog((l) => l + '\nRaw (first 400 chars):\n' + JSON.stringify(data).substring(0, 400));
    } catch (err) {
      setTestLog((l) => l + `ERROR: ${String(err)}\n`);
    } finally {
      setTesting(false);
      setTestTarget(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: Colors.textPrimary }}>
            API Status
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color={Colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Key Status Section */}
          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 13,
                color: Colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              API Key Status
            </Text>
            <KeyStatusRow label="Open Food Facts" value="" always />
            <KeyStatusRow label="Go-UPC Key" value={goUpcApiKey} />
            <KeyStatusRow label="Claude API Key" value={claudeApiKey} />
            <View style={{ borderBottomWidth: 0 }}>
              <KeyStatusRow label="USDA Key (food name search)" value={usdaApiKey} />
            </View>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 11,
                color: Colors.textTertiary,
                marginTop: 10,
                lineHeight: 16,
              }}
            >
              If Go-UPC or Claude show NOT SET, go back to Settings → API Keys, enter and save your keys.
            </Text>
          </View>

          {/* Barcode Test Tool */}
          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 13,
                color: Colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 12,
              }}
            >
              Manual Barcode Test
            </Text>

            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 6 }}>
              Test Barcode Number
            </Text>
            <TextInput
              value={testBarcode}
              onChangeText={setTestBarcode}
              keyboardType="number-pad"
              style={{
                backgroundColor: Colors.navyCard,
                borderRadius: BorderRadius.md,
                borderWidth: 1,
                borderColor: Colors.border,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontFamily: 'DMSans_400Regular',
                fontSize: 16,
                color: Colors.textPrimary,
                marginBottom: 12,
                letterSpacing: 1,
              }}
              placeholder="Enter barcode number"
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="done"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <Pressable
                onPress={testOpenFoodFacts}
                disabled={testing}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: testing && testTarget === 'off' ? Colors.greenMuted : Colors.green,
                  borderRadius: BorderRadius.md,
                  paddingVertical: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: testing && testTarget !== 'off' ? 0.5 : pressed ? 0.85 : 1,
                })}
              >
                {testing && testTarget === 'off' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : null}
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: '#fff' }}>
                  Test OFF
                </Text>
              </Pressable>

              <Pressable
                onPress={testGoUpc}
                disabled={testing}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: Colors.navyCard,
                  borderRadius: BorderRadius.md,
                  paddingVertical: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: goUpcApiKey ? Colors.green : Colors.border,
                  opacity: testing && testTarget !== 'goupc' ? 0.5 : pressed ? 0.85 : 1,
                })}
              >
                {testing && testTarget === 'goupc' ? (
                  <ActivityIndicator size="small" color={Colors.green} />
                ) : null}
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: goUpcApiKey ? Colors.green : Colors.textTertiary }}>
                  Test Go-UPC
                </Text>
              </Pressable>
            </View>

            {/* Response Log */}
            {testLog ? (
              <View
                style={{
                  backgroundColor: Colors.navyCard,
                  borderRadius: BorderRadius.md,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  padding: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Response Log
                  </Text>
                  <Pressable onPress={() => setTestLog('')}>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.textTertiary }}>Clear</Text>
                  </Pressable>
                </View>
                <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#A3E635', lineHeight: 18 }}>
                    {testLog}
                  </Text>
                </ScrollView>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: Colors.navyCard,
                  borderRadius: BorderRadius.md,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textTertiary }}>
                  Tap a test button to see the raw API response here
                </Text>
              </View>
            )}
          </View>

          {/* Help text */}
          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              padding: 16,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textSecondary, marginBottom: 8 }}>
              Cascade Order
            </Text>
            {[
              { n: '1', name: 'Open Food Facts', note: 'Free, no key needed. Best for global products.' },
              { n: '2', name: 'Go-UPC', note: 'Best for US grocery. Requires free key from go-upc.com' },
              { n: '3', name: 'Claude AI', note: 'Identifies unknown barcodes. Requires Claude API key.' },
            ].map((item) => (
              <View key={item.n} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: Colors.greenMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.green }}>{item.n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: Colors.textPrimary }}>{item.name}</Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary, marginTop: 2 }}>{item.note}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
