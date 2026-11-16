import { useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import type { ReactNode } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { tap } from '@/lib/haptics';
import { colors, space } from '@/theme';

import { Pressy, Txt } from './ui';

// Three bars, the last one shorter. Drawn by hand so it matches the app's weight, not an icon font.
function MenuGlyph() {
  return (
    <View style={styles.glyph}>
      <View style={[styles.bar, { width: 20 }]} />
      <View style={[styles.bar, { width: 20 }]} />
      <View style={[styles.bar, { width: 13 }]} />
    </View>
  );
}

export function MenuButton() {
  const navigation = useNavigation();
  return (
    <Pressy
      onPress={() => {
        Keyboard.dismiss();
        tap();
        navigation.dispatch(DrawerActions.openDrawer());
      }}
      style={styles.btn}
      hitSlop={6}
      accessibilityLabel="Open menu">
      <MenuGlyph />
    </Pressy>
  );
}

/** Top bar for the screens in the side menu: menu button, title, and an optional action */
export function AppHeader({ title, sub, right, center }: { title?: string; sub?: string; right?: ReactNode; center?: ReactNode }) {
  return (
    <View style={styles.row}>
      <MenuButton />
      <View style={styles.middle}>
        {center ?? (
          <>
            {title ? <Txt variant="heading" numberOfLines={1}>{title}</Txt> : null}
            {sub ? <Txt variant="tiny" numberOfLines={1}>{sub}</Txt> : null}
          </>
        )}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, height: 56 },
  btn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  glyph: { gap: 4.5, alignItems: 'flex-start', width: 20 },
  bar: { height: 2.2, borderRadius: 2, backgroundColor: colors.ink },
  middle: { flex: 1, paddingHorizontal: 4 },
  right: { minWidth: 44, alignItems: 'flex-end' },
});
