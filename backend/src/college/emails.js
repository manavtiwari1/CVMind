import { escapeHtml, renderEmail, sendEmail } from '../admin/mailer.js';
import { COLLEGE_APP_URL, USER_APP_URL } from './access.js';

const detailRows = (rows) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #e8ebef;border-radius:10px;border-collapse:separate">${rows
  .map(([k, v]) => `<tr><td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #eef0f3;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:8px 12px;font-size:15px;color:#111827;font-weight:700;border-bottom:1px solid #eef0f3;font-family:Menlo,Consolas,monospace">${escapeHtml(v)}</td></tr>`)
  .join('')}</table>`;

// Login details for a college admin (sent from the admin panel) or staff member (added by the college admin)
export function sendStaffCredentials({ staff, college, password, invitedBy }) {
  const admin = staff.role === 'admin';
  return sendEmail({
    to: staff.email,
    subject: `Your CVMind Placements login for ${college.name}`,
    html: renderEmail({
      preheader: `Sign in to the ${college.name} placements portal.`,
      eyebrow: 'Placements portal',
      title: `${college.name} on CVMind`,
      greetingName: staff.name || '',
      body: `${invitedBy} set up your ${admin ? 'college admin' : 'staff'} login for the ${college.name} placements portal. There you can see your students' resumes, ATS scores and LinkedIn results, and review their resumes.\n\nSign in with these details:`,
      htmlBlock: detailRows([['Website', COLLEGE_APP_URL.replace(/^https?:\/\//, '')], ['Login ID', staff.email], ['Temporary password', password]]),
      ctaLabel: 'Open the placements portal',
      ctaUrl: COLLEGE_APP_URL,
      note: 'You will be asked to choose your own password the first time you sign in. Do not share this email.',
      footerReason: `You get this because ${college.name} has a CVMind placements account.`
    })
  });
}

export const inviteUrl = (token) => `${USER_APP_URL}/college-invite/${token}`;

export function inviteMessage({ student, college, token }) {
  return {
    to: student.email,
    subject: `${college.name} invited you to CVMind`,
    html: renderEmail({
      preheader: `Join ${college.name} on CVMind and get CVMind Pro free.`,
      eyebrow: 'College invitation',
      title: `Join ${college.name} on CVMind`,
      greetingName: student.name || '',
      body: `${college.name} uses CVMind for placements. Accept this invitation to get CVMind Pro free while your college's plan is active, build your resume in your college's format, and get feedback from your placement team.`,
      bullets: ['Unlimited resume checks and the full resume builder', 'Your college\'s resume format', 'Feedback on your resume from your placement team'],
      ctaLabel: 'Accept invitation',
      ctaUrl: inviteUrl(token),
      note: `Sign in or create your account with ${student.email}. The link works for 14 days.`,
      afterword: 'Once you accept, your placement team can see your resumes, ATS scores and LinkedIn results while you are linked. You can leave your college from your account at any time.',
      footerReason: `You get this because ${college.name} added your email to its placements list.`
    })
  };
}

export function reviewMessage({ student, college, status, comment, title }) {
  const approved = status === 'approved';
  return {
    to: student.email,
    subject: approved ? `${college.name} approved your resume` : `${college.name} asked for changes to your resume`,
    html: renderEmail({
      preheader: approved ? `Your resume "${title}" was approved.` : `Your placement team left feedback on "${title}".`,
      eyebrow: 'Resume review',
      title: approved ? 'Your resume is approved' : 'Your resume needs changes',
      greetingName: student.name || '',
      body: approved
        ? `Your placement team at ${college.name} approved your resume "${title}". If you edit it, it will need another review.`
        : `Your placement team at ${college.name} reviewed your resume "${title}" and asked for changes.`,
      ...(comment ? { note: comment } : {}),
      ctaLabel: 'Open my account',
      ctaUrl: `${USER_APP_URL}/account?tab=college`,
      footerReason: `You get this because you are linked to ${college.name} on CVMind.`
    })
  };
}
