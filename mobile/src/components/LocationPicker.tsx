import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { MapPin, ChevronDown, ChevronRight, X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useLocationStore, StorageLocation } from '@/lib/stores/locationStore';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

interface LocationPickerProps {
  locationId?: string;
  subZoneId?: string;
  specificSpot?: string;
  onLocationChange: (locationId: string | undefined, subZoneId: string | undefined, specificSpot: string | undefined) => void;
  placeholder?: string;
}

function LocationRow({
  location,
  selectedLocationId,
  selectedSubZoneId,
  onSelect,
}: {
  location: StorageLocation;
  selectedLocationId?: string;
  selectedSubZoneId?: string;
  onSelect: (locationId: string, subZoneId?: string) => void;
}) {
  const [expanded, setExpanded] = useState(location.id === selectedLocationId);
  const rotateValue = useSharedValue(expanded ? 1 : 0);

  const toggleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    rotateValue.value = withTiming(newExpanded ? 1 : 0, { duration: 200 });
    Haptics.selectionAsync();
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value * 90}deg` }],
  }));

  const isLocationSelected = selectedLocationId === location.id;

  return (
    <View style={pickerStyles.locationRow}>
      <Pressable
        onPress={toggleExpand}
        style={[
          pickerStyles.locationHeader,
          isLocationSelected && !selectedSubZoneId && pickerStyles.locationHeaderActive,
        ]}
      >
        <View style={[pickerStyles.iconCircle, { backgroundColor: location.color + '30', borderColor: location.color + '60' }]}>
          <Text style={{ fontSize: 16 }}>{location.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={pickerStyles.locationName}>{location.name}</Text>
          <Text style={pickerStyles.locationSubZoneCount}>
            {location.subZones.length} zone{location.subZones.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            onSelect(location.id, undefined);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={pickerStyles.selectBtn}
        >
          {isLocationSelected && !selectedSubZoneId ? (
            <View style={pickerStyles.checkCircle}>
              <Check size={12} color={Colors.navy} />
            </View>
          ) : null}
        </Pressable>
        <Animated.View style={chevronStyle}>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </Animated.View>
      </Pressable>

      {expanded ? (
        <View style={pickerStyles.subZoneList}>
          {location.subZones.map((zone, idx) => {
            const isSelected = isLocationSelected && selectedSubZoneId === zone.id;
            return (
              <Pressable
                key={zone.id}
                onPress={() => {
                  onSelect(location.id, zone.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  pickerStyles.subZoneRow,
                  idx < location.subZones.length - 1 && pickerStyles.subZoneBorder,
                  isSelected && pickerStyles.subZoneRowActive,
                ]}
              >
                <View style={[pickerStyles.subZoneDot, { backgroundColor: location.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[pickerStyles.subZoneName, isSelected && { color: Colors.green }]}>
                    {zone.name}
                  </Text>
                  {zone.bestFor ? (
                    <Text style={pickerStyles.subZoneBestFor} numberOfLines={1}>
                      Best for: {zone.bestFor}
                    </Text>
                  ) : null}
                </View>
                {isSelected ? (
                  <View style={pickerStyles.checkCircle}>
                    <Check size={12} color={Colors.navy} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export default function LocationPicker({
  locationId,
  subZoneId,
  specificSpot,
  onLocationChange,
  placeholder = 'Select Location',
}: LocationPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [localLocationId, setLocalLocationId] = useState(locationId);
  const [localSubZoneId, setLocalSubZoneId] = useState(subZoneId);
  const [localSpot, setLocalSpot] = useState(specificSpot ?? '');

  const locations = useLocationStore((s) => s.locations);

  const selectedLocation = locations.find((l) => l.id === localLocationId);
  const selectedSubZone = selectedLocation?.subZones.find((sz) => sz.id === localSubZoneId);

  const openModal = () => {
    setLocalLocationId(locationId);
    setLocalSubZoneId(subZoneId);
    setLocalSpot(specificSpot ?? '');
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSelect = (newLocId: string, newSubZoneId?: string) => {
    setLocalLocationId(newLocId);
    setLocalSubZoneId(newSubZoneId);
  };

  const handleConfirm = () => {
    onLocationChange(localLocationId, localSubZoneId, localSpot || undefined);
    setModalVisible(false);
  };

  const handleClear = () => {
    setLocalLocationId(undefined);
    setLocalSubZoneId(undefined);
    setLocalSpot('');
    onLocationChange(undefined, undefined, undefined);
    setModalVisible(false);
  };

  const hasSelection = !!locationId;
  const displayLocation = locations.find((l) => l.id === locationId);
  const displaySubZone = displayLocation?.subZones.find((sz) => sz.id === subZoneId);

  return (
    <>
      <Pressable
        onPress={openModal}
        style={[pickerStyles.triggerButton, hasSelection && pickerStyles.triggerButtonActive]}
        testID="location-picker-trigger"
      >
        <MapPin size={14} color={hasSelection ? displayLocation?.color ?? Colors.green : Colors.textTertiary} />
        <Text
          style={[pickerStyles.triggerText, hasSelection && pickerStyles.triggerTextActive]}
          numberOfLines={1}
        >
          {hasSelection
            ? `${displayLocation?.name ?? 'Unknown'}${displaySubZone ? ` • ${displaySubZone.name}` : ''}`
            : placeholder}
        </Text>
        <ChevronDown size={14} color={hasSelection ? Colors.green : Colors.textTertiary} />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={pickerStyles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={pickerStyles.sheet}>
            {/* Handle */}
            <View style={pickerStyles.handle} />

            {/* Header */}
            <View style={pickerStyles.sheetHeader}>
              <Text style={pickerStyles.sheetTitle}>Select Location</Text>
              <Pressable onPress={() => setModalVisible(false)} style={pickerStyles.closeBtn}>
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
              style={{ flex: 1 }}
            >
              {locations.map((loc) => (
                <LocationRow
                  key={loc.id}
                  location={loc}
                  selectedLocationId={localLocationId}
                  selectedSubZoneId={localSubZoneId}
                  onSelect={handleSelect}
                />
              ))}

              {/* Specific spot field */}
              {localLocationId ? (
                <View style={pickerStyles.spotSection}>
                  <Text style={pickerStyles.spotLabel}>Specific Spot (optional)</Text>
                  <TextInput
                    style={pickerStyles.spotInput}
                    value={localSpot}
                    onChangeText={setLocalSpot}
                    placeholder="e.g. Third shelf from top, far left"
                    placeholderTextColor={Colors.textTertiary}
                    testID="specific-spot-input"
                  />
                </View>
              ) : null}
            </ScrollView>

            {/* Footer buttons */}
            <View style={pickerStyles.footer}>
              {hasSelection ? (
                <Pressable style={pickerStyles.clearBtn} onPress={handleClear}>
                  <Text style={pickerStyles.clearBtnText}>Clear</Text>
                </Pressable>
              ) : null}
              <Pressable style={pickerStyles.confirmBtn} onPress={handleConfirm}>
                <Text style={pickerStyles.confirmBtnText}>
                  {localLocationId ? 'Confirm' : 'Skip'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const pickerStyles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'flex-start',
    maxWidth: 220,
  },
  triggerButtonActive: {
    backgroundColor: 'rgba(46,204,113,0.1)',
    borderColor: 'rgba(46,204,113,0.4)',
  },
  triggerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    flex: 1,
  },
  triggerTextActive: {
    color: Colors.green,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.navyCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sheetTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRow: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  locationHeaderActive: {
    backgroundColor: 'rgba(46,204,113,0.08)',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  locationName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  locationSubZoneCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  selectBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subZoneList: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: 14,
  },
  subZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  subZoneBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  subZoneRowActive: {
    backgroundColor: 'rgba(46,204,113,0.05)',
  },
  subZoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    marginTop: 2,
  },
  spotSection: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  spotLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  spotInput: {
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
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  clearBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.green,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.navy,
  },
});
