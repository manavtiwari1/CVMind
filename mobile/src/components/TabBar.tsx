import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, shadow } from '@/theme';

import { Pressy, Txt } from './ui';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', active: 'home' },
  leo: { label: 'Leo', icon: 'sparkles-outline', active: 'sparkles' },
  docs: { label: 'Docs', icon: 'folder-open-outline', active: 'folder-open' },
  jobs: { label: 'Jobs', icon: 'briefcase-outline', active: 'briefcase' },
  me: { label: 'Me', icon: 'person-circle-outline', active: 'person-circle' },
};

type Route = { key: string; name: string };
type Props = {
  state: { index: number; routes: Route[] };
  navigateToTab: (routeKey: string) => void;
};

function TabButton({ route, focused, onPress }: { route: Route; focused: boolean; onPress: () => void }) {
  const tab = TABS[route.name];
  const pill = useAnimatedStyle(() => ({
    opacity: withSpring(focused ? 1 : 0, { damping: 20 }),
    transform: [{ scaleX: withSpring(focused ? 1 : 0.5, { damping: 16, stiffness: 220 }) }],
  }));
  if (!tab) return null;
  const isLeo = route.name === 'leo';
  return (
    <Pressy onPress={onPress} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={tab.label} scaleTo={0.9}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, pill]} />
        <Ionicons name={focused ? tab.active : tab.icon} size={isLeo ? 24 : 23} color={focused ? colors.brand : colors.muted} />
      </View>
      <Txt style={[styles.label, { color: focused ? colors.brand : colors.muted, fontFamily: focused ? fonts.semibold : fonts.medium }]}>{tab.label}</Txt>
    </Pressy>
  );
}

// The bottom tab bar: icons with a soft pill behind the active one
export function TabBar({ state, navigateToTab }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, i) => (
        <TabButton
          key={route.key}
          route={route}
          focused={state.index === i}
          onPress={() => {
            if (state.index !== i) navigateToTab(route.key);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
    ...shadow.raised,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: { width: 60, height: 32, alignItems: 'center', justifyContent: 'center' },
  pill: { ...StyleSheet.absoluteFill, borderRadius: 16, backgroundColor: colors.brandSoft },
  label: { fontSize: 11.5, lineHeight: 14 },
});
