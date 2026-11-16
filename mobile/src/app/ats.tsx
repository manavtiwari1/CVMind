import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AtsReport } from '@/components/AtsReport';
import { PageHeader } from '@/components/PageHeader';
import { Button, Card, Pressy, Screen, Txt, useToast } from '@/components/ui';
import { Working } from '@/components/Working';
import { errorMessage } from '@/lib/api';
import { success } from '@/lib/haptics';
import { LEO } from '@/lib/leo';
import { PickCancelled, pickResumeFile } from '@/lib/pickFile';
import { analyzeResume, type ResumeAnalysis } from '@/lib/resume';
import { colors, radius, space } from '@/theme';

const POINTS = ['Reads your resume the way recruiter software does', 'Scores keywords, impact and formatting', 'Shows every point and how to earn the ones you missed'];

// ATS check: upload a resume, get the same scored report as the website (POST /api/analyze).
// Signed-in checks are saved to My Documents automatically by the backend.
export default function AtsCheck() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [state, setState] = useState<{ step: 'pick' } | { step: 'working' } | { step: 'done'; report: ResumeAnalysis; fileName: string }>({ step: 'pick' });

  const start = async () => {
    let file;
    try {
      file = await pickResumeFile();
    } catch (err) {
      if (!(err instanceof PickCancelled)) toast(errorMessage(err), 'error');
      return;
    }
    setState({ step: 'working' });
    try {
      const res = await analyzeResume(file);
      success();
      setState({ step: 'done', report: { ...res.data, scoreChange: res.scoreChange ?? res.data.scoreChange }, fileName: file.name });
      void queryClient.invalidateQueries({ queryKey: ['works'] });
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
    } catch (err) {
      toast(errorMessage(err, 'The check did not finish. Please try again.'), 'error');
      setState({ step: 'pick' });
    }
  };

  if (state.step === 'working') {
    return (
      <SafeAreaView style={styles.fill}>
        <Working title="Checking your resume" pose="checklist" steps={['Reading your resume…', 'Matching ATS keywords…', 'Scoring impact and formatting…', 'Writing your fixes…']} />
      </SafeAreaView>
    );
  }

  if (state.step === 'done') {
    return (
      <Screen edges={['top', 'bottom']}>
        <PageHeader title="Your ATS report" />
        <AtsReport report={state.report} fileName={state.fileName} />
        <Card style={styles.next}>
          <Txt variant="heading">Make it better</Txt>
          <Button title="Tailor it to a job" icon="git-compare" onPress={() => router.push('/tailor' as never)} />
          <Button title="Build a new resume" icon="document-text" variant="secondary" onPress={() => router.push('/resume/new' as never)} />
          <Button title="Check another resume" icon="refresh" variant="ghost" onPress={() => setState({ step: 'pick' })} />
        </Card>
        <Txt variant="small" center>This report is saved in My Documents.</Txt>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title="ATS Check" />
      <Animated.View entering={FadeInDown.springify()}>
        <Card style={styles.hero}>
          <Image source={LEO.checklist} style={styles.leo} contentFit="contain" />
          <Txt variant="title" center>Will your resume get past the ATS?</Txt>
          <Txt center color={colors.muted}>Most companies use software to filter resumes before a person reads them. Find out your score in about a minute.</Txt>
        </Card>
      </Animated.View>
      <Pressy onPress={start} style={styles.drop} accessibilityRole="button" accessibilityLabel="Upload your resume">
        <View style={styles.dropIcon}>
          <Ionicons name="cloud-upload" size={30} color={colors.brand} />
        </View>
        <Txt variant="heading">Upload your resume</Txt>
        <Txt variant="small">PDF, DOCX or TXT · up to 5 MB</Txt>
      </Pressy>
      <View style={{ gap: 10 }}>
        {POINTS.map((p) => (
          <View key={p} style={styles.point}>
            <Ionicons name="checkmark-circle" size={18} color={colors.teal} />
            <Txt variant="small" color={colors.text} style={{ flex: 1 }}>{p}</Txt>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  hero: { alignItems: 'center', gap: space.sm },
  leo: { width: 120, height: 120 },
  drop: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.xxl,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  dropIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  point: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  next: { gap: space.md },
});
