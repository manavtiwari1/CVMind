// Remembers which template the user clicked on a marketing page (home, resume builder landing),
// so the editor can open straight on it instead of starting Leo's guided onboarding.

const KEY = 'cvmind_picked_template';
const MAX_AGE_MS = 15 * 60 * 1000;

export function pickTemplate(id: string) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ id, at: Date.now() })); } catch { /* storage unavailable */ }
}

/** Reads the pick without clearing it (safe to call during render). */
export function peekPickedTemplate(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { id, at } = JSON.parse(raw) as { id?: string; at?: number };
    return id && at && Date.now() - at < MAX_AGE_MS ? id : null;
  } catch {
    return null;
  }
}

export function clearPickedTemplate() {
  try { sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
