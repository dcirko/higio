import type { PlannedReminder } from '@/domain/reminders';

export type NotificationPermissionState =
  'undetermined' | 'granted' | 'denied' | 'unavailable';

export type ScheduledNativeNotification = {
  data: Record<string, unknown>;
  identifier: string;
};

export interface NotificationGateway {
  cancel(identifier: string): Promise<void>;
  consumeInitialUrl(): string | null;
  ensureChannel(): Promise<void>;
  getPermissionState(): Promise<NotificationPermissionState>;
  getScheduledNotifications(): Promise<ScheduledNativeNotification[]>;
  openSystemSettings(): Promise<void>;
  requestPermission(): Promise<NotificationPermissionState>;
  schedule(reminder: PlannedReminder): Promise<string>;
  subscribeToResponses(listener: (url: string) => void): () => void;
}
