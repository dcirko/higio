import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type {
  SQLiteBindParams,
  SQLiteDatabase,
  SQLiteStatement,
} from 'expo-sqlite';

import { database, sqliteDatabase } from '@/data/db/client';
import { upgradeOccasionalCare } from '@/data/db/upgrade-occasional-care';
import { StoreEvents } from '@/data/store-events';
import {
  BACKUP_EXCLUDED_SETTING_KEYS,
  createBackupDocument,
  parseBackupDocument,
  summarizeBackup,
  type BackupStore,
  type HigioBackupDocument,
  type HigioBackupTables,
} from '@/domain/backup';
import { privacySafeLogger } from '@/shared/observability/privacy-safe-logger';

const DEVICE_ONLY_SETTING_KEYS = new Set<string>(BACKUP_EXCLUDED_SETTING_KEYS);

async function insertRows<T>(
  statement: SQLiteStatement,
  rows: T[],
  bind: (row: T) => SQLiteBindParams,
) {
  for (const row of rows) {
    await statement.executeAsync(bind(row));
  }
}

async function withStatement<T>(
  database: SQLiteDatabase,
  sql: string,
  rows: T[],
  bind: (row: T) => SQLiteBindParams,
) {
  const statement = await database.prepareAsync(sql);
  try {
    await insertRows(statement, rows, bind);
  } finally {
    await statement.finalizeAsync();
  }
}

async function readTables(): Promise<HigioBackupTables> {
  const [
    activityRows,
    stateRows,
    scheduleRows,
    slotRows,
    weekdayRows,
    logRows,
    settingRows,
  ] = await Promise.all([
    sqliteDatabase.getAllAsync<HigioBackupTables['activities'][number]>(
      'SELECT * FROM activities ORDER BY sort_order, id',
    ),
    sqliteDatabase.getAllAsync<
      HigioBackupTables['activity_state_versions'][number]
    >(
      'SELECT * FROM activity_state_versions ORDER BY activity_id, valid_from_local_date, id',
    ),
    sqliteDatabase.getAllAsync<HigioBackupTables['schedule_versions'][number]>(
      'SELECT * FROM schedule_versions ORDER BY activity_id, valid_from_local_date, id',
    ),
    sqliteDatabase.getAllAsync<HigioBackupTables['schedule_slots'][number]>(
      'SELECT * FROM schedule_slots ORDER BY schedule_version_id, sort_order, id',
    ),
    sqliteDatabase.getAllAsync<HigioBackupTables['schedule_weekdays'][number]>(
      'SELECT * FROM schedule_weekdays ORDER BY schedule_version_id, iso_weekday',
    ),
    sqliteDatabase.getAllAsync<HigioBackupTables['activity_logs'][number]>(
      'SELECT * FROM activity_logs ORDER BY occurred_at_utc, id',
    ),
    sqliteDatabase.getAllAsync<HigioBackupTables['settings'][number]>(
      'SELECT * FROM settings ORDER BY key',
    ),
  ]);

  return {
    activities: activityRows,
    activity_state_versions: stateRows,
    schedule_versions: scheduleRows,
    schedule_slots: slotRows,
    schedule_weekdays: weekdayRows,
    activity_logs: logRows,
    settings: settingRows.filter(
      (row) => !DEVICE_ONLY_SETTING_KEYS.has(row.key),
    ),
  };
}

async function replaceTables(
  transaction: SQLiteDatabase,
  tables: HigioBackupTables,
) {
  await transaction.execAsync(`
    DELETE FROM activity_logs;
    DELETE FROM schedule_weekdays;
    DELETE FROM schedule_slots;
    DELETE FROM schedule_versions;
    DELETE FROM activity_state_versions;
    DELETE FROM activities;
    DELETE FROM settings
      WHERE key <> 'reminders.scheduled-records.v1';
  `);

  await withStatement(
    transaction,
    `INSERT INTO activities (
      id, name, description, category, icon, color, status, sort_order,
      is_pinned, created_at_utc, updated_at_utc, deleted_at_utc
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    tables.activities,
    (row) => [
      row.id,
      row.name,
      row.description,
      row.category,
      row.icon,
      row.color,
      row.status,
      row.sort_order,
      row.is_pinned,
      row.created_at_utc,
      row.updated_at_utc,
      row.deleted_at_utc,
    ],
  );

  await withStatement(
    transaction,
    `INSERT INTO activity_state_versions (
      id, activity_id, status, valid_from_local_date, valid_to_local_date,
      created_at_utc, updated_at_utc, deleted_at_utc
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    tables.activity_state_versions,
    (row) => [
      row.id,
      row.activity_id,
      row.status,
      row.valid_from_local_date,
      row.valid_to_local_date,
      row.created_at_utc,
      row.updated_at_utc,
      row.deleted_at_utc,
    ],
  );

  await withStatement(
    transaction,
    `INSERT INTO schedule_versions (
      id, activity_id, type, timezone, valid_from_local_date,
      valid_to_local_date, interval_every, interval_unit,
      first_due_local_date, created_at_utc, updated_at_utc, deleted_at_utc, dose_label
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    tables.schedule_versions,
    (row) => [
      row.id,
      row.activity_id,
      row.type,
      row.timezone,
      row.valid_from_local_date,
      row.valid_to_local_date,
      row.interval_every,
      row.interval_unit,
      row.first_due_local_date,
      row.created_at_utc,
      row.updated_at_utc,
      row.deleted_at_utc,
      row.dose_label,
    ],
  );

  await withStatement(
    transaction,
    `INSERT INTO schedule_slots (
      id, schedule_version_id, label, day_part, preferred_minutes,
      sort_order, created_at_utc, updated_at_utc, deleted_at_utc
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    tables.schedule_slots,
    (row) => [
      row.id,
      row.schedule_version_id,
      row.label,
      row.day_part,
      row.preferred_minutes,
      row.sort_order,
      row.created_at_utc,
      row.updated_at_utc,
      row.deleted_at_utc,
    ],
  );

  await withStatement(
    transaction,
    `INSERT INTO schedule_weekdays (schedule_version_id, iso_weekday)
      VALUES (?, ?)`,
    tables.schedule_weekdays,
    (row) => [row.schedule_version_id, row.iso_weekday],
  );

  await withStatement(
    transaction,
    `INSERT INTO activity_logs (
      id, activity_id, schedule_version_id, slot_id, occurrence_key,
      planned_local_date, occurred_at_utc, local_date, local_time, timezone,
      utc_offset_minutes, created_at_utc, updated_at_utc, deleted_at_utc, dose_label
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    tables.activity_logs,
    (row) => [
      row.id,
      row.activity_id,
      row.schedule_version_id,
      row.slot_id,
      row.occurrence_key,
      row.planned_local_date,
      row.occurred_at_utc,
      row.local_date,
      row.local_time,
      row.timezone,
      row.utc_offset_minutes,
      row.created_at_utc,
      row.updated_at_utc,
      row.deleted_at_utc,
      row.dose_label,
    ],
  );

  await withStatement(
    transaction,
    'INSERT INTO settings (key, value, updated_at_utc) VALUES (?, ?, ?)',
    tables.settings,
    (row) => [row.key, row.value, row.updated_at_utc],
  );

  const foreignKeyErrors = await transaction.getAllAsync(
    'PRAGMA foreign_key_check',
  );
  if (foreignKeyErrors.length > 0) {
    throw new Error('Povrat podataka nije prošao provjeru povezanosti.');
  }
}

export class SqliteBackupStore implements BackupStore {
  readonly isAvailable = true;

  constructor(private readonly events: StoreEvents) {}

  async createBackup(): Promise<HigioBackupDocument> {
    const startedAt = Date.now();
    const platform = ['android', 'ios', 'web'].includes(Platform.OS)
      ? (Platform.OS as 'android' | 'ios' | 'web')
      : 'unknown';

    const backup = createBackupDocument(await readTables(), {
      appVersion: Constants.expoConfig?.version ?? '0.0.0',
      platform,
    });
    privacySafeLogger.metric('backup.export.prepared', Date.now() - startedAt);
    return backup;
  }

  inspectBackup(value: string) {
    return summarizeBackup(parseBackupDocument(value));
  }

  async restoreBackup(value: string) {
    const startedAt = Date.now();
    const backup = parseBackupDocument(value);

    await sqliteDatabase.withExclusiveTransactionAsync((transaction) =>
      replaceTables(transaction, backup.tables),
    );
    upgradeOccasionalCare(database);
    this.events.emit();
    privacySafeLogger.metric(
      'backup.restore.completed',
      Date.now() - startedAt,
    );
    return summarizeBackup(backup);
  }
}
