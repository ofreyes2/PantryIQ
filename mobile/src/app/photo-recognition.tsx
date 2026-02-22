import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import {
  Sun,
  Ruler,
  Package,
  Aperture,
  LayoutGrid,
  X,
  Zap,
  ZapOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Edit3,
  PlusCircle,
  Minus,
  Plus,
  Check,
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useAppStore } from '@/lib/stores/appStore';
import { usePantryStore, PantryCategory, PantryUnit } from '@/lib/stores/pantryStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'guidance' | 'camera' | 'analyzing' | 'results' | 'quantity';
type CameraMode = 'single' | 'multiple';
type FlashMode = 'off' | 'on';

interface ClaudeResult {
  identified: boolean;
  confidence: 'high' | 'medium' | 'low';
  productName: string;
  brandName: string | null;
  category: string;
  servingSize: string;
  servingSizeGrams: number | null;
  nutritionPer100g: {
    calories: number;
    totalCarbs: number;
    fiber: number;
    netCarbs: number;
    sugar: number;
    protein: number;
    totalFat: number;
    saturatedFat: number;
    sodium: number;
  };
  nutritionPerServing: {
    calories: number;
    totalCarbs: number;
    fiber: number;
    netCarbs: number;
    sugar: number;
    protein: number;
    totalFat: number;
    saturatedFat: number;
    sodium: number;
  };
  lowCarbFriendly: boolean;
  lowCarbNotes: string;
  alternativeSuggestion: string | null;
  storageInstructions: string;
  estimatedShelfLife: string;
  identificationNotes: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKIP_TIPS_KEY = 'pantryiq_skip_photo_tips';

const STORES = ['Sam\'s Club', 'Mariano\'s', 'Walmart', 'Costco', 'Other'];
const UNITS: PantryUnit[] = ['count', 'oz', 'lbs', 'cups', 'g', 'kg', 'ml', 'L'];

const mapCategory = (raw: string): PantryCategory => {
  const map: Record<string, PantryCategory> = {
    Proteins: 'Proteins',
    Dairy: 'Dairy',
    Vegetables: 'Vegetables',
    Frozen: 'Frozen',
    'Pantry Staples': 'Pantry Staples',
    Snacks: 'Snacks',
    Condiments: 'Condiments',
    Beverages: 'Beverages',
    'Bread and Wraps': 'Bread & Wraps',
    'Bread & Wraps': 'Bread & Wraps',
    Other: 'Other',
  };
  return map[raw] ?? 'Other';
};

const callClaudeAPI = async (base64Image: string, apiKey: string): Promise<ClaudeResult> => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are a professional nutritionist and food identification expert integrated into PantryIQ, a pantry and health tracking app. When given a photo of food, packaging, or ingredients your job is to identify the item and provide complete nutritional information. Always respond in valid JSON format only with no additional text or explanation outside the JSON.`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Please identify this food item from the photo and provide the following information in JSON format: {"identified": true or false, "confidence": "high, medium, or low", "productName": "full product name", "brandName": "brand if visible or null", "category": "one of: Proteins, Dairy, Vegetables, Frozen, Pantry Staples, Snacks, Condiments, Beverages, Bread and Wraps", "servingSize": "description like 1 cup or 3 oz", "servingSizeGrams": number or null, "nutritionPer100g": {"calories": number, "totalCarbs": number, "fiber": number, "netCarbs": number, "sugar": number, "protein": number, "totalFat": number, "saturatedFat": number, "sodium": number}, "nutritionPerServing": {"calories": number, "totalCarbs": number, "fiber": number, "netCarbs": number, "sugar": number, "protein": number, "totalFat": number, "saturatedFat": number, "sodium": number}, "lowCarbFriendly": true or false, "lowCarbNotes": "brief explanation", "alternativeSuggestion": "suggestion or null", "storageInstructions": "refrigerate, freeze, or pantry", "estimatedShelfLife": "description", "identificationNotes": "what you saw"}`,
            },
          ],
        },
      ],
    }),
  });
  const data = await response.json();
  const text = data.content[0].text;
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned) as ClaudeResult;
};

const netCarbColor = (carbs: number): string => {
  if (carbs <= 5) return Colors.green;
  if (carbs <= 15) return Colors.amber;
  return Colors.error;
};

const confidenceColor = (conf: string): string => {
  if (conf === 'high') return Colors.green;
  if (conf === 'medium') return Colors.amber;
  return Colors.error;
};

// ─── Step 1: Guidance ─────────────────────────────────────────────────────────

interface GuidanceStepProps {
  onNext: () => void;
}

function GuidanceStep({ onNext }: GuidanceStepProps) {
  const [skipTips, setSkipTips] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  const toggleSkip = useCallback(async () => {
    const next = !skipTips;
    setSkipTips(next);
    await AsyncStorage.setItem(SKIP_TIPS_KEY, JSON.stringify(next));
    await Haptics.selectionAsync();
  }, [skipTips]);

  const handleTakePhoto = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  }, [onNext]);

  const tips = [
    {
      icon: Sun,
      title: 'Natural or Bright Light',
      desc: 'Natural or bright light works best. Avoid dark shadows. Move near a window or turn on kitchen lights.',
      chips: null,
    },
    {
      icon: Ruler,
      title: 'Ideal Distance',
      desc: 'Hold phone 8–12 inches from food. Too close blurs labels, too far loses detail.',
      chips: null,
    },
    {
      icon: Package,
      title: 'What to Photograph',
      desc: null,
      chips: ['Front Label', 'Barcode + Label', 'Fresh Food'],
    },
    {
      icon: Aperture,
      title: 'Camera Angle',
      desc: 'Hold phone directly above or straight on. Avoid extreme angles.',
      chips: null,
    },
    {
      icon: LayoutGrid,
      title: 'Multiple Items',
      desc: 'Spread items out clearly, or photograph one at a time.',
      chips: null,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }}>
      <LinearGradient
        colors={['#0A1628', '#0F2040', '#162645']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 28 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: Colors.greenMuted,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Sparkles size={32} color={Colors.green} />
            </View>
            <Text
              style={{
                fontFamily: 'PlayfairDisplay_700Bold',
                fontSize: 28,
                color: Colors.textPrimary,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Get the Best Results
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 15,
                color: Colors.textSecondary,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              Follow these tips for accurate food identification
            </Text>
          </View>

          {/* Tip Cards */}
          {tips.map((tip, i) => (
            <View
              key={i}
              style={{
                backgroundColor: Colors.navyCard,
                borderRadius: BorderRadius.xl,
                borderWidth: 1,
                borderColor: Colors.border,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: Colors.greenMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    flexShrink: 0,
                  }}
                >
                  <tip.icon size={20} color={Colors.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 15,
                      color: Colors.textPrimary,
                      marginBottom: tip.desc || tip.chips ? 6 : 0,
                    }}
                  >
                    {tip.title}
                  </Text>
                  {tip.desc ? (
                    <Text
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 13,
                        color: Colors.textSecondary,
                        lineHeight: 20,
                      }}
                    >
                      {tip.desc}
                    </Text>
                  ) : null}
                  {tip.chips ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                      {tip.chips.map((chip) => (
                        <View
                          key={chip}
                          style={{
                            backgroundColor: Colors.surface,
                            borderRadius: BorderRadius.full,
                            paddingHorizontal: 12,
                            paddingVertical: 5,
                            borderWidth: 1,
                            borderColor: Colors.border,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: 'DMSans_500Medium',
                              fontSize: 12,
                              color: Colors.textSecondary,
                            }}
                          >
                            {chip}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Bottom CTA */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
            paddingTop: 16,
            backgroundColor: Colors.navy,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
          }}
        >
          <Pressable
            onPress={handleTakePhoto}
            testID="guidance-take-photo-button"
            style={({ pressed }) => ({
              height: 54,
              borderRadius: BorderRadius.xl,
              backgroundColor: pressed ? Colors.greenDark : Colors.green,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            })}
          >
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 17,
                color: Colors.navy,
              }}
            >
              Got It, Take Photo
            </Text>
          </Pressable>

          <Pressable
            onPress={toggleSkip}
            testID="guidance-skip-toggle"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 8,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 1.5,
                borderColor: skipTips ? Colors.green : Colors.textTertiary,
                backgroundColor: skipTips ? Colors.green : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {skipTips ? <Check size={12} color={Colors.navy} /> : null}
            </View>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 14,
                color: Colors.textSecondary,
              }}
            >
              Skip Tips next time
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Step 2: Camera ───────────────────────────────────────────────────────────

interface CameraStepProps {
  onPhotoTaken: (uri: string) => void;
  onClose: () => void;
}

function CameraStep({ onPhotoTaken, onClose }: CameraStepProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [cameraMode, setCameraMode] = useState<CameraMode>('single');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  // Corner bracket animation
  const cornerAnim = useSharedValue(0);
  useEffect(() => {
    cornerAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const cornerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cornerAnim.value, [0, 1], [0.6, 1]),
  }));

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo) {
        setCapturedUri(photo.uri);
      }
    } catch (e) {
      console.error('Camera capture error:', e);
    }
  }, []);

  const handleUsePhoto = useCallback(async () => {
    if (!capturedUri) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPhotoTaken(capturedUri);
  }, [capturedUri, onPhotoTaken]);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
  }, []);

  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.green} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: Colors.greenMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Aperture size={40} color={Colors.green} />
        </View>
        <Text
          style={{
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 24,
            color: Colors.textPrimary,
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          Camera Access Needed
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            color: Colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 28,
          }}
        >
          PantryIQ needs camera access to identify your food items.
        </Text>
        <Pressable
          onPress={requestPermission}
          testID="camera-permission-button"
          style={{
            height: 52,
            paddingHorizontal: 32,
            borderRadius: BorderRadius.xl,
            backgroundColor: Colors.green,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.navy }}>
            Grant Permission
          </Text>
        </Pressable>
        <Pressable onPress={onClose} style={{ marginTop: 16, padding: 12 }}>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary }}>
            Cancel
          </Text>
        </Pressable>
      </View>
    );
  }

  const frameW = cameraMode === 'single' ? 280 : 320;
  const frameH = cameraMode === 'single' ? 280 : 420;

  // If we have a captured photo, show preview
  if (capturedUri) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Image source={{ uri: capturedUri }} style={{ flex: 1, resizeMode: 'cover' }} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 20,
            paddingTop: 60,
          }}
        >
          <Pressable
            onPress={handleUsePhoto}
            testID="camera-use-photo-button"
            style={({ pressed }) => ({
              height: 54,
              borderRadius: BorderRadius.xl,
              backgroundColor: pressed ? Colors.greenDark : Colors.green,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            })}
          >
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 17, color: Colors.navy }}>
              Use This Photo
            </Text>
          </Pressable>
          <Pressable
            onPress={handleRetake}
            testID="camera-retake-button"
            style={({ pressed }) => ({
              height: 52,
              borderRadius: BorderRadius.xl,
              borderWidth: 1.5,
              borderColor: Colors.textPrimary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: Colors.textPrimary }}>
              Retake
            </Text>
          </Pressable>
        </LinearGradient>

        {/* Close button on preview */}
        <Pressable
          onPress={onClose}
          testID="camera-preview-close"
          style={{
            position: 'absolute',
            top: insets.top + 12,
            left: 16,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(0,0,0,0.6)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} color="#fff" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={'back' as CameraType}
        flash={flashMode}
      >
        {/* Top overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top + 8,
            paddingBottom: 20,
            paddingHorizontal: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Close */}
            <Pressable
              onPress={onClose}
              testID="camera-close-button"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(0,0,0,0.5)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} color="#fff" />
            </Pressable>

            {/* Mode toggle */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: BorderRadius.full,
                padding: 3,
              }}
            >
              {(['single', 'multiple'] as CameraMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setCameraMode(mode)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: BorderRadius.full,
                    backgroundColor: cameraMode === mode ? '#fff' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 13,
                      color: cameraMode === mode ? '#000' : 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {mode === 'single' ? 'Single' : 'Multiple'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Flash */}
            <Pressable
              onPress={() => setFlashMode((f) => (f === 'off' ? 'on' : 'off'))}
              testID="camera-flash-button"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: flashMode === 'on' ? 'rgba(243,156,18,0.3)' : 'rgba(0,0,0,0.5)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {flashMode === 'on' ? (
                <Zap size={20} color={Colors.amber} />
              ) : (
                <ZapOff size={20} color="rgba(255,255,255,0.7)" />
              )}
            </Pressable>
          </View>
        </LinearGradient>

        {/* Viewfinder frame */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 13,
              color: '#fff',
              marginBottom: 14,
              textAlign: 'center',
            }}
          >
            Center your food item here
          </Text>

          <Animated.View style={[{ width: frameW, height: frameH }, cornerStyle]}>
            {/* Corner brackets */}
            {[
              { top: 0, left: 0 },
              { top: 0, right: 0 },
              { bottom: 0, left: 0 },
              { bottom: 0, right: 0 },
            ].map((pos, idx) => (
              <View
                key={idx}
                style={{
                  position: 'absolute',
                  width: 24,
                  height: 24,
                  ...pos,
                  borderColor: '#fff',
                  borderTopWidth: idx < 2 ? 2 : 0,
                  borderBottomWidth: idx >= 2 ? 2 : 0,
                  borderLeftWidth: idx % 2 === 0 ? 2 : 0,
                  borderRightWidth: idx % 2 === 1 ? 2 : 0,
                  borderTopLeftRadius: idx === 0 ? 4 : 0,
                  borderTopRightRadius: idx === 1 ? 4 : 0,
                  borderBottomLeftRadius: idx === 2 ? 4 : 0,
                  borderBottomRightRadius: idx === 3 ? 4 : 0,
                }}
              />
            ))}
          </Animated.View>

          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: 'rgba(255,255,255,0.6)',
              marginTop: 14,
              textAlign: 'center',
            }}
          >
            Include packaging label if available
          </Text>
        </View>

        {/* Bottom capture area */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: insets.bottom + 32,
            paddingTop: 32,
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={handleCapture}
            testID="camera-capture-button"
            style={({ pressed }) => ({
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: 'rgba(255,255,255,0.25)',
              borderWidth: 3,
              borderColor: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.93 : 1 }],
            })}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#fff',
              }}
            />
          </Pressable>
        </LinearGradient>
      </CameraView>
    </View>
  );
}

// ─── Step 3a: Analyzing ───────────────────────────────────────────────────────

function AnalyzingStep() {
  const pulse1 = useSharedValue(0);
  const pulse2 = useSharedValue(0);
  const pulse3 = useSharedValue(0);
  const sparkle = useSharedValue(0);

  useEffect(() => {
    pulse1.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false);
    setTimeout(() => {
      pulse2.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false);
    }, 500);
    setTimeout(() => {
      pulse3.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false);
    }, 1000);
    sparkle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const pulse1Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse1.value, [0, 1], [1, 2.4]) }],
    opacity: interpolate(pulse1.value, [0, 0.5, 1], [0.5, 0.25, 0]),
  }));

  const pulse2Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse2.value, [0, 1], [1, 2.4]) }],
    opacity: interpolate(pulse2.value, [0, 0.5, 1], [0.5, 0.25, 0]),
  }));

  const pulse3Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse3.value, [0, 1], [1, 2.4]) }],
    opacity: interpolate(pulse3.value, [0, 0.5, 1], [0.5, 0.25, 0]),
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkle.value,
    transform: [{ scale: interpolate(sparkle.value, [0.5, 1], [0.9, 1.1]) }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient
        colors={['#0A1628', '#0F2040']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Pulsing rings */}
      <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: Colors.green,
            },
            pulse3Style,
          ]}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: Colors.green,
            },
            pulse2Style,
          ]}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: Colors.green,
            },
            pulse1Style,
          ]}
        />

        {/* Center icon */}
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: Colors.green,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.View style={sparkleStyle}>
            <Sparkles size={30} color={Colors.navy} />
          </Animated.View>
        </View>
      </View>

      <Text
        style={{
          fontFamily: 'PlayfairDisplay_700Bold',
          fontSize: 26,
          color: Colors.textPrimary,
          marginBottom: 10,
          textAlign: 'center',
        }}
      >
        Analyzing your photo...
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 15,
          color: Colors.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
        }}
      >
        Claude AI is identifying this item
      </Text>
    </View>
  );
}

// ─── Step 3b: Results ─────────────────────────────────────────────────────────

interface ResultsStepProps {
  photoUri: string;
  result: ClaudeResult;
  onAddToPantry: () => void;
  onTryAgain: () => void;
}

function ResultsStep({ photoUri, result, onAddToPantry, onTryAgain }: ResultsStepProps) {
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  const notesAnim = useSharedValue(0);

  const toggleNotes = useCallback(() => {
    const next = !showNotes;
    setShowNotes(next);
    notesAnim.value = withTiming(next ? 1 : 0, { duration: 250 });
    Haptics.selectionAsync();
  }, [showNotes]);

  const notesStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(notesAnim.value, [0, 1], [0, 200]),
    opacity: notesAnim.value,
    overflow: 'hidden',
  }));

  const confColor = confidenceColor(result.confidence);
  const netCarbs = result.nutritionPerServing?.netCarbs ?? 0;
  const carbColor = netCarbColor(netCarbs);

  const NutritionCell = ({
    label,
    value,
    unit,
    color,
    large,
  }: {
    label: string;
    value: number;
    unit: string;
    color?: string;
    large?: boolean;
  }) => (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
      }}
    >
      <Text
        style={{
          fontFamily: 'DMSans_700Bold',
          fontSize: large ? 26 : 20,
          color: color ?? Colors.textPrimary,
          lineHeight: large ? 32 : 26,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 11,
          color: Colors.textTertiary,
          marginTop: 2,
        }}
      >
        {unit}
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 11,
          color: Colors.textSecondary,
          marginTop: 1,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 180 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top photo + product header */}
        <View style={{ alignItems: 'center', paddingTop: insets.top + 16, paddingBottom: 24 }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              overflow: 'hidden',
              borderWidth: 3,
              borderColor: Colors.green,
              marginBottom: 16,
            }}
          >
            <Image source={{ uri: photoUri }} style={{ width: 84, height: 84 }} />
          </View>
          <Text
            style={{
              fontFamily: 'PlayfairDisplay_700Bold',
              fontSize: 22,
              color: Colors.textPrimary,
              textAlign: 'center',
              marginBottom: result.brandName ? 4 : 10,
              paddingHorizontal: 16,
            }}
          >
            {result.productName}
          </Text>
          {result.brandName ? (
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 14,
                color: Colors.textSecondary,
                marginBottom: 12,
              }}
            >
              {result.brandName}
            </Text>
          ) : null}

          {/* Badges */}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: BorderRadius.full,
                backgroundColor: `${confColor}22`,
                borderWidth: 1,
                borderColor: `${confColor}55`,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 12,
                  color: confColor,
                  textTransform: 'capitalize',
                }}
              >
                {result.confidence} Confidence
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: BorderRadius.full,
                backgroundColor: Colors.surface,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 12,
                  color: Colors.textSecondary,
                }}
              >
                {result.category}
              </Text>
            </View>
          </View>
        </View>

        {/* Low confidence warning */}
        {result.confidence === 'low' ? (
          <View
            style={{
              backgroundColor: 'rgba(243,156,18,0.12)',
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: `${Colors.amber}55`,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <AlertTriangle size={18} color={Colors.amber} style={{ marginTop: 1, flexShrink: 0 }} />
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 13,
                color: Colors.amber,
                lineHeight: 20,
                flex: 1,
              }}
            >
              Not totally sure about this one. Please review and edit before saving.
            </Text>
          </View>
        ) : null}

        {/* Nutrition Card */}
        <View
          style={{
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.xl,
            borderWidth: 1,
            borderColor: Colors.border,
            marginBottom: 12,
            overflow: 'hidden',
          }}
        >
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textSecondary }}>
              Per Serving{result.servingSize ? ` · ${result.servingSize}` : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', width: '100%', borderBottomWidth: 1, borderBottomColor: Colors.border }}>
              <NutritionCell
                label="Calories"
                value={result.nutritionPerServing?.calories ?? 0}
                unit="kcal"
                large
              />
              <View style={{ width: 1, backgroundColor: Colors.border }} />
              <NutritionCell
                label="Net Carbs"
                value={netCarbs}
                unit="g"
                color={carbColor}
                large
              />
            </View>
            <View style={{ flexDirection: 'row', width: '100%' }}>
              {[
                { label: 'Protein', value: result.nutritionPerServing?.protein ?? 0, unit: 'g' },
                { label: 'Total Fat', value: result.nutritionPerServing?.totalFat ?? 0, unit: 'g' },
                { label: 'Fiber', value: result.nutritionPerServing?.fiber ?? 0, unit: 'g' },
                { label: 'Sodium', value: result.nutritionPerServing?.sodium ?? 0, unit: 'mg' },
              ].map((item, i, arr) => (
                <React.Fragment key={item.label}>
                  <NutritionCell label={item.label} value={item.value} unit={item.unit} />
                  {i < arr.length - 1 ? (
                    <View style={{ width: 1, backgroundColor: Colors.border }} />
                  ) : null}
                </React.Fragment>
              ))}
            </View>
          </View>
        </View>

        {/* Low Carb Card */}
        <View
          style={{
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.xl,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            {result.lowCarbFriendly ? (
              <CheckCircle size={20} color={Colors.green} style={{ flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={20} color={Colors.error} style={{ flexShrink: 0 }} />
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 15,
                  color: result.lowCarbFriendly ? Colors.green : Colors.error,
                  marginBottom: 4,
                }}
              >
                {result.lowCarbFriendly ? 'Low Carb Friendly' : 'Not Low Carb Friendly'}
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 13,
                  color: Colors.textSecondary,
                  lineHeight: 20,
                }}
              >
                {result.lowCarbNotes}
              </Text>
              {!result.lowCarbFriendly && result.alternativeSuggestion ? (
                <View
                  style={{
                    marginTop: 10,
                    backgroundColor: Colors.surface,
                    borderRadius: BorderRadius.md,
                    padding: 10,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 12,
                      color: Colors.textTertiary,
                      marginBottom: 3,
                    }}
                  >
                    ALTERNATIVE SUGGESTION
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: Colors.textSecondary,
                    }}
                  >
                    {result.alternativeSuggestion}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Storage info */}
        <View
          style={{
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.xl,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: 16,
            marginBottom: 12,
            flexDirection: 'row',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.textTertiary, marginBottom: 3 }}>
              STORAGE
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary, textTransform: 'capitalize' }}>
              {result.storageInstructions}
            </Text>
          </View>
          <View
            style={{ width: 1, backgroundColor: Colors.border }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.textTertiary, marginBottom: 3 }}>
              SHELF LIFE
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary }}>
              {result.estimatedShelfLife}
            </Text>
          </View>
        </View>

        {/* Identification Notes (collapsible) */}
        <Pressable
          onPress={toggleNotes}
          testID="results-notes-toggle"
          style={{
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.xl,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textPrimary }}>
              Identification Notes
            </Text>
            {showNotes ? (
              <ChevronUp size={18} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={18} color={Colors.textSecondary} />
            )}
          </View>
          <Animated.View style={notesStyle}>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 13,
                color: Colors.textSecondary,
                lineHeight: 20,
                marginTop: 10,
              }}
            >
              {result.identificationNotes}
            </Text>
          </Animated.View>
        </Pressable>
      </ScrollView>

      {/* Sticky bottom actions */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: Colors.navyCard,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: insets.bottom + 14,
        }}
      >
        <Pressable
          onPress={onAddToPantry}
          testID="results-add-to-pantry"
          style={({ pressed }) => ({
            height: 52,
            borderRadius: BorderRadius.xl,
            backgroundColor: pressed ? Colors.greenDark : Colors.green,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          })}
        >
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.navy }}>
            Add to Pantry
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={onTryAgain}
            testID="results-try-again"
            style={({ pressed }) => ({
              flex: 1,
              height: 44,
              borderRadius: BorderRadius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary }}>
              Try Again
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/add-pantry-item' as never)}
            testID="results-add-manually"
            style={({ pressed }) => ({
              flex: 1,
              height: 44,
              borderRadius: BorderRadius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary }}>
              Add Manually
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Step 4: Quantity & Save ──────────────────────────────────────────────────

interface QuantityStepProps {
  photoUri: string;
  result: ClaudeResult;
  onSaved: () => void;
  onBack: () => void;
}

function QuantityStep({ photoUri, result, onSaved, onBack }: QuantityStepProps) {
  const addItem = usePantryStore((s) => s.addItem);
  const insets = useSafeAreaInsets();

  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<PantryUnit>('count');
  const [threshold, setThreshold] = useState<number>(2);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [store, setStore] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  const successScale = useSharedValue(0);
  const successOpacity = useSharedValue(0);

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleSave = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const category = mapCategory(result.category);
    const nutrition = result.nutritionPerServing;

    addItem({
      name: result.productName,
      brand: result.brandName ?? undefined,
      category,
      quantity,
      unit,
      inventoryUnit: 'count',
      servingUnit: 'serving',
      servingsPerContainer: 1,
      lowStockThreshold: threshold,
      caloriesPerServing: nutrition?.calories ?? 0,
      carbsPerServing: nutrition?.netCarbs ?? 0,
      proteinPerServing: nutrition?.protein ?? 0,
      fatPerServing: nutrition?.totalFat ?? 0,
      servingSize: result.servingSize ?? '1 serving',
      photoUri,
      expiryDate: expiryDate || undefined,
    });

    // Animate success
    setShowSuccess(true);
    successOpacity.value = withTiming(1, { duration: 200 });
    successScale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 14, stiffness: 200 })
    );

    setTimeout(() => {
      router.back();
    }, 2000);
  }, [quantity, unit, threshold, expiryDate, result, photoUri, addItem]);

  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successOpacity.value,
  }));

  const SliderTrack = () => {
    const filledWidth = `${((threshold - 1) / 9) * 100}%` as `${number}%`;
    return (
      <View style={{ marginTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 }}>
          <View style={{ flex: 1, height: 6, backgroundColor: Colors.surface, borderRadius: 3 }}>
            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: Colors.amber,
                width: filledWidth,
              }}
            />
          </View>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.amber, minWidth: 24, textAlign: 'center' }}>
            {threshold}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
            <Pressable
              key={val}
              onPress={() => {
                setThreshold(val);
                Haptics.selectionAsync();
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: threshold === val ? Colors.amber : Colors.surface,
                borderWidth: 1,
                borderColor: threshold === val ? Colors.amber : Colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 11,
                  color: threshold === val ? Colors.navy : Colors.textSecondary,
                }}
              >
                {val}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          <Pressable onPress={onBack} style={{ padding: 4, marginRight: 12 }} testID="quantity-back-button">
            <X size={22} color={Colors.textSecondary} />
          </Pressable>
          <Image
            source={{ uri: photoUri }}
            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 15,
                color: Colors.textPrimary,
              }}
              numberOfLines={1}
            >
              {result.productName}
            </Text>
            {result.brandName ? (
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
                {result.brandName}
              </Text>
            ) : null}
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Quantity */}
          <View
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.xl,
              borderWidth: 1,
              borderColor: Colors.border,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 14 }}>
              QUANTITY
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              <Pressable
                onPress={() => {
                  setQuantity((q) => Math.max(1, q - 1));
                  Haptics.selectionAsync();
                }}
                testID="quantity-decrease"
                style={({ pressed }) => ({
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: pressed ? Colors.surface : Colors.navyCard,
                  borderWidth: 1.5,
                  borderColor: Colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Minus size={22} color={Colors.textPrimary} />
              </Pressable>
              <TextInput
                value={String(quantity)}
                onChangeText={(t) => {
                  const n = parseInt(t, 10);
                  if (!isNaN(n) && n > 0) setQuantity(n);
                }}
                keyboardType="number-pad"
                testID="quantity-input"
                style={{
                  fontFamily: 'PlayfairDisplay_700Bold',
                  fontSize: 36,
                  color: Colors.textPrimary,
                  minWidth: 72,
                  textAlign: 'center',
                }}
              />
              <Pressable
                onPress={() => {
                  setQuantity((q) => q + 1);
                  Haptics.selectionAsync();
                }}
                testID="quantity-increase"
                style={({ pressed }) => ({
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: pressed ? Colors.surface : Colors.navyCard,
                  borderWidth: 1.5,
                  borderColor: Colors.green,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Plus size={22} color={Colors.green} />
              </Pressable>
            </View>
          </View>

          {/* Unit picker */}
          <View
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.xl,
              borderWidth: 1,
              borderColor: Colors.border,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 12 }}>
              UNIT
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {UNITS.map((u) => (
                  <Pressable
                    key={u}
                    onPress={() => {
                      setUnit(u);
                      Haptics.selectionAsync();
                    }}
                    testID={`unit-${u}`}
                    style={{
                      paddingHorizontal: 18,
                      height: 40,
                      borderRadius: BorderRadius.full,
                      backgroundColor: unit === u ? Colors.green : Colors.surface,
                      borderWidth: 1,
                      borderColor: unit === u ? Colors.green : Colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 14,
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

          {/* Low stock threshold */}
          <View
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.xl,
              borderWidth: 1,
              borderColor: Colors.border,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 4 }}>
              LOW STOCK ALERT THRESHOLD
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginBottom: 4 }}>
              Get notified when quantity drops to this level
            </Text>
            <SliderTrack />
          </View>

          {/* Expiry Date */}
          <View
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.xl,
              borderWidth: 1,
              borderColor: Colors.border,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 10 }}>
              EXPIRY DATE (OPTIONAL)
            </Text>
            <TextInput
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textTertiary}
              testID="expiry-date-input"
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 15,
                color: Colors.textPrimary,
                backgroundColor: Colors.surface,
                borderRadius: BorderRadius.md,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            />
          </View>

          {/* Store picker */}
          <View
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.xl,
              borderWidth: 1,
              borderColor: Colors.border,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 12 }}>
              PURCHASED AT (OPTIONAL)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {STORES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => {
                      setStore(store === s ? '' : s);
                      Haptics.selectionAsync();
                    }}
                    testID={`store-${s}`}
                    style={{
                      paddingHorizontal: 14,
                      height: 38,
                      borderRadius: BorderRadius.full,
                      backgroundColor: store === s ? Colors.surface : 'transparent',
                      borderWidth: 1,
                      borderColor: store === s ? Colors.green : Colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 13,
                        color: store === s ? Colors.green : Colors.textSecondary,
                      }}
                    >
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Notes */}
          <View
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.xl,
              borderWidth: 1,
              borderColor: Colors.border,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textTertiary, marginBottom: 10 }}>
              NOTES (OPTIONAL)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any notes about this item..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              testID="notes-input"
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 15,
                color: Colors.textPrimary,
                backgroundColor: Colors.surface,
                borderRadius: BorderRadius.md,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: Colors.border,
                minHeight: 72,
                textAlignVertical: 'top',
              }}
            />
          </View>

          {/* Date Added */}
          <View
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.xl,
              borderWidth: 1,
              borderColor: Colors.border,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary }}>
              Date Added
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textTertiary }}>
              {today}
            </Text>
          </View>
        </ScrollView>

        {/* Save button */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: insets.bottom + 14,
            backgroundColor: Colors.navyCard,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
          }}
        >
          <Pressable
            onPress={handleSave}
            testID="save-to-pantry-button"
            style={({ pressed }) => ({
              height: 54,
              borderRadius: BorderRadius.xl,
              backgroundColor: pressed ? Colors.greenDark : Colors.green,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 17, color: Colors.navy }}>
              Save to Pantry
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Success overlay */}
      {showSuccess ? (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(10,22,40,0.96)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          testID="success-overlay"
        >
          <Animated.View
            style={[
              {
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: Colors.greenMuted,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              },
              successStyle,
            ]}
          >
            <CheckCircle size={52} color={Colors.green} />
          </Animated.View>
          <Text
            style={{
              fontFamily: 'PlayfairDisplay_700Bold',
              fontSize: 22,
              color: Colors.textPrimary,
              textAlign: 'center',
              marginBottom: 8,
              paddingHorizontal: 32,
            }}
          >
            {result.productName}
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 16,
              color: Colors.textSecondary,
              textAlign: 'center',
            }}
          >
            Added to Your Pantry
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Error Modal ──────────────────────────────────────────────────────────────

interface ErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  onSettings?: () => void;
  onAddManually?: () => void;
  onTryAgain?: () => void;
  onClose: () => void;
  type: 'api-key' | 'network' | 'unidentified';
}

function ErrorModal({ visible, title, message, onSettings, onAddManually, onTryAgain, onClose, type }: ErrorModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="error-modal"
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            width: '100%',
            backgroundColor: Colors.navyCard,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: 40,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
          }}
        >
          {/* Handle bar */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: Colors.border,
              alignSelf: 'center',
              marginBottom: 24,
            }}
          />

          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: Colors.errorMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              alignSelf: 'center',
            }}
          >
            <AlertTriangle size={28} color={Colors.error} />
          </View>

          <Text
            style={{
              fontFamily: 'PlayfairDisplay_700Bold',
              fontSize: 22,
              color: Colors.textPrimary,
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 15,
              color: Colors.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 24,
            }}
          >
            {message}
          </Text>

          {type === 'api-key' ? (
            <>
              <Pressable
                onPress={onSettings}
                testID="error-settings-button"
                style={({ pressed }) => ({
                  height: 52,
                  borderRadius: BorderRadius.xl,
                  backgroundColor: pressed ? Colors.greenDark : Colors.green,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                })}
              >
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.navy }}>
                  Take me to Settings
                </Text>
              </Pressable>
              <Pressable
                onPress={onAddManually}
                testID="error-add-manually-button"
                style={({ pressed }) => ({
                  height: 52,
                  borderRadius: BorderRadius.xl,
                  borderWidth: 1.5,
                  borderColor: Colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: Colors.textPrimary }}>
                  Add Manually
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              {onTryAgain ? (
                <Pressable
                  onPress={onTryAgain}
                  testID="error-try-again-button"
                  style={({ pressed }) => ({
                    height: 52,
                    borderRadius: BorderRadius.xl,
                    backgroundColor: pressed ? Colors.greenDark : Colors.green,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  })}
                >
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.navy }}>
                    Try Again
                  </Text>
                </Pressable>
              ) : null}
              {onAddManually ? (
                <Pressable
                  onPress={onAddManually}
                  testID="error-add-manually-bottom"
                  style={({ pressed }) => ({
                    height: 52,
                    borderRadius: BorderRadius.xl,
                    borderWidth: 1.5,
                    borderColor: Colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: Colors.textPrimary }}>
                    Add Manually
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Root Screen ──────────────────────────────────────────────────────────────

export default function PhotoRecognitionScreen() {
  const claudeApiKey = useAppStore((s) => s.userProfile.claudeApiKey);
  const [step, setStep] = useState<Step>('guidance');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [claudeResult, setClaudeResult] = useState<ClaudeResult | null>(null);
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    type: 'api-key' | 'network' | 'unidentified';
    title: string;
    message: string;
  }>({ visible: false, type: 'api-key', title: '', message: '' });

  // Check skip tips on mount
  useEffect(() => {
    AsyncStorage.getItem(SKIP_TIPS_KEY).then((val) => {
      if (val === 'true' || val === JSON.stringify(true)) {
        setStep('camera');
      }
    });
  }, []);

  const handlePhotoTaken = useCallback(
    async (uri: string) => {
      setPhotoUri(uri);

      if (!claudeApiKey || claudeApiKey.trim() === '') {
        setErrorModal({
          visible: true,
          type: 'api-key',
          title: 'API Key Required',
          message:
            'To use photo identification, please add your Claude API key in Settings.',
        });
        return;
      }

      setStep('analyzing');

      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }],
          {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );
        const base64 = manipResult.base64;
        if (!base64) throw new Error('No base64 data');

        const result = await callClaudeAPI(base64, claudeApiKey);

        if (!result.identified) {
          setStep('camera');
          setErrorModal({
            visible: true,
            type: 'unidentified',
            title: "Couldn't Identify Item",
            message:
              "We couldn't identify this item from the photo. Try a clearer shot or add it manually.",
          });
          return;
        }

        setClaudeResult(result);
        setStep('results');
      } catch (e) {
        console.error('Photo analysis error:', e);
        setStep('camera');
        setErrorModal({
          visible: true,
          type: 'network',
          title: 'Connection Error',
          message:
            'Photo identification requires an internet connection. Please check your connection and try again.',
        });
      }
    },
    [claudeApiKey]
  );

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  const handleTryAgain = useCallback(() => {
    setPhotoUri(null);
    setClaudeResult(null);
    setStep('camera');
  }, []);

  const handleAddToPantry = useCallback(() => {
    setStep('quantity');
  }, []);

  const handleSaved = useCallback(() => {
    // success overlay auto-dismisses inside QuantityStep
  }, []);

  const closeErrorModal = useCallback(() => {
    setErrorModal((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }} testID="photo-recognition-screen">
      {step === 'guidance' && (
        <GuidanceStep onNext={() => setStep('camera')} />
      )}

      {step === 'camera' && (
        <CameraStep onPhotoTaken={handlePhotoTaken} onClose={handleClose} />
      )}

      {step === 'analyzing' && <AnalyzingStep />}

      {step === 'results' && !!photoUri && !!claudeResult && (
        <ResultsStep
          photoUri={photoUri}
          result={claudeResult}
          onAddToPantry={handleAddToPantry}
          onTryAgain={handleTryAgain}
        />
      )}

      {step === 'quantity' && !!photoUri && !!claudeResult && (
        <QuantityStep
          photoUri={photoUri}
          result={claudeResult}
          onSaved={handleSaved}
          onBack={() => setStep('results')}
        />
      )}

      <ErrorModal
        visible={errorModal.visible}
        type={errorModal.type}
        title={errorModal.title}
        message={errorModal.message}
        onClose={closeErrorModal}
        onSettings={() => {
          closeErrorModal();
          router.push('/(tabs)/settings' as never);
        }}
        onAddManually={() => {
          closeErrorModal();
          router.push('/add-pantry-item' as never);
        }}
        onTryAgain={() => {
          closeErrorModal();
          handleTryAgain();
        }}
      />
    </View>
  );
}
