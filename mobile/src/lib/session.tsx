import * as SecureStore from 'expo-secure-store';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setApiToken } from './api';
import { onAppEvent } from './events';

// The signed-in account, as the backend returns it from sign-in (the website's StoredUser).
// Kept in the phone's secure storage so the app stays signed in after a restart.
export interface User {
  id: string;
  name: string;
  email: string;
  token: string;
  avatar?: string;
  isGoogleUser?: boolean;
  emailVerified?: boolean;
  isPro?: boolean;
  plan?: string;
}

const KEY = 'cvmind_user';

// Uploaded profile photos come back as data: URLs, far too big for secure storage. They are saved
// as a file instead, and the session keeps the file's address.
async function keepAvatar(raw: Record<string, unknown>): Promise<Record<string, unknown>> {
  const avatar = raw.avatar;
  if (typeof avatar !== 'string' || !avatar.startsWith('data:image/')) return raw;
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(avatar);
  if (!match) return { ...raw, avatar: undefined };
  try {
    const { File, Paths } = await import('expo-file-system');
    const file = new File(Paths.document, `avatar-${Date.now()}.${match[1] === 'png' ? 'png' : 'jpg'}`);
    await file.write(match[2], { encoding: 'base64' });
    return { ...raw, avatar: file.uri };
  } catch {
    return { ...raw, avatar: undefined };
  }
}

// Secure storage is small, so keep only what the app needs (uploaded photos are big data: URLs)
function slim(raw: Record<string, unknown>): User {
  // Kept: web addresses (Google photos) and the file saved by keepAvatar
  const avatar = typeof raw.avatar === 'string' && !raw.avatar.startsWith('data:') && raw.avatar.length < 1000 ? raw.avatar : undefined;
  return {
    id: String(raw.id ?? raw._id ?? ''),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    token: String(raw.token ?? ''),
    avatar,
    isGoogleUser: !!raw.isGoogleUser,
    emailVerified: !!raw.emailVerified,
    isPro: !!raw.isPro || raw.plan === 'pro',
    plan: typeof raw.plan === 'string' ? raw.plan : undefined,
  };
}

interface SessionValue {
  user: User | null;
  /** False until the saved session has been read at start-up. */
  ready: boolean;
  /** Stores the user a sign-in, sign-up or profile edit returned. */
  signIn: (raw: Record<string, unknown>) => Promise<User>;
  update: (patch: Partial<User>) => Promise<void>;
  signOut: () => Promise<void>;
  /** A message to show on the sign-in screen after a forced sign-out. */
  notice: string | null;
  clearNotice: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

async function save(user: User | null) {
  if (user) await SecureStore.setItemAsync(KEY, JSON.stringify(user));
  else await SecureStore.deleteItemAsync(KEY);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const apply = useCallback(async (next: User | null) => {
    setApiToken(next?.token ?? null);
    setUser(next);
    await save(next);
  }, []);

  const signOut = useCallback(async () => {
    // While the token still works: stop this phone getting the account's notifications
    const { unregisterPush } = await import('./push');
    await unregisterPush();
    await apply(null);
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    GoogleSignin.signOut().catch(() => {});
  }, [apply]);

  // Read the saved session, then ask the backend whether it is still good (revoked sessions,
  // blocked or deleted accounts end here, as on the website)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let saved: User | null = null;
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        saved = raw ? (JSON.parse(raw) as User) : null;
      } catch {
        saved = null;
      }
      if (cancelled) return;
      setApiToken(saved?.token ?? null);
      setUser(saved);
      setReady(true);
      if (!saved) return;
      try {
        const status = await api<{ active: boolean; status?: string; message?: string; emailVerified?: boolean; isPro?: boolean }>('/api/auth/account-status');
        if (cancelled) return;
        if (!status.active) {
          setNotice(status.message || 'Please sign in again.');
          await apply(null);
        } else {
          const next = { ...saved, emailVerified: !!status.emailVerified, isPro: !!status.isPro };
          await apply(next);
        }
      } catch (err) {
        // 401: the session expired. Anything else (offline): keep the saved session.
        if ((err as { status?: number }).status === 401 && !cancelled) {
          setNotice('Your session has expired. Please sign in again.');
          await apply(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  // A request refused because the session ended signs the app out
  useEffect(
    () =>
      onAppEvent((e) => {
        if (e.type === 'auth-required') {
          setNotice(e.message || 'Please sign in again.');
          void apply(null);
        }
      }),
    [apply],
  );

  const value = useMemo<SessionValue>(
    () => ({
      user,
      ready,
      notice,
      clearNotice: () => setNotice(null),
      signIn: async (raw) => {
        const next = slim(await keepAvatar(raw));
        setNotice(null);
        await apply(next);
        return next;
      },
      update: async (patch) => {
        if (!user) return;
        await apply({ ...user, ...patch });
      },
      signOut,
    }),
    [user, ready, notice, apply, signOut],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  const ctx = use(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
