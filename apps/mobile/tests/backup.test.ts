import {
  BackupValidationError,
  createBackupDocument,
  parseBackupDocument,
  summarizeBackup,
  type HigioBackupTables,
} from '@/domain/backup';

const NOW = 1_786_032_000_000;

function createTables(): HigioBackupTables {
  return {
    activities: [
      {
        category: 'oral-care',
        color: 'mint',
        created_at_utc: NOW,
        deleted_at_utc: null,
        description: '',
        icon: 'toothbrush',
        id: 'activity-1',
        is_pinned: 1,
        name: 'Pranje zubi',
        sort_order: 0,
        status: 'active',
        updated_at_utc: NOW,
      },
    ],
    activity_logs: [
      {
        activity_id: 'activity-1',
        created_at_utc: NOW,
        deleted_at_utc: null,
        id: 'log-1',
        local_date: '2026-08-06',
        local_time: '08:00',
        occurred_at_utc: NOW,
        dose_label: null,
        occurrence_key: 'activity-1:2026-08-06:slot-1',
        planned_local_date: '2026-08-06',
        schedule_version_id: 'schedule-1',
        slot_id: 'slot-1',
        timezone: 'Europe/Zagreb',
        updated_at_utc: NOW,
        utc_offset_minutes: 120,
      },
    ],
    activity_state_versions: [
      {
        activity_id: 'activity-1',
        created_at_utc: NOW,
        deleted_at_utc: null,
        id: 'state-1',
        status: 'active',
        updated_at_utc: NOW,
        valid_from_local_date: '2026-08-01',
        valid_to_local_date: null,
      },
    ],
    schedule_slots: [
      {
        created_at_utc: NOW,
        day_part: 'morning',
        deleted_at_utc: null,
        id: 'slot-1',
        label: 'Jutro',
        preferred_minutes: 480,
        schedule_version_id: 'schedule-1',
        sort_order: 0,
        updated_at_utc: NOW,
      },
    ],
    schedule_versions: [
      {
        activity_id: 'activity-1',
        created_at_utc: NOW,
        deleted_at_utc: null,
        dose_label: null,
        first_due_local_date: null,
        id: 'schedule-1',
        interval_every: null,
        interval_unit: null,
        timezone: 'Europe/Zagreb',
        type: 'daily_slots',
        updated_at_utc: NOW,
        valid_from_local_date: '2026-08-01',
        valid_to_local_date: null,
      },
    ],
    schedule_weekdays: [],
    settings: [
      {
        key: 'onboarding.v1',
        updated_at_utc: NOW,
        value: '{"completed":true}',
      },
    ],
  };
}

function createSerializedBackup() {
  return JSON.stringify(
    createBackupDocument(createTables(), {
      appVersion: '0.1.0',
      exportedAtUtc: new Date('2026-08-06T10:00:00.000Z'),
      platform: 'android',
    }),
  );
}

describe('Higio backup format', () => {
  it('explicitly upgrades legacy format 1 without inventing historical doses', () => {
    const legacy = JSON.parse(createSerializedBackup());
    legacy.formatVersion = 1;
    legacy.databaseSchemaVersion = 2;
    for (const row of legacy.tables.schedule_versions) delete row.dose_label;
    for (const row of legacy.tables.activity_logs) delete row.dose_label;
    const result = parseBackupDocument(JSON.stringify(legacy));
    expect(result.formatVersion).toBe(2);
    expect(result.tables.schedule_versions[0]?.dose_label).toBeNull();
    expect(result.tables.activity_logs[0]?.dose_label).toBeNull();
    legacy.tables.activity_logs[0].dose_label = '3 tablete';
    expect(() => parseBackupDocument(JSON.stringify(legacy))).toThrow(
      BackupValidationError,
    );
  });

  it('rejects missing and oversized doses in format 2', () => {
    const backup = JSON.parse(createSerializedBackup());
    backup.tables.schedule_versions[0].dose_label = 'x'.repeat(81);
    expect(() => parseBackupDocument(JSON.stringify(backup))).toThrow(
      BackupValidationError,
    );
    delete backup.tables.schedule_versions[0].dose_label;
    expect(() => parseBackupDocument(JSON.stringify(backup))).toThrow(
      BackupValidationError,
    );
  });

  it('round-trips a valid versioned backup', () => {
    const parsed = parseBackupDocument(createSerializedBackup());

    expect(parsed.formatVersion).toBe(2);
    expect(parsed.databaseSchemaVersion).toBe(3);
    expect(summarizeBackup(parsed)).toEqual({
      activities: 1,
      exportedAtUtc: '2026-08-06T10:00:00.000Z',
      logs: 1,
      settings: 1,
    });
  });

  it('rejects an unsupported format version', () => {
    const value = JSON.parse(createSerializedBackup()) as Record<
      string,
      unknown
    >;
    value.formatVersion = 99;

    expect(() => parseBackupDocument(JSON.stringify(value))).toThrow(
      BackupValidationError,
    );
  });

  it('rejects a broken activity relation before restore', () => {
    const value = JSON.parse(createSerializedBackup()) as {
      tables: HigioBackupTables;
    };
    value.tables.activity_logs[0]!.activity_id = 'missing-activity';

    expect(() => parseBackupDocument(JSON.stringify(value))).toThrow(
      'zapis za nepoznatu aktivnost',
    );
  });

  it('rejects duplicate planned occurrences', () => {
    const value = JSON.parse(createSerializedBackup()) as {
      tables: HigioBackupTables;
    };
    value.tables.activity_logs.push({
      ...value.tables.activity_logs[0]!,
      id: 'log-2',
    });

    expect(() => parseBackupDocument(JSON.stringify(value))).toThrow(
      'duplicirani zapis',
    );
  });

  it('rejects JSON that is not a Higio backup', () => {
    expect(() => parseBackupDocument('{"hello":"world"}')).toThrow(
      BackupValidationError,
    );
  });

  it('rejects notification identifiers tied to another device', () => {
    const value = JSON.parse(createSerializedBackup()) as {
      tables: HigioBackupTables;
    };
    value.tables.settings.push({
      key: 'reminders.scheduled-records.v1',
      updated_at_utc: NOW,
      value: '[]',
    });

    expect(() => parseBackupDocument(JSON.stringify(value))).toThrow(
      'vezanu uz drugi uređaj',
    );
  });
});
