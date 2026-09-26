import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import type { DayPart, ScheduleType } from '@/domain/schedules';
import type { ActivityStatus } from '@/domain/activities';
import type { LocalDate } from '@/domain/time';

const timestamps = {
  createdAtUtc: integer('created_at_utc', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAtUtc: integer('updated_at_utc', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  deletedAtUtc: integer('deleted_at_utc', { mode: 'timestamp_ms' }),
};

export const activities = sqliteTable(
  'activities',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    category: text('category').notNull(),
    icon: text('icon').notNull(),
    color: text('color').notNull(),
    status: text('status').$type<ActivityStatus>().notNull().default('active'),
    sortOrder: integer('sort_order').notNull().default(0),
    isPinned: integer('is_pinned', { mode: 'boolean' })
      .notNull()
      .default(false),
    ...timestamps,
  },
  (table) => [
    index('activities_active_sort_idx').on(table.deletedAtUtc, table.sortOrder),
  ],
);

export const activityStateVersions = sqliteTable(
  'activity_state_versions',
  {
    id: text('id').primaryKey(),
    activityId: text('activity_id')
      .notNull()
      .references(() => activities.id, { onDelete: 'cascade' }),
    status: text('status').$type<ActivityStatus>().notNull(),
    validFromLocalDate: text('valid_from_local_date')
      .$type<LocalDate>()
      .notNull(),
    validToLocalDate: text('valid_to_local_date').$type<LocalDate>(),
    ...timestamps,
  },
  (table) => [
    index('activity_state_versions_activity_validity_idx').on(
      table.activityId,
      table.validFromLocalDate,
      table.validToLocalDate,
    ),
  ],
);

export const scheduleVersions = sqliteTable(
  'schedule_versions',
  {
    id: text('id').primaryKey(),
    activityId: text('activity_id')
      .notNull()
      .references(() => activities.id, { onDelete: 'cascade' }),
    doseLabel: text('dose_label'),
    type: text('type').$type<ScheduleType>().notNull(),
    timezone: text('timezone').notNull(),
    validFromLocalDate: text('valid_from_local_date')
      .$type<LocalDate>()
      .notNull(),
    validToLocalDate: text('valid_to_local_date').$type<LocalDate>(),
    intervalEvery: integer('interval_every'),
    intervalUnit: text('interval_unit').$type<'day' | 'week'>(),
    firstDueLocalDate: text('first_due_local_date').$type<LocalDate>(),
    ...timestamps,
  },
  (table) => [
    index('schedule_versions_activity_validity_idx').on(
      table.activityId,
      table.validFromLocalDate,
      table.validToLocalDate,
    ),
  ],
);

export const scheduleSlots = sqliteTable(
  'schedule_slots',
  {
    id: text('id').primaryKey(),
    scheduleVersionId: text('schedule_version_id')
      .notNull()
      .references(() => scheduleVersions.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    dayPart: text('day_part').$type<DayPart>().notNull(),
    preferredMinutes: integer('preferred_minutes'),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index('schedule_slots_schedule_sort_idx').on(
      table.scheduleVersionId,
      table.sortOrder,
    ),
  ],
);

export const scheduleWeekdays = sqliteTable(
  'schedule_weekdays',
  {
    scheduleVersionId: text('schedule_version_id')
      .notNull()
      .references(() => scheduleVersions.id, { onDelete: 'cascade' }),
    isoWeekday: integer('iso_weekday').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.scheduleVersionId, table.isoWeekday],
    }),
  ],
);

export const activityLogs = sqliteTable(
  'activity_logs',
  {
    id: text('id').primaryKey(),
    activityId: text('activity_id')
      .notNull()
      .references(() => activities.id, { onDelete: 'cascade' }),
    scheduleVersionId: text('schedule_version_id').references(
      () => scheduleVersions.id,
      { onDelete: 'set null' },
    ),
    slotId: text('slot_id').references(() => scheduleSlots.id, {
      onDelete: 'set null',
    }),
    doseLabel: text('dose_label'),
    occurrenceKey: text('occurrence_key'),
    plannedLocalDate: text('planned_local_date').$type<LocalDate>(),
    occurredAtUtc: integer('occurred_at_utc', {
      mode: 'timestamp_ms',
    }).notNull(),
    localDate: text('local_date').$type<LocalDate>().notNull(),
    localTime: text('local_time').notNull(),
    timezone: text('timezone').notNull(),
    utcOffsetMinutes: integer('utc_offset_minutes').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('activity_logs_occurrence_key_uidx').on(table.occurrenceKey),
    index('activity_logs_activity_time_idx').on(
      table.activityId,
      table.occurredAtUtc,
    ),
    index('activity_logs_local_date_idx').on(
      table.localDate,
      table.deletedAtUtc,
    ),
  ],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAtUtc: integer('updated_at_utc', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const databaseSchema = {
  activities,
  activityLogs,
  activityStateVersions,
  scheduleSlots,
  scheduleVersions,
  scheduleWeekdays,
  settings,
};

export type HigioDatabaseSchema = typeof databaseSchema;
