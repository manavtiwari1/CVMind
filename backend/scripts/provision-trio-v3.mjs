import 'dotenv/config';
import bcrypt from 'bcryptjs';
import '../src/db.js';
import { AdminUser } from '../src/admin/models.js';
import { TRIO_MEMBERS, generateStrongPassword } from '../src/admin/trio.js';
import { sendEmail, emailConfigured, renderEmail } from '../src/admin/mailer.js';
import { endOtherSessions } from '../src/admin/auth.js';

const apply = process.argv.includes('--apply');
const sendEmails = process.argv.includes('--send-emails');
const loginUrl = process.env.ADMIN_LOGIN_URL || 'http://localhost:5173/admin';

async function main() {
  // Wait briefly for TiDB connection
  await new Promise((r) => setTimeout(r, 2000));

  console.log(`\n=== Admin Panel v3 Trio Provisioning (${apply ? 'APPLY' : 'DRY RUN'}) ===\n`);

  for (const member of TRIO_MEMBERS) {
    const existing = await AdminUser.findOne({
      $or: [
        { email: member.email.toLowerCase() },
        { username: member.username },
        { username: { $in: member.legacyUsernames } }
      ]
    });

    const tempPassword = generateStrongPassword(18);
    console.log(
      `• ${member.name} (${member.email}): ${existing ? `found (${existing.username})` : 'create new'} -> username="${member.username}", role="${member.role}", mustChangePassword=true, twoFactorEnabled=true`
    );

    if (!apply) continue;

    const hash = await bcrypt.hash(tempPassword, 12);
    let doc = existing;
    if (doc) {
      doc.username = member.username;
      doc.name = member.name;
      doc.email = member.email;
      doc.role = member.role;
      doc.active = true;
      doc.passwordHash = hash;
      doc.mustChangePassword = true;
      doc.twoFactorEnabled = true;
      endOtherSessions(doc);
      await doc.save();
    } else {
      doc = await AdminUser.create({
        username: member.username,
        name: member.name,
        email: member.email,
        role: member.role,
        active: true,
        passwordHash: hash,
        mustChangePassword: true,
        twoFactorEnabled: true
      });
    }

    if (sendEmails) {
      if (!emailConfigured()) {
        console.warn(`  ⚠ RESEND_API_KEY not configured; skipped email for ${member.email}`);
      } else {
        await sendEmail({
          to: member.email,
          subject: 'Your new CVMind Admin Panel v3 credentials',
          html: renderEmail({
            preheader: 'New secure Admin Panel v3 ID and temporary password inside.',
            eyebrow: 'Admin Panel v3 Security Upgrade',
            title: 'Your new Admin Panel credentials',
            greetingName: member.name,
            body: `Admin Panel v3 is now restricted exclusively to Manav, Abhay, and Vanshika with mandatory 2FA and Passkeys.\n\nYour new Admin ID: ${member.username}\nTemporary Password: ${tempPassword}\n\nOn your first sign-in, you will set up your Authenticator app (2FA) and rotate this temporary password.`,
            ctaLabel: 'Open Admin Panel',
            ctaUrl: loginUrl,
            note: 'You can also register a Passkey (Touch ID / Face ID) inside Security settings after signing in.',
            footerReason: 'Authorized CVMind Admin Trio security rotation.'
          })
        });
        console.log(`  ✓ Credentials email sent to ${member.email}`);
      }
    }
  }

  console.log('\nDone.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
