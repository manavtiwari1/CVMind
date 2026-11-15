import { router } from 'expo-router';
import { Image } from 'expo-image';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { onAppEvent } from '@/lib/events';
import { LEO, type LeoPose } from '@/lib/leo';
import { space } from '@/theme';

import { Button, Sheet, Txt } from './ui';

// App-wide sheets the backend's refusals and unfinished tools open: "coming soon",
// "weekly limit reached" and "verify your email".

type SheetState =
  | { kind: 'soon'; title: string; pose: LeoPose }
  | { kind: 'upgrade'; reason: 'limit' | 'tokens' | 'learn-leo'; message?: string }
  | { kind: 'verify' }
  | null;

const SheetsContext = createContext<{ comingSoon: (title: string, pose?: LeoPose) => void }>({ comingSoon: () => {} });
export const useSheets = () => use(SheetsContext);

const UPGRADE_TEXT = {
  limit: "You've used this week's free uses of this tool. They reset every week, or go Pro for unlimited use.",
  tokens: "You've used this week's free AI allowance. It resets every week, or go Pro for a bigger allowance.",
  'learn-leo': "You've finished today's free lessons. Come back tomorrow, or go Pro for more.",
} as const;

export function GlobalSheets({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<SheetState>(null);
  const close = () => setSheet(null);

  useEffect(
    () =>
      onAppEvent((e) => {
        if (e.type === 'upgrade-required') setSheet({ kind: 'upgrade', reason: e.reason, message: e.message });
        else if (e.type === 'verify-required') setSheet({ kind: 'verify' });
        else if (e.type === 'coming-soon') setSheet({ kind: 'soon', title: 'This tool', pose: 'idea' });
      }),
    [],
  );

  const pose: LeoPose = sheet?.kind === 'soon' ? sheet.pose : sheet?.kind === 'verify' ? 'checklist' : 'growth';

  return (
    <SheetsContext value={{ comingSoon: (title, p = 'idea') => setSheet({ kind: 'soon', title, pose: p }) }}>
      {children}
      <Sheet visible={!!sheet} onClose={close}>
        <View style={styles.body}>
          <Image source={LEO[pose]} style={styles.leo} contentFit="contain" />
          {sheet?.kind === 'soon' ? (
            <>
              <Txt variant="title" center>{sheet.title} is almost here</Txt>
              <Txt center color="#6b7280">
                {"We're bringing it to the app in the next update. Until then it works on cvmind.in with the same account."}
              </Txt>
              <Button title="Got it" onPress={close} style={styles.full} />
            </>
          ) : sheet?.kind === 'upgrade' ? (
            <>
              <Txt variant="title" center>{"You've hit this week's limit"}</Txt>
              <Txt center color="#6b7280">{sheet.message || UPGRADE_TEXT[sheet.reason]}</Txt>
              <Button title="Okay" onPress={close} style={styles.full} />
            </>
          ) : sheet?.kind === 'verify' ? (
            <>
              <Txt variant="title" center>Verify your email first</Txt>
              <Txt center color="#6b7280">This tool needs a verified email. It takes one tap from the link we sent you.</Txt>
              <Button
                title="Verify email"
                onPress={() => {
                  close();
                  router.push('/verify-email');
                }}
                style={styles.full}
              />
            </>
          ) : null}
        </View>
      </Sheet>
    </SheetsContext>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: space.md, paddingBottom: space.sm },
  leo: { width: 120, height: 120 },
  full: { alignSelf: 'stretch', marginTop: space.sm },
});
