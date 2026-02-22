import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  Refrigerator,
  Box,
  Archive,
  Snowflake,
  MoreHorizontal,
} from 'lucide-react-native';
import { useLocationStore, StorageLocation, StorageSubZone } from '@/lib/stores/locationStore';
import { usePantryStore } from '@/lib/stores/pantryStore';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

// ─── Type helpers ─────────────────────────────────────────────────────────────

type LocationType = StorageLocation['type'];

const TYPE_LABELS: Record<LocationType, string> = {
  refrigerator: 'Refrigerator',
  freezer: 'Freezer',
  cabinet: 'Cabinet',
  pantry: 'Pantry',
  other: 'Other',
};

const TYPE_COLORS: Record<LocationType, string> = {
  refrigerator: '#3498DB',
  freezer: '#9B59B6',
  cabinet: '#F39C12',
  pantry: '#E67E22',
  other: '#95A5A6',
};

const PRESET_COLORS = [
  '#3498DB',
  '#9B59B6',
  '#2ECC71',
  '#E67E22',
  '#E74C3C',
  '#1ABC9C',
  '#F39C12',
  '#2980B9',
];

const DEFAULT_ICONS: Record<LocationType, string> = {
  refrigerator: '🌡️',
  freezer: '❄️',
  cabinet: '🗄️',
  pantry: '📦',
  other: '📍',
};

// ─── Type Icon ────────────────────────────────────────────────────────────────

function TypeIcon({ type, size = 16 }: { type: LocationType; size?: number }) {
  const color = Colors.textSecondary;
  switch (type) {
    case 'refrigerator':
      return <Refrigerator size={size} color={color} />;
    case 'freezer':
      return <Snowflake size={size} color={color} />;
    case 'cabinet':
      return <Archive size={size} color={color} />;
    case 'pantry':
      return <Box size={size} color={color} />;
    default:
      return <MoreHorizontal size={size} color={color} />;
  }
}

// ─── Location Card ────────────────────────────────────────────────────────────

function LocationCard({
  location,
  itemCount,
  onEdit,
  onDelete,
}: {
  location: StorageLocation;
  itemCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rotateValue = useSharedValue(0);
  const heightValue = useSharedValue(0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value * 180}deg` }],
  }));

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    rotateValue.value = withTiming(next ? 1 : 0, { duration: 220 });
    heightValue.value = withSpring(next ? 1 : 0);
    Haptics.selectionAsync();
  };

  return (
    <View style={styles.locationCard}>
      {/* Card Header */}
      <View style={styles.locationCardHeader}>
        {/* Icon circle */}
        <View style={[styles.locationIconCircle, { backgroundColor: location.color + '28', borderColor: location.color + '60' }]}>
          <Text style={{ fontSize: 20 }}>{location.icon}</Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.locationName}>{location.name}</Text>
            <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[location.type] + '28' }]}>
              <TypeIcon type={location.type} size={11} />
              <Text style={[styles.typeBadgeText, { color: TYPE_COLORS[location.type] }]}>
                {TYPE_LABELS[location.type]}
              </Text>
            </View>
          </View>
          {location.fullName ? (
            <Text style={styles.locationFullName} numberOfLines={1}>
              {location.fullName}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{location.subZones.length} zones</Text>
            </View>
            {itemCount > 0 ? (
              <View style={[styles.countPill, { backgroundColor: Colors.greenMuted }]}>
                <Text style={[styles.countPillText, { color: Colors.green }]}>
                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.locationActions}>
          <Pressable onPress={onEdit} style={styles.actionBtn} testID={`edit-location-${location.id}`}>
            <Edit2 size={16} color={Colors.textSecondary} />
          </Pressable>
          <Pressable onPress={onDelete} style={styles.actionBtn} testID={`delete-location-${location.id}`}>
            <Trash2 size={16} color={Colors.error} />
          </Pressable>
          <Pressable onPress={toggle} style={styles.actionBtn}>
            <Animated.View style={chevronStyle}>
              <ChevronDown size={18} color={Colors.textSecondary} />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* Model number row */}
      {(location.type === 'refrigerator' || location.type === 'freezer') && location.modelNumber ? (
        <View style={styles.modelRow}>
          <Text style={styles.modelLabel}>Model:</Text>
          <Text style={styles.modelValue}>{location.modelNumber}</Text>
        </View>
      ) : null}

      {/* Expanded sub zones */}
      {expanded ? (
        <View style={styles.subZonesSection}>
          <View style={styles.subZonesDivider} />
          {location.subZones.length === 0 ? (
            <Text style={styles.noSubZonesText}>No zones defined</Text>
          ) : null}
          {location.subZones.map((zone, idx) => (
            <View
              key={zone.id}
              style={[
                styles.subZoneItem,
                idx < location.subZones.length - 1 && styles.subZoneItemBorder,
              ]}
            >
              <View style={[styles.subZoneDot, { backgroundColor: location.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.subZoneName}>{zone.name}</Text>
                {zone.bestFor ? (
                  <Text style={styles.subZoneBestFor} numberOfLines={1}>
                    Best for: {zone.bestFor}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

function LocationFormModal({
  visible,
  onClose,
  onSave,
  initialData,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Omit<StorageLocation, 'id'>) => void;
  initialData?: StorageLocation | null;
}) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [fullName, setFullName] = useState(initialData?.fullName ?? '');
  const [type, setType] = useState<LocationType>(initialData?.type ?? 'refrigerator');
  const [icon, setIcon] = useState(initialData?.icon ?? DEFAULT_ICONS.refrigerator);
  const [color, setColor] = useState(initialData?.color ?? PRESET_COLORS[0]);
  const [modelNumber, setModelNumber] = useState(initialData?.modelNumber ?? '');
  const [subZones, setSubZones] = useState<StorageSubZone[]>(initialData?.subZones ?? []);
  const [newZoneName, setNewZoneName] = useState('');

  React.useEffect(() => {
    if (visible) {
      setName(initialData?.name ?? '');
      setFullName(initialData?.fullName ?? '');
      setType(initialData?.type ?? 'refrigerator');
      setIcon(initialData?.icon ?? DEFAULT_ICONS.refrigerator);
      setColor(initialData?.color ?? PRESET_COLORS[0]);
      setModelNumber(initialData?.modelNumber ?? '');
      setSubZones(initialData?.subZones ?? []);
      setNewZoneName('');
    }
  }, [visible, initialData]);

  const handleTypeChange = (t: LocationType) => {
    setType(t);
    if (!initialData) {
      setIcon(DEFAULT_ICONS[t]);
      setColor(TYPE_COLORS[t]);
    }
  };

  const handleAddZone = () => {
    if (!newZoneName.trim()) return;
    const zone: StorageSubZone = {
      id: newZoneName.trim(),
      name: newZoneName.trim(),
    };
    setSubZones([...subZones, zone]);
    setNewZoneName('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemoveZone = (id: string) => {
    setSubZones(subZones.filter((z) => z.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this location.');
      return;
    }
    onSave({
      name: name.trim(),
      fullName: fullName.trim() || undefined,
      type,
      icon,
      color,
      modelNumber: modelNumber.trim() || undefined,
      subZones,
      isDefault: initialData?.isDefault ?? false,
    });
  };

  const TYPES: LocationType[] = ['refrigerator', 'freezer', 'cabinet', 'pantry', 'other'];
  const ICONS_BY_TYPE: Record<LocationType, string[]> = {
    refrigerator: ['🌡️', '🔵', '🟦', '❄️'],
    freezer: ['❄️', '🧊', '🟦', '🌨️'],
    cabinet: ['🗄️', '🏠', '📚', '🏪'],
    pantry: ['📦', '🏪', '🛒', '🥫'],
    other: ['📍', '📌', '🏷️', '✏️'],
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalSheet}>
          <View style={styles.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <Text style={styles.sheetTitle}>
              {initialData ? 'Edit Location' : 'Add Location'}
            </Text>

            {/* Name */}
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Main Fridge"
              placeholderTextColor={Colors.textTertiary}
              testID="location-name-input"
            />

            {/* Full Name */}
            <Text style={styles.fieldLabel}>Full Appliance Name (optional)</Text>
            <TextInput
              style={styles.fieldInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Whirlpool Double Door Refrigerator"
              placeholderTextColor={Colors.textTertiary}
            />

            {/* Type */}
            <Text style={styles.fieldLabel}>Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: 16 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => handleTypeChange(t)}
                  style={[styles.typeChip, type === t && { backgroundColor: TYPE_COLORS[t] + '28', borderColor: TYPE_COLORS[t] }]}
                >
                  <TypeIcon type={t} size={14} />
                  <Text style={[styles.typeChipText, type === t && { color: TYPE_COLORS[t] }]}>
                    {TYPE_LABELS[t]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Model Number (for fridge/freezer) */}
            {(type === 'refrigerator' || type === 'freezer') ? (
              <>
                <Text style={styles.fieldLabel}>Model Number (optional)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={modelNumber}
                  onChangeText={setModelNumber}
                  placeholder="e.g. WRF535SWHZ"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="characters"
                />
              </>
            ) : null}

            {/* Icon */}
            <Text style={styles.fieldLabel}>Icon</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: 16 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {ICONS_BY_TYPE[type].map((ic) => (
                <Pressable
                  key={ic}
                  onPress={() => setIcon(ic)}
                  style={[styles.iconChip, icon === ic && { borderColor: color, backgroundColor: color + '28' }]}
                >
                  <Text style={{ fontSize: 22 }}>{ic}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Color */}
            <Text style={styles.fieldLabel}>Color</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {PRESET_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    color === c && styles.colorSwatchActive,
                  ]}
                >
                  {color === c ? (
                    <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'DMSans_700Bold' }}>✓</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>

            {/* Sub Zones */}
            <Text style={styles.fieldLabel}>Storage Zones</Text>
            {subZones.map((zone) => (
              <View key={zone.id} style={styles.subZoneEditRow}>
                <View style={[styles.subZoneDot, { backgroundColor: color }]} />
                <Text style={styles.subZoneEditName}>{zone.name}</Text>
                <Pressable onPress={() => handleRemoveZone(zone.id)} style={styles.removeZoneBtn}>
                  <Trash2 size={14} color={Colors.error} />
                </Pressable>
              </View>
            ))}

            <View style={styles.addZoneRow}>
              <TextInput
                style={styles.addZoneInput}
                value={newZoneName}
                onChangeText={setNewZoneName}
                placeholder="Add a zone (e.g. Top Shelf)"
                placeholderTextColor={Colors.textTertiary}
                onSubmitEditing={handleAddZone}
                returnKeyType="done"
              />
              <Pressable onPress={handleAddZone} style={styles.addZoneBtn}>
                <Plus size={18} color={Colors.navy} />
              </Pressable>
            </View>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSave} testID="save-location-btn">
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function KitchenLocationsScreen() {
  const locations = useLocationStore((s) => s.locations);
  const addLocation = useLocationStore((s) => s.addLocation);
  const updateLocation = useLocationStore((s) => s.updateLocation);
  const deleteLocation = useLocationStore((s) => s.deleteLocation);
  const pantryItems = usePantryStore((s) => s.items);

  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);

  const getItemCount = (locationId: string) =>
    pantryItems.filter((item) => item.locationId === locationId).length;

  const handleDelete = (location: StorageLocation) => {
    const count = getItemCount(location.id);
    Alert.alert(
      `Delete "${location.name}"?`,
      count > 0
        ? `This location has ${count} item${count !== 1 ? 's' : ''} assigned to it. They will become unassigned.`
        : 'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteLocation(location.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const handleSave = (data: Omit<StorageLocation, 'id'>) => {
    if (editingLocation) {
      updateLocation(editingLocation.id, data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      addLocation(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowModal(false);
    setEditingLocation(null);
  };

  return (
    <LinearGradient colors={['#0A1628', '#0B1C35']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']} testID="kitchen-locations-screen">
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            testID="back-button"
          >
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Kitchen & Storage</Text>
            <Text style={styles.headerSubtitle}>
              {locations.length} location{locations.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Location list */}
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {locations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              itemCount={getItemCount(loc.id)}
              onEdit={() => {
                setEditingLocation(loc);
                setShowModal(true);
              }}
              onDelete={() => handleDelete(loc)}
            />
          ))}

          {locations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🏠</Text>
              <Text style={styles.emptyStateTitle}>No locations yet</Text>
              <Text style={styles.emptyStateText}>
                Add your fridge, freezer, pantry, and cabinets to organize your items.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Add button */}
        <View style={styles.footer}>
          <Pressable
            onPress={() => {
              setEditingLocation(null);
              setShowModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            style={styles.addBtn}
            testID="add-location-button"
          >
            <Plus size={20} color={Colors.navy} />
            <Text style={styles.addBtnText}>Add Location</Text>
          </Pressable>
        </View>

        {/* Form Modal */}
        <LocationFormModal
          visible={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingLocation(null);
          }}
          onSave={handleSave}
          initialData={editingLocation}
        />
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
    paddingBottom: 16,
    gap: 14,
  },
  backBtn: {
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
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  locationCard: {
    backgroundColor: Colors.navyCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    overflow: 'hidden',
    ...Shadows.card,
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
  },
  locationIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  locationName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  locationFullName: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },
  countPillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.textSecondary,
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  modelLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
  },
  modelValue: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  subZonesSection: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  subZonesDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: 12,
  },
  noSubZonesText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  subZoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  subZoneItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  subZoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  subZoneName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  subZoneBestFor: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 34,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    ...Shadows.elevated,
  },
  addBtnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.navy,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.navyCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '92%',
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
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  iconChip: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: '#fff',
    ...Shadows.card,
  },
  subZoneEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  subZoneEditName: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  removeZoneBtn: {
    padding: 4,
  },
  addZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  addZoneInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addZoneBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.green,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.navy,
  },
});
