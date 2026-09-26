import {
  DEFAULT_REMINDER_PREFERENCES,
  parseReminderPreferences,
  parseScheduledReminderRecords,
  type ReminderPreferences,
  type ReminderStore,
  type ScheduledReminderRecord,
} from '@/domain/reminders';

export type MemoryReminderSnapshot = {
  preferences: ReminderPreferences;
  scheduledRecords: ScheduledReminderRecord[];
};

export class MemoryReminderStore implements ReminderStore {
  private preferences: ReminderPreferences;
  private scheduledRecords: ScheduledReminderRecord[];

  constructor(
    snapshot?: Partial<MemoryReminderSnapshot>,
    private readonly onChange?: (snapshot: MemoryReminderSnapshot) => void,
  ) {
    this.preferences = parseReminderPreferences(
      snapshot?.preferences ?? DEFAULT_REMINDER_PREFERENCES,
    );
    this.scheduledRecords = parseScheduledReminderRecords(
      snapshot?.scheduledRecords,
    );
  }

  async loadPreferences() {
    return parseReminderPreferences(this.preferences);
  }

  async loadScheduledRecords() {
    return this.scheduledRecords.map((record) => ({ ...record }));
  }

  async savePreferences(preferences: ReminderPreferences) {
    this.preferences = parseReminderPreferences(preferences);
    this.notifyChange();
  }

  async saveScheduledRecords(records: ScheduledReminderRecord[]) {
    this.scheduledRecords = records.map((record) => ({ ...record }));
    this.notifyChange();
  }

  private notifyChange() {
    this.onChange?.({
      preferences: this.preferences,
      scheduledRecords: this.scheduledRecords,
    });
  }
}
