import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, AppText } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { privacySafeLogger } from '@/shared/observability/privacy-safe-logger';
import { securityGateway } from '@/shared/security/security-gateway';
import type { BiometricAvailability } from '@/shared/security/security-gateway.types';
import {
  DEFAULT_SECURITY_PREFERENCES,
  type SecurityPreferences,
} from '@/shared/security/security-preferences';
import { securityPreferencesStore } from '@/shared/security/security-preferences-store';

type AppSecurityValue = {
  biometricAvailability: BiometricAvailability;
  errorMessage: string | null;
  isAuthenticating: boolean;
  isReady: boolean;
  preferences: SecurityPreferences;
  setAppLockEnabled(enabled: boolean): Promise<boolean>;
  setPrivacyProtectionEnabled(enabled: boolean): Promise<boolean>;
  unlock(): Promise<boolean>;
};

const AppSecurityContext = createContext<AppSecurityValue | null>(null);

function availabilityMessage(availability: BiometricAvailability) {
  if (availability === 'not-enrolled') {
    return 'Prvo postavi otisak prsta ili prepoznavanje lica u postavkama uređaja.';
  }

  return 'Biometrijsko zaključavanje nije dostupno na ovom uređaju.';
}

function AppLockScreen({
  errorMessage,
  isAuthenticating,
  onUnlock,
  visible,
}: {
  errorMessage: string | null;
  isAuthenticating: boolean;
  onUnlock: () => void;
  visible: boolean;
}) {
  const theme = useAppTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => undefined}
      visible={visible}
    >
      <SafeAreaView
        style={[
          styles.lockScreen,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View
          style={[
            styles.lockIcon,
            { backgroundColor: theme.colors.primarySoft },
          ]}
        >
          <AppText tone="primary" variant="display" weight="bold">
            H
          </AppText>
        </View>
        <View style={styles.lockCopy}>
          <AppText accessibilityRole="header" variant="title" weight="bold">
            Higio je zaključan
          </AppText>
          <AppText style={styles.centered} tone="muted">
            Tvoje aktivnosti i povijest ostaju skrivene dok ne potvrdiš svoj
            identitet.
          </AppText>
        </View>
        {isAuthenticating ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <AppButton label="Otključaj" onPress={onUnlock} />
        )}
        {errorMessage ? (
          <AppText
            accessibilityRole="alert"
            style={styles.centered}
            tone="danger"
            variant="caption"
          >
            {errorMessage}
          </AppText>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

export function AppSecurityProvider({ children }: PropsWithChildren) {
  const theme = useAppTheme();
  const [preferences, setPreferences] = useState<SecurityPreferences>({
    ...DEFAULT_SECURITY_PREFERENCES,
  });
  const [biometricAvailability, setBiometricAvailability] =
    useState<BiometricAvailability>('unavailable');
  const [isReady, setIsReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attemptedUnlock = useRef(false);

  const unlock = useCallback(async () => {
    if (isAuthenticating) return false;

    attemptedUnlock.current = true;
    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      const result = await securityGateway.authenticate();
      if (result.success) {
        setIsLocked(false);
        return true;
      }

      if (result.reason !== 'cancelled') {
        setErrorMessage(
          result.reason === 'unavailable'
            ? availabilityMessage(biometricAvailability)
            : 'Identitet nije potvrđen. Pokušaj ponovno.',
        );
      }
      return false;
    } catch (error) {
      privacySafeLogger.error('security.unlock.failed', error);
      setErrorMessage('Otključavanje trenutačno nije uspjelo.');
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [biometricAvailability, isAuthenticating]);

  useEffect(() => {
    let isActive = true;

    void Promise.all([
      securityPreferencesStore.load(),
      securityGateway.getBiometricAvailability(),
    ])
      .then(async ([storedPreferences, availability]) => {
        if (!isActive) return;

        try {
          await securityGateway.setPrivacyProtection(
            storedPreferences.privacyProtectionEnabled,
          );
        } catch (error) {
          privacySafeLogger.error(
            'security.initial-privacy-protection.failed',
            error,
          );
          setErrorMessage(
            'Zaštita prikaza trenutačno se nije mogla primijeniti.',
          );
        }

        if (!isActive) return;
        setPreferences(storedPreferences);
        setBiometricAvailability(availability);
        setIsLocked(storedPreferences.appLockEnabled);
        setIsReady(true);
      })
      .catch((error) => {
        privacySafeLogger.error('security.initialize.failed', error);
        if (isActive) {
          setErrorMessage('Sigurnosne postavke nisu se mogle učitati.');
          setIsReady(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    void securityGateway
      .setPrivacyProtection(preferences.privacyProtectionEnabled)
      .catch((error) => {
        privacySafeLogger.error('security.privacy-protection.failed', error);
        setErrorMessage(
          'Zaštita prikaza trenutačno se nije mogla primijeniti.',
        );
      });
  }, [isReady, preferences.privacyProtectionEnabled]);

  useEffect(() => {
    if (
      isReady &&
      isLocked &&
      preferences.appLockEnabled &&
      !attemptedUnlock.current &&
      AppState.currentState === 'active'
    ) {
      void unlock();
    }
  }, [isLocked, isReady, preferences.appLockEnabled, unlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        attemptedUnlock.current = false;
        if (preferences.appLockEnabled) setIsLocked(true);
        return;
      }

      if (preferences.appLockEnabled && !attemptedUnlock.current) {
        void unlock();
      }
    });

    return () => subscription.remove();
  }, [preferences.appLockEnabled, unlock]);

  const setAppLockEnabled = useCallback(
    async (enabled: boolean) => {
      setErrorMessage(null);

      try {
        if (enabled) {
          const availability = await securityGateway.getBiometricAvailability();
          setBiometricAvailability(availability);
          if (availability !== 'available') {
            setErrorMessage(availabilityMessage(availability));
            return false;
          }
          if (!(await securityGateway.authenticate()).success) {
            setErrorMessage(
              'Zaključavanje nije uključeno jer identitet nije potvrđen.',
            );
            return false;
          }
        }

        const next = { ...preferences, appLockEnabled: enabled };
        await securityPreferencesStore.save(next);
        setPreferences(next);
        setIsLocked(false);
        attemptedUnlock.current = enabled;
        return true;
      } catch (error) {
        privacySafeLogger.error('security.app-lock.update.failed', error);
        setErrorMessage('Postavka zaključavanja nije se mogla spremiti.');
        return false;
      }
    },
    [preferences],
  );

  const setPrivacyProtectionEnabled = useCallback(
    async (enabled: boolean) => {
      setErrorMessage(null);
      const next = { ...preferences, privacyProtectionEnabled: enabled };

      try {
        await securityGateway.setPrivacyProtection(enabled);
        await securityPreferencesStore.save(next);
        setPreferences(next);
        return true;
      } catch (error) {
        privacySafeLogger.error(
          'security.privacy-setting.update.failed',
          error,
        );
        setErrorMessage('Postavka zaštite prikaza nije se mogla spremiti.');
        void securityGateway.setPrivacyProtection(
          preferences.privacyProtectionEnabled,
        );
        return false;
      }
    },
    [preferences],
  );

  const value = useMemo<AppSecurityValue>(
    () => ({
      biometricAvailability,
      errorMessage,
      isAuthenticating,
      isReady,
      preferences,
      setAppLockEnabled,
      setPrivacyProtectionEnabled,
      unlock,
    }),
    [
      biometricAvailability,
      errorMessage,
      isAuthenticating,
      isReady,
      preferences,
      setAppLockEnabled,
      setPrivacyProtectionEnabled,
      unlock,
    ],
  );

  if (!isReady) {
    return (
      <View
        style={[styles.loading, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator color={theme.colors.primary} />
        <AppText tone="muted">Pripremamo privatni prostor…</AppText>
      </View>
    );
  }

  return (
    <AppSecurityContext.Provider value={value}>
      {children}
      <AppLockScreen
        errorMessage={errorMessage}
        isAuthenticating={isAuthenticating}
        onUnlock={() => void unlock()}
        visible={isLocked && preferences.appLockEnabled}
      />
    </AppSecurityContext.Provider>
  );
}

export function useAppSecurity() {
  const value = useContext(AppSecurityContext);
  if (!value) {
    throw new Error('AppSecurity nije dostupan izvan AppSecurityProvidera.');
  }

  return value;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  lockScreen: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xxl,
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  lockIcon: {
    alignItems: 'center',
    borderRadius: 36,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  lockCopy: { alignItems: 'center', gap: spacing.sm },
  centered: { maxWidth: 320, textAlign: 'center' },
});
