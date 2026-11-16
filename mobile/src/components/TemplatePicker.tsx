import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { previewPage } from '@/lib/works';
import { colors, radius, space } from '@/theme';

import { Pressy, Txt } from './ui';

export interface PickerItem {
  id: string;
  name: string;
  tag?: string;
  color: string;
  /** The design filled with its sample, for the preview */
  html: string;
}

/** Template ids that need Pro, from the server (GET /api/billing/plans), so the app always matches the site */
export function useProTemplates() {
  const { data } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: () => api<{ proTemplates?: string[]; proLetterTemplates?: string[] }>('/api/billing/plans', { anonymous: true }),
    staleTime: 60 * 60 * 1000,
  });
  return { resume: data?.proTemplates ?? [], letter: data?.proLetterTemplates ?? [] };
}

// A big live preview of the chosen design, with every design in a row below it
export function TemplatePicker({ items, selected, onSelect, proIds }: { items: PickerItem[]; selected: string; onSelect: (id: string) => void; proIds: string[] }) {
  const { user } = useSession();
  const current = items.find((t) => t.id === selected) ?? items[0];
  const locked = (id: string) => proIds.includes(id) && !user?.isPro;

  return (
    <View style={styles.wrap}>
      <View style={styles.preview}>
        {current ? (
          <WebView
            key={current.id}
            originWhitelist={['*']}
            source={{ html: previewPage(current.html) }}
            style={styles.web}
            scrollEnabled
            showsVerticalScrollIndicator={false}
          />
        ) : null}
        {current && locked(current.id) ? (
          <View style={styles.proBadge}>
            <Ionicons name="diamond" size={12} color="#fff" />
            <Txt variant="tiny" color="#fff">PRO</Txt>
          </View>
        ) : null}
      </View>
      <FlatList
        data={items}
        horizontal
        keyExtractor={(t) => t.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        renderItem={({ item }) => {
          const on = item.id === current?.id;
          return (
            <Pressy
              onPress={() => (locked(item.id) ? router.push('/pro' as never) : onSelect(item.id))}
              style={[styles.chip, on && { borderColor: item.color, backgroundColor: colors.surface }]}
              accessibilityLabel={item.name}
              accessibilityState={{ selected: on }}>
              <View style={[styles.swatch, { backgroundColor: item.color }]}>
                {locked(item.id) ? <Ionicons name="lock-closed" size={12} color="#fff" /> : on ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
              <View style={{ maxWidth: 130 }}>
                <Txt variant="smallStrong" numberOfLines={1}>{item.name}</Txt>
                {item.tag ? <Txt variant="tiny" numberOfLines={1}>{item.tag}</Txt> : null}
              </View>
            </Pressy>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.md },
  preview: { flex: 1, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: '#eef0f5' },
  web: { flex: 1, backgroundColor: '#eef0f5' },
  proBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brand, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  row: { gap: 8, paddingVertical: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  swatch: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
});
