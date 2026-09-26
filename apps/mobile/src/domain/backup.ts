import { z } from 'zod';

export const HIGIO_BACKUP_FORMAT = 'higio.local-backup';
export const HIGIO_BACKUP_FORMAT_VERSION = 2;
export const HIGIO_DATABASE_SCHEMA_VERSION = 3;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const BACKUP_EXCLUDED_SETTING_KEYS = [
  'reminders.scheduled-records.v1',
] as const;

const idSchema = z.string().min(1).max(200);
const textSchema = z.string().max(20_000);
const timestampSchema = z.number().int().nonnegative();
const nullableTimestampSchema = timestampSchema.nullable();
const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const localTimeSchema = z.string().regex(/^\d{2}:\d{2}$/);
const sqliteBooleanSchema = z.union([z.literal(0), z.literal(1)]);

const timestampsSchema = {
  created_at_utc: timestampSchema,
  updated_at_utc: timestampSchema,
  deleted_at_utc: nullableTimestampSchema,
};

const activityRowSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(200),
    description: textSchema,
    category: z.enum([
      'pet-care',
      'oral-care',
      'body-care',
      'hair-care',
      'skin-care',
      'nail-care',
      'grooming',
      'personal-items',
      'supplements',
      'other',
    ]),
    icon: z.string().min(1).max(30),
    color: z.string().min(1).max(30),
    status: z.enum(['active', 'paused', 'archived']),
    sort_order: z.number().int(),
    is_pinned: sqliteBooleanSchema,
    ...timestampsSchema,
  })
  .strict();

const activityStateVersionRowSchema = z
  .object({
    id: idSchema,
    activity_id: idSchema,
    status: z.enum(['active', 'paused', 'archived']),
    valid_from_local_date: localDateSchema,
    valid_to_local_date: localDateSchema.nullable(),
    ...timestampsSchema,
  })
  .strict();

const scheduleVersionRowSchema = z
  .object({
    id: idSchema,
    activity_id: idSchema,
    dose_label: z.string().max(80).nullable(),
    type: z.enum(['daily_slots', 'weekdays', 'interval', 'unscheduled']),
    timezone: z.string().min(1).max(100),
    valid_from_local_date: localDateSchema,
    valid_to_local_date: localDateSchema.nullable(),
    interval_every: z.number().int().positive().nullable(),
    interval_unit: z.enum(['day', 'week']).nullable(),
    first_due_local_date: localDateSchema.nullable(),
    ...timestampsSchema,
  })
  .strict();

const scheduleSlotRowSchema = z
  .object({
    id: idSchema,
    schedule_version_id: idSchema,
    label: z.string().min(1).max(200),
    day_part: z.enum(['morning', 'day', 'evening', 'anytime']),
    preferred_minutes: z.number().int().min(0).max(1_439).nullable(),
    sort_order: z.number().int(),
    ...timestampsSchema,
  })
  .strict();

const scheduleWeekdayRowSchema = z
  .object({
    schedule_version_id: idSchema,
    iso_weekday: z.number().int().min(1).max(7),
  })
  .strict();

const activityLogRowSchema = z
  .object({
    id: idSchema,
    activity_id: idSchema,
    schedule_version_id: idSchema.nullable(),
    slot_id: idSchema.nullable(),
    dose_label: z.string().max(80).nullable(),
    occurrence_key: z.string().min(1).max(500).nullable(),
    planned_local_date: localDateSchema.nullable(),
    occurred_at_utc: timestampSchema,
    local_date: localDateSchema,
    local_time: localTimeSchema,
    timezone: z.string().min(1).max(100),
    utc_offset_minutes: z.number().int().min(-840).max(840),
    ...timestampsSchema,
  })
  .strict();

const settingRowSchema = z
  .object({
    key: z.string().min(1).max(200),
    value: z.string().max(500_000),
    updated_at_utc: timestampSchema,
  })
  .strict();

const backupTablesSchema = z
  .object({
    activities: z.array(activityRowSchema),
    activity_state_versions: z.array(activityStateVersionRowSchema),
    schedule_versions: z.array(scheduleVersionRowSchema),
    schedule_slots: z.array(scheduleSlotRowSchema),
    schedule_weekdays: z.array(scheduleWeekdayRowSchema),
    activity_logs: z.array(activityLogRowSchema),
    settings: z.array(settingRowSchema),
  })
  .strict();

const backupDocumentSchema = z
  .object({
    format: z.literal(HIGIO_BACKUP_FORMAT),
    formatVersion: z.literal(HIGIO_BACKUP_FORMAT_VERSION),
    databaseSchemaVersion: z.literal(HIGIO_DATABASE_SCHEMA_VERSION),
    exportedAtUtc: z.string().datetime({ offset: true }),
    source: z
      .object({
        appVersion: z.string().min(1).max(50),
        platform: z.enum(['android', 'ios', 'web', 'unknown']),
        timezone: z.literal('Europe/Zagreb'),
      })
      .strict(),
    tables: backupTablesSchema,
  })
  .strict();

const legacyDocumentSchema = backupDocumentSchema.extend({
  formatVersion: z.literal(1),
  databaseSchemaVersion: z.literal(2),
  tables: backupTablesSchema.extend({
    activities: z.array(
      activityRowSchema.extend({
        category: activityRowSchema.shape.category.exclude(['supplements']),
      }),
    ),
    schedule_versions: z.array(
      scheduleVersionRowSchema.omit({ dose_label: true }),
    ),
    activity_logs: z.array(activityLogRowSchema.omit({ dose_label: true })),
  }),
});

export type HigioBackupTables = z.infer<typeof backupTablesSchema>;
export type HigioBackupDocument = z.infer<typeof backupDocumentSchema>;

export type BackupSummary = {
  activities: number;
  exportedAtUtc: string;
  logs: number;
  settings: number;
};

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

function getUtf8ByteLength(value: string) {
  let bytes = 0;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }

  return bytes;
}

function assertUnique(values: string[], label: string) {
  if (new Set(values).size !== values.length) {
    throw new BackupValidationError(
      `Sigurnosna kopija sadrži duplicirani zapis u skupu ${label}.`,
    );
  }
}

function assertBackupRelations(tables: HigioBackupTables) {
  assertUnique(
    tables.activities.map((row) => row.id),
    'aktivnosti',
  );
  assertUnique(
    tables.activity_state_versions.map((row) => row.id),
    'stanja aktivnosti',
  );
  assertUnique(
    tables.schedule_versions.map((row) => row.id),
    'rasporeda',
  );
  assertUnique(
    tables.schedule_slots.map((row) => row.id),
    'termina rasporeda',
  );
  assertUnique(
    tables.activity_logs.map((row) => row.id),
    'povijesti',
  );
  assertUnique(
    tables.settings.map((row) => row.key),
    'postavki',
  );
  assertUnique(
    tables.schedule_weekdays.map(
      (row) => `${row.schedule_version_id}:${row.iso_weekday}`,
    ),
    'dana rasporeda',
  );
  assertUnique(
    tables.activity_logs.flatMap((row) =>
      row.occurrence_key ? [row.occurrence_key] : [],
    ),
    'planiranih izvršenja',
  );

  if (
    tables.settings.some((row) =>
      BACKUP_EXCLUDED_SETTING_KEYS.includes(
        row.key as (typeof BACKUP_EXCLUDED_SETTING_KEYS)[number],
      ),
    )
  ) {
    throw new BackupValidationError(
      'Sigurnosna kopija sadrži postavku vezanu uz drugi uređaj.',
    );
  }

  const activityIds = new Set(tables.activities.map((row) => row.id));
  const schedulesById = new Map(
    tables.schedule_versions.map((row) => [row.id, row]),
  );
  const slotsById = new Map(tables.schedule_slots.map((row) => [row.id, row]));

  for (const row of tables.activity_state_versions) {
    if (!activityIds.has(row.activity_id)) {
      throw new BackupValidationError(
        'Sigurnosna kopija sadrži stanje za nepoznatu aktivnost.',
      );
    }
  }

  for (const row of tables.schedule_versions) {
    if (!activityIds.has(row.activity_id)) {
      throw new BackupValidationError(
        'Sigurnosna kopija sadrži raspored za nepoznatu aktivnost.',
      );
    }
  }

  for (const row of tables.schedule_slots) {
    if (!schedulesById.has(row.schedule_version_id)) {
      throw new BackupValidationError(
        'Sigurnosna kopija sadrži termin za nepoznati raspored.',
      );
    }
  }

  for (const row of tables.schedule_weekdays) {
    if (!schedulesById.has(row.schedule_version_id)) {
      throw new BackupValidationError(
        'Sigurnosna kopija sadrži dan za nepoznati raspored.',
      );
    }
  }

  for (const row of tables.activity_logs) {
    if (!activityIds.has(row.activity_id)) {
      throw new BackupValidationError(
        'Sigurnosna kopija sadrži zapis za nepoznatu aktivnost.',
      );
    }

    const schedule = row.schedule_version_id
      ? schedulesById.get(row.schedule_version_id)
      : undefined;
    const slot = row.slot_id ? slotsById.get(row.slot_id) : undefined;

    if (row.schedule_version_id && !schedule) {
      throw new BackupValidationError(
        'Sigurnosna kopija sadrži zapis za nepoznati raspored.',
      );
    }
    if (row.slot_id && !slot) {
      throw new BackupValidationError(
        'Sigurnosna kopija sadrži zapis za nepoznati termin.',
      );
    }
    if (slot && row.schedule_version_id !== slot.schedule_version_id) {
      throw new BackupValidationError(
        'Sigurnosna kopija povezuje zapis s pogrešnim terminom.',
      );
    }
    if (schedule && schedule.activity_id !== row.activity_id) {
      throw new BackupValidationError(
        'Sigurnosna kopija povezuje zapis s pogrešnom aktivnošću.',
      );
    }
  }
}

export function createBackupDocument(
  tables: HigioBackupTables,
  metadata: {
    appVersion: string;
    exportedAtUtc?: Date;
    platform: HigioBackupDocument['source']['platform'];
  },
): HigioBackupDocument {
  const document = backupDocumentSchema.parse({
    databaseSchemaVersion: HIGIO_DATABASE_SCHEMA_VERSION,
    exportedAtUtc: (metadata.exportedAtUtc ?? new Date()).toISOString(),
    format: HIGIO_BACKUP_FORMAT,
    formatVersion: HIGIO_BACKUP_FORMAT_VERSION,
    source: {
      appVersion: metadata.appVersion,
      platform: metadata.platform,
      timezone: 'Europe/Zagreb',
    },
    tables,
  });

  assertBackupRelations(document.tables);
  return document;
}

export function parseBackupDocument(value: string): HigioBackupDocument {
  if (getUtf8ByteLength(value) > MAX_BACKUP_BYTES) {
    throw new BackupValidationError(
      'Sigurnosna kopija je veća od podržanih 5 MB.',
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(value) as unknown;
  } catch {
    throw new BackupValidationError(
      'Odabrana datoteka nije valjana Higio JSON sigurnosna kopija.',
    );
  }

  const legacy = legacyDocumentSchema.safeParse(json);
  if (legacy.success) {
    return createBackupDocument(
      {
        ...legacy.data.tables,
        schedule_versions: legacy.data.tables.schedule_versions.map((row) => ({
          ...row,
          dose_label: null,
        })),
        activity_logs: legacy.data.tables.activity_logs.map((row) => ({
          ...row,
          dose_label: null,
        })),
      },
      {
        ...legacy.data.source,
        exportedAtUtc: new Date(legacy.data.exportedAtUtc),
      },
    );
  }
  const result = backupDocumentSchema.safeParse(json);
  if (!result.success) {
    throw new BackupValidationError(
      'Sigurnosna kopija nije podržane verzije ili joj nedostaju obvezni podatci.',
    );
  }

  assertBackupRelations(result.data.tables);
  return result.data;
}

export function summarizeBackup(backup: HigioBackupDocument): BackupSummary {
  return {
    activities: backup.tables.activities.length,
    exportedAtUtc: backup.exportedAtUtc,
    logs: backup.tables.activity_logs.length,
    settings: backup.tables.settings.length,
  };
}

export interface BackupStore {
  readonly isAvailable: boolean;
  createBackup(): Promise<HigioBackupDocument>;
  inspectBackup(value: string): BackupSummary;
  restoreBackup(value: string): Promise<BackupSummary>;
}
