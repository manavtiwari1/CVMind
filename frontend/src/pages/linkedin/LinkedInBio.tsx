import { useEffect, useState } from 'react';
import type React from 'react';
import {
  CheckCircle2, Download, Eye, Hash, Image as ImageIcon, LayoutTemplate, Palette, PenLine, Sparkles, Type, UserRound,
} from 'lucide-react';
import {
  CareerApp, CareerIntro, CareerNext, CareerWorking, CharCount, Chips, CopyButton, CvPicker, Field, Panel,
} from '../../components/career/CareerKit';
import type { IntroCopy } from '../../components/career/CareerKit';
import { cvLabel, downloadText, postCareer, resultKey, useCareerRun, useCvInput } from '../../components/career/careerApi';
import { readUser } from '../../lib/currentUser';
import { parseSavedContent } from '../../utils/savedWork';
import type { LoadedWork } from '../../types/api';
import './LinkedInBio.css';

// /api/linkedin/bio (linkedinBioSchema in backend/src/services/gemini.js)
interface BannerIdea {
  text: string;
  bgStyle: string;
  tip: string;
}

interface BioResult {
  headlines?: string[];
  aboutSummaries?: string[];
  bannerIdeas?: BannerIdea[];
  hashtags?: string[];
}

// Page state saved in a 'linkedin-bio' work
interface SavedBio {
  jobTitle?: string;
  skills?: string;
  tone?: string;
  result?: BioResult | null;
}

interface LinkedInBioProps {
  customApiKey: string;
  resumeText: string;
  setCurrentPage?: (page: string) => void;
  loadedWork?: LoadedWork | null;
  setLoadedWork?: (work: LoadedWork | null) => void;
  onFocusChange?: (mode: false | 'flow') => void;
}

const TOOL = { name: 'Bio & Banner Generator', icon: PenLine };
const PHASES = ['Reading your background', 'Writing headlines and your About', 'Designing banner ideas'];
const TONES = ['Professional', 'Friendly', 'Bold'];
const HEADLINE_MAX = 220;
const ABOUT_MAX = 2600;

// Banner colours; the AI's style note is a suggestion, the user picks the look here
const PALETTES = [
  { name: 'Midnight', from: '#0b1d3a', to: '#1d4f91', text: '#ffffff', accent: '#5fd3a8' },
  { name: 'Forest', from: '#0f3b2e', to: '#1f7a5a', text: '#ffffff', accent: '#f5d06f' },
  { name: 'Violet', from: '#2a1a5e', to: '#6f4fd6', text: '#ffffff', accent: '#ffb4d1' },
  { name: 'Paper', from: '#f4f1ea', to: '#e6dfd1', text: '#1c2330', accent: '#c2410c' },
  { name: 'Graphite', from: '#16181d', to: '#3a3f4b', text: '#ffffff', accent: '#2bbf8e' },
];
// LinkedIn's banner size
const BANNER_W = 1584;
const BANNER_H = 396;

const COPY: IntroCopy = {
  title: <>A profile that says <em>what you do, fast</em></>,
  checks: [
    'Three headlines and two About sections written from your resume, in the tone you pick.',
    'Banner designs you can download as a 1584 × 396 image, the size LinkedIn uses.',
    'See it all together in a profile preview before you paste anything.',
  ],
  formTitle: 'Write my LinkedIn bio',
  steps: [
    { icon: Type, title: 'Tell us the role', text: 'The job you want, a few skills, and the tone that fits you.' },
    { icon: UserRound, title: 'Add your resume', text: 'Optional, but it means the bio is about your real experience.' },
    { icon: Eye, title: 'Preview, pick, paste', text: 'Choose a headline, an About and a banner, then copy or download them.' },
  ],
  gets: [
    { icon: Type, title: 'Headlines under 220 characters', text: 'LinkedIn cuts headlines at 220 characters. Each one is counted, so you know it fits.' },
    { icon: PenLine, title: 'Two About sections', text: 'One easy to scan, one told as a story. Edit either before you copy it.' },
    { icon: ImageIcon, title: 'Banner images to download', text: 'Your banner text on a clean design in five colour styles, saved as a PNG at 1584 × 396.' },
    { icon: Hash, title: 'Hashtags for your field', text: 'Tags to follow and use in posts so the right people see your activity.' },
  ],
  faqs: [
    { q: 'Do I need a resume?', a: 'No. With just the role and a few skills you get a solid bio. Adding your resume (file, link or the one you already added) lets the AI use your real experience instead of general wording.' },
    { q: 'Will it make things up?', a: 'The AI is told to use only what you give it and not to invent employers, numbers or awards. Read everything once before you paste it, and edit the About sections right on the page.' },
    { q: 'How do I use the banner?', a: 'Download the PNG, then on LinkedIn open your profile, click the camera icon on the background photo and upload it. The text sits on the right so your profile photo doesn\'t cover it.' },
    { q: 'Is it saved?', a: 'When you are signed in, the result is saved to My Documents so you can reopen it. Your resume text is sent to our AI provider to write the bio. We don\'t sell your data.' },
  ],
  finalTitle: 'First impressions happen on your profile',
  finalText: 'Add the role you want and get a headline, About and banner in under a minute.',
};

/** Splits banner text into at most two lines that fit the width. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length > 2 ? [lines[0], lines.slice(1).join(' ')] : lines;
}

/** Draws the banner at LinkedIn's size and downloads it as a PNG. */
function downloadBanner(text: string, paletteIndex: number) {
  const p = PALETTES[paletteIndex];
  const canvas = document.createElement('canvas');
  canvas.width = BANNER_W;
  canvas.height = BANNER_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const g = ctx.createLinearGradient(0, 0, BANNER_W, BANNER_H);
  g.addColorStop(0, p.from);
  g.addColorStop(1, p.to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BANNER_W, BANNER_H);

  // Soft circles for depth, kept to the left where the profile photo sits
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = p.accent;
  ctx.beginPath(); ctx.arc(180, 420, 260, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(520, -60, 180, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Text on the right two-thirds, clear of the photo
  const left = 600;
  const maxWidth = BANNER_W - left - 90;
  ctx.fillStyle = p.accent;
  ctx.fillRect(left, 118, 64, 6);
  ctx.fillStyle = p.text;
  ctx.textBaseline = 'top';
  let size = 58;
  ctx.font = `800 ${size}px Inter, "Segoe UI", Arial, sans-serif`;
  let lines = wrapLines(ctx, text, maxWidth);
  while (size > 34 && lines.some(l => ctx.measureText(l).width > maxWidth)) {
    size -= 4;
    ctx.font = `800 ${size}px Inter, "Segoe UI", Arial, sans-serif`;
    lines = wrapLines(ctx, text, maxWidth);
  }
  lines.forEach((l, i) => ctx.fillText(l, left, 146 + i * (size * 1.18)));

  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: 'LinkedIn banner.png' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, 'image/png');
}

function Banner({ text, palette, className = '' }: { text: string; palette: number; className?: string }) {
  const p = PALETTES[palette];
  return (
    <div className={`lib-banner ${className}`} style={{ '--from': p.from, '--to': p.to, '--fg': p.text, '--accent': p.accent } as React.CSSProperties}>
      <div className="lib-banner-copy">
        <i />
        <strong>{text}</strong>
      </div>
    </div>
  );
}

export default function LinkedInBio({ customApiKey, resumeText, setCurrentPage, loadedWork, setLoadedWork, onFocusChange }: LinkedInBioProps) {
  const runner = useCareerRun<BioResult>(onFocusChange);
  const { stage, result, show, run } = runner;
  const cvState = useCvInput(resumeText);
  const [jobTitle, setJobTitle] = useState('');
  const [skills, setSkills] = useState('');
  const [tone, setTone] = useState('Professional');
  const [sourceName, setSourceName] = useState('');

  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (!loadedWork.deleted && loadedWork.type === 'linkedin-bio') {
      const saved = parseSavedContent<SavedBio>(loadedWork.htmlContent);
      if (saved?.result) {
        setJobTitle(saved.jobTitle || '');
        setSkills(saved.skills || '');
        setTone(saved.tone || 'Professional');
        setSourceName('');
        show(saved.result);
      }
    }
  }
  useEffect(() => {
    if (loadedWork) setLoadedWork?.(null);
  }, [loadedWork, setLoadedWork]);

  const generate = () => {
    const role = jobTitle.trim();
    if (!role || !cvState.ready) return;
    run(async () => {
      const data = await postCareer<BioResult>('/api/linkedin/bio', { jobTitle: role, skills: skills.trim(), tone }, cvState, customApiKey);
      if (!data.headlines?.length && !data.aboutSummaries?.length) throw new Error('The AI did not write a bio this time. Please try again.');
      setSourceName(cvLabel(cvState));
      return data;
    });
  };

  if (stage === 'working') {
    return <CareerWorking tool={TOOL} title="Writing your LinkedIn bio…" phases={PHASES} phase={runner.phase} error={runner.error} onRetry={runner.retry} onEdit={runner.toIntro} />;
  }

  if (stage === 'result' && result) {
    return (
      <BioResultView
        key={resultKey('linkedin-bio', result)}
        result={result}
        jobTitle={jobTitle}
        meta={[jobTitle, tone, sourceName].filter(Boolean).join(' · ')}
        onAgain={runner.toIntro}
        setCurrentPage={setCurrentPage}
      />
    );
  }

  return (
    <CareerIntro
      tool={TOOL}
      copy={COPY}
      setCurrentPage={setCurrentPage}
      resumeResult={result ? { label: 'Back to your bio', onClick: runner.toResult } : null}
      submit={{ label: 'Write my bio', disabled: !jobTitle.trim() || !cvState.ready, onClick: generate, hint: jobTitle.trim() ? undefined : 'Add the role you want to start.' }}
    >
      <Field label="Role you want">
        <input className="tlr-input" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Senior Software Engineer" maxLength={120} />
      </Field>
      <Field label="Skills to highlight" optional>
        <input className="tlr-input" value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. React, system design, mentoring" maxLength={600} />
      </Field>
      <Chips label="Tone" options={TONES} value={tone} onChange={setTone} />
      <CvPicker state={cvState} why="Your resume lets the bio mention your real experience." />
    </CareerIntro>
  );
}

interface BioResultViewProps {
  result: BioResult;
  jobTitle: string;
  meta: string;
  onAgain: () => void;
  setCurrentPage?: (page: string) => void;
}

function BioResultView({ result, jobTitle, meta, onAgain, setCurrentPage }: BioResultViewProps) {
  const headlines = result.headlines ?? [];
  const banners = result.bannerIdeas ?? [];
  const hashtags = (result.hashtags ?? []).map(h => (h.startsWith('#') ? h : `#${h.replace(/\s+/g, '')}`));
  const [headline, setHeadline] = useState(0);
  const [aboutIndex, setAboutIndex] = useState(0);
  // The About sections can be edited before copying
  const [abouts, setAbouts] = useState<string[]>(() => result.aboutSummaries ?? []);
  const [banner, setBanner] = useState(0);
  const [palette, setPalette] = useState(0);
  const user = readUser();
  const name = user?.name?.trim() || 'Your name';
  const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const about = abouts[aboutIndex] ?? '';
  const bannerText = banners[banner]?.text || jobTitle;

  const allText = () => [
    `LinkedIn bio${jobTitle ? ` for ${jobTitle}` : ''}`,
    '',
    'HEADLINES',
    ...headlines.map((h, i) => `${i + 1}. ${h}`),
    '',
    ...abouts.flatMap((a, i) => [`ABOUT (VERSION ${i + 1})`, a, '']),
    'BANNER IDEAS',
    ...banners.map((b, i) => `${i + 1}. ${b.text}\n   Style: ${b.bgStyle}\n   Tip: ${b.tip}`),
    '',
    `HASHTAGS: ${hashtags.join(' ')}`,
  ].join('\n');

  return (
    <CareerApp
      tool={TOOL}
      againLabel="Change my details"
      onAgain={onAgain}
      onExit={onAgain}
      heading="Your LinkedIn bio is ready"
      summary="Pick a headline, an About and a banner. The preview shows how they look together."
      meta={meta}
      actions={
        <>
          {headlines[headline] && <CopyButton text={headlines[headline]} label="Copy headline" />}
          {about && <CopyButton text={about} label="Copy About" />}
          <button type="button" className="tlr-btn tlr-btn--outline" onClick={() => downloadText(`LinkedIn bio${jobTitle ? ` - ${jobTitle}` : ''}`, allText())}><Download size={17} /> Download .txt</button>
        </>
      }
      footnote={user ? 'Saved to My Documents.' : 'Sign in to save it to My Documents.'}
    >
      <div className="crt-layout">
        <div className="crt-main">
          <Panel title="Profile preview" icon={Eye}>
            <div className="lib-preview">
              <Banner text={bannerText} palette={palette} />
              <div className="lib-preview-body">
                <span className="lib-avatar" aria-hidden="true">{initials}</span>
                <strong>{name}</strong>
                <p>{headlines[headline] || jobTitle}</p>
                {about && <div className="lib-preview-about"><b>About</b><p>{about.length > 265 ? `${about.slice(0, 265).trim()}… see more` : about}</p></div>}
              </div>
            </div>
            <p className="tlr-fine">A preview only. LinkedIn's own layout differs a little on phones.</p>
          </Panel>

          <Panel title="Headlines" icon={Type}>
            {headlines.map((h, i) => (
              <div key={i} className={`crt-option${headline === i ? ' is-on' : ''}`}>
                <div className="crt-option-top">
                  <button type="button" className={`crt-pick${headline === i ? ' is-on' : ''}`} aria-pressed={headline === i} onClick={() => setHeadline(i)}>
                    {headline === i ? <><CheckCircle2 size={13} /> In preview</> : 'Use in preview'}
                  </button>
                  <span className="crt-spacer" />
                  <CharCount text={h} limit={HEADLINE_MAX} />
                  <CopyButton text={h} small />
                </div>
                <p>{h}</p>
              </div>
            ))}
          </Panel>

          {abouts.length > 0 && (
            <Panel title="About section" icon={PenLine} action={<div className="crt-actions-row"><CharCount text={about} limit={ABOUT_MAX} /><CopyButton text={about} small /></div>}>
              {abouts.length > 1 && (
                <div className="crt-tabs" role="tablist" aria-label="About versions">
                  {abouts.map((_, i) => (
                    <button key={i} type="button" role="tab" aria-selected={aboutIndex === i} className={aboutIndex === i ? 'is-on' : ''} onClick={() => setAboutIndex(i)}>
                      {i === 0 ? 'Version 1' : `Version ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                className="crt-edit lib-about"
                value={about}
                onChange={e => setAbouts(prev => prev.map((a, i) => (i === aboutIndex ? e.target.value : a)))}
                aria-label="About section, editable"
              />
              <p className="tlr-fine">Edit it here. Copy and the preview use your changes.</p>
            </Panel>
          )}

          {banners.length > 0 && (
            <Panel title="Banner" icon={ImageIcon} action={<button type="button" className="crt-copy" onClick={() => downloadBanner(bannerText, palette)}><Download size={14} /> Download PNG</button>}>
              {banners.length > 1 && (
                <div className="crt-tabs" role="tablist" aria-label="Banner ideas">
                  {banners.map((_, i) => (
                    <button key={i} type="button" role="tab" aria-selected={banner === i} className={banner === i ? 'is-on' : ''} onClick={() => setBanner(i)}>Idea {i + 1}</button>
                  ))}
                </div>
              )}
              <Banner text={bannerText} palette={palette} className="lib-banner--big" />
              <div className="lib-palettes" role="group" aria-label="Banner colours">
                <Palette size={16} />
                {PALETTES.map((p, i) => (
                  <button key={p.name} type="button" className={palette === i ? 'is-on' : ''} aria-pressed={palette === i} aria-label={p.name} onClick={() => setPalette(i)} title={p.name} style={{ '--from': p.from, '--to': p.to } as React.CSSProperties} />
                ))}
              </div>
              {banners[banner] && (
                <ul className="crt-bullets">
                  <li><LayoutTemplate size={15} /><span><b>Style idea:</b> {banners[banner].bgStyle}</span></li>
                  <li><Sparkles size={15} /><span><b>Tip:</b> {banners[banner].tip}</span></li>
                </ul>
              )}
              <p className="tlr-fine">Downloads at 1584 × 396, LinkedIn's banner size. The text sits right of your profile photo.</p>
            </Panel>
          )}
        </div>

        <aside className="crt-side">
          {hashtags.length > 0 && (
            <section className="tlr-card">
              <div className="crt-panel-head lib-tags-head">
                <h3>Hashtags</h3>
                <CopyButton text={hashtags.join(' ')} label="Copy all" small />
              </div>
              <div className="tlr-chips">{hashtags.map(h => <span key={h} className="tlr-chip tlr-chip--ok">{h}</span>)}</div>
              <p className="tlr-fine lib-tags-note">Follow them, and add two or three to your posts.</p>
            </section>
          )}
          <section className="tlr-card">
            <h3>Where each part goes</h3>
            <ul className="crt-bullets">
              <li><CheckCircle2 size={15} />Headline: the pencil icon on your profile intro.</li>
              <li><CheckCircle2 size={15} />About: Add profile section, then About.</li>
              <li><CheckCircle2 size={15} />Banner: the camera icon on your background photo.</li>
            </ul>
          </section>
          <CareerNext current="linkedin-bio" setCurrentPage={setCurrentPage} pick={['linkedin', 'linkedin-outreach', 'elevator-pitch']} />
        </aside>
      </div>
    </CareerApp>
  );
}
