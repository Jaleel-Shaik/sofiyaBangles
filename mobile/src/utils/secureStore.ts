import { Platform } from 'react-native';
import * as ExpoSecureStore from 'expo-secure-store';

/**
 * Universal SecureStore wrapper:
 * - On Native (Android / iOS): Uses encrypted expo-secure-store.
 * - On Web: Uses localStorage with safe fallback for SSR and browser environments.
 * Fixes "ExpoSecureStore.default.getValueWithKeyAsync is not a function" crashes on Web.
 */
export async function getItemAsync(
  key: string,
  options?: ExpoSecureStore.SecureStoreOptions
): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[storage] localStorage.getItem failed for key "${key}":`, e);
    }
    return null;
  }
  try {
    return await ExpoSecureStore.getItemAsync(key, options);
  } catch (e) {
    console.warn(`[storage] SecureStore.getItemAsync failed for key "${key}":`, e);
    return null;
  }
}

export async function setItemAsync(
  key: string,
  value: string,
  options?: ExpoSecureStore.SecureStoreOptions
): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`[storage] localStorage.setItem failed for key "${key}":`, e);
    }
    return;
  }
  try {
    await ExpoSecureStore.setItemAsync(key, value, options);
  } catch (e) {
    console.warn(`[storage] SecureStore.setItemAsync failed for key "${key}":`, e);
  }
}

export async function deleteItemAsync(
  key: string,
  options?: ExpoSecureStore.SecureStoreOptions
): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[storage] localStorage.removeItem failed for key "${key}":`, e);
    }
    return;
  }
  try {
    await ExpoSecureStore.deleteItemAsync(key, options);
  } catch (e) {
    console.warn(`[storage] SecureStore.deleteItemAsync failed for key "${key}":`, e);
  }
}

export async function isAvailableAsync(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' && !!window.localStorage;
  }
  try {
    return await ExpoSecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}
