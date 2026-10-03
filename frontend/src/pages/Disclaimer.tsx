import LegalLayout from './resources/LegalLayout';
import { SUPPORT_EMAIL } from '../data/support';

interface DisclaimerProps {
  setCurrentPage: (page: string) => void;
}

export default function Disclaimer({ setCurrentPage }: DisclaimerProps) {
  return (
    <LegalLayout page="disclaimer" title="Disclaimer" updated="June 20, 2026" setCurrentPage={setCurrentPage}>
      <h2>General information only</h2>
      <p>The information CV Mind ("the Service") provides is for general career assistance and information only. All content, including AI-generated resume feedback, interview questions, LinkedIn copy, career roadmaps and job recommendations, is given in good faith but is not professional career counselling, legal, financial or recruitment advice.</p>

      <h2>No guarantee of a job</h2>
      <p>CV Mind does not guarantee that using the Service will lead to interviews, job offers or career progress. Resume scores, ATS compatibility checks and AI suggestions are estimates based on general hiring patterns and public information. Real outcomes depend on your qualifications, the job market and each employer.</p>

      <h2>AI-generated content</h2>
      <p>Our AI tools write content using large language models. We work to keep it accurate and useful, but:</p>
      <ul>
        <li>AI-generated text can contain errors, inaccuracies or outdated information.</li>
        <li>You are responsible for reviewing, editing and checking all AI-generated content before sending it to employers or using it professionally.</li>
        <li>We are not liable for consequences of relying on AI output without checking it.</li>
      </ul>

      <h2>Third-party links</h2>
      <p>The Service may link to other websites, job boards or course providers for convenience. CV Mind does not endorse or control them and is not responsible for their content, privacy practices or availability.</p>

      <h2>Job listings and salary data</h2>
      <p>Job listings, salary ranges and company details in the AI Job Finder come from publicly available sources. CV Mind does not verify that this data is accurate, complete or current. Openings and pay can change without notice.</p>

      <h2>Limitation of liability</h2>
      <p>To the maximum extent the law allows, CV Mind, its founders, employees and partners are not liable for any direct, indirect, incidental, consequential or punitive damages arising from your use of or reliance on the Service, including:</p>
      <ul>
        <li>Not getting a job or an interview.</li>
        <li>Lost data or resume content.</li>
        <li>Decisions made based on AI-generated career advice.</li>
        <li>Service interruptions or technical errors.</li>
      </ul>

      <h2>No warranty</h2>
      <p>The Service is provided "as is" and "as available", without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose or non-infringement. We do not promise that the Service will be uninterrupted, error-free or free of harmful components.</p>

      <h2>Changes to this Disclaimer</h2>
      <p>We may update this Disclaimer from time to time. If you keep using the Service after a change is posted, you accept the updated Disclaimer.</p>

      <h2>Contact</h2>
      <p>Questions about this Disclaimer? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
    </LegalLayout>
  );
}
