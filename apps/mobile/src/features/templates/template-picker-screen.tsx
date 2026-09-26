import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useActivityStore } from '@/data/activity-store-context';
import { useOnboarding } from '@/data/onboarding-store-context';
import {
  AppButton,
  AppText,
  Screen,
  Surface,
} from '@/design-system/components';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { TEMPLATE_PACKS, createDraftFromTemplate } from '@/domain/templates';
import { addCalendarDays, getCurrentZagrebLocalDate } from '@/domain/time';

type TemplatePickerScreenProps = { onboarding?: boolean };

export default function TemplatePickerScreen({
  onboarding = false,
}: TemplatePickerScreenProps) {
  const theme = useAppTheme();
  const activityStore = useActivityStore();
  const { complete } = useOnboarding();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(onboarding ? ['oral-basics', 'body-basics'] : []),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedActivityCount = useMemo(
    () =>
      TEMPLATE_PACKS.filter((pack) => selectedIds.has(pack.id)).reduce(
        (sum, pack) => sum + pack.activities.length,
        0,
      ),
    [selectedIds],
  );

  function togglePack(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveSelection(startEmpty = false) {
    setIsSaving(true);
    setMessage(null);

    try {
      let added = 0;

      if (!startEmpty) {
        const localDate = getCurrentZagrebLocalDate();
        const existingNames = new Set(
          (await activityStore.listActivities()).map((activity) =>
            activity.name.trim().toLocaleLowerCase('hr'),
          ),
        );
        const templates = TEMPLATE_PACKS.filter((pack) =>
          selectedIds.has(pack.id),
        ).flatMap((pack) => pack.activities);

        for (const template of templates) {
          const key = template.name.trim().toLocaleLowerCase('hr');
          if (existingNames.has(key)) continue;
          await activityStore.createActivity(
            createDraftFromTemplate(template, localDate, addCalendarDays),
            localDate,
          );
          existingNames.add(key);
          added += 1;
        }
      }

      if (onboarding) {
        await complete();
        router.replace('/' as Href);
      } else {
        setMessage(
          added > 0
            ? `Dodano aktivnosti: ${added}. Svaku možeš odmah prilagoditi.`
            : 'Odabrane aktivnosti već postoje ili ništa nije odabrano.',
        );
      }
    } catch {
      setMessage(
        'Predlošci se nisu mogli spremiti. Postojeći podatci nisu obrisani.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen
      contentStyle={styles.content}
      testID={onboarding ? 'onboarding-screen' : 'templates-screen'}
    >
      <View style={styles.headerRow}>
        {!onboarding ? (
          <Pressable
            accessibilityLabel="Natrag"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[
              styles.backButton,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <AppText variant="bodyLarge">‹</AppText>
          </Pressable>
        ) : null}
        <View style={styles.headerCopy}>
          <AppText
            accessibilityRole="header"
            variant={onboarding ? 'title' : 'heading'}
            weight="bold"
          >
            {onboarding ? 'Tvoj Higio, tvoj ritam' : 'Početni predlošci'}
          </AppText>
          <AppText tone="muted">
            {onboarding
              ? 'Odaberi samo ono što želiš pratiti. Sve poslije možeš urediti ili pauzirati.'
              : 'Dodaj gotovu osnovu bez dupliciranja aktivnosti koje već imaš.'}
          </AppText>
        </View>
      </View>

      {onboarding ? (
        <View
          style={[
            styles.privacyCard,
            { backgroundColor: theme.colors.infoSurface },
          ]}
        >
          <AppText style={{ color: theme.colors.infoText }} weight="semibold">
            Privatno i bez registracije
          </AppText>
          <AppText style={{ color: theme.colors.infoText }} variant="caption">
            Podatci ostaju lokalno na ovom uređaju. Za početak ti ne treba
            internet ni račun.
          </AppText>
        </View>
      ) : null}

      <View style={styles.packList}>
        {TEMPLATE_PACKS.map((pack) => {
          const selected = selectedIds.has(pack.id);

          return (
            <Pressable
              accessibilityHint="Uključuje ili isključuje cijelu grupu predložaka"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              key={pack.id}
              onPress={() => togglePack(pack.id)}
              style={({ pressed }) => [
                styles.packCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: selected
                    ? theme.colors.primary
                    : theme.colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.packIcon,
                  { backgroundColor: theme.colors.surfaceMuted },
                ]}
              >
                <AppText style={styles.emoji}>{pack.icon}</AppText>
              </View>
              <View style={styles.packCopy}>
                <AppText variant="bodyLarge" weight="bold">
                  {pack.title}
                </AppText>
                <AppText tone="muted" variant="caption">
                  {pack.description}
                </AppText>
                <AppText tone="subtle" variant="caption">
                  {pack.activities
                    .map((activity) =>
                      [activity.name, activity.schedule.doseLabel]
                        .filter(Boolean)
                        .join(' — '),
                    )
                    .join(' · ')}
                </AppText>
              </View>
              <View
                style={[
                  styles.check,
                  {
                    backgroundColor: selected
                      ? theme.colors.primary
                      : 'transparent',
                    borderColor: selected
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
              >
                {selected ? (
                  <AppText
                    style={{ color: theme.colors.onPrimary }}
                    weight="bold"
                  >
                    ✓
                  </AppText>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {message ? (
        <Surface>
          <AppText tone={message.startsWith('Dodano') ? 'primary' : 'muted'}>
            {message}
          </AppText>
        </Surface>
      ) : null}

      <View style={styles.actions}>
        <AppButton
          disabled={isSaving || selectedActivityCount === 0}
          label={
            isSaving
              ? 'Spremam…'
              : onboarding
                ? `Započni s ${selectedActivityCount} aktivnosti`
                : `Dodaj odabrano (${selectedActivityCount})`
          }
          onPress={() => void saveSelection()}
        />
        {onboarding ? (
          <AppButton
            disabled={isSaving}
            label="Kreni bez predložaka"
            onPress={() => void saveSelection(true)}
            variant="secondary"
          />
        ) : null}
      </View>

      <AppText style={styles.disclaimer} tone="subtle" variant="caption">
        Predlošci su samo prilagodljiva organizacijska polazišta, a ne
        zdravstvene ili medicinske preporuke.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingBottom: spacing.huge },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  headerCopy: { flex: 1, gap: spacing.xs },
  backButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  privacyCard: { borderRadius: radii.md, gap: spacing.xs, padding: spacing.lg },
  packList: { gap: spacing.sm },
  packCard: {
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 116,
    padding: spacing.md,
  },
  packIcon: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  emoji: { fontSize: 23, lineHeight: 28 },
  packCopy: { flex: 1, gap: spacing.xs },
  check: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },

  actions: { gap: spacing.sm },
  disclaimer: { textAlign: 'center' },
});
