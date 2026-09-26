import * as Crypto from 'expo-crypto';
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  type SQL,
} from 'drizzle-orm';

import type { HigioDatabase } from '@/data/db/client';
import {
  activities,
  activityLogs,
  scheduleSlots,
  scheduleVersions,
  scheduleWeekdays,
} from '@/data/db/schema';
import { StoreEvents } from '@/data/store-events';
import type { ActivityCategory } from '@/domain/activities';
import type {
  HistoryActivityOption,
  HistoryEntry,
  HistoryFilters,
  HistoryStore,
  ManualHistoryLogDraft,
  PlannedLogCandidate,
} from '@/domain/history-store';
import {
  generateOccurrencesForDate,
  type ScheduleDefinition,
} from '@/domain/schedules';
import { createZagrebDateTimeSnapshot, type LocalDate } from '@/domain/time';

type EntryRow = {
  activity: typeof activities.$inferSelect;
  log: typeof activityLogs.$inferSelect;
  slotLabel: string | null;
};

function toActivityOption(
  activity: typeof activities.$inferSelect,
): HistoryActivityOption {
  return {
    category: activity.category as ActivityCategory,
    color: activity.color,
    icon: activity.icon,
    id: activity.id,
    name: activity.name,
    status: activity.status,
  };
}

function toEntry(row: EntryRow): HistoryEntry {
  return {
    ...toActivityOption(row.activity),
    doseLabel: row.log.doseLabel,
    activityId: row.activity.id,
    id: row.log.id,
    localDate: row.log.localDate,
    localTime: row.log.localTime,
    occurrenceKey: row.log.occurrenceKey,
    occurredAtUtc: row.log.occurredAtUtc,
    plannedLocalDate: row.log.plannedLocalDate,
    plannedSlotLabel: row.slotLabel,
  };
}

function assertNotFuture(occurredAtUtc: Date) {
  if (occurredAtUtc.getTime() > Date.now() + 60_000) {
    throw new Error('Vrijeme izvršenja ne može biti u budućnosti.');
  }
}

export class SqliteHistoryStore implements HistoryStore {
  constructor(
    private readonly database: HigioDatabase,
    private readonly events: StoreEvents,
  ) {}

  subscribe(listener: () => void) {
    return this.events.subscribe(listener);
  }

  async listActivities(): Promise<HistoryActivityOption[]> {
    return this.database
      .select()
      .from(activities)
      .where(isNull(activities.deletedAtUtc))
      .orderBy(activities.name)
      .all()
      .map(toActivityOption);
  }

  async listEntries(filters: HistoryFilters = {}): Promise<HistoryEntry[]> {
    const conditions: SQL[] = [isNull(activityLogs.deletedAtUtc)];

    if (filters.activityId) {
      conditions.push(eq(activityLogs.activityId, filters.activityId));
    }

    if (filters.category) {
      conditions.push(eq(activities.category, filters.category));
    }

    if (filters.fromLocalDate) {
      conditions.push(gte(activityLogs.localDate, filters.fromLocalDate));
    }

    if (filters.toLocalDate) {
      conditions.push(lte(activityLogs.localDate, filters.toLocalDate));
    }

    const rows = this.database
      .select({
        activity: activities,
        log: activityLogs,
        slotLabel: scheduleSlots.label,
      })
      .from(activityLogs)
      .innerJoin(activities, eq(activityLogs.activityId, activities.id))
      .leftJoin(scheduleSlots, eq(activityLogs.slotId, scheduleSlots.id))
      .where(and(...conditions))
      .orderBy(
        desc(activityLogs.localDate),
        desc(activityLogs.localTime),
        desc(activityLogs.occurredAtUtc),
      )
      .limit(500)
      .all();

    return rows.map(toEntry);
  }

  async listPlannedCandidates(
    activityId: string,
    localDate: LocalDate,
  ): Promise<PlannedLogCandidate[]> {
    const scheduleRows = this.database
      .select()
      .from(scheduleVersions)
      .where(
        and(
          eq(scheduleVersions.activityId, activityId),
          isNull(scheduleVersions.deletedAtUtc),
          lte(scheduleVersions.validFromLocalDate, localDate),
          or(
            isNull(scheduleVersions.validToLocalDate),
            gte(scheduleVersions.validToLocalDate, localDate),
          ),
        ),
      )
      .all();

    if (scheduleRows.length === 0) {
      return [];
    }

    const scheduleIds = scheduleRows.map((schedule) => schedule.id);
    const slots = this.database
      .select()
      .from(scheduleSlots)
      .where(
        and(
          inArray(scheduleSlots.scheduleVersionId, scheduleIds),
          isNull(scheduleSlots.deletedAtUtc),
        ),
      )
      .all();
    const weekdays = this.database
      .select()
      .from(scheduleWeekdays)
      .where(inArray(scheduleWeekdays.scheduleVersionId, scheduleIds))
      .all();
    const logs = this.database
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.activityId, activityId),
          isNull(activityLogs.deletedAtUtc),
        ),
      )
      .orderBy(desc(activityLogs.occurredAtUtc))
      .all();
    const lastPriorCompletion =
      logs.find((log) => log.localDate < localDate)?.localDate ?? null;
    const completedKeys = new Set(
      logs.flatMap((log) => (log.occurrenceKey ? [log.occurrenceKey] : [])),
    );
    const definitions: ScheduleDefinition[] = scheduleRows.map((schedule) => ({
      activityId,
      firstDueLocalDate: schedule.firstDueLocalDate,
      id: schedule.id,
      intervalEvery: schedule.intervalEvery,
      intervalUnit: schedule.intervalUnit,
      lastCompletionLocalDate: lastPriorCompletion,
      slots: slots
        .filter((slot) => slot.scheduleVersionId === schedule.id)
        .map((slot) => ({
          dayPart: slot.dayPart,
          id: slot.id,
          label: slot.label,
          preferredMinutes: slot.preferredMinutes,
          sortOrder: slot.sortOrder,
        })),
      type: schedule.type,
      validFromLocalDate: schedule.validFromLocalDate,
      validToLocalDate: schedule.validToLocalDate,
      weekdays: weekdays
        .filter((weekday) => weekday.scheduleVersionId === schedule.id)
        .map((weekday) => weekday.isoWeekday),
    }));

    return generateOccurrencesForDate(definitions, localDate)
      .filter((occurrence) => !completedKeys.has(occurrence.occurrenceKey))
      .map((occurrence) => ({
        label: occurrence.slotLabel,
        occurrenceKey: occurrence.occurrenceKey,
        plannedLocalDate: occurrence.plannedLocalDate,
        scheduleVersionId: occurrence.scheduleVersionId,
        slotId: occurrence.slotId,
      }));
  }

  async createManualLog(draft: ManualHistoryLogDraft): Promise<HistoryEntry> {
    const snapshot = createZagrebDateTimeSnapshot(
      draft.localDate,
      draft.localTime,
    );
    assertNotFuture(snapshot.occurredAtUtc);

    const activity = this.database
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.id, draft.activityId),
          isNull(activities.deletedAtUtc),
        ),
      )
      .get();

    if (!activity) {
      throw new Error('Odabrana aktivnost više ne postoji.');
    }

    let candidate = draft.plannedCandidate;

    if (candidate) {
      const validCandidates = await this.listPlannedCandidates(
        draft.activityId,
        draft.localDate,
      );
      candidate = validCandidates.find(
        (option) => option.occurrenceKey === candidate?.occurrenceKey,
      );

      if (!candidate) {
        throw new Error('Odabrani planirani termin više nije dostupan.');
      }
    }

    const now = new Date();
    const tombstone = candidate
      ? this.database
          .select()
          .from(activityLogs)
          .where(eq(activityLogs.occurrenceKey, candidate.occurrenceKey))
          .get()
      : undefined;
    const id = tombstone?.id ?? Crypto.randomUUID();
    const doseSchedule = this.database
      .select()
      .from(scheduleVersions)
      .where(
        and(
          eq(scheduleVersions.activityId, draft.activityId),
          isNull(scheduleVersions.deletedAtUtc),
          lte(scheduleVersions.validFromLocalDate, draft.localDate),
          or(
            isNull(scheduleVersions.validToLocalDate),
            gte(scheduleVersions.validToLocalDate, draft.localDate),
          ),
        ),
      )
      .orderBy(desc(scheduleVersions.validFromLocalDate))
      .get();
    const values = {
      doseLabel: doseSchedule?.doseLabel ?? null,
      activityId: draft.activityId,
      deletedAtUtc: null,
      localDate: snapshot.localDate,
      localTime: snapshot.localTime,
      occurredAtUtc: snapshot.occurredAtUtc,
      occurrenceKey: candidate?.occurrenceKey ?? null,
      plannedLocalDate: candidate?.plannedLocalDate ?? null,
      scheduleVersionId: candidate?.scheduleVersionId ?? null,
      slotId: candidate?.slotId ?? null,
      timezone: snapshot.timezone,
      updatedAtUtc: now,
      utcOffsetMinutes: snapshot.utcOffsetMinutes,
    };

    if (tombstone) {
      this.database
        .update(activityLogs)
        .set(values)
        .where(eq(activityLogs.id, tombstone.id))
        .run();
    } else {
      this.database
        .insert(activityLogs)
        .values({
          ...values,
          createdAtUtc: now,
          id,
        })
        .run();
    }

    this.events.emit();
    return this.getEntry(id);
  }

  async updateLogTime(
    id: string,
    localDate: LocalDate,
    localTime: string,
  ): Promise<HistoryEntry> {
    const snapshot = createZagrebDateTimeSnapshot(localDate, localTime);
    assertNotFuture(snapshot.occurredAtUtc);
    const now = new Date();
    const result = this.database
      .update(activityLogs)
      .set({
        localDate: snapshot.localDate,
        localTime: snapshot.localTime,
        occurredAtUtc: snapshot.occurredAtUtc,
        timezone: snapshot.timezone,
        updatedAtUtc: now,
        utcOffsetMinutes: snapshot.utcOffsetMinutes,
      })
      .where(and(eq(activityLogs.id, id), isNull(activityLogs.deletedAtUtc)))
      .run();

    if (result.changes === 0) {
      throw new Error('Zapis više ne postoji.');
    }

    this.events.emit();
    return this.getEntry(id);
  }

  async deleteLog(id: string): Promise<void> {
    const now = new Date();
    const result = this.database
      .update(activityLogs)
      .set({ deletedAtUtc: now, updatedAtUtc: now })
      .where(and(eq(activityLogs.id, id), isNull(activityLogs.deletedAtUtc)))
      .run();

    if (result.changes === 0) {
      throw new Error('Zapis više ne postoji.');
    }

    this.events.emit();
  }

  async restoreLog(id: string): Promise<void> {
    const result = this.database
      .update(activityLogs)
      .set({ deletedAtUtc: null, updatedAtUtc: new Date() })
      .where(eq(activityLogs.id, id))
      .run();

    if (result.changes === 0) {
      throw new Error('Zapis se nije mogao vratiti.');
    }

    this.events.emit();
  }

  private async getEntry(id: string): Promise<HistoryEntry> {
    const row = this.database
      .select({
        activity: activities,
        log: activityLogs,
        slotLabel: scheduleSlots.label,
      })
      .from(activityLogs)
      .innerJoin(activities, eq(activityLogs.activityId, activities.id))
      .leftJoin(scheduleSlots, eq(activityLogs.slotId, scheduleSlots.id))
      .where(and(eq(activityLogs.id, id), isNull(activityLogs.deletedAtUtc)))
      .get();

    if (!row) {
      throw new Error('Zapis više ne postoji.');
    }

    return toEntry(row);
  }
}
