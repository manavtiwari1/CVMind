import { Ionicons } from '@expo/vector-icons';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/PageHeader';
import { Avatar, Button, Card, Input, Pressy, Screen, Txt, useToast } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors, space } from '@/theme';

// Name, email and photo, saved to the same account as on cvmind.in (POST /api/user/profile)
export default function EditProfile() {
  const { user, signIn } = useSession();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [photo, setPhoto] = useState<string | null>(null); // data: URL of a newly picked photo
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;
  const emailChanged = email.trim().toLowerCase() !== user.email.toLowerCase();

  const pickPhoto = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (picked.canceled || !picked.assets[0]) return;
    try {
      // A small square is plenty for a profile photo and keeps the upload quick
      const image = await ImageManipulator.manipulate(picked.assets[0].uri).resize({ width: 400, height: 400 }).renderAsync();
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
      if (saved.base64) setPhoto(`data:image/jpeg;base64,${saved.base64}`);
    } catch {
      toast("Couldn't use that photo. Try another one.", 'error');
    }
  };

  const save = async () => {
    if (!name.trim()) return setError('Enter your name.');
    if (!email.trim()) return setError('Enter your email.');
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ user: Record<string, unknown>; message?: string }>('/api/user/profile', {
        method: 'POST',
        body: { name: name.trim(), email: email.trim(), ...(photo ? { avatar: photo } : {}) },
      });
      await signIn(data.user);
      toast(emailChanged ? 'Saved. Please verify your new email.' : 'Profile saved', 'success');
      if (emailChanged) router.replace('/verify-email');
      else router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title="Edit profile" />
      <View style={styles.photoWrap}>
        <Pressy onPress={pickPhoto} accessibilityLabel="Change photo">
          <Avatar name={name || user.name} uri={photo ?? user.avatar} size={104} />
          <View style={styles.camera}>
            <Ionicons name="camera" size={17} color="#fff" />
          </View>
        </Pressy>
        <Txt variant="small">Tap to change your photo</Txt>
      </View>
      <Card style={styles.form}>
        <Input label="Full name" icon="person-outline" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />
        <Input
          label="Email"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          hint={emailChanged ? "You'll need to verify the new address." : undefined}
        />
      </Card>
      {error ? <Txt variant="small" color={colors.danger}>{error}</Txt> : null}
      <Button title="Save changes" loading={busy} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoWrap: { alignItems: 'center', gap: space.sm, marginVertical: space.sm },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bg,
  },
  form: { gap: space.lg },
});
