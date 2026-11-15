import * as Haptics from 'expo-haptics';

// Light taps make the app feel physical; failures here never matter
export const tap = () => {
  Haptics.selectionAsync().catch(() => {});
};
export const success = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
export const warn = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};
