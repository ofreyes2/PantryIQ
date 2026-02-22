import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronRight,
  X,
  RotateCcw,
  Thermometer,
  Package,
  MapPin,
  ChevronDown,
  ChevronUp,
  Layers,
  Plus,
  Camera,
} from 'lucide-react-native';
import { useKitchenMapStore, KitchenZone, MappedArea } from '@/lib/stores/kitchenMapStore';
import { useLocationStore } from '@/lib/stores/locationStore';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_HEIGHT = 280;

// ─── Zone type colors ─────────────────────────────────────────────────────────

const ZONE_TYPE_COLORS: Record<string, string> = {
  shelf: Colors.green,
  drawer: '#3498DB',
  'door shelf': Colors.amber,
  bin: '#9B59B6',
  rack: '#1ABC9C',
  compartment: '#E67E22',
};

const TEMP_ZONE_COLORS: Record<string, string> = {
  coldest: '#3498DB',
  cold: '#5DADE2',
  moderate: '#82E0AA',
  ambient: Colors.amber,
};

// ─── Zone Overlay ─────────────────────────────────────────────────────────────

function ZoneOverlay({
  zone,
  isSelected,
  onPress,
}: {
  zone: KitchenZone;
  isSelected: boolean;
  onPress: () => void;
}) {
  const color = ZONE_TYPE_COLORS[zone.zoneType] ?? Colors.green;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.zoneOverlay,
        {
          left: `${zone.overlayX ?? 5}%` as any,
          top: `${zone.overlayY ?? 5}%` as any,
          width: `${zone.overlayWidth ?? 80}%` as any,
          height: `${zone.overlayHeight ?? 15}%` as any,
          backgroundColor: isSelected
            ? `${color}55`
            : `${color}25`,
          borderColor: isSelected ? color : `${color}90`,
          borderWidth: isSelected ? 2.5 : 1.5,
        },
      ]}
      testID={`zone-overlay-${zone.zoneId}`}
    >
      <View
        style={[
          styles.zoneLabel,
          { backgroundColor: isSelected ? color : 'rgba(0,0,0,0.7)' },
        ]}
      >
        <Text
          style={[
            styles.zoneLabelText,
            { color: isSelected ? Colors.navy : '#fff' },
          ]}
          numberOfLines={1}
        >
          {zone.zoneName}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Zone Info Panel ──────────────────────────────────────────────────────────

function ZoneInfoPanel({
  zone,
  onClose,
}: {
  zone: KitchenZone;
  onClose: () => void;
}) {
  const slideY = useSharedValue(300);

  React.useEffect(() => {
    slideY.value = withSpring(0, { damping: 20, stiffness: 200 });
  }, [slideY]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const zoneColor = ZONE_TYPE_COLORS[zone.zoneType] ?? Colors.green;
  const tempColor = zone.temperatureZone
    ? TEMP_ZONE_COLORS[zone.temperatureZone] ?? Colors.green
    : null;

  return (
    <Animated.View style={[styles.infoPanel, slideStyle]} testID="zone-info-panel">
      {/* Header */}
      <View style={styles.infoPanelHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={styles.infoPanelTitle}>{zone.zoneName}</Text>
            <View style={[styles.zoneTypeBadge, { backgroundColor: `${zoneColor}20`, borderColor: `${zoneColor}50` }]}>
              <Text style={[styles.zoneTypeBadgeText, { color: zoneColor }]}>{zone.zoneType}</Text>
            </View>
          </View>
          <Text style={styles.infoPanelPosition}>{zone.position}</Text>
        </View>
        <Pressable onPress={onClose} style={styles.infoPanelClose} testID="close-info-panel">
          <X size={18} color={Colors.textTertiary} />
        </Pressable>
      </View>

      {/* Temperature + Capacity row */}
      <View style={styles.infoPanelMeta}>
        {tempColor ? (
          <View style={[styles.metaBadge, { backgroundColor: `${tempColor}20` }]}>
            <Thermometer size={12} color={tempColor} />
            <Text style={[styles.metaBadgeText, { color: tempColor }]}>
              {zone.temperatureZone}
            </Text>
          </View>
        ) : null}
        <View style={[styles.metaBadge, { backgroundColor: Colors.surface }]}>
          <Package size={12} color={Colors.textSecondary} />
          <Text style={styles.metaBadgeText}>{zone.estimatedCapacity}</Text>
        </View>
        <View style={[styles.metaBadge, { backgroundColor: Colors.surface }]}>
          <Layers size={12} color={Colors.textSecondary} />
          <Text style={styles.metaBadgeText}>{zone.approximateSize}</Text>
        </View>
      </View>

      {/* Best stored items */}
      {zone.bestStoredItems.length > 0 ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.infoPanelSectionLabel}>Best For</Text>
          <View style={styles.pillRow}>
            {zone.bestStoredItems.slice(0, 6).map((item, i) => (
              <View key={i} style={styles.pill}>
                <Text style={styles.pillText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Special notes */}
      {zone.specialNotes ? (
        <View style={styles.specialNotesBox}>
          <Text style={styles.specialNotesText}>{zone.specialNotes}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

// ─── Zone List Card ───────────────────────────────────────────────────────────

function ZoneListCard({
  zone,
  isSelected,
  onPress,
}: {
  zone: KitchenZone;
  isSelected: boolean;
  onPress: () => void;
}) {
  const zoneColor = ZONE_TYPE_COLORS[zone.zoneType] ?? Colors.green;
  const tempColor = zone.temperatureZone
    ? TEMP_ZONE_COLORS[zone.temperatureZone] ?? Colors.green
    : null;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.zoneListCard,
        isSelected && { borderColor: zoneColor + '80', backgroundColor: Colors.surface },
      ]}
      testID={`zone-list-card-${zone.zoneId}`}
    >
      {/* Colored left border */}
      <View style={[styles.zoneListBorder, { backgroundColor: zoneColor }]} />

      <View style={{ flex: 1, paddingLeft: 14 }}>
        {/* Name + type badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Text style={styles.zoneListName}>{zone.zoneName}</Text>
          <View style={[styles.zoneTypeBadge, { backgroundColor: `${zoneColor}20`, borderColor: `${zoneColor}50` }]}>
            <Text style={[styles.zoneTypeBadgeText, { color: zoneColor }]}>{zone.zoneType}</Text>
          </View>
          {tempColor ? (
            <View style={[styles.zoneTypeBadge, { backgroundColor: `${tempColor}20`, borderColor: `${tempColor}40` }]}>
              <Thermometer size={9} color={tempColor} />
              <Text style={[styles.zoneTypeBadgeText, { color: tempColor }]}>{zone.temperatureZone}</Text>
            </View>
          ) : null}
        </View>

        {/* Position */}
        <Text style={styles.zoneListPosition} numberOfLines={1}>{zone.position}</Text>

        {/* Best items pills */}
        {zone.bestStoredItems.length > 0 ? (
          <View style={[styles.pillRow, { marginTop: 8 }]}>
            {zone.bestStoredItems.slice(0, 4).map((item, i) => (
              <View key={i} style={[styles.pill, { backgroundColor: `${zoneColor}15`, borderColor: `${zoneColor}30` }]}>
                <Text style={[styles.pillText, { color: zoneColor }]}>{item}</Text>
              </View>
            ))}
            {zone.bestStoredItems.length > 4 ? (
              <Text style={[styles.pillText, { color: Colors.textTertiary, paddingVertical: 3 }]}>
                +{zone.bestStoredItems.length - 4}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Capacity */}
        <Text style={styles.zoneListCapacity}>{zone.estimatedCapacity}</Text>
      </View>

      {isSelected ? (
        <View style={[styles.selectedDot, { backgroundColor: zoneColor }]} />
      ) : null}
    </Pressable>
  );
}

// ─── Organization Tips Section ────────────────────────────────────────────────

function OrgTipsSection({ tips }: { tips: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (tips.length === 0) return null;

  return (
    <View style={styles.orgTipsCard}>
      <Pressable
        style={styles.orgTipsHeader}
        onPress={() => {
          setExpanded(!expanded);
          Haptics.selectionAsync();
        }}
        testID="org-tips-toggle"
      >
        <View style={styles.orgTipsIconWrap}>
          <Layers size={16} color={Colors.green} />
        </View>
        <Text style={styles.orgTipsTitle}>Claude's Organization Tips</Text>
        {expanded ? (
          <ChevronUp size={18} color={Colors.textTertiary} />
        ) : (
          <ChevronDown size={18} color={Colors.textTertiary} />
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.orgTipsContent}>
          {tips.map((tip, i) => (
            <View key={i} style={styles.orgTipRow}>
              <View style={styles.orgTipDot} />
              <Text style={styles.orgTipText}>{tip}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ─── Spotted Items Banner ─────────────────────────────────────────────────────

function SpottedItemsBanner({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <View style={styles.spottedBanner}>
      <View style={styles.spottedHeader}>
        <View style={styles.spottedIconWrap}>
          <Camera size={16} color={Colors.amber} />
        </View>
        <Text style={styles.spottedTitle}>
          We spotted {items.length} item{items.length !== 1 ? 's' : ''} in your photos!
        </Text>
      </View>

      <View style={[styles.pillRow, { marginBottom: 12 }]}>
        {items.slice(0, 8).map((item, i) => (
          <View key={i} style={[styles.pill, { backgroundColor: Colors.amberMuted, borderColor: Colors.amber + '40' }]}>
            <Text style={[styles.pillText, { color: Colors.amber }]}>{item}</Text>
          </View>
        ))}
        {items.length > 8 ? (
          <Text style={[styles.pillText, { color: Colors.textTertiary, paddingVertical: 3 }]}>
            +{items.length - 8} more
          </Text>
        ) : null}
      </View>

      <Pressable
        style={styles.addToPantryButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/add-pantry-item' as never);
        }}
        testID="add-to-pantry-button"
      >
        <Plus size={16} color={Colors.navy} />
        <Text style={styles.addToPantryText}>Add to Pantry</Text>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ZoneMapScreen() {
  const { areaId } = useLocalSearchParams<{ areaId: string }>();
  const mappedAreas = useKitchenMapStore((s) => s.mappedAreas);
  const area = mappedAreas.find((a) => a.id === areaId);

  const locations = useLocationStore((s) => s.locations);
  const location = area ? locations.find((l) => l.id === area.locationId) : null;

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const selectedZone = useMemo(
    () => area?.zones.find((z) => z.zoneId === selectedZoneId) ?? null,
    [area, selectedZoneId]
  );

  const handleZonePress = useCallback((zone: KitchenZone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedZoneId((prev) => (prev === zone.zoneId ? null : zone.zoneId));
  }, []);

  // Assign fallback overlay positions for zones missing coords
  const zonesWithPositions = useMemo<KitchenZone[]>(() => {
    if (!area) return [];
    return area.zones.map((zone, i) => {
      if (
        zone.overlayX !== undefined &&
        zone.overlayY !== undefined &&
        zone.overlayWidth !== undefined &&
        zone.overlayHeight !== undefined
      ) {
        return zone;
      }
      const total = area.zones.length;
      const rowHeight = Math.floor(100 / total);
      return {
        ...zone,
        overlayX: 5,
        overlayY: i * rowHeight + 2,
        overlayWidth: 90,
        overlayHeight: rowHeight - 4,
      };
    });
  }, [area]);

  const handleRetake = useCallback(() => {
    if (!area) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/kitchen-photo-session',
      params: {
        areaName: area.areaName,
        locationId: area.locationId,
        areaType: area.areaType,
        retake: '1',
      },
    } as never);
  }, [area]);

  if (!area) {
    return (
      <LinearGradient colors={['#0A1628', '#0B1C35']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }} edges={['top']}>
          <MapPin size={48} color={Colors.textTertiary} />
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary, marginTop: 16, textAlign: 'center' }}>
            Area not found
          </Text>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { marginTop: 24 }]}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textSecondary }}>Go Back</Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const currentPhoto = area.photoUris[activePhotoIndex];

  return (
    <LinearGradient colors={['#0A1628', '#0B1C35', '#0A1628']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} testID="zone-map-back">
            <ChevronRight size={22} color={Colors.textPrimary} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{area.areaName}</Text>
            {location ? (
              <Text style={styles.headerSub}>{location.name}</Text>
            ) : null}
          </View>
          <Pressable onPress={handleRetake} style={styles.retakeButton} testID="retake-button">
            <RotateCcw size={16} color={Colors.textSecondary} />
            <Text style={styles.retakeText}>Retake</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[]}
        >
          {/* Photo with overlays */}
          <View style={styles.photoContainer}>
            {currentPhoto ? (
              <Image
                source={{ uri: currentPhoto }}
                style={styles.photo}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={[Colors.surface, Colors.navyCard]}
                style={[styles.photo, styles.photoPlaceholder]}
              >
                <Camera size={48} color={Colors.textTertiary} />
                <Text style={styles.photoPlaceholderText}>No photo available</Text>
              </LinearGradient>
            )}

            {/* Zone overlays */}
            {currentPhoto ? (
              <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
                {zonesWithPositions.map((zone) => (
                  <ZoneOverlay
                    key={zone.zoneId}
                    zone={zone}
                    isSelected={selectedZoneId === zone.zoneId}
                    onPress={() => handleZonePress(zone)}
                  />
                ))}
              </View>
            ) : null}

            {/* Zone count badge */}
            <View style={styles.zoneCountBadge}>
              <Layers size={12} color={Colors.green} />
              <Text style={styles.zoneCountText}>{area.zones.length} zones</Text>
            </View>
          </View>

          {/* Thumbnail strip */}
          {area.photoUris.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
              style={{ flexGrow: 0 }}
            >
              {area.photoUris.map((uri, i) => (
                <Pressable
                  key={i}
                  onPress={() => setActivePhotoIndex(i)}
                  style={[
                    styles.thumbPill,
                    i === activePhotoIndex && styles.thumbPillActive,
                  ]}
                  testID={`photo-thumb-${i}`}
                >
                  <Image source={{ uri }} style={styles.thumbImage} />
                  {i === activePhotoIndex ? (
                    <View style={styles.thumbActiveBorder} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {/* Appliance observations */}
          {area.applianceObservations ? (
            <View style={styles.obsCard}>
              <Text style={styles.obsText}>{area.applianceObservations}</Text>
            </View>
          ) : null}

          {/* Zone list */}
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <Text style={styles.sectionTitle}>Storage Zones</Text>

            {zonesWithPositions.map((zone) => (
              <ZoneListCard
                key={zone.zoneId}
                zone={zone}
                isSelected={selectedZoneId === zone.zoneId}
                onPress={() => handleZonePress(zone)}
              />
            ))}
          </View>

          {/* Overall storage tip */}
          {area.overallStorageTips ? (
            <View style={[styles.tipBanner, { marginHorizontal: 16, marginTop: 16 }]}>
              <MapPin size={16} color={Colors.green} />
              <Text style={styles.tipBannerText}>{area.overallStorageTips}</Text>
            </View>
          ) : null}

          {/* Organization tips */}
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <OrgTipsSection tips={area.organizationSuggestions} />
          </View>

          {/* Spotted items banner */}
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <SpottedItemsBanner items={area.currentItemsVisible} />
          </View>

          {/* Mapped at */}
          <Text style={styles.mappedAt}>
            Mapped {new Date(area.mappedAt).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </Text>
        </ScrollView>

        {/* Zone info panel overlay */}
        {selectedZone ? (
          <View style={styles.infoPanelContainer} pointerEvents="box-none">
            <ZoneInfoPanel
              zone={selectedZone}
              onClose={() => setSelectedZoneId(null)}
            />
          </View>
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
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
  headerTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  retakeText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Photo
  photoContainer: {
    height: PHOTO_HEIGHT,
    marginHorizontal: 0,
    position: 'relative',
    backgroundColor: Colors.surface,
  },
  photo: {
    width: '100%',
    height: PHOTO_HEIGHT,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  photoPlaceholderText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textTertiary,
  },
  zoneCountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.green + '40',
  },
  zoneCountText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    color: Colors.green,
  },

  // Zone overlay
  zoneOverlay: {
    position: 'absolute',
    borderRadius: 4,
  },
  zoneLabel: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    margin: 4,
    maxWidth: '90%',
  },
  zoneLabelText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 9,
  },

  // Photo thumbnails
  thumbPill: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  thumbPillActive: {
    borderColor: Colors.green,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbActiveBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.green,
  },

  // Appliance obs
  obsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  obsText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Zone list
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  zoneListCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.navyCard,
    borderRadius: BorderRadius.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    paddingVertical: 14,
    paddingRight: 14,
    ...Shadows.card,
  },
  zoneListBorder: {
    width: 4,
    borderRadius: 2,
    flexShrink: 0,
  },
  zoneListName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
  },
  zoneListPosition: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
  },
  zoneListCapacity: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 6,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'center',
    marginRight: 2,
  },
  zoneTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  zoneTypeBadgeText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 9,
    textTransform: 'capitalize',
  },

  // Pills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  pill: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
  },

  // Tip banner
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.greenMuted,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.green + '30',
  },
  tipBannerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  // Organization tips
  orgTipsCard: {
    backgroundColor: Colors.navyCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  orgTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  orgTipsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.greenMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgTipsTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  orgTipsContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 10,
    paddingTop: 12,
  },
  orgTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  orgTipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
    marginTop: 6,
    flexShrink: 0,
  },
  orgTipText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  // Spotted items banner
  spottedBanner: {
    backgroundColor: Colors.amberMuted,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.amber + '30',
  },
  spottedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  spottedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.amberMuted,
    borderWidth: 1,
    borderColor: Colors.amber + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spottedTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.amber,
    flex: 1,
  },
  addToPantryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.amber,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
  },
  addToPantryText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.navy,
  },

  // Info panel
  infoPanelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  infoPanel: {
    backgroundColor: Colors.navyCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.elevated,
  },
  infoPanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  infoPanelTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  infoPanelPosition: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 3,
  },
  infoPanelClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPanelMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  metaBadgeText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  infoPanelSectionLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  specialNotesBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 12,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: Colors.amber,
  },
  specialNotesText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Misc
  mappedAt: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
});
