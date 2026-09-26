import { formatLastDone } from '@/domain/occasional-care';
import { randomUUID } from 'expo-crypto';

import {
  type ActivityDetails,
  type ActivityDraft,
  type ActivityStatus,
  type ActivityStore,
  type EditableSchedule,
} from '@/domain/activities';
import {
  generateOccurrencesForDate,
  getNextExpectedLocalDate,
  type ScheduleDefinition,
} from '@/domain/schedules';
import type {
  HistoryEntry,
  HistoryFilters,
  HistoryStore,
  ManualHistoryLogDraft,
  PlannedLogCandidate,
} from '@/domain/history-store';
import type {
  CompletedOccurrence,
  TodayOccurrence,
  TodayStore,
} from '@/domain/today-store';
import {
  addCalendarDays,
  createZagrebDateTimeSnapshot,
  getCurrentZagrebLocalDate,
  getZagrebDateTimeSnapshot,
  type LocalDate,
} from '@/domain/time';

const STARTER_ACTIVITIES: ActivityDetails[] = [
  starterActivity('brush-teeth', 'Pranje zubi', '🪥', 'oral-care', '#217D5C', {
    dayParts: ['morning', 'evening'],
    firstDueLocalDate: null,
    intervalEvery: null,
    intervalUnit: null,
    startsOnLocalDate: '2026-01-01',
    type: 'daily_slots',
    weekdays: [],
  }),
  starterActivity('wash-face', 'Umivanje', '💧', 'skin-care', '#386B9E', {
    dayParts: ['morning'],
    firstDueLocalDate: null,
    intervalEvery: null,
    intervalUnit: null,
    startsOnLocalDate: '2026-01-01',
    type: 'daily_slots',
    weekdays: [],
  }),
  starterActivity('shower', 'Tuširanje', '🚿', 'body-care', '#386B9E', {
    dayParts: ['day'],
    firstDueLocalDate: null,
    intervalEvery: null,
    intervalUnit: null,
    startsOnLocalDate: '2026-01-01',
    type: 'daily_slots',
    weekdays: [],
  }),
  starterActivity('hair-wash', 'Pranje kose', '🫧', 'hair-care', '#217D5C', {
    dayParts: ['day'],
    firstDueLocalDate: null,
    intervalEvery: null,
    intervalUnit: null,
    startsOnLocalDate: '2026-01-01',
    type: 'weekdays',
    weekdays: [1, 4, 6],
  }),
  starterActivity('skin-care', 'Njega kože', '🧴', 'skin-care', '#9C6415', {
    dayParts: ['evening'],
    firstDueLocalDate: null,
    intervalEvery: null,
    intervalUnit: null,
    startsOnLocalDate: '2026-01-01',
    type: 'daily_slots',
    weekdays: [],
  }),
  starterActivity('nails', 'Rezanje noktiju', '✂️', 'nail-care', '#9C6415', {
    dayParts: ['anytime'],
    firstDueLocalDate: '2026-07-26',
    intervalEvery: 14,
    intervalUnit: 'day',
    startsOnLocalDate: '2026-07-26',
    type: 'interval',
    weekdays: [],
  }),
  starterActivity('shave', 'Brijanje', '🪒', 'grooming', '#42534D', {
    dayParts: ['anytime'],
    firstDueLocalDate: null,
    intervalEvery: null,
    intervalUnit: null,
    startsOnLocalDate: '2026-01-01',
    type: 'unscheduled',
    weekdays: [],
  }),
];

export type MemoryLog = {
  doseLabel?: string | null;
  activityId?: string;
  deletedAtUtc?: string | null;
  localDate?: LocalDate;
  localTime: string;
  logId: string;
  occurredAtUtc?: string;
  occurrenceKey?: string | null;
  plannedLocalDate?: LocalDate | null;
  plannedSlotLabel?: string | null;
  scheduleVersionId?: string | null;
  slotId?: string | null;
};

export type MemoryLogSnapshot = Record<string, MemoryLog>;

type DoseVersion = { from: LocalDate; label: string | null };

export type MemoryStoreSnapshot = {
  doseVersions?: Record<string, DoseVersion[]>;
  activities: (Omit<ActivityDetails, 'createdAtUtc' | 'updatedAtUtc'> & {
    createdAtUtc: string;
    updatedAtUtc: string;
  })[];
  logs: MemoryLogSnapshot;
};

type MemoryTodayStoreOptions = {
  initialLogs?: MemoryLogSnapshot;
  initialSnapshot?: MemoryStoreSnapshot;
  onChange?: (snapshot: MemoryStoreSnapshot) => void;
  startEmpty?: boolean;
};

function starterActivity(
  id: string,
  name: string,
  icon: string,
  category: ActivityDetails['category'],
  color: string,
  schedule: EditableSchedule,
): ActivityDetails {
  return {
    category,
    color,
    createdAtUtc: new Date(0),
    description: '',
    icon,
    id,
    name,
    nextExpectedLocalDate: null,
    schedule,
    status: 'active',
    updatedAtUtc: new Date(0),
  };
}

function cloneSchedule(schedule: EditableSchedule): EditableSchedule {
  return {
    ...schedule,
    dayParts: [...schedule.dayParts],
    weekdays: [...schedule.weekdays],
  };
}

function cloneActivity(activity: ActivityDetails): ActivityDetails {
  return {
    ...activity,
    schedule: cloneSchedule(activity.schedule),
  };
}

function getActivityIdFromLegacyLog(key: string, log: MemoryLog) {
  return (
    log.activityId ?? log.occurrenceKey?.split(':')[0] ?? key.split(':')[0]
  );
}

function getLogLocalDate(key: string, log: MemoryLog): LocalDate | null {
  if (log.localDate) {
    return log.localDate;
  }

  const candidate = (log.occurrenceKey ?? key).split(':').at(-1);
  return candidate?.match(/^\d{4}-\d{2}-\d{2}$/)
    ? (candidate as LocalDate)
    : null;
}

function getSlotLabel(dayPart: TodayOccurrence['dayPart']) {
  if (dayPart === 'morning') {
    return 'Jutarnji termin';
  }

  if (dayPart === 'evening') {
    return 'Večernji termin';
  }

  return 'Danas';
}

export class MemoryTodayStore
  implements TodayStore, ActivityStore, HistoryStore
{
  private readonly activities = new Map<string, ActivityDetails>();
  private readonly doseVersions = new Map<string, DoseVersion[]>();
  private readonly activityOrder: string[] = [];
  private readonly listeners = new Set<() => void>();
  private readonly logs: Map<string, MemoryLog>;
  private readonly onChange?: (snapshot: MemoryStoreSnapshot) => void;

  constructor(options: MemoryTodayStoreOptions = {}) {
    const storedActivities = options.initialSnapshot?.activities.map(
      (activity) => ({
        ...activity,
        createdAtUtc: new Date(activity.createdAtUtc),
        updatedAtUtc: new Date(activity.updatedAtUtc),
      }),
    );

    for (const activity of storedActivities ??
      (options.startEmpty ? [] : STARTER_ACTIVITIES)) {
      this.activities.set(activity.id, cloneActivity(activity));
      this.doseVersions.set(
        activity.id,
        options.initialSnapshot?.doseVersions?.[activity.id] ?? [
          {
            from: activity.schedule.startsOnLocalDate,
            label: activity.schedule.doseLabel ?? null,
          },
        ],
      );
      this.activityOrder.push(activity.id);
    }

    this.logs = new Map(
      Object.entries(
        options.initialSnapshot?.logs ?? options.initialLogs ?? {},
      ),
    );
    this.onChange = options.onChange;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  async listActivities() {
    return this.activityOrder.flatMap((id) => {
      const activity = this.activities.get(id);
      return activity ? [this.withNextExpected(activity)] : [];
    });
  }

  async getActivity(id: string) {
    const activity = this.activities.get(id);
    return activity ? this.withNextExpected(activity) : null;
  }

  async createActivity(draft: ActivityDraft, _localDate: LocalDate) {
    const now = new Date();
    const activity: ActivityDetails = {
      ...draft,
      createdAtUtc: now,
      id: randomUUID(),
      name: draft.name.trim(),
      nextExpectedLocalDate: null,
      schedule: cloneSchedule(draft.schedule),
      status: 'active',
      updatedAtUtc: now,
    };

    this.activities.set(activity.id, activity);
    this.doseVersions.set(activity.id, [
      {
        from: activity.schedule.startsOnLocalDate,
        label: activity.schedule.doseLabel ?? null,
      },
    ]);
    this.activityOrder.push(activity.id);
    this.notifyChange();
    return this.withNextExpected(activity);
  }

  async updateActivity(
    id: string,
    draft: ActivityDraft,
    currentLocalDate: LocalDate,
  ) {
    const activity = this.activities.get(id);

    if (!activity) {
      throw new Error('Aktivnost više ne postoji.');
    }

    if (
      (activity.schedule.doseLabel ?? null) !==
      (draft.schedule.doseLabel ?? null)
    ) {
      const tomorrow = addCalendarDays(currentLocalDate, 1);
      const from =
        draft.schedule.startsOnLocalDate > tomorrow
          ? draft.schedule.startsOnLocalDate
          : tomorrow;
      const versions = (this.doseVersions.get(id) ?? []).filter(
        (version) => version.from <= currentLocalDate,
      );
      versions.push({ from, label: draft.schedule.doseLabel ?? null });
      this.doseVersions.set(id, versions);
    }
    const updated: ActivityDetails = {
      ...activity,
      ...draft,
      name: draft.name.trim(),
      schedule: cloneSchedule(draft.schedule),
      updatedAtUtc: new Date(),
    };

    this.activities.set(id, updated);
    this.notifyChange();
    return this.withNextExpected(updated);
  }

  async setActivityStatus(
    id: string,
    status: ActivityStatus,
    _localDate: LocalDate,
  ) {
    const activity = this.activities.get(id);

    if (!activity) {
      throw new Error('Aktivnost više ne postoji.');
    }

    this.activities.set(id, {
      ...activity,
      status,
      updatedAtUtc: new Date(),
    });
    this.notifyChange();
  }

  async reorderActivities(activityIds: string[]) {
    const knownIds = new Set(this.activities.keys());
    const requested = activityIds.filter((id) => knownIds.has(id));
    const remaining = this.activityOrder.filter(
      (id) => !requested.includes(id),
    );
    this.activityOrder.splice(
      0,
      this.activityOrder.length,
      ...requested,
      ...remaining,
    );
    this.notifyChange();
  }

  async completeOccurrence(
    occurrence: TodayOccurrence,
    occurredAt = new Date(),
  ): Promise<CompletedOccurrence> {
    const snapshot = getZagrebDateTimeSnapshot(occurredAt);

    if (!occurrence.isPlanned) {
      const logId = randomUUID();
      this.logs.set(logId, {
        doseLabel: occurrence.doseLabel ?? null,
        activityId: occurrence.activityId,
        deletedAtUtc: null,
        localDate: snapshot.localDate,
        localTime: snapshot.localTime,
        logId,
        occurredAtUtc: snapshot.occurredAtUtc.toISOString(),
        occurrenceKey: null,
        plannedLocalDate: null,
        plannedSlotLabel: null,
        scheduleVersionId: occurrence.scheduleVersionId,
        slotId: null,
      });
      this.notifyChange();

      return {
        localTime: snapshot.localTime,
        logId,
        occurrenceKey: occurrence.occurrenceKey,
        title: occurrence.title,
      };
    }

    const existing = this.logs.get(occurrence.occurrenceKey);
    const log = existing?.deletedAtUtc
      ? {
          ...existing,
          doseLabel: occurrence.doseLabel ?? null,
          deletedAtUtc: null,
          localDate: snapshot.localDate,
          localTime: snapshot.localTime,
          occurredAtUtc: snapshot.occurredAtUtc.toISOString(),
        }
      : (existing ?? {
          doseLabel: occurrence.doseLabel ?? null,
          activityId: occurrence.activityId,
          deletedAtUtc: null,
          localDate: snapshot.localDate,
          localTime: snapshot.localTime,
          logId: randomUUID(),
          occurredAtUtc: snapshot.occurredAtUtc.toISOString(),
          occurrenceKey: occurrence.occurrenceKey,
          plannedLocalDate: occurrence.plannedLocalDate,
          plannedSlotLabel: occurrence.slotLabel,
          scheduleVersionId: occurrence.scheduleVersionId,
          slotId: occurrence.slotId,
        });

    this.logs.set(occurrence.occurrenceKey, log);
    this.notifyChange();

    return {
      localTime: log.localTime,
      logId: log.logId,
      occurrenceKey: occurrence.occurrenceKey,
      title: occurrence.title,
    };
  }

  async loadDay(localDate: LocalDate): Promise<TodayOccurrence[]> {
    const definitions = [...this.activities.values()].map((activity) =>
      this.toScheduleDefinition(activity, localDate),
    );
    const planned = generateOccurrencesForDate(definitions, localDate).map(
      (occurrence): TodayOccurrence => {
        const activity = this.activities.get(occurrence.activityId);

        if (!activity) {
          throw new Error(`Nedostaje aktivnost ${occurrence.activityId}.`);
        }

        const candidateLog = this.logs.get(occurrence.occurrenceKey);
        const log = candidateLog?.deletedAtUtc ? undefined : candidateLog;

        return {
          ...occurrence,
          doseLabel: log
            ? (log.doseLabel ?? null)
            : this.getDoseLabel(activity.id, localDate),
          color: activity.color,
          category: activity.category,
          completedAtLocalTime: log?.localTime ?? null,
          completedLogId: log?.logId ?? null,
          countsTowardProgress: true,
          icon: activity.icon,
          isPlanned: true,
          isRepeatable: false,
          lastDone: this.getLastDone(activity.id, localDate),
          title: activity.name,
        };
      },
    );
    const quickActivities = [...this.activities.values()]
      .filter(
        (activity) =>
          activity.status === 'active' &&
          activity.schedule.type === 'unscheduled' &&
          activity.schedule.startsOnLocalDate <= localDate,
      )
      .map((activity): TodayOccurrence => ({
        activityId: activity.id,
        doseLabel: this.getDoseLabel(activity.id, localDate),
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
        lastDone: this.getLastDone(activity.id, localDate),
        occurrenceKey: `${activity.id}:quick:${localDate}`,
        plannedLocalDate: null,
        scheduleVersionId: `${activity.id}:schedule`,
        slotId: null,
        slotLabel: 'Zadnji put: još nije evidentirano',
        sortOrder: 1_000,
        title: activity.name,
      }));

    return [...planned, ...quickActivities].filter(
      (occurrence) =>
        this.activities.get(occurrence.activityId)?.status === 'active' ||
        occurrence.completedLogId !== null,
    );
  }

  async undoCompletion(logId: string): Promise<void> {
    for (const [key, log] of this.logs) {
      if (log.logId === logId) {
        this.logs.delete(key);
        this.notifyChange();
        return;
      }
    }
  }

  async listEntries(filters: HistoryFilters = {}): Promise<HistoryEntry[]> {
    return [...this.logs.entries()]
      .filter(([, log]) => !log.deletedAtUtc)
      .map(([key, log]) => this.toHistoryEntry(key, log))
      .filter(
        (entry) =>
          (!filters.activityId || entry.activityId === filters.activityId) &&
          (!filters.category || entry.category === filters.category) &&
          (!filters.fromLocalDate ||
            entry.localDate >= filters.fromLocalDate) &&
          (!filters.toLocalDate || entry.localDate <= filters.toLocalDate),
      )
      .sort((left, right) =>
        `${right.localDate}T${right.localTime}:${right.occurredAtUtc.toISOString()}`.localeCompare(
          `${left.localDate}T${left.localTime}:${left.occurredAtUtc.toISOString()}`,
        ),
      )
      .slice(0, 500);
  }

  async listPlannedCandidates(
    activityId: string,
    localDate: LocalDate,
  ): Promise<PlannedLogCandidate[]> {
    const activity = this.activities.get(activityId);

    if (!activity || activity.schedule.type === 'unscheduled') {
      return [];
    }

    const completedKeys = new Set(
      [...this.logs.values()]
        .filter((log) => !log.deletedAtUtc && log.occurrenceKey)
        .map((log) => log.occurrenceKey!),
    );

    return generateOccurrencesForDate(
      [this.toScheduleDefinition(activity, localDate)],
      localDate,
    )
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
    const activity = this.activities.get(draft.activityId);

    if (!activity) {
      throw new Error('Odabrana aktivnost više ne postoji.');
    }

    const snapshot = createZagrebDateTimeSnapshot(
      draft.localDate,
      draft.localTime,
    );

    if (snapshot.occurredAtUtc.getTime() > Date.now() + 60_000) {
      throw new Error('Vrijeme izvršenja ne može biti u budućnosti.');
    }

    let candidate = draft.plannedCandidate;

    if (candidate) {
      const candidates = await this.listPlannedCandidates(
        draft.activityId,
        draft.localDate,
      );
      candidate = candidates.find(
        (option) => option.occurrenceKey === candidate?.occurrenceKey,
      );

      if (!candidate) {
        throw new Error('Odabrani planirani termin više nije dostupan.');
      }
    }

    const key = candidate?.occurrenceKey ?? randomUUID();
    const existing = this.logs.get(key);
    const log: MemoryLog = {
      doseLabel: this.getDoseLabel(activity.id, draft.localDate),
      activityId: draft.activityId,
      deletedAtUtc: null,
      localDate: snapshot.localDate,
      localTime: snapshot.localTime,
      logId: existing?.logId ?? randomUUID(),
      occurredAtUtc: snapshot.occurredAtUtc.toISOString(),
      occurrenceKey: candidate?.occurrenceKey ?? null,
      plannedLocalDate: candidate?.plannedLocalDate ?? null,
      plannedSlotLabel: candidate?.label ?? null,
      scheduleVersionId: candidate?.scheduleVersionId ?? null,
      slotId: candidate?.slotId ?? null,
    };

    this.logs.set(key, log);
    this.notifyChange();
    return this.toHistoryEntry(key, log);
  }

  async updateLogTime(
    id: string,
    localDate: LocalDate,
    localTime: string,
  ): Promise<HistoryEntry> {
    const found = [...this.logs.entries()].find(
      ([, log]) => log.logId === id && !log.deletedAtUtc,
    );

    if (!found) {
      throw new Error('Zapis više ne postoji.');
    }

    const snapshot = createZagrebDateTimeSnapshot(localDate, localTime);

    if (snapshot.occurredAtUtc.getTime() > Date.now() + 60_000) {
      throw new Error('Vrijeme izvršenja ne može biti u budućnosti.');
    }

    const [key, log] = found;
    const updated: MemoryLog = {
      ...log,
      localDate,
      localTime,
      occurredAtUtc: snapshot.occurredAtUtc.toISOString(),
    };

    this.logs.set(key, updated);
    this.notifyChange();
    return this.toHistoryEntry(key, updated);
  }

  async deleteLog(id: string): Promise<void> {
    const found = [...this.logs.entries()].find(
      ([, log]) => log.logId === id && !log.deletedAtUtc,
    );

    if (!found) {
      throw new Error('Zapis više ne postoji.');
    }

    const [key, log] = found;
    this.logs.set(key, { ...log, deletedAtUtc: new Date().toISOString() });
    this.notifyChange();
  }

  async restoreLog(id: string): Promise<void> {
    const found = [...this.logs.entries()].find(([, log]) => log.logId === id);

    if (!found) {
      throw new Error('Zapis se nije mogao vratiti.');
    }

    const [key, log] = found;
    this.logs.set(key, { ...log, deletedAtUtc: null });
    this.notifyChange();
  }

  private getDoseLabel(activityId: string, localDate: LocalDate) {
    return (
      this.doseVersions
        .get(activityId)
        ?.filter((version) => version.from <= localDate)
        .at(-1)?.label ?? null
    );
  }

  private notifyChange() {
    const snapshot: MemoryStoreSnapshot = {
      doseVersions: Object.fromEntries(this.doseVersions),
      activities: this.activityOrder.flatMap((id) => {
        const activity = this.activities.get(id);
        return activity
          ? [
              {
                ...cloneActivity(activity),
                createdAtUtc: activity.createdAtUtc.toISOString(),
                updatedAtUtc: activity.updatedAtUtc.toISOString(),
              },
            ]
          : [];
      }),
      logs: Object.fromEntries(this.logs),
    };

    this.onChange?.(snapshot);

    for (const listener of this.listeners) {
      listener();
    }
  }

  private toScheduleDefinition(
    activity: ActivityDetails,
    localDate: LocalDate,
  ): ScheduleDefinition {
    const latestPriorCompletion = this.getLatestCompletionDate(
      activity.id,
      localDate,
      false,
    );

    return {
      activityId: activity.id,
      firstDueLocalDate: activity.schedule.firstDueLocalDate,
      id: `${activity.id}:schedule`,
      intervalEvery: activity.schedule.intervalEvery,
      intervalUnit: activity.schedule.intervalUnit,
      lastCompletionLocalDate: latestPriorCompletion,
      slots:
        activity.schedule.type === 'unscheduled'
          ? []
          : activity.schedule.dayParts.map((dayPart, index) => ({
              dayPart,
              id: `${activity.id}:${dayPart}`,
              label: getSlotLabel(dayPart),
              preferredMinutes: null,
              sortOrder: (index + 1) * 10,
            })),
      type: activity.schedule.type,
      validFromLocalDate: activity.schedule.startsOnLocalDate,
      validToLocalDate: null,
      weekdays: activity.schedule.weekdays,
    };
  }

  private withNextExpected(activity: ActivityDetails): ActivityDetails {
    const localDate = getCurrentZagrebLocalDate();
    const definition = this.toScheduleDefinition(activity, localDate);
    definition.lastCompletionLocalDate = this.getLatestCompletionDate(
      activity.id,
      localDate,
      true,
    );

    return {
      ...cloneActivity(activity),
      nextExpectedLocalDate:
        activity.status === 'active'
          ? getNextExpectedLocalDate(definition, localDate)
          : null,
    };
  }

  private getLatestCompletionDate(
    activityId: string,
    localDate: LocalDate,
    includeCurrentDate: boolean,
  ): LocalDate | null {
    return (
      [...this.logs.entries()]
        .filter(([, log]) => !log.deletedAtUtc)
        .map(([key, log]) => ({
          activityId: getActivityIdFromLegacyLog(key, log),
          localDate: getLogLocalDate(key, log),
        }))
        .filter(
          (log) =>
            log.activityId === activityId &&
            log.localDate !== null &&
            (includeCurrentDate
              ? log.localDate <= localDate
              : log.localDate < localDate),
        )
        .map((log) => log.localDate!)
        .sort()
        .at(-1) ?? null
    );
  }

  private getLastDone(activityId: string, localDate: LocalDate) {
    const latest = [...this.logs.entries()]
      .filter(([, log]) => !log.deletedAtUtc)
      .map(([key, log]) => ({
        activityId: getActivityIdFromLegacyLog(key, log),
        localDate: getLogLocalDate(key, log),
        localTime: log.localTime,
      }))
      .filter(
        (log) =>
          log.activityId === activityId &&
          log.localDate !== null &&
          log.localDate <= localDate,
      )
      .sort((left, right) =>
        `${left.localDate}T${left.localTime}`.localeCompare(
          `${right.localDate}T${right.localTime}`,
        ),
      )
      .at(-1);

    if (!latest?.localDate) {
      return null;
    }

    return formatLastDone(latest.localDate, latest.localTime);
  }

  private toHistoryEntry(key: string, log: MemoryLog): HistoryEntry {
    const activityId = getActivityIdFromLegacyLog(key, log);
    const localDate = getLogLocalDate(key, log);

    if (!activityId || !localDate) {
      throw new Error('Povijesni zapis nema valjanu aktivnost ili datum.');
    }

    const activity = this.activities.get(activityId);

    if (!activity) {
      throw new Error('Povijesni zapis pripada nepoznatoj aktivnosti.');
    }

    return {
      category: activity.category,
      color: activity.color,
      icon: activity.icon,
      doseLabel: log.doseLabel ?? null,
      id: log.logId,
      name: activity.name,
      status: activity.status,
      activityId,
      localDate,
      localTime: log.localTime,
      occurrenceKey: log.occurrenceKey ?? null,
      occurredAtUtc: log.occurredAtUtc
        ? new Date(log.occurredAtUtc)
        : createZagrebDateTimeSnapshot(localDate, log.localTime).occurredAtUtc,
      plannedLocalDate: log.plannedLocalDate ?? null,
      plannedSlotLabel: log.plannedSlotLabel ?? null,
    };
  }
}

export function createMemoryTodayStore(options?: MemoryTodayStoreOptions) {
  return new MemoryTodayStore(options);
}
