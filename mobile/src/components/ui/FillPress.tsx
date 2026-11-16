import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type LayoutChangeEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { tap } from '@/lib/haptics';
import { colors } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// The website's pill button, made for touch: on the site a circle of colour grows from the centre on
// hover (cubic-bezier(.4,0,0,1), .7s). Here it grows while the finger is down and drains away after,
// so even a quick tap shows the whole fill.
const GROW = { duration: 560, easing: Easing.bezier(0.4, 0, 0, 1) };
const DRAIN = { duration: 420, easing: Easing.bezier(0.4, 0, 0.2, 1) };

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  /** Colour of the growing circle (CVMind green by default) */
  fill?: string;
  children: ReactNode;
};

export function FillPress({ style, fill = colors.green, children, onPressIn, onPressOut, onPress, disabled, ...rest }: Props) {
  const grow = useSharedValue(0);
  const press = useSharedValue(1);
  const box = useSharedValue({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    box.set({ w: width, h: height });
  };

  const circle = useAnimatedStyle(() => {
    const { w, h } = box.get();
    // Big enough to cover the corners of the pill from its centre
    const d = Math.sqrt(w * w + h * h) * 1.05;
    return {
      width: d,
      height: d,
      borderRadius: d / 2,
      left: (w - d) / 2,
      top: (h - d) / 2,
      transform: [{ scale: grow.get() }],
    };
  });
  const sink = useAnimatedStyle(() => ({ transform: [{ scale: press.get() }] }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onLayout={onLayout}
      onPressIn={(e) => {
        grow.set(withTiming(1, GROW));
        press.set(withSpring(0.975, { damping: 18, stiffness: 420 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        grow.set(withDelay(260, withTiming(0, DRAIN)));
        press.set(withSpring(1, { damping: 14, stiffness: 300 }));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        tap();
        onPress?.(e);
      }}
      style={[styles.clip, style, sink, disabled ? styles.off : null]}>
      <Animated.View pointerEvents="none" style={[styles.circle, { backgroundColor: fill }, circle]} />
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  circle: { position: 'absolute' },
  off: { opacity: 0.5 },
});
