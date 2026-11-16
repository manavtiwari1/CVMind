import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme';

import { Pressy, Txt } from './ui';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  tint?: string;
  danger?: boolean;
};

export function ListRow({ icon, title, subtitle, onPress, right, tint = colors.brand, danger }: Props) {
  const color = danger ? colors.danger : tint;
  const body = (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: danger ? colors.dangerSoft : colors.surfaceAlt }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <View style={styles.text}>
        <Txt variant="bodyStrong" color={danger ? colors.danger : undefined}>{title}</Txt>
        {subtitle ? <Txt variant="small" numberOfLines={2}>{subtitle}</Txt> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : null)}
    </View>
  );
  return onPress ? (
    <Pressy onPress={onPress} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={title}>
      {body}
    </Pressy>
  ) : (
    body
  );
}

export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      {title ? <Txt variant="label" style={styles.groupTitle}>{title}</Txt> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12, paddingHorizontal: space.lg },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
  group: { gap: 8 },
  groupTitle: { marginLeft: 4, letterSpacing: 0.6 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', paddingVertical: 4 },
});
