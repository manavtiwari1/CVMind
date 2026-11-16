import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScoreRing } from '@/components/leo/Cards';
import { PageHeader } from '@/components/PageHeader';
import { Button, Card, Input, Pressy, Screen, Txt, useToast } from '@/components/ui';
import { Working } from '@/components/Working';
import { errorMessage } from '@/lib/api';
import { success } from '@/lib/haptics';
import { PickCancelled, pickResumeFile } from '@/lib/pickFile';
import { DEFAULT_TEMPLATE, saveResume, tailorResume, type PickedFile } from '@/lib/resume';
import { useSession } from '@/lib/session';
import { colors, radius, space } from '@/theme';

type Result = Awaited<ReturnType<typeof tailorResume>>;

function Chips({ items, good }: { items?: string[]; good: boolean }) {
  if (!items?.length) return <Txt variant="small">None</Txt>;
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

// Tailor to a job: a resume and a job description in, a rewritten resume on a CVMind template out
// (POST /api/tailor, the same as the website). Counts against the free weekly tailor uses.
export default function Tailor() {
  const { user } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [job, setJob] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    try {
      setFile(await pickResumeFile());
    } catch (err) {
      if (!(err instanceof PickCancelled)) toast(errorMessage(err), 'error');
    }
  };

  const run = async () => {
    if (!file) return setError('Add your resume first.');
    if (job.trim().length < 15) return setError('Paste the job description (a few lines at least).');
    setError(null);
    setBusy(true);
    try {
      const res = await tailorResume(file, job.trim(), DEFAULT_TEMPLATE);
      success();
      setResult(res);
      void queryClient.invalidateQueries({ queryKey: ['works'] });
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
    } catch (err) {
      setError(errorMessage(err, 'Tailoring did not finish. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const openInEditor = async () => {
    if (!result?.html || !user) return;
    setSaving(true);
    try {
      const title = `Tailored Resume${file ? ` - ${file.name.replace(/\.[^.]+$/, '')}` : ''}`;
      const id = await saveResume(user.id, { title, templateId: result.templateId || DEFAULT_TEMPLATE, htmlContent: result.html });
      await queryClient.invalidateQueries({ queryKey: ['works'] });
      router.replace(`/resume/${id}` as never);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (busy) {
    return (
      <SafeAreaView style={styles.fill}>
        <Working title="Tailoring your resume" pose="thinking" steps={['Reading the job…', 'Matching your skills…', 'Rewriting your points…', 'Laying out the resume…']} />
      </SafeAreaView>
    );
  }

  if (result) {
    return (
      <Screen edges={['top', 'bottom']}>
        <PageHeader title="Tailored for the job" />
        <Card style={styles.hero}>
          <ScoreRing score={result.matchScore} size={110} label="MATCH" />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="heading">Your match with this job</Txt>
            <Txt variant="small" color={colors.text}>{"Your resume was rewritten to use the job's own words where your experience supports them."}</Txt>
          </View>
        </Card>
        <Card style={{ gap: space.md }}>
          <Txt variant="smallStrong">Skills that match</Txt>
          <Chips items={result.matchedSkills} good />
          <Txt variant="smallStrong">Worth adding if you have them</Txt>
          <Chips items={result.missingSkillsRecommended} good={false} />
        </Card>
        {Array.isArray(result.insights) && result.insights.length ? (
          <Card style={{ gap: 8 }}>
            <Txt variant="heading">What changed</Txt>
            {result.insights.map((t, i) => (
              <View key={i} style={styles.bullet}>
                <Ionicons name="sparkles" size={15} color={colors.brand} style={{ marginTop: 3 }} />
                <Txt variant="small" color={colors.text} style={{ flex: 1 }}>{String(t)}</Txt>
              </View>
            ))}
          </Card>
        ) : null}
        {result.html ? <Button title="Open tailored resume" icon="document-text" loading={saving} onPress={openInEditor} /> : null}
        <Button title="Tailor for another job" variant="ghost" onPress={() => setResult(null)} />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title="Tailor to a Job" />
      <Txt color={colors.muted}>Paste a job description and get a version of your resume written for it.</Txt>
      <Pressy onPress={pick} style={[styles.file, file && styles.fileOn]} accessibilityLabel="Choose your resume">
        <Ionicons name={file ? 'document-attach' : 'cloud-upload'} size={24} color={colors.brand} />
        <View style={{ flex: 1 }}>
          <Txt variant="bodyStrong" numberOfLines={1}>{file ? file.name : 'Upload your resume'}</Txt>
          <Txt variant="small">{file ? 'Tap to change' : 'PDF, DOCX or TXT · up to 5 MB'}</Txt>
        </View>
      </Pressy>
      <Input label="Job description" value={job} onChangeText={setJob} multiline placeholder="Paste the full job post here" style={styles.jd} />
      {error ? <Txt variant="small" color={colors.danger}>{error}</Txt> : null}
      <Button title="Tailor my resume" icon="sparkles" onPress={run} />
      <Txt variant="small" center>Free plan: 2 tailored resumes a week.</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  bullet: { flexDirection: 'row', gap: 8 },
  file: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.borderStrong, backgroundColor: colors.surface },
  fileOn: { borderStyle: 'solid', borderColor: colors.brand, backgroundColor: colors.brandSoft },
  jd: { minHeight: 180, textAlignVertical: 'top' },
});
