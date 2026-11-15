import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { LEO, type LeoPose } from '@/lib/leo';
import { colors, space } from '@/theme';

import { Card, Screen, Txt } from './ui';

// Placeholder for a tab whose product arrives in a later phase: what it will do, in Leo's words
export function ComingNext({ title, subtitle, pose, points }: { title: string; subtitle: string; pose: LeoPose; points: string[] }) {
  return (
    <Screen>
      <Txt variant="title">{title}</Txt>
      <Animated.View entering={FadeInDown.springify()}>
        <Card style={styles.card}>
          <Image source={LEO[pose]} style={styles.leo} contentFit="contain" />
          <Txt variant="heading" center>{subtitle}</Txt>
          <View style={styles.badge}>
            <Ionicons name="time-outline" size={14} color={colors.brand} />
            <Txt variant="tiny" color={colors.brand}>COMING IN THE NEXT UPDATE</Txt>
          </View>
          <View style={styles.points}>
            {points.map((p) => (
              <View key={p} style={styles.point}>
                <Ionicons name="checkmark-circle" size={18} color={colors.teal} />
                <Txt style={styles.flex}>{p}</Txt>
              </View>
            ))}
          </View>
          <Txt variant="small" center>Until then, it works on cvmind.in with this same account.</Txt>
        </Card>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  leo: { width: 140, height: 140 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brandSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  points: { alignSelf: 'stretch', gap: space.sm, marginVertical: space.sm },
  point: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
