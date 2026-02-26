import * as Location from 'expo-location';
import { apiKeyManager, type UserLocation } from './apiKeyManager';

export const locationService = {
  async requestAndGetLocation(): Promise<{
    success: boolean;
    location?: UserLocation;
    error?: string;
    fallback?: boolean;
  }> {
    try {
      // Check current permission status
      const { status: existing } = await Location.getForegroundPermissionsAsync();

      if (existing !== 'granted') {
        // Request permission with friendly explanation
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return {
            success: false,
            error: 'Location permission denied',
            fallback: true,
          };
        }
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get zip code
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const zipCode = geocode[0]?.postalCode || null;
      const city = geocode[0]?.city || null;
      const region = geocode[0]?.region || null;

      const locationData: UserLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        zipCode,
        city,
        region,
        displayName: city && region ? `${city}, ${region}` : zipCode || 'Location detected',
        lastUpdated: new Date().toISOString(),
      };

      // Save for future use
      await apiKeyManager.saveUserLocation(locationData);
      if (zipCode) await apiKeyManager.saveUserZipCode(zipCode);

      return { success: true, location: locationData };
    } catch (error) {
      console.error('Location error:', error);
      return { success: false, error: String(error) };
    }
  },

  async getSavedLocation(): Promise<UserLocation | null> {
    return await apiKeyManager.getUserLocation();
  },

  async getZipCode(): Promise<string | null> {
    // Try saved location first
    const saved = await apiKeyManager.getUserZipCode();
    if (saved) return saved;

    // Otherwise request location
    const result = await this.requestAndGetLocation();
    return result.success && result.location ? result.location.zipCode : null;
  },
};
