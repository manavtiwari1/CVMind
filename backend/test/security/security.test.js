import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { assertSafePublicUrl } from '../../src/services/urlSafety.js';
import { encryptSecret, decryptSecret } from '../../src/admin/trio.js';
import { signToken, setUserSessionValidator, requireUser } from '../../src/services/authToken.js';
import companyRouter from '../../src/routes/company.js';

describe('Security regression checks', () => {
  it('blocks SSRF targets (localhost, metadata, private IPs, non-http schemes)', async () => {
    for (const bad of [
      'http://127.0.0.1:5000/api/admin',
      'http://localhost:8080',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.1/internal',
      'http://192.168.1.1/admin',
      'http://[::1]:3000/',
      'file:///etc/passwd',
      'ftp://example.com/file'
    ]) {
      await assert.rejects(() => assertSafePublicUrl(bad));
    }
  });

  it('allows valid public IPv4 HTTPS URLs', async () => {
    const u = await assertSafePublicUrl('https://1.1.1.1/jobs');
    assert.equal(u.hostname, '1.1.1.1');
  });

  it('refuses missing 2FA encryption secret in production', () => {
    const prevEnv = process.env.NODE_ENV;
    const prev2fa = process.env.ADMIN_2FA_KEY;
    const prevAuth = process.env.AUTH_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ADMIN_2FA_KEY;
      delete process.env.AUTH_SECRET;
      assert.throws(() => encryptSecret('JBSWY3DPEHPK3PXP'), /must be set in production/);
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prev2fa !== undefined) process.env.ADMIN_2FA_KEY = prev2fa;
      if (prevAuth !== undefined) process.env.AUTH_SECRET = prevAuth;
    }
  });

  it('round-trips 2FA secret encryption when key is configured', () => {
    const prevAuth = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = 'test-secret-for-unit-check';
    try {
      const cipher = encryptSecret('JBSWY3DPEHPK3PXP');
      assert.notEqual(cipher, 'JBSWY3DPEHPK3PXP');
      assert.equal(decryptSecret(cipher), 'JBSWY3DPEHPK3PXP');
    } finally {
      if (prevAuth === undefined) delete process.env.AUTH_SECRET;
      else process.env.AUTH_SECRET = prevAuth;
    }
  });

  it('fails closed when userSessionValidator throws', async () => {
    setUserSessionValidator(async () => {
      throw new Error('DB unreachable');
    });
    const token = signToken({ sub: 'u1', kind: 'user', email: 'u1@example.com' });
    const app = express();
    app.get('/me', requireUser, (req, res) => res.json({ ok: true }));
    const server = app.listen(0);
    try {
      const { port } = server.address();
      const res = await fetch(`http://127.0.0.1:${port}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(res.status, 401);
    } finally {
      setUserSessionValidator(null);
      server.close();
    }
  });

  it('requires company authentication on GET /api/company/profile', async () => {
    const app = express();
    app.use('/api/company', companyRouter);
    const server = app.listen(0);
    try {
      const { port } = server.address();
      const res = await fetch(`http://127.0.0.1:${port}/api/company/profile?email=victim@acme.com`);
      assert.equal(res.status, 401);
    } finally {
      server.close();
    }
  });
});
