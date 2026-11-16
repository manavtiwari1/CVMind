import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme';

import { ScoreRing } from './leo/Cards';
import { Card, Pressy, Txt, useToast } from './ui';

// Draws any AI tool result (a JSON object) as readable cards: text gets a Copy button, lists become
// bullets, nested objects become sections, and a top-level score becomes a ring. Each tool's own
// field names are turned into headings ("elevatorPitch" → "Elevator pitch").

const SKIP = new Set(['id', '_id', 'createdAt', 'updatedAt', 'userId', 'version', 'type']);
const SCORE_KEYS = ['score', 'overallScore', 'profileScore', 'matchScore'];

export const humanize = (key: string) => {
  const s = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

function CopyText({ text }: { text: string }) {
  const toast = useToast();
  return (
    <Pressy
      onPress={async () => {
        await Clipboard.setStringAsync(text);
        toast('Copied', 'success');
      }}
      style={styles.copy}
      accessibilityLabel="Copy">
      <Ionicons name="copy-outline" size={14} color={colors.brand} />
      <Txt variant="tiny" color={colors.brand}>COPY</Txt>
    </Pressy>
  );
}

function Value({ name, value, depth }: { name: string; value: unknown; depth: number }) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null;
  const title = humanize(name);

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value);
    const long = text.length > 60;
    return (
      <View style={[styles.block, depth === 0 && styles.topBlock]}>
        <View style={styles.head}>
          <Txt variant="smallStrong" style={{ flex: 1 }}>{title}</Txt>
          {long ? <CopyText text={text} /> : null}
        </View>
        <Txt variant="small" color={colors.text} selectable>{text}</Txt>
      </View>
    );
  }

  if (Array.isArray(value)) {
    const allText = value.every((v) => typeof v === 'string' || typeof v === 'number');
    return (
      <View style={[styles.block, depth === 0 && styles.topBlock]}>
        <View style={styles.head}>
          <Txt variant="smallStrong" style={{ flex: 1 }}>{title}</Txt>
          {allText ? <CopyText text={value.join('\n')} /> : null}
        </View>
        {allText
          ? value.map((v, i) => (
              <View key={i} style={styles.bullet}>
                <Txt variant="small" color={colors.brand}>•</Txt>
                <Txt variant="small" color={colors.text} style={{ flex: 1 }} selectable>{String(v)}</Txt>
              </View>
            ))
          : value.map((v, i) => (
              <View key={i} style={styles.item}>
                {v && typeof v === 'object'
                  ? Object.entries(v as Record<string, unknown>).filter(([k]) => !SKIP.has(k)).map(([k, x]) => <Value key={k} name={k} value={x} depth={depth + 1} />)
                  : <Txt variant="small">{String(v)}</Txt>}
              </View>
            ))}
      </View>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([k]) => !SKIP.has(k));
    return (
      <View style={[styles.block, depth === 0 && styles.topBlock]}>
        <Txt variant="smallStrong">{title}</Txt>
        <View style={styles.nested}>
          {entries.map(([k, x]) => <Value key={k} name={k} value={x} depth={depth + 1} />)}
        </View>
      </View>
    );
  }
  return null;
}

export function ResultView({ data }: { data: Record<string, unknown> }) {
  const scoreKey = SCORE_KEYS.find((k) => typeof data[k] === 'number');
  const rest = Object.entries(data).filter(([k]) => k !== scoreKey && !SKIP.has(k));
  return (
    <View style={{ gap: space.md }}>
      {scoreKey ? (
        <Card style={styles.score}>
          <ScoreRing score={Number(data[scoreKey]) <= 10 ? Number(data[scoreKey]) * 10 : Number(data[scoreKey])} size={96} label="SCORE" />
          <Txt variant="heading" style={{ flex: 1 }}>{humanize(scoreKey)}</Txt>
        </Card>
      ) : null}
      {rest.map(([k, v]) => <Value key={k} name={k} value={v} depth={0} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  score: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  block: { gap: 6 },
  topBlock: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bullet: { flexDirection: 'row', gap: 8 },
  item: { gap: 6, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  nested: { gap: space.sm, paddingLeft: space.sm, borderLeftWidth: 2, borderLeftColor: colors.border },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.brandSoft },
});
