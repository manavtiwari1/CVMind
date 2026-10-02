import './Legal.css';

export default function Disclaimer() {
  return (
    <div className="legal-page animate-fade-in-up">
      <div className="legal-hero">
        <div className="legal-badge">Legal</div>
        <h1 className="legal-title">Disclaimer</h1>
        <p className="legal-meta">Last updated: June 20, 2026 &nbsp;·&nbsp; Effective immediately</p>
      </div>

      <div className="legal-body">

        <section className="legal-section">
          <h2>1. General Information Only</h2>
          <p>The information provided by CV Mind ("the Service") is for general career-assistance and informational purposes only. All content — including AI-generated resume feedback, interview questions, LinkedIn copy, career roadmaps, and job recommendations — is provided in good faith but does not constitute professional career counselling, legal, financial, or recruitment advice.</p>
        </section>

        <section className="legal-section">
          <h2>2. No Guarantee of Employment</h2>
          <p>CV Mind does not guarantee that use of the Service will result in job interviews, employment offers, or career advancement. Resume scoring, ATS compatibility analysis, and AI suggestions are estimates based on general hiring patterns and publicly available data. Actual outcomes vary based on individual qualifications, market conditions, and employer preferences.</p>
        </section>

        <section className="legal-section">
          <h2>3. AI-Generated Content</h2>
          <p>Our AI tools generate content using large language models. While we strive for accuracy and quality:</p>
          <ul>
            <li>AI-generated text may contain errors, inaccuracies, or outdated information.</li>
            <li>You are solely responsible for reviewing, editing, and verifying all AI-generated content before submitting it to employers or using it professionally.</li>
            <li>We are not liable for any consequences arising from reliance on AI-generated output without verification.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Third-Party Links and Resources</h2>
          <p>The Service may contain links to third-party websites, job boards, or course providers. These links are provided for convenience only. CV Mind does not endorse, control, or take responsibility for the content, privacy practices, or availability of any third-party websites.</p>
        </section>

        <section className="legal-section">
          <h2>5. Job Listings and Salary Data</h2>
          <p>Job listings, salary ranges, and company information displayed within the AI Job Finder feature are aggregated from publicly available sources. CV Mind does not verify the accuracy, completeness, or currency of this data. Job availability and compensation figures may change without notice.</p>
        </section>

        <section className="legal-section">
          <h2>6. Limitation of Liability</h2>
          <p>To the maximum extent permitted by applicable law, CV Mind, its founders, employees, and partners shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of or reliance on the Service, including but not limited to:</p>
          <ul>
            <li>Failure to secure employment or interviews.</li>
            <li>Loss of data or resume content.</li>
            <li>Decisions made based on AI-generated career advice.</li>
            <li>Service interruptions or technical errors.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>7. No Warranty</h2>
          <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free from viruses or other harmful components.</p>
        </section>

        <section className="legal-section">
          <h2>8. Changes to this Disclaimer</h2>
          <p>We may update this Disclaimer from time to time. Continued use of the Service after changes are posted constitutes acceptance of the updated Disclaimer.</p>
        </section>

        <section className="legal-section">
          <h2>9. Contact</h2>
          <p>For questions about this Disclaimer, contact us at <a href="mailto:cvmindofficial@gmail.com">cvmindofficial@gmail.com</a>.</p>
        </section>

      </div>
    </div>
  );
}
