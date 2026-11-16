import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageHeader } from '@/components/PageHeader';
import { Button, Card, Pressy, Screen, Txt, useToast } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { buyPro, playBillingReady, playPrices, productFor, restorePurchases, usePlans } from '@/lib/billing';
import { success } from '@/lib/haptics';
import { LEO } from '@/lib/leo';
import { useSession } from '@/lib/session';
import { colors, fonts, gradients, radius, space } from '@/theme';

const PERKS = [
  'Unlimited tailored resumes, cover letters and interview practice',
  'A much bigger weekly AI allowance for Leo and every tool',
  'Every Pro resume and cover letter design',
  'No CVMind footer on your PDFs',
  'More AI Job Finder applies',
];

// CVMind Pro in the app: the website's passes, bought with Google Play Billing. Pro then works on
// cvmind.in too, because it is on the account.
export default function Pro() {
  const { user, update } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const plans = usePlans();
  const me = useQuery({ queryKey: ['billing-me'], queryFn: () => api<{ pro: boolean; playAccountId?: string; subscription: { label: string; expiresAt: string } | null }>('/api/billing/me') });
  const [selected, setSelected] = useState('half-yearly');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const ready = playBillingReady(plans.data);

  useEffect(() => {
    if (!ready) return;
    const ids = Object.keys(plans.data?.play?.products || {});
    if (ids.length) void playPrices(ids).then(setPrices);
  }, [ready, plans.data]);

  const done = async () => {
    success();
    await update({ isPro: true, plan: 'pro' });
    await queryClient.invalidateQueries();
    toast('You are Pro. Thank you!', 'success');
    router.back();
  };

  const buy = async () => {
    const productId = productFor(plans.data, selected);
    const accountId = me.data?.playAccountId;
    if (!productId || !accountId) return toast('This pass is not available right now.', 'error');
    setBusy('buy');
    try {
      await buyPro(productId, accountId);
      await done();
    } catch (err) {
      if (!(err as { cancelled?: boolean })?.cancelled) toast(errorMessage(err, 'The purchase did not go through.'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    try {
      const n = await restorePurchases();
      if (n) await done();
      else toast('No unconfirmed purchases found on this Google account.', 'info');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const list = plans.data?.plans || [];
  const isPro = me.data?.pro || user?.isPro;

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title="CVMind Pro" />
      <Animated.View entering={FadeInDown.springify()}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt style={styles.heroTitle}>{isPro ? "You're Pro" : 'Get hired faster'}</Txt>
            <Txt variant="small" color="rgba(255,255,255,0.9)">
              {isPro && me.data?.subscription ? `${me.data.subscription.label} · active until ${new Date(me.data.subscription.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Everything in CVMind, without weekly limits.'}
            </Txt>
          </View>
          <Image source={LEO.cheer} style={styles.leo} contentFit="contain" />
        </LinearGradient>
      </Animated.View>

      <Card style={{ gap: 10 }}>
        {PERKS.map((p) => (
          <View key={p} style={styles.perk}>
            <Ionicons name="checkmark-circle" size={18} color={colors.teal} />
            <Txt variant="small" color={colors.text} style={{ flex: 1 }}>{p}</Txt>
          </View>
        ))}
      </Card>

      {list.map((p) => {
        const on = selected === p.key;
        const pid = productFor(plans.data, p.key);
        const perMonth = Math.round(p.price / Math.max(1, p.days / 30));
        return (
          <Pressy key={p.key} onPress={() => setSelected(p.key)} style={[styles.plan, on && styles.planOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
            <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.dot} /> : null}</View>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">{p.label}</Txt>
              <Txt variant="small">₹{perMonth}/month · {p.days} days</Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt style={styles.price}>{(pid && prices[pid]) || `₹${p.price}`}</Txt>
              {p.key === 'half-yearly' ? <Txt variant="tiny" color={colors.brand}>MOST POPULAR</Txt> : null}
            </View>
          </Pressy>
        );
      })}

      {ready ? (
        <>
          <Button title={isPro ? 'Add more Pro time' : 'Continue'} icon="diamond-outline" loading={busy === 'buy'} disabled={!!busy || !me.data?.playAccountId} onPress={buy} />
          <Button title="Restore a purchase" variant="ghost" size="sm" loading={busy === 'restore'} disabled={!!busy} onPress={restore} />
          <Txt variant="tiny" center>Paid once through Google Play, no auto-renewal. A new pass adds its days after your current one ends.</Txt>
        </>
      ) : (
        <Card style={styles.soon}>
          <Ionicons name="time-outline" size={20} color={colors.brand} />
          <Txt variant="small" color={colors.text} style={{ flex: 1 }}>
            {"Buying Pro inside the app opens soon. Pro you buy on cvmind.in already works here, because it's on your account."}
          </Txt>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.xl, padding: space.lg, gap: space.md },
  heroTitle: { fontFamily: fonts.display, fontSize: 24, color: '#fff' },
  leo: { width: 90, height: 90 },
  perk: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  planOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.brand },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
  price: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  soon: { flexDirection: 'row', gap: space.sm, alignItems: 'center', backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
});
