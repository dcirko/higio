import { eq } from 'drizzle-orm';

import type { HigioDatabase } from '@/data/db/client';
import { settings } from '@/data/db/schema';
import {
  DEFAULT_REMINDER_PREFERENCES,
  parseReminderPreferences,
  parseScheduledReminderRecords,
  type ReminderPreferences,
  type ReminderStore,
  type ScheduledReminderRecord,
} from '@/domain/reminders';

const PREFERENCES_KEY = 'reminders.preferences.v1';
const SCHEDULED_RECORDS_KEY = 'reminders.scheduled-records.v1';

export class SqliteReminderStore implements ReminderStore {
  constructor(private readonly database: HigioDatabase) {}

  async loadPreferences() {
    const value = this.readJson(PREFERENCES_KEY);
    return value === undefined
      ? DEFAULT_REMINDER_PREFERENCES
      : parseReminderPreferences(value);
  }

  async loadScheduledRecords() {
    return parseScheduledReminderRecords(this.readJson(SCHEDULED_RECORDS_KEY));
  }

  async savePreferences(preferences: ReminderPreferences) {
    this.writeJson(PREFERENCES_KEY, parseReminderPreferences(preferences));
  }

  async saveScheduledRecords(records: ScheduledReminderRecord[]) {
    this.writeJson(SCHEDULED_RECORDS_KEY, records);
  }

  private readJson(key: string): unknown {
    const row = this.database
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .get();

    if (!row) {
      return undefined;
    }

    try {
      return JSON.parse(row.value) as unknown;
    } catch {
      return undefined;
    }
  }

  private writeJson(key: string, value: unknown) {
    this.database
      .insert(settings)
      .values({
        key,
        updatedAtUtc: new Date(),
        value: JSON.stringify(value),
      })
      .onConflictDoUpdate({
        set: {
          updatedAtUtc: new Date(),
          value: JSON.stringify(value),
        },
        target: settings.key,
      })
      .run();
  }
}
