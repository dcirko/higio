import { database, sqliteDatabase } from '@/data/db/client';
import { upgradeOccasionalCare } from '@/data/db/upgrade-occasional-care';
import { SqliteActivityStore } from '@/data/repositories/sqlite-activity-store';
import { SqliteTodayStore } from '@/data/repositories/sqlite-today-store';
import { SqliteHistoryStore } from '@/data/repositories/sqlite-history-store';
import { SqliteBackupStore } from '@/data/repositories/sqlite-backup-store';
import { StoreEvents } from '@/data/store-events';
import { createDraftFromTemplate, TEMPLATE_PACKS } from '@/domain/templates';
import { addCalendarDays } from '@/domain/time';
import {
  buildReminderPlan,
  DEFAULT_REMINDER_PREFERENCES,
} from '@/domain/reminders';
import { parseBackupDocument } from '@/domain/backup';
import { addDogRoutine, filterTodayScope } from '@/domain/dog';
jest.mock('expo-crypto', () => {
  let sequence = 0;
  return { randomUUID: () => `sqlite-supplement-${++sequence}` };
});

// Real SQLite engine with an Expo-shaped adapter; no native device claim.
jest.mock('@/data/db/client', () => {
  const nativeRequire = jest
    .requireActual('node:module')
    .createRequire(`${process.cwd()}/package.json`);
  const { DatabaseSync } = nativeRequire('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const fs = jest.requireActual('node:fs');
  for (const file of fs
    .readdirSync('drizzle')
    .filter((name: string) => name.endsWith('.sql'))
    .sort()) {
    raw.exec(fs.readFileSync(`drizzle/${file}`, 'utf8'));
  }
  raw.exec('PRAGMA foreign_keys = ON');
  const client = {
    execSync: (sql: string) => raw.exec(sql),
    execAsync: async (sql: string) => raw.exec(sql),
    getAllAsync: async (sql: string) => raw.prepare(sql).all(),
    prepareSync: (sql: string) => ({
      executeSync: (params: unknown[]) => {
        const statement = raw.prepare(sql);
        const result = statement.run(...params);
        return {
          ...result,
          lastInsertRowId: result.lastInsertRowid,
          getAllSync: () => statement.all(...params),
          getFirstSync: () => statement.get(...params),
        };
      },
      executeForRawResultSync: (params: unknown[]) => {
        const statement = raw.prepare(sql);
        statement.setReturnArrays(true);
        return { getAllSync: () => statement.all(...params) };
      },
    }),
    prepareAsync: async (sql: string) => ({
      executeAsync: async (params: unknown[]) =>
        raw.prepare(sql).run(...params),
      finalizeAsync: async () => {},
    }),
    withExclusiveTransactionAsync: async (
      action: (db: unknown) => Promise<void>,
    ) => {
      raw.exec('BEGIN');
      try {
        await action(client);
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return {
    sqliteDatabase: client,
    database: jest.requireActual('drizzle-orm/expo-sqlite').drizzle(client),
  };
});

describe('Occasional care upgrade through SQLite', () => {
  const events = new StoreEvents();
  const activities = new SqliteActivityStore(database, events);
  const today = new SqliteTodayStore(database, events);
  const history = new SqliteHistoryStore(database, events);
  const backup = new SqliteBackupStore(events);
  beforeEach(() =>
    sqliteDatabase.execSync(
      'DELETE FROM activity_logs; DELETE FROM schedule_weekdays; DELETE FROM schedule_slots; DELETE FROM schedule_versions; DELETE FROM activity_state_versions; DELETE FROM activities; DELETE FROM settings;',
    ),
  );
  async function legacy(name: string) {
    const template = TEMPLATE_PACKS.find((p) => p.id === 'oral-basics')!
      .activities[0]!;
    const draft = createDraftFromTemplate(
      template,
      '2026-08-01',
      addCalendarDays,
    );
    return activities.createActivity({ ...draft, name }, '2026-08-01');
  }
  it('preserves logs, removes daily goals and floss, and runs only once', async () => {
    const nails = await legacy('Rezanje noktiju');
    const floss = await legacy('Zubni konac');
    await legacy('Pranje kose');
    const originalDay = await today.loadDay('2026-08-02');
    for (const id of [nails.id, floss.id])
      await today.completeOccurrence(
        originalDay.find((o) => o.activityId === id)!,
        new Date('2026-08-02T08:30:00Z'),
      );
    const previousLogs = (await backup.createBackup()).tables.activity_logs;
    upgradeOccasionalCare(database, '2026-08-02');
    const day = await today.loadDay('2026-08-02');
    expect(day.some((o) => o.activityId === floss.id)).toBe(false);
    const care = day.filter((o) => !o.isPlanned);
    expect(care).toHaveLength(4);
    expect(care.every((o) => !o.isOverdue && !o.countsTowardProgress)).toBe(
      true,
    );
    expect(care.find((o) => o.activityId === nails.id)?.lastDone).toBe(
      'Zadnji put: 02.08.2026. u 10:30',
    );
    expect((await backup.createBackup()).tables.activity_logs).toEqual(
      previousLogs,
    );
    expect(await history.listEntries()).toHaveLength(2);
    expect((await activities.getActivity(floss.id))?.status).toBe('archived');
    expect(
      (await today.loadDay('2026-08-01')).some(
        (o) => o.activityId === nails.id && o.isPlanned,
      ),
    ).toBe(true);
    expect(
      buildReminderPlan({
        days: [{ localDate: '2026-08-02', occurrences: care }],
        now: new Date('2026-08-02T05:00:00Z'),
        preferences: { ...DEFAULT_REMINDER_PREFERENCES, enabled: true },
      }),
    ).toEqual([]);
    const exported = await backup.createBackup();
    expect(() => parseBackupDocument(JSON.stringify(exported))).not.toThrow();
    upgradeOccasionalCare(database, '2026-08-03');
    expect(await backup.createBackup()).toMatchObject({
      tables: exported.tables,
    });
  });
  it('refreshes the last date after logging and undo, without using future logs', async () => {
    await legacy('Brijanje');
    upgradeOccasionalCare(database, '2026-08-02');
    const entry = (await today.loadDay('2026-08-02')).find(
      (o) => o.title === 'Brijanje brade',
    )!;
    expect(entry.lastDone).toBeNull();
    const first = await today.completeOccurrence(
      entry,
      new Date('2026-08-02T09:00:00Z'),
    );
    const second = await today.completeOccurrence(
      entry,
      new Date('2026-08-03T09:00:00Z'),
    );
    expect(
      (await today.loadDay('2026-08-02')).find(
        (o) => o.activityId === entry.activityId,
      )?.lastDone,
    ).toBe('Zadnji put: 02.08.2026. u 11:00');
    await today.undoCompletion(second.logId);
    expect(
      (await today.loadDay('2026-08-03')).find(
        (o) => o.activityId === entry.activityId,
      )?.lastDone,
    ).toBe('Zadnji put: 02.08.2026. u 11:00');
    await today.undoCompletion(first.logId);
    expect(
      (await today.loadDay('2026-08-03')).find(
        (o) => o.activityId === entry.activityId,
      )?.lastDone,
    ).toBeNull();
  });
  it('offers all four unscheduled templates and no floss', () => {
    expect(
      TEMPLATE_PACKS.flatMap((p) => p.activities).some((a) => a.id === 'floss'),
    ).toBe(false);
    const pack = TEMPLATE_PACKS.find((p) => p.id === 'occasional-care')!;
    expect(pack.activities).toHaveLength(4);
    expect(
      pack.activities.every((a) => a.schedule.type === 'unscheduled'),
    ).toBe(true);
  });

  it('keeps the dog routine separate, logs three meals/walks, and preserves it through backup', async () => {
    await legacy('Pranje zubi');
    upgradeOccasionalCare(database, '2026-08-01');
    expect(await addDogRoutine(activities, '2026-08-01')).toBe(4);
    expect(await addDogRoutine(activities, '2026-08-01')).toBe(0);
    const all = await today.loadDay('2026-08-01');
    const dog = filterTodayScope(all, 'dog');
    expect(dog).toHaveLength(8);
    expect(dog.filter((o) => o.title === 'Hrana za psa')).toHaveLength(3);
    expect(dog.filter((o) => o.title === 'Šetnja psa')).toHaveLength(3);
    expect(dog.filter((o) => o.countsTowardProgress)).toHaveLength(6);
    expect(
      filterTodayScope(all, 'personal').every((o) => o.category !== 'pet-care'),
    ).toBe(true);
    const meal = dog.find(
      (o) => o.title === 'Hrana za psa' && o.dayPart === 'morning',
    )!;
    const done = await today.completeOccurrence(
      meal,
      new Date('2026-08-01T07:00:00Z'),
    );
    await today.completeOccurrence(meal, new Date('2026-08-01T07:01:00Z'));
    expect(
      (await history.listEntries()).filter(
        (e) => e.activityId === meal.activityId,
      ),
    ).toHaveLength(1);
    await today.undoCompletion(done.logId);
    expect(
      (await today.loadDay('2026-08-01')).find(
        (o) => o.occurrenceKey === meal.occurrenceKey,
      )?.completedLogId,
    ).toBeNull();
    const bath = dog.find((o) => o.title === 'Kupanje psa')!;
    await today.completeOccurrence(bath, new Date('2026-08-01T07:00:00Z'));
    const saved = await backup.createBackup();
    expect(() => parseBackupDocument(JSON.stringify(saved))).not.toThrow();
    await backup.restoreBackup(JSON.stringify(saved));
    expect(
      (await today.loadDay('2026-08-02')).find(
        (o) => o.activityId === bath.activityId,
      )?.lastDone,
    ).toBe('Zadnji put: 01.08.2026. u 09:00');
    expect((await backup.createBackup()).tables.activity_logs).toEqual(
      saved.tables.activity_logs,
    );
  });

  it('upgrades an old backup immediately and preserves its log records', async () => {
    await legacy('Zubni konac');
    const entry = (await today.loadDay('2026-08-01'))[0]!;
    await today.completeOccurrence(entry, new Date('2026-08-01T07:00:00Z'));
    const old = await backup.createBackup();
    await backup.restoreBackup(JSON.stringify(old));
    const restored = await backup.createBackup();
    expect(restored.tables.activity_logs).toEqual(old.tables.activity_logs);
    expect(
      restored.tables.activities.find((a) => a.name === 'Zubni konac')?.status,
    ).toBe('archived');
    expect(() => parseBackupDocument(JSON.stringify(restored))).not.toThrow();
  });

  it('replaces pending schedules without reviving paused care or duplicating activities', async () => {
    const nails = await legacy('Rezanje noktiju');
    await activities.updateActivity(
      nails.id,
      { ...nails, schedule: { ...nails.schedule, dayParts: ['day'] } },
      '2026-08-02',
    );
    await activities.setActivityStatus(nails.id, 'paused', '2026-08-02');
    const floss = await legacy('Zubni konac');
    await activities.setActivityStatus(floss.id, 'paused', '2026-08-05');
    upgradeOccasionalCare(database, '2026-08-02');
    expect(
      (await activities.listActivities()).filter(
        (a) => a.name === 'Rezanje noktiju',
      ),
    ).toHaveLength(1);
    for (const date of ['2026-08-02', '2026-08-03', '2026-08-06'] as const) {
      const day = await today.loadDay(date);
      expect(
        day.some((o) => o.activityId === nails.id || o.activityId === floss.id),
      ).toBe(false);
    }
    expect((await activities.getActivity(nails.id))?.schedule.type).toBe(
      'unscheduled',
    );
    const exported = await backup.createBackup();
    expect(() => parseBackupDocument(JSON.stringify(exported))).not.toThrow();
  });

  it('rolls back all changes if an insert fails before the marker is saved', async () => {
    await legacy('Rezanje noktiju');
    const original = (await backup.createBackup()).tables;
    sqliteDatabase.execSync(
      "CREATE TRIGGER fail_upgrade BEFORE INSERT ON schedule_versions BEGIN SELECT RAISE(ABORT, 'test failure'); END;",
    );
    try {
      expect(() => upgradeOccasionalCare(database, '2026-08-02')).toThrow();
      expect((await backup.createBackup()).tables).toEqual(original);
    } finally {
      sqliteDatabase.execSync('DROP TRIGGER fail_upgrade;');
    }
    upgradeOccasionalCare(database, '2026-08-02');
    expect(
      (await today.loadDay('2026-08-02')).filter((o) => !o.isPlanned),
    ).toHaveLength(4);
  });
});
