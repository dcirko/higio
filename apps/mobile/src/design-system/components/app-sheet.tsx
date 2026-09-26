import type { PropsWithChildren } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/design-system/components/app-text';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';

type AppSheetProps = PropsWithChildren<{
  onClose: () => void;
  title: string;
  visible: boolean;
}>;

export function AppSheet({ children, onClose, title, visible }: AppSheetProps) {
  const theme = useAppTheme();

  function handleBack() {
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
      return;
    }
    onClose();
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleBack}
      presentationStyle="overFullScreen"
      transparent
      testID="app-sheet-modal"
      visible={visible}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <Pressable
          accessibilityLabel="Zatvori"
          onPress={onClose}
          style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        />
        <SafeAreaView
          edges={['bottom']}
          style={[
            styles.sheet,
            { backgroundColor: theme.colors.surfaceElevated },
          ]}
        >
          <View
            style={[styles.handle, { backgroundColor: theme.colors.border }]}
          />
          <View style={styles.header}>
            <AppText variant="heading" weight="bold">
              {title}
            </AppText>
            <Pressable
              accessibilityLabel="Zatvori"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.close,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <AppText variant="bodyLarge">×</AppText>
            </Pressable>
          </View>
          {children}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    gap: spacing.lg,
    maxHeight: '86%',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    borderRadius: radii.pill,
    height: 4,
    width: 44,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  close: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
});
