import * as SecureStore from 'expo-secure-store';

import {
  DEFAULT_SECURITY_PREFERENCES,
  parseSecurityPreferences,
  type SecurityPreferencesStore,
} from '@/shared/security/security-preferences';

const SECURITY_PREFERENCES_KEY = 'higio.security.preferences.v1';
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const securityPreferencesStore: SecurityPreferencesStore = {
  async load() {
    if (!(await SecureStore.isAvailableAsync())) {
      return { ...DEFAULT_SECURITY_PREFERENCES };
    }

    const stored = await SecureStore.getItemAsync(
      SECURITY_PREFERENCES_KEY,
      STORE_OPTIONS,
    );
    if (!stored) {
      return { ...DEFAULT_SECURITY_PREFERENCES };
    }

    try {
      return parseSecurityPreferences(JSON.parse(stored) as unknown);
    } catch {
      return { ...DEFAULT_SECURITY_PREFERENCES };
    }
  },

  async save(preferences) {
    if (!(await SecureStore.isAvailableAsync())) {
      throw new Error('Sigurno spremanje nije dostupno na ovom uređaju.');
    }

    await SecureStore.setItemAsync(
      SECURITY_PREFERENCES_KEY,
      JSON.stringify(parseSecurityPreferences(preferences)),
      STORE_OPTIONS,
    );
  },
};
