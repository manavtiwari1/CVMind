import { ChevronLeft } from 'lucide-react';
import type { Template } from '../data/resumeTemplates';
import TemplatePreview from './TemplatePreview';
import { Leo, Stepper, type ResumeGoal } from './ResumeOnboarding';
import './ResumeTemplatePicker.css';

interface ResumeTemplatePickerProps {
  templates: Template[];
  goal: ResumeGoal | null;
  onSelect: (template: Template) => void;
  onBack: () => void;
}

/** Step 5 of the guided flow: pick a resume template. */
export default function ResumeTemplatePicker({ templates, goal, onSelect, onBack }: ResumeTemplatePickerProps) {
  return (
    <div className="rtp-page">
      <button type="button" className="rtp-back" onClick={onBack} aria-label="Back to questions">
        <ChevronLeft size={20} />
      </button>

      <Stepper active={5} />

      <div className="rtp-head">
        <Leo pose="thumbs" />
        <h1>Please select a template for your resume.<br />You can always change it later.</h1>
        <p>
          {goal === 'ats'
            ? 'ATS-friendly layouts are listed first. Clean structure, readable by every parser.'
            : 'Yes, modern ATS systems do read double column templates and do not care at all if you use colors. Recruiters do appreciate readability and one-page resumes, though.'}
        </p>
      </div>

      <div className="rtp-grid">
        {templates.map(t => (
          <button key={t.id} type="button" className="rtp-card" onClick={() => onSelect(t)} aria-label={`Use ${t.name} template`}>
            <span className="rtp-thumb">
              <TemplatePreview html={t.html} name={t.name} />
              <span className="rtp-ats" title="ATS-friendly">ATS</span>
            </span>
            <span className="rtp-name">{t.name}</span>
            <span className="rtp-tag">{t.tag}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
