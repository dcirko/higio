import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useOptionalActivityStore } from '@/data/activity-store-context';
import { useOptionalHistoryStore } from '@/data/history-store-context';
import { createMemoryTodayStore } from '@/data/memory/memory-today-store';
import { useTodayStoreContext } from '@/data/today-store-context';
import {
  AppText,
  EmptyState,
  Screen,
  Surface,
} from '@/design-system/components';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import {
  buildInsights,
  type InsightRange,
  type InsightsSnapshot,
} from '@/domain/insights';
import {
  addCalendarDays,
  formatLocalDateShort,
  getCurrentZagrebLocalDate,
  parseLocalDate,
  type LocalDate,
} from '@/domain/time';

const RANGE_OPTIONS: { label: string; value: InsightRange }[] = [
  { label: '7 dana', value: 7 },
  { label: '30 dana', value: 30 },
];

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('hr-HR', {
  timeZone: 'Europe/Zagreb',
  weekday: 'short',
});

function getDayLabel(localDate: LocalDate, range: InsightRange) {
  const { day, month, year } = parseLocalDate(localDate);

  if (range === 30) {
    return String(day);
  }

  return WEEKDAY_FORMATTER.format(
    new Date(Date.UTC(year, month - 1, day, 12)),
  ).replace('.', '');
}

function formatAverageGap(value: number | null) {
  if (value === null) return 'Još nema dovoljno zapisa';
  if (value === 0) return 'Više puta isti dan';
  if (value === 1) return 'Prosječno 1 dan';
  return `Prosječno ${value.toLocaleString('hr-HR')} dana`;
}

export default function InsightsScreen() {
  const theme = useAppTheme();
  const contextTodayStore = useTodayStoreContext();
  const contextActivityStore = useOptionalActivityStore();
  const contextHistoryStore = useOptionalHistoryStore();
  const [fallbackStore] = useState(createMemoryTodayStore);
  const todayStore = contextTodayStore ?? fallbackStore;
  const activityStore = contextActivityStore ?? fallbackStore;
  const historyStore = contextHistoryStore ?? fallbackStore;
  const [range, setRange] = useState<InsightRange>(7);
  const [snapshot, setSnapshot] = useState<InsightsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toLocalDate = getCurrentZagrebLocalDate();

  const loadInsights = useCallback(async () => {
    setIsLoading(true);

    try {
      const fromLocalDate = addCalendarDays(toLocalDate, -(range - 1));
      const dates = Array.from({ length: range }, (_, index) =>
        addCalendarDays(fromLocalDate, index),
      );
      const [activities, entries, occurrences] = await Promise.all([
        activityStore.listActivities(),
        historyStore.listEntries({ toLocalDate }),
        Promise.all(dates.map((localDate) => todayStore.loadDay(localDate))),
      ]);

      setSnapshot(
        buildInsights({
          activities: activities.filter(
            (activity) => activity.category !== 'pet-care',
          ),
          days: dates.map((localDate, index) => ({
            localDate,
            occurrences: occurrences[index]!.filter(
              (item) => item.category !== 'pet-care',
            ),
          })),
          entries: entries.filter((entry) => entry.category !== 'pet-care'),
          range,
          toLocalDate,
        }),
      );
      setErrorMessage(null);
    } catch {
      setErrorMessage(
        'Statistika se trenutačno ne može izračunati. Pokušaj ponovno.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [activityStore, historyStore, range, toLocalDate, todayStore]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void loadInsights();
    });
    return () => {
      active = false;
    };
  }, [loadInsights]);

  useEffect(() => {
    return todayStore.subscribe?.(() => void loadInsights());
  }, [loadInsights, todayStore]);

  const chartDays = useMemo(
    () =>
      snapshot?.daily.filter(
        (_, index) => range === 7 || index % 3 === 0 || index === range - 1,
      ) ?? [],
    [range, snapshot],
  );

  return (
    <Screen contentStyle={styles.content} testID="insights-screen">
      <View style={styles.header}>
        <AppText accessibilityRole="header" variant="title" weight="bold">
          Statistika
        </AppText>
        <AppText tone="muted">
          Stvarni lokalni podatci, objašnjivi bez pritiska i streakova.
        </AppText>
      </View>

      <View
        accessibilityLabel="Razdoblje statistike"
        accessibilityRole="tablist"
        style={[
          styles.rangePicker,
          { backgroundColor: theme.colors.surfaceMuted },
        ]}
      >
        {RANGE_OPTIONS.map((option) => {
          const selected = option.value === range;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => setRange(option.value)}
              style={[
                styles.rangeOption,
                selected && { backgroundColor: theme.colors.surface },
              ]}
            >
              <AppText
                tone={selected ? 'primary' : 'muted'}
                variant="label"
                weight="bold"
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {errorMessage ? (
        <Surface style={styles.message}>
          <AppText tone="danger">{errorMessage}</AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadInsights()}
          >
            <AppText tone="primary" weight="bold">
              Pokušaj ponovno
            </AppText>
          </Pressable>
        </Surface>
      ) : null}

      {isLoading && !snapshot ? (
        <Surface style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
          <AppText tone="muted">Računam lokalnu statistiku…</AppText>
        </Surface>
      ) : null}

      {snapshot ? (
        <>
          <Surface style={styles.scoreCard}>
            <AppText tone="muted" variant="label" weight="semibold">
              ZADNJIH {range} DANA
            </AppText>
            <View style={styles.scoreRow}>
              <AppText variant="display" weight="bold">
                {snapshot.percentage === null ? '—' : `${snapshot.percentage}%`}
              </AppText>
              <View
                style={[
                  styles.explanationBadge,
                  { backgroundColor: theme.colors.primarySoft },
                ]}
              >
                <AppText tone="primary" variant="caption" weight="bold">
                  {snapshot.completed} od {snapshot.planned}
                </AppText>
              </View>
            </View>
            <AppText tone="muted" variant="label">
              {snapshot.planned === 0
                ? 'U ovom razdoblju nije bilo planiranih termina.'
                : 'Obavljeni termini podijeljeni s planiranim terminima u odabranom razdoblju.'}
            </AppText>
          </Surface>

          <Surface style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <AppText variant="bodyLarge" weight="bold">
                Dnevni ritam
              </AppText>
              <AppText tone="subtle" variant="caption">
                Europe/Zagreb
              </AppText>
            </View>
            <View style={styles.chart}>
              {chartDays.map((day) => {
                const percentage = day.percentage ?? 0;
                const height =
                  `${percentage === 0 ? 0 : Math.max(percentage, 5)}%` as `${number}%`;

                return (
                  <View
                    accessibilityLabel={`${formatLocalDateShort(day.localDate)}: ${day.completed} od ${day.planned} planiranih${day.percentage === null ? '' : `, ${day.percentage} posto`}`}
                    key={day.localDate}
                    style={styles.barColumn}
                  >
                    <View
                      style={[
                        styles.barTrack,
                        { backgroundColor: theme.colors.surfaceMuted },
                      ]}
                    >
                      <View
                        style={[
                          styles.barFill,
                          { backgroundColor: theme.colors.primary, height },
                        ]}
                      />
                    </View>
                    <AppText tone="subtle" variant="caption" weight="semibold">
                      {getDayLabel(day.localDate, range)}
                    </AppText>
                  </View>
                );
              })}
            </View>
            <AppText tone="subtle" variant="caption">
              Svaki stupac ima tekstualni opis za čitače zaslona.
            </AppText>
          </Surface>

          <View style={styles.metricGrid}>
            <Surface style={styles.metric}>
              <AppText tone="muted" variant="caption">
                Posljednje evidentiranje
              </AppText>
              <AppText variant="heading" weight="bold">
                {snapshot.lastCompletion?.localTime ?? '—'}
              </AppText>
              <AppText tone="subtle" variant="caption">
                {snapshot.lastCompletion
                  ? `${snapshot.lastCompletion.name} · ${formatLocalDateShort(snapshot.lastCompletion.localDate)}`
                  : 'Još nema evidentiranja'}
              </AppText>
            </Surface>
            <Surface style={styles.metric}>
              <AppText tone="muted" variant="caption">
                Razdoblje
              </AppText>
              <AppText variant="heading" weight="bold">
                {range} dana
              </AppText>
              <AppText tone="subtle" variant="caption">
                {formatLocalDateShort(snapshot.fromLocalDate)} –{' '}
                {formatLocalDateShort(snapshot.toLocalDate)}
              </AppText>
            </Surface>
          </View>

          <View style={styles.section}>
            <AppText variant="bodyLarge" weight="bold">
              Po aktivnosti
            </AppText>
            {snapshot.activities.length === 0 ? (
              <EmptyState
                description="Kad evidentiraš prvu aktivnost, ovdje će se pojaviti njezina povijest i ritam."
                title="Još nema podataka"
              />
            ) : (
              <View style={styles.activityList}>
                {snapshot.activities.map((activity) => (
                  <Surface
                    key={activity.activityId}
                    style={[
                      styles.activityCard,
                      { borderLeftColor: activity.color },
                    ]}
                  >
                    <View style={styles.activityHeader}>
                      <AppText style={styles.activityIcon}>
                        {activity.icon}
                      </AppText>
                      <View style={styles.activityCopy}>
                        <AppText weight="bold">{activity.name}</AppText>
                        <AppText tone="muted" variant="caption">
                          {activity.planned > 0
                            ? `${activity.completed} od ${activity.planned} planiranih · ${activity.percentage}%`
                            : `${activity.logCount} evidentiranja u razdoblju · bez postotka`}
                        </AppText>
                      </View>
                    </View>
                    <View style={styles.activityMeta}>
                      <AppText tone="subtle" variant="caption">
                        {activity.lastCompletion
                          ? `Posljednje ${formatLocalDateShort(activity.lastCompletion.localDate)} u ${activity.lastCompletion.localTime}`
                          : 'Još nije evidentirano'}
                      </AppText>
                      <AppText tone="subtle" variant="caption">
                        {formatAverageGap(activity.averageGapDays)}
                      </AppText>
                    </View>
                  </Surface>
                ))}
              </View>
            )}
          </View>

          <View
            style={[styles.note, { backgroundColor: theme.colors.infoSurface }]}
          >
            <AppText style={{ color: theme.colors.infoText }} variant="caption">
              Pauzirani dani ne ulaze u nazivnik. Promjena rasporeda vrijedi
              unaprijed pa stara statistika ostaje ista.
            </AppText>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingBottom: 88 },
  header: { gap: spacing.xs },
  rangePicker: {
    borderRadius: radii.md,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  rangeOption: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: touchTarget,
  },
  message: { gap: spacing.md },
  loading: { alignItems: 'center', gap: spacing.sm },
  scoreCard: { gap: spacing.sm },
  scoreRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  explanationBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chartCard: { gap: spacing.xl },
  chartHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.xs,
    height: 150,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    height: '100%',
    justifyContent: 'flex-end',
    minWidth: 8,
  },
  barTrack: {
    borderRadius: radii.pill,
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '72%',
  },
  barFill: { borderRadius: radii.pill, width: '100%' },
  metricGrid: { flexDirection: 'row', gap: spacing.md },
  metric: { flex: 1, gap: spacing.xs, minHeight: 132 },
  section: { gap: spacing.md },
  activityList: { gap: spacing.sm },
  activityCard: { borderLeftWidth: 4, gap: spacing.md },
  activityHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  activityIcon: { fontSize: 24, lineHeight: 30 },
  activityCopy: { flex: 1, gap: spacing.xxs },
  activityMeta: { gap: spacing.xxs },
  note: { borderRadius: radii.md, padding: spacing.md },
});
