import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from './apiConfig';

const KEYS = {
  krogerToken: 'pantryiq_kroger_token',
  krogerTokenExpiry: 'pantryiq_kroger_token_expiry',
  krogerStoreId: 'pantryiq_kroger_store_id',
  userZipCode: 'pantryiq_user_zip_code',
  userLocation: 'pantryiq_user_location',
};

export interface UserLocation {
  latitude: number;
  longitude: number;
  zipCode: string | null;
  city: string | null;
  region: string | null;
  displayName: string;
  lastUpdated: string;
}

export const apiKeyManager = {
  async getKrogerToken(): Promise<string | null> {
    try {
      const expiry = await AsyncStorage.getItem(KEYS.krogerTokenExpiry);
      const token = await AsyncStorage.getItem(KEYS.krogerToken);

      if (token && expiry && Date.now() < parseInt(expiry)) {
        return token; // Return cached token if still valid
      }

      // Token expired or missing — get new one
      return await this.refreshKrogerToken();
    } catch (error) {
      console.error('Get Kroger token error:', error);
      return null;
    }
  },

  async refreshKrogerToken(): Promise<string | null> {
    try {
      const credentials = Buffer.from(
        `${API_CONFIG.kroger.clientId}:${API_CONFIG.kroger.clientSecret}`
      ).toString('base64');

      const response = await fetch(API_CONFIG.kroger.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
        body: 'grant_type=client_credentials&scope=product.compact',
      });

      if (!response.ok) {
        console.error(`Token refresh failed: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const token = data.access_token;
      const expiry = Date.now() + (data.expires_in * 1000) - 60000;

      await AsyncStorage.setItem(KEYS.krogerToken, token);
      await AsyncStorage.setItem(KEYS.krogerTokenExpiry, expiry.toString());

      return token;
    } catch (error) {
      console.error('Refresh Kroger token error:', error);
      return null;
    }
  },

  async saveUserZipCode(zip: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.userZipCode, zip);
  },

  async getUserZipCode(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.userZipCode);
  },

  async saveUserLocation(location: UserLocation): Promise<void> {
    await AsyncStorage.setItem(KEYS.userLocation, JSON.stringify(location));
  },

  async getUserLocation(): Promise<UserLocation | null> {
    const stored = await AsyncStorage.getItem(KEYS.userLocation);
    return stored ? JSON.parse(stored) : null;
  },

  async savePreferredStoreId(storeId: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.krogerStoreId, storeId);
  },

  async getPreferredStoreId(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.krogerStoreId);
  },
};
