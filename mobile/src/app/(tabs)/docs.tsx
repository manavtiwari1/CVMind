import { ComingNext } from '@/components/ComingNext';

export default function DocsTab() {
  return (
    <ComingNext
      title="My Documents"
      pose="resume"
      subtitle="Every resume and letter you make, in one place"
      points={['Resumes, cover letters and reports from the app and the website', 'Preview, rename or delete them', 'Download a PDF, or send it on WhatsApp or email']}
    />
  );
}
