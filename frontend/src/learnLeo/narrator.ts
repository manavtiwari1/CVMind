import { pickVoice } from '../components/interview/useLeoVoice';

// Leo's voice for lessons. Speaks a beat's narration with the browser's speech synthesis and reports
// which word it has reached, so board elements appear on their cue words.
// - Narration is spoken one sentence at a time: Chrome cuts off long utterances, and pause/resume
//   restarts the current sentence instead of relying on speechSynthesis.pause (broken on Android).
// - Voices that send no word-boundary events (Chrome's network voices) get an estimate from the
//   speaking pace. Muted, or without speech synthesis, the same pace drives a plain timer.
// A vendor voice with stored audio + word timings can replace this behind the same methods.

export const WORDS_PER_SECOND = 2.6; // matches the backend's duration estimate

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
export const speechSupported = Boolean(synth);

export const splitWords = (text: string) => text.trim().split(/\s+/).filter(Boolean);

interface Sentence { start: number; end: number; text: string; offsets: number[] }

function sentencesOf(words: string[]): Sentence[] {
  const out: Sentence[] = [];
  let start = 0;
  words.forEach((w, i) => {
    if (/[.?!।]["')\]]*$/.test(w) || i === words.length - 1) {
      const slice = words.slice(start, i + 1);
      const offsets: number[] = [];
      let at = 0;
      for (const piece of slice) {
        offsets.push(at);
        at += piece.length + 1;
      }
      out.push({ start, end: i + 1, text: slice.join(' '), offsets });
      start = i + 1;
    }
  });
  return out;
}

export interface NarrationHandlers {
  onWord: (wordIndex: number) => void;
  onEnd: () => void;
}

export class Narrator {
  rate = 1;
  muted = !speechSupported;
  private words: string[] = [];
  private sentences: Sentence[] = [];
  private handlers: NarrationHandlers | null = null;
  private lastWord = -1;
  private gen = 0;
  private playing = false;
  private timer: number | null = null;
  // set once a voice proves it sends word-boundary events; then the estimate is switched off
  private boundaries = false;

  get isPlaying() {
    return this.playing;
  }

  play(text: string, handlers: NarrationHandlers, fromWord = 0) {
    this.teardown();
    this.words = splitWords(text);
    this.sentences = sentencesOf(this.words);
    this.handlers = handlers;
    this.lastWord = fromWord - 1;
    if (!this.words.length) {
      handlers.onEnd();
      return;
    }
    this.playing = true;
    this.startAt(fromWord);
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    this.teardown();
  }

  resume() {
    if (this.playing || !this.handlers) return;
    this.playing = true;
    this.startAt(this.lastWord + 1);
  }

  stop() {
    this.playing = false;
    this.handlers = null;
    this.teardown();
  }

  setRate(rate: number) {
    this.rate = rate;
    this.restartIfPlaying();
  }

  setMuted(muted: boolean) {
    this.muted = muted || !speechSupported;
    this.restartIfPlaying();
  }

  private restartIfPlaying() {
    if (!this.playing) return;
    this.teardown();
    this.startAt(this.lastWord + 1);
  }

  private emit(i: number) {
    const capped = Math.min(i, this.words.length - 1);
    if (capped > this.lastWord) {
      this.lastWord = capped;
      this.handlers?.onWord(capped);
    }
  }

  private finish() {
    this.teardown();
    this.playing = false;
    this.emit(this.words.length - 1);
    const h = this.handlers;
    this.handlers = null;
    h?.onEnd();
  }

  private teardown() {
    this.gen += 1;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
  }

  private startAt(word: number) {
    if (word >= this.words.length) {
      this.finish();
      return;
    }
    if (this.muted) this.runTimer(word);
    else this.speakFrom(this.sentences.findIndex((s) => word < s.end));
  }

  // Muted / no speech: reveal at the speaking pace, then end after a short pause
  private runTimer(fromWord: number) {
    const gen = this.gen;
    const started = performance.now();
    this.timer = window.setInterval(() => {
      if (gen !== this.gen) return;
      const reached = fromWord + Math.floor(((performance.now() - started) / 1000) * WORDS_PER_SECOND * this.rate);
      if (reached >= this.words.length + 1) this.finish();
      else this.emit(reached);
    }, 100);
  }

  private speakFrom(index: number) {
    const s = this.sentences[index];
    if (!synth || !s) {
      this.finish();
      return;
    }
    this.teardown();
    const gen = this.gen;
    const u = new SpeechSynthesisUtterance(s.text);
    const voice = pickVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = 'en-IN';
    }
    u.rate = this.rate;

    let started = 0;
    u.onstart = () => {
      if (gen !== this.gen) return;
      started = performance.now();
      this.emit(s.start);
      // estimate progress until (unless) the voice sends real boundaries
      this.timer = window.setInterval(() => {
        if (gen !== this.gen || this.boundaries) return;
        const est = s.start + Math.floor(((performance.now() - started) / 1000) * WORDS_PER_SECOND * this.rate);
        this.emit(Math.min(est, s.end - 1));
      }, 120);
    };
    u.onboundary = (e) => {
      if (gen !== this.gen || (e.name && e.name !== 'word')) return;
      this.boundaries = true;
      let k = 0;
      while (k + 1 < s.offsets.length && s.offsets[k + 1] <= e.charIndex) k += 1;
      this.emit(s.start + k);
    };
    u.onend = () => {
      if (gen !== this.gen) return;
      this.emit(s.end - 1);
      if (index + 1 < this.sentences.length) this.speakFrom(index + 1);
      else this.finish();
    };
    u.onerror = (e) => {
      if (gen !== this.gen || e.error === 'interrupted' || e.error === 'canceled') return;
      // the voice failed (blocked autoplay, no voices): carry on silently from this sentence
      this.teardown();
      this.muted = true;
      this.runTimer(s.start);
    };
    synth.speak(u);

    // some browsers never start speaking without a gesture or a voice: fall back to the timer
    window.setTimeout(() => {
      if (gen === this.gen && !started && this.playing) {
        this.teardown();
        this.runTimer(s.start);
      }
    }, 2500);
  }
}
