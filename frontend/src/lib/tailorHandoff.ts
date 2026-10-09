// Hands a job description to the Resume Tailor when another tool opens it in a new tab
// (localStorage, since a new tab doesn't share sessionStorage). Read once, and only while fresh.
const KEY = 'cvmind_tailor_job';
const MAX_AGE_MS = 10 * 60 * 1000;

export function saveTailorJob(description: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ description: description.slice(0, 15000), at: Date.now() }));
  } catch { /* storage full or blocked: the user pastes it instead */ }
}

export function takeTailorJob(): string {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return '';
    localStorage.removeItem(KEY);
    const { description, at } = JSON.parse(raw) as { description?: string; at?: number };
    return typeof description === 'string' && typeof at === 'number' && Date.now() - at < MAX_AGE_MS ? description : '';
  } catch {
    return '';
  }
}
