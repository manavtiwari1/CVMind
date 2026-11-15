import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, space } from '@/theme';

// A small Markdown reader for Leo's replies: headings, lists, quotes, code blocks, bold, italic,
// inline code and links. Leo writes plain chat Markdown, so this covers what it sends.

const openLink = (url: string) => {
  if (/^https?:\/\//i.test(url)) WebBrowser.openBrowserAsync(url).catch(() => {});
};

// **bold**, *italic*, `code`, [label](url). No lookbehind, so it works on every JS engine;
// _underscores_ are left alone so snake_case words stay as they are.
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}-${i++}`;
    if (t.startsWith('**')) out.push(<Text key={k} style={styles.bold}>{t.slice(2, -2)}</Text>);
    else if (t.startsWith('`')) out.push(<Text key={k} style={styles.code}>{t.slice(1, -1)}</Text>);
    else if (t.startsWith('[')) {
      const label = t.slice(1, t.indexOf(']'));
      const url = t.slice(t.indexOf('(') + 1, -1);
      out.push(<Text key={k} style={styles.link} onPress={() => openLink(url)}>{label}</Text>);
    } else out.push(<Text key={k} style={styles.italic}>{t.slice(1, -1)}</Text>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; level: number; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string };

function parse(src: string): Block[] {
  const lines = src.replace(/\r/g, '').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: 'p', text: para.join(' ') });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }
    if (!trimmed) {
      flush();
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (h) {
      flush();
      blocks.push({ kind: 'h', level: h[1].length, text: h[2] });
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(trimmed);
    const num = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (bullet || num) {
      flush();
      const kind = bullet ? 'ul' : 'ol';
      const prev = blocks[blocks.length - 1];
      const item = (bullet ?? num)![1];
      if (prev && prev.kind === kind) prev.items.push(item);
      else blocks.push({ kind, items: [item] });
      continue;
    }
    if (trimmed.startsWith('>')) {
      flush();
      blocks.push({ kind: 'quote', text: trimmed.replace(/^>\s?/, '') });
      continue;
    }
    // A line right after a list item that isn't a new item continues it
    const prev = blocks[blocks.length - 1];
    if (!para.length && prev && (prev.kind === 'ul' || prev.kind === 'ol') && /^\s{2,}/.test(line)) {
      prev.items[prev.items.length - 1] += ` ${trimmed}`;
      continue;
    }
    para.push(trimmed);
  }
  flush();
  return blocks;
}

export function Markdown({ children, color = colors.text }: { children: string; color?: string }) {
  const blocks = parse(children);
  return (
    <View style={styles.wrap}>
      {blocks.map((b, i) => {
        const key = `b${i}`;
        if (b.kind === 'p') return <Text key={key} style={[styles.p, { color }]}>{inline(b.text, key)}</Text>;
        if (b.kind === 'h') return <Text key={key} style={[styles.h, b.level <= 2 && styles.h1]}>{inline(b.text, key)}</Text>;
        if (b.kind === 'quote') return <View key={key} style={styles.quote}><Text style={[styles.p, { color }]}>{inline(b.text, key)}</Text></View>;
        if (b.kind === 'code') return <View key={key} style={styles.codeBlock}><Text style={styles.codeText}>{b.text}</Text></View>;
        return (
          <View key={key} style={styles.list}>
            {b.items.map((item, j) => (
              <View key={`${key}-${j}`} style={styles.item}>
                <Text style={[styles.p, styles.marker, { color }]}>{b.kind === 'ul' ? '•' : `${j + 1}.`}</Text>
                <Text style={[styles.p, styles.itemText, { color }]}>{inline(item, `${key}-${j}`)}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  p: { fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 23 },
  h: { fontFamily: fonts.displaySemi, fontSize: 16.5, lineHeight: 22, color: colors.ink, marginTop: 4 },
  h1: { fontSize: 18 },
  bold: { fontFamily: fonts.semibold, color: colors.ink },
  italic: { fontStyle: 'italic' },
  code: { fontFamily: 'monospace', fontSize: 14, backgroundColor: colors.surfaceAlt, color: colors.brandDark },
  link: { color: colors.brand, textDecorationLine: 'underline' },
  list: { gap: 5 },
  item: { flexDirection: 'row', gap: 8, paddingRight: space.sm },
  marker: { minWidth: 16 },
  itemText: { flex: 1 },
  quote: { borderLeftWidth: 3, borderLeftColor: colors.brand, paddingLeft: space.md },
  codeBlock: { backgroundColor: '#11131a', borderRadius: radius.sm, padding: space.md },
  codeText: { fontFamily: 'monospace', fontSize: 13, lineHeight: 19, color: '#e7e9f0' },
});
