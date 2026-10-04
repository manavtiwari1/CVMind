import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Faq } from '../../data/coverLetterFaqs';

/** FAQ accordion at the bottom of the cover letter pages (same pattern as the Resume Builder page). */
export default function CoverLetterFaq({ items }: { items: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="clx-faq" aria-labelledby="clx-faq-title">
      <h2 id="clx-faq-title">Frequently asked questions</h2>
      <div className="clx-faq-list">
        {items.map((f, i) => (
          <div key={f.q} className={`clx-faq-item${open === i ? ' is-open' : ''}`}>
            <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              <span>{f.q}</span><ChevronDown size={18} />
            </button>
            {open === i && <p>{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
