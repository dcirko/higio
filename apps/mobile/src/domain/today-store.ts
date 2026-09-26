import type { DayPart } from '@/domain/schedules';
import type { LocalDate } from '@/domain/time';

export type TodayOccurrence = {
  category?: string;
  doseLabel?: string | null;
  activityId: string;
  completedAtLocalTime: string | null;
  completedLogId: string | null;
  countsTowardProgress: boolean;
  color: string;
  dayPart: DayPart;
  icon: string;
  isOverdue: boolean;
  isPlanned: boolean;
  isRepeatable: boolean;
  lastDone: string | null;
  occurrenceKey: string;
  plannedLocalDate: LocalDate | null;
  scheduleVersionId: string;
  slotId: string | null;
  slotLabel: string;
  sortOrder: number;
  title: string;
};

export type CompletedOccurrence = {
  localTime: string;
  logId: string;
  occurrenceKey: string;
  title: string;
};

export interface TodayStore {
  completeOccurrence(
    occurrence: TodayOccurrence,
    occurredAt?: Date,
  ): Promise<CompletedOccurrence>;
  loadDay(localDate: LocalDate): Promise<TodayOccurrence[]>;
  subscribe?(listener: () => void): () => void;
  undoCompletion(logId: string): Promise<void>;
}
