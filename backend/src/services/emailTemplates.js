import { renderEmail, escapeHtml } from '../admin/mailer.js';

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

// Diwali 2026: greeting, the Leo chat and the LEODIWALI offer. The banner is a static file served from the
// site (frontend/public/email/), so it has to be deployed before this email goes out.
export const DIWALI_EMAIL = {
  code: 'LEODIWALI',
  ends: '12 November, 11:59 pm',
  image: 'https://www.cvmind.in/email/leo-diwali.jpg',
  chatUrl: 'https://app.cvmind.in/chat',
  pricingUrl: 'https://www.cvmind.in/pricing'
};

export function diwaliEmail({ name }) {
  const { code, ends, image, chatUrl, pricingUrl } = DIWALI_EMAIL;
  const codeBox = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:6px 0 22px"><tr>
<td align="center" bgcolor="#fff7e6" style="padding:18px 16px;background:#fff7e6;border:1px dashed #e8590c;border-radius:12px">
<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#b45309">Diwali offer: 50% off CVMind Pro</p>
<p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:26px;font-weight:800;letter-spacing:0.12em;color:#7c2d12">${code}</p>
<p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#7c2d12">Valid on any plan until ${ends}. One use per account.</p>
<a href="${pricingUrl}" target="_blank" style="font-size:14px;font-weight:700;color:#c2410c;text-decoration:underline">See the Pro plans</a>
</td></tr></table>`;
  const leoList = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px">${[
    'Checks your resume and gives an ATS score',
    'Tailors your resume to a job description',
    'Writes a cover letter',
    'Prepares interview questions for your role',
    'Finds real open jobs'
  ].map((t) => `<tr><td valign="top" width="22" style="padding:3px 0 7px;font-size:15px;line-height:1.5;color:#1d4ed8;font-weight:700">&#10003;</td><td style="padding:3px 0 7px;font-size:15px;line-height:1.5;color:#334155">${t}</td></tr>`).join('')}</table>`;
  return {
    subject: 'Happy Diwali from CVMind: 50% off Pro, and meet Leo',
    html: renderEmail({
      preheader: `Use code ${code} for 50% off Pro until 12 November. Plus: ask Leo to check your resume or find jobs.`,
      heroImage: image,
      heroAlt: 'Happy Diwali from Leo and the CVMind team',
      title: 'Happy Diwali!',
      greetingName: name,
      body: [
        'Wishing you and your family a bright and happy Diwali from all of us at CVMind. May the new year bring you the interviews and the offer you have been working towards.',
        'Two things for the festival:',
        '1. Meet Leo. Our new AI chat does the work for you: type what you need and Leo does it. It is free to use, with 30 messages a day on a free account.'
      ].join('\n\n'),
      // The list belongs to point 1, so it goes in the HTML block ahead of point 2 (renderEmail puts bullets after it)
      htmlBlock: `${leoList}<p style="margin:0 0 10px;font-size:15px;line-height:1.65;color:#334155">2. Save on Pro. Use this code at checkout:</p>${codeBox}`,
      ctaLabel: 'Chat with Leo',
      ctaUrl: chatUrl,
      afterword: 'Have a safe and happy Diwali. If you have any question, just reply to this email.',
      footerReason: 'You received this email because you have a CVMind account.'
    })
  };
}

// Leo going live. Like the Diwali banner, the image is served from the site, so it has to be
// deployed before this email goes out.
export const LEO_LIVE_EMAIL = {
  image: 'https://www.cvmind.in/email/leo-is-on.jpg',
  chatUrl: 'https://app.cvmind.in/chat'
};

export function leoLiveEmail({ name }) {
  const { image, chatUrl } = LEO_LIVE_EMAIL;
  return {
    subject: 'Leo is on. Tell him what you need.',
    html: renderEmail({
      preheader: 'Your resume, cover letter, job hunt and interview prep, done by asking Leo.',
      heroImage: image,
      heroAlt: 'Leo is on. Tell him what you need. He does the work.',
      title: 'Leo is on',
      greetingName: name,
      body: 'You can now get your career work done just by asking. Tell Leo what you need in your own words, and he does it right there in the chat:',
      bullets: [
        'Checks your resume and fixes what is holding it back',
        'Tailors your resume to a job and writes a one-page cover letter',
        'Finds real jobs and prepares everything you need to apply',
        'Runs a mock interview with feedback on every answer',
        'Writes your LinkedIn bio, posts and messages',
        'Builds your own portfolio website'
      ],
      note: 'To start: open Leo, tap Connectors, connect the tools you want, then type what you need.',
      ctaLabel: 'Open Leo',
      ctaUrl: chatUrl,
      afterword: 'Leo prepares the work and you stay in charge: he never applies, posts or sends anything for you. If you have any question, just reply to this email.',
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

// ── Refunds ──────────────────────────────────────────────────────────────────
// CVMind payments are non-refundable; a refund is only given after a person reviews a genuine reason.
const REFUND_FOOTER = 'You received this email because of a refund request on your CVMind account.';

export function refundRequestReceivedEmail({ name, plan, amount, until }) {
  return {
    subject: 'We received your refund request',
    html: renderEmail({
      preheader: 'Our team will review it by hand and reply within 3 working days.',
      eyebrow: 'Refund request',
      title: 'We received your refund request',
      greetingName: name,
      body: `Thanks for writing to us about your CVMind Pro ${plan} plan (${amount}).\n\nPayments on CVMind are non-refundable, so a refund is only given for a genuine reason. A member of our team reviews every request by hand and replies within 3 working days.`,
      note: until ? `Your Pro plan stays active until ${until} while we review your request.` : '',
      afterword: 'Want to add anything? Just reply to this email.',
      footerReason: REFUND_FOOTER
    })
  };
}

export function refundInitiatedEmail({ name, amount, plan, orderId, proEnded = true, viaCashfree = true }) {
  return {
    subject: `Your refund of ${amount} has been started`,
    html: renderEmail({
      preheader: `We've started a refund of ${amount} for CVMind Pro.`,
      eyebrow: 'Refund started',
      title: `Your refund of ${amount} has been started`,
      greetingName: name,
      body: [
        `We've started a refund of ${amount} for your CVMind Pro ${plan} plan (order ${orderId}).`,
        viaCashfree ? 'It goes back to the account or card you paid with, usually within 5 to 7 working days depending on your bank.' : '',
        proEnded ? 'The Pro plan from this payment has ended. Your account and documents stay as they are on the Free plan.' : ''
      ].filter(Boolean).join('\n\n'),
      note: viaCashfree ? "Not received it after 7 working days? Reply to this email with your order ID and we'll look into it." : '',
      footerReason: REFUND_FOOTER
    })
  };
}

export function refundRejectedEmail({ name, plan, note, until }) {
  return {
    subject: "We couldn't approve your refund request",
    html: renderEmail({
      preheader: "We reviewed your refund request and couldn't approve it.",
      eyebrow: 'Refund request',
      title: "We couldn't approve your refund request",
      greetingName: name,
      body: `We reviewed your refund request for your CVMind Pro ${plan} plan. Payments on CVMind are non-refundable, and we couldn't approve this request.${note ? `\n\nOur note: ${note}` : ''}`,
      note: until ? `Your Pro plan stays active until ${until}.` : '',
      afterword: 'Think we got it wrong? Reply to this email and tell us more.',
      footerReason: REFUND_FOOTER
    })
  };
}

// A reminder the user asked Leo to send them
export function leoReminderEmail({ name, text }) {
  return {
    subject: `Reminder: ${text.slice(0, 70)}`,
    html: renderEmail({
      preheader: text.slice(0, 120),
      eyebrow: 'Leo reminder',
      title: 'You asked Leo to remind you',
      greetingName: name,
      body: text,
      footerReason: 'You received this email because you asked Leo to remind you. It is sent once.'
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

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// One row per job: title, company and place, match score, and a link that opens it in Job Finder
function jobRowsHtml(jobs) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;border-collapse:separate;border-spacing:0 10px">${jobs.map((job) => {
    const where = [job.company, job.location || (job.remote ? 'Remote' : '')].filter(Boolean).join(' · ');
    const score = Number.isFinite(job.score) ? `<span style="display:inline-block;padding:3px 9px;border-radius:999px;background:#e9f7f1;color:#0f7a55;font-size:12px;font-weight:700">${job.score}% match</span>` : '';
    return `<tr><td style="padding:14px 16px;border:1px solid #e4e8ef;border-radius:10px;font-family:${FONT}">
<a href="${escapeHtml(job.url)}" target="_blank" style="font-size:16px;font-weight:700;color:#0f172a;text-decoration:none">${escapeHtml(job.title)}</a>
<div style="margin:4px 0 8px;font-size:13px;color:#64748b">${escapeHtml(where)}</div>
${score}
<a href="${escapeHtml(job.url)}" target="_blank" style="float:right;font-size:13px;font-weight:700;color:#1d4ed8;text-decoration:none">View job &rarr;</a>
</td></tr>`;
  }).join('')}</table>`;
}

export function jobAlertEmail({ name, jobs, role, location, manageUrl, unsubscribeUrl, frequency = 'weekly' }) {
  const count = jobs.length;
  const forWhat = [role, location ? `in ${location}` : ''].filter(Boolean).join(' ');
  const subject = `${count} new job${count === 1 ? '' : 's'}${forWhat ? ` for ${forWhat}` : ''} on CVMind`;
  return {
    subject,
    html: renderEmail({
      preheader: jobs.slice(0, 2).map((j) => `${j.title} at ${j.company}`).join(', '),
      eyebrow: frequency === 'daily' ? 'Your daily job alert' : 'Your weekly job alert',
      title: subject.replace(/ on CVMind$/, ''),
      greetingName: name,
      body: `These jobs were posted since your last alert and match your resume. Scores come from your skills, the role you want, your level and location.`,
      htmlBlock: jobRowsHtml(jobs),
      ctaLabel: 'See all jobs in Job Finder',
      ctaUrl: manageUrl,
      footerReason: 'You received this email because you turned on job alerts in CVMind Job Finder.',
      unsubscribeUrl
    })
  };
}
