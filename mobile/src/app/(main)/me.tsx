import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { ListGroup, ListRow } from '@/components/ListRow';
import { Avatar, Button, Card, Pressy, Screen, Sheet, Skeleton, Txt, useToast } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { APP_VERSION, LINKS } from '@/lib/config';
import { useSession } from '@/lib/session';
import { colors, fonts, gradients, radius, space } from '@/theme';

interface BillingMe {
  pro: boolean;
  subscription: { label: string; expiresAt: string; source?: string } | null;
  tokens: { used: number; limit: number; resetsAt?: string | null };
  weekly: Record<string, { label: string; limit: number; used: number }>;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function Meter({ label, used, limit, value }: { label: string; used: number; limit: number; value?: string }) {
  const pct = limit > 0 ? Math.min(1, used / limit) : 0;
  const full = used >= limit;
  return (
    <View style={styles.meter}>
      <View style={styles.meterTop}>
        <Txt variant="small" color={colors.text} style={styles.flex} numberOfLines={1}>{label}</Txt>
        <Txt variant="smallStrong" color={full ? colors.danger : colors.text}>{value ?? `${used}/${limit}`}</Txt>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: full ? colors.danger : colors.teal }]} />
      </View>
    </View>
  );
}

function PlanCard() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['billing-me'], queryFn: () => api<BillingMe>('/api/billing/me') });
  if (isLoading || !data) {
    return (
      <Card style={{ gap: space.md }}>
        <Skeleton width="40%" height={18} />
        <Skeleton height={8} round />
      </Card>
    );
  }
  const weekly = Object.values(data.weekly || {});
  const tokenPct = data.tokens?.limit ? Math.round((data.tokens.used / data.tokens.limit) * 100) : 0;
  return (
    <Card style={styles.planCard}>
      <View style={styles.planTop}>
        <View style={styles.flex}>
          <Txt variant="tiny">YOUR PLAN</Txt>
          <Txt variant="title">{data.pro ? `Pro · ${data.subscription?.label ?? ''}` : 'Free'}</Txt>
          {data.pro && data.subscription?.expiresAt ? <Txt variant="small">Active until {formatDate(data.subscription.expiresAt)}</Txt> : null}
        </View>
        {data.pro ? (
          <View style={styles.proChip}>
            <Ionicons name="diamond" size={14} color="#fff" />
            <Txt variant="tiny" color="#fff">PRO</Txt>
          </View>
        ) : null}
      </View>
      {data.tokens?.limit ? <Meter label="AI allowance this week" used={Math.min(tokenPct, 100)} limit={100} value={`${Math.min(tokenPct, 100)}% used`} /> : null}
      {!data.pro && weekly.length ? (
        <Pressy onPress={() => setOpen(true)} style={styles.usageLink}>
          <Txt variant="smallStrong" color={colors.brand}>See free uses this week</Txt>
          <Ionicons name="chevron-forward" size={16} color={colors.brand} />
        </Pressy>
      ) : null}
      {!data.pro ? (
        <Button title="Go Pro" icon="diamond-outline" onPress={() => router.push('/pro' as never)} />
      ) : null}
      <Sheet visible={open} onClose={() => setOpen(false)}>
        <Txt variant="heading">Free uses this week</Txt>
        <Txt variant="small">They reset every week.</Txt>
        <View style={{ gap: space.md }}>
          {weekly.map((w) => <Meter key={w.label} label={w.label} used={w.used} limit={w.limit} />)}
        </View>
      </Sheet>
    </Card>
  );
}

function EmailUpdates() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['email-prefs'], queryFn: () => api<{ subscribed: boolean }>('/api/user/email-preferences') });
  const mutation = useMutation({
    mutationFn: (subscribed: boolean) => api('/api/user/email-preferences', { method: 'PUT', body: { subscribed } }),
    onMutate: (subscribed) => queryClient.setQueryData(['email-prefs'], { subscribed }),
    onError: (err) => {
      toast(errorMessage(err), 'error');
      void queryClient.invalidateQueries({ queryKey: ['email-prefs'] });
    },
  });
  return (
    <ListRow
      icon="mail-outline"
      title="Email updates"
      subtitle="Job alerts, tips and offers"
      right={
        <Switch
          value={!!data?.subscribed}
          onValueChange={(v) => mutation.mutate(v)}
          trackColor={{ true: colors.brand, false: colors.borderStrong }}
          thumbColor="#fff"
          disabled={!data}
        />
      }
    />
  );
}

export default function Me() {
  const { user, signOut } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  if (!user) return null;

  const openLink = (url: string) => WebBrowser.openBrowserAsync(url, { toolbarColor: '#ffffff', controlsColor: colors.brand }).catch(() => {});

  const confirmSignOut = () =>
    Alert.alert('Log out?', 'You can log back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      'This deletes your CVMind account and everything in it, on the app and on cvmind.in. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await api(`/api/user/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
              toast('Your account was deleted.', 'success');
              await signOut();
            } catch (err) {
              toast(errorMessage(err), 'error');
            }
          },
        },
      ],
    );

  return (
    <Screen
      header={<AppHeader title="Profile" />}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await queryClient.invalidateQueries().catch(() => {});
        setRefreshing(false);
      }}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Avatar name={user.name} uri={user.avatar} size={64} />
        <View style={styles.flex}>
          <Txt style={styles.heroName} numberOfLines={1}>{user.name}</Txt>
          <Txt variant="small" color="rgba(255,255,255,0.85)" numberOfLines={1}>{user.email}</Txt>
          {!user.emailVerified ? (
            <Pressy onPress={() => router.push('/verify-email')} style={styles.unverified}>
              <Ionicons name="alert-circle" size={13} color={colors.amber} />
              <Txt variant="tiny" color={colors.ink}>Email not verified</Txt>
            </Pressy>
          ) : null}
        </View>
        <Pressy onPress={() => router.push('/settings/profile')} style={styles.editBtn} accessibilityLabel="Edit profile">
          <Ionicons name="pencil" size={17} color={colors.brand} />
        </Pressy>
      </LinearGradient>

      <PlanCard />

      <ListGroup title="Account">
        <ListRow icon="person-outline" title="Edit profile" subtitle="Name, email and photo" onPress={() => router.push('/settings/profile')} />
        {!user.isGoogleUser ? <ListRow icon="key-outline" title="Change password" onPress={() => router.push('/settings/password')} /> : null}
        <EmailUpdates />
      </ListGroup>

      <ListGroup title="Share CVMind">
        <ListRow icon="gift-outline" title="Refer & earn" subtitle="Friends join, you get free job applies" tint={colors.teal} onPress={() => router.push('/settings/invite')} />
      </ListGroup>

      <ListGroup title="Help & legal">
        <ListRow icon="help-buoy-outline" title="Help centre" onPress={() => openLink(LINKS.help)} />
        <ListRow icon="chatbox-ellipses-outline" title="Contact us" onPress={() => openLink(LINKS.contact)} />
        <ListRow icon="shield-checkmark-outline" title="Privacy policy" onPress={() => openLink(LINKS.privacy)} />
        <ListRow icon="document-text-outline" title="Terms of service" onPress={() => openLink(LINKS.terms)} />
      </ListGroup>

      <ListGroup>
        <ListRow icon="log-out-outline" title="Log out" onPress={confirmSignOut} />
        <ListRow icon="trash-outline" title="Delete account" danger onPress={confirmDelete} />
      </ListGroup>

      <Txt variant="tiny" center>CVMind for Android · v{APP_VERSION}</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.xl },
  heroName: { fontFamily: fonts.display, fontSize: 21, color: '#fff' },
  unverified: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 6, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  editBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  planCard: { gap: space.md },
  planTop: { flexDirection: 'row', alignItems: 'flex-start' },
  proChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brand, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  usageLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meter: { gap: 6 },
  meterTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4 },
});
