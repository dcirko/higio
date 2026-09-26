import {
  addCalendarDays,
  differenceInCalendarDays,
  formatLocalDateShort,
  getIsoWeekday,
  type LocalDate,
} from '@/domain/time';

export type ScheduleType =
  'daily_slots' | 'weekdays' | 'interval' | 'unscheduled';

export type DayPart = 'morning' | 'day' | 'evening' | 'anytime';

export type ScheduleSlotDefinition = {
  dayPart: DayPart;
  id: string;
  label: string;
  preferredMinutes: number | null;
  sortOrder: number;
};

export type ScheduleDefinition = {
  activityId: string;
  firstDueLocalDate: LocalDate | null;
  id: string;
  intervalEvery: number | null;
  intervalUnit: 'day' | 'week' | null;
  lastCompletionLocalDate: LocalDate | null;
  slots: ScheduleSlotDefinition[];
  type: ScheduleType;
  validFromLocalDate: LocalDate;
  validToLocalDate: LocalDate | null;
  weekdays: number[];
};

export type PlannedOccurrence = {
  activityId: string;
  dayPart: DayPart;
  isOverdue: boolean;
  occurrenceKey: string;
  plannedLocalDate: LocalDate;
  scheduleVersionId: string;
  slotId: string | null;
  slotLabel: string;
  sortOrder: number;
};

function isActiveOnDate(
  schedule: ScheduleDefinition,
  localDate: LocalDate,
): boolean {
  return (
    schedule.validFromLocalDate <= localDate &&
    (schedule.validToLocalDate === null ||
      schedule.validToLocalDate >= localDate)
  );
}

function occurrenceKey(
  scheduleId: string,
  slotId: string | null,
  localDate: LocalDate,
) {
  return `${scheduleId}:${slotId ?? 'interval'}:${localDate}`;
}

function createSlotOccurrences(
  schedule: ScheduleDefinition,
  localDate: LocalDate,
): PlannedOccurrence[] {
  return schedule.slots
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((slot) => ({
      activityId: schedule.activityId,
      dayPart: slot.dayPart,
      isOverdue: false,
      occurrenceKey: occurrenceKey(schedule.id, slot.id, localDate),
      plannedLocalDate: localDate,
      scheduleVersionId: schedule.id,
      slotId: slot.id,
      slotLabel: slot.label,
      sortOrder: slot.sortOrder,
    }));
}

export function getIntervalDueDate(
  schedule: ScheduleDefinition,
): LocalDate | null {
  const intervalEvery = schedule.intervalEvery;

  if (!intervalEvery || intervalEvery < 1) {
    return null;
  }

  const intervalDays =
    schedule.intervalUnit === 'week' ? intervalEvery * 7 : intervalEvery;
  const anchor = schedule.lastCompletionLocalDate ?? schedule.firstDueLocalDate;

  if (!anchor) {
    return null;
  }

  return schedule.lastCompletionLocalDate
    ? addCalendarDays(anchor, intervalDays)
    : anchor;
}

export function getNextExpectedLocalDate(
  schedule: ScheduleDefinition,
  fromLocalDate: LocalDate,
): LocalDate | null {
  if (schedule.type === 'unscheduled') {
    return null;
  }

  if (
    schedule.validToLocalDate !== null &&
    fromLocalDate > schedule.validToLocalDate
  ) {
    return null;
  }

  const candidate =
    fromLocalDate < schedule.validFromLocalDate
      ? schedule.validFromLocalDate
      : fromLocalDate;

  if (schedule.type === 'daily_slots') {
    return candidate;
  }

  if (schedule.type === 'weekdays') {
    if (schedule.weekdays.length === 0) {
      return null;
    }

    for (let offset = 0; offset < 7; offset += 1) {
      const date = addCalendarDays(candidate, offset);

      if (schedule.weekdays.includes(getIsoWeekday(date))) {
        return date;
      }
    }

    return null;
  }

  return getIntervalDueDate(schedule);
}

export function generateOccurrencesForDate(
  schedules: ScheduleDefinition[],
  localDate: LocalDate,
): PlannedOccurrence[] {
  return schedules
    .flatMap((schedule): PlannedOccurrence[] => {
      if (!isActiveOnDate(schedule, localDate)) {
        return [];
      }

      if (schedule.type === 'daily_slots') {
        return createSlotOccurrences(schedule, localDate);
      }

      if (schedule.type === 'weekdays') {
        return schedule.weekdays.includes(getIsoWeekday(localDate))
          ? createSlotOccurrences(schedule, localDate)
          : [];
      }

      if (schedule.type === 'interval') {
        const dueDate = getIntervalDueDate(schedule);

        if (!dueDate || differenceInCalendarDays(localDate, dueDate) < 0) {
          return [];
        }

        const slot = schedule.slots[0];

        return [
          {
            activityId: schedule.activityId,
            dayPart: slot?.dayPart ?? 'anytime',
            isOverdue: localDate > dueDate,
            occurrenceKey: occurrenceKey(
              schedule.id,
              slot?.id ?? null,
              dueDate,
            ),
            plannedLocalDate: dueDate,
            scheduleVersionId: schedule.id,
            slotId: slot?.id ?? null,
            slotLabel:
              localDate > dueDate
                ? `Na redu od ${formatLocalDateShort(dueDate)}`
                : 'Na redu danas',
            sortOrder: slot?.sortOrder ?? 0,
          },
        ];
      }

      return [];
    })
    .sort((left, right) => {
      const partOrder: Record<DayPart, number> = {
        morning: 0,
        day: 1,
        evening: 2,
        anytime: 3,
      };

      return (
        partOrder[left.dayPart] - partOrder[right.dayPart] ||
        left.sortOrder - right.sortOrder ||
        left.occurrenceKey.localeCompare(right.occurrenceKey)
      );
    });
}
