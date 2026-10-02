import { useCallback, useEffect, useState } from 'react';

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

/** Picks a natural-sounding English voice, preferring Indian English, then the browser's "Natural"/Google voices. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (!synth) return null;
  const voices = synth.getVoices().filter(v => v.lang.toLowerCase().startsWith('en'));
  if (!voices.length) return null;
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.toLowerCase() === 'en-in' ? 4 : 0) +
    (/natural|neural|online/i.test(v.name) ? 3 : 0) +
    (/google/i.test(v.name) ? 2 : 0) +
    (/^en-(us|gb)$/i.test(v.lang) ? 1 : 0);
  return [...voices].sort((a, b) => score(b) - score(a))[0];
}

/** Leo reads text aloud with the browser's own speech synthesis (free, no API). */
export function useLeoVoice() {
  const [speaking, setSpeaking] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(() => pickVoice());

  // Chrome loads its voice list asynchronously
  useEffect(() => {
    if (!synth) return;
    const load = () => setVoice(pickVoice());
    synth.addEventListener('voiceschanged', load);
    return () => synth.removeEventListener('voiceschanged', load);
  }, []);

  const stop = useCallback(() => {
    synth?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!synth || !text.trim()) { onDone?.(); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    u.rate = 0.98;
    u.onstart = () => setSpeaking(true);
    u.onend = () => { setSpeaking(false); onDone?.(); };
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }, [voice]);

  useEffect(() => () => { synth?.cancel(); }, []);

  return { supported: Boolean(synth), speaking, speak, stop };
}
