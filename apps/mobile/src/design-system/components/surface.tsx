import type { ComponentProps } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';

type SurfaceProps = ComponentProps<typeof View> & {
  padded?: boolean;
};

export function Surface({
  children,
  padded = true,
  style,
  ...props
}: SurfaceProps) {
  const theme = useAppTheme();

  return (
    <View
      {...props}
      style={[
        styles.surface,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
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
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  padded: {
    padding: spacing.lg,
  },
});
