import { database, sqliteDatabase } from '@/data/db/client';
import { SqliteActivityStore } from '@/data/repositories/sqlite-activity-store';
import { SqliteTodayStore } from '@/data/repositories/sqlite-today-store';
import { SqliteHistoryStore } from '@/data/repositories/sqlite-history-store';
import { SqliteBackupStore } from '@/data/repositories/sqlite-backup-store';
import { StoreEvents } from '@/data/store-events';
import { getCategoryLabel } from '@/domain/activities';
import { buildInsights } from '@/domain/insights';
import { createDraftFromTemplate, TEMPLATE_PACKS } from '@/domain/templates';
import { addCalendarDays } from '@/domain/time';

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

describe('Suplementi through real SQLite repositories', () => {
  const events = new StoreEvents();
  const activities = new SqliteActivityStore(database, events);
  const today = new SqliteTodayStore(database, events);
  const history = new SqliteHistoryStore(database, events);
  const backup = new SqliteBackupStore(events);
  const pack = TEMPLATE_PACKS.find((item) => item.id === 'supplements')!;

  beforeEach(() => {
    sqliteDatabase.execSync(
      'DELETE FROM activity_logs; DELETE FROM schedule_weekdays; DELETE FROM schedule_slots; DELETE FROM schedule_versions; DELETE FROM activity_state_versions; DELETE FROM activities; DELETE FROM settings;',
    );
  });

  async function createPack() {
    return Promise.all(
      pack.activities.map((template) =>
        activities.createActivity(
          createDraftFromTemplate(template, '2026-08-01', addCalendarDays),
          '2026-08-01',
        ),
      ),
    );
  }

  it('creates four daily doses and counts one creatine tap once, with undo', async () => {
    await createPack();
    expect(getCategoryLabel('supplements')).toBe('Suplementi');
    const day = await today.loadDay('2026-08-01');
    expect(day).toHaveLength(4);
    expect(day.every((item) => item.isPlanned && !item.isRepeatable)).toBe(
      true,
    );
    const creatine = day.find((item) => item.title === 'Kreatin')!;
    expect(creatine.doseLabel).toBe('3 tablete');
    const completion = await today.completeOccurrence(
      creatine,
      new Date('2026-08-01T10:00:00Z'),
    );
    await today.completeOccurrence(creatine, new Date('2026-08-01T10:00:01Z'));
    expect(await history.listEntries()).toHaveLength(1);
    expect((await history.listEntries())[0]?.doseLabel).toBe('3 tablete');
    for (const range of [7, 30] as const) {
      const days = await Promise.all(
        Array.from({ length: range }, (_, index) =>
          addCalendarDays('2026-08-01', index),
        ).map(async (localDate) => ({
          localDate,
          occurrences: await today.loadDay(localDate),
        })),
      );
      const result = buildInsights({
        activities: await activities.listActivities(),
        days,
        entries: await history.listEntries(),
        range,
        toLocalDate: addCalendarDays('2026-08-01', range - 1),
      });
      expect(result.completed).toBe(1);
      expect(result.planned).toBe(4 * range);
    }
    await today.undoCompletion(completion.logId);
    expect(await history.listEntries()).toHaveLength(0);
    expect(
      (await today.loadDay('2026-08-01')).find(
        (item) => item.title === 'Kreatin',
      )?.completedLogId,
    ).toBeNull();
  });

  it('preserves dose versions, backdated doses, edited log times and backup restore', async () => {
    const created = (await createPack())[0]!;
    await activities.updateActivity(
      created.id,
      { ...created, schedule: { ...created.schedule, doseLabel: '2 tablete' } },
      '2026-08-02',
    );
    expect(
      (await today.loadDay('2026-08-02')).find(
        (item) => item.activityId === created.id,
      )?.doseLabel,
    ).toBe('3 tablete');
    expect(
      (await today.loadDay('2026-08-03')).find(
        (item) => item.activityId === created.id,
      )?.doseLabel,
    ).toBe('2 tablete');
    const [candidate] = await history.listPlannedCandidates(
      created.id,
      '2026-08-01',
    );
    const entry = await history.createManualLog({
      activityId: created.id,
      localDate: '2026-08-01',
      localTime: '12:00',
      plannedCandidate: candidate,
    });
    expect(entry.doseLabel).toBe('3 tablete');
    expect(
      (await history.updateLogTime(entry.id, '2026-08-01', '13:00')).doseLabel,
    ).toBe('3 tablete');
    const unplanned = await history.createManualLog({
      activityId: created.id,
      localDate: '2026-08-03',
      localTime: '12:00',
    });
    expect(unplanned.doseLabel).toBe('2 tablete');
    const document = await backup.createBackup();
    expect(document.formatVersion).toBe(2);
    await history.deleteLog(entry.id);
    await backup.restoreBackup(JSON.stringify(document));
    expect((await history.listEntries()).map((item) => item.doseLabel)).toEqual(
      ['2 tablete', '3 tablete'],
    );
    expect(
      (await today.loadDay('2026-08-01')).find(
        (item) => item.activityId === created.id,
      )?.completedLogId,
    ).toBe(entry.id);
    expect(
      (await today.loadDay('2026-08-03')).find(
        (item) => item.activityId === created.id,
      )?.doseLabel,
    ).toBe('2 tablete');
  });

  it('rolls back a restore if an insert fails after tables were cleared', async () => {
    await createPack();
    const document = await backup.createBackup();
    sqliteDatabase.execSync(
      "CREATE TRIGGER fail_restore BEFORE INSERT ON activities BEGIN SELECT RAISE(ABORT, 'test failure'); END;",
    );
    try {
      await expect(
        backup.restoreBackup(JSON.stringify(document)),
      ).rejects.toThrow();
      expect(await activities.listActivities()).toHaveLength(4);
    } finally {
      sqliteDatabase.execSync('DROP TRIGGER fail_restore');
    }
  });
});
