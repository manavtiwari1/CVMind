import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { type ComponentProps } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/lib/api';
import { tap } from '@/lib/haptics';
import { requestChat, requestNewChat, useOpenChat } from '@/lib/leoChat';
import { deleteChat, listChats, type ChatSummary } from '@/lib/leoApi';
import { useSession } from '@/lib/session';
import { colors, radius, space } from '@/theme';

import { Avatar, Pressy, Skeleton, Txt, useToast } from './ui';
import { FillPress } from './ui/FillPress';
import { Wordmark } from './Wordmark';

type IconName = ComponentProps<typeof Ionicons>['name'];

const PAGES: { route: string; label: string; icon: IconName; iconOn: IconName }[] = [
  { route: 'products', label: 'Products', icon: 'grid-outline', iconOn: 'grid' },
  { route: 'jobs', label: 'Jobs', icon: 'briefcase-outline', iconOn: 'briefcase' },
  { route: 'docs', label: 'Documents', icon: 'folder-open-outline', iconOn: 'folder-open' },
];

// Today / Yesterday / This week / This month / older months, newest first
function groupChats(chats: ChatSummary[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 86400000;
  const label = (iso: string) => {
    const t = new Date(iso).getTime();
    if (t >= startOfToday.getTime()) return 'Today';
    if (t >= startOfToday.getTime() - day) return 'Yesterday';
    if (t >= startOfToday.getTime() - 6 * day) return 'This week';
    if (t >= startOfToday.getTime() - 29 * day) return 'This month';
    return new Date(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };
  const groups: { title: string; chats: ChatSummary[] }[] = [];
  for (const c of [...chats].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))) {
    const title = label(c.updatedAt);
    const last = groups[groups.length - 1];
    if (last?.title === title) last.chats.push(c);
    else groups.push({ title, chats: [c] });
  }
  return groups;
}

export function SideMenu({ state, navigation }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const openId = useOpenChat();
  const chats = useQuery({ queryKey: ['leo-chats'], queryFn: listChats, staleTime: 30_000 });
  const current = state.routes[state.index]?.name;

  const go = (route: string) => {
    tap();
    navigation.navigate(route);
    navigation.closeDrawer();
  };

  const startChat = () => {
    tap();
    requestNewChat();
    navigation.navigate('index');
    navigation.closeDrawer();
  };

  const openChat = (id: string) => {
    tap();
    requestChat(id);
    navigation.navigate('index');
    navigation.closeDrawer();
  };

  const removeChat = (chat: ChatSummary) =>
    Alert.alert('Delete this chat?', chat.title || 'New chat', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteChat(chat.id);
            if (chat.id === openId) requestNewChat();
            queryClient.setQueryData<ChatSummary[]>(['leo-chats'], (list) => list?.filter((c) => c.id !== chat.id));
          } catch (err) {
            toast(errorMessage(err), 'error');
          }
        },
      },
    ]);

  const groups = groupChats(chats.data ?? []);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.brand}>
        <Wordmark size={23} animate />
      </View>

      <FillPress onPress={startChat} style={styles.newChat} accessibilityLabel="New chat with Leo">
        <Ionicons name="add" size={20} color="#fff" />
        <Txt variant="bodyStrong" color="#fff" style={styles.flex}>New chat</Txt>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </FillPress>

      <View style={styles.pages}>
        {PAGES.map((p) => {
          const on = current === p.route;
          return (
            <Pressy key={p.route} onPress={() => go(p.route)} style={[styles.page, on && styles.pageOn]} scaleTo={0.98} accessibilityState={{ selected: on }}>
              <Ionicons name={on ? p.iconOn : p.icon} size={20} color={on ? colors.ink : colors.text} />
              <Txt variant={on ? 'bodyStrong' : 'body'} color={colors.ink}>{p.label}</Txt>
            </Pressy>
          );
        })}
        {!user?.isPro ? (
          <Pressy
            onPress={() => {
              navigation.closeDrawer();
              router.push('/pro' as never);
            }}
            style={styles.page}
            scaleTo={0.98}>
            <Ionicons name="diamond-outline" size={20} color={colors.brand} />
            <Txt variant="body" color={colors.ink} style={styles.flex}>Go Pro</Txt>
          </Pressy>
        ) : null}
      </View>

      <View style={styles.rule} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.chats} showsVerticalScrollIndicator={false}>
        {chats.isLoading ? (
          <View style={{ gap: 10, paddingHorizontal: space.sm, paddingTop: space.sm }}>
            <Skeleton width="50%" height={12} />
            <Skeleton height={16} />
            <Skeleton width="80%" height={16} />
            <Skeleton width="65%" height={16} />
          </View>
        ) : chats.error ? (
          <Pressy onPress={() => void chats.refetch()} style={styles.note}>
            <Txt variant="small">{"Couldn't load your chats. Tap to retry."}</Txt>
          </Pressy>
        ) : !groups.length ? (
          <View style={styles.note}>
            <Txt variant="small">Your chats with Leo will show up here.</Txt>
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.title} style={styles.group}>
              <Txt variant="label" style={styles.groupTitle}>{g.title}</Txt>
              {g.chats.map((c) => {
                const on = current === 'index' && c.id === openId;
                return (
                  <Pressy
                    key={c.id}
                    onPress={() => openChat(c.id)}
                    onLongPress={() => removeChat(c)}
                    delayLongPress={350}
                    style={[styles.chat, on && styles.pageOn]}
                    scaleTo={0.985}
                    accessibilityHint="Hold to delete">
                    <Txt variant={on ? 'bodyStrong' : 'body'} color={colors.ink} numberOfLines={1}>{c.title || 'New chat'}</Txt>
                  </Pressy>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <Pressy
        onPress={() => go('me')}
        style={[styles.profile, { paddingBottom: Math.max(insets.bottom, space.md) }, current === 'me' && styles.profileOn]}
        scaleTo={0.99}
        accessibilityLabel="Your profile and settings">
        <Avatar name={user?.name || ''} uri={user?.avatar} size={38} />
        <View style={styles.flex}>
          <Txt variant="bodyStrong" color={colors.ink} numberOfLines={1}>{user?.name || 'You'}</Txt>
          <Txt variant="tiny" numberOfLines={1}>{user?.isPro ? 'Pro plan' : 'Free plan'}</Txt>
        </View>
        <Ionicons name="settings-outline" size={19} color={colors.muted} />
      </Pressy>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg, height: 48 },
  newChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: space.md,
    marginTop: space.sm,
    paddingHorizontal: space.md,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  pages: { paddingHorizontal: space.sm, paddingTop: space.md, gap: 2 },
  page: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 44, paddingHorizontal: space.md, borderRadius: radius.sm },
  pageOn: { backgroundColor: colors.surfaceAlt },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: space.lg, marginTop: space.md },
  chats: { paddingHorizontal: space.sm, paddingBottom: space.lg },
  group: { paddingTop: space.md },
  groupTitle: { paddingHorizontal: space.md, paddingBottom: 6 },
  chat: { height: 40, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.sm },
  note: { padding: space.md },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  profileOn: { backgroundColor: colors.surfaceAlt },
});
