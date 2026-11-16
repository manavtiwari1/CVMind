import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { completeLetter, LETTER_DESIGNS, type LetterData } from '@web/lib/coverLetter';

import { PageHeader } from '@/components/PageHeader';
import { TemplatePicker, useProTemplates } from '@/components/TemplatePicker';
import { Button, Input, Pressy, Screen, Txt, useToast } from '@/components/ui';
import { Working } from '@/components/Working';
import { api, errorMessage } from '@/lib/api';
import { success } from '@/lib/haptics';
import { PickCancelled, pickResumeFile } from '@/lib/pickFile';
import { sanitizeResumeHtml, saveResume, type PickedFile } from '@/lib/resume';
import { useSession } from '@/lib/session';
import { colors, radius, space } from '@/theme';

const TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'conversational', label: 'Friendly' },
  { id: 'enthusiastic', label: 'Enthusiastic' },
] as const;

// Cover letter: a resume and a job in, a letter out (POST /api/cover-letter/generate), then one of
// the website's letter designs, saved to My Documents and opened in the editor.
export default function CoverLetter() {
  const { user } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const pro = useProTemplates();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [job, setJob] = useState('');
  const [company, setCompany] = useState('');
  const [tone, setTone] = useState<(typeof TONES)[number]['id']>('professional');
  const [busy, setBusy] = useState<'read' | 'write' | 'save' | null>(null);
  const [letter, setLetter] = useState<LetterData | null>(null);
  const [design, setDesign] = useState(LETTER_DESIGNS[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  const designs = useMemo(
    () => (letter ? LETTER_DESIGNS.map((d) => ({ id: d.id, name: d.name, color: d.color, html: d.render(letter) })) : []),
    [letter],
  );

  const pick = async () => {
    let f: PickedFile;
    try {
      f = await pickResumeFile();
    } catch (err) {
      if (!(err instanceof PickCancelled)) toast(errorMessage(err), 'error');
      return;
    }
    setBusy('read');
    try {
      const form = new FormData();
      form.append('resume', { uri: f.uri, name: f.name, type: f.mimeType || 'application/octet-stream' } as unknown as Blob);
      const res = await api<{ data: { resumeText: string } }>('/api/cover-letter/read-resume', { method: 'POST', form });
      setFile(f);
      setResumeText(res.data.resumeText);
    } catch (err) {
      toast(errorMessage(err, "We couldn't read that resume."), 'error');
    } finally {
      setBusy(null);
    }
  };

  const write = async () => {
    if (!resumeText) return setError('Add your resume first.');
    if (job.trim().length < 40) return setError('Paste the job description (at least a few lines) so the letter can match it.');
    setError(null);
    setBusy('write');
    try {
      const res = await api<{ data: Partial<LetterData> }>('/api/cover-letter/generate', {
        method: 'POST',
        body: { resumeText, jobDescription: job.trim(), tone, length: 'standard', company: company.trim() },
      });
      success();
      setLetter(completeLetter({ ...res.data, company: res.data.company || company.trim() }));
      void queryClient.invalidateQueries({ queryKey: ['billing-me'] });
    } catch (err) {
      setError(errorMessage(err, 'The letter was not written. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!letter || !user) return;
    const chosen = designs.find((d) => d.id === design) ?? designs[0];
    setBusy('save');
    try {
      const id = await saveResume(user.id, {
        type: 'cover-letter',
        title: `Cover Letter${letter.company ? ` - ${letter.company}` : ''}`,
        templateId: chosen.id,
        htmlContent: sanitizeResumeHtml(chosen.html),
      });
      await queryClient.invalidateQueries({ queryKey: ['works'] });
      router.replace(`/resume/${id}` as never);
    } catch (err) {
      toast(errorMessage(err), 'error');
      setBusy(null);
    }
  };

  if (busy === 'write') {
    return (
      <SafeAreaView style={styles.fill}>
        <Working title="Writing your letter" pose="typing" steps={['Reading the job…', 'Picking your best wins…', 'Writing the letter…']} />
      </SafeAreaView>
    );
  }

  if (letter) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <View style={styles.pad}>
          <PageHeader title="Pick a design" />
          <Txt variant="small">Your letter is written. Choose how it looks; you can edit the words next.</Txt>
        </View>
        <View style={styles.picker}>
          <TemplatePicker items={designs} selected={design} onSelect={setDesign} proIds={pro.letter} />
        </View>
        <View style={styles.footer}>
          <Button title="Start over" variant="outline" onPress={() => setLetter(null)} style={{ flex: 1 }} />
          <Button title="Save & edit" icon="create-outline" loading={busy === 'save'} onPress={save} style={{ flex: 2 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title="Cover Letter" />
      <Txt color={colors.muted}>A letter written for this job from your own resume, in about a minute.</Txt>
      <Pressy onPress={pick} style={[styles.file, file && styles.fileOn]} disabled={busy === 'read'} accessibilityLabel="Choose your resume">
        <Ionicons name={file ? 'document-attach' : 'cloud-upload'} size={24} color={colors.brand} />
        <View style={{ flex: 1 }}>
          <Txt variant="bodyStrong" numberOfLines={1}>{busy === 'read' ? 'Reading your resume…' : file ? file.name : 'Upload your resume'}</Txt>
          <Txt variant="small">{file ? 'Tap to change' : 'PDF or DOCX'}</Txt>
        </View>
      </Pressy>
      <Input label="Company (optional)" value={company} onChangeText={setCompany} placeholder="e.g. Razorpay" />
      <Input label="Job description" value={job} onChangeText={setJob} multiline placeholder="Paste the full job post here" style={styles.jd} />
      <View style={{ gap: 8 }}>
        <Txt variant="smallStrong">Tone</Txt>
        <View style={styles.tones}>
          {TONES.map((t) => (
            <Pressy key={t.id} onPress={() => setTone(t.id)} style={[styles.tone, tone === t.id && styles.toneOn]}>
              <Txt variant="smallStrong" color={tone === t.id ? '#fff' : colors.text}>{t.label}</Txt>
            </Pressy>
          ))}
        </View>
      </View>
      {error ? <Txt variant="small" color={colors.danger}>{error}</Txt> : null}
      <Button title="Write my letter" icon="sparkles" onPress={write} disabled={busy === 'read'} />
      <Txt variant="small" center>Free plan: 1 AI cover letter a week.</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: space.xl, paddingTop: space.md, gap: 4 },
  picker: { flex: 1, padding: space.lg },
  footer: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.sm },
  file: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.borderStrong, backgroundColor: colors.surface },
  fileOn: { borderStyle: 'solid', borderColor: colors.brand, backgroundColor: colors.brandSoft },
  jd: { minHeight: 160, textAlignVertical: 'top' },
  tones: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tone: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  toneOn: { backgroundColor: colors.brand, borderColor: colors.brand },
});
