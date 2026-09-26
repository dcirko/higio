import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/components/app-text';
import { AppButton } from '@/design-system/components/controls';
import { spacing } from '@/design-system/tokens';

type EmptyStateProps = {
  actionLabel?: string;
  description: string;
  icon?: string;
  onAction?: () => void;
  title: string;
};

export function EmptyState({
  actionLabel,
  description,
  icon = '✨',
  onAction,
  title,
}: EmptyStateProps) {
  return (
    <View style={styles.root}>
      <AppText style={styles.icon}>{icon}</AppText>
      <View style={styles.copy}>
        <AppText accessibilityRole="header" variant="bodyLarge" weight="bold">
          {title}
        </AppText>
        <AppText tone="muted">{description}</AppText>
      </View>
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  icon: {
    fontSize: 38,
    lineHeight: 46,
  },
  copy: {
    alignItems: 'center',
    gap: spacing.xs,
  },
});
