import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { ResumeAnalysis } from '@/lib/resume';
import { colors, fonts, radius, space } from '@/theme';

import { ScoreRing } from './leo/Cards';
import { Card, Pressy, Txt } from './ui';

// The ATS check report, in the same order as the website's report page: the score, what changed,
// where the points come from, quick wins, keywords, then line-by-line rewrites.

const scoreWord = (s: number) => (s >= 80 ? 'Excellent' : s >= 65 ? 'Good' : s >= 50 ? 'Needs work' : 'Weak');
const tone = (s: number, max = 100) => {
  const p = (s / max) * 100;
  return p >= 75 ? colors.teal : p >= 50 ? colors.amber : colors.rose;
};

function Meter({ label, score, feedback }: { label: string; score: number; feedback?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.meterTop}>
        <Txt variant="bodyStrong" style={{ flex: 1 }}>{label}</Txt>
        <Txt variant="bodyStrong" color={tone(score)}>{Math.round(score)}/100</Txt>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(3, Math.min(100, score))}%`, backgroundColor: tone(score) }]} />
      </View>
      {feedback ? <Txt variant="small" color={colors.text}>{feedback}</Txt> : null}
    </View>
  );
}

function Bullets({ items, icon, color }: { items?: string[]; icon: 'checkmark-circle' | 'alert-circle' | 'bulb'; color: string }) {
  if (!items?.length) return null;
  return (
    <View style={{ gap: 8 }}>
      {items.map((t, i) => (
        <View key={i} style={styles.bullet}>
          <Ionicons name={icon} size={17} color={color} style={{ marginTop: 2 }} />
          <Txt variant="small" color={colors.text} style={{ flex: 1 }}>{t}</Txt>
        </View>
      ))}
    </View>
  );
}

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

function Group({ g }: { g: NonNullable<ResumeAnalysis['scoreDetails']>['groups'][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.group}>
      <Pressy onPress={() => setOpen((o) => !o)} style={styles.groupHead} scaleTo={0.99}>
        <Txt variant="bodyStrong" style={{ flex: 1 }}>{g.label}</Txt>
        <Txt variant="smallStrong" color={tone(g.points, g.max)}>{g.points}/{g.max}</Txt>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.faint} />
      </Pressy>
      {open
        ? g.criteria.map((c) => (
            <View key={c.id} style={styles.criterion}>
              <View style={styles.meterTop}>
                <Txt variant="smallStrong" style={{ flex: 1 }}>{c.label}</Txt>
                <Txt variant="smallStrong" color={tone(c.points, c.max)}>{c.points}/{c.max}</Txt>
              </View>
              {c.reason ? <Txt variant="small" color={colors.text}>{c.reason}</Txt> : null}
              {c.fix && c.points < c.max ? <Txt variant="small" color={colors.brand}>Fix: {c.fix}</Txt> : null}
            </View>
          ))
        : null}
    </View>
  );
}

export function AtsReport({ report, fileName }: { report: ResumeAnalysis; fileName?: string }) {
  const change = report.scoreChange;
  return (
    <View style={{ gap: space.lg }}>
      <Animated.View entering={FadeInDown.springify()}>
        <Card style={styles.hero}>
          <ScoreRing score={report.score} size={120} label="ATS SCORE" />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt style={[styles.word, { color: tone(report.score) }]}>{scoreWord(report.score)}</Txt>
            {fileName ? <Txt variant="small" numberOfLines={1}>{fileName}</Txt> : null}
            {change && change.delta !== 0 ? (
              <View style={[styles.change, { backgroundColor: change.delta > 0 ? colors.tealSoft : colors.roseSoft }]}>
                <Ionicons name={change.delta > 0 ? 'trending-up' : 'trending-down'} size={14} color={change.delta > 0 ? colors.teal : colors.rose} />
                <Txt variant="tiny" color={change.delta > 0 ? '#13795b' : '#b4233c'}>
                  {change.delta > 0 ? 'Up' : 'Down'} {Math.abs(change.delta)} since your last check
                </Txt>
              </View>
            ) : null}
          </View>
        </Card>
      </Animated.View>

      {report.summary ? (
        <Card>
          <Txt color={colors.text}>{report.summary}</Txt>
        </Card>
      ) : null}

      {report.scoreDetails?.gains?.length ? (
        <Card style={{ gap: space.md }}>
          <Txt variant="heading">Quick wins</Txt>
          {report.scoreDetails.gains.slice(0, 5).map((g) => (
            <View key={g.id} style={styles.gain}>
              <View style={styles.gainBadge}>
                <Txt variant="tiny" color="#fff">+{g.gain}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="smallStrong">{g.label}</Txt>
                <Txt variant="small" color={colors.text}>{g.fix}</Txt>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={{ gap: space.lg }}>
        <Meter label="ATS keywords" score={report.atsKeywords?.score ?? 0} feedback={report.atsKeywords?.feedback} />
        <Meter label="Content & impact" score={report.contentAndImpact?.score ?? 0} feedback={report.contentAndImpact?.feedback} />
        <Meter label="Formatting & style" score={report.formattingAndStyle?.score ?? 0} feedback={report.formattingAndStyle?.feedback} />
      </Card>

      {report.scoreDetails?.groups?.length ? (
        <Card style={{ gap: space.sm }}>
          <Txt variant="heading">Where your points come from</Txt>
          <Txt variant="small">Tap a part to see every point and how to earn the ones you missed.</Txt>
          {report.scoreDetails.groups.map((g) => <Group key={g.id} g={g} />)}
        </Card>
      ) : null}

      <Card style={{ gap: space.md }}>
        <Txt variant="heading">Keywords</Txt>
        <Txt variant="smallStrong">Found in your resume</Txt>
        <Chips items={report.atsKeywords?.matched} good />
        <Txt variant="smallStrong">Missing</Txt>
        <Chips items={report.atsKeywords?.missing} good={false} />
      </Card>

      <Card style={{ gap: space.md }}>
        <Txt variant="heading">What works</Txt>
        <Bullets items={report.strengths} icon="checkmark-circle" color={colors.teal} />
        <Txt variant="heading">What to fix</Txt>
        <Bullets items={report.weaknesses} icon="alert-circle" color={colors.rose} />
        <Txt variant="heading">Do this next</Txt>
        <Bullets items={report.recommendations} icon="bulb" color={colors.amber} />
      </Card>

      {report.contentAndImpact?.suggestions?.length ? (
        <Card style={{ gap: space.md }}>
          <Txt variant="heading">Stronger lines</Txt>
          {report.contentAndImpact.suggestions.map((s, i) => (
            <View key={i} style={styles.rewrite}>
              <Txt variant="tiny">BEFORE</Txt>
              <Txt variant="small" style={{ textDecorationLine: 'line-through' }}>{s.original}</Txt>
              <Txt variant="tiny" color={colors.teal}>BETTER</Txt>
              <Txt variant="small" color={colors.ink}>{s.improved}</Txt>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  word: { fontFamily: fonts.display, fontSize: 24 },
  change: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  meterTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  bullet: { flexDirection: 'row', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  group: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 12 },
  criterion: { gap: 3, paddingVertical: 8, paddingLeft: space.md, borderLeftWidth: 2, borderLeftColor: colors.border, marginBottom: 6 },
  gain: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  gainBadge: { minWidth: 36, paddingHorizontal: 6, height: 24, borderRadius: 12, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  rewrite: { gap: 3, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
});
