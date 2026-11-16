import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type ListViewToken } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleButton } from '@/components/GoogleButton';
import { Wordmark } from '@/components/Wordmark';
import { Button, Txt } from '@/components/ui';
import { LEO, type LeoPose } from '@/lib/leo';
import { useSession } from '@/lib/session';
import { colors, fonts, gradients, space } from '@/theme';

const SLIDES: { pose: LeoPose; script: string; title: string; text: string }[] = [
  { pose: 'hello', script: 'Hi, I am Leo', title: 'Your AI career buddy', text: 'Build, check and tailor your resume with CVMind. Everything stays in sync with cvmind.in.' },
  { pose: 'growth', script: 'Beat the ATS', title: 'Know your score', text: 'See how recruiters’ software reads your resume, and fix every point with one tap.' },
  { pose: 'support', script: 'Get hired', title: 'Practise, then apply', text: 'Interview practice made from your resume, and real jobs matched to you.' },
];

function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withSpring(active ? 22 : 7, { damping: 18 }),
    backgroundColor: active ? colors.brand : colors.borderStrong,
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

export default function Welcome() {
  const { width } = useWindowDimensions();
  const { notice } = useSession();
  const [page, setPage] = useState(0);
  // FlatList needs the same function on every render
  const onViewable = useCallback(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    if (viewableItems[0]?.index != null) setPage(viewableItems[0].index);
  }, []);

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <LinearGradient colors={gradients.soft} style={StyleSheet.absoluteFill} />
      <View style={styles.brandRow}>
        <Wordmark size={26} animate />
      </View>

      <FlatList
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.pose}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.leoRing}>
              <Image source={LEO[item.pose]} style={styles.leo} contentFit="contain" />
            </View>
            {/* Android measures the script font a little narrow and drops the last word; the padding gives it room */}
            <Txt variant="script" center style={styles.script}>{item.script}</Txt>
            <Txt variant="hero" center>{item.title}</Txt>
            <Txt center color={colors.muted} style={styles.text}>{item.text}</Txt>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((s, i) => <Dot key={s.pose} active={page === i} />)}
      </View>

      <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.actions}>
        {notice ? <Txt variant="small" center color={colors.danger}>{notice}</Txt> : null}
        <Button title="Create free account" iconRight="arrow-forward" onPress={() => router.push('/sign-up')} />
        <GoogleButton />
        <Button title="I already have an account" variant="ghost" onPress={() => router.push('/sign-in')} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.xl, paddingTop: space.md },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxxl, gap: space.sm },
  leoRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
    borderWidth: 6,
    borderColor: '#ffffff',
  },
  leo: { width: 190, height: 190 },
  text: { marginTop: 4, fontFamily: fonts.regular, maxWidth: 320 },
  script: { alignSelf: 'stretch', paddingHorizontal: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: space.lg },
  dot: { height: 7, borderRadius: 4 },
  actions: { paddingHorizontal: space.xl, gap: space.md, paddingBottom: space.sm },
});
