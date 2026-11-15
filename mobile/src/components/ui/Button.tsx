import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, gradients, radius } from '@/theme';

import { Pressy } from './Pressy';
import { Txt } from './Txt';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  iconRight?: IconName;
  leading?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
};

const text: Record<Variant, string> = {
  primary: colors.onDark,
  secondary: colors.brand,
  outline: colors.ink,
  ghost: colors.brand,
  danger: colors.danger,
};

export function Button({ title, onPress, variant = 'primary', icon, iconRight, leading, loading, disabled, size = 'md', style }: Props) {
  const color = text[variant];
  const height = size === 'sm' ? 40 : 52;
  const content = (
    <View style={[styles.row, { height }]}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {leading}
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={color} /> : null}
          <Txt style={[styles.label, { color, fontSize: size === 'sm' ? 14 : 16 }]}>{title}</Txt>
          {iconRight ? <Ionicons name={iconRight} size={size === 'sm' ? 16 : 19} color={color} /> : null}
        </>
      )}
    </View>
  );

  return (
    <Pressy
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.base, variant !== 'primary' && styles[variant], style]}>
      {variant === 'primary' ? (
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressy>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, overflow: 'hidden' },
  gradient: { borderRadius: radius.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  label: { fontFamily: fonts.semibold },
  secondary: { backgroundColor: colors.brandSoft },
  outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.dangerSoft },
});
