import { createMemoryTodayStore } from '@/data/memory/memory-today-store';
import type { ActivityDraft } from '@/domain/activities';
import type { LocalDate } from '@/domain/time';

let mockGeneratedId = 0;

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => `generated-${mockGeneratedId++}`),
}));

const LOCAL_DATE = '2026-07-26' as LocalDate;
const DRAFT: ActivityDraft = {
  category: 'oral-care',
  color: '#217D5C',
  description: 'Interni alpha test',
  icon: '🦷',
  name: 'Zubni konac',
  schedule: {
    dayParts: ['evening'],
    firstDueLocalDate: null,
    intervalEvery: null,
    intervalUnit: null,
    startsOnLocalDate: LOCAL_DATE,
    type: 'daily_slots',
    weekdays: [],
  },
};

describe('ActivityStore first-alpha lifecycle', () => {
  it('creates and edits an activity that appears in the daily plan', async () => {
    const store = createMemoryTodayStore();
    const created = await store.createActivity(DRAFT, LOCAL_DATE);

    expect(created.name).toBe('Zubni konac');
    expect(await store.getActivity(created.id)).toMatchObject({
      category: 'oral-care',
      status: 'active',
    });
    expect(
      (await store.loadDay(LOCAL_DATE)).find(
        (occurrence) => occurrence.activityId === created.id,
      ),
    ).toMatchObject({
      color: '#217D5C',
      dayPart: 'evening',
      title: 'Zubni konac',
    });

    await store.updateActivity(
      created.id,
      {
        ...DRAFT,
        icon: '✨',
        name: 'Konac za zube',
      },
      LOCAL_DATE,
    );

    expect(await store.getActivity(created.id)).toMatchObject({
      icon: '✨',
      name: 'Konac za zube',
    });
  });

  it('keeps an already completed card visible when tracking is paused', async () => {
    const store = createMemoryTodayStore();
    const created = await store.createActivity(DRAFT, LOCAL_DATE);
    const occurrence = (await store.loadDay(LOCAL_DATE)).find(
      (item) => item.activityId === created.id,
    );

    expect(occurrence).toBeDefined();
    await store.completeOccurrence(
      occurrence!,
      new Date('2026-07-26T18:30:00.000Z'),
    );
    await store.setActivityStatus(created.id, 'paused', LOCAL_DATE);

    expect(
      (await store.loadDay(LOCAL_DATE)).find(
        (item) => item.activityId === created.id,
      )?.completedLogId,
    ).not.toBeNull();
    expect(await store.getActivity(created.id)).toMatchObject({
      status: 'paused',
    });
  });

  it('hides unfinished paused and archived activities without deleting them', async () => {
    const store = createMemoryTodayStore();
    const created = await store.createActivity(DRAFT, LOCAL_DATE);

    await store.setActivityStatus(created.id, 'paused', LOCAL_DATE);
    expect(
      (await store.loadDay(LOCAL_DATE)).some(
        (item) => item.activityId === created.id,
      ),
    ).toBe(false);

    await store.setActivityStatus(created.id, 'archived', LOCAL_DATE);
    expect(await store.getActivity(created.id)).toMatchObject({
      name: 'Zubni konac',
      status: 'archived',
    });
  });

  it('supports an interval activity and keeps one overdue occurrence open', async () => {
    const store = createMemoryTodayStore();
    const created = await store.createActivity(
      {
        ...DRAFT,
        name: 'Rezanje noktiju',
        schedule: {
          dayParts: ['anytime'],
          firstDueLocalDate: '2026-07-20',
          intervalEvery: 14,
          intervalUnit: 'day',
          startsOnLocalDate: '2026-07-20',
          type: 'interval',
          weekdays: [],
        },
      },
      LOCAL_DATE,
    );
    const occurrence = (await store.loadDay(LOCAL_DATE)).find(
      (item) => item.activityId === created.id,
    );

    expect(occurrence).toMatchObject({
      isOverdue: true,
      plannedLocalDate: '2026-07-20',
      slotLabel: 'Na redu od 20.7.2026.',
    });

    await store.completeOccurrence(
      occurrence!,
      new Date('2026-07-26T10:00:00.000Z'),
    );

    expect(
      (await store.loadDay('2026-08-08')).some(
        (item) => item.activityId === created.id,
      ),
    ).toBe(false);
    expect(
      (await store.loadDay('2026-08-09')).find(
        (item) => item.activityId === created.id,
      ),
    ).toMatchObject({
      isOverdue: false,
      plannedLocalDate: '2026-08-09',
    });
  });

  it('keeps an unscheduled quick activity repeatable and outside progress', async () => {
    const store = createMemoryTodayStore();
    const created = await store.createActivity(
      {
        ...DRAFT,
        name: 'Brijanje',
        schedule: {
          dayParts: ['anytime'],
          firstDueLocalDate: null,
          intervalEvery: null,
          intervalUnit: null,
          startsOnLocalDate: LOCAL_DATE,
          type: 'unscheduled',
          weekdays: [],
        },
      },
      LOCAL_DATE,
    );
    const quickActivity = (await store.loadDay(LOCAL_DATE)).find(
      (item) => item.activityId === created.id,
    );

    expect(quickActivity).toMatchObject({
      countsTowardProgress: false,
      isPlanned: false,
      isRepeatable: true,
    });

    const first = await store.completeOccurrence(
      quickActivity!,
      new Date('2026-07-26T08:00:00.000Z'),
    );
    const second = await store.completeOccurrence(
      quickActivity!,
      new Date('2026-07-26T18:00:00.000Z'),
    );

    expect(first.logId).not.toBe(second.logId);
    expect(
      (await store.loadDay(LOCAL_DATE)).find(
        (item) => item.activityId === created.id,
      )?.isRepeatable,
    ).toBe(true);
  });
});
