import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Briefcase, CheckCircle, MapPin, Paperclip, Wallet } from 'lucide-react';
import { API_BASE } from '../lib/apiBase';

// cvmind.in/careers: open roles at CVMind; cvmind.in/careers/<slug>: one role and its application form.
// Openings are managed in the admin panel (ERP → Hiring).
interface Opening { id: string; slug: string; title: string; typeLabel: string; department: string; location: string; pay: string; duration: string; description: string; questions: string[] }

const RESUME_TYPES: Record<string, string> = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Something went wrong. Try again.');
  return body as T;
}

export default function Careers() {
  const slug = window.location.pathname.split('/').filter(Boolean)[1] || '';
  return (
    // Inline spacing: theme.css resets every element's margin and padding, which overrides Tailwind's spacing classes
    <main style={{ background: 'var(--bg-primary)', minHeight: '70vh', padding: '96px 16px 64px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>{slug ? <Role slug={slug} /> : <List />}</div>
    </main>
  );
}

function List() {
  const [rows, setRows] = useState<Opening[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`${API_BASE}/api/careers`).then((r) => json<{ data: Opening[] }>(r)).then((r) => setRows(r.data)).catch((e: Error) => setError(e.message));
  }, []);
  return (
    <>
      <h1 className="font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontSize: 34, lineHeight: 1.15, marginBottom: 10 }}>Work at CVMind</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 28 }}>We build AI tools that help students and job seekers get hired. Internships and roles open right now:</p>
      {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
      {!rows && !error && <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>}
      {rows && rows.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No openings right now. Check back soon.</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {rows?.map((o) => (
          <a key={o.id} href={`/careers/${o.slug}`} className="rounded-2xl" style={{ display: 'block', padding: 20, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', textDecoration: 'none' }}>
            <div className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 18, marginBottom: 6 }}>{o.title}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span><Briefcase size={13} style={{ verticalAlign: '-2px' }} /> {[o.typeLabel, o.duration].filter(Boolean).join(' · ')}</span>
              <span><MapPin size={13} style={{ verticalAlign: '-2px' }} /> {o.location}</span>
              {o.pay && <span><Wallet size={13} style={{ verticalAlign: '-2px' }} /> {o.pay}</span>}
            </div>
          </a>
        ))}
      </div>
    </>
  );
}

function Role({ slug }: { slug: string }) {
  const [o, setO] = useState<Opening | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', college: '', link: '' });
  const [answers, setAnswers] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/careers/${encodeURIComponent(slug)}`).then((r) => json<{ data: Opening }>(r)).then((r) => { setO(r.data); document.title = `${r.data.title} - Careers | CV Mind`; }).catch((e: Error) => setError(e.message));
  }, [slug]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!file) { setError('Attach your resume (PDF or DOCX).'); return; }
    const mime = RESUME_TYPES[file.name.split('.').pop()?.toLowerCase() || ''];
    if (!mime) { setError('Your resume must be a PDF or DOCX file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Your resume must be under 5 MB.'); return; }
    setBusy(true);
    try {
      const up = await json<{ fileId: string; uploadUrl: string; headers: Record<string, string> }>(await fetch(`${API_BASE}/api/careers/resume-upload`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, mime, size: file.size }) }));
      const put = await fetch(up.uploadUrl, { method: 'PUT', headers: up.headers, body: file });
      if (!put.ok) throw new Error('Your resume did not upload. Try again.');
      await json(await fetch(`${API_BASE}/api/careers/${encodeURIComponent(slug)}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, links: form.link ? [form.link] : [], answers, resumeFileId: up.fileId })
      }));
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field = { width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 15 } as const;
  const label = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 } as const;

  return (
    <>
      <a href="/careers" style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18 }}><ArrowLeft size={14} /> All openings</a>
      {!o ? <p style={{ color: error ? 'var(--red)' : 'var(--text-secondary)' }}>{error || 'Loading…'}</p> : (
        <>
          <h1 className="font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontSize: 30, lineHeight: 1.2, marginBottom: 8 }}>{o.title}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 22 }}>{[o.typeLabel, o.duration, o.department, o.location, o.pay].filter(Boolean).join(' · ')}</p>
          <div style={{ color: 'var(--text-primary)', fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 32 }}>{o.description}</div>
          {done ? (
            <div className="rounded-2xl" role="status" style={{ padding: 24, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
              <CheckCircle size={40} style={{ color: 'var(--green)', margin: '0 auto 10px' }} />
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 20, marginBottom: 6 }}>Application sent</h2>
              <p style={{ color: 'var(--text-secondary)' }}>We emailed you a confirmation. We read every application and will get back to you about the next step.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="rounded-2xl" style={{ padding: 24, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'grid', gap: 14 }}>
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 20 }}>Apply</h2>
              <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div><label style={label} htmlFor="ap-name">Full name</label><input id="ap-name" style={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} required autoComplete="name" /></div>
                <div><label style={label} htmlFor="ap-email">Email</label><input id="ap-email" type="email" style={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={120} required autoComplete="email" /></div>
                <div><label style={label} htmlFor="ap-phone">Phone</label><input id="ap-phone" type="tel" style={field} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} required autoComplete="tel" /></div>
                <div><label style={label} htmlFor="ap-college">College (if a student)</label><input id="ap-college" style={field} value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} maxLength={120} /></div>
              </div>
              <div><label style={label} htmlFor="ap-link">Portfolio, GitHub or LinkedIn</label><input id="ap-link" type="url" style={field} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} maxLength={200} placeholder="https://" /></div>
              {o.questions.map((q, i) => (
                <div key={q}><label style={label} htmlFor={`ap-q${i}`}>{q}</label><textarea id={`ap-q${i}`} style={{ ...field, minHeight: 90 }} value={answers[i] || ''} onChange={(e) => { const next = [...answers]; next[i] = e.target.value; setAnswers(next); }} maxLength={2000} required /></div>
              ))}
              <div>
                <span style={label}>Resume</span>
                <input ref={input} type="file" accept=".pdf,.docx" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <button type="button" onClick={() => input.current?.click()} style={{ ...field, width: 'auto', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Paperclip size={15} /> {file ? file.name : 'Attach PDF or DOCX (max 5 MB)'}</button>
              </div>
              {error && <p role="alert" style={{ color: 'var(--red)', fontSize: 14 }}>{error}</p>}
              <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>We use your details only to consider you for this role. If you don't join, they're deleted 6 months after the opening closes. See our <a href="/privacy" style={{ textDecoration: 'underline' }}>privacy policy</a>.</p>
              <button type="submit" disabled={busy} className="rounded-xl font-semibold text-white disabled:opacity-60" style={{ background: 'var(--gradient-brand)', padding: '12px 16px', fontSize: 15 }}>{busy ? 'Sending…' : 'Send application'}</button>
            </form>
          )}
        </>
      )}
    </>
  );
}
