import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/components/app-text';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';

type ActivityCardProps = {
  busy?: boolean;
  color?: string;
  completed: boolean;
  completedAtLocalTime?: string | null;
  icon: string;
  lastDone?: string;
  onPress: () => void;
  overdue?: boolean;
  repeatable?: boolean;
  slotLabel: string;
  title: string;
};

export function ActivityCard({
  busy = false,
  color,
  completed,
  completedAtLocalTime,
  icon,
  lastDone,
  onPress,
  overdue = false,
  repeatable = false,
  slotLabel,
  title,
}: ActivityCardProps) {
  const theme = useAppTheme();
  const accessibilityLabel = completed
    ? `${title}, ${slotLabel}. Obavljeno u ${completedAtLocalTime ?? 'spremljeno vrijeme'}.`
    : `${title}, ${lastDone ?? slotLabel}. ${
        repeatable ? 'Možeš evidentirati ponovno.' : 'Dodirni za evidentiranje.'
      }`;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ checked: completed }}
      disabled={completed || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: completed
            ? theme.colors.primarySoft
            : theme.colors.surface,
          borderColor: completed ? theme.colors.primary : theme.colors.border,
          borderLeftColor: color ?? theme.colors.border,
          opacity: busy ? 0.55 : pressed ? 0.76 : 1,
        },
        Platform.select({
          default: {
            elevation: 1,
            shadowColor: theme.colors.shadow,
            shadowOffset: { height: 3, width: 0 },
            shadowOpacity: 1,
            shadowRadius: 12,
          },
          web: {
            boxShadow: `0 3px 12px ${theme.colors.shadow}`,
          },
        }),
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: completed
              ? theme.colors.surface
              : theme.colors.surfaceMuted,
          },
        ]}
      >
        <AppText style={styles.icon}>{icon}</AppText>
      </View>

      <View style={styles.copy}>
        <AppText numberOfLines={1} variant="bodyLarge" weight="semibold">
          {title}
        </AppText>
        <AppText
          numberOfLines={2}
          tone={overdue ? 'danger' : 'muted'}
          variant="caption"
        >
          {completed
            ? `Evidentirano u ${completedAtLocalTime ?? 'spremljeno vrijeme'}`
            : busy
              ? 'Spremanje…'
              : overdue
                ? slotLabel
                : (lastDone ?? slotLabel)}
        </AppText>
      </View>

      <View
        style={[
          styles.check,
          {
            backgroundColor: completed ? theme.colors.primary : 'transparent',
            borderColor: completed ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        {completed ? (
          <AppText
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.checkmark, { color: theme.colors.onPrimary }]}
            weight="bold"
          >
            ✓
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    flexDirection: 'row',
    minHeight: 76,
    padding: spacing.md,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  icon: {
    fontSize: 23,
    lineHeight: 28,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
  },
  check: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  checkmark: {
    fontSize: 16,
    lineHeight: 18,
  },
});
