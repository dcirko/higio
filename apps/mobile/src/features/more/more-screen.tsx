import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Screen,
  Surface,
  ToggleRow,
} from '@/design-system/components';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import { usePreferences } from '@/shared/preferences';

const MENU_ITEMS = [
  {
    description: 'Hrana, šetnje, kupanje i zaštita od buha',
    glyph: '🐕',
    route: '/dog',
    title: 'Pas',
  },
  {
    description: 'Dodavanje, uređivanje i pauziranje',
    glyph: '◎',
    route: '/activities',
    title: 'Aktivnosti',
  },
  {
    description: 'Jutarnje i večernje grupe',
    glyph: '☷',
    route: '/routines',
    title: 'Rutine',
  },
  {
    description: 'Prilagodljive početne grupe aktivnosti',
    glyph: '+',
    route: '/templates',
    title: 'Predlošci',
  },
  {
    description: 'Lokalno vrijeme, privatnost i dozvole',
    glyph: '◷',
    route: '/reminders',
    title: 'Podsjetnici',
  },
  {
    description: 'Sigurnosna kopija i zaštita uređaja',
    glyph: '◈',
    route: '/data-privacy',
    title: 'Podatci i privatnost',
  },
] as const;

export default function MoreScreen() {
  const theme = useAppTheme();
  const { hapticsEnabled, setHapticsEnabled } = usePreferences();

  return (
    <Screen contentStyle={styles.content} testID="more-screen">
      <View style={styles.header}>
        <AppText accessibilityRole="header" variant="title" weight="bold">
          Više
        </AppText>
        <AppText tone="muted">Postavke i upravljanje aplikacijom.</AppText>
      </View>

      <View style={styles.section}>
        <AppText tone="subtle" variant="caption" weight="bold">
          ORGANIZACIJA
        </AppText>
        <Surface padded={false}>
          {MENU_ITEMS.map((item, index) => (
            <Pressable
              accessibilityHint={`Otvara ${item.title.toLocaleLowerCase('hr')}`}
              accessibilityRole="button"
              key={item.title}
              onPress={() => router.push(item.route as Href)}
              style={({ pressed }) => [
                styles.menuRow,
                index > 0 && {
                  borderTopColor: theme.colors.divider,
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                style={[
                  styles.menuGlyph,
                  { backgroundColor: theme.colors.surfaceMuted },
                ]}
              >
                <AppText tone="primary" weight="bold">
                  {item.glyph}
                </AppText>
              </View>
              <View style={styles.menuCopy}>
                <AppText weight="semibold">{item.title}</AppText>
                <AppText tone="muted" variant="caption">
                  {item.description}
                </AppText>
              </View>
              <AppText tone="subtle" variant="bodyLarge">
                ›
              </AppText>
            </Pressable>
          ))}
        </Surface>
      </View>

      <View style={styles.section}>
        <AppText tone="subtle" variant="caption" weight="bold">
          OSJEĆAJ APLIKACIJE
        </AppText>
        <Surface>
          <ToggleRow
            description="Kratka potvrda nakon evidentiranja jednim dodirom."
            label="Haptika"
            onValueChange={setHapticsEnabled}
            value={hapticsEnabled}
          />
        </Surface>
      </View>

      <View style={styles.section}>
        <AppText tone="subtle" variant="caption" weight="bold">
          O APLIKACIJI
        </AppText>
        <Surface style={styles.aboutCard}>
          <View
            style={[styles.logo, { backgroundColor: theme.colors.primarySoft }]}
          >
            <AppText tone="primary" variant="heading" weight="bold">
              H
            </AppText>
          </View>
          <View style={styles.aboutCopy}>
            <AppText variant="bodyLarge" weight="bold">
              Higio
            </AppText>
            <AppText tone="muted" variant="caption">
              Lokalno-prvi tracker osobne njege
            </AppText>
          </View>
          <AppText tone="subtle" variant="caption">
            0.1.0 · interna alpha
          </AppText>
        </Surface>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl },
  header: { gap: spacing.xs },
  section: { gap: spacing.md },
  menuRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  menuGlyph: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: touchTarget,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: touchTarget,
  },
  menuCopy: { flex: 1, gap: spacing.xxs },
  aboutCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  logo: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  aboutCopy: { flex: 1, gap: spacing.xxs },
});
