import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useActivityStore } from '@/data/activity-store-context';
import {
  AppText,
  EmptyState,
  Screen,
  Surface,
} from '@/design-system/components';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import type { ActivityDetails } from '@/domain/activities';
import type { DayPart } from '@/domain/schedules';

const ROUTINES: { dayPart: DayPart; description: string; title: string }[] = [
  {
    dayPart: 'morning',
    description: 'Aktivnosti s jutarnjim terminom.',
    title: 'Jutarnja rutina',
  },
  {
    dayPart: 'evening',
    description: 'Aktivnosti s večernjim terminom.',
    title: 'Večernja rutina',
  },
];

export default function RoutinesScreen() {
  const theme = useAppTheme();
  const store = useActivityStore();
  const [activities, setActivities] = useState<ActivityDetails[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setActivities(await store.listActivities());
      setErrorMessage(null);
    } catch {
      setErrorMessage('Rutine se trenutačno ne mogu učitati.');
    }
  }, [store]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function move(activityId: string, dayPart: DayPart, direction: -1 | 1) {
    const group = activities.filter(
      (activity) =>
        activity.status === 'active' &&
        activity.schedule.dayParts.includes(dayPart),
    );
    const groupIndex = group.findIndex(
      (activity) => activity.id === activityId,
    );
    const target = group[groupIndex + direction];
    if (!target) return;

    const next = [...activities];
    const currentIndex = next.findIndex(
      (activity) => activity.id === activityId,
    );
    const targetIndex = next.findIndex((activity) => activity.id === target.id);
    [next[currentIndex], next[targetIndex]] = [
      next[targetIndex]!,
      next[currentIndex]!,
    ];
    setActivities(next);

    try {
      await store.reorderActivities(next.map((activity) => activity.id));
      setErrorMessage(null);
    } catch {
      setErrorMessage('Novi redoslijed nije spremljen.');
      await load();
    }
  }

  return (
    <Screen contentStyle={styles.content} testID="routines-screen">
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Natrag"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
        >
          <AppText variant="bodyLarge">‹</AppText>
        </Pressable>
        <View style={styles.headerCopy}>
          <AppText accessibilityRole="header" variant="heading" weight="bold">
            Rutine
          </AppText>
          <AppText tone="muted" variant="caption">
            Poredaj aktivnosti kako ih želiš vidjeti i dovršiti na ekranu Danas.
          </AppText>
        </View>
      </View>

      {errorMessage ? (
        <Surface>
          <AppText tone="danger">{errorMessage}</AppText>
        </Surface>
      ) : null}

      {ROUTINES.map((routine) => {
        const members = activities.filter(
          (activity) =>
            activity.status === 'active' &&
            activity.schedule.dayParts.includes(routine.dayPart),
        );

        return (
          <View key={routine.dayPart} style={styles.section}>
            <View style={styles.sectionCopy}>
              <AppText variant="bodyLarge" weight="bold">
                {routine.title}
              </AppText>
              <AppText tone="muted" variant="caption">
                {routine.description}
              </AppText>
            </View>
            {members.length === 0 ? (
              <EmptyState
                actionLabel="Dodaj aktivnost"
                description={`Dodaj ${routine.dayPart === 'morning' ? 'jutarnji' : 'večernji'} termin postojećoj ili novoj aktivnosti.`}
                onAction={() => router.push('/activities/new' as Href)}
                title="Rutina je prazna"
              />
            ) : (
              <View style={styles.list}>
                {members.map((activity, index) => (
                  <Surface
                    key={activity.id}
                    style={[styles.row, { borderLeftColor: activity.color }]}
                  >
                    <Pressable
                      accessibilityHint="Otvara uređivanje aktivnosti"
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: '/activities/[id]',
                          params: { id: activity.id },
                        } as unknown as Href)
                      }
                      style={styles.activityCopy}
                    >
                      <AppText style={styles.icon}>{activity.icon}</AppText>
                      <View style={styles.nameCopy}>
                        <AppText weight="semibold">{activity.name}</AppText>
                        <AppText tone="subtle" variant="caption">
                          Dodirni za uređivanje
                        </AppText>
                      </View>
                    </Pressable>
                    <View style={styles.orderActions}>
                      <Pressable
                        accessibilityLabel={`Pomakni ${activity.name} gore`}
                        accessibilityRole="button"
                        disabled={index === 0}
                        onPress={() =>
                          void move(activity.id, routine.dayPart, -1)
                        }
                        style={[
                          styles.orderButton,
                          {
                            backgroundColor: theme.colors.surfaceMuted,
                            opacity: index === 0 ? 0.35 : 1,
                          },
                        ]}
                      >
                        <AppText weight="bold">↑</AppText>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Pomakni ${activity.name} dolje`}
                        accessibilityRole="button"
                        disabled={index === members.length - 1}
                        onPress={() =>
                          void move(activity.id, routine.dayPart, 1)
                        }
                        style={[
                          styles.orderButton,
                          {
                            backgroundColor: theme.colors.surfaceMuted,
                            opacity: index === members.length - 1 ? 0.35 : 1,
                          },
                        ]}
                      >
                        <AppText weight="bold">↓</AppText>
                      </Pressable>
                    </View>
                  </Surface>
                ))}
              </View>
            )}
          </View>
        );
      })}

      <View
        style={[styles.note, { backgroundColor: theme.colors.infoSurface }]}
      >
        <AppText style={{ color: theme.colors.infoText }} variant="caption">
          Rutina je jednostavan prikaz jutarnjih ili večernjih termina. Ne
          duplicira aktivnosti ni njihove zapise.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingBottom: spacing.huge },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  headerCopy: { flex: 1, gap: spacing.xxs },
  backButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  section: { gap: spacing.md },
  sectionCopy: { gap: spacing.xs },
  list: { gap: spacing.sm },
  row: {
    alignItems: 'center',
    borderLeftWidth: 4,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  activityCopy: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: touchTarget,
  },
  icon: { fontSize: 23, lineHeight: 28 },
  nameCopy: { flex: 1, gap: spacing.xxs },
  orderActions: { flexDirection: 'row', gap: spacing.xs },
  orderButton: {
    alignItems: 'center',
    borderRadius: radii.sm,
    height: touchTarget,
    justifyContent: 'center',
    width: 40,
  },
  note: { borderRadius: radii.md, padding: spacing.md },
});
