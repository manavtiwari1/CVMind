import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { colors, fonts, radius } from '@/theme';

import { Txt } from './Txt';

type Props = TextInputProps & {
  label?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  error?: string | null;
  hint?: string;
  password?: boolean;
};

export const Input = forwardRef<TextInputInstance, Props>(function Input({ label, icon, error, hint, password, style, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? <Txt variant="smallStrong" style={styles.label}>{label}</Txt> : null}
      <View style={[styles.field, focused && styles.focused, !!error && styles.errored]}>
        {icon ? <Ionicons name={icon} size={19} color={focused ? colors.brand : colors.faint} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.faint}
          secureTextEntry={password && !shown}
          autoCapitalize={password ? 'none' : rest.autoCapitalize}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, style]}
        />
        {password ? (
          <Pressable onPress={() => setShown((s) => !s)} hitSlop={10} accessibilityLabel={shown ? 'Hide password' : 'Show password'}>
            <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Txt variant="small" color={colors.danger}>{error}</Txt> : hint ? <Txt variant="small">{hint}</Txt> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { marginLeft: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  focused: { borderColor: colors.brand, backgroundColor: '#fcfbff' },
  errored: { borderColor: colors.danger },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, paddingVertical: 12 },
});
