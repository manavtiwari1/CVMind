import { renderEmail } from '../admin/mailer.js';

// Every email CVMind sends, as { subject, html }. All share the layout in admin/mailer.js.

const SITE = (process.env.FRONTEND_URL || 'https://www.cvmind.in').replace(/\/$/, '');

export function welcomeEmail({ name }) {
  return {
    subject: 'Welcome to CVMind',
    html: renderEmail({
      preheader: 'Your account is ready. Here is what you can do first.',
      eyebrow: 'Welcome',
      title: 'Your CVMind account is ready',
      greetingName: name,
      body: 'Thanks for joining CVMind. Everything you need for your job search is in one place:',
      bullets: [
        'Check your resume against applicant tracking systems and fix what they flag',
        'Build a resume from a template, or import your LinkedIn profile',
        'Tailor your resume and cover letter to a specific job description',
        'Practise interviews and get feedback on your answers'
      ],
      ctaLabel: 'Open CVMind',
      ctaUrl: `${SITE}/my-documents`,
      footerReason: 'You received this email because you created a CVMind account.'
    })
  };
}

export function verificationEmail({ name, link, expiresIn = '24 hours' }) {
  return {
    subject: 'Verify your CVMind email address',
    html: renderEmail({
      preheader: 'One click to activate your CVMind account.',
      eyebrow: 'Verify your email',
      title: 'Welcome to CVMind!',
      greetingName: name,
      body: 'Please verify your email address to activate your CVMind account.',
      ctaLabel: 'Verify Email',
      ctaUrl: link,
      note: `This verification link will expire in ${expiresIn} and can only be used once.`,
      afterword: "If you didn't create this account, you can safely ignore this email.",
      footerReason: 'You received this email because this address was used to sign up for CVMind.'
    })
  };
}

export function passwordResetEmail({ name, link, byAdmin = false }) {
  return {
    subject: 'Reset your CVMind password',
    html: renderEmail({
      preheader: 'Use this link within 1 hour to choose a new password.',
      eyebrow: 'Password reset',
      title: 'Choose a new password',
      greetingName: name,
      body: byAdmin
        ? 'Our support team sent you a link to set a new password for your CVMind account.'
        : 'We received a request to reset the password for your CVMind account. Click the button below to choose a new one.',
      ctaLabel: 'Reset Password',
      ctaUrl: link,
      note: 'This link expires in 1 hour. Resetting your password signs you out on your other devices.',
      afterword: "If you didn't ask for this, you can ignore this email. Your password stays the same.",
      footerReason: 'You received this email because a password reset was requested for your CVMind account.'
    })
  };
}

// Announcements and updates sent from Admin → Notifications
export function notificationEmail({ name, title, body, ctaLabel = '', ctaUrl = '' }) {
  return {
    subject: title,
    html: renderEmail({
      preheader: String(body || title).slice(0, 120),
      eyebrow: 'Update from CVMind',
      title,
      greetingName: name,
      body: body && body !== title ? body : '',
      ctaLabel,
      ctaUrl,
      footerReason: 'You received this email because you have a CVMind account.'
    })
  };
}

export function supportReplyEmail({ name, subject, number, body }) {
  return {
    subject: `Re: ${subject} [#${number}]`,
    html: renderEmail({
      preheader: String(body).slice(0, 120),
      eyebrow: `Support ticket #${number}`,
      title: subject,
      greetingName: name,
      body,
      afterword: 'Reply to this email to continue the conversation.',
      footerReason: 'You received this email because you contacted CVMind Support.'
    })
  };
}

export function invoiceEmail({ name, number, plan, amount, until }) {
  return {
    subject: `Your CVMind invoice ${number}`,
    html: renderEmail({
      preheader: `Payment received: ${amount} for CVMind Pro.`,
      eyebrow: 'Payment received',
      title: 'Thanks for getting CVMind Pro',
      greetingName: name,
      body: `We received your payment of ${amount} for CVMind Pro (${plan}). Your invoice ${number} is attached as a PDF.`,
      note: until ? `Pro is active on your account until ${until}.` : '',
      ctaLabel: 'Open CVMind',
      ctaUrl: 'https://www.cvmind.in/dashboard',
      afterword: 'Questions about this payment? Just reply to this email.',
      footerReason: 'You received this email because you paid for CVMind Pro.'
    })
  };
}

export function resumePdfEmail({ name, fileName }) {
  return {
    subject: `Your resume: ${fileName}`,
    html: renderEmail({
      preheader: `${fileName}.pdf is attached.`,
      eyebrow: 'Your resume',
      title: 'Your resume is attached',
      greetingName: name,
      body: `Here is ${fileName}.pdf, exported from CVMind.\n\nGood luck with your applications!`,
      footerReason: 'You received this email because you sent a resume to yourself from CVMind.'
    })
  };
}
