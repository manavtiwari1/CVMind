import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AnswerFeedback, InterviewQuestion, InterviewReportData, InterviewTurn, VoiceMetrics } from '@web/components/interview/types';
import { voiceMetrics } from '@web/components/interview/voiceMetrics';

import { PageHeader } from '@/components/PageHeader';
import { Button, Card, Input, Pressy, Screen, Txt, useToast } from '@/components/ui';
import { Working } from '@/components/Working';
import { api, errorMessage } from '@/lib/api';
import { success } from '@/lib/haptics';
import { LEO } from '@/lib/leo';
import { PickCancelled, pickResumeFile } from '@/lib/pickFile';
import type { PickedFile } from '@/lib/resume';
import { colors, fonts, radius, space } from '@/theme';

const LEVELS = ['Fresher', 'Mid-level', 'Senior', 'Lead / Manager'];
const ROUNDS = ['Mixed', 'HR', 'Behavioural', 'Technical'];
const COUNTS = [5, 8, 10];

type Mode = 'text' | 'voice';

function Pills<T extends string | number>({ items, value, onChange }: { items: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.pills}>
      {items.map((it) => (
        <Pressy key={String(it)} onPress={() => onChange(it)} style={[styles.pill, value === it && styles.pillOn]}>
          <Txt variant="smallStrong" color={value === it ? '#fff' : colors.text}>{String(it)}</Txt>
        </Pressy>
      ))}
    </View>
  );
}

function Pulse() {
  const s = useSharedValue(1);
  useEffect(() => {
    s.set(withRepeat(withTiming(1.25, { duration: 700 }), -1, true));
  }, [s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }], opacity: 2 - s.get() }));
  return <Animated.View style={[styles.pulse, style]} />;
}

function Feedback({ fb }: { fb: AnswerFeedback }) {
  const tone = fb.score >= 7.5 ? colors.teal : fb.score >= 5 ? colors.amber : colors.rose;
  return (
    <Animated.View entering={FadeInDown.springify()} style={{ gap: space.md }}>
      <Card style={{ gap: space.sm }}>
        <View style={styles.row}>
          <Txt style={[styles.bigScore, { color: tone }]}>{fb.score.toFixed(1)}</Txt>
          <Txt variant="small">/ 10</Txt>
          {fb.verdict ? <Txt variant="smallStrong" color={tone} style={{ flex: 1, textAlign: 'right' }}>{fb.verdict}</Txt> : null}
        </View>
        {fb.strengths?.map((t, i) => (
          <View key={`s${i}`} style={styles.row}>
            <Ionicons name="checkmark-circle" size={16} color={colors.teal} />
            <Txt variant="small" color={colors.text} style={{ flex: 1 }}>{t}</Txt>
          </View>
        ))}
        {fb.missing?.map((t, i) => (
          <View key={`m${i}`} style={styles.row}>
            <Ionicons name="alert-circle" size={16} color={colors.rose} />
            <Txt variant="small" color={colors.text} style={{ flex: 1 }}>{t}</Txt>
          </View>
        ))}
        {fb.deliveryTip ? <Txt variant="small" color={colors.brand}>Delivery: {fb.deliveryTip}</Txt> : null}
      </Card>
      {fb.improvedAnswer ? (
        <Card style={{ gap: 6, backgroundColor: colors.tealSoft, borderColor: colors.tealSoft }}>
          <Txt variant="smallStrong">A stronger answer</Txt>
          <Txt variant="small" color={colors.ink}>{fb.improvedAnswer}</Txt>
        </Card>
      ) : null}
    </Animated.View>
  );
}

// Leo's mock interview on /api/interview/* (plan, evaluate, report), the same as the website's
// Interview Prep and Voice Prep. Voice mode reads each question aloud and listens with the phone's
// speech recogniser; pace and filler words come from the website's own voiceMetrics.
export default function Interview() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = params.mode === 'voice' ? 'voice' : 'text';
  const toast = useToast();
  const queryClient = useQueryClient();

  const [role, setRole] = useState('');
  const [level, setLevel] = useState('Fresher');
  const [round, setRound] = useState('Mixed');
  const [count, setCount] = useState(5);
  const [jd, setJd] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);

  const [phase, setPhase] = useState<'setup' | 'planning' | 'session' | 'reporting' | 'done'>('setup');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName] = useState('');
  const [index, setIndex] = useState(0);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [answer, setAnswer] = useState('');
  const [scoring, setScoring] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [report, setReport] = useState<InterviewReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [listening, setListening] = useState(false);
  const startedAt = useRef(0);
  const spoken = useRef('');

  const q = questions[index];
  const turn = turns.find((t) => t.questionId === q?.id);

  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results[0]?.transcript ?? '';
    if (e.isFinal) {
      spoken.current = `${spoken.current} ${text}`.trim();
      setAnswer(spoken.current);
    } else setAnswer(`${spoken.current} ${text}`.trim());
  });
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    if (e.error !== 'no-speech' && e.error !== 'aborted') toast(e.message || "Couldn't hear you. Try again or type your answer.", 'error');
  });

  // Voice mode: Leo reads each new question aloud
  useEffect(() => {
    if (mode === 'voice' && phase === 'session' && q && !turn) Speech.speak(q.question, { language: 'en-IN', rate: 0.98 });
    return () => {
      Speech.stop();
    };
  }, [mode, phase, q, turn]);

  const pick = async () => {
    try {
      setFile(await pickResumeFile());
    } catch (err) {
      if (!(err instanceof PickCancelled)) toast(errorMessage(err), 'error');
    }
  };

  const plan = async () => {
    if (!role.trim()) return setError('Add the role you are preparing for.');
    setError(null);
    setPhase('planning');
    try {
      const form = new FormData();
      form.append('role', role.trim());
      form.append('level', level);
      form.append('round', round);
      form.append('count', String(count));
      form.append('mode', mode);
      if (jd.trim()) form.append('jobDescription', jd.trim());
      if (file) form.append('resume', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob);
      const res = await api<{ data: { questions: InterviewQuestion[] }; resumeText?: string; fileName?: string }>('/api/interview/plan', { method: 'POST', form });
      const qs = res.data?.questions || [];
      if (!qs.length) throw new Error('Leo could not prepare questions. Please try again.');
      setQuestions(qs);
      setResumeText(res.resumeText || '');
      setFileName(res.fileName || file?.name || '');
      setTurns([]);
      setIndex(0);
      setAnswer('');
      setPhase('session');
    } catch (err) {
      setError(errorMessage(err));
      setPhase('setup');
    }
  };

  const toggleMic = async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return toast('Allow the microphone to answer by voice, or type your answer.', 'info');
    Speech.stop();
    spoken.current = answer;
    startedAt.current = Date.now();
    setListening(true);
    ExpoSpeechRecognitionModule.start({ lang: 'en-IN', interimResults: true, continuous: true });
  };

  const submit = async () => {
    if (!q || answer.trim().length < 3) return toast('Answer the question first.', 'info');
    if (listening) ExpoSpeechRecognitionModule.stop();
    setScoring(true);
    const metrics: VoiceMetrics | undefined = mode === 'voice' && startedAt.current ? voiceMetrics(answer, Math.max(1, (Date.now() - startedAt.current) / 1000)) : undefined;
    try {
      const res = await api<{ data: AnswerFeedback }>('/api/interview/evaluate', {
        method: 'POST',
        body: { question: q.question, answer: answer.trim(), keyPoints: q.keyPoints, role, jobDescription: jd, resumeText, mode, metrics },
      });
      setTurns((t) => [...t.filter((x) => x.questionId !== q.id), { questionId: q.id, answer: answer.trim(), metrics, feedback: res.data }]);
      startedAt.current = 0;
    } catch (err) {
      toast(errorMessage(err, 'Could not score your answer. Please try again.'), 'error');
    } finally {
      setScoring(false);
    }
  };

  const finish = async () => {
    setPhase('reporting');
    try {
      const res = await api<{ data: InterviewReportData }>('/api/interview/report', {
        method: 'POST',
        body: { mode, settings: { role, level, round, count }, fileName, jobDescription: jd, resumeText, questions, turns },
      });
      success();
      setReport(res.data);
      setPhase('done');
      void queryClient.invalidateQueries({ queryKey: ['works'] });
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
    } catch (err) {
      toast(errorMessage(err, 'Could not write your report. Please try again.'), 'error');
      setPhase('session');
    }
  };

  const next = () => {
    setAnswer('');
    setShowHint(false);
    spoken.current = '';
    if (index + 1 < questions.length) setIndex(index + 1);
    else void finish();
  };

  if (phase === 'planning') {
    return (
      <SafeAreaView style={styles.fill}>
        <Working title="Preparing your interview" pose="support" steps={[`Thinking like a ${role} interviewer…`, 'Picking the right questions…', 'Getting ready…']} />
      </SafeAreaView>
    );
  }
  if (phase === 'reporting') {
    return (
      <SafeAreaView style={styles.fill}>
        <Working title="Writing your report" pose="growth" steps={['Reading your answers…', 'Finding your strengths…', 'Planning what to practise next…']} />
      </SafeAreaView>
    );
  }

  if (phase === 'done' && report) {
    return (
      <Screen edges={['top', 'bottom']}>
        <PageHeader title="Your interview report" />
        <Card style={styles.reportHero}>
          <Image source={LEO.cheer} style={{ width: 100, height: 100 }} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Txt style={styles.bigScore}>{Math.round(report.overallScore)}<Txt variant="small">/100</Txt></Txt>
            <Txt variant="small">{report.answered} of {questions.length} answered</Txt>
          </View>
        </Card>
        <Card style={{ gap: space.sm }}>
          <Txt color={colors.text}>{report.summary}</Txt>
        </Card>
        {[
          { title: 'Strengths', items: report.strengths, icon: 'checkmark-circle' as const, color: colors.teal },
          { title: 'Work on', items: report.weakAreas, icon: 'alert-circle' as const, color: colors.rose },
          { title: 'Practise next', items: report.practiceNext, icon: 'bulb' as const, color: colors.amber },
        ].map((s) =>
          s.items?.length ? (
            <Card key={s.title} style={{ gap: 8 }}>
              <Txt variant="heading">{s.title}</Txt>
              {s.items.map((t, i) => (
                <View key={i} style={styles.row}>
                  <Ionicons name={s.icon} size={16} color={s.color} />
                  <Txt variant="small" color={colors.text} style={{ flex: 1 }}>{t}</Txt>
                </View>
              ))}
            </Card>
          ) : null,
        )}
        <Button title="Practise again" icon="refresh" onPress={() => setPhase('setup')} />
        <Button title="Done" variant="ghost" onPress={() => router.back()} />
        <Txt variant="small" center>This report is saved in My Documents.</Txt>
      </Screen>
    );
  }

  if (phase === 'session' && q) {
    return (
      <Screen edges={['top', 'bottom']}>
        <PageHeader title={`Question ${index + 1} of ${questions.length}`} />
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${((index + (turn ? 1 : 0)) / questions.length) * 100}%` }]} />
        </View>
        <Card style={{ gap: space.sm }}>
          <View style={styles.row}>
            <Image source={LEO.support} style={{ width: 40, height: 40 }} contentFit="contain" />
            <Txt variant="tiny" style={{ flex: 1 }}>{[q.category, q.difficulty].filter(Boolean).join(' · ').toUpperCase()}</Txt>
            {mode === 'voice' ? (
              <Pressy onPress={() => Speech.speak(q.question, { language: 'en-IN' })} hitSlop={8} accessibilityLabel="Hear the question again">
                <Ionicons name="volume-high" size={20} color={colors.brand} />
              </Pressy>
            ) : null}
          </View>
          <Txt variant="heading">{q.question}</Txt>
          <Pressy onPress={() => setShowHint((h) => !h)} style={styles.row}>
            <Ionicons name="bulb-outline" size={15} color={colors.amber} />
            <Txt variant="smallStrong" color={colors.amber}>{showHint ? 'Hide hint' : 'What they want to hear'}</Txt>
          </Pressy>
          {showHint ? (
            <View style={{ gap: 4 }}>
              <Txt variant="small" color={colors.text}>{q.whatInterviewerWants}</Txt>
              {q.keyPoints?.map((k, i) => <Txt key={i} variant="small" color={colors.text}>• {k}</Txt>)}
            </View>
          ) : null}
        </Card>

        {turn?.feedback ? (
          <>
            <Card style={{ gap: 4 }}>
              <Txt variant="tiny">YOUR ANSWER</Txt>
              <Txt variant="small" color={colors.text}>{turn.answer}</Txt>
              {turn.metrics ? (
                <Txt variant="tiny">{Math.round(turn.metrics.wpm)} words/min · {turn.metrics.fillerCount} filler words</Txt>
              ) : null}
            </Card>
            <Feedback fb={turn.feedback} />
            <Button title={index + 1 < questions.length ? 'Next question' : 'Finish and see report'} iconRight="arrow-forward" onPress={next} />
          </>
        ) : (
          <>
            {mode === 'voice' ? (
              <View style={styles.micWrap}>
                <Pressy onPress={toggleMic} style={[styles.mic, listening && styles.micOn]} accessibilityLabel={listening ? 'Stop' : 'Answer by voice'}>
                  {listening ? <Pulse /> : null}
                  <Ionicons name={listening ? 'stop' : 'mic'} size={34} color="#fff" />
                </Pressy>
                <Txt variant="small">{listening ? 'Listening… tap to stop' : 'Tap and answer out loud'}</Txt>
              </View>
            ) : null}
            <Input
              value={answer}
              onChangeText={(v) => {
                setAnswer(v);
                spoken.current = v;
              }}
              multiline
              placeholder={mode === 'voice' ? 'Your words show up here. You can fix them before sending.' : 'Type your answer the way you would say it'}
              style={styles.answer}
            />
            <Button title="Get feedback" icon="sparkles" loading={scoring} onPress={submit} />
            <Button title="Skip this question" variant="ghost" size="sm" onPress={next} disabled={scoring} />
          </>
        )}
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title={mode === 'voice' ? 'Voice Interview' : 'Interview Prep'} />
      <Card style={styles.hero}>
        <Image source={LEO.support} style={{ width: 110, height: 110 }} contentFit="contain" />
        <Txt variant="title" center>{mode === 'voice' ? 'Practise out loud with Leo' : 'A mock interview with Leo'}</Txt>
        <Txt center color={colors.muted}>
          {mode === 'voice' ? 'Leo asks each question aloud, you answer by voice, and you get feedback on what you said and how you said it.' : 'Real questions for your role, feedback on every answer, and a report at the end.'}
        </Txt>
      </Card>
      <Input label="Role" value={role} onChangeText={setRole} placeholder="e.g. Software Engineer Intern" />
      <View style={{ gap: 8 }}>
        <Txt variant="smallStrong">Level</Txt>
        <Pills items={LEVELS} value={level} onChange={setLevel} />
      </View>
      <View style={{ gap: 8 }}>
        <Txt variant="smallStrong">Round</Txt>
        <Pills items={ROUNDS} value={round} onChange={setRound} />
      </View>
      <View style={{ gap: 8 }}>
        <Txt variant="smallStrong">Questions</Txt>
        <Pills items={COUNTS} value={count} onChange={setCount} />
      </View>
      <Pressy onPress={pick} style={[styles.file, file && styles.fileOn]}>
        <Ionicons name={file ? 'document-attach' : 'attach'} size={20} color={colors.brand} />
        <Txt variant="smallStrong" style={{ flex: 1 }} numberOfLines={1}>{file ? file.name : 'Add your resume (optional, for personal questions)'}</Txt>
      </Pressy>
      <Input label="Job description (optional)" value={jd} onChangeText={setJd} multiline placeholder="Paste it for questions about this exact job" style={styles.jd} />
      {error ? <Txt variant="small" color={colors.danger}>{error}</Txt> : null}
      <Button title="Start interview" icon={mode === 'voice' ? 'mic' : 'play'} onPress={plan} />
      <Txt variant="small" center>Free plan: 1 {mode === 'voice' ? 'voice' : 'interview'} session a week.</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  hero: { alignItems: 'center', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  file: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong, backgroundColor: colors.surface },
  fileOn: { borderStyle: 'solid', borderColor: colors.brand, backgroundColor: colors.brandSoft },
  jd: { minHeight: 100, textAlignVertical: 'top' },
  answer: { minHeight: 150, textAlignVertical: 'top' },
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: colors.brand },
  bigScore: { fontFamily: fonts.display, fontSize: 34, color: colors.ink },
  reportHero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  micWrap: { alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  mic: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  micOn: { backgroundColor: colors.rose },
  pulse: { position: 'absolute', width: 84, height: 84, borderRadius: 42, backgroundColor: colors.rose },
});
