import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api';

// Phone notifications: the app registers this phone's Expo push token on the account
// (POST /api/user/push-token); the backend sends job alerts and team announcements to it.
// On Android this needs Firebase (google-services.json) in the build; until then it quietly does nothing.

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

let registered: string | null = null;

export async function registerForPush(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'CVMind', importance: 3 /* AndroidImportance.DEFAULT */ });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (token && token !== registered) {
      await api('/api/user/push-token', { method: 'POST', body: { token, platform: Platform.OS } });
      registered = token;
    }
    return token;
  } catch (err) {
    // No Firebase in this build, no network, or permission off: notifications just stay off
    console.log('[push] not registered:', (err as Error)?.message);
    return null;
  }
}

/** Called before signing out, so this phone stops getting the account's notifications */
export async function unregisterPush() {
  if (!registered) return;
  const token = registered;
  registered = null;
  await api('/api/user/push-token/remove', { method: 'POST', body: { token } }).catch(() => {});
}
