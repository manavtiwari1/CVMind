import { useMemo, useState } from 'react';
import { Check, Crown, Download, FileText, Loader2, PenLine, RotateCcw, TriangleAlert } from 'lucide-react';
import TemplatePreview from '../components/TemplatePreview';
import ResumeDownload from '../components/ResumeDownload';
import { isProTemplate, requestUpgrade, userIsPro } from '../lib/billing';
import { completeLetter, designById, LETTER_DESIGNS, renderLetter, type LetterData } from '../lib/coverLetter';
import { fitLetter, fitLetterWord, saveWordDoc } from '../lib/letterFit';
import { htmlToText } from '../lib/resumeHandoff';
import { CopyButton, type CardActions } from './cards';
import { saveDocument, type CoverLetterCard } from './chatApi';

// A cover letter in the chat: read it, edit it, choose a design, then download it as PDF or Word.
// All of this happens in the browser, so editing or trying designs uses no AI and no free uses.

export interface LetterText { name: string; greeting: string; paragraphs: string[]; closing: string }

const FIRST_SHOWN = 6;
const TOO_LONG = "This letter won't fit on one page. Tap Edit text and shorten it a little, then choose a design again.";

export default function CoverLetterResult({ card, actions }: { card: CoverLetterCard; actions: CardActions }) {
  const [text, setText] = useState<LetterText>({ name: card.name, greeting: card.greeting, paragraphs: card.paragraphs, closing: card.closing });
  const [draft, setDraft] = useState<LetterText>(text);
  const [mode, setMode] = useState<'read' | 'edit' | 'pick' | 'done'>(card.html ? 'done' : 'read');
  const [designId, setDesignId] = useState(card.designId || '');
  const [html, setHtml] = useState(card.html || '');
  const [workId, setWorkId] = useState(card.workId || '');
  const [working, setWorking] = useState('');
  const [problem, setProblem] = useState('');
  const [allDesigns, setAllDesigns] = useState(false);
  const [download, setDownload] = useState(false);

  const letterOf = (t: LetterText): LetterData => completeLetter({
    name: t.name, title: card.title, email: card.email, phone: card.phone, location: card.location, linkedin: card.linkedin,
    company: card.company, jobTitle: card.jobTitle, recipient: card.recipient, greeting: t.greeting, paragraphs: t.paragraphs, closing: t.closing,
  });
  const letter = letterOf(text);
  const letterKey = JSON.stringify(text);
  // The picker shows the user's own letter in each design
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const previews = useMemo(() => Object.fromEntries(LETTER_DESIGNS.map((d) => [d.id, renderLetter(d.id, letter)])), [letterKey]);

  const plain = [text.greeting, ...text.paragraphs, `${text.closing}\n${text.name}`].filter(Boolean).join('\n\n');
  const fileName = `${text.name || 'Cover Letter'} Cover Letter`.trim();
  const designs = allDesigns ? LETTER_DESIGNS : LETTER_DESIGNS.slice(0, FIRST_SHOWN);

  // Both downloads must fit before either is offered
  const arrange = async (id: string, content: LetterText) => {
    setWorking(id);
    setProblem('');
    try {
      const data = letterOf(content);
      const fitted = await fitLetter(id, data);
      if (!fitted.fits || !fitLetterWord(id, data)) {
        setProblem(TOO_LONG);
        return false;
      }
      setDesignId(id);
      setHtml(fitted.html);
      setMode('done');
      // Saved to My Documents, so it opens in the editor like any other letter
      const saved = await saveDocument({ title: fileName, type: 'cover-letter', templateId: id, htmlContent: fitted.html, workId: workId || undefined });
      setWorkId(saved || workId);
      actions.letterSaved(card, content, fitted.html, id, saved || workId);
      return true;
    } catch {
      setProblem('Could not arrange your letter. Please try again.');
      return false;
    } finally {
      setWorking('');
    }
  };

  const pick = (id: string) => {
    if (isProTemplate(id) && !userIsPro()) {
      requestUpgrade('template');
      return;
    }
    void arrange(id, text);
  };

  const saveEdit = async () => {
    const paragraphs = draft.paragraphs.map((p) => p.trim()).filter(Boolean);
    if (!paragraphs.length) {
      setProblem('Your letter needs at least one paragraph.');
      return;
    }
    const next = { ...draft, name: draft.name.trim(), greeting: draft.greeting.trim(), closing: draft.closing.trim(), paragraphs };
    setText(next);
    setProblem('');
    if (designId) {
      // Already designed: arrange the new words in the same design
      if (await arrange(designId, next)) return;
      setHtml('');
      setDesignId('');
      setMode('read');
      actions.letterSaved(card, next, '', '', workId);
      return;
    }
    setMode('read');
    actions.letterSaved(card, next, '', '', workId);
  };

  const startEdit = () => {
    setDraft(text);
    setProblem('');
    setMode('edit');
  };

  const downloadWord = () => {
    const doc = fitLetterWord(designId, letter);
    if (!doc) {
      setProblem(TOO_LONG);
      return;
    }
    saveWordDoc(doc, fileName.replace(/\s+/g, '_'));
  };

  const heading = <div className="lc-kicker">Cover letter{card.jobTitle ? ` · ${card.jobTitle}` : ''}{card.company ? ` at ${card.company}` : ''}</div>;
  const notice = problem && <p className="lc-text lm-bad" role="alert"><TriangleAlert size={14} /> {problem}</p>;

  if (mode === 'edit') {
    const setParagraph = (at: number, value: string) => setDraft({ ...draft, paragraphs: draft.paragraphs.map((p, i) => (i === at ? value : p)) });
    return (
      <>
        {heading}
        <div className="lc-letter-edit">
          <label>Greeting<input value={draft.greeting} maxLength={120} onChange={(e) => setDraft({ ...draft, greeting: e.target.value })} /></label>
          {draft.paragraphs.map((p, i) => (
            <label key={i}>Paragraph {i + 1}<textarea value={p} maxLength={1500} rows={Math.max(3, Math.ceil(p.length / 62))} onChange={(e) => setParagraph(i, e.target.value)} /></label>
          ))}
          <label>Sign-off<input value={draft.closing} maxLength={60} onChange={(e) => setDraft({ ...draft, closing: e.target.value })} /></label>
          <label>Your name<input value={draft.name} maxLength={120} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
        </div>
        {notice}
        <div className="lc-actions">
          <button type="button" className="lc-btn lc-btn-primary" disabled={!!working} onClick={() => void saveEdit()}>{working ? <Loader2 size={15} className="lx-spin" /> : <Check size={15} />} Save changes</button>
          <button type="button" className="lc-btn" onClick={() => { setProblem(''); setMode(html ? 'done' : 'read'); }}>Cancel</button>
        </div>
      </>
    );
  }

  if (mode === 'pick') {
    return (
      <>
        <div className="lc-kicker">Choose a design · Leo keeps it on one page</div>
        {notice}
        <div className="lc-templates">
          {designs.map((d) => (
            <button key={d.id} type="button" className={`lc-template ${designId === d.id ? 'is-picked' : ''}`} disabled={!!working} onClick={() => pick(d.id)} aria-label={`Use ${d.name} design${isProTemplate(d.id) ? ' (Pro)' : ''}`}>
              <span className="lc-template-thumb">
                <TemplatePreview html={previews[d.id]} name={d.name} aspect="1 / 1.15" />
                {isProTemplate(d.id) && <span className="lc-template-pro"><Crown size={11} /> Pro</span>}
                {working === d.id && <span className="lc-template-tick"><Loader2 size={14} className="lx-spin" /></span>}
              </span>
              <span className="lc-template-name">{d.name}</span>
            </button>
          ))}
        </div>
        {!allDesigns && LETTER_DESIGNS.length > FIRST_SHOWN && <button type="button" className="lc-more" onClick={() => setAllDesigns(true)}>Show all {LETTER_DESIGNS.length} designs</button>}
        <div className="lc-actions">
          <button type="button" className="lc-btn" disabled={!!working} onClick={startEdit}><PenLine size={15} /> Edit text</button>
          <button type="button" className="lc-btn" disabled={!!working} onClick={() => { setProblem(''); setMode(html ? 'done' : 'read'); }}>Back</button>
        </div>
      </>
    );
  }

  if (mode === 'done') {
    return (
      <div className="lc-doc">
        <div className="lc-doc-preview"><TemplatePreview html={html} name="Your cover letter" eager /></div>
        <div className="lc-doc-side">
          <div className="lc-kicker">Your cover letter · {designById(designId).name}</div>
          <p className="lc-text lc-saved"><Check size={14} /> Arranged on one page{workId ? ' · Saved to My Documents' : ''}</p>
          {notice}
          <div className="lc-doc-actions">
            <button type="button" className="lc-btn lc-btn-primary" onClick={() => setDownload(true)}><Download size={15} /> Download PDF</button>
            <button type="button" className="lc-btn" onClick={downloadWord}><FileText size={15} /> Download Word</button>
            {workId && <button type="button" className="lc-btn" onClick={() => actions.openWork({ _id: workId, title: fileName, type: 'cover-letter', templateId: designId, htmlContent: html, source: 'leo-chat' })}><PenLine size={15} /> Open in Editor</button>}
            <button type="button" className="lc-btn" onClick={() => { setProblem(''); setMode('pick'); }}><RotateCcw size={15} /> Change design</button>
            <button type="button" className="lc-btn" onClick={startEdit}><PenLine size={15} /> Edit text</button>
          </div>
        </div>
        {download && (
          <ResumeDownload
            defaultName={fileName}
            paper="a4"
            docLabel="Cover Letter"
            getHtml={() => html}
            getText={() => htmlToText(html)}
            customApiKey=""
            onWord={downloadWord}
            onClose={() => setDownload(false)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      {heading}
      <div className="lc-letter">
        <p>{text.greeting}</p>
        {text.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        <p>{text.closing}<br />{text.name}</p>
      </div>
      <p className="lc-text">You can edit this letter. If it looks right, choose a design and Leo will arrange it on one page.</p>
      {notice}
      <div className="lc-actions">
        <button type="button" className="lc-btn lc-btn-primary" onClick={() => { setProblem(''); setMode('pick'); }}><Check size={15} /> Looks right, choose a design</button>
        <button type="button" className="lc-btn" onClick={startEdit}><PenLine size={15} /> Edit</button>
        <CopyButton text={plain} />
      </div>
    </>
  );
}
