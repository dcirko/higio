import { router, type Href } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { filterTodayScope } from '@/domain/dog';
import { Pressable, StyleSheet, View } from 'react-native';

import { createMemoryTodayStore } from '@/data/memory/memory-today-store';
import { useTodayStoreContext } from '@/data/today-store-context';
import {
  ActivityCard,
  AppText,
  CompletionCelebration,
  EmptyState,
  Screen,
  Snackbar,
  Surface,
} from '@/design-system/components';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import type { DayPart } from '@/domain/schedules';
import type { TodayOccurrence, TodayStore } from '@/domain/today-store';
import {
  formatZagrebDay,
  getCurrentZagrebLocalDate,
  getZagrebDateTimeSnapshot,
} from '@/domain/time';
import { triggerCompletionHaptic, triggerUndoHaptic } from '@/shared/haptics';
import { usePreferences } from '@/shared/preferences';
import { privacySafeLogger } from '@/shared/observability/privacy-safe-logger';

const DAY_PARTS: { key: DayPart; label: string }[] = [
  { key: 'morning', label: 'Jutro' },
  { key: 'day', label: 'Tijekom dana' },
  { key: 'evening', label: 'Večer' },
  { key: 'anytime', label: 'Kada stigneš' },
];

type TodayScreenProps = {
  store?: TodayStore;
  scope?: 'personal' | 'dog';
  introduction?: ReactNode;
};

type CompletionFeedback = {
  localTime: string;
  logIds: string[];
  title: string;
};

export default function TodayScreen({
  store: providedStore,
  scope = 'personal',
  introduction,
}: TodayScreenProps) {
  const theme = useAppTheme();
  const { hapticsEnabled } = usePreferences();
  const contextStore = useTodayStoreContext();
  const [fallbackStore] = useState(createMemoryTodayStore);
  const store = providedStore ?? contextStore ?? fallbackStore;
  const localDate = getCurrentZagrebLocalDate();
  const [items, setItems] = useState<TodayOccurrence[]>([]);
  const [busyKeys, setBusyKeys] = useState(() => new Set<string>());
  const [lastCompleted, setLastCompleted] = useState<CompletionFeedback | null>(
    null,
  );
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDay = useCallback(async () => {
    const startedAt = Date.now();
    try {
      const day = await store.loadDay(localDate);
      setItems(filterTodayScope(day, scope));
      setErrorMessage(null);
    } catch {
      setErrorMessage(
        'Današnji plan trenutačno nije moguće učitati. Pokušaj ponovno.',
      );
    } finally {
      privacySafeLogger.metric('today.load.completed', Date.now() - startedAt);
      setIsLoading(false);
    }
  }, [localDate, scope, store]);

  useEffect(() => {
    let isActive = true;

    void Promise.resolve().then(() => {
      if (isActive) {
        return loadDay();
      }
    });

    return () => {
      isActive = false;
    };
  }, [loadDay]);

  useEffect(() => store.subscribe?.(() => void loadDay()), [loadDay, store]);

  useEffect(() => {
    if (!lastCompleted || celebrationVisible) {
      return;
    }

    const timer = setTimeout(() => setLastCompleted(null), 4500);
    return () => clearTimeout(timer);
  }, [celebrationVisible, lastCompleted]);

  const plannedItems = items.filter((item) => item.countsTowardProgress);
  const quickItems = items.filter((item) => !item.isPlanned);
  const completedCount = plannedItems.filter(
    (item) => item.completedLogId !== null,
  ).length;
  const completionPercentage =
    plannedItems.length === 0
      ? 0
      : Math.round((completedCount / plannedItems.length) * 100);
  const progressWidth = useMemo(
    () => `${completionPercentage}%` as `${number}%`,
    [completionPercentage],
  );

  async function completeActivity(activity: TodayOccurrence) {
    if (
      (!activity.isRepeatable && activity.completedLogId !== null) ||
      busyKeys.has(activity.occurrenceKey)
    ) {
      return;
    }

    const snapshot = getZagrebDateTimeSnapshot();

    setBusyKeys((current) => new Set(current).add(activity.occurrenceKey));
    if (!activity.isRepeatable) {
      setItems((current) =>
        current.map((item) =>
          item.occurrenceKey === activity.occurrenceKey
            ? {
                ...item,
                completedAtLocalTime: snapshot.localTime,
                completedLogId: 'pending',
              }
            : item,
        ),
      );
    }
    void triggerCompletionHaptic(hapticsEnabled).catch(() => undefined);

    try {
      const completion = await store.completeOccurrence(
        activity,
        snapshot.occurredAtUtc,
      );
      if (activity.isRepeatable) {
        await loadDay();
      } else {
        setItems((current) =>
          current.map((item) =>
            item.occurrenceKey === completion.occurrenceKey
              ? {
                  ...item,
                  completedAtLocalTime: completion.localTime,
                  completedLogId: completion.logId,
                }
              : item,
          ),
        );
      }
      setLastCompleted({
        localTime: completion.localTime,
        logIds: [completion.logId],
        title: completion.title,
      });
      setCelebrationVisible(true);
      setErrorMessage(null);
    } catch {
      await loadDay();
      setErrorMessage(
        'Evidentiranje nije spremljeno. Tvoj prethodni zapis nije promijenjen.',
      );
    } finally {
      setBusyKeys((current) => {
        const next = new Set(current);
        next.delete(activity.occurrenceKey);
        return next;
      });
    }
  }

  async function completeRoutine(
    title: string,
    routineActivities: TodayOccurrence[],
  ) {
    const pending = routineActivities.filter(
      (activity) =>
        activity.completedLogId === null &&
        !busyKeys.has(activity.occurrenceKey),
    );

    if (pending.length === 0) return;

    const snapshot = getZagrebDateTimeSnapshot();
    const pendingKeys = new Set(
      pending.map((activity) => activity.occurrenceKey),
    );
    setBusyKeys((current) => new Set([...current, ...pendingKeys]));
    setItems((current) =>
      current.map((item) =>
        pendingKeys.has(item.occurrenceKey)
          ? {
              ...item,
              completedAtLocalTime: snapshot.localTime,
              completedLogId: 'pending',
            }
          : item,
      ),
    );
    void triggerCompletionHaptic(hapticsEnabled).catch(() => undefined);

    const completedLogIds: string[] = [];

    try {
      for (const activity of pending) {
        const completion = await store.completeOccurrence(
          activity,
          snapshot.occurredAtUtc,
        );
        completedLogIds.push(completion.logId);
      }

      await loadDay();
      setLastCompleted({
        localTime: snapshot.localTime,
        logIds: completedLogIds,
        title,
      });
      setCelebrationVisible(true);
      setErrorMessage(null);
    } catch {
      await Promise.all(
        completedLogIds.map((logId) =>
          store.undoCompletion(logId).catch(() => undefined),
        ),
      );
      await loadDay();
      setErrorMessage(
        'Rutina nije spremljena do kraja pa su djelomični zapisi poništeni.',
      );
    } finally {
      setBusyKeys((current) => {
        const next = new Set(current);
        for (const key of pendingKeys) next.delete(key);
        return next;
      });
    }
  }

  async function undoLastCompletion() {
    if (!lastCompleted) {
      return;
    }

    const completion = lastCompleted;
    setCelebrationVisible(false);
    setLastCompleted(null);

    try {
      await Promise.all(
        completion.logIds.map((logId) => store.undoCompletion(logId)),
      );
      await loadDay();
      void triggerUndoHaptic(hapticsEnabled).catch(() => undefined);
    } catch {
      setErrorMessage(
        'Poništavanje nije uspjelo. Spremljeni zapis ostao je nepromijenjen.',
      );
      await loadDay();
    }
  }

  return (
    <View style={styles.root}>
      <Screen contentStyle={styles.screenContent} testID="today-screen">
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <AppText tone="muted" variant="label" weight="semibold">
              {formatZagrebDay(localDate)}
            </AppText>
            <View style={styles.titleRow}>
              <AppText accessibilityRole="header" variant="title" weight="bold">
                {scope === 'dog' ? 'Pas' : 'Danas'}
              </AppText>
              <View
                style={[
                  styles.timezonePill,
                  { backgroundColor: theme.colors.surfaceMuted },
                ]}
              >
                <AppText tone="muted" variant="caption" weight="semibold">
                  Zagreb
                </AppText>
              </View>
            </View>
          </View>
          <Pressable
            accessibilityHint="Otvara upravljanje aktivnostima"
            accessibilityLabel="Upravljaj aktivnostima"
            accessibilityRole="button"
            onPress={() => router.push('/activities' as Href)}
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.primarySoft },
            ]}
          >
            <AppText tone="primary" variant="bodyLarge" weight="bold">
              +
            </AppText>
          </Pressable>
        </View>

        {introduction}
        <Surface style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View style={styles.progressCopy}>
              <AppText variant="bodyLarge" weight="bold">
                {scope === 'dog'
                  ? 'Današnja briga za psa'
                  : 'Tvoj današnji ritam'}
              </AppText>
              <AppText tone="muted" variant="label">
                {completedCount} od {plannedItems.length} planiranih
              </AppText>
            </View>
            <View
              style={[
                styles.percentage,
                { backgroundColor: theme.colors.primarySoft },
              ]}
            >
              <AppText tone="primary" variant="label" weight="bold">
                {completionPercentage}%
              </AppText>
            </View>
          </View>
          <View
            accessibilityLabel={`Dnevni napredak ${completionPercentage} posto`}
            accessibilityRole="progressbar"
            style={[
              styles.progressTrack,
              { backgroundColor: theme.colors.surfaceMuted },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: theme.colors.primary,
                  width: progressWidth,
                },
              ]}
            />
          </View>
          <AppText tone="subtle" variant="caption">
            Dodirni aktivnost i Higio će je odmah spremiti.
          </AppText>
        </Surface>

        {errorMessage ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.messageCard,
              { backgroundColor: theme.colors.dangerSurface },
            ]}
          >
            <AppText tone="danger" variant="label">
              {errorMessage}
            </AppText>
          </View>
        ) : null}

        {isLoading ? (
          <Surface style={styles.loadingCard}>
            <AppText tone="muted" variant="label">
              Učitavam današnji plan…
            </AppText>
          </Surface>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <Surface>
            <EmptyState
              actionLabel="Dodaj aktivnost"
              description="Danas nema planiranih termina. Možeš dodati novu aktivnost ili urediti postojeći raspored."
              icon="🌿"
              onAction={() => router.push('/activities/new' as Href)}
              title="Danas je mirno"
            />
          </Surface>
        ) : null}

        {DAY_PARTS.map((part) => {
          const activities = plannedItems.filter(
            (activity) => activity.dayPart === part.key,
          );

          if (activities.length === 0) {
            return null;
          }

          return (
            <View key={part.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppText variant="bodyLarge" weight="bold">
                  {part.label}
                </AppText>
                <View style={styles.sectionActions}>
                  {(part.key === 'morning' || part.key === 'evening') &&
                  activities.length > 1 &&
                  activities.some(
                    (activity) => activity.completedLogId === null,
                  ) ? (
                    <Pressable
                      accessibilityLabel={
                        part.key === 'morning'
                          ? 'Dovrši jutarnju rutinu'
                          : 'Dovrši večernju rutinu'
                      }
                      accessibilityRole="button"
                      onPress={() =>
                        void completeRoutine(
                          part.key === 'morning'
                            ? 'Jutarnja rutina'
                            : 'Večernja rutina',
                          activities,
                        )
                      }
                      style={({ pressed }) => [
                        styles.routineButton,
                        {
                          backgroundColor: theme.colors.primarySoft,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <AppText tone="primary" variant="caption" weight="bold">
                        Dovrši rutinu
                      </AppText>
                    </Pressable>
                  ) : null}
                  <AppText tone="subtle" variant="caption" weight="semibold">
                    {
                      activities.filter(
                        (activity) => activity.completedLogId !== null,
                      ).length
                    }
                    /{activities.length}
                  </AppText>
                </View>
              </View>
              <View style={styles.activityList}>
                {activities.map((activity) => (
                  <ActivityCard
                    busy={busyKeys.has(activity.occurrenceKey)}
                    color={activity.color}
                    completed={activity.completedLogId !== null}
                    completedAtLocalTime={activity.completedAtLocalTime}
                    icon={activity.icon}
                    key={activity.occurrenceKey}
                    lastDone={activity.lastDone ?? undefined}
                    onPress={() => void completeActivity(activity)}
                    overdue={activity.isOverdue}
                    repeatable={activity.isRepeatable}
                    slotLabel={[activity.slotLabel, activity.doseLabel]
                      .filter(Boolean)
                      .join(' · ')}
                    title={activity.title}
                  />
                ))}
              </View>
            </View>
          );
        })}

        {quickItems.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.quickHeader}>
              <View style={styles.sectionCopy}>
                <AppText variant="bodyLarge" weight="bold">
                  {scope === 'dog'
                    ? 'Zadnje kupanje i zaštita'
                    : 'Povremena njega i brzi unosi'}
                </AppText>
                <AppText tone="subtle" variant="caption">
                  Bez fiksnog termina · ne ulaze u dnevni postotak
                </AppText>
              </View>
              <View
                style={[
                  styles.quickBadge,
                  { backgroundColor: theme.colors.surfaceMuted },
                ]}
              >
                <AppText tone="muted" variant="caption" weight="bold">
                  {quickItems.length}
                </AppText>
              </View>
            </View>
            <View style={styles.activityList}>
              {quickItems.map((activity) => (
                <ActivityCard
                  busy={busyKeys.has(activity.occurrenceKey)}
                  color={activity.color}
                  completed={false}
                  icon={activity.icon}
                  key={activity.occurrenceKey}
                  lastDone={activity.lastDone ?? undefined}
                  onPress={() => void completeActivity(activity)}
                  repeatable
                  slotLabel={[activity.slotLabel, activity.doseLabel]
                    .filter(Boolean)
                    .join(' · ')}
                  title={activity.title}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.localNote,
            { backgroundColor: theme.colors.infoSurface },
          ]}
        >
          <AppText style={{ color: theme.colors.infoText }} variant="caption">
            Privatno i lokalno: izvršenja se spremaju na ovom uređaju, po
            vremenu Europe/Zagreb.
          </AppText>
        </View>
      </Screen>

      <CompletionCelebration
        activityTitle={lastCompleted?.title ?? 'Aktivnost'}
        localTime={lastCompleted?.localTime ?? '--:--'}
        onDismiss={() => setCelebrationVisible(false)}
        onUndo={() => void undoLastCompletion()}
        visible={celebrationVisible && lastCompleted !== null}
      />

      <Snackbar
        actionLabel="Poništi"
        message={
          lastCompleted
            ? `${lastCompleted.title} je spremljeno u ${lastCompleted.localTime}.`
            : 'Aktivnost je spremljena.'
        }
        onAction={() => void undoLastCompletion()}
        visible={lastCompleted !== null && !celebrationVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screenContent: {
    gap: spacing.xxl,
    paddingBottom: 84,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerCopy: {
    gap: spacing.xxs,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  timezonePill: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  progressCard: {
    gap: spacing.md,
  },
  progressTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  percentage: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  progressTrack: {
    borderRadius: radii.pill,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: radii.pill,
    height: '100%',
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  routineButton: {
    borderRadius: radii.pill,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  sectionCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  quickHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  quickBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  activityList: {
    gap: spacing.sm,
  },
  localNote: {
    borderRadius: radii.md,
    padding: spacing.md,
  },
  messageCard: {
    borderRadius: radii.md,
    padding: spacing.md,
  },
  loadingCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});
