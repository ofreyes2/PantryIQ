import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { locationService } from '@/lib/services/locationService';
import { krogerService, type KrogerStore } from '@/lib/services/krogerService';
import { apiKeyManager, type UserLocation } from '@/lib/services/apiKeyManager';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

interface LocationSelectorProps {
  onLocationChange?: (location: UserLocation & { storeId?: string; storeName?: string }) => void;
}

export function LocationSelector({ onLocationChange }: LocationSelectorProps) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualZip, setManualZip] = useState('');
  const [nearbyStores, setNearbyStores] = useState<KrogerStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  useEffect(() => {
    loadSavedLocation();
  }, []);

  const loadSavedLocation = async () => {
    const saved = await locationService.getSavedLocation();
    if (saved) {
      setLocation(saved);
      loadNearbyStores(saved.zipCode);
    }

    const savedStoreId = await apiKeyManager.getPreferredStoreId();
    if (savedStoreId) setSelectedStore(savedStoreId);
  };

  const detectLocation = async () => {
    setLoading(true);
    const result = await locationService.requestAndGetLocation();
    setLoading(false);

    if (result.success && result.location) {
      setLocation(result.location);
      if (result.location.zipCode) {
        loadNearbyStores(result.location.zipCode);
      }
      onLocationChange?.(result.location);
    } else {
      setShowManualEntry(true);
    }
  };

  const loadNearbyStores = async (zipCode: string | null) => {
    if (!zipCode) return;

    // Check if Kroger credentials are configured before attempting to load stores
    const clientId = await AsyncStorage.getItem('pantryiq_kroger_client_id');
    const clientSecret = await AsyncStorage.getItem('pantryiq_kroger_client_secret');

    if (!clientId || !clientSecret) {
      // Credentials not configured - skip loading stores silently
      return;
    }

    const stores = await krogerService.findNearbyStores(zipCode);
    setNearbyStores(stores);

    if (stores.length > 0 && !selectedStore) {
      setSelectedStore(stores[0].id);
      await apiKeyManager.savePreferredStoreId(stores[0].id);
    }
  };

  const handleManualZip = async () => {
    if (manualZip.length !== 5) return;
    setLoading(true);
    await apiKeyManager.saveUserZipCode(manualZip);
    await loadNearbyStores(manualZip);
    setLocation({
      zipCode: manualZip,
      city: null,
      region: null,
      latitude: 0,
      longitude: 0,
      displayName: manualZip,
      lastUpdated: new Date().toISOString(),
    });
    setShowManualEntry(false);
    setLoading(false);
    onLocationChange?.({
      zipCode: manualZip,
      city: null,
      region: null,
      latitude: 0,
      longitude: 0,
      displayName: manualZip,
      lastUpdated: new Date().toISOString(),
    });
  };

  return (
    <View
      style={{
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
      }}
    >
      {/* Location header row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16 }}>📍</Text>
          <View>
            <Text
              style={{
                color: Colors.textTertiary,
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 1,
              }}
            >
              SHOPPING LOCATION
            </Text>
            <Text
              style={{
                color: Colors.textPrimary,
                fontSize: 14,
                fontWeight: '700',
                marginTop: 1,
              }}
            >
              {location?.displayName || 'Set your location'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={detectLocation}
            style={{
              backgroundColor: Colors.green,
              borderRadius: BorderRadius.md,
              paddingHorizontal: 12,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.navy} />
            ) : (
              <Text style={{ fontSize: 12 }}>🎯</Text>
            )}
            <Text style={{ color: Colors.navy, fontSize: 12, fontWeight: '700' }}>
              Detect
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowManualEntry(!showManualEntry)}
            style={{
              backgroundColor: Colors.navy,
              borderRadius: BorderRadius.md,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text style={{ color: Colors.textTertiary, fontSize: 12, fontWeight: '600' }}>
              Enter Zip
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Manual zip entry */}
      {showManualEntry ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <TextInput
            value={manualZip}
            onChangeText={setManualZip}
            placeholder="Enter zip code"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            maxLength={5}
            style={{
              flex: 1,
              backgroundColor: Colors.navy,
              borderRadius: BorderRadius.md,
              padding: 12,
              color: Colors.textPrimary,
              fontSize: 16,
              borderWidth: 1,
              borderColor: Colors.border,
              letterSpacing: 4,
            }}
          />
          <Pressable
            onPress={handleManualZip}
            disabled={manualZip.length !== 5}
            style={{
              backgroundColor: manualZip.length === 5 ? Colors.green : Colors.border,
              borderRadius: BorderRadius.md,
              paddingHorizontal: 16,
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: manualZip.length === 5 ? Colors.navy : Colors.textTertiary,
                fontWeight: '700',
              }}
            >
              Go
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Nearby stores selector */}
      {nearbyStores.length > 0 ? (
        <View>
          <Text
            style={{
              color: Colors.textTertiary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            SELECT YOUR STORE
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {nearbyStores.map((store) => (
              <Pressable
                key={store.id}
                onPress={async () => {
                  setSelectedStore(store.id);
                  await apiKeyManager.savePreferredStoreId(store.id);
                  onLocationChange?.({
                    ...location!,
                    storeId: store.id,
                    storeName: store.name,
                  });
                }}
                style={{
                  backgroundColor:
                    selectedStore === store.id ? Colors.green : Colors.navy,
                  borderRadius: BorderRadius.md,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor:
                    selectedStore === store.id ? Colors.green : Colors.border,
                }}
              >
                <Text
                  style={{
                    color: selectedStore === store.id ? Colors.navy : Colors.textPrimary,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {store.name}
                </Text>
                <Text
                  style={{
                    color:
                      selectedStore === store.id ? Colors.navy : Colors.textTertiary,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {store.city}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
