import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronRight,
  Camera,
  Zap,
  ZapOff,
  RotateCcw,
  Check,
  X,
  CircleAlert,
  Key,
  RefreshCw,
} from 'lucide-react-native';
import { useKitchenMapStore, generateId, MappedArea, KitchenZone } from '@/lib/stores/kitchenMapStore';
import { useAppStore } from '@/lib/stores/appStore';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Step = 'prep' | 'camera' | 'analyzing' | 'error';

// ─── Prep Tips ────────────────────────────────────────────────────────────────

const PREP_TIPS: Record<string, string[]> = {
  refrigerator: [
    'Open the door completely before photographing',
    'Remove anything blocking the view of shelves',
    'Make sure the interior light is on',
    'Stand back about 3 feet for full view',
    'Hold phone at appliance height, not from above',
  ],
  freezer: [
    'Open the freezer door or drawer completely',
    'Remove any ice trays blocking shelves',
    'Make sure interior is well-lit',
    'Capture from directly in front',
    'Include all shelves in a single shot if possible',
  ],
  cupboard: [
    'Open all cabinet doors wide',
    'Step back to capture the full cabinet',
    'Move items around if needed to show zones',
    'Capture from eye level for best angle',
    'Include the full height from top to bottom shelf',
  ],
  pantry: [
    'Turn on pantry light if available',
    'Stand in the doorway for the widest angle',
    'Capture all shelf levels in multiple photos',
    'Include floor area if it has stored items',
    'Move large items aside to show shelving',
  ],
};

// ─── Mock Zone Generator ──────────────────────────────────────────────────────

function generateMockZones(areaType: string, areaName: string): KitchenZone[] {
  if (areaType === 'refrigerator') {
    return [
      {
        zoneId: 'zone_1', zoneName: 'Upper Shelf', zoneType: 'shelf',
        position: 'Top area of main fridge compartment',
        approximateSize: 'large', bestStoredItems: ['Leftovers', 'Drinks', 'Ready-to-eat'],
        temperatureZone: 'cold', specialNotes: null, estimatedCapacity: '~15 items',
        overlayX: 5, overlayY: 5, overlayWidth: 90, overlayHeight: 18,
      },
      {
        zoneId: 'zone_2', zoneName: 'Middle Shelf', zoneType: 'shelf',
        position: 'Middle section',
        approximateSize: 'large', bestStoredItems: ['Eggs', 'Dairy', 'Cheese'],
        temperatureZone: 'cold', specialNotes: null, estimatedCapacity: '~12 items',
        overlayX: 5, overlayY: 25, overlayWidth: 90, overlayHeight: 18,
      },
      {
        zoneId: 'zone_3', zoneName: 'Lower Shelf', zoneType: 'shelf',
        position: 'Bottom of main compartment',
        approximateSize: 'large', bestStoredItems: ['Raw meats', 'Poultry', 'Seafood'],
        temperatureZone: 'coldest', specialNotes: 'Coldest shelf — ideal for raw proteins', estimatedCapacity: '~10 items',
        overlayX: 5, overlayY: 45, overlayWidth: 90, overlayHeight: 18,
      },
      {
        zoneId: 'zone_4', zoneName: 'Crisper Left', zoneType: 'drawer',
        position: 'Lower left drawer',
        approximateSize: 'medium', bestStoredItems: ['Vegetables', 'Herbs', 'Leafy greens'],
        temperatureZone: 'moderate', specialNotes: 'High humidity setting for veggies', estimatedCapacity: '~20 items',
        overlayX: 5, overlayY: 65, overlayWidth: 43, overlayHeight: 18,
      },
      {
        zoneId: 'zone_5', zoneName: 'Crisper Right', zoneType: 'drawer',
        position: 'Lower right drawer',
        approximateSize: 'medium', bestStoredItems: ['Fruits', 'Berries'],
        temperatureZone: 'moderate', specialNotes: 'Low humidity for fruits', estimatedCapacity: '~15 items',
        overlayX: 52, overlayY: 65, overlayWidth: 43, overlayHeight: 18,
      },
      {
        zoneId: 'zone_6', zoneName: 'Door Shelves', zoneType: 'door shelf',
        position: 'Interior door',
        approximateSize: 'medium', bestStoredItems: ['Condiments', 'Juices', 'Butter'],
        temperatureZone: 'moderate', specialNotes: null, estimatedCapacity: '~20 items',
        overlayX: 5, overlayY: 85, overlayWidth: 90, overlayHeight: 10,
      },
    ];
  }
  if (areaType === 'freezer') {
    return [
      {
        zoneId: 'zone_1', zoneName: 'Top Shelf', zoneType: 'shelf',
        position: 'Top of freezer compartment',
        approximateSize: 'medium', bestStoredItems: ['Ice cream', 'Frozen desserts'],
        temperatureZone: 'coldest', specialNotes: null, estimatedCapacity: '~8 items',
        overlayX: 5, overlayY: 5, overlayWidth: 90, overlayHeight: 22,
      },
      {
        zoneId: 'zone_2', zoneName: 'Middle Shelf', zoneType: 'shelf',
        position: 'Middle section',
        approximateSize: 'large', bestStoredItems: ['Frozen meals', 'Leftovers'],
        temperatureZone: 'coldest', specialNotes: null, estimatedCapacity: '~12 items',
        overlayX: 5, overlayY: 30, overlayWidth: 90, overlayHeight: 22,
      },
      {
        zoneId: 'zone_3', zoneName: 'Bottom Shelf', zoneType: 'shelf',
        position: 'Bottom area',
        approximateSize: 'large', bestStoredItems: ['Bulk meats', 'Large items'],
        temperatureZone: 'coldest', specialNotes: 'Best for long-term bulk storage', estimatedCapacity: '~10 items',
        overlayX: 5, overlayY: 55, overlayWidth: 90, overlayHeight: 25,
      },
      {
        zoneId: 'zone_4', zoneName: 'Door', zoneType: 'door shelf',
        position: 'Freezer door',
        approximateSize: 'small', bestStoredItems: ['Frozen vegetables', 'Bread', 'Ice packs'],
        temperatureZone: 'cold', specialNotes: null, estimatedCapacity: '~8 items',
        overlayX: 5, overlayY: 83, overlayWidth: 90, overlayHeight: 12,
      },
    ];
  }
  if (areaType === 'pantry') {
    return [
      {
        zoneId: 'zone_1', zoneName: 'Top Shelf', zoneType: 'shelf',
        position: 'Highest shelf, hard to reach',
        approximateSize: 'medium', bestStoredItems: ['Rarely used items', 'Backstock', 'Extra supplies'],
        temperatureZone: 'ambient', specialNotes: 'Store items rarely needed here', estimatedCapacity: '~20 items',
        overlayX: 5, overlayY: 5, overlayWidth: 90, overlayHeight: 16,
      },
      {
        zoneId: 'zone_2', zoneName: 'Eye Level Shelf', zoneType: 'shelf',
        position: 'Eye level — most accessible',
        approximateSize: 'large', bestStoredItems: ['Everyday snacks', 'Frequently used items'],
        temperatureZone: 'ambient', specialNotes: 'Prime real estate — daily items here', estimatedCapacity: '~25 items',
        overlayX: 5, overlayY: 23, overlayWidth: 90, overlayHeight: 18,
      },
      {
        zoneId: 'zone_3', zoneName: 'Mid Shelf', zoneType: 'shelf',
        position: 'Middle height',
        approximateSize: 'large', bestStoredItems: ['Canned goods', 'Grains', 'Cereals'],
        temperatureZone: 'ambient', specialNotes: null, estimatedCapacity: '~30 items',
        overlayX: 5, overlayY: 43, overlayWidth: 90, overlayHeight: 18,
      },
      {
        zoneId: 'zone_4', zoneName: 'Lower Shelf', zoneType: 'shelf',
        position: 'Below waist height',
        approximateSize: 'large', bestStoredItems: ['Heavier items', 'Oils', 'Vinegars', 'Pots'],
        temperatureZone: 'ambient', specialNotes: null, estimatedCapacity: '~20 items',
        overlayX: 5, overlayY: 63, overlayWidth: 90, overlayHeight: 16,
      },
      {
        zoneId: 'zone_5', zoneName: 'Floor', zoneType: 'bin',
        position: 'Pantry floor',
        approximateSize: 'large', bestStoredItems: ['Large containers', 'Bulk items', 'Beverages', 'Pet food'],
        temperatureZone: 'ambient', specialNotes: null, estimatedCapacity: '~10 items',
        overlayX: 5, overlayY: 81, overlayWidth: 90, overlayHeight: 14,
      },
    ];
  }
  // cupboard
  return [
    {
      zoneId: 'zone_1', zoneName: 'Upper Cabinet', zoneType: 'shelf',
      position: 'Top shelf of cabinet',
      approximateSize: 'medium', bestStoredItems: ['Dishes', 'Glasses', 'Seldom-used items'],
      temperatureZone: 'ambient', specialNotes: null, estimatedCapacity: '~15 items',
      overlayX: 5, overlayY: 5, overlayWidth: 90, overlayHeight: 28,
    },
    {
      zoneId: 'zone_2', zoneName: 'Middle Cabinet', zoneType: 'shelf',
      position: 'Mid-height shelf',
      approximateSize: 'large', bestStoredItems: ['Everyday dishes', 'Food storage containers'],
      temperatureZone: 'ambient', specialNotes: null, estimatedCapacity: '~20 items',
      overlayX: 5, overlayY: 36, overlayWidth: 90, overlayHeight: 28,
    },
    {
      zoneId: 'zone_3', zoneName: 'Lower Cabinet', zoneType: 'shelf',
      position: 'Bottom shelf / lower cabinet',
      approximateSize: 'large', bestStoredItems: ['Pots', 'Pans', 'Heavy appliances'],
      temperatureZone: 'ambient', specialNotes: 'Best for heavy items', estimatedCapacity: '~8 items',
      overlayX: 5, overlayY: 67, overlayWidth: 90, overlayHeight: 28,
    },
  ];
}

// ─── Prep Guide Step ──────────────────────────────────────────────────────────

function PrepGuide({
  areaName,
  areaType,
  onReady,
}: {
  areaName: string;
  areaType: string;
  onReady: () => void;
}) {
  const tips = PREP_TIPS[areaType] ?? PREP_TIPS.refrigerator;

  return (
    <LinearGradient colors={['#0A1628', '#0B1C35']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.prepHeader}>
          <Pressable onPress={() => router.back()} style={styles.backButton} testID="prep-back-button">
            <ChevronRight size={22} color={Colors.textPrimary} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.prepTitle} numberOfLines={1}>Prepare to Photograph</Text>
            <Text style={styles.prepAreaName} numberOfLines={1}>{areaName}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Appliance illustration */}
          <View style={styles.applianceIllustration}>
            {areaType === 'refrigerator' || areaType === 'freezer' ? (
              <View style={styles.fridgeDrawing}>
                <View style={styles.fridgeDrawingTop}>
                  <View style={styles.fridgeShelf} />
                  <View style={styles.fridgeShelf} />
                  <View style={styles.fridgeShelf} />
                </View>
                <View style={styles.fridgeDrawingBottom}>
                  <View style={styles.fridgeDrawer} />
                </View>
                <View style={styles.fridgeDrawingHandle} />
                {/* Door outline hint */}
                <View style={styles.fridgeDoorHint}>
                  <Text style={styles.fridgeDoorHintText}>Keep door open</Text>
                </View>
              </View>
            ) : (
              <View style={styles.cabinetDrawing}>
                <View style={styles.cabinetShelf} />
                <View style={styles.cabinetDivider} />
                <View style={styles.cabinetShelf} />
                <View style={styles.cabinetDivider} />
                <View style={styles.cabinetShelf} />
              </View>
            )}
          </View>

          <Text style={styles.tipsHeader}>Before You Photograph</Text>

          {tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}

          <View style={styles.infoBox}>
            <Camera size={16} color={Colors.green} />
            <Text style={styles.infoBoxText}>
              You can take up to 4 photos to capture different angles. Claude AI will combine them for the best zone map.
            </Text>
          </View>
        </ScrollView>

        {/* Ready button */}
        <View style={styles.prepFooter}>
          <Pressable style={styles.readyButton} onPress={onReady} testID="ready-button">
            <Camera size={20} color={Colors.navy} />
            <Text style={styles.readyButtonText}>Ready — Open Camera</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Camera Step ─────────────────────────────────────────────────────────────

function CameraStep({
  areaName,
  onDone,
}: {
  areaName: string;
  onDone: (uris: string[]) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState<string[]>([]);
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const cameraRef = useRef<CameraView>(null);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || photos.length >= 4) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setPhotos((prev) => [...prev, photo.uri]);
      }
    } catch {
      // ignore
    }
  }, [photos.length]);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      <LinearGradient colors={['#0A1628', '#0B1C35']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }} edges={['top', 'bottom']}>
          <Camera size={48} color={Colors.green} />
          <Text style={[styles.prepTitle, { textAlign: 'center', marginTop: 16, marginBottom: 8 }]}>
            Camera Access Needed
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
            PantryIQ needs camera access to photograph your storage areas.
          </Text>
          <Pressable style={styles.readyButton} onPress={requestPermission}>
            <Text style={styles.readyButtonText}>Grant Camera Permission</Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Camera */}
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        ref={cameraRef}
        flash={flash}
      >
        {/* Area prompt */}
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.cameraTopBar}>
            <Pressable onPress={() => router.back()} style={styles.camBackButton} testID="camera-back-button">
              <X size={22} color="#fff" />
            </Pressable>
            <View style={styles.cameraPromptWrap}>
              <Text style={styles.cameraPrompt} numberOfLines={2}>
                Capture the full interior of your {areaName}
              </Text>
            </View>
            <Pressable onPress={() => setFlash(flash === 'off' ? 'on' : 'off')} style={styles.camFlashButton} testID="flash-button">
              {flash === 'on' ? (
                <Zap size={20} color={Colors.amber} fill={Colors.amber} />
              ) : (
                <ZapOff size={20} color="rgba(255,255,255,0.6)" />
              )}
            </Pressable>
          </View>

          {/* Rule of thirds grid */}
          <View style={styles.rulesGrid} pointerEvents="none">
            <View style={styles.rulesGridRow}>
              <View style={styles.rulesGridCell} />
              <View style={[styles.rulesGridCell, styles.rulesGridCellBorderV]} />
              <View style={styles.rulesGridCell} />
            </View>
            <View style={[styles.rulesGridRow, styles.rulesGridRowBorderH]}>
              <View style={styles.rulesGridCell} />
              <View style={[styles.rulesGridCell, styles.rulesGridCellBorderV]} />
              <View style={styles.rulesGridCell} />
            </View>
            <View style={styles.rulesGridRow}>
              <View style={styles.rulesGridCell} />
              <View style={[styles.rulesGridCell, styles.rulesGridCellBorderV]} />
              <View style={styles.rulesGridCell} />
            </View>
          </View>

          {/* Corner brackets */}
          <View style={styles.cornerBrackets} pointerEvents="none">
            <View style={[styles.bracket, styles.bracketTL]} />
            <View style={[styles.bracket, styles.bracketTR]} />
            <View style={[styles.bracket, styles.bracketBL]} />
            <View style={[styles.bracket, styles.bracketBR]} />
          </View>

          {/* Bottom controls */}
          <View style={styles.cameraBottomBar}>
            {/* Instruction */}
            <Text style={styles.cameraInstruction}>
              Open door completely · Stand back 3 feet · Hold steady
            </Text>

            {/* Photo thumbnail strip */}
            {photos.length > 0 ? (
              <View style={styles.thumbnailStrip}>
                {photos.map((uri, i) => (
                  <Pressable
                    key={i}
                    onPress={() => removePhoto(i)}
                    style={styles.thumbnailWrap}
                    testID={`thumbnail-${i}`}
                  >
                    <Image source={{ uri }} style={styles.thumbnail} />
                    <View style={styles.thumbnailX}>
                      <X size={10} color="#fff" />
                    </View>
                  </Pressable>
                ))}
                {photos.length < 4 ? (
                  <View style={styles.thumbnailAdd}>
                    <Text style={styles.thumbnailAddText}>+{4 - photos.length}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Photo counter */}
            {photos.length > 0 ? (
              <Text style={styles.photoCounter}>Photo {photos.length} of 4 max</Text>
            ) : null}

            {/* Shutter row */}
            <View style={styles.shutterRow}>
              {photos.length > 0 ? (
                <Pressable
                  style={styles.addAngleButton}
                  onPress={takePhoto}
                  disabled={photos.length >= 4}
                  testID="add-angle-button"
                >
                  <Text style={styles.addAngleText}>
                    {photos.length < 4 ? 'Add Angle' : 'Max Photos'}
                  </Text>
                </Pressable>
              ) : (
                <View style={{ width: 80 }} />
              )}

              <Pressable
                style={[styles.shutterButton, photos.length >= 4 && styles.shutterButtonDisabled]}
                onPress={takePhoto}
                disabled={photos.length >= 4}
                testID="shutter-button"
              >
                <View style={styles.shutterInner} />
              </Pressable>

              {photos.length > 0 ? (
                <Pressable
                  style={styles.doneButton}
                  onPress={() => onDone(photos)}
                  testID="done-button"
                >
                  <Check size={18} color="#fff" strokeWidth={3} />
                  <Text style={styles.doneButtonText}>Done</Text>
                </Pressable>
              ) : (
                <View style={{ width: 80 }} />
              )}
            </View>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

// ─── Analyzing Step ───────────────────────────────────────────────────────────

function AnalyzingStep({ areaName }: { areaName: string }) {
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <LinearGradient colors={['#0A1628', '#0B1C35', '#0A1628']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }} edges={['top', 'bottom']}>
        <Animated.View style={[styles.analysingLogo, pulseStyle]}>
          <Text style={styles.analysingLogoText}>P</Text>
        </Animated.View>

        <Text style={styles.analysingTitle}>Analyzing your {areaName}...</Text>
        <Text style={styles.analysingSubtitle}>
          Claude is mapping shelves, drawers, and storage zones
        </Text>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          {[0, 1, 2].map((i) => (
            <AnalysisDot key={i} delay={i * 300} />
          ))}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function AnalysisDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0.3, { duration: 500 })
        ),
        -1
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.progressDot, style]} />
  );
}

// ─── Error Step ───────────────────────────────────────────────────────────────

function ErrorStep({
  errorType,
  onRetry,
  onUseMock,
}: {
  errorType: 'no-key' | 'network' | 'generic';
  onRetry: () => void;
  onUseMock: () => void;
}) {
  return (
    <LinearGradient colors={['#0A1628', '#0B1C35']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }} edges={['top', 'bottom']}>
        <View style={styles.errorIcon}>
          {errorType === 'no-key' ? (
            <Key size={36} color={Colors.amber} />
          ) : (
            <CircleAlert size={36} color={Colors.error} />
          )}
        </View>

        <Text style={styles.errorTitle}>
          {errorType === 'no-key' ? 'Claude API Key Required' : 'Analysis Failed'}
        </Text>
        <Text style={styles.errorDesc}>
          {errorType === 'no-key'
            ? 'Add your Claude API key in Settings to use AI-powered zone mapping. Or continue with a standard zone template.'
            : 'Could not analyze the photos. Check your connection and try again, or use a standard zone template.'}
        </Text>

        <View style={{ width: '100%', gap: 12, marginTop: 24 }}>
          {errorType !== 'no-key' ? (
            <Pressable style={styles.readyButton} onPress={onRetry} testID="retry-button">
              <RefreshCw size={18} color={Colors.navy} />
              <Text style={styles.readyButtonText}>Retry Analysis</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.useMockButton} onPress={onUseMock} testID="use-template-button">
            <Text style={styles.useMockButtonText}>Use Standard Template</Text>
          </Pressable>

          {errorType === 'no-key' ? (
            <Pressable
              style={styles.settingsLinkButton}
              onPress={() => router.push('/(tabs)/settings' as never)}
              testID="go-to-settings-button"
            >
              <Key size={16} color={Colors.green} />
              <Text style={styles.settingsLinkText}>Add API Key in Settings</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function KitchenPhotoSessionScreen() {
  const params = useLocalSearchParams<{
    areaName: string;
    locationId: string;
    areaType: string;
    areaIndex: string;
    retake?: string;
  }>();

  const { areaName, locationId, areaType, areaIndex } = params;

  const [step, setStep] = useState<Step>('prep');
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [errorType, setErrorType] = useState<'no-key' | 'network' | 'generic'>('generic');

  const claudeApiKey = useAppStore((s) => s.userProfile.claudeApiKey);
  const saveMappedArea = useKitchenMapStore((s) => s.saveMappedArea);
  const mappedAreas = useKitchenMapStore((s) => s.mappedAreas);

  const analyzeWithClaude = useCallback(async (photos: string[]) => {
    setStep('analyzing');

    const apiKey = claudeApiKey;

    if (!apiKey || apiKey.trim() === '') {
      setErrorType('no-key');
      setStep('error');
      return;
    }

    try {
      // Convert photos to base64
      const base64Photos: string[] = [];
      for (const uri of photos) {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        base64Photos.push(base64);
      }

      const content: Array<Record<string, unknown>> = [
        ...base64Photos.map((b64) => ({
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
        })),
        {
          type: 'text',
          text: `These photos show my ${areaName}. Please analyze them and provide a complete zone map in this JSON format:
{
  "areaName": "descriptive name",
  "areaType": "refrigerator|freezer|cupboard|pantry",
  "totalZones": number,
  "zones": [
    {
      "zoneId": "zone_1",
      "zoneName": "Upper Shelf",
      "zoneType": "shelf|drawer|door shelf|bin|rack|compartment",
      "position": "description of where",
      "approximateSize": "small|medium|large",
      "bestStoredItems": ["eggs", "dairy"],
      "temperatureZone": "coldest|cold|moderate|ambient",
      "specialNotes": "any notes or null",
      "estimatedCapacity": "~15 items",
      "overlayX": 10,
      "overlayY": 5,
      "overlayWidth": 80,
      "overlayHeight": 20
    }
  ],
  "applianceObservations": "brand/size observations",
  "organizationSuggestions": ["tip 1", "tip 2"],
  "currentItemsVisible": ["milk", "eggs"],
  "overallStorageTips": "personalized tip"
}

Return ONLY valid JSON, no markdown, no explanation.`,
        },
      ];

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 2000,
          messages: [{ role: 'user', content }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }

      const data = await response.json() as { content: Array<{ type: string; text: string }> };
      const textContent = data.content?.find((c) => c.type === 'text');
      if (!textContent?.text) throw new Error('No text response');

      let parsed: {
        areaName?: string;
        areaType?: string;
        zones?: KitchenZone[];
        applianceObservations?: string;
        organizationSuggestions?: string[];
        currentItemsVisible?: string[];
        overallStorageTips?: string;
      };

      try {
        parsed = JSON.parse(textContent.text);
      } catch {
        // Try to extract JSON from response
        const match = textContent.text.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error('Invalid JSON response');
        }
      }

      // Find existing mapped area to check for ID
      const existing = mappedAreas.find(
        (ma) => ma.locationId === locationId && ma.areaName === areaName
      );

      const mappedArea: MappedArea = {
        id: existing?.id ?? generateId(),
        locationId: locationId ?? '',
        areaName: parsed.areaName ?? areaName ?? '',
        areaType: (parsed.areaType as MappedArea['areaType']) ?? (areaType as MappedArea['areaType']) ?? 'refrigerator',
        photoUris: photos,
        zones: parsed.zones ?? [],
        applianceObservations: parsed.applianceObservations ?? '',
        organizationSuggestions: parsed.organizationSuggestions ?? [],
        currentItemsVisible: parsed.currentItemsVisible ?? [],
        overallStorageTips: parsed.overallStorageTips ?? '',
        mappedAt: new Date().toISOString(),
        isComplete: true,
      };

      saveMappedArea(mappedArea);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.replace({
        pathname: '/zone-map',
        params: { areaId: mappedArea.id },
      } as never);

    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'unknown';
      if (errMessage.includes('network') || errMessage.includes('fetch')) {
        setErrorType('network');
      } else {
        setErrorType('generic');
      }
      setStep('error');
    }
  }, [claudeApiKey, areaName, areaType, locationId, saveMappedArea, mappedAreas]);

  const handleUseMock = useCallback(() => {
    const mockZones = generateMockZones(areaType ?? 'refrigerator', areaName ?? '');
    const existing = mappedAreas.find(
      (ma) => ma.locationId === locationId && ma.areaName === areaName
    );

    const mappedArea: MappedArea = {
      id: existing?.id ?? generateId(),
      locationId: locationId ?? '',
      areaName: areaName ?? '',
      areaType: (areaType as MappedArea['areaType']) ?? 'refrigerator',
      photoUris: capturedPhotos,
      zones: mockZones,
      applianceObservations: `Standard ${areaType ?? 'storage'} layout`,
      organizationSuggestions: [
        'Group similar items together for easy access',
        'Keep frequently used items at eye level',
        'Label zones to help all family members',
      ],
      currentItemsVisible: [],
      overallStorageTips: 'Follow the FIFO method — first in, first out. Rotate items so older ones are used first.',
      mappedAt: new Date().toISOString(),
      isComplete: true,
    };

    saveMappedArea(mappedArea);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    router.replace({
      pathname: '/zone-map',
      params: { areaId: mappedArea.id },
    } as never);
  }, [areaType, areaName, locationId, capturedPhotos, saveMappedArea, mappedAreas]);

  const handlePhotoDone = useCallback((uris: string[]) => {
    setCapturedPhotos(uris);
    analyzeWithClaude(uris);
  }, [analyzeWithClaude]);

  if (step === 'prep') {
    return (
      <PrepGuide
        areaName={areaName ?? ''}
        areaType={areaType ?? 'refrigerator'}
        onReady={() => setStep('camera')}
      />
    );
  }

  if (step === 'camera') {
    return (
      <CameraStep
        areaName={areaName ?? ''}
        onDone={handlePhotoDone}
      />
    );
  }

  if (step === 'analyzing') {
    return <AnalyzingStep areaName={areaName ?? ''} />;
  }

  if (step === 'error') {
    return (
      <ErrorStep
        errorType={errorType}
        onRetry={() => {
          if (capturedPhotos.length > 0) {
            analyzeWithClaude(capturedPhotos);
          } else {
            setStep('camera');
          }
        }}
        onUseMock={handleUseMock}
      />
    );
  }

  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Prep
  prepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  prepTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  prepAreaName: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  applianceIllustration: {
    alignItems: 'center',
    marginBottom: 24,
  },
  fridgeDrawing: {
    width: 130,
    height: 200,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.green + '60',
    overflow: 'hidden',
    position: 'relative',
  },
  fridgeDrawingTop: {
    flex: 2,
    padding: 10,
    gap: 10,
    justifyContent: 'space-around',
  },
  fridgeShelf: {
    height: 6,
    backgroundColor: Colors.green + '40',
    borderRadius: 3,
    width: '85%',
  },
  fridgeDrawingBottom: {
    height: 50,
    borderTopWidth: 2,
    borderTopColor: Colors.green + '60',
    padding: 8,
  },
  fridgeDrawer: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fridgeDrawingHandle: {
    position: 'absolute',
    right: 8,
    top: 30,
    width: 4,
    height: 60,
    backgroundColor: Colors.green + '80',
    borderRadius: 2,
  },
  fridgeDoorHint: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: Colors.greenMuted,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fridgeDoorHintText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: Colors.green,
  },
  cabinetDrawing: {
    width: 140,
    height: 160,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.amber + '60',
    padding: 12,
    gap: 6,
  },
  cabinetShelf: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
  },
  cabinetDivider: {
    height: 2,
    backgroundColor: Colors.amber + '40',
  },
  tipsHeader: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  tipNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.greenMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.green + '40',
    flexShrink: 0,
  },
  tipNumberText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: Colors.green,
  },
  tipText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 22,
    paddingTop: 3,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.greenMuted,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.green + '30',
    marginTop: 8,
  },
  infoBoxText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  prepFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: Colors.navy,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  readyButton: {
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Shadows.elevated,
  },
  readyButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.navy,
  },

  // Camera
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },
  camBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPromptWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.md,
    padding: 8,
  },
  cameraPrompt: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
  },
  camFlashButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rulesGrid: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    bottom: 200,
    flexDirection: 'column',
  },
  rulesGridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  rulesGridRowBorderH: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  rulesGridCell: {
    flex: 1,
  },
  rulesGridCellBorderV: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.15)',
    borderRightColor: 'rgba(255,255,255,0.15)',
  },
  cornerBrackets: {
    position: 'absolute',
    top: 90,
    left: 20,
    right: 20,
    bottom: 210,
  },
  bracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.green,
    borderWidth: 2.5,
  },
  bracketTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  bracketTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  bracketBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
  },
  bracketBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 4,
  },
  cameraBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  cameraInstruction: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 12,
  },
  thumbnailStrip: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    justifyContent: 'center',
  },
  thumbnailWrap: {
    position: 'relative',
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.green,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailX: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailAdd: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailAddText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  photoCounter: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 8,
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButtonDisabled: {
    opacity: 0.4,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  addAngleButton: {
    width: 80,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAngleText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  doneButton: {
    width: 80,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  doneButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: '#fff',
  },

  // Analyzing
  analysingLogo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.greenMuted,
    borderWidth: 2,
    borderColor: Colors.green + '60',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  analysingLogoText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 44,
    color: Colors.green,
  },
  analysingTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  analysingSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 10,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.green,
  },

  // Error
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.errorMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  errorTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  useMockButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useMockButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  settingsLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  settingsLinkText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.green,
    textDecorationLine: 'underline',
  },
});
