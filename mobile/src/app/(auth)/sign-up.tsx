import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, StyleSheet, View, type TextInputInstance } from 'react-native';

import { AuthHeader, OrDivider } from '@/components/AuthHeader';
import { Captcha, type CaptchaHandle } from '@/components/Captcha';
import { GoogleButton } from '@/components/GoogleButton';
import { Button, Input, Screen, Txt } from '@/components/ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { LINKS } from '@/lib/config';
import { useSession } from '@/lib/session';
import { colors, fonts } from '@/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUp() {
  const { signIn } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The server asks for a captcha only for risky sign-ups
  const [needCaptcha, setNeedCaptcha] = useState(false);
  const captcha = useRef<CaptchaHandle>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const submit = async () => {
    if (!name.trim()) return setError('Enter your full name.');
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Use at least 6 characters for your password.');
    const code = captcha.current?.value();
    if (needCaptcha && !code?.captchaAnswer) return setError('Type the code shown in the picture.');
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ user: Record<string, unknown> }>('/api/auth/signup', {
        method: 'POST',
        anonymous: true,
        body: { name: name.trim(), email: email.trim(), password, ...(needCaptcha ? code : {}) },
      });
      await signIn(data.user);
      router.replace('/verify-email');
    } catch (err) {
      if (err instanceof ApiError && err.data.captchaRequired) {
        if (needCaptcha) captcha.current?.refresh();
        setNeedCaptcha(true);
      }
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen background={colors.surface} edges={['top', 'bottom']}>
      <AuthHeader title="Create your free account" subtitle="Build, check and tailor your resume in minutes." pose="thumbs" />
      <GoogleButton />
      <OrDivider />
      <Input label="Full name" icon="person-outline" value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" textContentType="name" autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
      <Input ref={emailRef} label="Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
      <Input ref={passwordRef} label="Password" icon="lock-closed-outline" password value={password} onChangeText={setPassword} placeholder="At least 6 characters" autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={submit} />
      {needCaptcha ? <Captcha ref={captcha} onSubmit={submit} /> : null}
      {error ? <Txt variant="small" color={colors.danger}>{error}</Txt> : null}
      <Button title="Create account" iconRight="arrow-forward" loading={busy} onPress={submit} />
      <Txt variant="tiny" center>
        By signing up you agree to our{' '}
        <Txt variant="tiny" color={colors.brand} onPress={() => Linking.openURL(LINKS.terms)}>Terms</Txt> and{' '}
        <Txt variant="tiny" color={colors.brand} onPress={() => Linking.openURL(LINKS.privacy)}>Privacy Policy</Txt>.
      </Txt>
      <View style={styles.switch}>
        <Txt variant="small">Already have an account?</Txt>
        <Link href="/sign-in" replace style={styles.link}>Log in</Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switch: { flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center' },
  link: { color: colors.brand, fontFamily: fonts.semibold, fontSize: 13 },
});
