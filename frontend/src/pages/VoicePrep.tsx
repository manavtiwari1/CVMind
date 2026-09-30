import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, ArrowRight, RefreshCw, ChevronRight, Volume2, Zap, Award, AlertCircle, CheckCircle } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import { getErrorMessage } from '../utils/errors';
import { authFetch } from '../lib/authFetch';
import './VoicePrep.css';

interface VoicePrepProps {
  customApiKey: string;
  resumeText: string;
}

const CATEGORIES = ['Behavioral', 'Technical', 'Situational', 'Leadership', 'Problem Solving'];
const LEVELS = ['Entry Level', 'Mid-level', 'Senior', 'Lead / Manager'];

// /api/voice-prep/question
interface VoiceQuestion {
  question: string;
  category?: string;
  difficulty?: string;
  what_interviewer_wants?: string;
}

// /api/voice-prep/analyze
interface VoiceFeedback {
  overallScore: number;
  verdict: string;
  scores?: Record<string, number>;
  fillerWordCount?: number;
  fillerWords?: string[];
  strengths?: string[];
  improvements?: string[];
  starMethod?: Record<string, string>;
  improvedAnswer?: string;
}

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

export default function VoicePrep({ customApiKey, resumeText }: VoicePrepProps) {
  const [jobTitle, setJobTitle] = useState('');
  const [level, setLevel] = useState('Mid-level');
  const [category, setCategory] = useState('Behavioral');
  const [step, setStep] = useState<'setup' | 'question' | 'recording' | 'analyzing' | 'feedback'>('setup');
  const [question, setQuestion] = useState<VoiceQuestion | null>(null);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<VoiceFeedback | null>(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const recognitionRef = useRef<SpeechRecognizer | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);

  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
    || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

  const isSpeechSupported = () => typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const getQuestion = async () => {
    if (!jobTitle.trim()) { setErrorMsg('Please enter your target job title.'); return; }
    setLoadingQ(true); setErrorMsg(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await fetch(`${baseUrl}/api/voice-prep/question`, {
        method: 'POST', headers,
        body: JSON.stringify({ jobTitle, level, category, resumeText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate question');
      setQuestion(data.data);
      setStep('question');
      setTranscript('');
      setFeedback(null);
    } catch (err) {
      setErrorMsg(getErrorMessage(err) || 'Failed to generate question.');
    } finally { setLoadingQ(false); }
  };

  const startRecording = () => {
    if (!isSpeechSupported()) {
      setErrorMsg('Your browser does not support voice recognition. Please use Chrome or Edge.');
      return;
    }
    setErrorMsg(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
        else interim = event.results[i][0].transcript;
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== 'no-speech') {
        if (timerRef.current) clearInterval(timerRef.current);
        isRecordingRef.current = false;
        if (event.error === 'network') {
          setErrorMsg('Network error: Your browser (like Brave) or VPN is blocking the speech recognition server. Try using standard Google Chrome or Edge without a VPN.');
        } else {
          setErrorMsg(`Microphone error: ${event.error}. Make sure mic permissions are allowed.`);
        }
        setStep('question');
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try { recognition.start(); } catch {
          // start() throws if recognition is already running
        }
      }
    };

    isRecordingRef.current = true;
    recognition.start();
    recognitionRef.current = recognition;
    setStep('recording');
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setStep('question');
  };

  const analyzeAnswer = async () => {
    if (!transcript.trim()) { setErrorMsg('No answer recorded. Please try recording again.'); return; }
    setStep('analyzing'); setErrorMsg(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await authFetch(`${baseUrl}/api/voice-prep/analyze`, {
        method: 'POST', headers,
        body: JSON.stringify({ question: question?.question, transcript, jobTitle })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setFeedback(data.data);
      setStep('feedback');
      setSessionCount(c => c + 1);
    } catch (err) {
      setErrorMsg(getErrorMessage(err) || 'Analysis failed.');
      setStep('question');
    }
  };

  const nextQuestion = () => {
    setTranscript(''); setFeedback(null); setQuestion(null); setStep('setup');
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#f59e0b';
    return '#ef4444';
  };

  const getVerdictStyle = (verdict: string) => {
    if (verdict?.includes('Excellent')) return { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' };
    if (verdict?.includes('Good')) return { color: '#2997ff', bg: 'rgba(41,151,255,0.1)', border: 'rgba(41,151,255,0.25)' };
    return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="vp-container animate-fade-in-up">
      <div className="glow-ambient" style={{ top: '5%', right: '5%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
      <div className="glow-ambient" style={{ bottom: '15%', left: '5%', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)' }} />

      {/* Header */}
      <div className="vp-header">
        <div className="vp-title-section">
          <div className="vp-badge"><Mic size={12} /> Voice Interview Practice</div>
          <h1 className="vp-title-text">AI Voice Interview Coach</h1>
          <p className="vp-subtitle-text">
            Answer real interview questions out loud. AI listens, transcribes your response, and gives instant coaching feedback on content, clarity & confidence.
          </p>
        </div>
        {sessionCount > 0 && (
          <div className="vp-session-badge">
            <Award size={14} /> {sessionCount} {sessionCount === 1 ? 'question' : 'questions'} practiced
          </div>
        )}
      </div>

      {/* Browser warning */}
      {!isSpeechSupported() && (
        <div className="vp-browser-warning glass-card">
          <AlertCircle size={16} />
          <div>
            <strong>Voice recognition not supported.</strong> Please use Google Chrome or Microsoft Edge for the best experience. You can still type your answer manually.
          </div>
        </div>
      )}

      {/* Step: Setup */}
      {step === 'setup' && (
        <div className="vp-setup-card glass-card">
          <div className="vp-setup-info">
            <h3>Configure Your Practice Session</h3>
            <p>Choose your role and question type to get a tailored interview question.</p>
          </div>

          <div className="vp-setup-form">
            <div className="form-group">
              <label>Target Job Title *</label>
              <input
                type="text"
                className="form-control-input"
                placeholder="e.g. Software Engineer, Product Manager, Data Analyst..."
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && getQuestion()}
              />
            </div>

            <div className="form-group">
              <label>Experience Level</label>
              <div className="vp-chip-group">
                {LEVELS.map(l => (
                  <button key={l} className={`vp-chip${level === l ? ' active' : ''}`} onClick={() => setLevel(l)}>{l}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Question Category</label>
              <div className="vp-chip-group">
                {CATEGORIES.map(c => (
                  <button key={c} className={`vp-chip${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
                ))}
              </div>
            </div>

            {errorMsg && <div className="vp-error">⚠️ {errorMsg}</div>}

            <button className="btn-primary vp-start-btn" onClick={getQuestion} disabled={loadingQ}>
              {loadingQ ? <><span className="auth-spinner" /> Generating question...</> : <><Zap size={15} /> Get Interview Question <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>
      )}

      {/* Step: Question + Recording */}
      {(step === 'question' || step === 'recording') && question && (
        <div className="vp-question-area">
          {/* Question Card */}
          <div className="vp-question-card glass-card">
            <div className="vp-q-meta">
              <span className="vp-q-badge">{question.category}</span>
              <span className="vp-q-difficulty" style={{ color: question.difficulty === 'Hard' ? '#ef4444' : question.difficulty === 'Easy' ? '#10b981' : '#f59e0b' }}>
                {question.difficulty}
              </span>
            </div>
            <div className="vp-question-icon"><Volume2 size={20} /></div>
            <p className="vp-question-text">"{question.question}"</p>
            {question.what_interviewer_wants && (
              <div className="vp-interviewer-tip">
                <span className="vp-tip-label">💡 What interviewer wants:</span>
                <span>{question.what_interviewer_wants}</span>
              </div>
            )}
          </div>

          {/* Recording area */}
          <div className="vp-recording-area glass-card">
            <div className="vp-recording-header">
              <h4>{step === 'recording' ? '🔴 Recording...' : '🎤 Your Answer'}</h4>
              {step === 'recording' && (
                <span className="vp-timer">{formatTime(recordingTime)}</span>
              )}
            </div>

            {step === 'recording' && (
              <div className="vp-waveform">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="vp-wave-bar" style={{ animationDelay: `${i * 0.08}s` }} />
                ))}
              </div>
            )}

            <div className="vp-transcript-box">
              {transcript || <span className="vp-transcript-placeholder">{step === 'recording' ? 'Listening... speak now' : 'Your transcribed answer will appear here'}</span>}
            </div>

            <div className="vp-recording-actions">
              {step === 'question' ? (
                <button className="vp-mic-btn start" onClick={startRecording}>
                  <Mic size={18} /> Start Recording
                </button>
              ) : (
                <button className="vp-mic-btn stop" onClick={stopRecording}>
                  <MicOff size={18} /> Stop Recording
                </button>
              )}

              {step === 'question' && transcript && (
                <button className="btn-primary vp-analyze-btn" onClick={analyzeAnswer}>
                  <Zap size={15} /> Analyze My Answer
                </button>
              )}
            </div>

            {errorMsg && <div className="vp-error" style={{ marginTop: '1rem' }}>⚠️ {errorMsg}</div>}

            {!isSpeechSupported() && step === 'question' && (
              <div style={{ marginTop: '0.75rem' }}>
                <textarea
                  className="form-control-input"
                  rows={5}
                  placeholder="Type your answer here (voice not supported in your browser)..."
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
            )}
          </div>

          <div className="vp-actions-row">
            <button className="btn-secondary" onClick={nextQuestion}>
              <RefreshCw size={13} /> New Question
            </button>
            <button className="btn-secondary" onClick={() => { setStep('setup'); setTranscript(''); }}>
              Change Settings
            </button>
          </div>
        </div>
      )}

      {step === 'analyzing' && (
        <SkeletonLoader
          type="feedback"
          title="Analyzing your answer..."
          subtitle="Reviewing response for content, clarity, confidence & structure..."
        />
      )}

      {/* Step: Feedback */}
      {step === 'feedback' && feedback && (
        <div className="vp-feedback-area">
          {/* Score Banner */}
          <div className="vp-score-banner glass-card">
            <div className="vp-score-circle" style={{ borderColor: getScoreColor(feedback.overallScore), boxShadow: `0 0 30px ${getScoreColor(feedback.overallScore)}40` }}>
              <span className="vp-score-number" style={{ color: getScoreColor(feedback.overallScore) }}>{feedback.overallScore}</span>
              <span className="vp-score-label">/ 10</span>
            </div>
            <div className="vp-score-details">
              <div className="vp-verdict" style={{ color: getVerdictStyle(feedback.verdict).color, background: getVerdictStyle(feedback.verdict).bg, borderColor: getVerdictStyle(feedback.verdict).border }}>
                {feedback.verdict}
              </div>
              <div className="vp-sub-scores">
                {Object.entries(feedback.scores || {}).map(([key, val]) => (
                  <div key={key} className="vp-sub-score">
                    <span className="vp-sub-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    <div className="vp-sub-bar">
                      <div className="vp-sub-fill" style={{ width: `${val * 10}%`, background: getScoreColor(val) }} />
                    </div>
                    <span className="vp-sub-val" style={{ color: getScoreColor(val) }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filler words */}
          {(feedback.fillerWordCount ?? 0) > 0 && (
            <div className="vp-filler-card glass-card">
              <h4>🗣️ Filler Words Detected ({feedback.fillerWordCount}x)</h4>
              <div className="vp-filler-tags">
                {(feedback.fillerWords || []).map((w: string, i: number) => (
                  <span key={i} className="vp-filler-tag">"{w}"</span>
                ))}
              </div>
              <p>Try replacing fillers with a brief pause — it sounds more confident.</p>
            </div>
          )}

          {/* Strengths & Improvements */}
          <div className="vp-feedback-grid">
            <div className="vp-feedback-col glass-card vp-strengths">
              <h4><CheckCircle size={15} /> Strengths</h4>
              <ul>
                {(feedback.strengths || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="vp-feedback-col glass-card vp-improvements">
              <h4><ChevronRight size={15} /> Improvements</h4>
              <ul>
                {(feedback.improvements || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>

          {/* STAR Method */}
          {feedback.starMethod && (
            <div className="vp-star-card glass-card">
              <h4>⭐ STAR Method Framework</h4>
              <div className="vp-star-grid">
                {Object.entries(feedback.starMethod).map(([key, val]) => (
                  <div key={key} className="vp-star-item">
                    <span className="vp-star-key">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    <span className="vp-star-val">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improved Answer */}
          {feedback.improvedAnswer && (
            <div className="vp-improved-card glass-card">
              <h4>✨ Improved Answer Suggestion</h4>
              <p>{feedback.improvedAnswer}</p>
            </div>
          )}

          {/* Actions */}
          <div className="vp-actions-row">
            <button className="btn-primary" onClick={nextQuestion}>
              <ArrowRight size={14} /> Next Question
            </button>
            <button className="btn-secondary" onClick={() => { setStep('question'); setFeedback(null); setTranscript(''); }}>
              <RefreshCw size={13} /> Retry Same Question
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
