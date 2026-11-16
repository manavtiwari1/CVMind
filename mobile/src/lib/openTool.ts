import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import type { Tool } from '@/data/tools';

import { APP_URL } from './config';
import type { LeoPose } from './leo';

/** Opens a tool: its app screen, a cvmind.in page in the browser ("browser:<page>"), or "coming soon" */
export function openTool(tool: Tool | undefined, comingSoon: (title: string, pose?: LeoPose) => void) {
  if (!tool) return;
  if (!tool.route) return comingSoon(tool.title, tool.pose);
  if (tool.route.startsWith('browser:')) {
    // Learn with Leo talks and listens, which needs a real browser (the app's WebView has no speech)
    WebBrowser.openBrowserAsync(`${APP_URL}/${tool.route.slice('browser:'.length)}`, { controlsColor: '#0d0d0d' }).catch(() => {});
    return;
  }
  router.push(tool.route as never);
}
