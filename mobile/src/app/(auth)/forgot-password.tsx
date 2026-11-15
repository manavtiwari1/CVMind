import { router } from 'expo-router';
import { useState } from 'react';

import { AuthHeader } from '@/components/AuthHeader';
import { Button, Card, Input, Screen, Txt } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { colors } from '@/theme';

// Sends the reset link. The link opens on cvmind.in, where the new password is set; the app then
// signs in with it.
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim()) return setError('Enter the email you signed up with.');
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ message?: string }>('/api/auth/forgot-password', { method: 'POST', anonymous: true, body: { email: email.trim() } });
      setSent(data.message || `If an account exists for ${email.trim()}, we've sent a reset link.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen background={colors.surface} edges={['top', 'bottom']}>
      <AuthHeader title="Reset your password" subtitle="Enter your email and we'll send you a reset link." pose="thinking" />
      {sent ? (
        <>
          <Card style={{ backgroundColor: colors.tealSoft, borderColor: colors.tealSoft }}>
            <Txt variant="bodyStrong">Check your inbox</Txt>
            <Txt>{sent} Open it, choose a new password, then log in here.</Txt>
          </Card>
          <Button title="Back to log in" onPress={() => router.replace('/sign-in')} />
        </>
      ) : (
        <>
          <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" returnKeyType="send" onSubmitEditing={submit} error={error} />
          <Button title="Send reset link" loading={busy} onPress={submit} />
        </>
      )}
    </Screen>
  );
}
