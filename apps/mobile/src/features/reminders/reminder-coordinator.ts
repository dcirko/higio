import {
  buildReminderPlan,
  getReminderHorizonDates,
  type ReminderStore,
  type ScheduledReminderRecord,
} from '@/domain/reminders';
import type { TodayStore } from '@/domain/today-store';
import { getCurrentZagrebLocalDate } from '@/domain/time';
import type { NotificationGateway } from '@/shared/notifications/notification-types';

export type ReminderReconcileResult = {
  scheduledCount: number;
};

export class ReminderCoordinator {
  constructor(
    private readonly reminderStore: ReminderStore,
    private readonly todayStore: TodayStore,
    private readonly gateway: NotificationGateway,
  ) {}

  async reconcile(now = new Date()): Promise<ReminderReconcileResult> {
    const [preferences, storedRecords, permission, nativeNotifications] =
      await Promise.all([
        this.reminderStore.loadPreferences(),
        this.reminderStore.loadScheduledRecords(),
        this.gateway.getPermissionState(),
        this.gateway.getScheduledNotifications(),
      ]);
    const ownedNativeNotifications = nativeNotifications.filter(
      (notification) => notification.data.higioOwner === 'higio.reminders.v1',
    );
    const ownedNativeIds = new Set(
      ownedNativeNotifications.map((notification) => notification.identifier),
    );
    const storedNativeIds = new Set(
      storedRecords.map((record) => record.notificationIdentifier),
    );

    for (const notification of ownedNativeNotifications) {
      if (!storedNativeIds.has(notification.identifier)) {
        await this.gateway.cancel(notification.identifier);
      }
    }

    if (!preferences.enabled || permission !== 'granted') {
      await this.cancelStoredRecords(storedRecords);
      await this.reminderStore.saveScheduledRecords([]);
      return { scheduledCount: 0 };
    }

    await this.gateway.ensureChannel();
    const startLocalDate = getCurrentZagrebLocalDate(now);
    const days = await Promise.all(
      getReminderHorizonDates(startLocalDate, preferences.horizonDays).map(
        async (localDate) => ({
          localDate,
          occurrences: await this.todayStore.loadDay(localDate),
        }),
      ),
    );
    const desiredReminders = buildReminderPlan({ days, now, preferences });
    const desiredByKey = new Map(
      desiredReminders.map((reminder) => [reminder.key, reminder]),
    );
    const keptByKey = new Map<string, ScheduledReminderRecord>();

    for (const record of storedRecords) {
      const desired = desiredByKey.get(record.key);
      const canKeep =
        desired?.fingerprint === record.fingerprint &&
        ownedNativeIds.has(record.notificationIdentifier) &&
        !keptByKey.has(record.key);

      if (canKeep) {
        keptByKey.set(record.key, record);
      } else {
        await this.gateway.cancel(record.notificationIdentifier);
      }
    }

    const nextRecords = [...keptByKey.values()];
    let firstError: unknown;

    for (const reminder of desiredReminders) {
      if (keptByKey.has(reminder.key)) {
        continue;
      }

      try {
        const notificationIdentifier = await this.gateway.schedule(reminder);
        nextRecords.push({
          fingerprint: reminder.fingerprint,
          fireAtUtc: reminder.fireAtUtc.toISOString(),
          key: reminder.key,
          notificationIdentifier,
        });
      } catch (error) {
        firstError ??= error;
      }
    }

    nextRecords.sort((left, right) =>
      left.fireAtUtc.localeCompare(right.fireAtUtc),
    );
    await this.reminderStore.saveScheduledRecords(nextRecords);

    if (firstError) {
      throw firstError;
    }

    return { scheduledCount: nextRecords.length };
  }

  private async cancelStoredRecords(records: ScheduledReminderRecord[]) {
    for (const record of records) {
      await this.gateway.cancel(record.notificationIdentifier);
    }
  }
}
