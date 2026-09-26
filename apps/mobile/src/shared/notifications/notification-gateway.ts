import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import type { NotificationGateway } from '@/shared/notifications/notification-types';

const CHANNEL_ID = 'higio-reminders-v2';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function readUrl(data: Record<string, unknown> | undefined) {
  return typeof data?.url === 'string' ? data.url : null;
}

function toPermissionState(
  status: Notifications.NotificationPermissionsStatus,
): 'undetermined' | 'granted' | 'denied' {
  if (Platform.OS === 'ios') {
    const iosStatus = status.ios?.status;

    if (
      iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
    ) {
      return 'granted';
    }

    if (iosStatus === Notifications.IosAuthorizationStatus.DENIED) {
      return 'denied';
    }

    return 'undetermined';
  }

  if (status.granted || status.status === 'granted') {
    return 'granted';
  }

  return status.status === 'denied' ? 'denied' : 'undetermined';
}

class ExpoNotificationGateway implements NotificationGateway {
  async cancel(identifier: string) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  consumeInitialUrl() {
    const response = Notifications.getLastNotificationResponse();
    const url = readUrl(
      response?.notification.request.content.data as
        Record<string, unknown> | undefined,
    );

    if (response) {
      Notifications.clearLastNotificationResponse();
    }

    return url;
  }

  async ensureChannel() {
    if (Platform.OS !== 'android') {
      return;
    }

    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      description: 'Nježni lokalni podsjetnici za planiranu osobnu njegu.',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#217D5C',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      name: 'Higio podsjetnici',
      showBadge: false,
      vibrationPattern: [0, 180],
    });
  }

  async getPermissionState() {
    return toPermissionState(await Notifications.getPermissionsAsync());
  }

  async getScheduledNotifications() {
    const requests = await Notifications.getAllScheduledNotificationsAsync();

    return requests.map((request) => ({
      data: (request.content.data ?? {}) as Record<string, unknown>,
      identifier: request.identifier,
    }));
  }

  async openSystemSettings() {
    await Linking.openSettings();
  }

  async requestPermission() {
    await this.ensureChannel();
    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });

    return toPermissionState(result);
  }

  async schedule(reminder: Parameters<NotificationGateway['schedule']>[0]) {
    return Notifications.scheduleNotificationAsync({
      content: {
        body: reminder.body,
        data: reminder.data,
        sound: 'default',
        title: reminder.title,
      },
      trigger: {
        channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
        date: reminder.fireAtUtc,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
      },
    });
  }

  subscribeToResponses(listener: (url: string) => void) {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const url = readUrl(
          response.notification.request.content.data as Record<string, unknown>,
        );

        if (url) {
          listener(url);
        }
      },
    );

    return () => subscription.remove();
  }
}

export const notificationGateway: NotificationGateway =
  new ExpoNotificationGateway();
