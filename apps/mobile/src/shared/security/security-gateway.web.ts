import type { SecurityGateway } from '@/shared/security/security-gateway.types';

export const securityGateway: SecurityGateway = {
  async authenticate() {
    return { reason: 'unavailable', success: false };
  },
  async getBiometricAvailability() {
    return 'unavailable';
  },
  async setPrivacyProtection() {},
};
