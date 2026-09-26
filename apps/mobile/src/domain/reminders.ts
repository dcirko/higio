import type { TodayOccurrence } from '@/domain/today-store';
import {
  APP_TIME_ZONE,
  addCalendarDays,
  createZagrebDateTimeSnapshot,
  isLocalTime,
  type LocalDate,
} from '@/domain/time';

export const REMINDER_GROUPS = [
  'morning',
  'day',
  'evening',
  'unfinished',
] as const;

export type ReminderGroup = (typeof REMINDER_GROUPS)[number];

export type ReminderSlotPreferences = {
  enabled: boolean;
  time: string;
};

export type ReminderPreferences = {
  enabled: boolean;
  horizonDays: number;
  showActivityNames: boolean;
  slots: Record<ReminderGroup, ReminderSlotPreferences>;
  timezone: typeof APP_TIME_ZONE;
};

export type ScheduledReminderRecord = {
  fingerprint: string;
  fireAtUtc: string;
  key: string;
  notificationIdentifier: string;
};

export type ReminderPlanDay = {
  localDate: LocalDate;
  occurrences: TodayOccurrence[];
};

export type PlannedReminder = {
  body: string;
  data: {
    higioOwner: 'higio.reminders.v1';
    localDate: LocalDate;
    reminderGroup: ReminderGroup;
    url: '/';
  };
  fingerprint: string;
  fireAtUtc: Date;
  key: string;
  title: string;
};

export interface ReminderStore {
  loadPreferences(): Promise<ReminderPreferences>;
  loadScheduledRecords(): Promise<ScheduledReminderRecord[]>;
  savePreferences(preferences: ReminderPreferences): Promise<void>;
  saveScheduledRecords(records: ScheduledReminderRecord[]): Promise<void>;
}

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  enabled: false,
  horizonDays: 14,
  showActivityNames: false,
  slots: {
    morning: { enabled: true, time: '08:00' },
    day: { enabled: false, time: '13:00' },
    evening: { enabled: true, time: '20:30' },
    unfinished: { enabled: true, time: '21:00' },
  },
  timezone: APP_TIME_ZONE,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readSlot(
  value: unknown,
  fallback: ReminderSlotPreferences,
): ReminderSlotPreferences {
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    enabled:
      typeof value.enabled === 'boolean' ? value.enabled : fallback.enabled,
    time:
      typeof value.time === 'string' && isLocalTime(value.time)
        ? value.time
        : fallback.time,
  };
}

export function parseReminderPreferences(value: unknown): ReminderPreferences {
  if (!isRecord(value)) {
    return DEFAULT_REMINDER_PREFERENCES;
  }

  const slots = isRecord(value.slots) ? value.slots : {};

  return {
    enabled:
      typeof value.enabled === 'boolean'
        ? value.enabled
        : DEFAULT_REMINDER_PREFERENCES.enabled,
    horizonDays:
      typeof value.horizonDays === 'number' &&
      Number.isInteger(value.horizonDays) &&
      value.horizonDays >= 1 &&
      value.horizonDays <= 30
        ? value.horizonDays
        : DEFAULT_REMINDER_PREFERENCES.horizonDays,
    showActivityNames:
      typeof value.showActivityNames === 'boolean'
        ? value.showActivityNames
        : DEFAULT_REMINDER_PREFERENCES.showActivityNames,
    slots: {
      unfinished: readSlot(
        slots.unfinished,
        DEFAULT_REMINDER_PREFERENCES.slots.unfinished,
      ),
      morning: readSlot(
        slots.morning,
        DEFAULT_REMINDER_PREFERENCES.slots.morning,
      ),
      day: readSlot(slots.day, DEFAULT_REMINDER_PREFERENCES.slots.day),
      evening: readSlot(
        slots.evening,
        DEFAULT_REMINDER_PREFERENCES.slots.evening,
      ),
    },
    timezone: APP_TIME_ZONE,
  };
}

export function parseScheduledReminderRecords(
  value: unknown,
): ScheduledReminderRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is ScheduledReminderRecord => {
    if (!isRecord(item)) {
      return false;
    }

    return (
      typeof item.fingerprint === 'string' &&
      typeof item.fireAtUtc === 'string' &&
      !Number.isNaN(Date.parse(item.fireAtUtc)) &&
      typeof item.key === 'string' &&
      typeof item.notificationIdentifier === 'string'
    );
  });
}

function toReminderGroup(occurrence: TodayOccurrence): ReminderGroup {
  return occurrence.dayPart === 'anytime' ? 'day' : occurrence.dayPart;
}

function resolveZagrebReminderInstant(
  localDate: LocalDate,
  localTime: string,
): Date {
  const [hours = 0, minutes = 0] = localTime.split(':').map(Number);
  const requestedMinutes = hours * 60 + minutes;

  // During the spring DST jump a local time such as 02:30 does not exist.
  // Move only that reminder to the first valid minute, without changing the
  // user's saved preference or any other calendar day.
  for (let shift = 0; shift <= 120; shift += 1) {
    const candidateMinutes = requestedMinutes + shift;

    if (candidateMinutes >= 24 * 60) {
      break;
    }

    const candidateTime = `${String(Math.floor(candidateMinutes / 60)).padStart(2, '0')}:${String(candidateMinutes % 60).padStart(2, '0')}`;

    try {
      return createZagrebDateTimeSnapshot(localDate, candidateTime)
        .occurredAtUtc;
    } catch {
      // Keep looking for the first real local minute on this calendar day.
    }
  }

  throw new Error(
    `Podsjetnik ${localDate} u ${localTime} nije moguće pretvoriti u ${APP_TIME_ZONE}.`,
  );
}

function formatPrivateBody(group: ReminderGroup) {
  if (group === 'unfinished') {
    return 'Danas još ima neodrađenih aktivnosti. Otvori Higio za pregled.';
  }
  if (group === 'morning') {
    return 'Vrijeme je za jutarnju rutinu.';
  }

  if (group === 'evening') {
    return 'Vrijeme je za večernju rutinu.';
  }

  return 'Vrijeme je za planiranu njegu.';
}

function formatDetailedBody(occurrences: TodayOccurrence[]) {
  const names = [...new Set(occurrences.map((occurrence) => occurrence.title))];
  const visibleNames = names.slice(0, 2);

  if (names.length === 1) {
    return `${names[0]} čeka evidentiranje.`;
  }

  if (names.length === 2) {
    return `${names[0]} i ${names[1]} čekaju evidentiranje.`;
  }

  return `${visibleNames.join(', ')} i još ${names.length - 2} aktivnosti čekaju.`;
}

export function buildReminderPlan({
  days,
  now,
  preferences,
}: {
  days: ReminderPlanDay[];
  now: Date;
  preferences: ReminderPreferences;
}): PlannedReminder[] {
  if (!preferences.enabled) {
    return [];
  }

  return days.flatMap((day) =>
    REMINDER_GROUPS.flatMap((group) => {
      const slotPreferences = preferences.slots[group];

      if (!slotPreferences.enabled) {
        return [];
      }

      const pendingOccurrences = day.occurrences.filter(
        (occurrence) =>
          occurrence.isPlanned &&
          occurrence.completedLogId === null &&
          (group === 'unfinished' || toReminderGroup(occurrence) === group),
      );

      if (pendingOccurrences.length === 0) {
        return [];
      }

      const fireAtUtc = resolveZagrebReminderInstant(
        day.localDate,
        slotPreferences.time,
      );

      if (fireAtUtc.getTime() <= now.getTime()) {
        return [];
      }

      const key = `higio:v1:${day.localDate}:${group}`;
      const body = preferences.showActivityNames
        ? formatDetailedBody(pendingOccurrences)
        : formatPrivateBody(group);
      const fingerprint = [key, fireAtUtc.toISOString(), body].join('|');

      return [
        {
          body,
          data: {
            higioOwner: 'higio.reminders.v1' as const,
            localDate: day.localDate,
            reminderGroup: group,
            url: '/' as const,
          },
          fingerprint,
          fireAtUtc,
          key,
          title: 'Higio',
        },
      ];
    }),
  );
}

export function getReminderHorizonDates(
  startLocalDate: LocalDate,
  horizonDays: number,
) {
  return Array.from({ length: horizonDays }, (_, index) =>
    addCalendarDays(startLocalDate, index),
  );
}
