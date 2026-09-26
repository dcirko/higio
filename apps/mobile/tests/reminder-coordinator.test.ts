import { MemoryReminderStore } from '@/data/memory/memory-reminder-store';
import {
  DEFAULT_REMINDER_PREFERENCES,
  type PlannedReminder,
} from '@/domain/reminders';
import type {
  CompletedOccurrence,
  TodayOccurrence,
  TodayStore,
} from '@/domain/today-store';
import type { LocalDate } from '@/domain/time';
import { ReminderCoordinator } from '@/features/reminders/reminder-coordinator';
import type {
  NotificationGateway,
  NotificationPermissionState,
  ScheduledNativeNotification,
} from '@/shared/notifications/notification-types';

class FakeNotificationGateway implements NotificationGateway {
  readonly cancelled: string[] = [];
  readonly scheduled: PlannedReminder[] = [];
  permission: NotificationPermissionState = 'granted';
  private native = new Map<string, ScheduledNativeNotification>();

  async cancel(identifier: string) {
    this.cancelled.push(identifier);
    this.native.delete(identifier);
  }

  consumeInitialUrl() {
    return null;
  }

  async ensureChannel() {}

  async getPermissionState() {
    return this.permission;
  }

  async getScheduledNotifications() {
    return [...this.native.values()];
  }

  async openSystemSettings() {}

  async requestPermission() {
    return this.permission;
  }

  async schedule(reminder: PlannedReminder) {
    const identifier = `native-${this.scheduled.length + 1}`;
    this.scheduled.push(reminder);
    this.native.set(identifier, {
      data: reminder.data,
      identifier,
    });
    return identifier;
  }

  subscribeToResponses() {
    return () => undefined;
  }
}

class FakeTodayStore implements TodayStore {
  completedDates = new Set<LocalDate>();

  async completeOccurrence(): Promise<CompletedOccurrence> {
    throw new Error('Nije potrebno u ovom testu.');
  }

  async loadDay(localDate: LocalDate): Promise<TodayOccurrence[]> {
    return [
      {
        activityId: 'teeth',
        color: '#217D5C',
        completedAtLocalTime: this.completedDates.has(localDate)
          ? '08:01'
          : null,
        completedLogId: this.completedDates.has(localDate) ? 'log-1' : null,
        countsTowardProgress: true,
        dayPart: 'morning',
        icon: '🪥',
        isOverdue: false,
        isPlanned: true,
        isRepeatable: false,
        lastDone: null,
        occurrenceKey: `teeth:morning:${localDate}`,
        plannedLocalDate: localDate,
        scheduleVersionId: 'teeth:schedule',
        slotId: 'teeth:morning',
        slotLabel: 'Jutarnji termin',
        sortOrder: 10,
        title: 'Pranje zubi',
      },
    ];
  }

  async undoCompletion() {}
}

describe('ReminderCoordinator', () => {
  it('keeps matching native notifications without creating duplicates', async () => {
    const store = new MemoryReminderStore({
      preferences: {
        ...DEFAULT_REMINDER_PREFERENCES,
        enabled: true,
      },
    });
    const todayStore = new FakeTodayStore();
    const gateway = new FakeNotificationGateway();
    const coordinator = new ReminderCoordinator(store, todayStore, gateway);
    const now = new Date('2026-08-01T05:00:00.000Z');

    const first = await coordinator.reconcile(now);
    const second = await coordinator.reconcile(now);

    expect(first.scheduledCount).toBe(28);
    expect(second.scheduledCount).toBe(28);
    expect(gateway.scheduled).toHaveLength(28);
    expect(gateway.cancelled).toHaveLength(0);
  });

  it('cancels stale reminders after completion and time changes', async () => {
    const store = new MemoryReminderStore({
      preferences: {
        ...DEFAULT_REMINDER_PREFERENCES,
        enabled: true,
      },
    });
    const todayStore = new FakeTodayStore();
    const gateway = new FakeNotificationGateway();
    const coordinator = new ReminderCoordinator(store, todayStore, gateway);
    const now = new Date('2026-08-01T05:00:00.000Z');

    await coordinator.reconcile(now);
    todayStore.completedDates.add('2026-08-01');
    await coordinator.reconcile(now);
    expect(gateway.cancelled).toContain('native-1');
    expect(gateway.cancelled).toContain('native-2');
    expect(
      (await store.loadScheduledRecords()).some((record) =>
        record.key.includes('2026-08-01'),
      ),
    ).toBe(false);

    const preferences = await store.loadPreferences();
    await store.savePreferences({
      ...preferences,
      slots: {
        ...preferences.slots,
        morning: { enabled: true, time: '09:00' },
      },
    });
    await coordinator.reconcile(now);

    expect(gateway.cancelled.length).toBeGreaterThanOrEqual(14);
    expect(await store.loadScheduledRecords()).toHaveLength(26);

    todayStore.completedDates.delete('2026-08-01');
    await coordinator.reconcile(now);
    expect(await store.loadScheduledRecords()).toHaveLength(28);
    expect(
      (await store.loadScheduledRecords()).some(
        (record) => record.key === 'higio:v1:2026-08-01:unfinished',
      ),
    ).toBe(true);
  });

  it('cancels owned reminders when permission is removed', async () => {
    const store = new MemoryReminderStore({
      preferences: {
        ...DEFAULT_REMINDER_PREFERENCES,
        enabled: true,
      },
    });
    const todayStore = new FakeTodayStore();
    const gateway = new FakeNotificationGateway();
    const coordinator = new ReminderCoordinator(store, todayStore, gateway);
    const now = new Date('2026-08-01T05:00:00.000Z');

    await coordinator.reconcile(now);
    gateway.permission = 'denied';
    const result = await coordinator.reconcile(now);

    expect(result.scheduledCount).toBe(0);
    expect(gateway.cancelled).toHaveLength(28);
    expect(await store.loadScheduledRecords()).toEqual([]);
  });
});
