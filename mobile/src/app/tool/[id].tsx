import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/PageHeader';
import { ResultView } from '@/components/ResultView';
import { Button, Card, Input, Pressy, Screen, Txt, useToast } from '@/components/ui';
import { Working } from '@/components/Working';
import { AI_TOOLS } from '@/data/aiTools';
import { api, errorMessage } from '@/lib/api';
import { success } from '@/lib/haptics';
import { LEO } from '@/lib/leo';
import { PickCancelled, pickResumeFile } from '@/lib/pickFile';
import type { PickedFile } from '@/lib/resume';
import { colors, radius, space } from '@/theme';

// One screen for every simple AI tool in data/aiTools.ts: the tool's form, the same backend call as
// the website, and the result drawn by ResultView. Results are saved to My Documents by the backend.
export default function AiToolScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tool = AI_TOOLS[id];
  const toast = useToast();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries((tool?.fields || []).filter((f) => f.options).map((f) => [f.key, f.options![0]])),
  );
  const [file, setFile] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!tool) {
    return (
      <Screen edges={['top', 'bottom']}>
        <PageHeader title="Not found" />
        <Txt>This tool is not in the app yet.</Txt>
      </Screen>
    );
  }

  const pick = async () => {
    try {
      if (tool.file?.pdfOnly) {
        const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
        if (r.canceled || !r.assets[0]) return;
        setFile({ uri: r.assets[0].uri, name: r.assets[0].name, mimeType: r.assets[0].mimeType });
      } else setFile(await pickResumeFile());
    } catch (err) {
      if (!(err instanceof PickCancelled)) toast(errorMessage(err), 'error');
    }
  };

  const run = async () => {
    const missing = tool.fields.find((f) => f.required && !values[f.key]?.trim());
    if (missing) return setError(`Add ${missing.label.replace(/\s*\(.*\)$/, '').toLowerCase()}.`);
    if (tool.file?.required && !file) return setError(`Add ${tool.file.label.toLowerCase()}.`);
    if (tool.id === 'proofreading' && !file && (values.text || '').trim().length < 20) return setError('Paste at least 20 characters, or upload a file.');
    setError(null);
    setBusy(true);
    try {
      let res: { data?: Record<string, unknown> } & Record<string, unknown>;
      if (tool.body) {
        res = await api(tool.endpoint, { method: 'POST', body: tool.body(values) });
      } else if (tool.file) {
        const form = new FormData();
        for (const [k, v] of Object.entries(values)) if (v?.trim()) form.append(k, v.trim());
        if (file) form.append(tool.file.field, { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob);
        res = await api(tool.endpoint, { method: 'POST', form });
      } else {
        res = await api(tool.endpoint, { method: 'POST', body: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()])) });
      }
      const data = (res.data && typeof res.data === 'object' ? res.data : res) as Record<string, unknown>;
      delete data.success;
      delete data.work;
      success();
      setResult(data);
      void queryClient.invalidateQueries({ queryKey: ['works'] });
      void queryClient.invalidateQueries({ queryKey: ['billing-me'] });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <SafeAreaView style={styles.fill}>
        <Working title={`${tool.title}…`} pose={tool.pose} steps={['Reading what you shared…', 'Thinking it through…', 'Writing it up…']} />
      </SafeAreaView>
    );
  }

  if (result) {
    return (
      <Screen edges={['top', 'bottom']}>
        <PageHeader title={tool.title} />
        <ResultView data={result} />
        <Button title="Try again with changes" icon="create-outline" variant="secondary" onPress={() => setResult(null)} />
        <Txt variant="small" center>Saved in My Documents.</Txt>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title={tool.title} />
      <Card style={styles.hero}>
        <Image source={LEO[tool.pose]} style={{ width: 90, height: 90 }} contentFit="contain" />
        <Txt color={colors.text} style={{ flex: 1 }}>{tool.intro}</Txt>
      </Card>
      {tool.file ? (
        <Pressy onPress={pick} style={[styles.file, file && styles.fileOn]} accessibilityLabel={tool.file.label}>
          <Ionicons name={file ? 'document-attach' : 'cloud-upload'} size={22} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong" numberOfLines={1}>{file ? file.name : tool.file.label}</Txt>
            <Txt variant="small">{file ? 'Tap to change' : tool.file.pdfOnly ? 'PDF' : 'PDF, DOCX or TXT'}</Txt>
          </View>
        </Pressy>
      ) : null}
      {tool.fields.map((f) =>
        f.options ? (
          <View key={f.key} style={{ gap: 8 }}>
            <Txt variant="smallStrong">{f.label}</Txt>
            <View style={styles.pills}>
              {f.options.map((o) => (
                <Pressy key={o} onPress={() => setValues((v) => ({ ...v, [f.key]: o }))} style={[styles.pill, values[f.key] === o && styles.pillOn]}>
                  <Txt variant="smallStrong" color={values[f.key] === o ? '#fff' : colors.text}>{o}</Txt>
                </Pressy>
              ))}
            </View>
          </View>
        ) : (
          <Input
            key={f.key}
            label={f.required ? f.label : f.label}
            value={values[f.key] || ''}
            onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
            placeholder={f.placeholder}
            multiline={f.multiline}
            style={f.multiline ? styles.multi : undefined}
          />
        ),
      )}
      {error ? <Txt variant="small" color={colors.danger}>{error}</Txt> : null}
      <Button title={tool.button} icon="sparkles" onPress={run} />
      {tool.weekly ? <Txt variant="small" center>{tool.weekly}</Txt> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  file: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.borderStrong, backgroundColor: colors.surface },
  fileOn: { borderStyle: 'solid', borderColor: colors.brand, backgroundColor: colors.brandSoft },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  multi: { minHeight: 110, textAlignVertical: 'top' },
});
