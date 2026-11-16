import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useRef, useState, type ComponentType, type Ref } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation, type WebViewProps } from 'react-native-webview';

import { BackButton } from '@/components/AuthHeader';
import { Pressy, Txt } from '@/components/ui';
import { APP_URL } from '@/lib/config';
import { useSession } from '@/lib/session';
import { colors, space } from '@/theme';

type WebHandle = { goBack: () => void };
const RefWebView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebHandle> }>;

// Tools that need a full browser page (Code Arena's code editor, Auto-Apply, the portfolio studio)
// open app.cvmind.in inside the app. The app's session is written into the page's storage before it
// loads, so the person is already signed in there.
export default function WebTool() {
  const { page, title } = useLocalSearchParams<{ page: string; title?: string }>();
  const { user } = useSession();
  const web = useRef<WebHandle>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const url = `${APP_URL}/${String(page || '').replace(/^\/+/, '')}`;

  const session = user
    ? JSON.stringify({ id: user.id, _id: user.id, name: user.name, email: user.email, token: user.token, avatar: user.avatar, isGoogleUser: user.isGoogleUser, emailVerified: user.emailVerified, isPro: user.isPro, plan: user.plan })
    : null;
  const inject = session
    ? `try {
        localStorage.setItem('cvmind_user', ${JSON.stringify(session)});
        localStorage.setItem('cvmind_logged_in', 'true');
        localStorage.removeItem('cvmind_session_synced');
      } catch (e) {}
      true;`
    : 'true;';

  // The phone's back button goes back inside the page first
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack) {
          web.current?.goBack();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [canGoBack]),
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
      <View style={styles.header}>
        <BackButton onPress={() => (canGoBack ? web.current?.goBack() : router.back())} />
        <Txt variant="heading" numberOfLines={1} style={{ flex: 1 }}>{title || 'CVMind'}</Txt>
        <Pressy onPress={() => WebBrowser.openBrowserAsync(url).catch(() => {})} style={styles.icon} accessibilityLabel="Open in browser">
          <Ionicons name="open-outline" size={20} color={colors.ink} />
        </Pressy>
      </View>
      <View style={styles.fill}>
        <RefWebView
          ref={web}
          source={{ uri: url }}
          injectedJavaScriptBeforeContentLoaded={inject}
          onNavigationStateChange={(s: WebViewNavigation) => setCanGoBack(s.canGoBack)}
          onLoadEnd={() => setLoading(false)}
          domStorageEnabled
          javaScriptEnabled
          sharedCookiesEnabled
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows={false}
          style={styles.fill}
          onShouldStartLoadWithRequest={(req) => {
            // Our own pages stay in the app; everything else opens in the browser
            if (/^https:\/\/([a-z0-9-]+\.)*cvmind\.in(\/|$)/i.test(req.url) || req.url.startsWith('about:') || req.url.startsWith('blob:') || req.url.startsWith('data:')) return true;
            if (/^https?:/i.test(req.url)) {
              WebBrowser.openBrowserAsync(req.url).catch(() => {});
              return false;
            }
            return true;
          }}
        />
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Txt variant="small">Opening {title || 'CVMind'}…</Txt>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.bg },
});
