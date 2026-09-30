import { useEffect } from 'react';

interface TawkApi {
  onLoad?: () => void;
  onChatMinimized?: () => void;
  hideWidget: () => void;
  showWidget: () => void;
  maximize: () => void;
}

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

export default function TawkChat() {
  useEffect(() => {
    const tawk = window.Tawk_API || ({} as TawkApi);
    window.Tawk_API = tawk;
    window.Tawk_LoadStart = new Date();

    // Hide the chat bubble by default; Contact page's "Live Support" opens it.
    // Read window.Tawk_API at call time: Tawk's script may replace the object after loading.
    tawk.onLoad = function () {
      window.Tawk_API?.hideWidget();
    };
    tawk.onChatMinimized = function () {
      window.Tawk_API?.hideWidget();
    };

    const s1 = document.createElement('script');
    s1.async = true;
    s1.src = 'https://embed.tawk.to/6a43f926113c4b1d489fcf9b/1jscoafvp';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    const s0 = document.getElementsByTagName('script')[0];
    s0.parentNode?.insertBefore(s1, s0);

    return () => {
      s1.remove();
      delete window.Tawk_API;
      delete window.Tawk_LoadStart;
    };
  }, []);

  return null;
}
