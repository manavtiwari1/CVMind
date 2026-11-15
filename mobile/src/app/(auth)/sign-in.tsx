import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { AuthHeader, OrDivider } from '@/components/AuthHeader';
import { Captcha, type CaptchaHandle } from '@/components/Captcha';
import { GoogleButton } from '@/components/GoogleButton';
import { Button, Input, Screen, Txt } from '@/components/ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors, fonts } from '@/theme';

export default function SignIn() {
  const { signIn, notice } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(notice);
  const [busy, setBusy] = useState(false);
  const captcha = useRef<CaptchaHandle>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const submit = async () => {
    const code = captcha.current?.value();
    if (!email.trim() || !password) return setError('Enter your email and password.');
    if (!code?.captchaAnswer) return setError('Type the code shown in the picture.');
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ user: Record<string, unknown> }>('/api/auth/login', {
        method: 'POST',
        anonymous: true,
        body: { email: email.trim(), password, captchaId: code.captchaId, captchaAnswer: code.captchaAnswer },
      });
      await signIn(data.user);
      router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
      // Each code works once
      if (err instanceof ApiError) captcha.current?.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen background={colors.surface} edges={['top', 'bottom']}>
      <AuthHeader title="Welcome back" subtitle="Log in to pick up your resume where you left it." pose="hello" />
      <GoogleButton />
      <OrDivider />
      <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
      <Input ref={passwordRef} label="Password" icon="lock-closed-outline" password value={password} onChangeText={setPassword} placeholder="Your password" autoComplete="current-password" textContentType="password" />
      <Link href="/forgot-password" style={styles.forgot}>Forgot password?</Link>
      <Captcha ref={captcha} onSubmit={submit} />
      {error ? <Txt variant="small" color={colors.danger}>{error}</Txt> : null}
      <Button title="Log in" iconRight="arrow-forward" loading={busy} onPress={submit} />
      <View style={styles.switch}>
        <Txt variant="small">New to CVMind?</Txt>
        <Link href="/sign-up" replace style={styles.link}>Create a free account</Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-end', color: colors.brand, fontFamily: fonts.semibold, fontSize: 14 },
  switch: { flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center' },
  link: { color: colors.brand, fontFamily: fonts.semibold, fontSize: 13 },
});
