import type { NotificationGateway } from '@/shared/notifications/notification-types';

export const notificationGateway: NotificationGateway = {
  cancel: async () => undefined,
  consumeInitialUrl: () => null,
  ensureChannel: async () => undefined,
  getPermissionState: async () => 'unavailable',
  getScheduledNotifications: async () => [],
  openSystemSettings: async () => undefined,
  requestPermission: async () => 'unavailable',
  schedule: async () => {
    throw new Error('Lokalne obavijesti nisu dostupne u web previewju.');
  },
  subscribeToResponses: () => () => undefined,
};
