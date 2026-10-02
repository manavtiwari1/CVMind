import { useMemo, useState } from 'react';
import { ArrowRight, Code2, Briefcase, Palette, HeartPulse, GraduationCap, TrendingUp, Scale, BookOpen, type LucideIcon } from 'lucide-react';
import TemplatePreview from '../TemplatePreview';
import { TEMPLATES } from '../../data/resumeTemplates';
import { withSampleData } from '../../data/samplePreview';

interface FieldTemplatesProps {
  onUse: () => void;
}

const FIELDS: { label: string; icon: LucideIcon; templateId: string }[] = [
  { label: 'Tech & Data', icon: Code2, templateId: 'tech-minimal' },
  { label: 'Business & Finance', icon: Briefcase, templateId: 'finance-authority' },
  { label: 'Sales & Growth', icon: TrendingUp, templateId: 'sales-kpi' },
  { label: 'Design & Creative', icon: Palette, templateId: 'creative-bold' },
  { label: 'Healthcare', icon: HeartPulse, templateId: 'healthcare-pro' },
  { label: 'Legal', icon: Scale, templateId: 'legal-counsel' },
  { label: 'Students & Freshers', icon: GraduationCap, templateId: 'fresh-graduate' },
  { label: 'Academic', icon: BookOpen, templateId: 'academic-cv' },
];

export default function FieldTemplates({ onUse }: FieldTemplatesProps) {
  const [active, setActive] = useState(0);
  const field = FIELDS[active];
  const template = useMemo(() => {
    const t = TEMPLATES.find((x) => x.id === field.templateId);
    return t ? { ...t, html: withSampleData(t) } : undefined;
  }, [field.templateId]);

  return (
    <section className="hp-fields">
      <div className="hp-wrap hp-fields-inner">
        <div className="hp-fields-copy">
          <h2 className="hp-h2">A template made for your field</h2>
          <p className="hp-body">
            Layouts differ by industry. Pick your field to preview a template that suits it, then open it in the editor
            and make it yours.
          </p>
          <button type="button" className="hp-link" onClick={onUse}>Browse all templates <ArrowRight size={14} /></button>
        </div>

        <div className="hp-fields-list" role="tablist" aria-label="Fields">
          {FIELDS.map(({ label, icon: Icon }, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`hp-field${i === active ? ' is-active' : ''}`}
              onClick={() => setActive(i)}
            >
              <span className="hp-field-icon"><Icon size={18} /></span>
              {label}
            </button>
          ))}
        </div>

        <div className="hp-fields-preview">
          {template && (
            <div className="hp-fields-card" style={{ '--tpl-color': template.color } as React.CSSProperties} key={template.id}>
              <div className="hp-fields-paper">
                <TemplatePreview html={template.html} name={template.name} eager aspect="700 / 900" pageWidth={700} />
              </div>
              <button type="button" className="hp-use-btn" onClick={onUse}>Use this template</button>
              <div className="hp-fields-name">{template.name}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
