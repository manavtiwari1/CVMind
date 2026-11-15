import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { UserRound, X } from 'lucide-react';
import type { Person } from './api';
import { useFileUrl, Wordmark } from './ui';

// Official CVMind ID card, drawn like a printed badge. Interns are numbered CVM/INTERNS/0001,
// everyone else CVM/EMP/0001. The photo is the member's profile photo; only the member can change
// it (from Profile), with the buttons passed in as photoAction (shown under the card).
export function IdCard({ person, photoAction }: { person: Person; photoAction?: ReactNode }) {
  const src = useFileUrl(person.avatarFileId);
  const intern = person.idNumber.startsWith('CVM/INTERNS/');
  return (
    <div className="tm-idcard-wrap">
      <article className={`tm-idcard ${intern ? 'intern' : ''}`} aria-label={`ID card of ${person.name}`}>
        <header className="tm-idcard-head">
          <span className="tm-idcard-slot" aria-hidden />
          <Wordmark />
          <span className="tm-idcard-kind">{intern ? 'Intern' : 'Employee'}</span>
        </header>

        <div className="tm-idcard-main">
          <div className="tm-idcard-photo">
            {src ? <img src={src} alt={`Photo of ${person.name}`} /> : <UserRound size={40} aria-hidden />}
          </div>
          <div className="tm-idcard-who">
            <h3>{person.name}</h3>
            <p>{person.roleLabel}</p>
            <span className="tm-idcard-no">{person.idNumber || 'Number pending'}</span>
          </div>
        </div>

        <dl className="tm-idcard-rows">
          <div><dt>Department</dt><dd>{person.department || 'NA'}</dd></div>
          <div><dt>Phone</dt><dd>{person.phone || 'NA'}</dd></div>
          <div className="wide"><dt>E-mail</dt><dd>{person.email || 'NA'}</dd></div>
          {/* No one has an official @cvmind.in mailbox yet */}
          <div className="wide"><dt>Official mail</dt><dd>NA</dd></div>
        </dl>

        <footer className="tm-idcard-foot">
          {person.idNumber && <Barcode value={person.idNumber} />}
          <p>Property of CVMind. If found, please return to CVMind · cvmind.in</p>
        </footer>
      </article>
      {photoAction && <div className="tm-idcard-actions">{photoAction}</div>}
    </div>
  );
}

// Opens a card on its own: the page dims and the card sits in the middle, with no dialog box around
// it. Esc, the close button or a click outside closes it. `children` shows under the card.
export function IdCardViewer({ person, onClose, children }: { person: Person; onClose: () => void; children?: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose]);
  return createPortal(
    <div className="tm-app tm-cardview" role="dialog" aria-modal="true" aria-label={`ID card of ${person.name}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <button ref={closeRef} type="button" className="tm-cardview-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
      <div className="tm-cardview-body" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <IdCard person={person} />
        {children && <div className="tm-cardview-extra">{children}</div>}
      </div>
    </div>,
    document.body
  );
}

// Code 39: each character is 9 elements (bar, space, bar, …), 1 = wide. Covers A–Z, 0–9 and - . space $ / + %
const CODE39: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000', '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101', '8': '100100100', '9': '001100100',
  A: '100001001', B: '001001001', C: '101001000', D: '000011001', E: '100011000', F: '001011000', G: '000001101', H: '100001100', I: '001001100', J: '000011100',
  K: '100000011', L: '001000011', M: '101000010', N: '000010011', O: '100010010', P: '001010010', Q: '000000111', R: '100000110', S: '001000110', T: '000010110',
  U: '110000001', V: '011000001', W: '111000000', X: '010010001', Y: '110010000', Z: '011010000', '-': '010000101', '.': '110000100', ' ': '011000100',
  $: '010101000', '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
};

// A real, scannable Code 39 barcode of the ID number
function Barcode({ value }: { value: string }) {
  const text = `*${value.toUpperCase().split('').filter((c) => c !== '*' && CODE39[c]).join('')}*`;
  const NARROW = 1;
  const WIDE = 2.5;
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const ch of text) {
    CODE39[ch].split('').forEach((bit, i) => {
      const w = bit === '1' ? WIDE : NARROW;
      if (i % 2 === 0) bars.push({ x, w });
      x += w;
    });
    x += NARROW; // gap between characters
  }
  return (
    <svg className="tm-idcard-barcode" viewBox={`0 0 ${x} 30`} preserveAspectRatio="none" role="img" aria-label={`Barcode ${value}`}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={30} fill="#0f1424" />)}
    </svg>
  );
}
