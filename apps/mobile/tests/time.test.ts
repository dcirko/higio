import {
  addCalendarDays,
  createZagrebDateTimeSnapshot,
  differenceInCalendarDays,
  getIsoWeekday,
  getZagrebDateTimeSnapshot,
} from '@/domain/time';

describe('Zagreb calendar rules', () => {
  it('handles month boundaries and leap years as calendar dates', () => {
    expect(addCalendarDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addCalendarDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addCalendarDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(differenceInCalendarDays('2028-03-01', '2028-02-28')).toBe(2);
    expect(getIsoWeekday('2026-07-26')).toBe(7);
  });

  it('uses the correct offset before and after the spring DST change', () => {
    const before = getZagrebDateTimeSnapshot(
      new Date('2026-03-29T00:30:00.000Z'),
    );
    const after = getZagrebDateTimeSnapshot(
      new Date('2026-03-29T01:30:00.000Z'),
    );

    expect(before.localDate).toBe('2026-03-29');
    expect(before.localTime).toBe('01:30');
    expect(before.utcOffsetMinutes).toBe(60);
    expect(after.localTime).toBe('03:30');
    expect(after.utcOffsetMinutes).toBe(120);
  });

  it('preserves the repeated local hour and its actual autumn offset', () => {
    const summerOffset = getZagrebDateTimeSnapshot(
      new Date('2026-10-25T00:30:00.000Z'),
    );
    const winterOffset = getZagrebDateTimeSnapshot(
      new Date('2026-10-25T01:30:00.000Z'),
    );

    expect(summerOffset.localTime).toBe('02:30');
    expect(summerOffset.utcOffsetMinutes).toBe(120);
    expect(winterOffset.localTime).toBe('02:30');
    expect(winterOffset.utcOffsetMinutes).toBe(60);
  });

  it('converts an entered Zagreb date and time to the correct UTC instant', () => {
    const winter = createZagrebDateTimeSnapshot('2026-01-15', '08:20');
    const summer = createZagrebDateTimeSnapshot('2026-07-15', '08:20');

    expect(winter.occurredAtUtc.toISOString()).toBe('2026-01-15T07:20:00.000Z');
    expect(winter.utcOffsetMinutes).toBe(60);
    expect(summer.occurredAtUtc.toISOString()).toBe('2026-07-15T06:20:00.000Z');
    expect(summer.utcOffsetMinutes).toBe(120);
  });

  it('rejects a local time skipped by the spring DST transition', () => {
    expect(() => createZagrebDateTimeSnapshot('2026-03-29', '02:30')).toThrow(
      'ne postoji',
    );
  });

  it('uses the first real instant during the repeated autumn hour', () => {
    const snapshot = createZagrebDateTimeSnapshot('2026-10-25', '02:30');

    expect(snapshot.occurredAtUtc.toISOString()).toBe(
      '2026-10-25T00:30:00.000Z',
    );
    expect(snapshot.utcOffsetMinutes).toBe(120);
  });
});
