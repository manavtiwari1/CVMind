import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { LEO, type LeoPose } from '@/lib/leo';
import { colors, space } from '@/theme';

import { Pressy, Txt } from './ui';

export function BackButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressy
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      style={styles.back}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={8}>
      <Ionicons name="arrow-back" size={22} color={colors.ink} />
    </Pressy>
  );
}

export function OrDivider({ label = 'or use your email' }: { label?: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.line} />
      <Txt variant="small">{label}</Txt>
      <View style={styles.line} />
    </View>
  );
}

export function AuthHeader({ title, subtitle, pose = 'hello' }: { title: string; subtitle: string; pose?: LeoPose }) {
  return (
    <View style={styles.wrap}>
      <BackButton />
      <Animated.View entering={FadeInDown.springify()} style={styles.row}>
        <View style={styles.text}>
          <Txt variant="hero">{title}</Txt>
          <Txt color={colors.muted}>{subtitle}</Txt>
        </View>
        <Image source={LEO[pose]} style={styles.leo} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1, gap: 6 },
  leo: { width: 92, height: 92 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
});
