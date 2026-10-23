// Live captions from your own microphone, using the browser's speech recognition (Chrome, Edge).
// Each person's browser transcribes only them; the text goes to the others as captions and the
// final lines are kept for Leo's meeting notes. Browsers without it simply don't transcribe.

interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}

const Impl = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition
  || (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;

export const captionsSupported = () => !!Impl;

export class Captioner {
  private rec: Recognition | null = null;
  private running = false;
  private restarts = 0;

  private onText: (text: string, final: boolean) => void;
  private lang: string;

  constructor(onText: (text: string, final: boolean) => void, lang = 'en-IN') {
    this.onText = onText;
    this.lang = lang;
  }

  start() {
    if (!Impl || this.running) return;
    this.running = true;
    this.restarts = 0;
    this.boot();
  }

  private boot() {
    if (!Impl || !this.running) return;
    const rec = new Impl();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = this.lang;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript.trim();
        if (text) this.onText(text, e.results[i].isFinal);
      }
      this.restarts = 0;
    };
    // Recognition stops by itself after silence or about a minute; keep it going while wanted
    rec.onend = () => {
      if (!this.running) return;
      if (this.restarts++ > 20) { this.running = false; return; }
      setTimeout(() => this.boot(), 300);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') this.running = false;
    };
    this.rec = rec;
    try { rec.start(); } catch { /* already started */ }
  }

  stop() {
    this.running = false;
    try { this.rec?.stop(); } catch { /* not running */ }
    this.rec = null;
  }
}
