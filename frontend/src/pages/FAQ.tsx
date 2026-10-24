import { useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { FAQ_GROUPS as GROUPS, type Group } from '../data/faqs';
import { useSiteContent } from '../lib/siteContent';
import './resources/Resources.css';
import './FAQ.css';

interface FAQProps {
  setCurrentPage: (page: string) => void;
}

export default function FAQ({ setCurrentPage }: FAQProps) {
  const [query, setQuery] = useState('');
  // Questions added from the admin panel (Site content → FAQ entries) come first
  const extra = useSiteContent('faq');
  const allGroups = useMemo<Group[]>(
    () => (extra.length ? [{ id: 'latest', title: 'Latest', items: extra.map(b => ({ q: b.title, a: b.body })) }, ...GROUPS] : GROUPS),
    [extra]
  );
  const [active, setActive] = useState(GROUPS[0].id);

  const q = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      q
        ? allGroups.map(g => ({ ...g, items: g.items.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)) })).filter(g => g.items.length)
        : allGroups,
    [q, allGroups]
  );

  const jump = (id: string) => {
    setActive(id);
    document.getElementById(`faq-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="rsc faq">
      <h1 className="rsc-title">Frequently Asked Questions</h1>
      <p className="rsc-lede">Quick answers about CV Mind, your account and your plan.</p>

      <label className="faq-search">
        <Search size={18} />
        <input
          type="search"
          placeholder="Search questions"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search questions"
        />
      </label>

      <div className="faq-grid">
        <nav className="rsc-legal-nav" aria-label="FAQ topics">
          {allGroups.map(g => (
            <button key={g.id} type="button" aria-current={active === g.id && !q ? 'page' : undefined} onClick={() => { setQuery(''); jump(g.id); }}>
              {g.title}
            </button>
          ))}
        </nav>

        <div className="faq-groups">
          {groups.length === 0 && (
            <p className="faq-empty">No questions match "{query.trim()}". Try other words, or ask us in the Help Desk.</p>
          )}
          {groups.map(g => (
            <section key={g.id} id={`faq-${g.id}`} className="faq-group">
              <h2>{g.title}</h2>
              {g.items.map(item => (
                <details key={item.q} className="faq-item" open={Boolean(q) || undefined}>
                  <summary>
                    <span>{item.q}</span>
                    <Plus size={18} className="faq-item-icon" aria-hidden="true" />
                  </summary>
                  <div className="faq-item-body">
                    <p>{item.a}</p>
                    {item.link && (
                      <button type="button" className="rsc-link" onClick={() => setCurrentPage(item.link!.page)}>{item.link.label}</button>
                    )}
                  </div>
                </details>
              ))}
            </section>
          ))}
        </div>
      </div>

      <section className="rsc-cta">
        <div>
          <h2>Still have a question?</h2>
          <p>Search the Help Desk for step-by-step answers, or send us a message and we will reply by email.</p>
        </div>
        <div className="rsc-cta-actions">
          <button type="button" className="rsc-btn" onClick={() => setCurrentPage('help-center')}>Go to the Help Desk</button>
        </div>
      </section>
    </div>
  );
}
