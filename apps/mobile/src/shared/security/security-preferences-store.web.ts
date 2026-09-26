import {
  DEFAULT_SECURITY_PREFERENCES,
  parseSecurityPreferences,
  type SecurityPreferencesStore,
} from '@/shared/security/security-preferences';

const STORAGE_KEY = 'higio.web-preview.security.v1';

export const securityPreferencesStore: SecurityPreferencesStore = {
  async load() {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_SECURITY_PREFERENCES };
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_SECURITY_PREFERENCES };

    try {
      return parseSecurityPreferences(JSON.parse(stored) as unknown);
    } catch {
      return { ...DEFAULT_SECURITY_PREFERENCES };
    }
  },
  async save(preferences) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(parseSecurityPreferences(preferences)),
    );
  },
};
