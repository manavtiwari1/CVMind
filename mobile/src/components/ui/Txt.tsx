import { Text, type TextProps } from 'react-native';

import { colors, type, type TypeVariant } from '@/theme';

type Props = TextProps & { variant?: TypeVariant; color?: string; center?: boolean };

export function Txt({ variant = 'body', color, center, style, ...rest }: Props) {
  return <Text {...rest} style={[type[variant], color ? { color } : null, center ? { textAlign: 'center' } : null, style]} />;
}

export const Muted = (props: Props) => <Txt variant="small" color={colors.muted} {...props} />;
