import { Ionicons } from '@expo/vector-icons';
import { createContext, use, useCallback, useRef, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { success as hapticSuccess, warn } from '@/lib/haptics';
import { colors, radius, shadow, space } from '@/theme';

import { Txt } from './Txt';

type Kind = 'success' | 'error' | 'info';
type ToastFn = (message: string, kind?: Kind) => void;

const ToastContext = createContext<ToastFn>(() => {});

const ICON = { success: 'checkmark-circle', error: 'alert-circle', info: 'information-circle' } as const;
const TINT = { success: colors.teal, error: colors.danger, info: colors.brand } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ id: number; message: string; kind: Kind } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<ToastFn>((message, kind = 'info') => {
    if (kind === 'success') hapticSuccess();
    if (kind === 'error') warn();
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, kind });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={FadeInUp.springify().damping(18)}
          exiting={FadeOutUp.duration(160)}
          pointerEvents="none"
          style={[styles.toast, { top: insets.top + space.sm }]}
          accessibilityLiveRegion="polite">
          <Ionicons name={ICON[toast.kind]} size={20} color={TINT[toast.kind]} />
          <Txt variant="smallStrong" style={styles.text}>{toast.message}</Txt>
        </Animated.View>
      ) : null}
    </ToastContext>
  );
}

export const useToast = () => use(ToastContext);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.raised,
  },
  text: { flex: 1 },
});
