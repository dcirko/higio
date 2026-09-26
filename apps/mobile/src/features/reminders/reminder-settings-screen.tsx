import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import {
  AppButton,
  AppText,
  AppTextField,
  Screen,
  Surface,
  ToggleRow,
} from '@/design-system/components';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import {
  REMINDER_GROUPS,
  type ReminderGroup,
  type ReminderPreferences,
} from '@/domain/reminders';
import { isLocalTime } from '@/domain/time';
import { useReminderRuntime } from '@/features/reminders/reminder-runtime';

const GROUP_COPY: Record<
  ReminderGroup,
  { description: string; label: string }
> = {
  unfinished: {
    description:
      'Sve neodrađene planirane aktivnosti dana, uključujući propušteno jutro. Kad sve evidentiraš, podsjetnik se otkazuje.',
    label: 'Neodrađeno danas',
  },
  morning: {
    description: 'Aktivnosti iz jutarnjih dnevnih slotova.',
    label: 'Jutro',
  },
  day: {
    description: 'Dnevni, intervalni i “bilo kada” termini.',
    label: 'Tijekom dana',
  },
  evening: {
    description: 'Aktivnosti iz večernjih dnevnih slotova.',
    label: 'Večer',
  },
};

function permissionCopy(
  permission: ReturnType<typeof useReminderRuntime>['permission'],
) {
  if (permission === 'granted') {
    return 'Dozvola je uključena na ovom uređaju.';
  }

  if (permission === 'denied') {
    return 'Dozvola je isključena u postavkama uređaja.';
  }

  if (permission === 'unavailable') {
    return 'Lokalne obavijesti provjeravaju se u Android ili iOS aplikaciji.';
  }

  return 'Dozvolu ćemo zatražiti tek kada uključiš podsjetnike.';
}

export default function ReminderSettingsScreen() {
  const theme = useAppTheme();
  const runtime = useReminderRuntime();
  const [timeDrafts, setTimeDrafts] = useState<
    Partial<Record<ReminderGroup, string>>
  >({});
  const [timeErrors, setTimeErrors] = useState<
    Partial<Record<ReminderGroup, string>>
  >({});

  async function updatePreferences(next: ReminderPreferences) {
    await runtime.savePreferences(next);
  }

  async function updateGroupEnabled(group: ReminderGroup, enabled: boolean) {
    await updatePreferences({
      ...runtime.preferences,
      slots: {
        ...runtime.preferences.slots,
        [group]: { ...runtime.preferences.slots[group], enabled },
      },
    });
  }

  async function saveGroupTime(group: ReminderGroup) {
    const time = timeDrafts[group] ?? runtime.preferences.slots[group].time;

    if (!isLocalTime(time)) {
      setTimeErrors((current) => ({
        ...current,
        [group]: 'Upiši vrijeme u obliku HH:mm, npr. 08:00.',
      }));
      return;
    }

    setTimeErrors((current) => ({ ...current, [group]: undefined }));
    await updatePreferences({
      ...runtime.preferences,
      slots: {
        ...runtime.preferences.slots,
        [group]: { ...runtime.preferences.slots[group], time },
      },
    });
    setTimeDrafts((current) => ({ ...current, [group]: undefined }));
  }

  if (runtime.isLoading) {
    return (
      <Screen contentStyle={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
        <AppText tone="muted">Učitavam lokalne postavke…</AppText>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content} testID="reminder-settings-screen">
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Natrag"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
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
            Podsjetnici
          </AppText>
          <AppText tone="muted" variant="caption">
            Lokalno na uređaju · vrijeme Zagreb
          </AppText>
        </View>
      </View>

      <Surface style={styles.section}>
        <ToggleRow
          description="Dozvola se traži samo pri uključivanju. Ostatak aplikacije radi i bez nje."
          label="Lokalni podsjetnici"
          onValueChange={(enabled) => void runtime.setRemindersEnabled(enabled)}
          value={runtime.preferences.enabled}
        />
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor:
                runtime.permission === 'denied'
                  ? theme.colors.warningSurface
                  : theme.colors.surfaceMuted,
            },
          ]}
        >
          <View style={styles.statusCopy}>
            <AppText variant="label" weight="bold">
              Status dozvole
            </AppText>
            <AppText tone="muted" variant="caption">
              {permissionCopy(runtime.permission)}
            </AppText>
          </View>
          {runtime.permission === 'denied' ? (
            <AppButton
              label="Postavke"
              onPress={() => void runtime.openSystemSettings()}
              variant="secondary"
            />
          ) : null}
        </View>
      </Surface>

      <View style={styles.sectionGroup}>
        <View style={styles.sectionHeading}>
          <AppText variant="bodyLarge" weight="bold">
            Vrijeme podsjetnika
          </AppText>
          <AppText tone="muted" variant="caption">
            Jedna mirna obavijest grupira sve neodrađene aktivnosti tog dijela
            dana.
          </AppText>
        </View>

        {REMINDER_GROUPS.map((group) => {
          const copy = GROUP_COPY[group];
          const preferences = runtime.preferences.slots[group];
          const timeValue = timeDrafts[group] ?? preferences.time;

          return (
            <Surface key={group} style={styles.groupCard}>
              <ToggleRow
                description={copy.description}
                label={copy.label}
                onValueChange={(enabled) =>
                  void updateGroupEnabled(group, enabled)
                }
                value={preferences.enabled}
              />
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <AppTextField
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={preferences.enabled}
                    keyboardType="numbers-and-punctuation"
                    label="Vrijeme"
                    maxLength={5}
                    onChangeText={(value) =>
                      setTimeDrafts((current) => ({
                        ...current,
                        [group]: value,
                      }))
                    }
                    placeholder="HH:mm"
                    value={timeValue}
                  />
                </View>
                <AppButton
                  disabled={
                    !preferences.enabled || timeValue === preferences.time
                  }
                  label="Spremi"
                  onPress={() => void saveGroupTime(group)}
                  variant="secondary"
                />
              </View>
              {timeErrors[group] ? (
                <AppText tone="danger" variant="caption">
                  {timeErrors[group]}
                </AppText>
              ) : null}
            </Surface>
          );
        })}
      </View>

      <Surface style={styles.section}>
        <ToggleRow
          description="Isključeno je privatnija zadana opcija: zaključani zaslon prikazuje samo dio dana, bez naziva aktivnosti."
          label="Prikaži nazive aktivnosti"
          onValueChange={(showActivityNames) =>
            void updatePreferences({
              ...runtime.preferences,
              showActivityNames,
            })
          }
          value={runtime.preferences.showActivityNames}
        />
      </Surface>

      <Surface style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <AppText variant="heading">◷</AppText>
        </View>
        <View style={styles.summaryCopy}>
          <AppText weight="bold">
            {runtime.preferences.enabled
              ? `${runtime.scheduledCount} budućih podsjetnika`
              : 'Podsjetnici su isključeni'}
          </AppText>
          <AppText tone="muted" variant="caption">
            Raspored se automatski usklađuje nakon izvršenja, uređivanja
            aktivnosti i povratka u aplikaciju.
          </AppText>
        </View>
        {runtime.isSyncing ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : null}
      </Surface>

      {runtime.errorMessage ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.errorCard,
            { backgroundColor: theme.colors.warningSurface },
          ]}
        >
          <AppText
            style={{ color: theme.colors.warningText }}
            variant="caption"
          >
            {runtime.errorMessage}
          </AppText>
          <AppButton
            label="Pokušaj ponovno"
            onPress={() => void runtime.refresh()}
            variant="secondary"
          />
        </View>
      ) : null}

      <AppText style={styles.privacyNote} tone="subtle" variant="caption">
        Higio ne šalje raspored na server. Android/iOS čuva zakazane obavijesti
        lokalno, a Higio ih planira prema zoni Europe/Zagreb.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xxl,
    paddingBottom: spacing.huge,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  section: {
    gap: spacing.lg,
  },
  sectionGroup: {
    gap: spacing.md,
  },
  sectionHeading: {
    gap: spacing.xs,
  },
  statusCard: {
    alignItems: 'center',
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  statusCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  groupCard: {
    gap: spacing.md,
  },
  timeRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeField: {
    flex: 1,
  },
  summaryCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: touchTarget,
  },
  summaryCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  errorCard: {
    borderRadius: radii.md,
    gap: spacing.md,
    padding: spacing.md,
  },
  privacyNote: {
    textAlign: 'center',
  },
});
