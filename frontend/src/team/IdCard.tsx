import type { ReactNode } from 'react';
import { UserRound } from 'lucide-react';
import cvmindIcon from '../assets/cvmind_icon.png';
import type { Person } from './api';
import { useFileUrl } from './ui';

// Official CVMind ID card. Interns are numbered CVM/INTERNS/0001, everyone else CVM/EMP/0001.
// The photo is the member's profile photo; only the member can change it (from Profile).
export function IdCard({ person, photoAction }: { person: Person; photoAction?: ReactNode }) {
  const src = useFileUrl(person.avatarFileId);
  const intern = person.idNumber.startsWith('CVM/INTERNS/');
  const rows: [string, string][] = [
    ['Phone number', person.phone || 'NA'],
    ['E-mail', person.email || 'NA'],
    ['Department', person.department || 'NA'],
    // No one has an official @cvmind.in mailbox yet
    ['CVMind Official Mail ID', 'NA']
  ];
  return (
    <article className={`tm-idcard ${intern ? 'intern' : ''}`} aria-label={`ID card of ${person.name}`}>
      <header className="tm-idcard-head">
        <img src={cvmindIcon} alt="" width={30} height={30} />
        <span className="tm-idcard-brand">CV<b>Mind</b></span>
        <span className="tm-idcard-kind">{intern ? 'Intern' : 'Employee'}</span>
      </header>
      <div className="tm-idcard-body">
        <div className="tm-idcard-photo">
          {src ? <img src={src} alt={`Photo of ${person.name}`} /> : <UserRound size={44} aria-hidden />}
        </div>
        <div className="tm-idcard-who">
          <h3>{person.name}</h3>
          <p>{person.roleLabel}</p>
          <span className="tm-idcard-no">{person.idNumber || 'Number pending'}</span>
        </div>
      </div>
      <dl className="tm-idcard-rows">
        {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      {photoAction && <footer className="tm-idcard-foot">{photoAction}</footer>}
    </article>
  );
}
