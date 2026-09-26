import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import migrations from '../../drizzle/migrations';
import { ActivityStoreProvider } from '@/data/activity-store-context';
import { BackupStoreProvider } from '@/data/backup-store-context';
import { database } from '@/data/db/client';
import { upgradeOccasionalCare } from '@/data/db/upgrade-occasional-care';
import { HistoryStoreProvider } from '@/data/history-store-context';
import { OnboardingStoreProvider } from '@/data/onboarding-store-context';
import { ReminderStoreProvider } from '@/data/reminder-store-context';
import { SqliteActivityStore } from '@/data/repositories/sqlite-activity-store';
import { SqliteBackupStore } from '@/data/repositories/sqlite-backup-store';
import { SqliteHistoryStore } from '@/data/repositories/sqlite-history-store';
import {
  prepareOnboarding,
  SqliteOnboardingStore,
} from '@/data/repositories/sqlite-onboarding-store';
import { SqliteReminderStore } from '@/data/repositories/sqlite-reminder-store';
import { SqliteTodayStore } from '@/data/repositories/sqlite-today-store';
import { StoreEvents } from '@/data/store-events';
import { TodayStoreProvider } from '@/data/today-store-context';
import { AppText } from '@/design-system/components';
import { spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { privacySafeLogger } from '@/shared/observability/privacy-safe-logger';

const APPLICATION_START_TIME = Date.now();

function StartupState({ error }: { error?: Error }) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityRole={error ? 'alert' : undefined}
      style={[styles.startup, { backgroundColor: theme.colors.background }]}
    >
      {error ? null : <ActivityIndicator color={theme.colors.primary} />}
      <AppText
        accessibilityRole={error ? 'header' : undefined}
        variant="bodyLarge"
        weight="bold"
      >
        {error ? 'Lokalna baza se nije mogla otvoriti' : 'Pripremamo Higio'}
      </AppText>
      <AppText style={styles.centered} tone="muted" variant="label">
        {error
          ? 'Tvoji podatci nisu promijenjeni. Ponovno pokreni aplikaciju.'
          : 'Sigurno pripremamo lokalne podatke na ovom uređaju.'}
      </AppText>
    </View>
  );
}

export function DatabaseBoundary({ children }: PropsWithChildren) {
  const migration = useMigrations(database, migrations);
  const [initializationError, setInitializationError] = useState<
    Error | undefined
  >();
  const [isInitialized, setIsInitialized] = useState(false);
  const stores = useMemo(() => {
    const events = new StoreEvents();

    return {
      activity: new SqliteActivityStore(database, events),
      backup: new SqliteBackupStore(events),
      history: new SqliteHistoryStore(database, events),
      onboarding: new SqliteOnboardingStore(database, events),
      reminders: new SqliteReminderStore(database),
      today: new SqliteTodayStore(database, events),
    };
  }, []);

  useEffect(() => {
    if (!migration.success || isInitialized || initializationError) {
      return;
    }

    let isActive = true;

    void Promise.resolve().then(() => {
      if (!isActive) {
        return;
      }

      try {
        prepareOnboarding(database);
        upgradeOccasionalCare(database);
        privacySafeLogger.metric(
          'startup.local-database.ready',
          Date.now() - APPLICATION_START_TIME,
        );
        setIsInitialized(true);
      } catch (error) {
        setInitializationError(
          error instanceof Error
            ? error
            : new Error('Nepoznata greška lokalne baze.'),
        );
      }
    });

    return () => {
      isActive = false;
    };
  }, [initializationError, isInitialized, migration.success]);

  const error = migration.error ?? initializationError;

  if (error) {
    return <StartupState error={error} />;
  }

  if (!migration.success || !isInitialized) {
    return <StartupState />;
  }

  return (
    <BackupStoreProvider store={stores.backup}>
      <OnboardingStoreProvider store={stores.onboarding}>
        <ReminderStoreProvider store={stores.reminders}>
          <ActivityStoreProvider store={stores.activity}>
            <HistoryStoreProvider store={stores.history}>
              <TodayStoreProvider store={stores.today}>
                {children}
              </TodayStoreProvider>
            </HistoryStoreProvider>
          </ActivityStoreProvider>
        </ReminderStoreProvider>
      </OnboardingStoreProvider>
    </BackupStoreProvider>
  );
}

const styles = StyleSheet.create({
  startup: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  centered: {
    maxWidth: 320,
    textAlign: 'center',
  },
});
