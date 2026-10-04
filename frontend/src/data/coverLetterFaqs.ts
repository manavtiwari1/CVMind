// Questions shown at the bottom of the Cover Letter Generator and Cover Letter Builder pages.

export interface Faq {
  q: string;
  a: string;
}

export const GENERATOR_FAQS: Faq[] = [
  { q: 'How does the AI cover letter generator work?', a: 'Upload your resume and paste the job description (or a link to the job ad). The AI reads both, picks the two or three results from your resume that best match what the job asks for, and writes a one-page letter around them. You can then edit it or download it.' },
  { q: 'Will the AI make up experience I don\'t have?', a: 'No. It is told to use only what is in your resume. If a number or detail isn\'t there, it leaves it out instead of inventing it. Always read the letter once before you send it and add your own specifics.' },
  { q: 'Do I need to sign in?', a: 'Yes. The cover letter tools are part of the CVMind app, so sign in (it is free) to use them. Your letters are saved to My Documents so you can reopen and edit them later.' },
  { q: 'Which file types can I upload?', a: 'PDF, DOCX or TXT, up to 5 MB. A scanned resume saved as an image can\'t be read, so use a file with selectable text.' },
  { q: 'Can I change the tone or length?', a: 'Yes. Open Settings under the job description to choose a professional, conversational or enthusiastic tone, a standard or short length, and add the company and hiring manager\'s name.' },
  { q: 'How long should a cover letter be?', a: 'Usually 250 to 400 words on one page: an opening that names the role, one or two paragraphs that link your results to the job, and a short close that asks for a conversation.' },
  { q: 'Can I edit the letter after it is generated?', a: 'Yes. Choose Edit and it opens in the cover letter editor, where you can change any text, switch the design, fix it with AI and download it as PDF or Word.' },
];

export const BUILDER_FAQS: Faq[] = [
  { q: 'What is the difference between the builder and the generator?', a: 'The builder asks you a few questions and lets you start from a design or an example for your role, then you write the letter yourself. The generator writes a first draft for you from your resume and a job description. Both open in the same editor.' },
  { q: 'Do I need to pay to use the cover letter builder?', a: 'No. Sign in with a free CVMind account to answer the questions, pick an example, edit your letter and download it as PDF or Word. Your letters are saved to My Documents.' },
  { q: 'Can I change the design after I start writing?', a: 'Yes. Open Templates in the editor and pick another design; your text moves into it. You can also change fonts, colours, margins and spacing in Design & Font.' },
  { q: 'Can I add my photo?', a: 'Designs with a photo circle let you upload, crop or hide your photo, the same way as in the resume builder. Many employers prefer letters without a photo, so use one only where it is common in your country or industry.' },
  { q: 'Which file format should I send?', a: 'PDF keeps your design exactly as you made it, and it is what most employers and applicant tracking systems expect. A Word download is there too if the job ad asks for it.' },
  { q: 'Will my cover letter match my resume?', a: 'Pick a design in the same style as your resume, then use the same name, contact details and accent colour on both. You can build the matching resume in our Resume Builder.' },
];
