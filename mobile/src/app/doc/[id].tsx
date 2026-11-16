import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { AtsReport } from '@/components/AtsReport';
import { PageHeader } from '@/components/PageHeader';
import { Button, Pressy, Txt, useToast } from '@/components/ui';
import { useWorks } from '@/hooks/useWorks';
import { errorMessage } from '@/lib/api';
import { APP_URL } from '@/lib/config';
import { success } from '@/lib/haptics';
import { finishHtml, type ResumeAnalysis } from '@/lib/resume';
import { useSession } from '@/lib/session';
import { deleteWork, downloadPdf, isHtml, PRINTABLE_TYPES, previewPage, workId, workLabel } from '@/lib/works';
import { colors, radius, space } from '@/theme';

// One saved document: a live preview of the same page the website shows, a PDF made by the server
// (shared to WhatsApp, Drive, email…), and delete. Editing comes with the resume editor.
export default function DocViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useWorks();
  const [busy, setBusy] = useState<'pdf' | 'delete' | null>(null);
  const work = data?.find((w) => workId(w) === id);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    );
  }
  if (!work || !user) {
    return (
      <SafeAreaView style={styles.fill}>
        <View style={styles.pad}>
          <PageHeader title="Not found" />
          <Txt>This document was deleted or moved.</Txt>
        </View>
      </SafeAreaView>
    );
  }

  const html = work.htmlContent || '';
  // Tool results are saved as JSON (backend saveFeatureWork): an ATS check has its evaluation, a
  // tailored resume its filled template
  let payload: { evaluation?: ResumeAnalysis; fileName?: string; generatedHtml?: string } | null = null;
  if (!isHtml(work)) {
    try {
      payload = JSON.parse(html);
    } catch {
      payload = null;
    }
  }
  const pageHtml = isHtml(work) ? html : payload?.generatedHtml ? finishHtml(payload.generatedHtml) : '';
  const printable = !!pageHtml && (PRINTABLE_TYPES.includes(work.type) || !!payload?.generatedHtml);
  const editable = isHtml(work) && ['resume', 'cover-letter', 'resume-optimized'].includes(work.type);

  const sharePdf = async () => {
    setBusy('pdf');
    try {
      const file = await downloadPdf(pageHtml, work.title);
      success();
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: file.name, UTI: 'com.adobe.pdf' });
      else toast('PDF saved', 'success');
    } catch (err) {
      toast(errorMessage(err, 'Could not create the PDF. Please try again.'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const remove = () =>
    Alert.alert('Delete this document?', `"${work.title}" will be deleted from the app and from cvmind.in.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          try {
            await deleteWork(user.id, workId(work));
            await queryClient.invalidateQueries({ queryKey: ['works'] });
            toast('Deleted', 'success');
            router.back();
          } catch (err) {
            toast(errorMessage(err), 'error');
            setBusy(null);
          }
        },
      },
    ]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
      <View style={styles.pad}>
        <PageHeader
          title={work.title || workLabel(work.type)}
          right={
            <Pressy onPress={remove} style={styles.iconBtn} disabled={!!busy} accessibilityLabel="Delete">
              {busy === 'delete' ? <ActivityIndicator size="small" color={colors.danger} /> : <Ionicons name="trash-outline" size={20} color={colors.danger} />}
            </Pressy>
          }
        />
        <Txt variant="small">{workLabel(work.type)}</Txt>
      </View>

      <View style={[styles.preview, payload?.evaluation ? styles.reportBox : null]}>
        {payload?.evaluation ? (
          <ScrollView contentContainerStyle={styles.report}>
            <AtsReport report={payload.evaluation} fileName={payload.fileName} />
          </ScrollView>
        ) : pageHtml ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: previewPage(pageHtml), baseUrl: APP_URL }}
            style={styles.web}
            setBuiltInZoomControls
            setDisplayZoomControls={false}
            showsVerticalScrollIndicator={false}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator color={colors.brand} />
              </View>
            )}
            onShouldStartLoadWithRequest={(req) => {
              // Links in a document open in the browser, never inside the preview
              if (req.url.startsWith('http') && req.navigationType === 'click') {
                WebBrowser.openBrowserAsync(req.url).catch(() => {});
                return false;
              }
              return true;
            }}
          />
        ) : (
          <View style={[styles.center, styles.pad]}>
            <Ionicons name="desktop-outline" size={32} color={colors.brand} />
            <Txt variant="heading" center>{workLabel(work.type)}</Txt>
            <Txt variant="small" center>This result opens on cvmind.in for now. It is saved to the same account.</Txt>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {printable ? <Button title="Download PDF" icon="download-outline" loading={busy === 'pdf'} disabled={!!busy} onPress={sharePdf} style={styles.flex} /> : null}
        {editable ? (
          <Button title="Edit" icon="create-outline" variant="outline" onPress={() => router.push(`/resume/${encodeURIComponent(workId(work))}` as never)} style={styles.flex} />
        ) : !pageHtml && !payload?.evaluation ? (
          <Button title="Open on cvmind.in" icon="open-outline" variant="outline" onPress={() => WebBrowser.openBrowserAsync(`${APP_URL}/my-documents`).catch(() => {})} style={styles.flex} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  pad: { paddingHorizontal: space.xl, paddingTop: space.md, gap: 4 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft },
  preview: { flex: 1, margin: space.lg, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: '#eef0f5' },
  web: { flex: 1, backgroundColor: '#eef0f5' },
  reportBox: { backgroundColor: colors.bg, borderWidth: 0 },
  report: { paddingBottom: space.xl },
  actions: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.sm },
});
