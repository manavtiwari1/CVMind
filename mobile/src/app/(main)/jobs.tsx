import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button, Card, Input, Pressy, Skeleton, Txt, useToast } from '@/components/ui';
import { useWorks } from '@/hooks/useWorks';
import { errorMessage } from '@/lib/api';
import { getFeed, getProfile, postedAgo, resumeFromWork, saveProfile, uploadFinderResume, type FeedFilters, type FinderJob, type FinderProfile } from '@/lib/jobsApi';
import { LEO } from '@/lib/leo';
import { PickCancelled, pickResumeFile } from '@/lib/pickFile';
import { workId } from '@/lib/works';
import { colors, radius, space } from '@/theme';

function Logo({ job }: { job: FinderJob }) {
  const [failed, setFailed] = useState(false);
  if (job.companyLogo && !failed) {
    return <Image source={{ uri: job.companyLogo }} style={styles.logo} contentFit="contain" onError={() => setFailed(true)} />;
  }
  return (
    <View style={[styles.logo, styles.logoFallback]}>
      <Txt variant="bodyStrong" color={colors.brand}>{(job.company || '?')[0]?.toUpperCase()}</Txt>
    </View>
  );
}

function JobRow({ job, index }: { job: FinderJob; index: number }) {
  const score = job.match?.score;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 35).springify().damping(18)}>
      <Pressy onPress={() => router.push(`/job/${encodeURIComponent(job.jobKey)}` as never)} style={styles.job} scaleTo={0.985}>
        <Logo job={job} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="bodyStrong" numberOfLines={2}>{job.title}</Txt>
          <Txt variant="small" numberOfLines={1}>{job.company}</Txt>
          <View style={styles.meta}>
            <Ionicons name="location-outline" size={13} color={colors.muted} />
            <Txt variant="tiny" numberOfLines={1} style={{ flexShrink: 1 }}>{job.remote ? 'Remote' : job.location || 'India'}</Txt>
            {job.postedAt ? <Txt variant="tiny">· {postedAgo(job.postedAt)}</Txt> : null}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {typeof score === 'number' ? (
            <View style={[styles.score, { backgroundColor: score >= 70 ? colors.tealSoft : score >= 45 ? colors.amberSoft : colors.surfaceAlt }]}>
              <Txt variant="tiny" color={score >= 70 ? '#13795b' : score >= 45 ? '#a16207' : colors.muted}>{Math.round(score)}% match</Txt>
            </View>
          ) : null}
          {job.appliedAt ? (
            <View style={styles.applied}>
              <Ionicons name="checkmark" size={12} color={colors.teal} />
              <Txt variant="tiny" color={colors.teal}>Applied</Txt>
            </View>
          ) : null}
        </View>
      </Pressy>
    </Animated.View>
  );
}

// First visit: a resume to match against, and the role and city to search
function Setup({ profile, onDone }: { profile: FinderProfile | undefined; onDone: () => void }) {
  const toast = useToast();
  const works = useWorks();
  const [busy, setBusy] = useState<string | null>(null);
  const [role, setRole] = useState(profile?.preferences.targetTitles?.[0] || '');
  const [city, setCity] = useState(profile?.preferences.locations?.[0] || '');
  const hasResume = !!profile?.resumes?.length;
  const resumes = (works.data || []).filter((w) => w.type === 'resume').slice(0, 4);

  const upload = async () => {
    try {
      const f = await pickResumeFile();
      setBusy('upload');
      await uploadFinderResume(f);
      onDone();
    } catch (err) {
      if (!(err instanceof PickCancelled)) toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const fromDoc = async (id: string) => {
    setBusy(id);
    try {
      await resumeFromWork(id);
      onDone();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const savePrefs = async () => {
    if (!role.trim()) return toast('Add the role you want, like "Frontend Developer".', 'info');
    setBusy('prefs');
    try {
      await saveProfile({ targetTitles: [role.trim()], locations: city.trim() ? [city.trim()] : [] });
      onDone();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: space.lg }}>
      <Card style={styles.setupHero}>
        <Image source={LEO.growth} style={{ width: 110, height: 110 }} contentFit="contain" />
        <Txt variant="title" center>Jobs matched to you</Txt>
        <Txt center color={colors.muted}>Real openings from job sites, company career pages and CVMind recruiters, scored against your resume.</Txt>
      </Card>
      <Card style={{ gap: space.md }}>
        <View style={styles.stepHead}>
          <View style={[styles.stepNum, hasResume && { backgroundColor: colors.teal }]}>
            {hasResume ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Txt variant="tiny" color="#fff">1</Txt>}
          </View>
          <Txt variant="heading">Your resume</Txt>
        </View>
        {hasResume ? (
          <Txt variant="small">Matching with {profile?.resumes.find((r) => r.isDefault)?.label || profile?.resumes[0]?.label}.</Txt>
        ) : (
          <>
            {resumes.map((w) => (
              <Pressy key={workId(w)} onPress={() => fromDoc(workId(w))} disabled={!!busy} style={styles.docRow}>
                <Ionicons name="document-text" size={18} color={colors.brand} />
                <Txt variant="smallStrong" style={{ flex: 1 }} numberOfLines={1}>{w.title}</Txt>
                {busy === workId(w) ? <Txt variant="tiny">Adding…</Txt> : <Ionicons name="add-circle-outline" size={20} color={colors.brand} />}
              </Pressy>
            ))}
            <Button title="Upload a resume" icon="cloud-upload-outline" variant="secondary" size="sm" loading={busy === 'upload'} onPress={upload} />
          </>
        )}
      </Card>
      <Card style={{ gap: space.md }}>
        <View style={styles.stepHead}>
          <View style={styles.stepNum}><Txt variant="tiny" color="#fff">2</Txt></View>
          <Txt variant="heading">What are you looking for?</Txt>
        </View>
        <Input label="Role" value={role} onChangeText={setRole} placeholder="e.g. Frontend Developer" />
        <Input label="City (optional)" value={city} onChangeText={setCity} placeholder="e.g. Bangalore" />
        <Button title="Show my jobs" iconRight="arrow-forward" loading={busy === 'prefs'} disabled={!hasResume} onPress={savePrefs} />
        {!hasResume ? <Txt variant="small">Add a resume first.</Txt> : null}
      </Card>
    </View>
  );
}

export default function JobsTab() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FeedFilters>({});
  const [search, setSearch] = useState('');
  const profile = useQuery({ queryKey: ['finder-profile'], queryFn: getProfile });
  const ready = !!profile.data?.onboarded && !!profile.data?.resumes?.length && !!profile.data?.preferences?.targetTitles?.length;
  const feed = useQuery({ queryKey: ['finder-feed', filters], queryFn: () => getFeed(filters), enabled: ready, staleTime: 5 * 60_000 });
  const plan = feed.data?.plan ?? profile.data?.plan;

  const toggle = (patch: FeedFilters) => setFilters((f) => ({ ...f, ...patch }));
  const chips: { label: string; on: boolean; flip: () => void }[] = [
    { label: 'Remote', on: !!filters.remote, flip: () => toggle({ remote: !filters.remote }) },
    { label: 'Fresher', on: filters.level === 'fresher', flip: () => toggle({ level: filters.level === 'fresher' ? null : 'fresher' }) },
    { label: 'Internship', on: filters.type === 'internship', flip: () => toggle({ type: filters.type === 'internship' ? null : 'internship' }) },
    { label: 'Last 7 days', on: filters.days === 7, flip: () => toggle({ days: filters.days === 7 ? null : 7 }) },
  ];

  const header = (
    <View style={{ gap: space.md }}>
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <Input
            icon="search"
            value={search}
            onChangeText={setSearch}
            placeholder="Search a role or company"
            returnKeyType="search"
            onSubmitEditing={() => toggle({ q: search.trim() || undefined })}
          />
        </View>
      </View>
      <View style={styles.chips}>
        {chips.map((c) => (
          <Pressy key={c.label} onPress={c.flip} style={[styles.chip, c.on && styles.chipOn]}>
            <Txt variant="smallStrong" color={c.on ? '#fff' : colors.text}>{c.label}</Txt>
          </Pressy>
        ))}
      </View>
      {plan && !plan.pro && plan.applies ? (
        <View style={styles.plan}>
          <Ionicons name="paper-plane-outline" size={15} color={colors.brand} />
          <Txt variant="small" color={colors.text} style={{ flex: 1 }}>
            Free applies this month: {Math.max(0, plan.applies.limit - plan.applies.used)} of {plan.applies.limit} left{plan.applies.credits ? ` · +${plan.applies.credits} from invites` : ''}
          </Txt>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
      <AppHeader title="Jobs" sub={ready ? `Matched to your resume · ${profile.data?.preferences.targetTitles?.[0] || 'your role'}` : undefined} />
      {profile.isLoading ? (
        <View style={styles.pad}>
          <Skeleton height={28} width="40%" />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </View>
      ) : !ready ? (
        <FlatList
          data={[]}
          renderItem={() => null}
          contentContainerStyle={styles.pad}
          ListHeaderComponent={
            <Setup
              profile={profile.data}
              onDone={() => {
                void queryClient.invalidateQueries({ queryKey: ['finder-profile'] });
                void queryClient.invalidateQueries({ queryKey: ['finder-feed'] });
              }}
            />
          }
        />
      ) : (
        <FlatList
          data={feed.data?.jobs || []}
          keyExtractor={(j) => j.jobKey}
          contentContainerStyle={styles.pad}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={() => void feed.refetch()} colors={[colors.brand]} />}
          renderItem={({ item, index }) => <JobRow job={item} index={index} />}
          ListEmptyComponent={
            feed.isLoading ? (
              <View style={{ gap: space.sm }}>
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={84} />)}
              </View>
            ) : (
              <View style={styles.empty}>
                <Image source={LEO.thinking} style={{ width: 110, height: 110 }} contentFit="contain" />
                <Txt variant="heading" center>{feed.error ? "Couldn't load jobs" : 'No jobs for these filters'}</Txt>
                <Txt variant="small" center>{feed.error ? errorMessage(feed.error) : 'Try another role, a bigger city, or fewer filters.'}</Txt>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: space.xl, paddingTop: space.xs, paddingBottom: 40, gap: space.sm },
  setupHero: { alignItems: 'center', gap: space.sm },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  searchRow: { flexDirection: 'row', gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: space.md, borderRadius: radius.md, backgroundColor: colors.brandSoft },
  job: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  logo: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  logoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  score: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  applied: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
});
