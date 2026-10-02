import type { VoiceMetrics } from './types';

// Words and phrases people lean on while thinking. "like" and "actually" are left out:
// they are too often used properly ("I'd like to…") to count from a transcript.
const FILLER_WORDS = ['um', 'umm', 'uh', 'uhh', 'er', 'erm', 'hmm', 'basically', 'literally'];
const FILLER_PHRASES = ['you know', 'i mean', 'sort of', 'kind of', 'so yeah'];

/** Pace and filler words for a spoken answer. `seconds` is the time the mic was listening. */
export function voiceMetrics(transcript: string, seconds: number): VoiceMetrics {
  const text = transcript.toLowerCase().replace(/[^a-z' ]+/g, ' ');
  const words = text.split(/\s+/).filter(Boolean);
  const found: string[] = [];
  let count = 0;

  for (const phrase of FILLER_PHRASES) {
    const hits = text.match(new RegExp(`\\b${phrase}\\b`, 'g'))?.length || 0;
    if (hits) { count += hits; found.push(phrase); }
  }
  for (const word of FILLER_WORDS) {
    const hits = words.filter(w => w === word).length;
    if (hits) { count += hits; found.push(word); }
  }

  const secs = Math.max(1, Math.round(seconds));
  return {
    seconds: secs,
    words: words.length,
    wpm: Math.round(words.length / (secs / 60)),
    fillerCount: count,
    fillers: found,
  };
}

export function paceLabel(wpm: number): { label: string; tone: 'good' | 'ok' | 'low' } {
  if (wpm === 0) return { label: 'No pace yet', tone: 'ok' };
  if (wpm < 100) return { label: 'A bit slow', tone: 'ok' };
  if (wpm <= 170) return { label: 'Good pace', tone: 'good' };
  return { label: 'Quite fast', tone: 'low' };
}
