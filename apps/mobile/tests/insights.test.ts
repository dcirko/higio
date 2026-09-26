import type { ActivityDetails } from '@/domain/activities';
import type { HistoryEntry } from '@/domain/history-store';
import { buildInsights } from '@/domain/insights';
import type { TodayOccurrence } from '@/domain/today-store';
import type { LocalDate } from '@/domain/time';

const ACTIVITY: ActivityDetails = {
  category: 'nail-care',
  color: '#217D5C',
  createdAtUtc: new Date('2026-01-01T00:00:00.000Z'),
  description: '',
  icon: '✂️',
  id: 'nails',
  name: 'Rezanje noktiju',
  nextExpectedLocalDate: null,
  schedule: {
    dayParts: ['anytime'],
    firstDueLocalDate: '2026-07-01',
    intervalEvery: 14,
    intervalUnit: 'day',
    startsOnLocalDate: '2026-07-01',
    type: 'interval',
    weekdays: [],
  },
  status: 'active',
  updatedAtUtc: new Date('2026-01-01T00:00:00.000Z'),
};

function occurrence(displayDate: LocalDate): TodayOccurrence {
  return {
    activityId: ACTIVITY.id,
    color: ACTIVITY.color,
    completedAtLocalTime: null,
    completedLogId: null,
    countsTowardProgress: true,
    dayPart: 'anytime',
    icon: ACTIVITY.icon,
    isOverdue: displayDate !== '2026-07-01',
    isPlanned: true,
    isRepeatable: false,
    lastDone: null,
    occurrenceKey: 'schedule:slot:2026-07-01',
    plannedLocalDate: '2026-07-01',
    scheduleVersionId: 'schedule',
    slotId: 'slot',
    slotLabel: 'Danas',
    sortOrder: 10,
    title: ACTIVITY.name,
  };
}

function entry(localDate: LocalDate): HistoryEntry {
  return {
    activityId: ACTIVITY.id,
    category: ACTIVITY.category,
    color: ACTIVITY.color,
    icon: ACTIVITY.icon,
    id: `log-${localDate}`,
    localDate,
    localTime: '10:00',
    name: ACTIVITY.name,
    occurrenceKey: 'schedule:slot:2026-07-01',
    occurredAtUtc: new Date(`${localDate}T08:00:00.000Z`),
    plannedLocalDate: '2026-07-01',
    plannedSlotLabel: 'Danas',
    status: 'active',
  };
}

describe('explainable insights', () => {
  it('counts an overdue interval occurrence only once on its planned day', () => {
    const snapshot = buildInsights({
      activities: [ACTIVITY],
      days: [
        { localDate: '2026-07-01', occurrences: [occurrence('2026-07-01')] },
        { localDate: '2026-07-02', occurrences: [occurrence('2026-07-02')] },
        { localDate: '2026-07-03', occurrences: [occurrence('2026-07-03')] },
      ],
      entries: [],
      range: 7,
      toLocalDate: '2026-07-07',
    });

    expect(snapshot.planned).toBe(1);
    expect(
      snapshot.daily.find((day) => day.localDate === '2026-07-01'),
    ).toMatchObject({
      completed: 0,
      planned: 1,
    });
  });

  it('does not count a completion recorded after the selected period end', () => {
    const snapshot = buildInsights({
      activities: [ACTIVITY],
      days: [
        { localDate: '2026-07-01', occurrences: [occurrence('2026-07-01')] },
      ],
      entries: [entry('2026-07-10')],
      range: 7,
      toLocalDate: '2026-07-07',
    });

    expect(snapshot).toMatchObject({ completed: 0, percentage: 0, planned: 1 });
  });

  it('keeps unscheduled activity logs outside the planned percentage', () => {
    const unscheduledEntry = { ...entry('2026-07-05'), occurrenceKey: null };
    const snapshot = buildInsights({
      activities: [
        {
          ...ACTIVITY,
          schedule: { ...ACTIVITY.schedule, type: 'unscheduled' },
        },
      ],
      days: [],
      entries: [unscheduledEntry],
      range: 7,
      toLocalDate: '2026-07-07',
    });

    expect(snapshot).toMatchObject({ percentage: null, planned: 0 });
    expect(snapshot.activities[0]).toMatchObject({
      logCount: 1,
      percentage: null,
    });
  });
});
