import { useMemo, type PropsWithChildren } from 'react';

import { ActivityStoreProvider } from '@/data/activity-store-context';
import { BackupStoreProvider } from '@/data/backup-store-context';
import { HistoryStoreProvider } from '@/data/history-store-context';
import {
  MemoryOnboardingStore,
  type MemoryOnboardingSnapshot,
} from '@/data/memory/memory-onboarding-store';
import {
  MemoryReminderStore,
  type MemoryReminderSnapshot,
} from '@/data/memory/memory-reminder-store';
import {
  createMemoryTodayStore,
  type MemoryStoreSnapshot,
} from '@/data/memory/memory-today-store';
import { TodayStoreProvider } from '@/data/today-store-context';
import { ReminderStoreProvider } from '@/data/reminder-store-context';
import { OnboardingStoreProvider } from '@/data/onboarding-store-context';
import { UnavailableBackupStore } from '@/data/repositories/unavailable-backup-store';

const WEB_PREVIEW_STORAGE_KEY = 'higio.web-preview.store.v2';
const WEB_REMINDER_STORAGE_KEY = 'higio.web-preview.reminders.v1';
const WEB_ONBOARDING_STORAGE_KEY = 'higio.web-preview.onboarding.v1';

function readStoredSnapshot(): MemoryStoreSnapshot | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const value = window.localStorage.getItem(WEB_PREVIEW_STORAGE_KEY);
    return value ? (JSON.parse(value) as MemoryStoreSnapshot) : undefined;
  } catch {
    return undefined;
  }
}

function readStoredReminderSnapshot(): MemoryReminderSnapshot | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const value = window.localStorage.getItem(WEB_REMINDER_STORAGE_KEY);
    return value ? (JSON.parse(value) as MemoryReminderSnapshot) : undefined;
  } catch {
    return undefined;
  }
}

function readStoredOnboardingSnapshot(): MemoryOnboardingSnapshot | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const value = window.localStorage.getItem(WEB_ONBOARDING_STORAGE_KEY);
    return value ? (JSON.parse(value) as MemoryOnboardingSnapshot) : undefined;
  } catch {
    return undefined;
  }
}

export function DatabaseBoundary({ children }: PropsWithChildren) {
  const backupStore = useMemo(() => new UnavailableBackupStore(), []);
  const initialSnapshot = useMemo(() => readStoredSnapshot(), []);
  const store = useMemo(
    () =>
      createMemoryTodayStore({
        initialSnapshot,
        startEmpty: !initialSnapshot,
        onChange: (snapshot) => {
          window.localStorage.setItem(
            WEB_PREVIEW_STORAGE_KEY,
            JSON.stringify(snapshot),
          );
        },
      }),
    [initialSnapshot],
  );
  const onboardingStore = useMemo(() => {
    const stored = readStoredOnboardingSnapshot();
    const legacyCompleted = !stored && Boolean(initialSnapshot);
    return new MemoryOnboardingStore(
      stored ??
        (legacyCompleted
          ? { completedAtUtc: new Date().toISOString() }
          : undefined),
      (snapshot) =>
        window.localStorage.setItem(
          WEB_ONBOARDING_STORAGE_KEY,
          JSON.stringify(snapshot),
        ),
    );
  }, [initialSnapshot]);
  const reminderStore = useMemo(
    () =>
      new MemoryReminderStore(readStoredReminderSnapshot(), (snapshot) => {
        window.localStorage.setItem(
          WEB_REMINDER_STORAGE_KEY,
          JSON.stringify(snapshot),
        );
      }),
    [],
  );

  return (
    <BackupStoreProvider store={backupStore}>
      <OnboardingStoreProvider store={onboardingStore}>
        <ReminderStoreProvider store={reminderStore}>
          <ActivityStoreProvider store={store}>
            <HistoryStoreProvider store={store}>
              <TodayStoreProvider store={store}>{children}</TodayStoreProvider>
            </HistoryStoreProvider>
          </ActivityStoreProvider>
        </ReminderStoreProvider>
      </OnboardingStoreProvider>
    </BackupStoreProvider>
  );
}
