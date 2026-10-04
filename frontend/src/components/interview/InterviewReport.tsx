import { useState } from 'react';
import type React from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, Download, Mic, PenLine, RefreshCw, Target } from 'lucide-react';
import { Leo } from '../ResumeOnboarding';
import { readUser } from '../../lib/currentUser';
import { FeedbackCard } from './InterviewSession';
import { scoreTone } from './score';
import type { InterviewMode, InterviewQuestion, InterviewReportData, InterviewSettings, InterviewTurn } from './types';

const BAND = {
  good: { label: 'Interview-ready', text: 'Strong answers overall. Keep practising the weaker ones so they match your best.' },
  ok: { label: 'Getting there', text: 'A solid base. Work through the areas below and run the weak questions again.' },
  low: { label: 'Needs practice', text: 'Plenty to work on, which is what practice is for. Use the stronger answers below as a model.' },
} as const;

interface ReportProps {
  mode: InterviewMode;
  settings: InterviewSettings;
  report: InterviewReportData;
  questions: InterviewQuestion[];
  turns: InterviewTurn[];
  sourceName?: string;
  onRetryWeak: () => void;
  onNew: () => void;
  onSwitchMode: () => void;
}

/** Plain-text copy of the report for download. */
function reportText({ mode, settings, report, questions, turns }: ReportProps): string {
  const lines = [
    `${mode === 'voice' ? 'Voice Prep AI' : 'Interview Prep AI'} report · CVMind`,
    `${settings.role} · ${settings.level} · ${settings.round} round`,
    '',
    `Overall score: ${report.overallScore}/100 (${report.answered} of ${questions.length} answered)`,
    '',
    report.summary,
    '',
    'Strengths:', ...report.strengths.map(s => `- ${s}`),
    '',
    'Work on:', ...report.weakAreas.map(s => `- ${s}`),
    '',
  ];
  questions.forEach((q, i) => {
    const t = turns.find(x => x.questionId === q.id);
    lines.push(`Q${i + 1}. ${q.question}`);
    if (!t?.feedback) { lines.push('Skipped', ''); return; }
    lines.push(`Your answer: ${t.answer}`, `Score: ${t.feedback.score}/10`);
    if (t.metrics) lines.push(`Delivery: ${t.metrics.wpm} words/min, ${t.metrics.fillerCount} filler words`);
    if (t.feedback.missing?.length) lines.push(`Missing: ${t.feedback.missing.join('; ')}`);
    if (t.feedback.improvedAnswer) lines.push(`Stronger answer: ${t.feedback.improvedAnswer}`);
    lines.push('');
  });
  if (report.practiceNext.length) lines.push('Practise next:', ...report.practiceNext.map(s => `- ${s}`));
  return lines.join('\n');
}

export default function InterviewReport(props: ReportProps) {
  const { mode, settings, report, questions, turns, sourceName, onRetryWeak, onNew, onSwitchMode } = props;
  const [open, setOpen] = useState<string | null>(null);
  const score = Math.max(0, Math.min(100, Math.round(report.overallScore || 0)));
  const tone = scoreTone(score / 10);
  const band = BAND[tone];
  const weakCount = questions.filter(q => {
    const fb = turns.find(t => t.questionId === q.id)?.feedback;
    return !fb || fb.score < 6;
  }).length;

  const download = () => {
    const url = URL.createObjectURL(new Blob([reportText(props)], { type: 'text/plain;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${settings.role || 'Interview'} - ${mode === 'voice' ? 'Voice Prep' : 'Interview Prep'} report.txt` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  return (
    <div className="tlr tlr-result ivw ivw-report">
      <div className="tlr-wrap">
        <div className="tlr-result-top">
          <button type="button" className="tlr-back" onClick={onNew}><ArrowLeft size={16} /> Start a new interview</button>
        </div>

        <section className="tlr-done">
          <div className="tlr-done-leo"><Leo pose="growth" /></div>
          <div className="tlr-done-copy">
            <h1>Done! Here's how your {settings.role ? `${settings.role} ` : ''}interview went.</h1>
            <p>{report.summary || 'Your answers and Leo\'s feedback are below.'}</p>
            <small className="tlr-done-meta">
              {settings.level} · {settings.round} round · {report.answered} of {questions.length} answered{sourceName ? ` · ${sourceName}` : ''}
            </small>
            <div className="tlr-done-actions">
              {weakCount > 0 && <button type="button" className="tlr-btn" onClick={onRetryWeak}><RefreshCw size={17} /> Practise the {weakCount} weaker {weakCount === 1 ? 'question' : 'questions'}</button>}
              <button type="button" className="tlr-btn tlr-btn--purple" onClick={onSwitchMode}>
                {mode === 'voice' ? <><PenLine size={17} /> Practise in writing</> : <><Mic size={17} /> Practise out loud with Leo</>}
              </button>
              <button type="button" className="tlr-btn tlr-btn--outline" onClick={download}><Download size={17} /> Download report</button>
            </div>
            {!readUser() && <p className="tlr-fine">Sign in to save your interviews to My Documents.</p>}
          </div>
        </section>

        <div className="tlr-result-grid ivw-report-grid">
          <div className="ivw-qa">
            <h2>Question by question</h2>
            {questions.map((q, i) => {
              const t = turns.find(x => x.questionId === q.id);
              const fb = t?.feedback;
              const isOpen = open === q.id;
              return (
                <div key={q.id} className={`ivw-qa-item${isOpen ? ' is-open' : ''}`}>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : q.id)}>
                    <span className={`ivw-qa-score ivw-tone--${fb ? scoreTone(fb.score) : 'skip'}`}>{fb ? Math.round(fb.score * 10) / 10 : '–'}</span>
                    <span className="ivw-qa-q"><small>Q{i + 1} · {q.category}</small>{q.question}</span>
                    <ChevronDown size={18} />
                  </button>
                  {isOpen && (
                    <div className="ivw-qa-body">
                      {t && fb ? (
                        <>
                          <div className="ivw-your-answer is-static"><strong>Your answer</strong><p>{t.answer}</p></div>
                          <FeedbackCard feedback={fb} turn={t} mode={mode} />
                        </>
                      ) : (
                        <p className="ivw-note">You skipped this one. {q.whatInterviewerWants}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <aside className="tlr-side">
            <section className={`tlr-card tlr-score tlr-score--${tone}`}>
              <div className="tlr-ring" style={{ '--p': score } as React.CSSProperties}>
                <b>{score}<small>/100</small></b>
              </div>
              <div>
                <span className="tlr-score-label">{band.label}</span>
                <p>{band.text}</p>
                <small className="tlr-fine">Scored by AI from your answers. Use it as a guide.</small>
              </div>
            </section>

            {report.strengths.length > 0 && (
              <section className="tlr-card">
                <h3>Your strengths</h3>
                <ul className="tlr-list">{report.strengths.map(s => <li key={s}><CheckCircle2 size={15} />{s}</li>)}</ul>
              </section>
            )}

            {report.weakAreas.length > 0 && (
              <section className="tlr-card">
                <h3>Work on these</h3>
                <ul className="tlr-list ivw-list-miss">{report.weakAreas.map(s => <li key={s}><AlertTriangle size={14} />{s}</li>)}</ul>
              </section>
            )}

            {report.practiceNext.length > 0 && (
              <section className="tlr-card">
                <h3>Practise these next</h3>
                <ul className="tlr-list ivw-list-next">{report.practiceNext.map(s => <li key={s}><Target size={15} />{s}</li>)}</ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
