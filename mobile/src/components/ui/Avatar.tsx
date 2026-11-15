import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { fonts, gradients } from '@/theme';

import { Txt } from './Txt';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

export function Avatar({ name, uri, size = 40 }: { name: string; uri?: string | null; size?: number }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" transition={150} />;
  return (
    <LinearGradient colors={gradients.brand} style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Txt style={{ fontFamily: fonts.bold, fontSize: size * 0.38, color: '#fff' }}>{initials(name)}</Txt>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({ circle: { alignItems: 'center', justifyContent: 'center' } });
