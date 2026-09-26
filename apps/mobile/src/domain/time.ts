export const APP_TIME_ZONE = 'Europe/Zagreb' as const;

export type LocalDate = `${number}-${number}-${number}`;

export type ZonedDateTimeSnapshot = {
  localDate: LocalDate;
  localTime: string;
  occurredAtUtc: Date;
  timezone: typeof APP_TIME_ZONE;
  utcOffsetMinutes: number;
};

type CalendarDateParts = {
  day: number;
  month: number;
  year: number;
};

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ZAGREB_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  hour: '2-digit',
  hour12: false,
  minute: '2-digit',
  month: '2-digit',
  second: '2-digit',
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
});
const ZAGREB_DAY_FORMATTER = new Intl.DateTimeFormat('hr-HR', {
  day: 'numeric',
  month: 'long',
  timeZone: APP_TIME_ZONE,
  weekday: 'long',
});

function toLocalDate({ day, month, year }: CalendarDateParts): LocalDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` as LocalDate;
}

export function parseLocalDate(value: string): CalendarDateParts {
  const match = LOCAL_DATE_PATTERN.exec(value);

  if (!match) {
    throw new Error(`Neispravan lokalni datum: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Nepostojeći lokalni datum: ${value}`);
  }

  return { day, month, year };
}

export function isLocalDate(value: string): value is LocalDate {
  try {
    parseLocalDate(value);
    return true;
  } catch {
    return false;
  }
}

export function isLocalTime(value: string): boolean {
  return LOCAL_TIME_PATTERN.test(value);
}

export function addCalendarDays(localDate: LocalDate, days: number): LocalDate {
  const { day, month, year } = parseLocalDate(localDate);
  const result = new Date(Date.UTC(year, month - 1, day + days));

  return toLocalDate({
    day: result.getUTCDate(),
    month: result.getUTCMonth() + 1,
    year: result.getUTCFullYear(),
  });
}

export function differenceInCalendarDays(
  laterDate: LocalDate,
  earlierDate: LocalDate,
): number {
  const later = parseLocalDate(laterDate);
  const earlier = parseLocalDate(earlierDate);
  const laterUtc = Date.UTC(later.year, later.month - 1, later.day);
  const earlierUtc = Date.UTC(earlier.year, earlier.month - 1, earlier.day);

  return Math.round((laterUtc - earlierUtc) / 86_400_000);
}

export function getIsoWeekday(localDate: LocalDate): number {
  const { day, month, year } = parseLocalDate(localDate);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return weekday === 0 ? 7 : weekday;
}

export function getZagrebDateTimeSnapshot(
  date = new Date(),
): ZonedDateTimeSnapshot {
  const parts = Object.fromEntries(
    ZAGREB_PARTS_FORMATTER.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second);
  const timestampWithoutMilliseconds = Math.floor(date.getTime() / 1000) * 1000;
  const representedAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  return {
    localDate: toLocalDate({ day, month, year }),
    localTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    occurredAtUtc: new Date(date.getTime()),
    timezone: APP_TIME_ZONE,
    utcOffsetMinutes: Math.round(
      (representedAsUtc - timestampWithoutMilliseconds) / 60_000,
    ),
  };
}

export function createZagrebDateTimeSnapshot(
  localDate: LocalDate,
  localTime: string,
): ZonedDateTimeSnapshot {
  const { day, month, year } = parseLocalDate(localDate);
  const timeMatch = LOCAL_TIME_PATTERN.exec(localTime);

  if (!timeMatch) {
    throw new Error(`Neispravno lokalno vrijeme: ${localTime}`);
  }

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const representedAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const matches: ZonedDateTimeSnapshot[] = [];
  const offsetProbeInstants = [
    representedAsUtc - 86_400_000,
    representedAsUtc,
    representedAsUtc + 86_400_000,
  ];
  const possibleOffsets = new Set(
    offsetProbeInstants.map(
      (instant) =>
        getZagrebDateTimeSnapshot(new Date(instant)).utcOffsetMinutes,
    ),
  );

  // IANA does not expose a direct local-time-to-instant conversion. Probe the
  // actual Zagreb offsets around this calendar day, including both sides of a
  // DST transition. This keeps the conversion deterministic without scanning
  // every theoretical world offset for each reminder.
  for (const offsetMinutes of possibleOffsets) {
    const candidate = new Date(representedAsUtc - offsetMinutes * 60_000);
    const snapshot = getZagrebDateTimeSnapshot(candidate);

    if (
      snapshot.localDate === localDate &&
      snapshot.localTime === localTime &&
      snapshot.utcOffsetMinutes === offsetMinutes
    ) {
      matches.push(snapshot);
    }
  }

  if (matches.length === 0) {
    throw new Error(
      `${localDate} u ${localTime} ne postoji u vremenskoj zoni ${APP_TIME_ZONE}.`,
    );
  }

  // During the repeated autumn hour both instants are valid. Prefer the first
  // occurrence and keep its actual offset in the log, so later rendering is
  // stable and never depends on the device's current timezone.
  return matches.sort(
    (left, right) =>
      left.occurredAtUtc.getTime() - right.occurredAtUtc.getTime(),
  )[0]!;
}

export function getCurrentZagrebLocalDate(now = new Date()): LocalDate {
  return getZagrebDateTimeSnapshot(now).localDate;
}

export function formatZagrebDay(localDate: LocalDate): string {
  const { day, month, year } = parseLocalDate(localDate);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12));
  const formatted = ZAGREB_DAY_FORMATTER.format(noonUtc);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatLocalDateShort(localDate: LocalDate): string {
  const { day, month, year } = parseLocalDate(localDate);

  return `${day}.${month}.${year}.`;
}
