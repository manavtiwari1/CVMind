import Constants from 'expo-constants';

// The live backend the website uses. EXPO_PUBLIC_API_URL points a dev build at a local backend.
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://cvmindai-backend.onrender.com';

export const SITE_URL = 'https://www.cvmind.in';
export const APP_URL = 'https://app.cvmind.in';

// The web OAuth client the backend checks Google ID tokens against (GOOGLE_CLIENT_ID). The Android
// OAuth client (package + SHA-1) only has to exist in the same Google Cloud project.
export const GOOGLE_WEB_CLIENT_ID = '1036904236561-m92usq7j7pso47r9k02n9dtdmm563162.apps.googleusercontent.com';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export const LINKS = {
  privacy: `${SITE_URL}/privacy`,
  terms: `${SITE_URL}/terms`,
  refunds: `${SITE_URL}/refund-policy`,
  help: `${SITE_URL}/help-center`,
  contact: `${SITE_URL}/contact`,
  invite: (code: string) => `${SITE_URL}/?ref=${encodeURIComponent(code)}`,
};
