import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { createMemoryTodayStore } from '@/data/memory/memory-today-store';
import TodayScreen from '@/features/today/today-screen';
import { TEMPLATE_PACKS, createDraftFromTemplate } from '@/domain/templates';
import { addCalendarDays } from '@/domain/time';
import { addDogRoutine } from '@/domain/dog';

jest.mock('expo-crypto', () => {
  let sequence = 0;
  return { randomUUID: jest.fn(() => `today-test-${++sequence}`) };
});

jest.mock('expo-haptics', () => ({
  AndroidHaptics: { Confirm: 'confirm' },
  NotificationFeedbackType: { Success: 'success' },
  notificationAsync: jest.fn(() => Promise.resolve()),
  performAndroidHapticsAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

describe('<TodayScreen />', () => {
  it('shows dog meals only in the separate dog screen', async () => {
    const store = createMemoryTodayStore({ startEmpty: true });
    await addDogRoutine(store, '2026-07-31');
    const personal = await render(<TodayScreen store={store} />);
    await waitFor(() =>
      expect(personal.queryByText('Hrana za psa')).toBeNull(),
    );
    await personal.unmount();
    const dog = await render(<TodayScreen store={store} scope="dog" />);
    expect(await dog.findByText('0 od 6 planiranih')).toBeOnTheScreen();
    expect(dog.getAllByText('Hrana za psa')).toHaveLength(3);
    await fireEvent.press(
      dog.getByRole('button', {
        name: 'Hrana za psa, Jutarnji termin. Dodirni za evidentiranje.',
      }),
    );
    expect(await dog.findByText('1 od 6 planiranih')).toBeOnTheScreen();
    await fireEvent.press(dog.getByRole('button', { name: 'Poništi' }));
    expect(await dog.findByText('0 od 6 planiranih')).toBeOnTheScreen();
  });
  it('shows the full creatine dose and completes it with a single tap and undo', async () => {
    const store = createMemoryTodayStore({ startEmpty: true });
    const template = TEMPLATE_PACKS.find((pack) => pack.id === 'supplements')!
      .activities[0]!;
    await store.createActivity(
      createDraftFromTemplate(template, '2026-07-31', addCalendarDays),
      '2026-07-31',
    );
    const { findByText, getByRole } = await render(
      <TodayScreen store={store} />,
    );
    await findByText('0 od 1 planiranih');
    await fireEvent.press(
      getByRole('button', { name: /Kreatin, .*3 tablete/ }),
    );
    expect(await findByText('1 od 1 planiranih')).toBeOnTheScreen();
    expect((await store.listEntries())[0]?.doseLabel).toBe('3 tablete');
    await fireEvent.press(getByRole('button', { name: 'Poništi' }));
    expect(await findByText('0 od 1 planiranih')).toBeOnTheScreen();
    expect(await store.listEntries()).toHaveLength(0);
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-31T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the main one-tap experience in the Zagreb timezone', async () => {
    const store = createMemoryTodayStore();
    const { findByText, getByRole } = await render(
      <TodayScreen store={store} />,
    );

    expect(getByRole('header', { name: 'Danas' })).toBeOnTheScreen();
    expect(await findByText('0 od 6 planiranih')).toBeOnTheScreen();
    expect(await findByText('Zagreb')).toBeOnTheScreen();
    expect(
      getByRole('button', {
        name: 'Pranje zubi, Jutarnji termin. Dodirni za evidentiranje.',
      }),
    ).toBeOnTheScreen();
    expect(
      getByRole('button', {
        name: 'Brijanje, Zadnji put: još nije evidentirano. Možeš evidentirati ponovno.',
      }),
    ).toBeOnTheScreen();
  });

  it('shows a full-screen confirmation and supports undo', async () => {
    const store = createMemoryTodayStore();
    const { findByText, getByRole, getByTestId } = await render(
      <TodayScreen store={store} />,
    );
    const activity = await waitFor(() =>
      getByRole('button', {
        name: 'Pranje zubi, Jutarnji termin. Dodirni za evidentiranje.',
      }),
    );

    await fireEvent.press(activity);

    expect(await findByText('1 od 6 planiranih')).toBeOnTheScreen();
    expect(await findByText('Bravo, spremljeno!')).toBeOnTheScreen();
    expect(getByTestId('completion-celebration')).toBeOnTheScreen();
    expect(await findByText(/po zagrebačkom vremenu/)).toBeOnTheScreen();

    await fireEvent.press(getByRole('button', { name: 'Poništi' }));

    expect(await findByText('0 od 6 planiranih')).toBeOnTheScreen();
  });

  it('loads a previously saved completion after a remount', async () => {
    const store = createMemoryTodayStore();
    const firstRender = await render(<TodayScreen store={store} />);
    const activity = await waitFor(() =>
      firstRender.getByRole('button', {
        name: 'Pranje zubi, Jutarnji termin. Dodirni za evidentiranje.',
      }),
    );

    await fireEvent.press(activity);
    expect(await firstRender.findByText('1 od 6 planiranih')).toBeOnTheScreen();
    await firstRender.unmount();

    const secondRender = await render(<TodayScreen store={store} />);
    expect(
      await secondRender.findByText('1 od 6 planiranih'),
    ).toBeOnTheScreen();
  });

  it('completes the unfinished morning routine with one action', async () => {
    const store = createMemoryTodayStore();
    const { findByText, getByRole } = await render(
      <TodayScreen store={store} />,
    );

    const routineButton = await waitFor(() =>
      getByRole('button', { name: 'Dovrši jutarnju rutinu' }),
    );
    await fireEvent.press(routineButton);

    expect(await findByText('2 od 6 planiranih')).toBeOnTheScreen();
    expect(await findByText('Jutarnja rutina')).toBeOnTheScreen();
  });
});
