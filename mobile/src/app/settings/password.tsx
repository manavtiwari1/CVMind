import { router } from 'expo-router';
import { useState } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { Button, Card, Input, Screen, Txt, useToast } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { colors, space } from '@/theme';

export default function ChangePassword() {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!current || !next) return setError('Fill in both passwords.');
    if (next.length < 6) return setError('Use at least 6 characters for the new password.');
    if (next !== confirm) return setError("The new passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ message?: string }>('/api/user/password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
      toast(data.message || 'Password changed', 'success');
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title="Change password" />
      <Card style={{ gap: space.lg }}>
        <Input label="Current password" icon="lock-closed-outline" password value={current} onChangeText={setCurrent} autoComplete="current-password" />
        <Input label="New password" icon="key-outline" password value={next} onChangeText={setNext} autoComplete="new-password" hint="At least 6 characters" />
        <Input label="Confirm new password" icon="key-outline" password value={confirm} onChangeText={setConfirm} autoComplete="new-password" returnKeyType="done" onSubmitEditing={save} />
      </Card>
      {error ? <Txt variant="small" color={colors.danger}>{error}</Txt> : null}
      <Button title="Change password" loading={busy} onPress={save} />
    </Screen>
  );
}
