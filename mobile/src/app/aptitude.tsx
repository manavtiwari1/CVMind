import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/PageHeader';
import { Button, Card, Pressy, Screen, Skeleton, Txt, useToast } from '@/components/ui';
import { Working } from '@/components/Working';
import { api, errorMessage } from '@/lib/api';
import { success } from '@/lib/haptics';
import { LEO } from '@/lib/leo';
import { colors, fonts, radius, space } from '@/theme';

// Same list as frontend/src/lib/aptitude.ts (counts match backend aptitude/questions.js)
const TESTS: { id: AptitudeTopic; label: string; desc: string; questions: number }[] = [
  { id: 'quant', label: 'Quantitative Aptitude', desc: 'Percentages, profit and loss, time and work, interest, speed and distance', questions: 10 },
  { id: 'reasoning', label: 'Logical Reasoning', desc: 'Series, coding-decoding, blood relations, directions, syllogisms', questions: 10 },
  { id: 'verbal', label: 'Verbal Ability', desc: 'Synonyms, antonyms, grammar, error spotting, idioms', questions: 10 },
  { id: 'mixed', label: 'Mixed Mock Test', desc: 'Quant, reasoning and verbal together, like a placement test', questions: 15 },
];

// Shapes of /api/aptitude (frontend/src/lib/aptitude.ts; that file reads Vite env, so the types live here)
type AptitudeTopic = 'quant' | 'reasoning' | 'verbal' | 'mixed';
interface AptitudeQuestion { id: string; topic: string; subtopic: string; question: string; options: string[] }
interface AptitudeTest { topic: AptitudeTopic; label: string; minutes: number; questions: AptitudeQuestion[] }
interface AptitudeResultRow extends AptitudeQuestion { choice: number | null; answer: number; correct: boolean; explanation: string }
interface AptitudeChecked {
  topic: AptitudeTopic;
  score: number;
  total: number;
  skipped: number;
  wrong: number;
  sections: Record<string, { label: string; correct: number; total: number }>;
  results: AptitudeResultRow[];
}

const now = () => Date.now();
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

// Timed aptitude tests on /api/aptitude (start → check). Still behind the same access check as the
// website; results are saved to My Documents by the backend.
export default function Aptitude() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const access = useQuery({ queryKey: ['aptitude-access'], queryFn: () => api<{ access?: boolean }>('/api/aptitude/access').then((r) => r.access === true) });
  const [test, setTest] = useState<AptitudeTest | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState<'start' | 'check' | null>(null);
  const [result, setResult] = useState<AptitudeChecked | null>(null);
  const startedAt = useRef(0);
  const submitted = useRef(false);

  const submit = async (auto = false) => {
    if (!test || submitted.current) return;
    submitted.current = true;
    setBusy('check');
    try {
      const res = await api<AptitudeChecked>('/api/aptitude/check', {
        method: 'POST',
        body: { topic: test.topic, seconds: Math.round((now() - startedAt.current) / 1000), answers: test.questions.map((q) => ({ id: q.id, choice: answers[q.id] ?? null })) },
      });
      success();
      setResult(res);
      if (auto) toast("Time's up. Here is your result.", 'info');
      void queryClient.invalidateQueries({ queryKey: ['works'] });
    } catch (err) {
      submitted.current = false;
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  // The timer; at zero the test is sent as it is
  useEffect(() => {
    if (!test || result) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [test, result]);
  useEffect(() => {
    if (test && !result && left <= 0 && startedAt.current) void submit(true);
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async (topic: AptitudeTopic) => {
    setBusy('start');
    try {
      const t = await api<AptitudeTest>('/api/aptitude/start', { method: 'POST', body: { topic } });
      setTest(t);
      setAnswers({});
      setIndex(0);
      setResult(null);
      submitted.current = false;
      startedAt.current = now();
      setLeft(t.minutes * 60);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  if (access.isLoading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <PageHeader title="Aptitude Tests" />
        <Skeleton height={120} />
      </Screen>
    );
  }

  if (!access.data) {
    return (
      <Screen edges={['top', 'bottom']}>
        <PageHeader title="Aptitude Tests" />
        <Card style={styles.hero}>
          <Image source={LEO.thinking} style={{ width: 120, height: 120 }} contentFit="contain" />
          <Txt variant="title" center>Coming soon</Txt>
          <Txt center color={colors.muted}>Timed placement-style tests in quant, reasoning and verbal are opening soon for your account.</Txt>
        </Card>
      </Screen>
    );
  }

  if (busy === 'check') {
    return (
      <SafeAreaView style={styles.fill}>
        <Working title="Checking your answers" pose="checklist" steps={['Marking your answers…', 'Working out your sections…']} />
      </SafeAreaView>
    );
  }

  if (result && test) {
    return (
      <Screen edges={['top', 'bottom']}>
        <PageHeader title="Your result" />
        <Card style={styles.resultHero}>
          <Image source={result.score / result.total >= 0.6 ? LEO.cheer : LEO.growth} style={{ width: 96, height: 96 }} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Txt style={styles.big}>{result.score}<Txt variant="small">/{result.total}</Txt></Txt>
            <Txt variant="small">{result.wrong} wrong · {result.skipped} skipped</Txt>
          </View>
        </Card>
        <Card style={{ gap: space.sm }}>
          {Object.values(result.sections).map((s) => (
            <View key={s.label} style={{ gap: 4 }}>
              <View style={styles.row}>
                <Txt variant="smallStrong" style={{ flex: 1 }}>{s.label}</Txt>
                <Txt variant="smallStrong">{s.correct}/{s.total}</Txt>
              </View>
              <View style={styles.track}>
                <View style={[styles.fillBar, { width: `${s.total ? (s.correct / s.total) * 100 : 0}%` }]} />
              </View>
            </View>
          ))}
        </Card>
        {result.results.map((r, i) => (
          <Card key={r.id} style={{ gap: 6 }}>
            <View style={styles.row}>
              <Ionicons name={r.correct ? 'checkmark-circle' : r.choice == null ? 'remove-circle' : 'close-circle'} size={18} color={r.correct ? colors.teal : r.choice == null ? colors.faint : colors.rose} />
              <Txt variant="tiny" style={{ flex: 1 }}>Q{i + 1} · {r.subtopic}</Txt>
            </View>
            <Txt variant="bodyStrong">{r.question}</Txt>
            <Txt variant="small" color={colors.teal}>Answer: {r.options[r.answer]}</Txt>
            {!r.correct && r.choice != null ? <Txt variant="small" color={colors.rose}>You chose: {r.options[r.choice]}</Txt> : null}
            {r.explanation ? <Txt variant="small" color={colors.text}>{r.explanation}</Txt> : null}
          </Card>
        ))}
        <Button title="Take another test" icon="refresh" onPress={() => { setTest(null); setResult(null); }} />
      </Screen>
    );
  }

  if (test) {
    const q = test.questions[index];
    const picked = answers[q.id];
    const done = Object.keys(answers).length;
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.row}>
          <Txt variant="heading" style={{ flex: 1 }}>{test.label}</Txt>
          <View style={[styles.timer, left < 60 && styles.timerLow]}>
            <Ionicons name="time-outline" size={15} color={left < 60 ? colors.rose : colors.brand} />
            <Txt variant="smallStrong" color={left < 60 ? colors.rose : colors.brand}>{clock(left)}</Txt>
          </View>
        </View>
        <Txt variant="small">Question {index + 1} of {test.questions.length} · {done} answered</Txt>
        <Card style={{ gap: space.md }}>
          <Txt variant="tiny">{q.subtopic.toUpperCase()}</Txt>
          <Txt variant="heading">{q.question}</Txt>
          {q.options.map((o, i) => (
            <Pressy key={i} onPress={() => setAnswers((a) => ({ ...a, [q.id]: i }))} style={[styles.option, picked === i && styles.optionOn]} scaleTo={0.985}>
              <View style={[styles.letter, picked === i && styles.letterOn]}>
                <Txt variant="smallStrong" color={picked === i ? '#fff' : colors.text}>{String.fromCharCode(65 + i)}</Txt>
              </View>
              <Txt style={{ flex: 1 }}>{o}</Txt>
            </Pressy>
          ))}
        </Card>
        <View style={styles.navRow}>
          <Button title="Back" variant="outline" disabled={index === 0} onPress={() => setIndex(index - 1)} style={{ flex: 1 }} />
          {index + 1 < test.questions.length ? (
            <Button title="Next" iconRight="arrow-forward" onPress={() => setIndex(index + 1)} style={{ flex: 1 }} />
          ) : (
            <Button
              title="Submit"
              icon="checkmark-done"
              onPress={() =>
                done < test.questions.length
                  ? Alert.alert('Submit now?', `${test.questions.length - done} questions are not answered.`, [{ text: 'Keep going', style: 'cancel' }, { text: 'Submit', onPress: () => void submit() }])
                  : void submit()
              }
              style={{ flex: 1 }}
            />
          )}
        </View>
        <View style={styles.dots}>
          {test.questions.map((qq, i) => (
            <Pressy key={qq.id} onPress={() => setIndex(i)} style={[styles.qDot, answers[qq.id] != null && styles.qDotDone, i === index && styles.qDotNow]}>
              <Txt variant="tiny" color={answers[qq.id] != null || i === index ? '#fff' : colors.muted}>{i + 1}</Txt>
            </Pressy>
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title="Aptitude Tests" />
      <Txt color={colors.muted}>Timed tests like the ones in placement drives. Every answer comes with an explanation.</Txt>
      {TESTS.map((t) => (
        <Pressy key={t.id} onPress={() => start(t.id)} disabled={!!busy} style={styles.testRow}>
          <View style={styles.testIcon}>
            <Ionicons name={t.id === 'quant' ? 'calculator' : t.id === 'reasoning' ? 'git-network' : t.id === 'verbal' ? 'text' : 'layers'} size={22} color={colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong">{t.label}</Txt>
            <Txt variant="small">{t.desc}</Txt>
            <Txt variant="tiny">{t.questions} questions</Txt>
          </View>
          <Ionicons name="play-circle" size={28} color={colors.brand} />
        </Pressy>
      ))}
      <Button title="Done" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  hero: { alignItems: 'center', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  big: { fontFamily: fonts.display, fontSize: 36, color: colors.ink },
  resultHero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  track: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fillBar: { height: 7, borderRadius: 4, backgroundColor: colors.teal },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.brandSoft },
  timerLow: { backgroundColor: colors.roseSoft },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  optionOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  letter: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  letterOn: { backgroundColor: colors.brand },
  navRow: { flexDirection: 'row', gap: space.md },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  qDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  qDotDone: { backgroundColor: colors.teal },
  qDotNow: { backgroundColor: colors.brand },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  testIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
});
