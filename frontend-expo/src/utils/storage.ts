import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS} from '@/src/constants';

/**
 * Utility functions for handling local storage operations
 */

export const storage = {
  /**
   * Store a value in AsyncStorage
   */
  setItem: async <T>(key: string, value: T): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Error storing data:', error);
      throw error;
    }
  },

  /**
   * Retrieve a value from AsyncStorage
   */
  getItem: async <T>(key: string): Promise<T | null> => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error retrieving data:', error);
      return null;
    }
  },

  /**
   * Remove a value from AsyncStorage
   */
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data:', error);
      throw error;
    }
  },

  /**
   * Clear all data from AsyncStorage
   */
  clear: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },

  /**
   * Get all keys from AsyncStorage
   */
  getAllKeys: async (): Promise<readonly string[]> => {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  },
};

// Specific storage functions for common app data
export const userStorage = {
  setToken: (token: string) => storage.setItem(STORAGE_KEYS.USER_TOKEN, token),
  getToken: () => storage.getItem<string>(STORAGE_KEYS.USER_TOKEN),
  removeToken: () => storage.removeItem(STORAGE_KEYS.USER_TOKEN),

  setUserProfile: (profile: any) => storage.setItem(STORAGE_KEYS.USER_PROFILE, profile),
  getUserProfile: () => storage.getItem<any>(STORAGE_KEYS.USER_PROFILE),
  removeUserProfile: () => storage.removeItem(STORAGE_KEYS.USER_PROFILE),

  setOnboardingCompleted: (completed: boolean) => 
    storage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed),
  getOnboardingCompleted: () => 
    storage.getItem<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETED),
};
