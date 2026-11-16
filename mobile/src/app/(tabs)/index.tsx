import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSheets } from '@/components/GlobalSheets';
import { Avatar, Card, Pressy, Skeleton, Txt } from '@/components/ui';
import { PLAN_STEPS, TOOL_GROUPS, toolById, type Tool } from '@/data/tools';
import { api } from '@/lib/api';
import { openTool } from '@/lib/openTool';
import { BLACK_FRIDAY, greeting, isBlackFriday, saleTimeLeft } from '@/lib/festive';
import { LEO } from '@/lib/leo';
import { useSession } from '@/lib/session';
import { colors, fonts, gradients, radius, shadow, space } from '@/theme';

interface Progress {
  steps: { id: string; done: boolean }[];
  doneCount: number;
}

function useOpenTool() {
  const { comingSoon } = useSheets();
  return (tool: Tool | undefined) => {
    openTool(tool, comingSoon);
  };
}

function ToolTile({ tool, index }: { tool: Tool; index: number }) {
  const open = useOpenTool();
  return (
    <Animated.View entering={FadeInDown.delay(60 + index * 30).springify().damping(18)} style={styles.tileWrap}>
      <Pressy onPress={() => open(tool)} style={styles.tile} accessibilityRole="button" accessibilityLabel={tool.title}>
        <View style={[styles.tileIcon, { backgroundColor: tool.soft }]}>
          <Ionicons name={tool.icon} size={24} color={tool.tint} />
          {tool.isNew ? <View style={styles.newDot} /> : null}
        </View>
        <Txt style={styles.tileLabel} numberOfLines={2} center>{tool.title}</Txt>
      </Pressy>
    </Animated.View>
  );
}

function PlanCard() {
  const open = useOpenTool();
  const { data, isLoading } = useQuery({ queryKey: ['progress'], queryFn: () => api<Progress>('/api/user/progress') });
  if (isLoading) {
    return (
      <Card style={{ gap: space.md }}>
        <Skeleton width="60%" height={18} />
        <Skeleton height={8} round />
        <Skeleton width="80%" />
      </Card>
    );
  }
  if (!data?.steps?.length) return null;
  const total = data.steps.length;
  const done = data.doneCount ?? data.steps.filter((s) => s.done).length;
  const next = data.steps.find((s) => !s.done);
  if (!next) return null;
  const nextStep = PLAN_STEPS[next.id];
  return (
    <Card style={styles.plan}>
      <View style={styles.planTop}>
        <View style={styles.flex}>
          <Txt variant="heading">Your plan to get hired</Txt>
          <Txt variant="small">{done} of {total} steps done</Txt>
        </View>
        <Image source={LEO.growth} style={styles.planLeo} contentFit="contain" />
      </View>
      <View style={styles.track}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fillBar, { width: `${Math.max(6, (done / total) * 100)}%` }]} />
      </View>
      <View style={styles.steps}>
        {data.steps.map((s) => (
          <View key={s.id} style={styles.step}>
            <Ionicons name={s.done ? 'checkmark-circle' : s.id === next.id ? 'radio-button-on' : 'ellipse-outline'} size={18} color={s.done ? colors.teal : s.id === next.id ? colors.brand : colors.faint} />
            <Txt variant={s.id === next.id ? 'smallStrong' : 'small'} style={s.done ? styles.doneText : null}>{PLAN_STEPS[s.id]?.title ?? s.id}</Txt>
          </View>
        ))}
      </View>
      {nextStep ? (
        <Pressy onPress={() => open(toolById(nextStep.tool))} style={styles.nextBtn}>
          <Txt variant="smallStrong" color={colors.brand}>Next: {nextStep.title}</Txt>
          <Ionicons name="arrow-forward" size={16} color={colors.brand} />
        </Pressy>
      ) : null}
    </Card>
  );
}

function SaleBanner() {
  const { comingSoon } = useSheets();
  if (!isBlackFriday()) return null;
  const left = saleTimeLeft();
  return (
    <Pressy onPress={() => comingSoon('CVMind Pro in the app', 'cheer')}>
      <LinearGradient colors={gradients.sale} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sale}>
        <View style={styles.flex}>
          <Txt variant="tiny" color="#c4b5fd">BLACK FRIDAY</Txt>
          <Txt style={styles.saleTitle}>{BLACK_FRIDAY.percent}% off CVMind Pro</Txt>
          <Txt variant="small" color="#d1d5db">Code {BLACK_FRIDAY.code} · {left.days}d {left.hours}h left</Txt>
        </View>
        <Image source={LEO.cheer} style={styles.saleLeo} contentFit="contain" />
      </LinearGradient>
    </Pressy>
  );
}

export default function Home() {
  const { user } = useSession();
  const { comingSoon } = useSheets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const firstName = (user?.name || '').split(' ')[0] || 'there';

  const refresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries().catch(() => {});
    setRefreshing(false);
  };

  let tileIndex = 0;
  return (
    <SafeAreaView edges={['top']} style={styles.fill}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.brand]} />}>
        <View style={styles.header}>
          <Pressy onPress={() => router.navigate('/me')} accessibilityLabel="Your profile">
            <Avatar name={user?.name || ''} uri={user?.avatar} size={44} />
          </Pressy>
          <View style={styles.flex}>
            <Txt variant="small">{greeting()}</Txt>
            <Txt variant="title" numberOfLines={1}>Hi, {firstName} 👋</Txt>
          </View>
          <Pressy onPress={() => comingSoon('Notifications', 'support')} style={styles.iconBtn} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={22} color={colors.ink} />
          </Pressy>
        </View>

        <Pressy onPress={() => router.navigate('/leo')} style={styles.ask} accessibilityRole="search" accessibilityLabel="Ask Leo">
          <Ionicons name="sparkles" size={18} color={colors.brand} />
          <Txt color={colors.faint} style={styles.flex}>Ask Leo anything about your career…</Txt>
          <View style={styles.askGo}>
            <Ionicons name="arrow-up" size={16} color="#fff" />
          </View>
        </Pressy>

        {user && !user.emailVerified ? (
          <Pressy onPress={() => router.push('/verify-email')} style={styles.verify}>
            <Ionicons name="mail-unread-outline" size={20} color={colors.amber} />
            <View style={styles.flex}>
              <Txt variant="smallStrong">Verify your email</Txt>
              <Txt variant="small">Some tools need it. It takes one tap.</Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressy>
        ) : null}

        <SaleBanner />
        <PlanCard />

        {TOOL_GROUPS.map((group) => (
          <View key={group.id} style={styles.group}>
            <Txt variant="heading">{group.title}</Txt>
            <View style={styles.grid}>
              {group.tools.map((tool) => (
                <ToolTile key={tool.id} tool={tool} index={tileIndex++} />
              ))}
            </View>
          </View>
        ))}

        <Pressy onPress={() => router.navigate('/leo')}>
          <LinearGradient colors={gradients.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.leoCard}>
            <View style={styles.flex}>
              <Txt variant="script">Not sure where to start?</Txt>
              <Txt variant="bodyStrong">{"Tell Leo your goal and he'll plan your next steps."}</Txt>
            </View>
            <Image source={LEO.hello} style={styles.leoCardImg} contentFit="contain" />
          </LinearGradient>
        </Pressy>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: space.xl, paddingBottom: 40, gap: space.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: 56,
    paddingLeft: space.lg,
    paddingRight: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  askGo: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  verify: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.amberSoft },
  sale: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: space.lg, paddingRight: 8, overflow: 'hidden' },
  saleTitle: { fontFamily: fonts.display, fontSize: 20, color: '#fff', marginVertical: 2 },
  saleLeo: { width: 86, height: 86 },
  plan: { gap: space.md },
  planTop: { flexDirection: 'row', alignItems: 'center' },
  planLeo: { width: 58, height: 58 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fillBar: { height: 8, borderRadius: 4 },
  steps: { gap: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  doneText: { textDecorationLine: 'line-through', color: colors.faint },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.brandSoft },
  group: { gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  tileWrap: { width: '25%', padding: 4 },
  tile: { alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 2, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minHeight: 104 },
  tileIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  newDot: { position: 'absolute', top: 4, right: 4, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.rose, borderWidth: 2, borderColor: '#fff' },
  tileLabel: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 15, color: colors.text },
  leoCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: space.lg, gap: space.md },
  leoCardImg: { width: 90, height: 90 },
});
