import { formatLastDone } from '@/domain/occasional-care';
import * as Crypto from 'expo-crypto';
import { and, desc, eq, inArray, isNull, lte, or, gte } from 'drizzle-orm';

import type { HigioDatabase } from '@/data/db/client';
import {
  activities,
  activityLogs,
  activityStateVersions,
  scheduleSlots,
  scheduleVersions,
  scheduleWeekdays,
} from '@/data/db/schema';
import { StoreEvents } from '@/data/store-events';
import {
  generateOccurrencesForDate,
  type ScheduleDefinition,
} from '@/domain/schedules';
import type {
  CompletedOccurrence,
  TodayOccurrence,
  TodayStore,
} from '@/domain/today-store';
import { getZagrebDateTimeSnapshot, type LocalDate } from '@/domain/time';

export class SqliteTodayStore implements TodayStore {
  constructor(
    private readonly database: HigioDatabase,
    private readonly events: StoreEvents,
  ) {}

  subscribe(listener: () => void) {
    return this.events.subscribe(listener);
  }

  async loadDay(localDate: LocalDate): Promise<TodayOccurrence[]> {
    const scheduleRows = this.database
      .select({
        activity: activities,
        schedule: scheduleVersions,
      })
      .from(scheduleVersions)
      .innerJoin(activities, eq(scheduleVersions.activityId, activities.id))
      .where(
        and(
          isNull(activities.deletedAtUtc),
          isNull(scheduleVersions.deletedAtUtc),
          lte(scheduleVersions.validFromLocalDate, localDate),
          or(
            isNull(scheduleVersions.validToLocalDate),
            gte(scheduleVersions.validToLocalDate, localDate),
          ),
        ),
      )
      .all();
    const scheduleIds = scheduleRows.map((row) => row.schedule.id);
    const activityIds = [
      ...new Set(scheduleRows.map((row) => row.activity.id)),
    ];
    const slotRows =
      scheduleIds.length === 0
        ? []
        : this.database
            .select()
            .from(scheduleSlots)
            .where(
              and(
                inArray(scheduleSlots.scheduleVersionId, scheduleIds),
                isNull(scheduleSlots.deletedAtUtc),
              ),
            )
            .all();
    const weekdayRows =
      scheduleIds.length === 0
        ? []
        : this.database
            .select()
            .from(scheduleWeekdays)
            .where(inArray(scheduleWeekdays.scheduleVersionId, scheduleIds))
            .all();
    const logRows =
      activityIds.length === 0
        ? []
        : this.database
            .select()
            .from(activityLogs)
            .where(
              and(
                inArray(activityLogs.activityId, activityIds),
                isNull(activityLogs.deletedAtUtc),
              ),
            )
            .orderBy(desc(activityLogs.occurredAtUtc))
            .all();
    const stateRows =
      activityIds.length === 0
        ? []
        : this.database
            .select()
            .from(activityStateVersions)
            .where(
              and(
                inArray(activityStateVersions.activityId, activityIds),
                lte(activityStateVersions.validFromLocalDate, localDate),
                or(
                  isNull(activityStateVersions.validToLocalDate),
                  gte(activityStateVersions.validToLocalDate, localDate),
                ),
              ),
            )
            .all();
    const statusByActivity = new Map(
      stateRows.map((state) => [state.activityId, state.status]),
    );

    const latestLogByActivity = new Map<string, (typeof logRows)[number]>();
    const latestPriorLogByActivity = new Map<
      string,
      (typeof logRows)[number]
    >();
    const activeLogByOccurrence = new Map<string, (typeof logRows)[number]>();

    for (const log of logRows) {
      if (
        log.localDate <= localDate &&
        !latestLogByActivity.has(log.activityId)
      ) {
        latestLogByActivity.set(log.activityId, log);
      }

      if (
        log.localDate < localDate &&
        !latestPriorLogByActivity.has(log.activityId)
      ) {
        latestPriorLogByActivity.set(log.activityId, log);
      }

      if (log.occurrenceKey) {
        activeLogByOccurrence.set(log.occurrenceKey, log);
      }
    }

    const definitions: ScheduleDefinition[] = scheduleRows.map(
      ({ activity, schedule }) => ({
        activityId: activity.id,
        firstDueLocalDate: schedule.firstDueLocalDate,
        id: schedule.id,
        intervalEvery: schedule.intervalEvery,
        intervalUnit: schedule.intervalUnit,
        lastCompletionLocalDate:
          latestPriorLogByActivity.get(activity.id)?.localDate ?? null,
        slots: slotRows
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
        weekdays: weekdayRows
          .filter((weekday) => weekday.scheduleVersionId === schedule.id)
          .map((weekday) => weekday.isoWeekday),
      }),
    );
    const activityById = new Map(
      scheduleRows.map((row) => [row.activity.id, row.activity]),
    );

    const plannedOccurrences = generateOccurrencesForDate(
      definitions,
      localDate,
    )
      .map((occurrence) => {
        const activity = activityById.get(occurrence.activityId);
        const completion = activeLogByOccurrence.get(occurrence.occurrenceKey);
        const latestLog = latestLogByActivity.get(occurrence.activityId);

        if (!activity) {
          throw new Error(
            `Nedostaje aktivnost ${occurrence.activityId} za planirani termin.`,
          );
        }

        return {
          ...occurrence,
          doseLabel: completion
            ? completion.doseLabel
            : (scheduleRows.find(
                (row) => row.schedule.id === occurrence.scheduleVersionId,
              )?.schedule.doseLabel ?? null),
          completedAtLocalTime: completion?.localTime ?? null,
          completedLogId: completion?.id ?? null,
          color: activity.color,
          category: activity.category,
          countsTowardProgress: true,
          icon: activity.icon,
          isPlanned: true,
          isRepeatable: false,
          lastDone: latestLog
            ? formatLastDone(latestLog.localDate, latestLog.localTime)
            : null,
          title: activity.name,
          activityStatus: statusByActivity.get(activity.id) ?? activity.status,
        };
      })
      .filter(
        (occurrence) =>
          occurrence.activityStatus === 'active' ||
          occurrence.completedLogId !== null,
      )
      .map(({ activityStatus: _activityStatus, ...occurrence }) => occurrence);

    const quickActivities: TodayOccurrence[] = scheduleRows
      .filter(
        ({ activity, schedule }) =>
          (statusByActivity.get(activity.id) ?? activity.status) === 'active' &&
          schedule.type === 'unscheduled',
      )
      .map(({ activity, schedule }) => {
        const latestLog = latestLogByActivity.get(activity.id);

        return {
          activityId: activity.id,
          doseLabel: schedule.doseLabel,
          color: activity.color,
          category: activity.category,
          completedAtLocalTime: null,
          completedLogId: null,
          countsTowardProgress: false,
          dayPart: 'anytime',
          icon: activity.icon,
          isOverdue: false,
          isPlanned: false,
          isRepeatable: true,
          lastDone: latestLog
            ? formatLastDone(latestLog.localDate, latestLog.localTime)
            : null,
          occurrenceKey: `${schedule.id}:quick:${localDate}`,
          plannedLocalDate: null,
          scheduleVersionId: schedule.id,
          slotId: null,
          slotLabel: 'Zadnji put: još nije evidentirano',
          sortOrder: 1_000,
          title: activity.name,
        };
      });

    return [...plannedOccurrences, ...quickActivities];
  }

  async completeOccurrence(
    occurrence: TodayOccurrence,
    occurredAt = new Date(),
  ): Promise<CompletedOccurrence> {
    const snapshot = getZagrebDateTimeSnapshot(occurredAt);

    const completion = this.database.transaction((transaction) => {
      if (!occurrence.isPlanned) {
        const now = new Date();
        const logId = Crypto.randomUUID();

        transaction
          .insert(activityLogs)
          .values({
            doseLabel: occurrence.doseLabel ?? null,
            activityId: occurrence.activityId,
            createdAtUtc: now,
            deletedAtUtc: null,
            id: logId,
            localDate: snapshot.localDate,
            localTime: snapshot.localTime,
            occurredAtUtc: snapshot.occurredAtUtc,
            occurrenceKey: null,
            plannedLocalDate: null,
            scheduleVersionId: occurrence.scheduleVersionId,
            slotId: null,
            timezone: snapshot.timezone,
            updatedAtUtc: now,
            utcOffsetMinutes: snapshot.utcOffsetMinutes,
          })
          .run();

        return {
          localTime: snapshot.localTime,
          logId,
          occurrenceKey: occurrence.occurrenceKey,
          title: occurrence.title,
        };
      }

      const existing = transaction
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.occurrenceKey, occurrence.occurrenceKey))
        .get();

      if (existing && existing.deletedAtUtc === null) {
        return {
          localTime: existing.localTime,
          logId: existing.id,
          occurrenceKey: occurrence.occurrenceKey,
          title: occurrence.title,
        };
      }

      const now = new Date();
      const logId = existing?.id ?? Crypto.randomUUID();
      const values = {
        doseLabel: occurrence.doseLabel ?? null,
        activityId: occurrence.activityId,
        deletedAtUtc: null,
        localDate: snapshot.localDate,
        localTime: snapshot.localTime,
        occurredAtUtc: snapshot.occurredAtUtc,
        occurrenceKey: occurrence.occurrenceKey,
        plannedLocalDate: occurrence.plannedLocalDate,
        scheduleVersionId: occurrence.scheduleVersionId,
        slotId: occurrence.slotId,
        timezone: snapshot.timezone,
        updatedAtUtc: now,
        utcOffsetMinutes: snapshot.utcOffsetMinutes,
      };

      if (existing) {
        transaction
          .update(activityLogs)
          .set(values)
          .where(eq(activityLogs.id, existing.id))
          .run();
      } else {
        transaction
          .insert(activityLogs)
          .values({
            ...values,
            createdAtUtc: now,
            id: logId,
          })
          .run();
      }

      return {
        localTime: snapshot.localTime,
        logId,
        occurrenceKey: occurrence.occurrenceKey,
        title: occurrence.title,
      };
    });

    this.events.emit();
    return completion;
  }

  async undoCompletion(logId: string): Promise<void> {
    const now = new Date();

    this.database
      .update(activityLogs)
      .set({
        deletedAtUtc: now,
        updatedAtUtc: now,
      })
      .where(eq(activityLogs.id, logId))
      .run();
    this.events.emit();
  }
}
