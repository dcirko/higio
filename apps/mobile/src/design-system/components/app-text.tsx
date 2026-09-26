import type { ComponentProps } from 'react';
import { StyleSheet, Text } from 'react-native';

import { fontSize, lineHeight } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';

type TextProps = ComponentProps<typeof Text>;
type TextVariant =
  'display' | 'title' | 'heading' | 'bodyLarge' | 'body' | 'label' | 'caption';
type TextTone = 'default' | 'muted' | 'subtle' | 'primary' | 'danger';
type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

type AppTextProps = TextProps & {
  tone?: TextTone;
  variant?: TextVariant;
  weight?: TextWeight;
};

const variantStyles = StyleSheet.create({
  display: {
    fontSize: fontSize.display,
    letterSpacing: -1.2,
    lineHeight: lineHeight.display,
  },
  title: {
    fontSize: fontSize.title,
    letterSpacing: -0.7,
    lineHeight: lineHeight.title,
  },
  heading: {
    fontSize: fontSize.heading,
    letterSpacing: -0.25,
    lineHeight: lineHeight.heading,
  },
  bodyLarge: {
    fontSize: fontSize.bodyLarge,
    lineHeight: lineHeight.bodyLarge,
  },
  body: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
  },
  label: {
    fontSize: fontSize.label,
    lineHeight: lineHeight.label,
  },
  caption: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
  },
});

const weightStyles = StyleSheet.create({
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
});

export function AppText({
  style,
  tone = 'default',
  variant = 'body',
  weight = 'regular',
  ...props
}: AppTextProps) {
  const theme = useAppTheme();
  const toneColor = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    subtle: theme.colors.textSubtle,
    primary: theme.colors.primaryStrong,
    danger: theme.colors.dangerText,
  }[tone];

  return (
    <Text
      {...props}
      style={[
        variantStyles[variant],
        weightStyles[weight],
        { color: toneColor },
        style,
      ]}
    />
  );
}
