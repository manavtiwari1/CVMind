import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { FillPress } from '@/components/ui/FillPress';
import { useSheets } from '@/components/GlobalSheets';
import { LeoCard, type CardActions } from '@/components/leo/Cards';
import { Markdown } from '@/components/Markdown';
import { Pressy, Txt, useToast } from '@/components/ui';
import { toolById } from '@/data/tools';
import { ApiError, errorMessage } from '@/lib/api';
import { APP_URL } from '@/lib/config';
import { greeting } from '@/lib/festive';
import { tap as hapticTap } from '@/lib/haptics';
import { LEO } from '@/lib/leo';
import { handleChatRequests, setOpenChat } from '@/lib/leoChat';
import {
  attachResume, getChat, sendFeedback, streamAction, streamChat, toMessages,
  type ChatMessage, type Resume, type StreamHandlers,
} from '@/lib/leoApi';
import { openTool } from '@/lib/openTool';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, shadow, space } from '@/theme';

const SUGGESTIONS = [
  { icon: 'document-text', title: 'Check my resume', prompt: "Check my resume's ATS score and tell me what to fix" },
  { icon: 'git-compare', title: 'Tailor to a job', prompt: 'Tailor my resume for this job: ', fill: true },
  { icon: 'mail-open', title: 'Write a cover letter', prompt: 'Write a cover letter for this job: ', fill: true },
  { icon: 'chatbubbles', title: 'Interview questions', prompt: 'Give me interview questions for a Software Engineer intern role' },
  { icon: 'briefcase', title: 'Find jobs', prompt: 'Find React developer jobs in Bangalore' },
  { icon: 'map', title: 'Plan my career', prompt: 'Make me a 1-year roadmap to become a Data Analyst' },
] as const;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const newId = () => Math.random().toString(36).slice(2, 10);

// Three dots while Leo thinks
function Typing() {
  return (
    <View style={styles.typing}>
      <Dot delay={0} />
      <Dot delay={160} />
      <Dot delay={320} />
    </View>
  );
}
function Dot({ delay }: { delay: number }) {
  const value = useSharedValue(0.3);
  useEffect(() => {
    value.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 380 }), withTiming(0.3, { duration: 380 })), -1)));
  }, [value, delay]);
  const style = useAnimatedStyle(() => ({ opacity: value.get(), transform: [{ translateY: (1 - value.get()) * 3 }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

function UserBubble({ m }: { m: ChatMessage }) {
  return (
    <Animated.View entering={FadeInDown.springify().damping(20)} style={styles.userWrap}>
      {m.attachment ? (
        <View style={styles.attachTag}>
          <Ionicons name="document-attach" size={14} color={colors.brand} />
          <Txt variant="tiny" color={colors.brand} numberOfLines={1}>{m.attachment}</Txt>
        </View>
      ) : null}
      <View style={styles.userBubble}>
        <Txt color={colors.ink}>{m.text}</Txt>
      </View>
    </Animated.View>
  );
}

function LeoBubble({ m, latest, actions, onFeedback }: { m: ChatMessage; latest: boolean; actions: CardActions; onFeedback: (m: ChatMessage, v: 'up' | 'down' | null) => void }) {
  const toast = useToast();
  const empty = !m.lead && !m.text && !m.cards.length && !m.tools.length && !m.error;
  const copyText = [m.lead, m.text].filter(Boolean).join('\n\n');
  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.leoWrap}>
      <Image source={LEO.hello} style={styles.leoAvatar} contentFit="cover" />
      <View style={styles.leoBody}>
        {m.streaming && empty ? <Typing /> : null}
        {m.lead ? <Markdown>{m.lead}</Markdown> : null}
        {m.tools.map((t) => (
          <View key={t.id} style={styles.tool}>
            {t.done ? <Ionicons name="checkmark-circle" size={16} color={colors.teal} /> : <ActivityIndicator size="small" color={colors.brand} />}
            <Txt variant="small" color={t.done ? colors.muted : colors.text}>{t.label}</Txt>
          </View>
        ))}
        {m.cards.map((c, i) => (
          <Animated.View key={i} entering={FadeInDown.springify().damping(18)}>
            <LeoCard card={c} actions={actions} live={latest && !m.streaming} />
          </Animated.View>
        ))}
        {m.text ? <Markdown>{m.text}</Markdown> : null}
        {m.error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Txt variant="small" color={colors.danger} style={{ flex: 1 }}>{m.error}</Txt>
          </View>
        ) : null}
        {!m.streaming && copyText ? (
          <View style={styles.msgActions}>
            <Pressy
              onPress={async () => {
                await Clipboard.setStringAsync(copyText);
                toast('Copied', 'success');
              }}
              style={styles.msgBtn}
              accessibilityLabel="Copy reply">
              <Ionicons name="copy-outline" size={16} color={colors.muted} />
            </Pressy>
            {m.turnId ? (
              <>
                <Pressy onPress={() => onFeedback(m, m.feedback === 'up' ? null : 'up')} style={styles.msgBtn} accessibilityLabel="Good reply">
                  <Ionicons name={m.feedback === 'up' ? 'thumbs-up' : 'thumbs-up-outline'} size={16} color={m.feedback === 'up' ? colors.teal : colors.muted} />
                </Pressy>
                <Pressy onPress={() => onFeedback(m, m.feedback === 'down' ? null : 'down')} style={styles.msgBtn} accessibilityLabel="Bad reply">
                  <Ionicons name={m.feedback === 'down' ? 'thumbs-down' : 'thumbs-down-outline'} size={16} color={m.feedback === 'down' ? colors.rose : colors.muted} />
                </Pressy>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

export default function LeoScreen() {
  const { user } = useSession();
  const { comingSoon } = useSheets();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const resumeDirty = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInputInstance>(null);
  const retryRef = useRef('');
  const firstName = (user?.name || '').split(' ')[0];
  const insets = useSafeAreaInsets();
  const [keyboardUp, setKeyboardUp] = useState(false);

  const patch = (id: string, fn: (m: ChatMessage) => ChatMessage) => setMessages((list) => list.map((m) => (m.id === id ? fn(m) : m)));

  const run = useCallback(
    async (text: string, opts: { withResume?: Resume | null; action?: 'choose' | 'confirm' | 'template'; value?: Record<string, string> } = {}) => {
      if (!text || sending) return;
      const current = opts.withResume === undefined ? resume : opts.withResume;
      setInput('');
      setSending(true);
      hapticTap();
      const userMsg: ChatMessage = { id: newId(), role: 'user', text, cards: [], tools: [], attachment: opts.action ? undefined : current?.name };
      const leoMsg: ChatMessage = { id: newId(), role: 'leo', text: '', cards: [], tools: [], streaming: true };
      setMessages((list) => [...list, userMsg, leoMsg]);

      const base = { conversationId, ...(resumeDirty.current ? { resume: current?.text ? current : null } : {}) };
      const controller = new AbortController();
      abortRef.current = controller;
      let isNew = false;
      const handlers: StreamHandlers = {
        onMeta: (meta) => {
          if (meta.conversationId && meta.conversationId !== conversationId) {
            isNew = !conversationId;
            setConversationId(meta.conversationId);
          }
        },
        onDelta: (delta) => patch(leoMsg.id, (m) => ({ ...m, text: m.text + delta })),
        onTool: (tool) =>
          patch(leoMsg.id, (m) => ({
            ...m,
            ...(m.tools.length === 0 && m.text ? { lead: m.text, text: '' } : {}),
            tools: [...m.tools, { id: tool.id, name: tool.name, label: tool.label, done: false }],
          })),
        onProgress: () => {},
        onCard: ({ id, card }) =>
          patch(leoMsg.id, (m) => ({ ...m, tools: m.tools.map((t) => (t.id === id ? { ...t, done: true } : t)), cards: [...m.cards, card] })),
        onFlow: () => {},
        onDone: (done) => patch(leoMsg.id, (m) => ({ ...m, turnId: done.turnId, streaming: false, tools: m.tools.map((t) => ({ ...t, done: true })) })),
      };
      try {
        if (opts.action) await streamAction({ ...base, action: opts.action, value: opts.value }, handlers, controller.signal);
        else await streamChat({ ...base, message: text }, handlers, controller.signal);
        resumeDirty.current = false;
        if (isNew) void queryClient.invalidateQueries({ queryKey: ['leo-chats'] });
      } catch (err) {
        const aborted = (err as Error)?.name === 'AbortError';
        patch(leoMsg.id, (m) => ({
          ...m,
          streaming: false,
          tools: m.tools.map((t) => ({ ...t, done: true })),
          error: aborted ? undefined : err instanceof ApiError || err instanceof Error ? errorMessage(err) : 'Something went wrong. Please try again.',
        }));
      } finally {
        abortRef.current = null;
        setSending(false);
      }
    },
    [sending, resume, conversationId, queryClient],
  );

  const send = (raw: string, withResume?: Resume | null) => run(raw.trim(), { withResume });

  const pickFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const file = picked.assets[0];
    if (file.size && file.size > MAX_FILE_BYTES) {
      toast('That file is over 5 MB. Please attach a smaller PDF or DOCX.', 'error');
      return;
    }
    setAttaching(true);
    try {
      const read = await attachResume({ uri: file.uri, name: file.name, mimeType: file.mimeType });
      setResume(read);
      resumeDirty.current = true;
      // Leo asked for a resume: ask again now that it's here
      const retry = retryRef.current;
      retryRef.current = '';
      if (retry) void send(retry, read);
      else toast(`${read.name} attached`, 'success');
    } catch (err) {
      toast(errorMessage(err, "We couldn't read that file."), 'error');
    } finally {
      setAttaching(false);
    }
  };

  const actions: CardActions = {
    tap: (action, value, label) => void run(label, { action, value }),
    attach: () => {
      retryRef.current = [...messages].reverse().find((m) => m.role === 'user')?.text ?? '';
      void pickFile();
    },
    openPage: (page) => {
      const tool = toolById(page) ?? toolById(page.replace(/^resume-editor$/, 'resume-builder'));
      if (tool) openTool(tool, comingSoon);
      else WebBrowser.openBrowserAsync(`${APP_URL}/${page}`).catch(() => {});
    },
    upgrade: () => router.push('/pro' as never),
  };

  const onFeedback = async (m: ChatMessage, value: 'up' | 'down' | null) => {
    if (!m.turnId) return;
    patch(m.id, (x) => ({ ...x, feedback: value }));
    try {
      await sendFeedback(m.turnId, value);
    } catch {
      patch(m.id, (x) => ({ ...x, feedback: m.feedback }));
    }
  };

  const newChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setResume(null);
    resumeDirty.current = false;
    setInput('');
  };

  const openChat = async (id: string) => {
    if (id === conversationId) return;
    abortRef.current?.abort();
    setLoadingChat(true);
    try {
      const chat = await getChat(id);
      setMessages(toMessages(chat));
      setConversationId(chat.id);
      setResume(chat.resumeName ? { name: chat.resumeName, text: '' } : null);
      resumeDirty.current = false;
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setLoadingChat(false);
    }
  };

  // With the keyboard down the composer clears the phone's nav bar; with it up it sits on the keyboard
  useEffect(() => {
    const up = Keyboard.addListener('keyboardDidShow', () => setKeyboardUp(true));
    const down = Keyboard.addListener('keyboardDidHide', () => setKeyboardUp(false));
    return () => {
      up.remove();
      down.remove();
    };
  }, []);

  // The side menu highlights the open chat and can open another one or start fresh
  useEffect(() => {
    setOpenChat(conversationId);
  }, [conversationId]);
  const requests = useRef({ newChat, openChat });
  useEffect(() => {
    requests.current = { newChat, openChat };
  });
  useEffect(
    () =>
      handleChatRequests((req) => {
        if (req.kind === 'new') requests.current.newChat();
        else void requests.current.openChat(req.id);
      }),
    [],
  );

  // Keep the newest message in view while Leo writes
  useEffect(() => {
    if (messages.length) requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages]);

  const latestLeo = [...messages].reverse().find((m) => m.role === 'leo')?.id;
  const canSend = !!input.trim() && !sending;

  return (
    <SafeAreaView edges={['top']} style={styles.fill}>
      <AppHeader
        center={
          <View style={styles.titleRow}>
            <Image source={LEO.hello} style={styles.titleLeo} contentFit="cover" />
            <Txt variant="heading">Leo</Txt>
          </View>
        }
        right={
          messages.length ? (
            <Pressy onPress={newChat} style={styles.iconBtn} accessibilityLabel="New chat">
              <Ionicons name="create-outline" size={22} color={colors.ink} />
            </Pressy>
          ) : null
        }
      />

      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        {loadingChat ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : messages.length === 0 ? (
          <FlatList
            data={SUGGESTIONS}
            keyExtractor={(s) => s.title}
            numColumns={2}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.emptyContent}
            columnWrapperStyle={{ gap: space.sm }}
            ListHeaderComponent={
              <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
                <View style={styles.heroRing}>
                  <Image source={LEO.idea} style={styles.heroLeo} contentFit="contain" />
                </View>
                <Txt variant="hero" center>{greeting()}{firstName ? `, ${firstName}` : ''}</Txt>
                <Txt center color={colors.muted}>What do you want to do today?</Txt>
              </Animated.View>
            }
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(80 + index * 40).springify()} style={{ flex: 1 }}>
                <Pressy
                  onPress={() => {
                    if ('fill' in item && item.fill) {
                      setInput(item.prompt);
                      inputRef.current?.focus();
                    } else void send(item.prompt);
                  }}
                  style={styles.suggestion}>
                  <Ionicons name={item.icon} size={18} color={colors.brand} />
                  <Txt variant="smallStrong" style={{ flex: 1 }}>{item.title}</Txt>
                </Pressy>
              </Animated.View>
            )}
          />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.thread}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) =>
              item.role === 'user' ? <UserBubble m={item} /> : <LeoBubble m={item} latest={item.id === latestLeo} actions={actions} onFeedback={onFeedback} />
            }
          />
        )}

        <View style={[styles.composerWrap, { paddingBottom: keyboardUp ? space.sm : Math.max(insets.bottom, space.sm) }]}>
          {resume ? (
            <View style={styles.resumeChip}>
              <Ionicons name="document-attach" size={15} color={colors.brand} />
              <Txt variant="smallStrong" color={colors.brand} numberOfLines={1} style={{ flex: 1 }}>{resume.name || 'Your resume'}</Txt>
              <Pressy
                onPress={() => {
                  setResume(null);
                  resumeDirty.current = true;
                }}
                hitSlop={8}
                accessibilityLabel="Remove resume">
                <Ionicons name="close" size={17} color={colors.brand} />
              </Pressy>
            </View>
          ) : null}
          <View style={styles.composer}>
            <Pressy onPress={pickFile} style={styles.attachBtn} accessibilityLabel="Attach resume" disabled={attaching || sending}>
              {attaching ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="attach" size={22} color={colors.muted} />}
            </Pressy>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder={messages.length ? 'Reply to Leo…' : 'Ask Leo anything about your career…'}
              placeholderTextColor={colors.faint}
              multiline
              maxLength={4000}
              style={styles.input}
            />
            {sending ? (
              <Pressy onPress={() => abortRef.current?.abort()} style={[styles.sendBtn, styles.stopBtn]} accessibilityLabel="Stop">
                <Ionicons name="stop" size={16} color="#fff" />
              </Pressy>
            ) : (
              <FillPress onPress={() => void send(input)} disabled={!canSend} style={[styles.sendBtn, !canSend && styles.sendOff]} accessibilityLabel="Send">
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </FillPress>
            )}
          </View>
          <Txt variant="tiny" center>Leo can make mistakes. Check important details.</Txt>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleLeo: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.brandSoft },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  emptyContent: { padding: space.xl, gap: space.sm },
  hero: { alignItems: 'center', gap: 6, marginBottom: space.xl },
  heroRing: { width: 150, height: 150, borderRadius: 75, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: space.md, ...shadow.card },
  heroLeo: { width: 128, height: 128 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: space.md, minHeight: 56, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  thread: { padding: space.lg, paddingBottom: space.xl, gap: space.lg },
  userWrap: { alignItems: 'flex-end', gap: 4, paddingLeft: 48 },
  userBubble: { backgroundColor: colors.brandSoft, borderRadius: radius.lg, borderBottomRightRadius: 6, paddingHorizontal: space.lg, paddingVertical: space.md },
  attachTag: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 220 },
  leoWrap: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  leoAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, marginTop: 2 },
  leoBody: { flex: 1, gap: space.md },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  errorBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', padding: space.md, borderRadius: radius.md, backgroundColor: colors.dangerSoft },
  msgActions: { flexDirection: 'row', gap: 4, marginTop: -4 },
  msgBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  typing: { flexDirection: 'row', gap: 5, paddingVertical: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  composerWrap: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.sm, gap: 6, backgroundColor: colors.bg },
  resumeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '85%', backgroundColor: colors.brandSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, backgroundColor: colors.surface, borderRadius: 26, borderWidth: 1, borderColor: colors.border, padding: 6, ...shadow.card },
  attachBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, maxHeight: 140, minHeight: 40, fontFamily: fonts.regular, fontSize: 15.5, color: colors.ink, paddingVertical: 9, paddingHorizontal: 4 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  sendOff: { backgroundColor: colors.borderStrong },
  stopBtn: { backgroundColor: colors.ink },
});
