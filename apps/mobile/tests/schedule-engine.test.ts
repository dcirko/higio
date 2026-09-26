import {
  generateOccurrencesForDate,
  getNextExpectedLocalDate,
  type ScheduleDefinition,
} from '@/domain/schedules';

const baseSchedule: ScheduleDefinition = {
  activityId: 'activity-1',
  firstDueLocalDate: null,
  id: 'schedule-1',
  intervalEvery: null,
  intervalUnit: null,
  lastCompletionLocalDate: null,
  slots: [],
  type: 'unscheduled',
  validFromLocalDate: '2026-01-01',
  validToLocalDate: null,
  weekdays: [],
};

describe('schedule engine', () => {
  it('returns deterministic morning and evening daily slots', () => {
    const schedule: ScheduleDefinition = {
      ...baseSchedule,
      slots: [
        {
          dayPart: 'morning',
          id: 'morning',
          label: 'Jutarnji termin',
          preferredMinutes: 480,
          sortOrder: 10,
        },
        {
          dayPart: 'evening',
          id: 'evening',
          label: 'Večernji termin',
          preferredMinutes: 1320,
          sortOrder: 20,
        },
      ],
      type: 'daily_slots',
    };

    const first = generateOccurrencesForDate([schedule], '2026-07-26');
    const second = generateOccurrencesForDate([schedule], '2026-07-26');

    expect(first).toEqual(second);
    expect(first.map((occurrence) => occurrence.occurrenceKey)).toEqual([
      'schedule-1:morning:2026-07-26',
      'schedule-1:evening:2026-07-26',
    ]);
  });

  it('does not generate a daily occurrence before the schedule starts', () => {
    const schedule: ScheduleDefinition = {
      ...baseSchedule,
      slots: [
        {
          dayPart: 'morning',
          id: 'morning',
          label: 'Jutarnji termin',
          preferredMinutes: null,
          sortOrder: 10,
        },
      ],
      type: 'daily_slots',
      validFromLocalDate: '2026-08-01',
    };

    expect(generateOccurrencesForDate([schedule], '2026-07-31')).toEqual([]);
    expect(generateOccurrencesForDate([schedule], '2026-08-01')).toHaveLength(
      1,
    );
    expect(getNextExpectedLocalDate(schedule, '2026-07-26')).toBe('2026-08-01');
  });

  it('creates weekday occurrences only on selected ISO weekdays', () => {
    const schedule: ScheduleDefinition = {
      ...baseSchedule,
      slots: [
        {
          dayPart: 'day',
          id: 'hair-wash',
          label: 'Planirano danas',
          preferredMinutes: null,
          sortOrder: 10,
        },
      ],
      type: 'weekdays',
      weekdays: [1, 4, 6],
    };

    expect(generateOccurrencesForDate([schedule], '2026-07-25')).toHaveLength(
      1,
    );
    expect(generateOccurrencesForDate([schedule], '2026-07-26')).toHaveLength(
      0,
    );
    expect(getNextExpectedLocalDate(schedule, '2026-07-26')).toBe('2026-07-27');
  });

  it('anchors an interval to the last actual completion and stays overdue', () => {
    const schedule: ScheduleDefinition = {
      ...baseSchedule,
      firstDueLocalDate: '2026-07-01',
      intervalEvery: 14,
      intervalUnit: 'day',
      lastCompletionLocalDate: '2026-07-10',
      slots: [
        {
          dayPart: 'anytime',
          id: 'nails',
          label: 'Danas',
          preferredMinutes: null,
          sortOrder: 10,
        },
      ],
      type: 'interval',
    };

    expect(generateOccurrencesForDate([schedule], '2026-07-23')).toHaveLength(
      0,
    );

    const due = generateOccurrencesForDate([schedule], '2026-07-24')[0];
    const overdue = generateOccurrencesForDate([schedule], '2026-07-27')[0];

    expect(due?.plannedLocalDate).toBe('2026-07-24');
    expect(due?.isOverdue).toBe(false);
    expect(overdue?.plannedLocalDate).toBe('2026-07-24');
    expect(overdue?.isOverdue).toBe(true);
    expect(overdue?.occurrenceKey).toBe(due?.occurrenceKey);
    expect(overdue?.slotLabel).toBe('Na redu od 24.7.2026.');
    expect(getNextExpectedLocalDate(schedule, '2026-07-27')).toBe('2026-07-24');
  });

  it('moves the next interval from the latest actual completion date', () => {
    const schedule: ScheduleDefinition = {
      ...baseSchedule,
      firstDueLocalDate: '2026-07-01',
      intervalEvery: 2,
      intervalUnit: 'week',
      lastCompletionLocalDate: '2026-07-26',
      type: 'interval',
    };

    expect(getNextExpectedLocalDate(schedule, '2026-07-26')).toBe('2026-08-09');
    expect(generateOccurrencesForDate([schedule], '2026-08-08')).toHaveLength(
      0,
    );
    expect(generateOccurrencesForDate([schedule], '2026-08-09')).toHaveLength(
      1,
    );
  });

  it('does not create planned occurrences for an unscheduled activity', () => {
    expect(generateOccurrencesForDate([baseSchedule], '2026-07-26')).toEqual(
      [],
    );
    expect(getNextExpectedLocalDate(baseSchedule, '2026-07-26')).toBeNull();
  });
});
