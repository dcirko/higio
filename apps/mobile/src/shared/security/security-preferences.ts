import { z } from 'zod';

export const DEFAULT_SECURITY_PREFERENCES = {
  appLockEnabled: false,
  privacyProtectionEnabled: true,
} as const;

const securityPreferencesSchema = z
  .object({
    appLockEnabled: z.boolean(),
    privacyProtectionEnabled: z.boolean(),
  })
  .strict();

export type SecurityPreferences = z.infer<typeof securityPreferencesSchema>;

export function parseSecurityPreferences(value: unknown): SecurityPreferences {
  const result = securityPreferencesSchema.safeParse(value);
  return result.success ? result.data : { ...DEFAULT_SECURITY_PREFERENCES };
}

export interface SecurityPreferencesStore {
  load(): Promise<SecurityPreferences>;
  save(preferences: SecurityPreferences): Promise<void>;
}
