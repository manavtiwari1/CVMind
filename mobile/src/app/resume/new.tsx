import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/PageHeader';
import { TemplatePicker, useProTemplates } from '@/components/TemplatePicker';
import { Button, Card, Input, Pressy, Screen, Txt, useToast } from '@/components/ui';
import { Working } from '@/components/Working';
import { errorMessage } from '@/lib/api';
import { success } from '@/lib/haptics';
import { LEO } from '@/lib/leo';
import { PickCancelled, pickResumeFile } from '@/lib/pickFile';
import { DEFAULT_TEMPLATE, fillTemplate, importLinkedIn, parseResumeFile, PICKABLE_TEMPLATES, saveResume, type ExtractedResume } from '@/lib/resume';
import { useSession } from '@/lib/session';
import { colors, radius, space } from '@/theme';

type Step = 'start' | 'reading' | 'details' | 'template' | 'building';
type Source = 'upload' | 'linkedin' | 'scratch';
type IconName = ComponentProps<typeof Ionicons>['name'];

const EMPTY: ExtractedResume = { personalInfo: {}, summary: '', workExperiences: [], educations: [], skills: [], achievements: [], courses: [], languages: [] };

function Option({ icon, title, text, onPress }: { icon: IconName; title: string; text: string; onPress: () => void }) {
  return (
    <Pressy onPress={onPress} style={styles.option} accessibilityRole="button" accessibilityLabel={title}>
      <View style={styles.optionIcon}>
        <Ionicons name={icon} size={24} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="bodyStrong">{title}</Txt>
        <Txt variant="small">{text}</Txt>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressy>
  );
}

function Section({ title, children, onAdd }: { title: string; children: React.ReactNode; onAdd?: () => void }) {
  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.sectionHead}>
        <Txt variant="heading" style={{ flex: 1 }}>{title}</Txt>
        {onAdd ? (
          <Pressy onPress={onAdd} style={styles.addBtn} accessibilityLabel={`Add to ${title}`}>
            <Ionicons name="add" size={18} color={colors.brand} />
            <Txt variant="smallStrong" color={colors.brand}>Add</Txt>
          </Pressy>
        ) : null}
      </View>
      {children}
    </Card>
  );
}

function Item({ title, onRemove, children }: { title: string; onRemove: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.item}>
      <View style={styles.sectionHead}>
        <Txt variant="smallStrong" style={{ flex: 1 }} numberOfLines={1}>{title}</Txt>
        <Pressy onPress={onRemove} hitSlop={8} accessibilityLabel="Remove">
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </Pressy>
      </View>
      {children}
    </View>
  );
}

// Resume Builder: start from a resume, a LinkedIn link or scratch, check the details, pick one of
// the website's templates, and the AI fills it (POST /api/resume/generate). The result is saved to
// My Documents and opens in the editor.
export default function ResumeBuilder() {
  const { user } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const pro = useProTemplates();
  const [step, setStep] = useState<Step>('start');
  const [source, setSource] = useState<Source>('scratch');
  const [data, setData] = useState<ExtractedResume>(EMPTY);
  const [linkedin, setLinkedin] = useState('');
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE);
  const [error, setError] = useState<string | null>(null);

  const p = data.personalInfo || {};
  const setP = (k: string, v: string) => setData((d) => ({ ...d, personalInfo: { ...d.personalInfo, [k]: v } }));
  const setList = <K extends 'workExperiences' | 'educations' | 'achievements'>(key: K, fn: (list: NonNullable<ExtractedResume[K]>) => NonNullable<ExtractedResume[K]>) =>
    setData((d) => ({ ...d, [key]: fn((d[key] || []) as NonNullable<ExtractedResume[K]>) }));

  const fromFile = async () => {
    let file;
    try {
      file = await pickResumeFile();
    } catch (err) {
      if (!(err instanceof PickCancelled)) toast(errorMessage(err), 'error');
      return;
    }
    setSource('upload');
    setStep('reading');
    try {
      const parsed = await parseResumeFile(file);
      setData({ ...EMPTY, ...parsed, personalInfo: { ...parsed.personalInfo } });
      setStep('details');
    } catch (err) {
      toast(errorMessage(err, "We couldn't read that resume."), 'error');
      setStep('start');
    }
  };

  const fromLinkedIn = async () => {
    if (!/linkedin\.com\/in\//i.test(linkedin)) return setError('Paste your LinkedIn profile link, like linkedin.com/in/your-name');
    setError(null);
    setSource('linkedin');
    setStep('reading');
    try {
      const parsed = await importLinkedIn(linkedin.trim());
      setData({ ...EMPTY, ...parsed, personalInfo: { ...parsed.personalInfo, linkedin: parsed.personalInfo?.linkedin || linkedin.trim() } });
      setStep('details');
    } catch (err) {
      setError(errorMessage(err));
      setStep('start');
    }
  };

  const build = async () => {
    if (!user) return;
    setStep('building');
    try {
      // Typed answers get polished; an imported resume keeps its own words
      const html = await fillTemplate(data, templateId, source !== 'scratch');
      const name = (p.fullName || user.name || 'My').trim();
      const id = await saveResume(user.id, { title: `${name} Resume`, templateId, htmlContent: html });
      await queryClient.invalidateQueries({ queryKey: ['works'] });
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
      success();
      toast('Your resume is ready', 'success');
      router.replace(`/resume/${id}` as never);
    } catch (err) {
      toast(errorMessage(err, 'The resume was not built. Please try again.'), 'error');
      setStep('template');
    }
  };

  if (step === 'reading') {
    return (
      <SafeAreaView style={styles.fill}>
        <Working title="Reading your details" pose="resume" steps={['Opening your resume…', 'Finding your experience…', 'Picking out your skills…']} />
      </SafeAreaView>
    );
  }
  if (step === 'building') {
    return (
      <SafeAreaView style={styles.fill}>
        <Working title="Building your resume" pose="typing" steps={['Writing your summary…', 'Polishing your experience…', 'Laying out the template…', 'Almost there…']} />
      </SafeAreaView>
    );
  }

  if (step === 'template') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <View style={styles.pad}>
          <PageHeader title="Pick a design" />
          <Txt variant="small">All designs are ATS-friendly. You can edit everything after.</Txt>
        </View>
        <View style={styles.pickerWrap}>
          <TemplatePicker
            items={PICKABLE_TEMPLATES.map((t) => ({ id: t.id, name: t.name, tag: t.tag, color: t.color, html: t.html }))}
            selected={templateId}
            onSelect={setTemplateId}
            proIds={pro.resume}
          />
        </View>
        <View style={styles.footer}>
          <Button title="Back" variant="outline" onPress={() => setStep('details')} style={{ flex: 1 }} />
          <Button title="Build my resume" icon="sparkles" onPress={build} style={{ flex: 2 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'details') {
    const exp = data.workExperiences || [];
    const edu = data.educations || [];
    const ach = data.achievements || [];
    return (
      <Screen edges={['top', 'bottom']}>
        <PageHeader title="Your details" />
        <Txt variant="small">{source === 'scratch' ? 'Fill in what you can. Leo will polish the wording.' : 'Check what we found and fix anything that is wrong.'}</Txt>

        <Section title="About you">
          <Input label="Full name" value={p.fullName || ''} onChangeText={(v) => setP('fullName', v)} autoCapitalize="words" />
          <Input label="Job title you want" value={p.jobTitle || ''} onChangeText={(v) => setP('jobTitle', v)} placeholder="e.g. Frontend Developer" />
          <Input label="Email" value={p.email || ''} onChangeText={(v) => setP('email', v)} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Phone" value={p.phone || ''} onChangeText={(v) => setP('phone', v)} keyboardType="phone-pad" />
          <Input label="City" value={p.location || ''} onChangeText={(v) => setP('location', v)} />
          <Input label="LinkedIn" value={p.linkedin || ''} onChangeText={(v) => setP('linkedin', v)} autoCapitalize="none" />
        </Section>

        <Section title="Summary">
          <Input value={data.summary || ''} onChangeText={(v) => setData((d) => ({ ...d, summary: v }))} multiline placeholder="2–3 lines about you and what you are good at" style={styles.multi} />
        </Section>

        <Section title="Experience" onAdd={() => setList('workExperiences', (l) => [...l, { company: '', jobTitle: '', location: '', startDate: '', endDate: '', description: '' }])}>
          {!exp.length ? <Txt variant="small">{"No experience yet? That's fine for freshers. Add internships or projects if you have them."}</Txt> : null}
          {exp.map((e, i) => (
            <Item key={i} title={e.jobTitle || e.company || `Role ${i + 1}`} onRemove={() => setList('workExperiences', (l) => l.filter((_, j) => j !== i))}>
              <Input placeholder="Job title" value={e.jobTitle} onChangeText={(v) => setList('workExperiences', (l) => l.map((x, j) => (j === i ? { ...x, jobTitle: v } : x)))} />
              <Input placeholder="Company" value={e.company} onChangeText={(v) => setList('workExperiences', (l) => l.map((x, j) => (j === i ? { ...x, company: v } : x)))} />
              <View style={styles.two}>
                <View style={styles.half}><Input placeholder="Start (e.g. Jan 2024)" value={e.startDate} onChangeText={(v) => setList('workExperiences', (l) => l.map((x, j) => (j === i ? { ...x, startDate: v } : x)))} /></View>
                <View style={styles.half}><Input placeholder="End (or Present)" value={e.endDate} onChangeText={(v) => setList('workExperiences', (l) => l.map((x, j) => (j === i ? { ...x, endDate: v } : x)))} /></View>
              </View>
              <Input placeholder="What you did and achieved" multiline value={e.description} onChangeText={(v) => setList('workExperiences', (l) => l.map((x, j) => (j === i ? { ...x, description: v } : x)))} style={styles.multi} />
            </Item>
          ))}
        </Section>

        <Section title="Education" onAdd={() => setList('educations', (l) => [...l, { university: '', degree: '', gradYear: '', cgpa: '' }])}>
          {edu.map((e, i) => (
            <Item key={i} title={e.degree || e.university || `Education ${i + 1}`} onRemove={() => setList('educations', (l) => l.filter((_, j) => j !== i))}>
              <Input placeholder="College or university" value={e.university} onChangeText={(v) => setList('educations', (l) => l.map((x, j) => (j === i ? { ...x, university: v } : x)))} />
              <Input placeholder="Degree (e.g. B.Tech CSE)" value={e.degree} onChangeText={(v) => setList('educations', (l) => l.map((x, j) => (j === i ? { ...x, degree: v } : x)))} />
              <View style={styles.two}>
                <View style={styles.half}><Input placeholder="Year" value={e.gradYear} keyboardType="number-pad" onChangeText={(v) => setList('educations', (l) => l.map((x, j) => (j === i ? { ...x, gradYear: v } : x)))} /></View>
                <View style={styles.half}><Input placeholder="CGPA / %" value={e.cgpa} onChangeText={(v) => setList('educations', (l) => l.map((x, j) => (j === i ? { ...x, cgpa: v } : x)))} /></View>
              </View>
            </Item>
          ))}
        </Section>

        <Section title="Skills">
          <Input
            value={(data.skills || []).join(', ')}
            onChangeText={(v) => setData((d) => ({ ...d, skills: v.split(',').map((s) => s.trimStart()).filter((s, i, a) => s || i === a.length - 1) }))}
            placeholder="React, SQL, Communication…"
            hint="Separate skills with commas"
            multiline
          />
        </Section>

        <Section title="Achievements" onAdd={() => setList('achievements', (l) => [...l, { title: '', description: '' }])}>
          {ach.map((a, i) => (
            <Item key={i} title={a.title || `Achievement ${i + 1}`} onRemove={() => setList('achievements', (l) => l.filter((_, j) => j !== i))}>
              <Input placeholder="Title" value={a.title} onChangeText={(v) => setList('achievements', (l) => l.map((x, j) => (j === i ? { ...x, title: v } : x)))} />
              <Input placeholder="Short description" value={a.description} onChangeText={(v) => setList('achievements', (l) => l.map((x, j) => (j === i ? { ...x, description: v } : x)))} />
            </Item>
          ))}
        </Section>

        {error ? <Txt variant="small" color={colors.danger}>{error}</Txt> : null}
        <Button
          title="Choose a design"
          iconRight="arrow-forward"
          onPress={() => {
            if (!(p.fullName || '').trim()) return setError('Add your full name first.');
            setError(null);
            setData((d) => ({ ...d, skills: (d.skills || []).map((s) => s.trim()).filter(Boolean) }));
            setStep('template');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title="Resume Builder" />
      <Animated.View entering={FadeInDown.springify()}>
        <Card style={styles.hero}>
          <Image source={LEO.resume} style={styles.leo} contentFit="contain" />
          <Txt variant="title" center>{"Let's build your resume"}</Txt>
          <Txt center color={colors.muted}>ATS-friendly designs, written with AI, saved to your account.</Txt>
        </Card>
      </Animated.View>
      <Option icon="cloud-upload" title="Upload my resume" text="We read it and fill everything in" onPress={fromFile} />
      <Card style={{ gap: space.md }}>
        <View style={styles.sectionHead}>
          <Ionicons name="logo-linkedin" size={22} color={colors.blue} />
          <Txt variant="bodyStrong" style={{ flex: 1 }}>Import from LinkedIn</Txt>
        </View>
        <Input value={linkedin} onChangeText={setLinkedin} placeholder="linkedin.com/in/your-name" autoCapitalize="none" keyboardType="url" error={error} />
        <Button title="Import" variant="secondary" size="sm" onPress={fromLinkedIn} disabled={!linkedin.trim()} />
      </Card>
      <Option
        icon="create"
        title="Start from scratch"
        text="Answer a few questions"
        onPress={() => {
          setSource('scratch');
          setData({ ...EMPTY, personalInfo: { fullName: user?.name || '', email: user?.email || '' } });
          setStep('details');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: space.xl, paddingTop: space.md, gap: 4 },
  hero: { alignItems: 'center', gap: space.sm },
  leo: { width: 120, height: 120 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  optionIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.brandSoft },
  item: { gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  two: { flexDirection: 'row', gap: space.sm },
  half: { flex: 1 },
  multi: { minHeight: 90, textAlignVertical: 'top' },
  pickerWrap: { flex: 1, padding: space.lg },
  footer: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.sm },
});

