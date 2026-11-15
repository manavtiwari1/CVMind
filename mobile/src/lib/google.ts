import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';

import { api } from './api';
import { GOOGLE_WEB_CLIENT_ID } from './config';

let configured = false;

/**
 * The phone's Google account picker, then the website's own check (/api/auth/google), so a
 * Google account is the same CVMind account in the app and on the site.
 * Returns null when the user closes the picker.
 */
export async function signInWithGoogle(): Promise<Record<string, unknown> | null> {
  if (!configured) {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, scopes: ['email', 'profile'] });
    configured = true;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return null;
    const token = res.data.idToken;
    if (!token) throw new Error('Google did not return your account. Please try again.');
    const data = await api<{ user: Record<string, unknown> }>('/api/auth/google', { method: 'POST', body: { token }, anonymous: true });
    return data.user;
  } catch (err) {
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED || err.code === statusCodes.IN_PROGRESS) return null;
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Google Play services are needed for Google sign-in.');
      // DEVELOPER_ERROR: the Android OAuth client (package + SHA-1) isn't set up in Google Cloud yet
      if (String(err.code) === '10' || /DEVELOPER_ERROR/i.test(String(err.message))) {
        throw new Error('Google sign-in is not ready in this version of the app yet. Please use email for now.');
      }
    }
    throw err;
  }
}
