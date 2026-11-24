import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScoreRing } from '@/components/leo/Cards';
import { PageHeader } from '@/components/PageHeader';
import { Button, Card, Screen, Txt, useToast } from '@/components/ui';
import { ApiError, errorMessage } from '@/lib/api';
import { success } from '@/lib/haptics';
import { getJob, postedAgo, recordApply } from '@/lib/jobsApi';
import { colors, space } from '@/theme';

const plain = (html: string) =>
  html
    .replace(/<(br|\/p|\/li|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

function Chips({ items, good }: { items: string[]; good: boolean }) {
  if (!items.length) return <Txt variant="small">None</Txt>;
  return (
    <View style={styles.chips}>
      {items.map((k) => (
        <View key={k} style={[styles.chip, { backgroundColor: good ? colors.tealSoft : colors.roseSoft }]}>
          <Txt variant="tiny" color={good ? '#13795b' : '#b4233c'}>{k}</Txt>
        </View>
      ))}
    </View>
  );
}

// One job: details, how it matches the resume, and Apply (logged in the apply log like the website,
// then the employer's page opens)
export default function JobDetail() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ['finder-job', key], queryFn: () => getJob(key) });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    );
  }
  if (!data) {
    return (
      <Screen edges={['top', 'bottom']}>
        <PageHeader title="Job" />
        <Txt>{errorMessage(error, 'This job is no longer listed.')}</Txt>
      </Screen>
    );
  }
  const { job, match } = data;

  const apply = async () => {
    setApplying(true);
    try {
      const res = await recordApply(job.jobKey);
      if (!res.alreadyApplied) success();
      void queryClient.invalidateQueries({ queryKey: ['finder-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['finder-job', key] });
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
      await WebBrowser.openBrowserAsync(res.applyUrl || job.applyUrl, { controlsColor: colors.brand });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'JOB_APPLY_LIMIT') {
        toast("You've used this month's free applies. Invite friends for more, or go Pro.", 'info');
      } else toast(errorMessage(err), 'error');
    } finally {
      setApplying(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
      <Screen edges={[]} contentStyle={{ paddingBottom: 30 }}>
        <PageHeader title="Job" />
        <Card style={{ gap: 6 }}>
          <Txt variant="title">{job.title}</Txt>
          <Txt variant="bodyStrong" color={colors.text}>{job.company}</Txt>
          <View style={styles.meta}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Txt variant="small">{job.remote ? 'Remote' : job.location || 'India'}</Txt>
            {job.employmentType ? <Txt variant="small">· {job.employmentType.replace(/_/g, ' ').toLowerCase()}</Txt> : null}
            {job.postedAt ? <Txt variant="small">· {postedAgo(job.postedAt)}</Txt> : null}
          </View>
          {job.publisher ? <Txt variant="tiny">via {job.publisher}</Txt> : null}
        </Card>

        {typeof match?.score === 'number' ? (
          <Card style={{ gap: space.md }}>
            <View style={styles.matchTop}>
              <ScoreRing score={match.score} size={84} label="MATCH" />
              <Txt variant="small" color={colors.text} style={{ flex: 1 }}>How your resume matches this job. Add the missing skills to your resume if you have them.</Txt>
            </View>
            <Txt variant="smallStrong">You have</Txt>
            <Chips items={match.matchedSkills || []} good />
            <Txt variant="smallStrong">Missing</Txt>
            <Chips items={match.missingSkills || []} good={false} />
          </Card>
        ) : null}

        {job.description || job.snippet ? (
          <Card style={{ gap: space.sm }}>
            <Txt variant="heading">About the job</Txt>
            <Txt variant="small" color={colors.text}>{plain(job.description || job.snippet)}</Txt>
          </Card>
        ) : null}
      </Screen>
      <View style={styles.bar}>
        {job.appliedAt ? (
          <View style={styles.appliedNote}>
            <Ionicons name="checkmark-circle" size={16} color={colors.teal} />
            <Txt variant="smallStrong" color={colors.teal}>Applied {postedAgo(job.appliedAt).toLowerCase()}</Txt>
          </View>
        ) : null}
        <Button title={job.appliedAt ? 'Open application page' : 'Apply now'} icon="paper-plane" loading={applying} onPress={apply} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  matchTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  bar: { padding: space.lg, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface },
  appliedNote: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
});
