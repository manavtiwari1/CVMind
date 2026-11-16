import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { colors, fonts } from '@/theme';

// The site header's wordmark (.cv-wordmark): handwritten "CV", tight bold "Mind", a green dot.
// With `animate`, the two halves rise into place one after the other and the dot drops in last.
const RISE = { duration: 520, easing: Easing.bezier(0.22, 1, 0.36, 1) };

export function Wordmark({ size = 24, animate = false, color = colors.ink }: { size?: number; animate?: boolean; color?: string }) {
  const cv = useSharedValue(animate ? 0 : 1);
  const mind = useSharedValue(animate ? 0 : 1);
  const dot = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    cv.set(withTiming(1, RISE));
    mind.set(withDelay(90, withTiming(1, RISE)));
    dot.set(withDelay(380, withSpring(1, { damping: 9, stiffness: 260 })));
  }, [animate, cv, mind, dot]);

  // Each style reads its own value inline: a plain JS helper called from here would run on the UI thread and crash
  const lift = size * 0.5;
  const cvStyle = useAnimatedStyle(() => ({ opacity: cv.get(), transform: [{ translateY: (1 - cv.get()) * lift }] }));
  const mindStyle = useAnimatedStyle(() => ({ opacity: mind.get(), transform: [{ translateY: (1 - mind.get()) * lift }] }));
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: dot.get() }] }));

  const d = Math.max(5, Math.round(size * 0.24));
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="CVMind">
      <Animated.Text style={[styles.cv, { color, fontSize: size * 1.16, lineHeight: size * 1.3 }, cvStyle]}>CV</Animated.Text>
      <Animated.Text style={[styles.mind, { color, fontSize: size, lineHeight: size * 1.3, letterSpacing: -size * 0.045 }, mindStyle]}>Mind</Animated.Text>
      <Animated.View style={[styles.dot, { width: d, height: d, borderRadius: d / 2, marginBottom: size * 0.28 }, dotStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  // Caveat sits narrow on Android; a hair of padding keeps the V from being clipped
  cv: { fontFamily: fonts.script, marginRight: 2, paddingRight: 1 },
  mind: { fontFamily: fonts.display },
  dot: { backgroundColor: colors.green, marginLeft: 2 },
});
