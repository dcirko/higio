import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/components';
import { palette, spacing } from '@/design-system/tokens';
import { privacySafeLogger } from '@/shared/observability/privacy-safe-logger';

type State = { hasError: boolean };

export class PrivacySafeErrorBoundary extends Component<
  PropsWithChildren,
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    privacySafeLogger.error('app.unhandled-render-error', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.root}>
          <AppText accessibilityRole="header" variant="heading" weight="bold">
            Higio se nije mogao prikazati
          </AppText>
          <AppText style={styles.centered} tone="muted">
            Tvoji lokalni podatci nisu automatski obrisani. Zatvori i ponovno
            otvori aplikaciju.
          </AppText>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: palette.mint50,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  centered: { maxWidth: 320, textAlign: 'center' },
});
