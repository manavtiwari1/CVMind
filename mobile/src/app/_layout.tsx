import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { InstrumentSans_600SemiBold, InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GlobalSheets } from '@/components/GlobalSheets';
import { ToastProvider } from '@/components/ui';
import { UpdateGate } from '@/components/UpdateGate';
import { SessionProvider, useSession } from '@/lib/session';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

function Navigator() {
  const { user, ready } = useSession();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    Caveat_700Bold,
  });
  const loading = !ready || !fontsLoaded;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  // Clear any signed-in screens' cached data when the account changes
  useEffect(() => {
    queryClient.clear();
  }, [user?.id]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="doc/[id]" />
      </Stack.Protected>
    </Stack>
  );
}

// A crash anywhere in the app shows this screen with a retry, instead of the app closing on launch.
// Plain components only: the custom fonts may not have loaded.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    console.error('App crashed', error);
  }, [error]);
  return (
    <View style={styles.crash}>
      <Text style={styles.crashTitle}>Something went wrong</Text>
      <Text style={styles.crashText}>CVMind hit a problem while opening. Please try again.</Text>
      <Text style={styles.crashDetail} numberOfLines={4}>{error?.message}</Text>
      <Pressable onPress={retry} style={styles.crashButton} accessibilityRole="button">
        <Text style={styles.crashButtonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <ToastProvider>
              <GlobalSheets>
                <StatusBar style="dark" />
                <Navigator />
                <UpdateGate />
              </GlobalSheets>
            </ToastProvider>
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  crash: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: colors.bg },
  crashTitle: { fontSize: 22, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  crashText: { fontSize: 15, color: colors.text, textAlign: 'center' },
  crashDetail: { fontSize: 12, color: colors.faint, textAlign: 'center' },
  crashButton: { marginTop: 8, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14, backgroundColor: colors.brand },
  crashButtonText: { fontSize: 15, fontWeight: '600', color: colors.onDark },
});
