import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useActivityStore } from '@/data/activity-store-context';
import {
  AppButton,
  AppText,
  EmptyState,
  Screen,
  Surface,
} from '@/design-system/components';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import {
  getCategoryLabel,
  getScheduleSummary,
  type ActivityDetails,
  type ActivityStatus,
} from '@/domain/activities';
import { formatLocalDateShort } from '@/domain/time';

const STATUS_SECTIONS: {
  empty: string;
  label: string;
  status: ActivityStatus;
}[] = [
  {
    empty: 'Nema aktivnih aktivnosti.',
    label: 'Aktivne',
    status: 'active',
  },
  {
    empty: 'Nema pauziranih aktivnosti.',
    label: 'Pauzirane',
    status: 'paused',
  },
  {
    empty: 'Nema arhiviranih aktivnosti.',
    label: 'Arhivirane',
    status: 'archived',
  },
];

export default function ActivityListScreen() {
  const theme = useAppTheme();
  const store = useActivityStore();
  const [activities, setActivities] = useState<ActivityDetails[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    try {
      setErrorMessage(null);
      setActivities(await store.listActivities());
    } catch {
      setErrorMessage('Aktivnosti se trenutačno ne mogu učitati.');
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  useFocusEffect(
    useCallback(() => {
      void loadActivities();
    }, [loadActivities]),
  );

  return (
    <Screen contentStyle={styles.content} testID="activity-list-screen">
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Natrag"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor: theme.colors.surface,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <AppText variant="bodyLarge">‹</AppText>
        </Pressable>
        <View style={styles.headerCopy}>
          <AppText accessibilityRole="header" variant="heading" weight="bold">
            Aktivnosti
          </AppText>
          <AppText tone="muted" variant="caption">
            Što pratiš i kada se pojavljuje na ekranu Danas.
          </AppText>
        </View>
      </View>

      <AppButton
        label="+ Nova aktivnost"
        onPress={() => router.push('/activities/new' as Href)}
      />

      {errorMessage ? (
        <Surface style={styles.message}>
          <AppText tone="danger">{errorMessage}</AppText>
          <AppButton
            label="Pokušaj ponovno"
            onPress={() => void loadActivities()}
            variant="secondary"
          />
        </Surface>
      ) : null}

      {isLoading ? (
        <Surface style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
          <AppText tone="muted">Učitavam aktivnosti…</AppText>
        </Surface>
      ) : null}

      {!isLoading && activities.length === 0 ? (
        <EmptyState
          actionLabel="Dodaj prvu aktivnost"
          description="Kreni s jednom stvari koju želiš evidentirati bez dodatnog obrasca."
          onAction={() => router.push('/activities/new' as Href)}
          title="Tvoj popis je prazan"
        />
      ) : null}

      {!isLoading
        ? STATUS_SECTIONS.map((section) => {
            const sectionItems = activities.filter(
              (activity) => activity.status === section.status,
            );

            if (sectionItems.length === 0 && section.status !== 'active') {
              return null;
            }

            return (
              <View key={section.status} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <AppText variant="bodyLarge" weight="bold">
                    {section.label}
                  </AppText>
                  <View
                    style={[
                      styles.count,
                      { backgroundColor: theme.colors.surfaceMuted },
                    ]}
                  >
                    <AppText tone="muted" variant="caption" weight="bold">
                      {sectionItems.length}
                    </AppText>
                  </View>
                </View>

                {sectionItems.length === 0 ? (
                  <AppText tone="subtle" variant="caption">
                    {section.empty}
                  </AppText>
                ) : (
                  <View style={styles.list}>
                    {sectionItems.map((activity) => (
                      <Pressable
                        accessibilityHint="Otvara uređivanje aktivnosti"
                        accessibilityRole="button"
                        key={activity.id}
                        onPress={() =>
                          router.push({
                            pathname: '/activities/[id]',
                            params: { id: activity.id },
                          } as unknown as Href)
                        }
                        style={({ pressed }) => [
                          styles.activityRow,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            borderLeftColor: activity.color,
                            opacity: pressed ? 0.72 : 1,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.activityIcon,
                            { backgroundColor: theme.colors.surfaceMuted },
                          ]}
                        >
                          <AppText style={styles.emoji}>
                            {activity.icon}
                          </AppText>
                        </View>
                        <View style={styles.activityCopy}>
                          <AppText weight="semibold">{activity.name}</AppText>
                          <AppText
                            numberOfLines={1}
                            tone="muted"
                            variant="caption"
                          >
                            {getCategoryLabel(activity.category)} ·{' '}
                            {[
                              getScheduleSummary(activity.schedule),
                              activity.schedule.doseLabel,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </AppText>
                          {activity.status === 'active' ? (
                            <AppText
                              numberOfLines={1}
                              tone="subtle"
                              variant="caption"
                            >
                              {activity.nextExpectedLocalDate
                                ? `Sljedeće: ${formatLocalDateShort(activity.nextExpectedLocalDate)}`
                                : 'Brza aktivnost · bez fiksnog termina'}
                            </AppText>
                          ) : null}
                        </View>
                        <AppText tone="subtle" variant="bodyLarge">
                          ›
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xxl,
    paddingBottom: spacing.huge,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  message: {
    gap: spacing.md,
  },
  loading: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  count: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  list: {
    gap: spacing.sm,
  },
  activityRow: {
    alignItems: 'center',
    borderRadius: radii.lg,
    borderLeftWidth: 4,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 84,
    padding: spacing.md,
  },
  activityIcon: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  emoji: {
    fontSize: 23,
    lineHeight: 28,
  },
  activityCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
});
