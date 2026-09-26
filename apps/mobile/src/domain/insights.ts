import type { ActivityDetails } from '@/domain/activities';
import type { HistoryEntry } from '@/domain/history-store';
import type { TodayOccurrence } from '@/domain/today-store';
import {
  addCalendarDays,
  differenceInCalendarDays,
  type LocalDate,
} from '@/domain/time';

export type InsightRange = 7 | 30;

export type InsightDayInput = {
  localDate: LocalDate;
  occurrences: TodayOccurrence[];
};

export type DailyInsight = {
  completed: number;
  localDate: LocalDate;
  percentage: number | null;
  planned: number;
};

export type ActivityInsight = {
  activityId: string;
  averageGapDays: number | null;
  color: string;
  completed: number;
  icon: string;
  lastCompletion: HistoryEntry | null;
  logCount: number;
  name: string;
  percentage: number | null;
  planned: number;
};

export type InsightsSnapshot = {
  activities: ActivityInsight[];
  completed: number;
  daily: DailyInsight[];
  fromLocalDate: LocalDate;
  lastCompletion: HistoryEntry | null;
  percentage: number | null;
  planned: number;
  range: InsightRange;
  toLocalDate: LocalDate;
};

type BuildInsightsInput = {
  activities: ActivityDetails[];
  days: InsightDayInput[];
  entries: HistoryEntry[];
  range: InsightRange;
  toLocalDate: LocalDate;
};

function toPercentage(completed: number, planned: number) {
  return planned === 0 ? null : Math.round((completed / planned) * 100);
}

function getAverageGapDays(entries: HistoryEntry[]) {
  const orderedDates = entries
    .map((entry) => entry.localDate)
    .sort((left, right) => left.localeCompare(right));

  if (orderedDates.length < 2) {
    return null;
  }

  const gaps = orderedDates
    .slice(1)
    .map((localDate, index) =>
      differenceInCalendarDays(localDate, orderedDates[index]!),
    );

  return (
    Math.round((gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) * 10) /
    10
  );
}

/**
 * Builds explainable period statistics. Planned interval occurrences are
 * counted once on their original planned day, even while they remain overdue.
 * A planned occurrence only counts as completed when its matching log was
 * recorded no later than the selected period end.
 */
export function buildInsights({
  activities,
  days,
  entries,
  range,
  toLocalDate,
}: BuildInsightsInput): InsightsSnapshot {
  const fromLocalDate = addCalendarDays(toLocalDate, -(range - 1));
  const entriesToPeriodEnd = entries.filter(
    (entry) => entry.localDate <= toLocalDate,
  );
  const entriesInRange = entriesToPeriodEnd.filter(
    (entry) => entry.localDate >= fromLocalDate,
  );
  const completionByOccurrence = new Map(
    entriesToPeriodEnd.flatMap((entry) =>
      entry.occurrenceKey ? [[entry.occurrenceKey, entry] as const] : [],
    ),
  );
  const plannedByKey = new Map<string, TodayOccurrence>();

  for (const day of days) {
    for (const occurrence of day.occurrences) {
      if (
        occurrence.countsTowardProgress &&
        occurrence.plannedLocalDate !== null &&
        occurrence.plannedLocalDate >= fromLocalDate &&
        occurrence.plannedLocalDate <= toLocalDate
      ) {
        plannedByKey.set(occurrence.occurrenceKey, occurrence);
      }
    }
  }

  const daily = days.map(({ localDate }) => {
    const occurrences = [...plannedByKey.values()].filter(
      (occurrence) => occurrence.plannedLocalDate === localDate,
    );
    const completed = occurrences.filter((occurrence) =>
      completionByOccurrence.has(occurrence.occurrenceKey),
    ).length;

    return {
      completed,
      localDate,
      percentage: toPercentage(completed, occurrences.length),
      planned: occurrences.length,
    };
  });
  const planned = plannedByKey.size;
  const completed = [...plannedByKey.keys()].filter((occurrenceKey) =>
    completionByOccurrence.has(occurrenceKey),
  ).length;
  const activityInsights = activities
    .map((activity): ActivityInsight => {
      const activityPlanned = [...plannedByKey.values()].filter(
        (occurrence) => occurrence.activityId === activity.id,
      );
      const activityEntriesInRange = entriesInRange.filter(
        (entry) => entry.activityId === activity.id,
      );
      const allActivityEntries = entriesToPeriodEnd
        .filter((entry) => entry.activityId === activity.id)
        .sort(
          (left, right) =>
            right.occurredAtUtc.getTime() - left.occurredAtUtc.getTime(),
        );
      const activityCompleted = activityPlanned.filter((occurrence) =>
        completionByOccurrence.has(occurrence.occurrenceKey),
      ).length;

      return {
        activityId: activity.id,
        averageGapDays: getAverageGapDays(allActivityEntries),
        color: activity.color,
        completed: activityCompleted,
        icon: activity.icon,
        lastCompletion: allActivityEntries[0] ?? null,
        logCount: activityEntriesInRange.length,
        name: activity.name,
        percentage: toPercentage(activityCompleted, activityPlanned.length),
        planned: activityPlanned.length,
      };
    })
    .filter(
      (activity) =>
        activity.planned > 0 ||
        activity.logCount > 0 ||
        activity.lastCompletion !== null,
    )
    .sort((left, right) => {
      if (left.planned > 0 && right.planned === 0) return -1;
      if (left.planned === 0 && right.planned > 0) return 1;
      return left.name.localeCompare(right.name, 'hr');
    });
  const lastCompletion =
    entriesToPeriodEnd.sort(
      (left, right) =>
        right.occurredAtUtc.getTime() - left.occurredAtUtc.getTime(),
    )[0] ?? null;

  return {
    activities: activityInsights,
    completed,
    daily,
    fromLocalDate,
    lastCompletion,
    percentage: toPercentage(completed, planned),
    planned,
    range,
    toLocalDate,
  };
}
