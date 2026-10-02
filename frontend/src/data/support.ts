// Support channels shown on the Contact page, the Contact Us dialog and the Help Center.
export const SUPPORT_EMAIL = 'cvmindofficial@gmail.com';
export const WHATSAPP_NUMBER = '918700683798';
export const WHATSAPP_DISPLAY = '+91 87006 83798';

export const whatsappLink = (text = 'Hi CV Mind team, I need help with ') =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

export const telLink = `tel:+${WHATSAPP_NUMBER}`;

export const mailLink = (subject = 'CV Mind support') =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
