import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { API_BASE } from '../lib/apiBase';
import './AppUpdateGate.css';

// The Capacitor Android app bundles this web build, so the bundle's version is the app's version.
// Keep it in step with versionName in android/app/build.gradle.
export const ANDROID_APP_VERSION = '1.0';

interface Verdict {
  verdict: 'ok' | 'recommended' | 'required';
  message: string;
  updateUrl: string;
  latestVersion: string;
}

// In the Android app only: blocks old versions the admin marked as unsupported, and nudges outdated ones
export default function AppUpdateGate() {
  const [info, setInfo] = useState<Verdict | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    let cancelled = false;
    fetch(`${API_BASE}/api/config/version?client=android&v=${ANDROID_APP_VERSION}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && d.verdict !== 'ok') setInfo(d); })
      .catch(() => { /* never block the app on a network error */ });
    return () => { cancelled = true; };
  }, []);

  if (!info || (info.verdict === 'recommended' && dismissed)) return null;

  if (info.verdict === 'required') {
    return (
      <div className="aug-block" role="alertdialog" aria-modal="true" aria-labelledby="aug-title">
        <div className="aug-card">
          <h2 id="aug-title">Update CV Mind</h2>
          <p>{info.message || `Version ${ANDROID_APP_VERSION} is no longer supported. Please update to keep using CV Mind.`}</p>
          {info.updateUrl && <a className="aug-btn" href={info.updateUrl} target="_blank" rel="noreferrer">Update now</a>}
        </div>
      </div>
    );
  }

  return (
    <div className="aug-bar" role="status">
      <span>{info.message || `Version ${info.latestVersion} of CV Mind is available.`}</span>
      {info.updateUrl && <a href={info.updateUrl} target="_blank" rel="noreferrer">Update</a>}
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss">✕</button>
    </div>
  );
}
