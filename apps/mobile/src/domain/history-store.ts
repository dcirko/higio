import type { ActivityCategory, ActivityStatus } from '@/domain/activities';
import type { LocalDate } from '@/domain/time';

export type HistoryActivityOption = {
  category: ActivityCategory;
  color: string;
  icon: string;
  id: string;
  name: string;
  status: ActivityStatus;
};

export type HistoryEntry = HistoryActivityOption & {
  doseLabel?: string | null;
  activityId: string;
  id: string;
  localDate: LocalDate;
  localTime: string;
  occurrenceKey: string | null;
  occurredAtUtc: Date;
  plannedLocalDate: LocalDate | null;
  plannedSlotLabel: string | null;
};

export type HistoryFilters = {
  activityId?: string;
  category?: ActivityCategory;
  fromLocalDate?: LocalDate;
  toLocalDate?: LocalDate;
};

export type PlannedLogCandidate = {
  label: string;
  occurrenceKey: string;
  plannedLocalDate: LocalDate;
  scheduleVersionId: string;
  slotId: string | null;
};

export type ManualHistoryLogDraft = {
  activityId: string;
  localDate: LocalDate;
  localTime: string;
  plannedCandidate?: PlannedLogCandidate;
};

export interface HistoryStore {
  createManualLog(draft: ManualHistoryLogDraft): Promise<HistoryEntry>;
  deleteLog(id: string): Promise<void>;
  listActivities(): Promise<HistoryActivityOption[]>;
  listEntries(filters?: HistoryFilters): Promise<HistoryEntry[]>;
  listPlannedCandidates(
    activityId: string,
    localDate: LocalDate,
  ): Promise<PlannedLogCandidate[]>;
  restoreLog(id: string): Promise<void>;
  subscribe?(listener: () => void): () => void;
  updateLogTime(
    id: string,
    localDate: LocalDate,
    localTime: string,
  ): Promise<HistoryEntry>;
}
