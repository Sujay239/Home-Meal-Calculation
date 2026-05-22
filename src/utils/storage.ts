import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const Storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage.getItem error for key:', key, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Storage.setItem error for key:', key, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage.removeItem error for key:', key, error);
    }
  },

  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.clear();
        }
        return;
      }
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage.clear error:', error);
    }
  }
};
