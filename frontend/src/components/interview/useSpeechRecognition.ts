import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal Web Speech API types (not part of TypeScript's DOM lib)
interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface SpeechErrorEvent {
  error: string;
}

interface SpeechRecognizer {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognizerConstructor = new () => SpeechRecognizer;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognizerConstructor;
    webkitSpeechRecognition?: SpeechRecognizerConstructor;
  }
}

const Recognizer = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;

/** Browser speech-to-text (Chrome and Edge). Keeps listening through pauses until stop() is called. */
export function useSpeechRecognition(lang = 'en-IN') {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognizer | null>(null);
  const wantRef = useRef(false);
  const finalRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
    recRef.current = null;
    clearTimer();
    setListening(false);
  }, []);

  /** Starts listening. The transcript carries on from `startFrom` (the text already in the answer box). */
  const start = useCallback((startFrom = '') => {
    if (!Recognizer) {
      setError('Voice answers need Google Chrome or Microsoft Edge. You can type your answer instead.');
      return;
    }
    setError(null);
    finalRef.current = startFrom ? `${startFrom.trim()} ` : '';
    setTranscript(finalRef.current);

    const rec = new Recognizer();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalRef.current += `${event.results[i][0].transcript} `;
        else interim = event.results[i][0].transcript;
      }
      setTranscript(finalRef.current + interim);
    };
    rec.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      stop();
      setError(event.error === 'network'
        ? 'Speech recognition could not reach its server. Brave and some VPNs block it; try Chrome or Edge without a VPN, or type your answer.'
        : event.error === 'not-allowed'
          ? 'Microphone access is blocked. Allow the microphone for this site in your browser, then try again.'
          : `Microphone error (${event.error}). You can type your answer instead.`);
    };
    // Chrome ends a session after a long pause; carry on until the user stops
    rec.onend = () => {
      if (!wantRef.current) return;
      try { rec.start(); } catch {
        // start() throws if recognition is already running
      }
    };

    wantRef.current = true;
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setError('Could not start the microphone. Please try again.');
      wantRef.current = false;
      return;
    }
    setListening(true);
    clearTimer();
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  }, [lang, stop]);

  const reset = useCallback(() => {
    stop();
    finalRef.current = '';
    setTranscript('');
    setSeconds(0);
    setError(null);
  }, [stop]);

  useEffect(() => () => {
    wantRef.current = false;
    recRef.current?.stop();
    clearTimer();
  }, []);

  return { supported: Boolean(Recognizer), listening, transcript, setTranscript, seconds, error, start, stop, reset };
}
