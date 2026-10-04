import LegalLayout from './resources/LegalLayout';
import { SUPPORT_EMAIL } from '../data/support';

interface CopyrightPolicyProps {
  setCurrentPage: (page: string) => void;
}

export default function CopyrightPolicy({ setCurrentPage }: CopyrightPolicyProps) {
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

  return (
    <LegalLayout page="copyright-policy" title="Copyright Policy" updated="July 8, 2026" setCurrentPage={setCurrentPage}>
      <h2>Ownership of site content</h2>
      <p>All content on CV Mind ("the Service"), including the website design, logo, brand name, text, graphics, interface, blog articles, career guides and software, belongs to CV Mind and is protected by copyright, trademark and intellectual-property law. You may not reproduce, distribute, modify or republish it, in whole or in part, without our written permission.</p>

      <h2>Your content stays yours</h2>
      <p>You keep full ownership of everything you upload or create on CV Mind, including:</p>
      <ul>
        <li>Resumes and cover letters you upload for analysis.</li>
        <li>Resumes, portfolios and documents you build with our tools.</li>
        <li>The personal information in your profile.</li>
      </ul>
      <p>By uploading content, you give CV Mind a limited licence to process it only to provide the Service (for example, sending your resume text to our AI model for analysis). We claim no ownership of your documents and do not use them for anything beyond the features you ask for.</p>

      <h2>AI-generated content</h2>
      <p>Content our AI tools write for you, such as rewritten bullet points, cover letters, LinkedIn bios and interview answers, is yours to use freely for your job search and professional purposes, without crediting CV Mind. Please review AI output before using it, as our Disclaimer explains.</p>

      <h2>Blog articles and guides</h2>
      <p>Our blog articles and career guides are original work written for CV Mind. You may share links to them and quote short excerpts with clear credit and a link back to the original page. Republishing full articles, scraping content or using our guides in paid products needs our written permission.</p>

      <h2>Trademarks</h2>
      <p>"CV Mind", the CV Mind logo and related product names are trademarks of CV Mind. Other names and logos that appear on the Service, such as Google, LinkedIn or companies in job listings, belong to their owners and are used only to identify them. Their appearance does not mean they are affiliated with or endorse CV Mind.</p>

      <h2>Reporting copyright infringement</h2>
      <p>We respect other people's intellectual property and expect our users to do the same. If you believe content on CV Mind infringes your copyright, send a notice to {mail} that includes:</p>
      <ul>
        <li>The copyrighted work you say has been infringed.</li>
        <li>The exact URL on cvmind.in where the material appears.</li>
        <li>Your name, contact details and a statement that you own the rights or are authorised to act for the owner.</li>
        <li>A good-faith statement that the use is not authorised by the copyright owner, its agent or the law.</li>
      </ul>
      <p>We review complete notices promptly and remove or disable access to infringing material where appropriate.</p>

      <h2>Repeat infringers</h2>
      <p>We close the accounts of users who repeatedly upload or share infringing material through the Service.</p>

      <h2>Changes to this policy</h2>
      <p>We may update this Copyright Policy from time to time. If you keep using the Service after a change is posted, you accept the updated policy.</p>

      <h2>Contact</h2>
      <p>For copyright questions or permission requests, email {mail}.</p>
    </LegalLayout>
  );
}
