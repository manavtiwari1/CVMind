import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { LEO, type LeoPose } from '@/lib/leo';
import { colors, space } from '@/theme';

import { Txt } from './ui';

// Shown while an AI tool works: Leo bobbing gently, with what it is doing right now
export function Working({ title, steps, pose = 'typing' }: { title: string; steps: string[]; pose?: LeoPose }) {
  const [i, setI] = useState(0);
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.set(withRepeat(withSequence(withTiming(-8, { duration: 900 }), withTiming(0, { duration: 900 })), -1));
  }, [bob]);
  useEffect(() => {
    if (steps.length < 2) return;
    const t = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 3500);
    return () => clearInterval(t);
  }, [steps.length]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bob.get() }] }));
  return (
    <Animated.View entering={FadeIn} style={styles.wrap}>
      <Animated.View style={style}>
        <Image source={LEO[pose]} style={styles.leo} contentFit="contain" />
      </Animated.View>
      <Txt variant="title" center>{title}</Txt>
      <Animated.View key={i} entering={FadeInDown.springify()}>
        <Txt center color={colors.muted}>{steps[i]}</Txt>
      </Animated.View>
      <View style={styles.dots}>
        {steps.map((s, n) => (
          <View key={s} style={[styles.dot, n <= i && styles.dotOn]} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xxl },
  leo: { width: 170, height: 170 },
  dots: { flexDirection: 'row', gap: 6, marginTop: space.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.brand },
});
