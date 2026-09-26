import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';

import type {
  AuthenticationResult,
  SecurityGateway,
} from '@/shared/security/security-gateway.types';

const SCREEN_CAPTURE_KEY = 'higio-private-content';

class NativeSecurityGateway implements SecurityGateway {
  async getBiometricAvailability() {
    if (!(await LocalAuthentication.hasHardwareAsync())) {
      return 'unavailable' as const;
    }
    if (!(await LocalAuthentication.isEnrolledAsync())) {
      return 'not-enrolled' as const;
    }

    return 'available' as const;
  }

  async authenticate(): Promise<AuthenticationResult> {
    if ((await this.getBiometricAvailability()) !== 'available') {
      return { reason: 'unavailable', success: false };
    }

    const result = await LocalAuthentication.authenticateAsync({
      biometricsSecurityLevel: 'strong',
      cancelLabel: 'Odustani',
      disableDeviceFallback: false,
      fallbackLabel: 'Upotrijebi šifru uređaja',
      promptDescription: 'Otključaj svoje lokalne Higio podatke.',
      promptMessage: 'Otključaj Higio',
    });

    if (result.success) {
      return { success: true };
    }

    if (
      result.error === 'user_cancel' ||
      result.error === 'app_cancel' ||
      result.error === 'system_cancel'
    ) {
      return { reason: 'cancelled', success: false };
    }

    return { reason: 'failed', success: false };
  }

  async setPrivacyProtection(enabled: boolean) {
    if (enabled) {
      await ScreenCapture.preventScreenCaptureAsync(SCREEN_CAPTURE_KEY);
      if (Platform.OS === 'ios') {
        await ScreenCapture.enableAppSwitcherProtectionAsync(0.9);
      }
      return;
    }

    await ScreenCapture.allowScreenCaptureAsync(SCREEN_CAPTURE_KEY);
    if (Platform.OS === 'ios') {
      await ScreenCapture.disableAppSwitcherProtectionAsync();
    }
  }
}

export const securityGateway: SecurityGateway = new NativeSecurityGateway();
