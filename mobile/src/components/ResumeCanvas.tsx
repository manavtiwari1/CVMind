import { forwardRef, useImperativeHandle, useRef, type ComponentType, type Ref } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

import { previewPage } from '@/lib/works';
import { colors } from '@/theme';

// The library types WebView without a ref, though it forwards one to the native view at runtime
type WebViewHandle = { injectJavaScript: (script: string) => void };
const EditableWebView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

export interface CanvasHandle {
  /** The edited HTML, read from the page */
  getHtml: () => Promise<string>;
}

// Tap any text on the resume to change it, like the website's editor. The locked CVMind footer
// (contenteditable="false" in the templates) stays as it is.
const EDIT_SCRIPT = `
(function () {
  var page = document.querySelector('.page');
  if (!page) return;
  page.setAttribute('contenteditable', 'true');
  page.style.outline = 'none';
  var t;
  page.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(function () { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dirty' })); }, 300);
  });
  // Paste as plain text, so styles from other apps don't break the layout
  page.addEventListener('paste', function (e) {
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  });
})();
true;
`;

const READ_SCRIPT = (id: number) => `
(function () {
  var page = document.querySelector('.page');
  var html = page ? page.innerHTML : '';
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'html', id: ${id}, html: html }));
})();
true;
`;

export const ResumeCanvas = forwardRef<CanvasHandle, { html: string; editable?: boolean; onDirty?: () => void }>(function ResumeCanvas({ html, editable = true, onDirty }, ref) {
  const web = useRef<WebViewHandle>(null);
  const waiting = useRef(new Map<number, (html: string) => void>());
  const seq = useRef(0);

  useImperativeHandle(ref, () => ({
    getHtml: () =>
      new Promise<string>((resolve, reject) => {
        const id = ++seq.current;
        waiting.current.set(id, resolve);
        web.current?.injectJavaScript(READ_SCRIPT(id));
        setTimeout(() => {
          if (waiting.current.delete(id)) reject(new Error('The editor did not answer. Please try again.'));
        }, 5000);
      }),
  }));

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type: string; id?: number; html?: string };
      if (msg.type === 'dirty') onDirty?.();
      if (msg.type === 'html' && msg.id != null) {
        const resolve = waiting.current.get(msg.id);
        waiting.current.delete(msg.id);
        resolve?.(msg.html ?? '');
      }
    } catch {
      /* not ours */
    }
  };

  return (
    <EditableWebView
      ref={web}
      originWhitelist={['*']}
      source={{ html: previewPage(html) }}
      injectedJavaScript={editable ? EDIT_SCRIPT : undefined}
      onMessage={onMessage}
      style={styles.web}
      setBuiltInZoomControls
      setDisplayZoomControls={false}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
        </View>
      )}
    />
  );
});

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#eef0f5' },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef0f5' },
});
