import * as Crypto from 'expo-crypto';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';

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
  DAY_PART_OPTIONS,
  type ActivityCategory,
  type ActivityDetails,
  type ActivityDraft,
  type ActivityStatus,
  type ActivityStore,
  type EditableSchedule,
} from '@/domain/activities';
import {
  getNextExpectedLocalDate,
  type DayPart,
  type ScheduleDefinition,
} from '@/domain/schedules';
import {
  addCalendarDays,
  APP_TIME_ZONE,
  getCurrentZagrebLocalDate,
  type LocalDate,
} from '@/domain/time';

function normalizeSchedule(schedule: EditableSchedule): EditableSchedule {
  const dayParts =
    schedule.type === 'unscheduled'
      ? ['anytime' as const]
      : [...new Set(schedule.dayParts)];

  return {
    doseLabel: schedule.doseLabel?.trim() || null,
    dayParts,
    firstDueLocalDate:
      schedule.type === 'interval' ? schedule.firstDueLocalDate : null,
    intervalEvery: schedule.type === 'interval' ? schedule.intervalEvery : null,
    intervalUnit: schedule.type === 'interval' ? schedule.intervalUnit : null,
    startsOnLocalDate: schedule.startsOnLocalDate,
    type: schedule.type,
    weekdays:
      schedule.type === 'weekdays'
        ? [...new Set(schedule.weekdays)].sort((left, right) => left - right)
        : [],
  };
}

function schedulesMatch(
  left: EditableSchedule,
  right: EditableSchedule,
): boolean {
  return (
    JSON.stringify(normalizeSchedule(left)) ===
    JSON.stringify(normalizeSchedule(right))
  );
}

function getSlotLabel(dayPart: DayPart) {
  return (
    DAY_PART_OPTIONS.find((option) => option.id === dayPart)?.slotLabel ??
    'Danas'
  );
}

export class SqliteActivityStore implements ActivityStore {
  constructor(
    private readonly database: HigioDatabase,
    private readonly events: StoreEvents,
  ) {}

  subscribe(listener: () => void) {
    return this.events.subscribe(listener);
  }

  async listActivities(): Promise<ActivityDetails[]> {
    const rows = this.database
      .select()
      .from(activities)
      .where(isNull(activities.deletedAtUtc))
      .orderBy(asc(activities.sortOrder), asc(activities.name))
      .all();

    const details = await Promise.all(
      rows.map((row) => this.getActivity(row.id)),
    );

    return details.filter(
      (activity): activity is ActivityDetails => activity !== null,
    );
  }

  async getActivity(id: string): Promise<ActivityDetails | null> {
    const activity = this.database
      .select()
      .from(activities)
      .where(and(eq(activities.id, id), isNull(activities.deletedAtUtc)))
      .get();

    if (!activity) {
      return null;
    }

    const schedule = this.database
      .select()
      .from(scheduleVersions)
      .where(
        and(
          eq(scheduleVersions.activityId, id),
          isNull(scheduleVersions.validToLocalDate),
          isNull(scheduleVersions.deletedAtUtc),
        ),
      )
      .orderBy(desc(scheduleVersions.validFromLocalDate))
      .get();

    if (!schedule) {
      throw new Error(`Aktivnost ${id} nema aktivnu verziju rasporeda.`);
    }

    const slots = this.database
      .select()
      .from(scheduleSlots)
      .where(
        and(
          eq(scheduleSlots.scheduleVersionId, schedule.id),
          isNull(scheduleSlots.deletedAtUtc),
        ),
      )
      .orderBy(asc(scheduleSlots.sortOrder))
      .all();
    const weekdays = this.database
      .select()
      .from(scheduleWeekdays)
      .where(eq(scheduleWeekdays.scheduleVersionId, schedule.id))
      .all();
    const latestCompletion = this.database
      .select()
      .from(activityLogs)
      .where(
        and(eq(activityLogs.activityId, id), isNull(activityLogs.deletedAtUtc)),
      )
      .orderBy(desc(activityLogs.occurredAtUtc))
      .get();
    const editableSchedule: EditableSchedule = {
      doseLabel: schedule.doseLabel,
      dayParts: slots.map((slot) => slot.dayPart),
      firstDueLocalDate: schedule.firstDueLocalDate,
      intervalEvery: schedule.intervalEvery,
      intervalUnit: schedule.intervalUnit,
      startsOnLocalDate: schedule.validFromLocalDate,
      type: schedule.type,
      weekdays: weekdays.map((weekday) => weekday.isoWeekday),
    };
    const definition: ScheduleDefinition = {
      activityId: activity.id,
      firstDueLocalDate: editableSchedule.firstDueLocalDate,
      id: schedule.id,
      intervalEvery: editableSchedule.intervalEvery,
      intervalUnit: editableSchedule.intervalUnit,
      lastCompletionLocalDate: latestCompletion?.localDate ?? null,
      slots: slots.map((slot) => ({
        dayPart: slot.dayPart,
        id: slot.id,
        label: slot.label,
        preferredMinutes: slot.preferredMinutes,
        sortOrder: slot.sortOrder,
      })),
      type: editableSchedule.type,
      validFromLocalDate: editableSchedule.startsOnLocalDate,
      validToLocalDate: schedule.validToLocalDate,
      weekdays: editableSchedule.weekdays,
    };

    return {
      category: activity.category as ActivityCategory,
      color: activity.color,
      createdAtUtc: activity.createdAtUtc,
      description: activity.description,
      icon: activity.icon,
      id: activity.id,
      name: activity.name,
      nextExpectedLocalDate:
        activity.status === 'active'
          ? getNextExpectedLocalDate(definition, getCurrentZagrebLocalDate())
          : null,
      schedule: editableSchedule,
      status: activity.status,
      updatedAtUtc: activity.updatedAtUtc,
    };
  }

  async reorderActivities(activityIds: string[]): Promise<void> {
    const now = new Date();

    this.database.transaction((transaction) => {
      activityIds.forEach((activityId, index) => {
        transaction
          .update(activities)
          .set({ sortOrder: (index + 1) * 10, updatedAtUtc: now })
          .where(eq(activities.id, activityId))
          .run();
      });
    });
    this.events.emit();
  }

  async createActivity(
    draft: ActivityDraft,
    effectiveLocalDate: LocalDate,
  ): Promise<ActivityDetails> {
    const activityId = Crypto.randomUUID();
    const scheduleId = Crypto.randomUUID();
    const now = new Date();
    const schedule = normalizeSchedule(draft.schedule);

    this.database.transaction((transaction) => {
      transaction
        .insert(activities)
        .values({
          category: draft.category,
          color: draft.color,
          createdAtUtc: now,
          description: draft.description.trim(),
          icon: draft.icon,
          id: activityId,
          name: draft.name.trim(),
          sortOrder: now.getTime(),
          status: 'active',
          updatedAtUtc: now,
        })
        .run();

      transaction
        .insert(activityStateVersions)
        .values({
          activityId,
          createdAtUtc: now,
          id: Crypto.randomUUID(),
          status: 'active',
          updatedAtUtc: now,
          validFromLocalDate: effectiveLocalDate,
        })
        .run();

      this.insertSchedule(
        transaction,
        activityId,
        scheduleId,
        schedule,
        schedule.startsOnLocalDate,
        now,
      );
    });

    this.events.emit();

    const created = await this.getActivity(activityId);

    if (!created) {
      throw new Error('Nova aktivnost nije pronađena nakon spremanja.');
    }

    return created;
  }

  async updateActivity(
    id: string,
    draft: ActivityDraft,
    currentLocalDate: LocalDate,
  ): Promise<ActivityDetails> {
    const existing = await this.getActivity(id);

    if (!existing) {
      throw new Error('Aktivnost više ne postoji.');
    }

    const now = new Date();
    const nextSchedule = normalizeSchedule(draft.schedule);

    this.database.transaction((transaction) => {
      transaction
        .update(activities)
        .set({
          category: draft.category,
          color: draft.color,
          description: draft.description.trim(),
          icon: draft.icon,
          name: draft.name.trim(),
          updatedAtUtc: now,
        })
        .where(eq(activities.id, id))
        .run();

      if (schedulesMatch(existing.schedule, nextSchedule)) {
        return;
      }

      const currentSchedule = transaction
        .select()
        .from(scheduleVersions)
        .where(
          and(
            eq(scheduleVersions.activityId, id),
            isNull(scheduleVersions.validToLocalDate),
            isNull(scheduleVersions.deletedAtUtc),
          ),
        )
        .orderBy(desc(scheduleVersions.validFromLocalDate))
        .get();

      if (!currentSchedule) {
        throw new Error('Nije pronađen raspored koji treba urediti.');
      }

      const nextLocalDate = addCalendarDays(currentLocalDate, 1);
      const nextScheduleStart =
        nextSchedule.startsOnLocalDate > nextLocalDate
          ? nextSchedule.startsOnLocalDate
          : nextLocalDate;
      const versionSchedule: EditableSchedule = {
        ...nextSchedule,
        firstDueLocalDate:
          nextSchedule.type === 'interval' &&
          nextSchedule.firstDueLocalDate !== null &&
          nextSchedule.firstDueLocalDate < nextScheduleStart
            ? nextScheduleStart
            : nextSchedule.firstDueLocalDate,
        startsOnLocalDate: nextScheduleStart,
      };

      if (currentSchedule.validFromLocalDate > currentLocalDate) {
        transaction
          .delete(scheduleSlots)
          .where(eq(scheduleSlots.scheduleVersionId, currentSchedule.id))
          .run();
        transaction
          .delete(scheduleWeekdays)
          .where(eq(scheduleWeekdays.scheduleVersionId, currentSchedule.id))
          .run();
        transaction
          .update(scheduleVersions)
          .set({
            doseLabel: versionSchedule.doseLabel ?? null,
            firstDueLocalDate: versionSchedule.firstDueLocalDate,
            intervalEvery: versionSchedule.intervalEvery,
            intervalUnit: versionSchedule.intervalUnit,
            type: versionSchedule.type,
            updatedAtUtc: now,
            validFromLocalDate: nextScheduleStart,
          })
          .where(eq(scheduleVersions.id, currentSchedule.id))
          .run();
        this.insertScheduleChildren(
          transaction,
          currentSchedule.id,
          versionSchedule,
          now,
        );
        return;
      }

      transaction
        .update(scheduleVersions)
        .set({
          updatedAtUtc: now,
          validToLocalDate: addCalendarDays(nextScheduleStart, -1),
        })
        .where(eq(scheduleVersions.id, currentSchedule.id))
        .run();

      this.insertSchedule(
        transaction,
        id,
        Crypto.randomUUID(),
        versionSchedule,
        nextScheduleStart,
        now,
      );
    });

    this.events.emit();

    const updated = await this.getActivity(id);

    if (!updated) {
      throw new Error('Uređena aktivnost nije pronađena nakon spremanja.');
    }

    return updated;
  }

  async setActivityStatus(
    id: string,
    status: ActivityStatus,
    effectiveLocalDate: LocalDate,
  ): Promise<void> {
    const activity = this.database
      .select()
      .from(activities)
      .where(and(eq(activities.id, id), isNull(activities.deletedAtUtc)))
      .get();

    if (!activity) {
      throw new Error('Aktivnost više ne postoji.');
    }

    if (activity.status === status) {
      return;
    }

    const now = new Date();

    this.database.transaction((transaction) => {
      transaction
        .update(activities)
        .set({ status, updatedAtUtc: now })
        .where(eq(activities.id, id))
        .run();

      const currentState = transaction
        .select()
        .from(activityStateVersions)
        .where(
          and(
            eq(activityStateVersions.activityId, id),
            isNull(activityStateVersions.validToLocalDate),
          ),
        )
        .orderBy(desc(activityStateVersions.validFromLocalDate))
        .get();

      if (currentState?.validFromLocalDate === effectiveLocalDate) {
        transaction
          .update(activityStateVersions)
          .set({ status, updatedAtUtc: now })
          .where(eq(activityStateVersions.id, currentState.id))
          .run();
        return;
      }

      if (currentState) {
        transaction
          .update(activityStateVersions)
          .set({
            updatedAtUtc: now,
            validToLocalDate: addCalendarDays(effectiveLocalDate, -1),
          })
          .where(eq(activityStateVersions.id, currentState.id))
          .run();
      }

      transaction
        .insert(activityStateVersions)
        .values({
          activityId: id,
          createdAtUtc: now,
          id: Crypto.randomUUID(),
          status,
          updatedAtUtc: now,
          validFromLocalDate: effectiveLocalDate,
        })
        .run();
    });

    this.events.emit();
  }

  private insertSchedule(
    transaction: Parameters<Parameters<HigioDatabase['transaction']>[0]>[0],
    activityId: string,
    scheduleId: string,
    schedule: EditableSchedule,
    validFromLocalDate: LocalDate,
    now: Date,
  ) {
    transaction
      .insert(scheduleVersions)
      .values({
        activityId,
        createdAtUtc: now,
        id: scheduleId,
        doseLabel: schedule.doseLabel ?? null,
        firstDueLocalDate: schedule.firstDueLocalDate,
        intervalEvery: schedule.intervalEvery,
        intervalUnit: schedule.intervalUnit,
        timezone: APP_TIME_ZONE,
        type: schedule.type,
        updatedAtUtc: now,
        validFromLocalDate,
      })
      .run();
    this.insertScheduleChildren(transaction, scheduleId, schedule, now);
  }

  private insertScheduleChildren(
    transaction: Parameters<Parameters<HigioDatabase['transaction']>[0]>[0],
    scheduleId: string,
    schedule: EditableSchedule,
    now: Date,
  ) {
    if (schedule.type !== 'unscheduled' && schedule.dayParts.length > 0) {
      transaction
        .insert(scheduleSlots)
        .values(
          schedule.dayParts.map((dayPart, index) => ({
            createdAtUtc: now,
            dayPart,
            id: Crypto.randomUUID(),
            label: getSlotLabel(dayPart),
            preferredMinutes: null,
            scheduleVersionId: scheduleId,
            sortOrder: (index + 1) * 10,
            updatedAtUtc: now,
          })),
        )
        .run();
    }

    if (schedule.type === 'weekdays') {
      transaction
        .insert(scheduleWeekdays)
        .values(
          schedule.weekdays.map((isoWeekday) => ({
            isoWeekday,
            scheduleVersionId: scheduleId,
          })),
        )
        .run();
    }
  }
}
