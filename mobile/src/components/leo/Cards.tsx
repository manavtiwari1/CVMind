import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Button, Pressy, Txt, useToast } from '@/components/ui';
import { APP_URL } from '@/lib/config';
import type {
  AtsCard, Card, ChoicesCard, CoverLetterCard, InterviewCard, JobsCard, LinkCard, LockedCard, PortfolioLooksCard,
  ProfileNoteCard, RoadmapCard, SummaryCard, TailorCard, WritingCard,
} from '@/lib/leoApi';
import { colors, fonts, radius, space } from '@/theme';

// Leo's result cards, drawn natively. They mirror frontend/src/chat/cards.tsx; a card type the app
// doesn't draw yet links to the same chat on cvmind.in.

export interface CardActions {
  tap: (action: 'choose' | 'confirm' | 'template', value: Record<string, string>, label: string) => void;
  attach: () => void;
  openPage: (page: string) => void;
  upgrade: () => void;
}

const openWeb = (url: string) => WebBrowser.openBrowserAsync(url, { controlsColor: colors.brand }).catch(() => {});

function Shell({ children, tint = colors.border }: { children: ReactNode; tint?: string }) {
  return <View style={[styles.card, { borderColor: tint }]}>{children}</View>;
}

function Section({ title, items, icon, color }: { title: string; items: string[]; icon: 'checkmark-circle' | 'alert-circle' | 'bulb'; color: string }) {
  if (!items?.length) return null;
  return (
    <View style={styles.section}>
      <Txt variant="smallStrong">{title}</Txt>
      {items.map((it, i) => (
        <View key={i} style={styles.row}>
          <Ionicons name={icon} size={16} color={color} style={styles.rowIcon} />
          <Txt variant="small" color={colors.text} style={styles.flex}>{it}</Txt>
        </View>
      ))}
    </View>
  );
}

function Chips({ items, tone }: { items: string[]; tone: 'good' | 'bad' }) {
  if (!items?.length) return null;
  const bg = tone === 'good' ? colors.tealSoft : colors.roseSoft;
  const fg = tone === 'good' ? '#13795b' : '#b4233c';
  return (
    <View style={styles.chips}>
      {items.slice(0, 14).map((c) => (
        <View key={c} style={[styles.chip, { backgroundColor: bg }]}>
          <Txt variant="tiny" color={fg}>{c}</Txt>
        </View>
      ))}
    </View>
  );
}

export function ScoreRing({ score, size = 76, label }: { score: number; size?: number; label?: string }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 75 ? colors.teal : pct >= 50 ? colors.amber : colors.rose;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceAlt} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Txt style={{ fontFamily: fonts.display, fontSize: size * 0.3, color: colors.ink }}>{Math.round(pct)}</Txt>
      {label ? <Txt variant="tiny">{label}</Txt> : null}
    </View>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.barRow}>
      <Txt variant="small" style={styles.barLabel}>{label}</Txt>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
      </View>
      <Txt variant="smallStrong" style={styles.barNum}>{Math.round(value)}</Txt>
    </View>
  );
}

function Ats({ card }: { card: AtsCard }) {
  const [more, setMore] = useState(false);
  return (
    <Shell tint={colors.tealSoft}>
      <View style={styles.atsTop}>
        <ScoreRing score={card.score} label="ATS" />
        <View style={styles.flex}>
          <Txt variant="heading">Your ATS score</Txt>
          <Txt variant="small" color={colors.text}>{card.summary}</Txt>
        </View>
      </View>
      {card.sections ? (
        <View style={{ gap: 6 }}>
          <Bar label="Keywords" value={card.sections.keywords} />
          <Bar label="Impact" value={card.sections.impact} />
          <Bar label="Formatting" value={card.sections.formatting} />
        </View>
      ) : null}
      <Section title="What works" items={card.strengths} icon="checkmark-circle" color={colors.teal} />
      <Section title="What to fix" items={card.weaknesses} icon="alert-circle" color={colors.rose} />
      {more ? (
        <>
          <Section title="Do this next" items={card.recommendations} icon="bulb" color={colors.amber} />
          {card.missing?.length ? <View style={styles.section}><Txt variant="smallStrong">Missing keywords</Txt><Chips items={card.missing} tone="bad" /></View> : null}
          {card.rewrites?.slice(0, 4).map((rw, i) => (
            <View key={i} style={styles.rewrite}>
              <Txt variant="tiny">BEFORE</Txt>
              <Txt variant="small" style={styles.strike}>{rw.original}</Txt>
              <Txt variant="tiny" color={colors.teal}>BETTER</Txt>
              <Txt variant="small" color={colors.ink}>{rw.improved}</Txt>
            </View>
          ))}
        </>
      ) : null}
      <Button title={more ? 'Show less' : 'See full report'} variant="secondary" size="sm" onPress={() => setMore((m) => !m)} />
    </Shell>
  );
}

function Jobs({ card }: { card: JobsCard }) {
  return (
    <Shell>
      <Txt variant="heading">{card.total} jobs for “{card.query}”</Txt>
      {card.loose ? <Txt variant="small">No exact matches, so here are related openings.</Txt> : null}
      {card.jobs.slice(0, 8).map((j) => (
        <Pressy key={j.id} onPress={() => openWeb(j.url)} style={styles.job} scaleTo={0.985}>
          <View style={styles.jobIcon}>
            <Ionicons name="briefcase" size={18} color={colors.teal} />
          </View>
          <View style={styles.flex}>
            <Txt variant="bodyStrong" numberOfLines={1}>{j.title}</Txt>
            <Txt variant="small" numberOfLines={1}>{j.company} · {j.remote ? 'Remote' : j.location}</Txt>
          </View>
          <Ionicons name="open-outline" size={17} color={colors.faint} />
        </Pressy>
      ))}
    </Shell>
  );
}

function Interview({ card }: { card: InterviewCard }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Shell>
      <Txt variant="heading">Interview questions · {card.role}</Txt>
      {card.questions.map((q, i) => (
        <Pressy key={i} onPress={() => setOpen(open === i ? null : i)} style={styles.qa} scaleTo={0.99}>
          <View style={styles.row}>
            <Txt variant="smallStrong" color={colors.brand}>Q{i + 1}</Txt>
            <Txt variant="bodyStrong" style={styles.flex}>{q.question}</Txt>
            <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={16} color={colors.faint} />
          </View>
          {open === i ? (
            <View style={{ gap: 6, marginTop: 6 }}>
              <Txt variant="tiny">{[q.category, q.difficulty].filter(Boolean).join(' · ').toUpperCase()}</Txt>
              {q.wants ? <Txt variant="small" color={colors.text}>What they want: {q.wants}</Txt> : null}
              {q.keyPoints?.map((k, j) => (
                <View key={j} style={styles.row}>
                  <Ionicons name="checkmark" size={15} color={colors.teal} style={styles.rowIcon} />
                  <Txt variant="small" color={colors.text} style={styles.flex}>{k}</Txt>
                </View>
              ))}
            </View>
          ) : null}
        </Pressy>
      ))}
    </Shell>
  );
}

function Roadmap({ card }: { card: RoadmapCard }) {
  return (
    <Shell>
      <Txt variant="heading">Roadmap to {card.targetRole}</Txt>
      {card.summary ? <Txt variant="small" color={colors.text}>{card.summary}</Txt> : null}
      {card.steps.map((s, i) => (
        <View key={i} style={styles.step}>
          <View style={styles.stepDot}><Txt variant="tiny" color="#fff">{i + 1}</Txt></View>
          <View style={styles.flex}>
            <Txt variant="bodyStrong">{s.name}</Txt>
            <Txt variant="tiny">{s.timeframe}</Txt>
            {s.actions?.map((a, j) => <Txt key={j} variant="small" color={colors.text}>• {a}</Txt>)}
            {s.milestone ? <Txt variant="small" color={colors.teal}>Milestone: {s.milestone}</Txt> : null}
          </View>
        </View>
      ))}
    </Shell>
  );
}

function Tailor({ card }: { card: TailorCard }) {
  return (
    <Shell>
      <View style={styles.atsTop}>
        <ScoreRing score={card.matchScore} label="MATCH" />
        <View style={styles.flex}>
          <Txt variant="heading">Tailored to the job</Txt>
          <Txt variant="small" color={colors.text}>{card.summary}</Txt>
        </View>
      </View>
      <Chips items={card.matched} tone="good" />
      <Chips items={card.missing} tone="bad" />
      {card.bullets?.map((b, i) => (
        <View key={i} style={styles.section}>
          <Txt variant="smallStrong">{b.role}</Txt>
          {b.points.map((p, j) => <Txt key={j} variant="small" color={colors.text}>• {p}</Txt>)}
        </View>
      ))}
    </Shell>
  );
}

function CopyButton({ text }: { text: string }) {
  const toast = useToast();
  return (
    <Button
      title="Copy"
      icon="copy-outline"
      variant="secondary"
      size="sm"
      onPress={async () => {
        await Clipboard.setStringAsync(text);
        toast('Copied', 'success');
      }}
    />
  );
}

function Letter({ card }: { card: CoverLetterCard }) {
  const text = [card.greeting, ...card.paragraphs, card.closing, card.name].filter(Boolean).join('\n\n');
  return (
    <Shell>
      <Txt variant="heading">Cover letter · {card.jobTitle}{card.company ? ` at ${card.company}` : ''}</Txt>
      <Txt variant="small" color={colors.text}>{text}</Txt>
      <CopyButton text={text} />
    </Shell>
  );
}

function Writing({ card }: { card: WritingCard }) {
  return (
    <Shell>
      {card.kicker ? <Txt variant="tiny">{card.kicker.toUpperCase()}</Txt> : null}
      <View style={styles.atsTop}>
        <Txt variant="heading" style={styles.flex}>{card.title}</Txt>
        {typeof card.score === 'number' ? <ScoreRing score={card.score} size={56} /> : null}
      </View>
      {card.blocks.map((b, i) => (
        <View key={i} style={styles.block}>
          <Txt variant="smallStrong">{b.title}</Txt>
          <Txt variant="small" color={colors.text}>{b.text}</Txt>
          {b.copy ? <CopyButton text={b.text} /> : null}
        </View>
      ))}
    </Shell>
  );
}

function Choices({ card, actions, live }: { card: ChoicesCard; actions: CardActions; live: boolean }) {
  return (
    <Shell tint={colors.brandSoft}>
      <Txt variant="bodyStrong">{card.question}</Txt>
      <View style={styles.chips}>
        {card.options.map((o) => (
          <Pressy key={o} disabled={!live} onPress={() => actions.tap('choose', { field: card.field, label: o }, o)} style={styles.option}>
            <Txt variant="smallStrong" color={colors.brand}>{o}</Txt>
          </Pressy>
        ))}
      </View>
    </Shell>
  );
}

function Looks({ card, actions, live }: { card: PortfolioLooksCard; actions: CardActions; live: boolean }) {
  return (
    <Shell tint={colors.brandSoft}>
      <Txt variant="bodyStrong">Pick a look</Txt>
      <View style={styles.chips}>
        {card.looks.map((l) => (
          <Pressy key={l.id} disabled={!live} onPress={() => actions.tap('choose', { field: '', label: l.label }, l.label)} style={[styles.look, { backgroundColor: l.bg }]}>
            <View style={[styles.lookDot, { backgroundColor: l.accent }]} />
            <Txt variant="smallStrong" color={l.text}>{l.label}</Txt>
          </Pressy>
        ))}
      </View>
    </Shell>
  );
}

function Summary({ card, actions, live }: { card: SummaryCard; actions: CardActions; live: boolean }) {
  return (
    <Shell tint={colors.brandSoft}>
      <Txt variant="heading">{card.title}</Txt>
      {card.sections.map((s, i) => (
        <View key={i} style={styles.section}>
          <Txt variant="smallStrong">{s.title}</Txt>
          {s.lines.map((l, j) => <Txt key={j} variant="small" color={colors.text}>{l}</Txt>)}
        </View>
      ))}
      {live ? <Button title="Looks good" icon="checkmark" size="sm" onPress={() => actions.tap('confirm', {}, 'Looks good')} /> : null}
    </Shell>
  );
}

function Locked({ card, actions }: { card: LockedCard; actions: CardActions }) {
  return (
    <Shell tint={colors.amberSoft}>
      <View style={styles.row}>
        <Ionicons name={card.action === 'attach' ? 'attach' : 'lock-closed'} size={18} color={colors.amber} style={styles.rowIcon} />
        <Txt variant="small" color={colors.text} style={styles.flex}>{card.message}</Txt>
      </View>
      {card.action === 'attach' ? <Button title="Attach resume" icon="attach" size="sm" onPress={actions.attach} /> : null}
      {card.action === 'upgrade' ? <Button title="See CVMind Pro" icon="diamond-outline" size="sm" onPress={actions.upgrade} /> : null}
    </Shell>
  );
}

function Link({ card, actions }: { card: LinkCard; actions: CardActions }) {
  return (
    <Pressy onPress={() => actions.openPage(card.page)} style={[styles.card, styles.linkCard]}>
      <View style={styles.flex}>
        <Txt variant="bodyStrong">{card.label}</Txt>
        {card.reason ? <Txt variant="small">{card.reason}</Txt> : null}
      </View>
      <Ionicons name="arrow-forward" size={18} color={colors.brand} />
    </Pressy>
  );
}

function Note({ card }: { card: ProfileNoteCard }) {
  return (
    <View style={styles.note}>
      <Ionicons name="bookmark" size={14} color={colors.brand} />
      <Txt variant="small" color={colors.text} style={styles.flex}>{card.message}</Txt>
    </View>
  );
}

function Elsewhere({ card }: { card: Card }) {
  const name = String(card.type).replace(/_/g, ' ');
  return (
    <Pressy onPress={() => openWeb(`${APP_URL}/chat`)} style={[styles.card, styles.linkCard]}>
      <Ionicons name="desktop-outline" size={20} color={colors.brand} />
      <View style={styles.flex}>
        <Txt variant="bodyStrong">Your {name} is ready</Txt>
        <Txt variant="small">This result opens on cvmind.in for now. Same account, same chat.</Txt>
      </View>
      <Ionicons name="open-outline" size={17} color={colors.faint} />
    </Pressy>
  );
}

/** `live`: the card belongs to the newest reply, so its buttons still act */
export function LeoCard({ card, actions, live }: { card: Card; actions: CardActions; live: boolean }) {
  switch (card.type) {
    case 'ats': return <Ats card={card as AtsCard} />;
    case 'jobs': return <Jobs card={card as JobsCard} />;
    case 'interview': return <Interview card={card as InterviewCard} />;
    case 'roadmap': return <Roadmap card={card as RoadmapCard} />;
    case 'tailor': return <Tailor card={card as TailorCard} />;
    case 'cover_letter': return <Letter card={card as CoverLetterCard} />;
    case 'writing': return <Writing card={card as WritingCard} />;
    case 'choices': return <Choices card={card as ChoicesCard} actions={actions} live={live} />;
    case 'portfolio_looks': return <Looks card={card as PortfolioLooksCard} actions={actions} live={live} />;
    case 'summary_confirm': return <Summary card={card as SummaryCard} actions={actions} live={live} />;
    case 'locked': return <Locked card={card as LockedCard} actions={actions} />;
    case 'link': return <Link card={card as LinkCard} actions={actions} />;
    case 'profile_note': return <Note card={card as ProfileNoteCard} />;
    case 'error': return <Shell tint={colors.dangerSoft}><Txt variant="small" color={colors.danger}>{(card as { message: string }).message}</Txt></Shell>;
    default: return <Elsewhere card={card} />;
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, padding: space.lg, gap: space.md },
  section: { gap: 6 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  rowIcon: { marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  atsTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 82 },
  barNum: { width: 28, textAlign: 'right' },
  track: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4, backgroundColor: colors.brand },
  rewrite: { gap: 3, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  strike: { textDecorationLine: 'line-through' },
  job: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6 },
  jobIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center' },
  qa: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  step: { flexDirection: 'row', gap: space.md },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  block: { gap: 6, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  option: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: colors.brand, backgroundColor: colors.surface },
  look: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  lookDot: { width: 12, height: 12, borderRadius: 6 },
  linkCard: { flexDirection: 'row', alignItems: 'center', borderColor: colors.brandSoft },
  note: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: space.sm },
});
