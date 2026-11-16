import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { InstrumentSans_600SemiBold, InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GlobalSheets } from '@/components/GlobalSheets';
import { ToastProvider } from '@/components/ui';
import { PushSetup } from '@/components/PushSetup';
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
        <Stack.Screen name="ats" />
        <Stack.Screen name="tailor" />
        <Stack.Screen name="cover-letter" />
        <Stack.Screen name="resume/new" />
        <Stack.Screen name="resume/[id]" />
        <Stack.Screen name="job/[key]" />
        <Stack.Screen name="interview" />
        <Stack.Screen name="aptitude" />
        <Stack.Screen name="tool/[id]" />
        <Stack.Screen name="web" />
        <Stack.Screen name="pro" />
      </Stack.Protected>
    </Stack>
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
                <PushSetup />
              </GlobalSheets>
            </ToastProvider>
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
