import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking, Modal, Platform, StyleSheet, View } from 'react-native';

import { api } from '@/lib/api';
import { APP_VERSION } from '@/lib/config';
import { colors, radius, space } from '@/theme';

import { Button, Sheet, Txt } from './ui';

interface Verdict {
  verdict: 'ok' | 'recommended' | 'required';
  message?: string;
  updateUrl?: string;
  latestVersion?: string;
}

// Old versions the admin marked unsupported are blocked; outdated ones get a gentle nudge.
// Same check as the website's AppUpdateGate (GET /api/config/version).
export function UpdateGate() {
  const [dismissed, setDismissed] = useState(false);
  const { data } = useQuery({
    queryKey: ['app-version'],
    queryFn: () => api<Verdict>(`/api/config/version?client=${Platform.OS}&v=${encodeURIComponent(APP_VERSION)}`, { anonymous: true }),
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });
  if (!data || data.verdict === 'ok') return null;
  const open = () => {
    if (data.updateUrl) Linking.openURL(data.updateUrl).catch(() => {});
  };

  if (data.verdict === 'required') {
    return (
      <Modal visible transparent animationType="fade" statusBarTranslucent>
        <View style={styles.block}>
          <View style={styles.card}>
            <Txt variant="title" center>Update CVMind</Txt>
            <Txt center color={colors.muted}>{data.message || `Version ${APP_VERSION} is no longer supported. Please update to keep using CVMind.`}</Txt>
            {data.updateUrl ? <Button title="Update now" onPress={open} /> : null}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Sheet visible={!dismissed} onClose={() => setDismissed(true)}>
      <Txt variant="heading">A new version is ready</Txt>
      <Txt color={colors.muted}>{data.message || `Version ${data.latestVersion} of CVMind is available.`}</Txt>
      {data.updateUrl ? <Button title="Update" onPress={open} /> : null}
      <Button title="Later" variant="ghost" onPress={() => setDismissed(true)} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  block: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: space.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.xxl, gap: space.lg },
});
