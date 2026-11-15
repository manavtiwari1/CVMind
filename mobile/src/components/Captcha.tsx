import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const captchaPage = (svg: string) =>
  `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#fff}body{display:flex;align-items:center;justify-content:center}svg{width:100%;height:100%}</style></head><body>${svg}</body></html>`;

import { api } from '@/lib/api';
import { colors, radius } from '@/theme';

import { Input, Pressy, Txt } from './ui';

export type CaptchaHandle = { refresh: () => void; value: () => { captchaId?: string; captchaAnswer: string } };

// The backend's picture code (GET /api/auth/captcha). Each code works once, so it reloads after a failed try.
export const Captcha = forwardRef<CaptchaHandle, { onSubmit?: () => void }>(function Captcha({ onSubmit }, ref) {
  const [challenge, setChallenge] = useState<{ id: string; svg: string } | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    setAnswer('');
    try {
      const data = await api<{ captchaId: string; svg: string }>('/api/auth/captcha', { anonymous: true });
      setChallenge({ id: data.captchaId, svg: data.svg });
    } catch {
      setChallenge(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useImperativeHandle(ref, () => ({ refresh: () => void refresh(), value: () => ({ captchaId: challenge?.id, captchaAnswer: answer.trim() }) }), [refresh, challenge, answer]);

  return (
    <View style={styles.wrap}>
      <Txt variant="smallStrong">Type the code you see</Txt>
      <View style={styles.row}>
        <View style={styles.image}>
          {loading ? (
            <ActivityIndicator color={colors.brand} />
          ) : challenge ? (
            // A WebView draws the SVG like the website does. react-native-svg drops its <text>
            // letters on Android (font-family="Georgia, serif" isn't a font it can resolve).
            <WebView
              originWhitelist={['*']}
              source={{ html: captchaPage(challenge.svg) }}
              style={styles.web}
              scrollEnabled={false}
              javaScriptEnabled={false}
              pointerEvents="none"
              accessibilityLabel="Captcha code picture"
            />
          ) : (
            <Txt variant="small">{failed ? "Couldn't load" : ''}</Txt>
          )}
        </View>
        <Pressy onPress={() => void refresh()} style={styles.reload} accessibilityLabel="New code">
          <Ionicons name="refresh" size={20} color={colors.brand} />
        </Pressy>
      </View>
      <Input
        value={answer}
        onChangeText={setAnswer}
        placeholder="Code"
        icon="shield-checkmark-outline"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  image: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  web: { width: '100%', height: '100%', backgroundColor: 'transparent' },
  reload: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
});
