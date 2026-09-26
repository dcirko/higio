export type BiometricAvailability =
  'available' | 'not-enrolled' | 'unavailable';

export type AuthenticationResult =
  | { success: true }
  | { reason: 'cancelled' | 'failed' | 'unavailable'; success: false };

export interface SecurityGateway {
  authenticate(): Promise<AuthenticationResult>;
  getBiometricAvailability(): Promise<BiometricAvailability>;
  setPrivacyProtection(enabled: boolean): Promise<void>;
}
