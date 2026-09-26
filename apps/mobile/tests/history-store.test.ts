import { createMemoryTodayStore } from '@/data/memory/memory-today-store';

jest.mock('expo-crypto', () => {
  let sequence = 0;

  return {
    randomUUID: () => `history-test-${++sequence}`,
  };
});

describe('History store corrections', () => {
  it('adds a missed planned execution and immediately updates Today', async () => {
    const store = createMemoryTodayStore();
    const candidates = await store.listPlannedCandidates(
      'brush-teeth',
      '2026-07-30',
    );
    const evening = candidates.find((candidate) =>
      candidate.label.includes('Večernji'),
    );

    expect(evening).toBeDefined();

    const entry = await store.createManualLog({
      activityId: 'brush-teeth',
      localDate: '2026-07-30',
      localTime: '22:15',
      plannedCandidate: evening,
    });
    const day = await store.loadDay('2026-07-30');
    const planned = day.find(
      (occurrence) => occurrence.occurrenceKey === evening?.occurrenceKey,
    );

    expect(entry.plannedSlotLabel).toBe('Večernji termin');
    expect(planned?.completedLogId).toBe(entry.id);
    expect(planned?.completedAtLocalTime).toBe('22:15');
  });

  it('edits, removes and restores a real log without losing its identity', async () => {
    const store = createMemoryTodayStore();
    const entry = await store.createManualLog({
      activityId: 'shave',
      localDate: '2026-07-29',
      localTime: '19:10',
    });

    const updated = await store.updateLogTime(entry.id, '2026-07-30', '07:45');
    expect(updated.id).toBe(entry.id);
    expect(updated.localDate).toBe('2026-07-30');
    expect(updated.localTime).toBe('07:45');

    await store.deleteLog(entry.id);
    expect(await store.listEntries()).toHaveLength(0);

    await store.restoreLog(entry.id);
    const restored = await store.listEntries();
    expect(restored).toHaveLength(1);
    expect(restored[0]!.id).toBe(entry.id);
  });

  it('filters history by date, activity and category', async () => {
    const store = createMemoryTodayStore();

    await store.createManualLog({
      activityId: 'brush-teeth',
      localDate: '2026-07-28',
      localTime: '08:00',
    });
    await store.createManualLog({
      activityId: 'shower',
      localDate: '2026-07-30',
      localTime: '20:00',
    });

    const dateEntries = await store.listEntries({
      fromLocalDate: '2026-07-29',
      toLocalDate: '2026-07-30',
    });
    const activityEntries = await store.listEntries({
      activityId: 'brush-teeth',
    });
    const categoryEntries = await store.listEntries({
      category: 'body-care',
    });

    expect(dateEntries.map((entry) => entry.activityId)).toEqual(['shower']);
    expect(activityEntries.map((entry) => entry.activityId)).toEqual([
      'brush-teeth',
    ]);
    expect(categoryEntries.map((entry) => entry.activityId)).toEqual([
      'shower',
    ]);
  });
});
