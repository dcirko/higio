import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export async function triggerCompletionHaptic(enabled: boolean) {
  if (!enabled) {
    return;
  }

  if (Platform.OS === 'android') {
    await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
    return;
  }

  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export async function triggerUndoHaptic(enabled: boolean) {
  if (!enabled) {
    return;
  }

  await Haptics.selectionAsync();
}
