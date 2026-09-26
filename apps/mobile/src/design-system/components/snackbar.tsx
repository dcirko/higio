import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/components/app-text';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';

type SnackbarProps = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  visible: boolean;
};

export function Snackbar({
  actionLabel,
  message,
  onAction,
  visible,
}: SnackbarProps) {
  const theme = useAppTheme();

  if (!visible) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.snackbar,
        {
          backgroundColor: theme.colors.snackbarBackground,
        },
        Platform.select({
          default: {
            elevation: 8,
            shadowColor: theme.colors.shadow,
            shadowOffset: { height: 5, width: 0 },
            shadowOpacity: 1,
            shadowRadius: 18,
          },
          web: {
            boxShadow: `0 5px 18px ${theme.colors.shadow}`,
          },
        }),
      ]}
    >
      <AppText
        numberOfLines={2}
        style={[styles.message, { color: theme.colors.snackbarText }]}
        variant="label"
        weight="medium"
      >
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            { opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <AppText
            style={{ color: theme.colors.snackbarAction }}
            variant="label"
            weight="bold"
          >
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    alignItems: 'center',
    borderRadius: radii.md,
    bottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    left: spacing.lg,
    minHeight: 56,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    position: 'absolute',
    right: spacing.lg,
  },
  message: {
    flex: 1,
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
  },
});
