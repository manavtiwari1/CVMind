import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSheets } from '@/components/GlobalSheets';
import { Button, Pressy, Skeleton, Txt } from '@/components/ui';
import { toolById } from '@/data/tools';
import { useWorks } from '@/hooks/useWorks';
import { errorMessage } from '@/lib/api';
import { LEO } from '@/lib/leo';
import { DOCUMENT_TYPES, editedAt, workIcon, workId, workLabel, type Work } from '@/lib/works';
import { colors, radius, space } from '@/theme';

type Filter = 'documents' | 'activity';

const when = (d: Date) => {
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
};

function Row({ w, index }: { w: Work; index: number }) {
  const doc = DOCUMENT_TYPES.includes(w.type);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 35).springify().damping(18)}>
      <Pressy onPress={() => router.push(`/doc/${encodeURIComponent(workId(w))}` as never)} style={styles.row} scaleTo={0.985} accessibilityLabel={`Open ${w.title}`}>
        <View style={[styles.icon, { backgroundColor: doc ? colors.brandSoft : colors.tealSoft }]}>
          <Ionicons name={workIcon(w.type)} size={22} color={doc ? colors.brand : colors.teal} />
        </View>
        <View style={styles.flex}>
          <Txt variant="bodyStrong" numberOfLines={1}>{w.title || 'Untitled'}</Txt>
          <Txt variant="small">{workLabel(w.type)} · {when(editedAt(w))}</Txt>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </Pressy>
    </Animated.View>
  );
}

export default function DocsTab() {
  const { comingSoon } = useSheets();
  const [filter, setFilter] = useState<Filter>('documents');
  const { data, isLoading, error, refetch, isRefetching } = useWorks();

  const list = useMemo(() => {
    const all = [...(data || [])].sort((a, b) => editedAt(b).getTime() - editedAt(a).getTime());
    return filter === 'documents' ? all.filter((w) => DOCUMENT_TYPES.includes(w.type)) : all.filter((w) => !DOCUMENT_TYPES.includes(w.type));
  }, [data, filter]);

  const builder = toolById('resume-builder');

  return (
    <SafeAreaView edges={['top']} style={styles.fill}>
      <View style={styles.header}>
        <Txt variant="title">My Documents</Txt>
        <Txt variant="small">Everything you make on the app and on cvmind.in.</Txt>
        <View style={styles.tabs}>
          {(['documents', 'activity'] as const).map((f) => (
            <Pressy key={f} onPress={() => setFilter(f)} style={[styles.tab, filter === f && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: filter === f }}>
              <Txt variant="smallStrong" color={filter === f ? colors.onDark : colors.text}>{f === 'documents' ? 'Documents' : 'Tool results'}</Txt>
            </Pressy>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.content}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.row, { gap: space.md }]}>
              <Skeleton width={44} height={44} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="70%" />
                <Skeleton width="40%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={workId}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} colors={[colors.brand]} />}
          renderItem={({ item, index }) => <Row w={item} index={index} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Image source={error ? LEO.thinking : LEO.resume} style={styles.emptyLeo} contentFit="contain" />
              <Txt variant="heading" center>
                {error ? "Couldn't load your documents" : filter === 'documents' ? 'No documents yet' : 'No tool results yet'}
              </Txt>
              <Txt variant="small" center>
                {error ? errorMessage(error) : filter === 'documents' ? 'Resumes and cover letters you make show up here, from the app and from cvmind.in.' : 'ATS checks, interview prep and other results show up here.'}
              </Txt>
              {error ? (
                <Button title="Try again" variant="secondary" size="sm" onPress={() => void refetch()} />
              ) : filter === 'documents' && builder ? (
                <Button
                  title="Build a resume"
                  icon="add"
                  size="sm"
                  onPress={() => (builder.route ? router.push(builder.route as never) : comingSoon(builder.title, builder.pose))}
                />
              ) : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { paddingHorizontal: space.xl, paddingTop: space.md, gap: 4 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: space.md, marginBottom: space.sm },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  content: { padding: space.xl, paddingTop: space.sm, gap: space.sm, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxxl, paddingHorizontal: space.lg },
  emptyLeo: { width: 130, height: 130 },
});
