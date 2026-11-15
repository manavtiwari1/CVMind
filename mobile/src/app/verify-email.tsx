import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BackButton } from '@/components/AuthHeader';
import { Button, Card, Screen, Txt, useToast } from '@/components/ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { success } from '@/lib/haptics';
import { LEO } from '@/lib/leo';
import { useSession } from '@/lib/session';
import { colors, fonts, space } from '@/theme';

const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

// After sign-up, or when a tool needs a verified email. The link in the email opens on cvmind.in;
// "I've verified" asks the backend and updates the app.
export default function VerifyEmail() {
  const { user, update } = useSession();
  const toast = useToast();
  const [cooldown, setCooldown] = useState(60);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const check = async () => {
    setChecking(true);
    try {
      const status = await api<{ emailVerified?: boolean }>('/api/auth/account-status');
      if (status.emailVerified) {
        await update({ emailVerified: true });
        success();
        toast('Email verified. You are all set!', 'success');
        leave();
      } else {
        toast("Not verified yet. Tap the link in the email, then try again.", 'info');
      }
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setChecking(false);
    }
  };

  const resend = async () => {
    setSending(true);
    try {
      const data = await api<{ message?: string; retryAfter?: number; emailVerified?: boolean }>('/api/auth/resend-verification', { method: 'POST' });
      if (data.emailVerified) {
        await update({ emailVerified: true });
        leave();
        return;
      }
      toast(data.message || 'We sent a new link.', 'success');
      setCooldown(data.retryAfter ?? 60);
    } catch (err) {
      if (err instanceof ApiError && typeof err.data.retryAfter === 'number') setCooldown(err.data.retryAfter);
      toast(errorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen background={colors.surface} edges={['top', 'bottom']}>
      <BackButton onPress={leave} />
      <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
        <Image source={LEO.checklist} style={styles.leo} contentFit="contain" />
        <Txt variant="hero" center>
          Check your <Txt variant="script" style={styles.script}>inbox</Txt>
        </Txt>
        <Txt center color={colors.muted}>Tap the link we emailed you to unlock everything in CVMind.</Txt>
      </Animated.View>
      <Card style={styles.sentTo}>
        <Txt variant="tiny">SENT TO</Txt>
        <Txt variant="bodyStrong" numberOfLines={1}>{user?.email}</Txt>
      </Card>
      <Button title="Open email app" icon="mail-open-outline" variant="outline" onPress={() => Linking.openURL('mailto:').catch(() => {})} />
      <Button title="I've verified" icon="checkmark-circle-outline" loading={checking} onPress={check} />
      <View style={styles.row}>
        <Button
          title={cooldown > 0 ? `Resend in 0:${String(cooldown).padStart(2, '0')}` : 'Resend link'}
          variant="secondary"
          size="sm"
          disabled={cooldown > 0}
          loading={sending}
          onPress={resend}
          style={styles.flex}
        />
        <Button title="Verify later" variant="ghost" size="sm" onPress={leave} style={styles.flex} />
      </View>
      <Txt variant="small" center>{"Can't find it? Look in Spam or Promotions."}</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm },
  leo: { width: 150, height: 150 },
  script: { fontFamily: fonts.script, fontSize: 34 },
  sentTo: { gap: 2, backgroundColor: colors.surfaceAlt, borderStyle: 'dashed' },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
});
