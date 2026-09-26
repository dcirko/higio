import type { DayPart, ScheduleType } from '@/domain/schedules';
import type { LocalDate } from '@/domain/time';

export const ACTIVITY_CATEGORIES = [
  { icon: '🐕', id: 'pet-care', label: 'Pas' },
  { icon: '🪥', id: 'oral-care', label: 'Zubi' },
  { icon: '🚿', id: 'body-care', label: 'Tijelo' },
  { icon: '🫧', id: 'hair-care', label: 'Kosa' },
  { icon: '🧴', id: 'skin-care', label: 'Koža' },
  { icon: '✂️', id: 'nail-care', label: 'Nokti' },
  { icon: '🪒', id: 'grooming', label: 'Njega' },
  { icon: '🧺', id: 'personal-items', label: 'Stvari' },
  { icon: '💊', id: 'supplements', label: 'Suplementi' },
  { icon: '✨', id: 'other', label: 'Ostalo' },
] as const;

export const ACTIVITY_ICONS = [
  '🐕',
  '🐾',
  '🍲',
  '🛁',
  '💊',
  '🪥',
  '🦷',
  '🚿',
  '🧼',
  '💧',
  '🫧',
  '🧴',
  '🪒',
  '✂️',
  '💇',
  '🧺',
  '🛏️',
  '✨',
  '🧖',
] as const;

export const ACTIVITY_COLORS = [
  '#217D5C',
  '#386B9E',
  '#9C6415',
  '#A53D45',
  '#6750A4',
  '#42534D',
] as const;

export const DAY_PART_OPTIONS: readonly {
  id: DayPart;
  label: string;
  slotLabel: string;
}[] = [
  { id: 'morning', label: 'Jutro', slotLabel: 'Jutarnji termin' },
  { id: 'day', label: 'Dan', slotLabel: 'Tijekom dana' },
  { id: 'evening', label: 'Večer', slotLabel: 'Večernji termin' },
  { id: 'anytime', label: 'Bilo kada', slotLabel: 'Danas' },
];

export const WEEKDAY_OPTIONS = [
  { id: 1, label: 'P' },
  { id: 2, label: 'U' },
  { id: 3, label: 'S' },
  { id: 4, label: 'Č' },
  { id: 5, label: 'P' },
  { id: 6, label: 'S' },
  { id: 7, label: 'N' },
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number]['id'];
export type ActivityStatus = 'active' | 'paused' | 'archived';
export type EditableScheduleType = ScheduleType;
export type IntervalUnit = 'day' | 'week';

export type EditableSchedule = {
  doseLabel?: string | null;
  dayParts: DayPart[];
  firstDueLocalDate: LocalDate | null;
  intervalEvery: number | null;
  intervalUnit: IntervalUnit | null;
  startsOnLocalDate: LocalDate;
  type: EditableScheduleType;
  weekdays: number[];
};

export type ActivityDraft = {
  category: ActivityCategory;
  color: string;
  description: string;
  icon: string;
  name: string;
  schedule: EditableSchedule;
};

export type ActivityDetails = ActivityDraft & {
  createdAtUtc: Date;
  id: string;
  nextExpectedLocalDate: LocalDate | null;
  status: ActivityStatus;
  updatedAtUtc: Date;
};

export interface ActivityStore {
  createActivity(
    draft: ActivityDraft,
    effectiveLocalDate: LocalDate,
  ): Promise<ActivityDetails>;
  getActivity(id: string): Promise<ActivityDetails | null>;
  listActivities(): Promise<ActivityDetails[]>;
  reorderActivities(activityIds: string[]): Promise<void>;
  setActivityStatus(
    id: string,
    status: ActivityStatus,
    effectiveLocalDate: LocalDate,
  ): Promise<void>;
  subscribe?(listener: () => void): () => void;
  updateActivity(
    id: string,
    draft: ActivityDraft,
    currentLocalDate: LocalDate,
  ): Promise<ActivityDetails>;
}

export function getCategoryLabel(category: ActivityCategory): string {
  return (
    ACTIVITY_CATEGORIES.find((option) => option.id === category)?.label ??
    'Ostalo'
  );
}

export function getDayPartLabel(dayPart: DayPart): string {
  return (
    DAY_PART_OPTIONS.find((option) => option.id === dayPart)?.label ??
    'Bilo kada'
  );
}

export function getScheduleSummary(schedule: EditableSchedule): string {
  const partLabels = schedule.dayParts.map(getDayPartLabel).join(', ');

  if (schedule.type === 'daily_slots') {
    return `Svaki dan · ${partLabels}`;
  }

  if (schedule.type === 'weekdays') {
    const weekdayLabels = schedule.weekdays
      .map(
        (weekday) =>
          WEEKDAY_OPTIONS.find((option) => option.id === weekday)?.label,
      )
      .filter(Boolean)
      .join(', ');

    return `${weekdayLabels} · ${partLabels}`;
  }

  if (schedule.type === 'interval') {
    const every = schedule.intervalEvery ?? 1;
    const unit =
      schedule.intervalUnit === 'week'
        ? every === 1
          ? 'tjedan'
          : 'tjedna'
        : every === 1
          ? 'dan'
          : 'dana';

    return `Svakih ${every} ${unit} · ${partLabels}`;
  }

  return 'Bez rasporeda';
}
