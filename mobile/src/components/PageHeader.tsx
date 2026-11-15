import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme';

import { BackButton } from './AuthHeader';
import { Txt } from './ui';

// Back button and title at the top of a pushed screen
export function PageHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <BackButton />
      <Txt variant="title" style={styles.title} numberOfLines={1}>{title}</Txt>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { flex: 1 },
});
