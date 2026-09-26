import {
  buildReminderPlan,
  DEFAULT_REMINDER_PREFERENCES,
  parseReminderPreferences,
  type ReminderPreferences,
} from '@/domain/reminders';
import type { TodayOccurrence } from '@/domain/today-store';
import type { LocalDate } from '@/domain/time';

function occurrence(
  localDate: LocalDate,
  overrides: Partial<TodayOccurrence> = {},
): TodayOccurrence {
  return {
    activityId: 'teeth',
    color: '#217D5C',
    completedAtLocalTime: null,
    completedLogId: null,
    countsTowardProgress: true,
    dayPart: 'morning',
    icon: '🪥',
    isOverdue: false,
    isPlanned: true,
    isRepeatable: false,
    lastDone: null,
    occurrenceKey: `teeth:morning:${localDate}`,
    plannedLocalDate: localDate,
    scheduleVersionId: 'teeth:schedule',
    slotId: 'teeth:morning',
    slotLabel: 'Jutarnji termin',
    sortOrder: 10,
    title: 'Pranje zubi',
    ...overrides,
  };
}

function enabledPreferences(
  overrides: Partial<ReminderPreferences> = {},
): ReminderPreferences {
  return {
    ...DEFAULT_REMINDER_PREFERENCES,
    enabled: true,
    ...overrides,
  };
}

describe('reminder planner', () => {
  it('adds the daily check to old preferences without enabling notifications', () => {
    const preferences = parseReminderPreferences({
      enabled: false,
      slots: { morning: { enabled: true, time: '09:15' } },
    });
    expect(preferences.enabled).toBe(false);
    expect(preferences.slots.morning.time).toBe('09:15');
    expect(preferences.slots.unfinished).toEqual({
      enabled: true,
      time: '21:00',
    });
  });

  it('reminds about missed morning and anytime work later in the day', () => {
    const localDate: LocalDate = '2026-08-01';
    const plan = buildReminderPlan({
      days: [
        {
          localDate,
          occurrences: [
            occurrence(localDate),
            occurrence(localDate, { dayPart: 'anytime', title: 'Vitamin' }),
          ],
        },
      ],
      now: new Date('2026-08-01T17:00:00Z'),
      preferences: enabledPreferences({ showActivityNames: true }),
    });
    expect(plan).toHaveLength(1);
    expect(plan[0]?.data.reminderGroup).toBe('unfinished');
    expect(plan[0]?.body).toContain('Vitamin');
    expect(plan[0]?.body).toContain('Pranje zubi');
    expect(plan[0]?.fireAtUtc.toISOString()).toBe('2026-08-01T19:00:00.000Z');
  });

  it('does not schedule the daily check when disabled or its time has passed', () => {
    const localDate: LocalDate = '2026-08-01';
    const preferences = enabledPreferences();
    const days = [{ localDate, occurrences: [occurrence(localDate)] }];
    expect(
      buildReminderPlan({
        days,
        preferences,
        now: new Date('2026-08-01T19:00:00Z'),
      }),
    ).toEqual([]);
    expect(
      buildReminderPlan({
        days,
        preferences: {
          ...preferences,
          slots: {
            ...preferences.slots,
            unfinished: { enabled: false, time: '21:00' },
          },
        },
        now: new Date('2026-08-01T17:00:00Z'),
      }),
    ).toEqual([]);
  });
  it('groups pending work and hides activity names by default', () => {
    const localDate: LocalDate = '2026-08-01';
    const plan = buildReminderPlan({
      days: [
        {
          localDate,
          occurrences: [
            occurrence(localDate),
            occurrence(localDate, {
              activityId: 'skin',
              occurrenceKey: 'skin:morning:2026-08-01',
              title: 'Njega kože',
            }),
          ],
        },
      ],
      now: new Date('2026-08-01T05:00:00.000Z'),
      preferences: enabledPreferences(),
    });

    expect(plan).toHaveLength(2);
    expect(plan[0]).toMatchObject({
      body: 'Vrijeme je za jutarnju rutinu.',
      key: 'higio:v1:2026-08-01:morning',
      title: 'Higio',
    });
    expect(plan[0]?.fireAtUtc.toISOString()).toBe('2026-08-01T06:00:00.000Z');
    expect(plan[0]?.body).not.toContain('Pranje zubi');
  });

  it('omits completed and unscheduled activities', () => {
    const localDate: LocalDate = '2026-08-01';
    const plan = buildReminderPlan({
      days: [
        {
          localDate,
          occurrences: [
            occurrence(localDate, { completedLogId: 'log-1' }),
            occurrence(localDate, {
              activityId: 'shave',
              isPlanned: false,
              occurrenceKey: 'shave:quick:2026-08-01',
              title: 'Brijanje',
            }),
          ],
        },
      ],
      now: new Date('2026-08-01T05:00:00.000Z'),
      preferences: enabledPreferences(),
    });

    expect(plan).toEqual([]);
  });

  it('can show activity names only after explicit opt-in', () => {
    const localDate: LocalDate = '2026-08-01';
    const plan = buildReminderPlan({
      days: [{ localDate, occurrences: [occurrence(localDate)] }],
      now: new Date('2026-08-01T05:00:00.000Z'),
      preferences: enabledPreferences({ showActivityNames: true }),
    });

    expect(plan[0]?.body).toBe('Pranje zubi čeka evidentiranje.');
  });

  it('moves a nonexistent Zagreb DST minute to the first valid minute', () => {
    const localDate = '2026-03-29';
    const preferences = enabledPreferences({
      slots: {
        ...DEFAULT_REMINDER_PREFERENCES.slots,
        morning: { enabled: true, time: '02:30' },
      },
    });
    const plan = buildReminderPlan({
      days: [{ localDate, occurrences: [occurrence(localDate)] }],
      now: new Date('2026-03-28T22:00:00.000Z'),
      preferences,
    });

    expect(plan[0]?.fireAtUtc.toISOString()).toBe('2026-03-29T01:00:00.000Z');
  });
});
