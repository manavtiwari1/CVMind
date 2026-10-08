// Support channels shown on the Contact page, the Contact Us dialog and the Help Center.
export const SUPPORT_EMAIL = 'cvmindofficial@gmail.com';
export const WHATSAPP_NUMBER = '918700683798';
export const WHATSAPP_DISPLAY = '+91 87006 83798';

export const whatsappLink = (text = 'Hi CV Mind team, I need help with ') =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

export const telLink = `tel:+${WHATSAPP_NUMBER}`;

export const mailLink = (subject = 'CV Mind support') =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;

// A page that sends people to the Contact page can fill in the subject for them; the form reads it, then clears it
const SUBJECT_KEY = 'cvmind.contactSubject';
export const setContactSubject = (subject: string) => {
  try { sessionStorage.setItem(SUBJECT_KEY, subject); } catch { /* storage blocked */ }
};
export const readContactSubject = () => {
  try { return sessionStorage.getItem(SUBJECT_KEY) || ''; } catch { return ''; }
};
export const clearContactSubject = () => {
  try { sessionStorage.removeItem(SUBJECT_KEY); } catch { /* storage blocked */ }
};
