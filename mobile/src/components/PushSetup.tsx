import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

import { toolById } from '@/data/tools';
import { APP_URL } from '@/lib/config';
import { registerForPush } from '@/lib/push';
import { useSession } from '@/lib/session';

// Registers for notifications once signed in, and opens the right place when one is tapped.
// A notification's data.link is a website path ("/job-finder") or a full https link.
function openLink(link: unknown) {
  if (typeof link !== 'string' || !link) return;
  if (/^https?:\/\//i.test(link)) {
    WebBrowser.openBrowserAsync(link).catch(() => {});
    return;
  }
  const page = link.replace(/^\/+/, '').split(/[?#]/)[0];
  const tool = toolById(page);
  if (page === 'my-documents') router.navigate('/docs');
  else if (page === 'chat') router.navigate('/leo');
  else if (tool?.route && !tool.route.startsWith('browser:')) router.push(tool.route as never);
  else WebBrowser.openBrowserAsync(`${APP_URL}/${page}`).catch(() => {});
}

export function PushSetup() {
  const { user } = useSession();

  useEffect(() => {
    if (user?.id) void registerForPush();
  }, [user?.id]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => openLink(r.notification.request.content.data?.link));
    return () => sub.remove();
  }, []);

  return null;
}
