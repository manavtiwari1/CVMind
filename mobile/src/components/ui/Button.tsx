import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '@/theme';

import { FillPress } from './FillPress';
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

// Pill buttons as on cvmind.in. Primary is ink and floods green when pressed;
// the lighter ones flood a shade darker than themselves.
const look: Record<Variant, { bg: string; fill: string; ink: string; line?: string }> = {
  primary: { bg: colors.ink, fill: colors.green, ink: colors.onDark },
  secondary: { bg: colors.brandSoft, fill: '#cdeee0', ink: colors.ink },
  outline: { bg: colors.surface, fill: colors.surfaceAlt, ink: colors.ink, line: colors.borderStrong },
  ghost: { bg: 'transparent', fill: colors.surfaceAlt, ink: colors.ink },
  danger: { bg: colors.dangerSoft, fill: '#f8cfd0', ink: colors.danger },
};

export function Button({ title, onPress, variant = 'primary', icon, iconRight, leading, loading, disabled, size = 'md', style }: Props) {
  const v = look[variant];
  const small = size === 'sm';
  const iconSize = small ? 16 : 18;
  return (
    <FillPress
      onPress={onPress}
      disabled={disabled || loading}
      fill={v.fill}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.base, { backgroundColor: v.bg }, v.line ? { borderWidth: 1, borderColor: v.line } : null, style]}>
      <View style={[styles.row, { height: small ? 40 : 52, paddingHorizontal: small ? 16 : 22 }]}>
        {loading ? (
          <ActivityIndicator color={v.ink} />
        ) : (
          <>
            {leading}
            {icon ? <Ionicons name={icon} size={iconSize} color={v.ink} /> : null}
            <Txt style={[styles.label, { color: v.ink, fontSize: small ? 14 : 15.5 }]}>{title}</Txt>
            {iconRight ? <Ionicons name={iconRight} size={iconSize} color={v.ink} /> : null}
          </>
        )}
      </View>
    </FillPress>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontFamily: fonts.semibold, letterSpacing: -0.1 },
});
