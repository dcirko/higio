import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { AppText } from '@/design-system/components/app-text';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';

type AppButtonProps = ComponentProps<typeof Pressable> & {
  label: string;
  variant?: 'primary' | 'secondary';
};

export function AppButton({
  disabled,
  label,
  style,
  variant = 'primary',
  ...props
}: AppButtonProps) {
  const theme = useAppTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      style={(state) => [
        styles.button,
        {
          backgroundColor:
            isPrimary && !disabled
              ? theme.colors.primary
              : theme.colors.surfaceMuted,
          opacity: state.pressed && !disabled ? 0.85 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <AppText
        style={{
          color: disabled
            ? theme.colors.textSubtle
            : isPrimary
              ? theme.colors.onPrimary
              : theme.colors.text,
        }}
        variant="label"
        weight="bold"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

type ToggleRowProps = {
  description?: string;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
};

export function ToggleRow({
  description,
  label,
  onValueChange,
  value,
}: ToggleRowProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <AppText weight="semibold">{label}</AppText>
        {description ? (
          <AppText tone="muted" variant="caption">
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        ios_backgroundColor={theme.colors.border}
        onValueChange={onValueChange}
        thumbColor="#FFFFFF"
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary,
        }}
        value={value}
      />
    </View>
  );
}

type AppTextFieldProps = ComponentProps<typeof TextInput> & {
  label: string;
};

export function AppTextField({ label, style, ...props }: AppTextFieldProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.field}>
      <AppText variant="label" weight="semibold">
        {label}
      </AppText>
      <TextInput
        {...props}
        placeholderTextColor={theme.colors.textSubtle}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          },
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radii.md,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.xl,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
    minHeight: 64,
  },
  toggleCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  field: {
    gap: spacing.sm,
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    fontSize: 16,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
