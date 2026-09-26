import { useEffect } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/components/app-text';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';

type CompletionCelebrationProps = {
  activityTitle: string;
  localTime: string;
  onDismiss: () => void;
  onUndo: () => void;
  visible: boolean;
};

const AUTO_DISMISS_MILLISECONDS = 2400;

export function CompletionCelebration({
  activityTitle,
  localTime,
  onDismiss,
  onUndo,
  visible,
}: CompletionCelebrationProps) {
  const theme = useAppTheme();

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = setTimeout(onDismiss, AUTO_DISMISS_MILLISECONDS);
    return () => clearTimeout(timer);
  }, [onDismiss, visible]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        style={styles.root}
        testID="completion-celebration"
      >
        <Pressable
          accessibilityLabel="Zatvori potvrdu"
          accessibilityRole="button"
          onPress={onDismiss}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.colors.overlay },
          ]}
        />

        <View
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={[
            styles.dialog,
            { backgroundColor: theme.colors.surfaceElevated },
            Platform.select({
              default: {
                elevation: 14,
                shadowColor: theme.colors.shadow,
                shadowOffset: { height: 10, width: 0 },
                shadowOpacity: 1,
                shadowRadius: 30,
              },
              web: {
                boxShadow: `0 20px 60px ${theme.colors.shadow}`,
              },
            }),
          ]}
        >
          <View
            style={[
              styles.checkCircle,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <AppText
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.checkmark, { color: theme.colors.onPrimary }]}
              weight="bold"
            >
              ✓
            </AppText>
          </View>

          <View style={styles.copy}>
            <AppText
              accessibilityRole="header"
              style={styles.centered}
              variant="heading"
              weight="bold"
            >
              Bravo, spremljeno!
            </AppText>
            <AppText
              style={styles.centered}
              variant="bodyLarge"
              weight="semibold"
            >
              {activityTitle}
            </AppText>
            <AppText style={styles.centered} tone="muted" variant="label">
              Evidentirano u {localTime} po zagrebačkom vremenu
            </AppText>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onUndo}
            style={({ pressed }) => [
              styles.undoButton,
              {
                backgroundColor: theme.colors.primarySoft,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <AppText tone="primary" variant="label" weight="bold">
              Poništi
            </AppText>
          </Pressable>

          <AppText style={styles.centered} tone="subtle" variant="caption">
            Potvrda će se sama zatvoriti
          </AppText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    alignItems: 'center',
    borderRadius: radii.xl,
    gap: spacing.xl,
    maxWidth: 380,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
    width: '100%',
  },
  checkCircle: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  checkmark: {
    fontSize: 42,
    lineHeight: 48,
  },
  copy: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  centered: {
    textAlign: 'center',
  },
  undoButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.xxxl,
  },
});
