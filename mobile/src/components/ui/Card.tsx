import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, space } from '@/theme';

import { Pressy } from './Pressy';

type Props = { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; padded?: boolean };

export function Card({ children, onPress, style, padded = true }: Props) {
  const body = [styles.card, padded && styles.padded, style];
  if (onPress) {
    return (
      <Pressy onPress={onPress} style={body} accessibilityRole="button">
        {children}
      </Pressy>
    );
  }
  return <View style={body}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  padded: { padding: space.lg },
});
