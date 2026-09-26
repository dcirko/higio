import { createMemoryTodayStore } from '@/data/memory/memory-today-store';
import { TEMPLATE_PACKS, createDraftFromTemplate } from '@/domain/templates';
import { addCalendarDays } from '@/domain/time';

jest.mock('expo-crypto', () => {
  let sequence = 0;
  return { randomUUID: () => `template-test-${++sequence}` };
});

describe('Phase 9 templates and routine order', () => {
  it('turns an interval template into a local-date activity draft', () => {
    const template = TEMPLATE_PACKS.find(
      (pack) => pack.id === 'personal-items',
    )!.activities.find((activity) => activity.id === 'replace-toothbrush')!;
    const draft = createDraftFromTemplate(
      template,
      '2026-08-05',
      addCalendarDays,
    );

    expect(draft.schedule).toMatchObject({
      firstDueLocalDate: '2026-11-03',
      intervalEvery: 90,
      startsOnLocalDate: '2026-08-05',
      type: 'interval',
    });
  });

  it('persists an explicitly changed activity order in the memory store', async () => {
    const store = createMemoryTodayStore();
    const original = await store.listActivities();
    const reversedIds = original.map((activity) => activity.id).reverse();

    await store.reorderActivities(reversedIds);

    expect(
      (await store.listActivities()).map((activity) => activity.id),
    ).toEqual(reversedIds);
  });
});
