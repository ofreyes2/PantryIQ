import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Camera,
  ChevronRight,
  Check,
  Settings,
  X,
  MapPin,
  Cpu,
  Star,
  Sparkles,
  RotateCcw,
  Plus,
  FileText,
  ArrowRight,
} from 'lucide-react-native';
import { useKitchenMapStore, MappedArea } from '@/lib/stores/kitchenMapStore';
import { useLocationStore } from '@/lib/stores/locationStore';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Area Definition ──────────────────────────────────────────────────────────

interface AreaDefinition {
  areaName: string;
  locationId: string;
  areaType: 'refrigerator' | 'freezer' | 'cupboard' | 'pantry';
  subtitle: string;
}

const AREAS_TO_MAP: AreaDefinition[] = [
  { areaName: 'Main Refrigerator — interior', locationId: 'loc-1', areaType: 'refrigerator', subtitle: 'Main Fridge' },
  { areaName: 'Main Refrigerator — door shelves', locationId: 'loc-1', areaType: 'refrigerator', subtitle: 'Main Fridge' },
  { areaName: 'Bottom Freezer — interior', locationId: 'loc-2', areaType: 'freezer', subtitle: 'Bottom Freezer' },
  { areaName: 'Garage Upright Freezer — interior', locationId: 'loc-3', areaType: 'freezer', subtitle: 'Garage Freezer' },
  { areaName: 'Small Pantry Fridge — interior', locationId: 'loc-4', areaType: 'refrigerator', subtitle: 'Mini Fridge' },
  { areaName: 'Kitchen Cupboards — upper', locationId: 'loc-5', areaType: 'cupboard', subtitle: 'Kitchen Cabinets' },
  { areaName: 'Kitchen Cupboards — lower', locationId: 'loc-5', areaType: 'cupboard', subtitle: 'Kitchen Cabinets' },
  { areaName: 'Pantry Shelving', locationId: 'loc-6', areaType: 'pantry', subtitle: 'Pantry' },
];

// ─── Onboarding How-It-Works Card ─────────────────────────────────────────────

function HowItWorksCard({
  index,
}: {
  index: number;
}) {
  const cards = [
    {
      icon: <Camera size={48} color={Colors.green} />,
      badge: <Star size={16} color={Colors.amber} fill={Colors.amber} />,
      title: 'Photograph Each Area',
      desc: 'We\'ll guide you through photographing your refrigerator, freezer, pantry, and cupboards. Open doors wide for best results.',
    },
    {
      icon: <Cpu size={48} color="#9B59B6" />,
      badge: <Sparkles size={16} color="#9B59B6" />,
      title: 'AI Learns Your Layout',
      desc: 'Claude AI analyzes each photo to identify shelves, drawers, zones, and compartments specific to your appliances.',
    },
    {
      icon: <MapPin size={48} color={Colors.amber} />,
      badge: <Check size={16} color={Colors.green} strokeWidth={3} />,
      title: 'Everything Has a Home',
      desc: 'When you add items, just assign them to a zone. PantryIQ will always know exactly where to find them.',
    },
  ];

  const card = cards[index];
  if (!card) return null;

  return (
    <View style={styles.howItWorksCard}>
      <View style={styles.howItWorksIconWrap}>
        {card.icon}
        <View style={styles.howItWorksBadge}>{card.badge}</View>
      </View>
      <Text style={styles.howItWorksTitle}>{card.title}</Text>
      <Text style={styles.howItWorksDesc}>{card.desc}</Text>
    </View>
  );
}

// ─── Onboarding Flow ──────────────────────────────────────────────────────────

function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0); // 0 = welcome, 1-3 = how it works
  const [howItWorksPage, setHowItWorksPage] = useState(0);
  const slideAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(1);

  const goToHowItWorks = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fadeAnim.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setStep)(1);
      fadeAnim.value = withTiming(1, { duration: 300 });
    });
  }, [fadeAnim]);

  const nextCard = useCallback(() => {
    Haptics.selectionAsync();
    if (howItWorksPage < 2) {
      slideAnim.value = withTiming(-SCREEN_WIDTH, { duration: 250 }, () => {
        runOnJS(setHowItWorksPage)(howItWorksPage + 1);
        slideAnim.value = SCREEN_WIDTH;
        slideAnim.value = withSpring(0, { damping: 20 });
      });
    } else {
      onComplete();
    }
  }, [howItWorksPage, slideAnim, onComplete]);

  const animatedSlide = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim.value }],
    opacity: fadeAnim.value,
  }));

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));

  if (step === 0) {
    return (
      <LinearGradient colors={['#0A1628', '#0F1F38', '#0A1628']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <Animated.View style={[{ flex: 1, paddingHorizontal: 24 }, fadeStyle]}>
            {/* Close button */}
            <View style={{ alignItems: 'flex-end', paddingTop: 8 }}>
              <Pressable
                style={styles.onboardingCloseButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.back();
                }}
                testID="onboarding-close-button"
              >
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* Kitchen Illustration */}
            <View style={styles.kitchenIllustration}>
              {/* Fridge shape */}
              <View style={styles.illustFridge}>
                <View style={styles.illustFridgeTop}>
                  <View style={styles.illustShelf} />
                  <View style={styles.illustShelf} />
                </View>
                <View style={styles.illustFridgeDivider} />
                <View style={styles.illustFridgeBottom}>
                  <View style={styles.illustShelfSmall} />
                </View>
                <View style={styles.illustHandle} />
              </View>
              {/* Cabinet shape */}
              <View style={styles.illustCabinet}>
                <View style={styles.illustCabinetDoor} />
                <View style={styles.illustCabinetDoor} />
              </View>
              {/* Decorative dots */}
              <View style={[styles.illustDot, { top: 20, right: 20, backgroundColor: Colors.green }]} />
              <View style={[styles.illustDot, { top: 80, right: 10, backgroundColor: Colors.amber, width: 6, height: 6 }]} />
              <View style={[styles.illustDot, { bottom: 40, left: 15, backgroundColor: '#9B59B6' }]} />
            </View>

            {/* Text */}
            <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 24 }}>
              <Text style={styles.welcomeTitle}>Map Your Kitchen</Text>
              <Text style={styles.welcomeSubtitle}>
                Take photos of your storage areas and PantryIQ will learn exactly where everything lives. Finding items will never be a guessing game again.
              </Text>

              <Pressable
                style={styles.primaryButton}
                onPress={goToHowItWorks}
                testID="start-mapping-button"
              >
                <Text style={styles.primaryButtonText}>Start Mapping My Kitchen</Text>
                <ArrowRight size={20} color={Colors.navy} />
              </Pressable>

              <Text style={styles.welcomeHint}>Takes about 5 minutes — do one area at a time</Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0A1628', '#0F1F38', '#0A1628']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          {/* Header */}
          <View style={styles.onboardingHeader}>
            <Text style={styles.onboardingHeaderLabel}>HOW IT WORKS</Text>
          </View>

          {/* Card */}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Animated.View style={animatedSlide}>
              <HowItWorksCard index={howItWorksPage} />
            </Animated.View>
          </View>

          {/* Dot pagination */}
          <View style={styles.dotPagination}>
            {[0, 1, 2].map((i) => (
              <Pressable
                key={i}
                onPress={() => {
                  Haptics.selectionAsync();
                  slideAnim.value = withTiming(i > howItWorksPage ? -SCREEN_WIDTH : SCREEN_WIDTH, { duration: 200 }, () => {
                    runOnJS(setHowItWorksPage)(i);
                    slideAnim.value = i > howItWorksPage ? SCREEN_WIDTH : -SCREEN_WIDTH;
                    slideAnim.value = withSpring(0, { damping: 20 });
                  });
                }}
              >
                <View
                  style={[
                    styles.dot,
                    i === howItWorksPage ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              </Pressable>
            ))}
          </View>

          {/* CTA */}
          {howItWorksPage < 2 ? (
            <Pressable style={styles.primaryButton} onPress={nextCard} testID="next-card-button">
              <Text style={styles.primaryButtonText}>Next</Text>
              <ChevronRight size={20} color={Colors.navy} />
            </Pressable>
          ) : (
            <Pressable style={styles.primaryButton} onPress={onComplete} testID="start-mapping-final-button">
              <Text style={styles.primaryButtonText}>Got It — Start Mapping</Text>
              <ArrowRight size={20} color={Colors.navy} />
            </Pressable>
          )}

          <View style={{ height: 32 }} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Settings Sheet ────────────────────────────────────────────────────────────

function SettingsSheet({
  visible,
  onClose,
  mappedCount,
}: {
  visible: boolean;
  onClose: () => void;
  mappedCount: number;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={styles.sheetOverlay}
        onPress={onClose}
      >
        <Pressable onPress={() => {}} style={styles.settingsSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Kitchen Map Settings</Text>

          <Pressable
            style={styles.sheetRow}
            onPress={() => {
              onClose();
            }}
            testID="add-storage-area-button"
          >
            <View style={styles.sheetRowIcon}>
              <Plus size={18} color={Colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetRowLabel}>Add New Storage Area</Text>
              <Text style={styles.sheetRowDesc}>Map a custom storage location</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </Pressable>

          <View style={styles.sheetDivider} />

          <Pressable
            style={styles.sheetRow}
            onPress={() => {
              onClose();
            }}
            testID="retake-all-button"
          >
            <View style={[styles.sheetRowIcon, { backgroundColor: Colors.amberMuted }]}>
              <RotateCcw size={18} color={Colors.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetRowLabel}>Retake All Photos</Text>
              <Text style={styles.sheetRowDesc}>Start fresh with new photos</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </Pressable>

          <View style={styles.sheetDivider} />

          <Pressable
            style={styles.sheetRow}
            onPress={() => {
              onClose();
            }}
            testID="kitchen-map-report-button"
          >
            <View style={[styles.sheetRowIcon, { backgroundColor: 'rgba(147,51,234,0.15)' }]}>
              <FileText size={18} color="#9B59B6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetRowLabel}>Kitchen Map Report</Text>
              <Text style={styles.sheetRowDesc}>
                {mappedCount > 0 ? `AI summary of your ${mappedCount} mapped areas` : 'Map some areas first'}
              </Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </Pressable>

          <Pressable style={[styles.primaryButton, { marginTop: 20 }]} onPress={onClose}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </Pressable>

          <View style={{ height: 8 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Area Checklist Card ───────────────────────────────────────────────────────

function AreaCard({
  area,
  mappedArea,
  index,
}: {
  area: AreaDefinition;
  mappedArea: MappedArea | undefined;
  index: number;
}) {
  const locations = useLocationStore((s) => s.locations);
  const location = locations.find((l) => l.id === area.locationId);
  const isMapped = !!mappedArea;

  const handleStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/kitchen-photo-session',
      params: {
        areaName: area.areaName,
        locationId: area.locationId,
        areaType: area.areaType,
        areaIndex: String(index),
      },
    } as never);
  }, [area, index]);

  const handleView = useCallback(() => {
    if (mappedArea) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/zone-map',
        params: { areaId: mappedArea.id },
      } as never);
    }
  }, [mappedArea]);

  const handleRetake = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/kitchen-photo-session',
      params: {
        areaName: area.areaName,
        locationId: area.locationId,
        areaType: area.areaType,
        areaIndex: String(index),
        retake: '1',
      },
    } as never);
  }, [area, index]);

  return (
    <Pressable
      onPress={isMapped ? handleView : undefined}
      style={[styles.areaCard, isMapped && styles.areaCardMapped]}
      testID={`area-card-${index}`}
    >
      {/* Left: status indicator */}
      <View style={[styles.areaStatusCircle, isMapped && styles.areaStatusCircleMapped]}>
        {isMapped ? (
          <Check size={18} color="#fff" strokeWidth={3} />
        ) : (
          <Camera size={18} color={Colors.textTertiary} />
        )}
      </View>

      {/* Middle: info */}
      <View style={{ flex: 1, marginLeft: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <Text style={[styles.areaCardName, isMapped && { color: Colors.textPrimary }]} numberOfLines={1}>
            {area.areaName}
          </Text>
          {isMapped ? (
            <View style={styles.mappedBadge}>
              <Text style={styles.mappedBadgeText}>Mapped</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.areaCardSub}>{area.subtitle}</Text>
        {isMapped && mappedArea ? (
          <Text style={styles.areaCardZoneCount}>
            {mappedArea.zones.length} zone{mappedArea.zones.length !== 1 ? 's' : ''} mapped
          </Text>
        ) : null}
      </View>

      {/* Right: action */}
      {isMapped ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable onPress={handleRetake} style={styles.retakeButton} testID={`retake-button-${index}`}>
            <RotateCcw size={14} color={Colors.textSecondary} />
            <Text style={styles.retakeButtonText}>Retake</Text>
          </Pressable>
          <ChevronRight size={16} color={Colors.textTertiary} />
        </View>
      ) : (
        <Pressable onPress={handleStart} style={styles.startButton} testID={`start-button-${index}`}>
          <Text style={styles.startButtonText}>Start</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

// ─── Mapping Session Hub ───────────────────────────────────────────────────────

function MappingSessionHub() {
  const mappedAreas = useKitchenMapStore((s) => s.mappedAreas);
  const [showSettings, setShowSettings] = useState(false);

  const mappedCount = useMemo(() => {
    return AREAS_TO_MAP.filter((area) =>
      mappedAreas.some((ma) => ma.locationId === area.locationId && ma.areaName === area.areaName)
    ).length;
  }, [mappedAreas]);

  const progressPercent = useMemo(() => (mappedCount / AREAS_TO_MAP.length) * 100, [mappedCount]);

  return (
    <LinearGradient colors={['#0A1628', '#0B1C35', '#0A1628']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.hubHeader}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.back();
            }}
            style={styles.backButton}
            testID="back-button"
          >
            <ChevronRight size={22} color={Colors.textPrimary} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>

          <Text style={styles.hubTitle}>Kitchen Map</Text>

          <Pressable
            onPress={() => {
              setShowSettings(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.settingsButton}
            testID="settings-button"
          >
            <Settings size={20} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={styles.progressLabel}>Areas mapped</Text>
            <Text style={styles.progressCount}>{mappedCount} / {AREAS_TO_MAP.length}</Text>
          </View>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Empty state */}
          {mappedCount === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Camera size={40} color={Colors.green} />
              </View>
              <Text style={styles.emptyStateTitle}>Start With Your Refrigerator</Text>
              <Text style={styles.emptyStateDesc}>
                Tap "Start" on any area below to begin photographing. Your refrigerator is the best place to start!
              </Text>
              {/* Hint arrow */}
              <View style={styles.emptyStateArrow}>
                <ArrowRight size={16} color={Colors.textTertiary} />
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textTertiary }}>
                  Tap Start on the first card below
                </Text>
              </View>
            </View>
          ) : null}

          {/* Area cards */}
          {AREAS_TO_MAP.map((area, index) => {
            const mappedArea = mappedAreas.find(
              (ma) => ma.locationId === area.locationId && ma.areaName === area.areaName
            );
            return (
              <AreaCard
                key={`${area.locationId}-${index}`}
                area={area}
                mappedArea={mappedArea}
                index={index}
              />
            );
          })}
        </ScrollView>

        <SettingsSheet
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          mappedCount={mappedCount}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function KitchenMapScreen() {
  const onboardingComplete = useKitchenMapStore((s) => s.onboardingComplete);
  const completeOnboarding = useKitchenMapStore((s) => s.completeOnboarding);

  const handleOnboardingComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeOnboarding();
  }, [completeOnboarding]);

  if (!onboardingComplete) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return <MappingSessionHub />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Onboarding - welcome
  kitchenIllustration: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    position: 'relative',
  },
  illustFridge: {
    width: 100,
    height: 180,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 16,
  },
  illustFridgeTop: {
    flex: 2,
    padding: 8,
    gap: 6,
  },
  illustShelf: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    width: '80%',
  },
  illustShelfSmall: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    width: '60%',
    margin: 8,
  },
  illustFridgeDivider: {
    height: 2,
    backgroundColor: Colors.green + '60',
  },
  illustFridgeBottom: {
    flex: 1,
    justifyContent: 'center',
  },
  illustHandle: {
    position: 'absolute',
    right: 6,
    top: 30,
    width: 4,
    height: 60,
    backgroundColor: Colors.green + '80',
    borderRadius: 2,
  },
  illustCabinet: {
    position: 'absolute',
    right: 30,
    top: 20,
    width: 80,
    height: 80,
    backgroundColor: Colors.navyCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 1,
  },
  illustCabinetDoor: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  illustDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  welcomeTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 36,
    color: Colors.textPrimary,
    marginBottom: 16,
    lineHeight: 44,
  },
  welcomeSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 26,
    marginBottom: 32,
  },
  welcomeHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 16,
  },

  onboardingCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Onboarding - how it works
  onboardingHeader: {
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  onboardingHeaderLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
  },
  howItWorksCard: {
    backgroundColor: Colors.navyCard,
    borderRadius: BorderRadius.xxl,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.elevated,
  },
  howItWorksIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  howItWorksBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.navyCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  howItWorksTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  howItWorksDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotPagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    marginTop: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.green,
  },
  dotInactive: {
    width: 6,
    backgroundColor: Colors.textTertiary,
  },

  // Buttons
  primaryButton: {
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.elevated,
  },
  primaryButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.navy,
  },

  // Hub
  hubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hubTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: Colors.textPrimary,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  progressCount: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: Colors.green,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.green,
    borderRadius: 2,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.greenMuted,
    borderWidth: 1,
    borderColor: Colors.green + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyStateArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Area card
  areaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navyCard,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  areaCardMapped: {
    borderColor: Colors.green + '40',
    backgroundColor: Colors.navyCard,
  },
  areaStatusCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexShrink: 0,
  },
  areaStatusCircleMapped: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  areaCardName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  areaCardSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  areaCardZoneCount: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.green,
    marginTop: 4,
  },
  mappedBadge: {
    backgroundColor: Colors.greenMuted,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.green + '40',
  },
  mappedBadgeText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    color: Colors.green,
  },
  startButton: {
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  startButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: Colors.navy,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retakeButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Settings sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: Colors.navyCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  sheetRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.greenMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRowLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  sheetRowDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
});
