import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { Share, StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/PageHeader';
import { Button, Card, Pressy, Screen, Skeleton, Txt, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { LINKS } from '@/lib/config';
import { LEO } from '@/lib/leo';
import { colors, fonts, radius, space } from '@/theme';

interface Referral {
  code: string;
  rewardsThisMonth: number;
  maxRewardsPerMonth: number;
  credits: { available: number; used: number };
  invites: { email: string; status: string; createdAt: string }[];
}

const STATUS = {
  qualified: { label: 'Joined', color: colors.teal },
  pending: { label: 'Waiting for email check', color: colors.amber },
  rejected: { label: 'Not counted', color: colors.faint },
} as Record<string, { label: string; color: string }>;

// Refer & earn: the same code and rewards as the website's invite page (GET /api/user/referral)
export default function Invite() {
  const toast = useToast();
  const { data, isLoading } = useQuery({ queryKey: ['referral'], queryFn: () => api<Referral>('/api/user/referral') });
  const link = data ? LINKS.invite(data.code) : '';

  const share = () =>
    Share.share({ message: `I use CVMind to build and check my resume with AI. Join with my link and get started free: ${link}` }).catch(() => {});

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title="Refer & earn" />
      <Card style={styles.hero}>
        <Image source={LEO.cheer} style={styles.leo} contentFit="contain" />
        <Txt variant="title" center>Invite friends, get free applies</Txt>
        <Txt center color={colors.muted}>When a friend joins with your link and verifies their email, you get a free AI Job Finder apply.</Txt>
      </Card>

      {isLoading || !data ? (
        <Card style={{ gap: space.md }}>
          <Skeleton width="50%" />
          <Skeleton height={48} />
        </Card>
      ) : (
        <>
          <Card style={{ gap: space.md }}>
            <Txt variant="tiny">YOUR CODE</Txt>
            <Pressy
              onPress={async () => {
                await Clipboard.setStringAsync(link);
                toast('Invite link copied', 'success');
              }}
              style={styles.codeBox}
              accessibilityLabel="Copy invite link">
              <Txt style={styles.code}>{data.code}</Txt>
              <Ionicons name="copy-outline" size={20} color={colors.brand} />
            </Pressy>
            <Button title="Share invite link" icon="share-social-outline" onPress={share} />
          </Card>

          <View style={styles.stats}>
            <Card style={styles.stat}>
              <Txt style={styles.statNum}>{data.credits.available}</Txt>
              <Txt variant="small" center>Free applies ready</Txt>
            </Card>
            <Card style={styles.stat}>
              <Txt style={styles.statNum}>{data.rewardsThisMonth}/{data.maxRewardsPerMonth}</Txt>
              <Txt variant="small" center>Rewards this month</Txt>
            </Card>
          </View>

          {data.invites.length ? (
            <Card style={{ gap: space.md }}>
              <Txt variant="heading">Your invites</Txt>
              {data.invites.map((inv) => {
                const s = STATUS[inv.status] ?? { label: inv.status, color: colors.muted };
                return (
                  <View key={`${inv.email}-${inv.createdAt}`} style={styles.invite}>
                    <Txt style={{ flex: 1 }} numberOfLines={1}>{inv.email}</Txt>
                    <Txt variant="smallStrong" color={s.color}>{s.label}</Txt>
                  </View>
                );
              })}
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm },
  leo: { width: 120, height: 120 },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.brand,
    borderRadius: radius.md,
    padding: space.lg,
    backgroundColor: colors.brandSoft,
  },
  code: { fontFamily: fonts.bold, fontSize: 22, letterSpacing: 2, color: colors.brand },
  stats: { flexDirection: 'row', gap: space.md },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  invite: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
