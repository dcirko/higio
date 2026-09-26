import {
  DEFAULT_SECURITY_PREFERENCES,
  parseSecurityPreferences,
} from '@/shared/security/security-preferences';

describe('security preferences', () => {
  it('accepts a complete known configuration', () => {
    expect(
      parseSecurityPreferences({
        appLockEnabled: true,
        privacyProtectionEnabled: false,
      }),
    ).toEqual({
      appLockEnabled: true,
      privacyProtectionEnabled: false,
    });
  });

  it('falls back safely for missing or unknown fields', () => {
    expect(parseSecurityPreferences({ appLockEnabled: true })).toEqual(
      DEFAULT_SECURITY_PREFERENCES,
    );
    expect(
      parseSecurityPreferences({
        appLockEnabled: false,
        privateActivityName: 'Pranje zubi',
        privacyProtectionEnabled: true,
      }),
    ).toEqual(DEFAULT_SECURITY_PREFERENCES);
  });
});
