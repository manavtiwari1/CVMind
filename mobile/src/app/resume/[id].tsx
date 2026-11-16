import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/AuthHeader';
import { ResumeCanvas, type CanvasHandle } from '@/components/ResumeCanvas';
import { Button, Input, Pressy, Sheet, Txt, useToast } from '@/components/ui';
import { useWorks } from '@/hooks/useWorks';
import { errorMessage } from '@/lib/api';
import { success } from '@/lib/haptics';
import { saveResume, sanitizeResumeHtml } from '@/lib/resume';
import { useSession } from '@/lib/session';
import { downloadPdf, workId, workLabel } from '@/lib/works';
import { colors, radius, space } from '@/theme';

// The resume (or cover letter) editor: tap text on the page to change it, save to My Documents
// (the same document as on cvmind.in), and download or share the PDF.
export default function ResumeEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useWorks();
  const canvas = useRef<CanvasHandle>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<'save' | 'pdf' | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
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
      <SafeAreaView style={[styles.fill, { padding: space.xl }]}>
        <BackButton />
        <Txt>This document was deleted or moved.</Txt>
      </SafeAreaView>
    );
  }
  const name = title ?? work.title;

  const save = async (quiet = false): Promise<string | null> => {
    setBusy('save');
    try {
      const html = sanitizeResumeHtml(await canvas.current!.getHtml());
      await saveResume(user.id, { title: name, type: work.type, templateId: work.templateId || 'cv-ivy-league', htmlContent: html, workId: workId(work) });
      await queryClient.invalidateQueries({ queryKey: ['works'] });
      setDirty(false);
      if (!quiet) {
        success();
        toast('Saved', 'success');
      }
      return html;
    } catch (err) {
      toast(errorMessage(err, 'Could not save. Please try again.'), 'error');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const pdf = async () => {
    const html = dirty ? await save(true) : sanitizeResumeHtml(await canvas.current!.getHtml().catch(() => work.htmlContent || ''));
    if (!html) return;
    setBusy('pdf');
    try {
      const file = await downloadPdf(html, name);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: file.name, UTI: 'com.adobe.pdf' });
    } catch (err) {
      toast(errorMessage(err, 'Could not create the PDF. Please try again.'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const leave = () => {
    if (!dirty) return router.back();
    Alert.alert('Save your changes?', 'You changed this document.', [
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      {
        text: 'Save',
        onPress: async () => {
          if (await save(true)) router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
      <View style={styles.header}>
        <BackButton onPress={leave} />
        <Pressy
          onPress={() => {
            setDraftTitle(name);
            setRenaming(true);
          }}
          style={styles.titleBox}
          accessibilityLabel="Rename">
          <Txt variant="heading" numberOfLines={1} style={{ flexShrink: 1 }}>{name}</Txt>
          <Ionicons name="pencil" size={14} color={colors.muted} />
        </Pressy>
        <Button title={dirty ? 'Save' : 'Saved'} size="sm" icon={dirty ? 'save-outline' : 'checkmark'} variant={dirty ? 'primary' : 'secondary'} loading={busy === 'save'} disabled={!dirty || !!busy} onPress={() => void save()} />
      </View>
      <Txt variant="small" style={styles.hint}>{workLabel(work.type)} · Tap any text to change it. Pinch to zoom.</Txt>

      {/* Lifts the page above the keyboard so the line being typed stays in view */}
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <View style={styles.canvas}>
          <ResumeCanvas ref={canvas} html={work.htmlContent || ''} onDirty={() => setDirty(true)} />
        </View>

        <View style={styles.actions}>
          <Button title="Download PDF" icon="download-outline" loading={busy === 'pdf'} disabled={!!busy} onPress={pdf} style={{ flex: 1 }} />
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={renaming} onClose={() => setRenaming(false)}>
        <Txt variant="heading">Rename</Txt>
        <Input value={draftTitle} onChangeText={setDraftTitle} autoFocus maxLength={100} />
        <Button
          title="Done"
          onPress={() => {
            if (draftTitle.trim() && draftTitle.trim() !== name) {
              setTitle(draftTitle.trim());
              setDirty(true);
            }
            setRenaming(false);
          }}
        />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm },
  titleBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  hint: { paddingHorizontal: space.lg, marginTop: 6 },
  canvas: { flex: 1, margin: space.md, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  actions: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.sm },
});
