import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo2, Redo2, Table, Minus,
  Sparkles, Copy, Check, Download, RotateCcw, ArrowLeft,
  Loader2, AlertTriangle, Eraser, Highlighter,
  ChevronDown, FileText,
  Image, Link, Pencil, Globe
} from 'lucide-react';
import './CoverLetter.css';
import '../components/ResumeWizard.css';
import ResumeDownload from '../components/ResumeDownload';
import ResumeQuickStart from '../components/ResumeQuickStart';
import { clearPickedTemplate, peekPickedTemplate } from '../lib/templatePick';
import { PhotoDialog, PhotoHover } from '../components/ResumePhoto';
import { DesignPanel, TemplatesPanel, RearrangeModal } from '../components/ResumeStudioPanels';
import {
  DEFAULT_DESIGN, GOOGLE_FONTS_HREF, PAPER, applyColumns, applyFontFamily, applyFontScale, applyLineHeight, applyMargin,
  applySpacing, collectColumns, hasColor, isProfilePhoto, recolorHtml, type Column, type DesignState, type PaperSize,
} from '../lib/resumeDesign';
import { StudioBar, StudioRail, SelectionToolbar, StudioPanelView, StudioPreview, EntryToolbar, type StudioPanel, type StudioDrawer } from '../components/ResumeStudio';
import TemplateGallery from '../components/TemplateGallery';
import ResumeLinkedInStep from '../components/ResumeLinkedInStep';
import ResumeTemplatePicker from '../components/ResumeTemplatePicker';
import ResumeOnboarding, { type OnboardingResult, type ResumeGoal } from '../components/ResumeOnboarding';
import { RESUME_TEMPLATES, TEMPLATES, type Template } from '../data/resumeTemplates';
import { authFetch } from '../lib/authFetch';
import { splitFooter, withFooter } from '../lib/resumeFooter';
import { getErrorMessage } from '../utils/errors';
import type { ExtractedResume, LoadedWork, WizardFormData } from '../types/api';
import { siteOrigin } from '../lib/hosts';

// ─────────────────────────────────────────────────────────────────
// Toolbar constants
// ─────────────────────────────────────────────────────────────────
const FONTS = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
  { label: 'Courier New', value: "'Courier New', monospace" },
  { label: 'Garamond', value: 'Garamond, serif' },
];
const SIZES = ['8','9','10','11','12','13','14','16','18','20','22','24','28','32','36','48','72'];
const TEXT_COLORS = [
  '#000000','#1a1a1a','#444444','#666666','#999999','#cccccc','#eeeeee','#ffffff',
  '#ff0000','#cc0000','#ff4500','#ff9900','#ffcc00','#ffff00',
  '#00cc00','#006600','#00cccc','#0099ff','#0066cc','#003399',
  '#6600cc','#cc00cc','#ff00cc','#ff6699',
];
const HIGHLIGHT_COLORS = [
  '#ffff00','#00ff00','#00ffff','#ff00ff','#ffaa00','#ff4444','#4499ff','#ffffff','transparent',
];


// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
interface CoverLetterProps {
  customApiKey: string;
  loadedWork?: LoadedWork | null;
  setLoadedWork?: (work: LoadedWork | null) => void;
  /** Tells the app shell to hide the navbar/footer while the user is in the guided builder flow. */
  onFocusChange?: (mode: false | 'flow' | 'studio') => void;
  /** Leaves the builder (used by the editor's Home button). */
  onExit?: () => void;
}

export default function CoverLetter({ customApiKey, loadedWork, setLoadedWork, onFocusChange, onExit }: CoverLetterProps) {
  // A template picked on the home page skips Leo and only asks about an existing resume.
  const [pickedTemplate] = useState<Template | null>(() =>
    (window.location.hash === '#cover-letter' || loadedWork ? null : RESUME_TEMPLATES.find(t => t.id === peekPickedTemplate()) ?? null));
  const [step, setStep] = useState<'onboarding' | 'quick' | 'gallery' | 'linkedin' | 'loading' | 'editor'>(
    // A fresh visit to the resume builder starts with Leo's guided onboarding.
    () => (window.location.hash === '#cover-letter' || loadedWork ? 'gallery' : pickedTemplate ? 'quick' : 'onboarding'),
  );
  const [onboardingDone, setOnboardingDone] = useState(Boolean(pickedTemplate));
  const [resumeGoal, setResumeGoal] = useState<ResumeGoal | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(pickedTemplate);
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState('');
  const [copied, setCopied] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>(() => {
    return window.location.hash === '#cover-letter' ? 'cover-letter' : 'resume';
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [historyText, setHistoryText] = useState('');

  // Work Persistence States
  const [activeWorkId, setActiveWorkId] = useState<string | null>(null);
  const [activeWorkTitle, setActiveWorkTitle] = useState<string>('');
  // Resumes from the Resume Tailorer are already tailored, so Fix Resume / Check & Tailor are hidden
  const [fromTailor, setFromTailor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Existing Resume Onboarding States
  const [extractedData, setExtractedData] = useState<ExtractedResume | null>(null);
  const [studioPanel, setStudioPanel] = useState<StudioPanel>(null);
  const [drawer, setDrawer] = useState<StudioDrawer>(null);
  const [design, setDesign] = useState<DesignState>(DEFAULT_DESIGN);
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [arrange, setArrange] = useState<{ initial: Column[]; pageHeight: number } | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<HTMLImageElement | null>(null);
  const [tailorSeed, setTailorSeed] = useState({ jd: '', n: 0 });
  const editedRef = useRef(false);
  // Snapshots for changes made outside the browser's own undo stack (entries, rearrange, design).
  const structHistory = useRef<{ before: string; after: string }[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [usedSampleLayout, setUsedSampleLayout] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const countWords = useCallback(() => {
    const t = editorRef.current?.innerText || '';
    setWordCount(t.trim().split(/\s+/).filter(Boolean).length);
  }, []);

  useEffect(() => {
    const handleHash = () => {
      setActiveTab(window.location.hash === '#cover-letter' ? 'cover-letter' : 'resume');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const inResumeEditor = step === 'editor' && selectedTemplate?.type !== 'cover-letter';
  const focusMode: false | 'flow' | 'studio' = inResumeEditor ? 'studio'
    : (step === 'onboarding' || step === 'quick' || step === 'linkedin' || (step === 'gallery' && activeTab === 'resume')) ? 'flow' : false;
  useEffect(() => {
    onFocusChange?.(focusMode);
  }, [focusMode, onFocusChange]);
  useEffect(() => () => onFocusChange?.(false), [onFocusChange]);
  useEffect(() => { clearPickedTemplate(); }, []);
  useEffect(() => {
    if (!inResumeEditor || document.getElementById('cvmind-studio-fonts')) return;
    const link = Object.assign(document.createElement('link'), { id: 'cvmind-studio-fonts', rel: 'stylesheet', href: GOOGLE_FONTS_HREF });
    document.head.appendChild(link);
  }, [inResumeEditor]);

  // Handle Loading Work from Dashboard / Global Modals.
  // Local state is adjusted during render; the editor DOM and clearing the
  // parent's one-shot loadedWork happen in the effect below.
  const [handledWork, setHandledWork] = useState<LoadedWork | null>(null);
  if (loadedWork && loadedWork !== handledWork) {
    setHandledWork(loadedWork);
    if (loadedWork.deleted) {
      if (activeWorkId === loadedWork.workId) {
        setActiveWorkId(null);
        setActiveWorkTitle('');
        setStep('gallery');
      }
    } else {
      const template = TEMPLATES.find(t => t.id === loadedWork.templateId) || TEMPLATES[0];
      setSelectedTemplate(template);
      setActiveWorkId(loadedWork.id || loadedWork._id || null);
      setActiveWorkTitle(loadedWork.title || 'Untitled Work');
      setFromTailor(loadedWork.source === 'resume-tailor');
      setActiveTab(loadedWork.type === 'cover-letter' ? 'cover-letter' : 'resume');
      setStep('editor');
    }
  }

  useEffect(() => {
    if (!loadedWork) return;
    if (!loadedWork.deleted) {
      const html = loadedWork.htmlContent;
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = html;
          countWords();
        }
      }, 80);
    }
    if (setLoadedWork) {
      setLoadedWork(null);
    }
  }, [loadedWork, setLoadedWork, countWords]);

  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [hoveredRows, setHoveredRows] = useState(0);
  const [hoveredCols, setHoveredCols] = useState(0);
  const [showCustomTable, setShowCustomTable] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);

  // ── Image Properties Modal ──────────────────────────────────────
  const [showImageModal, setShowImageModal] = useState(false);
  const [pendingImageBase64, setPendingImageBase64] = useState<string>('');
  const [editingImageEl, setEditingImageEl] = useState<HTMLImageElement | null>(null);
  const [editingPlaceholderEl, setEditingPlaceholderEl] = useState<HTMLElement | null>(null);
  const [imgWidth, setImgWidth] = useState('150');
  const [imgHeight, setImgHeight] = useState('');
  const [imgAlign, setImgAlign] = useState<'inline' | 'left' | 'center' | 'right'>('inline');
  const [imgShape, setImgShape] = useState<'square' | 'rounded' | 'circle'>('square');

  // Hidden File Uploader & Link Handlers for rich text editor
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerImageUploader = () => {
    saveSelection();
    fileInputRef.current?.click();
  };

  // Photo placeholder (e.g. the avatar circle on sidebar templates) — clicking it
  // uploads straight into that slot instead of opening the full image modal.
  const triggerPlaceholderUpload = (el: HTMLElement) => {
    setEditingPlaceholderEl(el);
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (!base64) return;

      if (editingPlaceholderEl) {
        editingPlaceholderEl.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;" alt="Profile photo" />`;
        setEditingPlaceholderEl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        countWords();
        return;
      }

      // Show the image properties modal instead of immediately inserting
      setPendingImageBase64(base64);
      setEditingImageEl(null);
      setImgWidth('150');
      setImgHeight('');
      setImgAlign('inline');
      setImgShape('square');
      setShowImageModal(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Build style string for image from modal state
  const buildImgStyle = (w: string, h: string, align: string, shape: string): string => {
    const width = w ? `width:${w}px;` : '';
    const height = h ? `height:${h}px;` : '';
    const borderRadius = shape === 'circle' ? 'border-radius:50%;' : shape === 'rounded' ? 'border-radius:8px;' : 'border-radius:0px;';
    let display = 'display:inline-block;vertical-align:middle;margin:6px;';
    let float = '';
    if (align === 'left') { float = 'float:left;'; display = 'display:block;margin:6px 12px 6px 0;'; }
    else if (align === 'right') { float = 'float:right;'; display = 'display:block;margin:6px 0 6px 12px;'; }
    else if (align === 'center') { display = 'display:block;margin:8px auto;'; }
    return `${float}${display}${width}${height}${borderRadius}max-width:100%;`;
  };

  // Insert or update the image from the properties modal
  const insertImageFromModal = () => {
    const style = buildImgStyle(imgWidth, imgHeight, imgAlign, imgShape);
    if (editingImageEl) {
      // Editing an existing image — update its style/src in place
      editingImageEl.setAttribute('style', style);
      if (pendingImageBase64) editingImageEl.setAttribute('src', pendingImageBase64);
      setShowImageModal(false);
      setEditingImageEl(null);
      countWords();
      return;
    }
    // Inserting a new image — restore cursor and use execCommand
    restoreSelection();
    editorRef.current?.focus();
    const imgHtml = `<img src="${pendingImageBase64}" style="${style}" alt="Inserted image" />`;
    document.execCommand('insertHTML', false, imgHtml);
    setShowImageModal(false);
    countWords();
  };

  const applyLink = () => {
    restoreSelection();
    const url = prompt('Enter the link URL (e.g., https://example.com):');
    if (!url) return;
    
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'http://' + formattedUrl;
    }

    editorRef.current?.focus();
    document.execCommand('createLink', false, formattedUrl);

    // Style the link nicely with blue color highlight & underline
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const container = selection.getRangeAt(0).commonAncestorContainer;
      const parentElement = container.nodeType === 3 ? container.parentNode : container;
      if (parentElement && (parentElement as HTMLElement).tagName === 'A') {
        const linkEl = parentElement as HTMLAnchorElement;
        linkEl.style.color = '#0066cc';
        linkEl.style.textDecoration = 'underline';
        linkEl.target = '_blank';
        linkEl.rel = 'noopener noreferrer';
      } else {
        editorRef.current?.querySelectorAll(`a[href="${formattedUrl}"]`).forEach(el => {
          const linkEl = el as HTMLAnchorElement;
          linkEl.style.color = '#0066cc';
          linkEl.style.textDecoration = 'underline';
          linkEl.target = '_blank';
          linkEl.rel = 'noopener noreferrer';
        });
      }
    }
    
    countWords();
  };

  // Helper to open links or image editor if clicked inside editor
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Locked parts (the CVMind footer and its logo) never open an editor dialog.
    if (target.closest('[contenteditable="false"]')) {
      e.preventDefault();
      return;
    }
    // Resume profile photo → the upload / crop dialog
    if (selectedTemplate?.type !== 'cover-letter' && isProfilePhoto(target)) {
      e.preventDefault();
      setPhotoTarget(target);
      return;
    }
    // Click on a photo placeholder (e.g. avatar circle) → upload straight into it
    const placeholderEl = target.closest('[data-photo-placeholder]') as HTMLElement | null;
    if (placeholderEl) {
      e.preventDefault();
      triggerPlaceholderUpload(placeholderEl);
      return;
    }
    // Click on img → open image properties modal
    if (target.tagName === 'IMG') {
      e.preventDefault();
      const imgEl = target as HTMLImageElement;
      setEditingImageEl(imgEl);
      setPendingImageBase64(imgEl.src);
      // Parse existing style back to modal fields
      const s = imgEl.getAttribute('style') || '';
      const wMatch = s.match(/width:(\d+)px/);
      const hMatch = s.match(/height:(\d+)px/);
      setImgWidth(wMatch ? wMatch[1] : '150');
      setImgHeight(hMatch ? hMatch[1] : '');
      if (s.includes('float:left')) setImgAlign('left');
      else if (s.includes('float:right')) setImgAlign('right');
      else if (s.includes('margin:8px auto')) setImgAlign('center');
      else setImgAlign('inline');
      if (s.includes('border-radius:50%')) setImgShape('circle');
      else if (s.includes('border-radius:8px')) setImgShape('rounded');
      else setImgShape('square');
      setShowImageModal(true);
      return;
    }
    const closestA = target.closest('a');
    if (closestA) {
      const href = closestA.getAttribute('href');
      if (href) {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
  };
  const [currentFont, setCurrentFont] = useState('Arial, sans-serif');
  const [currentSize, setCurrentSize] = useState('12');
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (step === 'editor' && selectedTemplate && editorRef.current) {
      if (activeWorkId) {
        // Skip overwriting since it's a loaded draft
      } else {
        editorRef.current.innerHTML = selectedTemplate.html;
      }
      countWords();
    }
  }, [step, selectedTemplate, activeWorkId, countWords]);

  // Background auto-save effect
  useEffect(() => {
    if (step !== 'editor') return;

    let lastSavedContent = editorRef.current?.innerHTML || '';

    const interval = setInterval(async () => {
      const currentContent = editorRef.current?.innerHTML || '';
      if (currentContent && currentContent.trim() && currentContent !== lastSavedContent) {
        const userStr = localStorage.getItem('cvmind_user');
        if (!userStr) return;

        let userId: string;
        try {
          const user = JSON.parse(userStr);
          userId = user.id || user._id;
        } catch {
          return;
        }
        if (!userId) return;

        const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
          || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

        try {
          setSaving(true);
          const response = await authFetch(`${baseUrl}/api/user/work`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              title: activeWorkTitle.trim() || `Untitled ${activeTab === 'cover-letter' ? 'Cover Letter' : 'Resume'}`,
              type: activeTab,
              templateId: selectedTemplate?.id || 'classic-pro',
              htmlContent: currentContent,
              workId: activeWorkId,
              source: fromTailor ? 'resume-tailor' : undefined
            })
          });
          const data = await response.json();
          if (response.ok && data.data) {
            lastSavedContent = currentContent;
            const newId = data.data.id || data.data._id;
            setActiveWorkId(newId);
          }
        } catch (e) {
          console.error("Auto-save error:", e);
        } finally {
          setSaving(false);
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [step, activeWorkId, activeWorkTitle, activeTab, selectedTemplate, fromTailor]);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setActiveWorkId(null);
    setActiveWorkTitle(`${template.type === 'cover-letter' ? 'Cover Letter' : 'Resume'} - ${template.name}`);
    if (template.type === 'cover-letter') {
      setStep('editor');
    } else {
      setStep('linkedin');
    }
  };

  const hasResumeData = (d: ExtractedResume | null): d is ExtractedResume =>
    Boolean(d && (d.personalInfo?.fullName || d.summary || d.workExperiences?.length || d.educations?.length || d.skills?.length));

  const toFormData = (d: ExtractedResume): WizardFormData => ({
    personalInfo: {
      fullName: d.personalInfo?.fullName || '', email: d.personalInfo?.email || '', phone: d.personalInfo?.phone || '',
      location: d.personalInfo?.location || '', linkedin: d.personalInfo?.linkedin || '', jobTitle: d.personalInfo?.jobTitle || '',
    },
    jobTitle: d.personalInfo?.jobTitle || '',
    summary: d.summary || '',
    education: d.educations || [],
    workExperiences: d.workExperiences || [],
    skills: d.skills || [],
    courses: d.courses || [],
    languages: d.languages || [],
    achievements: d.achievements || [],
    timeBreakdown: d.timeBreakdown || [],
  });

  // Fill only the gaps in what the user already gave us with data imported from LinkedIn,
  // then fill the chosen template with it (or open the template as-is when there is nothing to fill).
  const handleLinkedInDone = (imported: ExtractedResume | null) => {
    let data = extractedData;
    if (imported) {
      if (!data) data = imported;
      else {
        const merged: ExtractedResume = { ...imported, ...data };
        merged.personalInfo = { ...imported.personalInfo, ...Object.fromEntries(Object.entries(data.personalInfo || {}).filter(([, v]) => v)) };
        for (const key of ['workExperiences', 'educations', 'skills', 'courses', 'languages', 'achievements'] as const) {
          if (!data[key]?.length && imported[key]?.length) (merged as Record<string, unknown>)[key] = imported[key];
        }
        if (!data.summary && imported.summary) merged.summary = imported.summary;
        data = merged;
      }
      setExtractedData(data);
    }
    if (hasResumeData(data)) {
      setUsedSampleLayout(false);
      handleGenerateFromWizard(toFormData(data));
    } else {
      setUsedSampleLayout(true);
      editedRef.current = false;
      setDesign(DEFAULT_DESIGN);
      setStep('editor');
    }
  };

  const handleQuickDone = (data: ExtractedResume | null) => {
    setActiveWorkTitle(`Resume - ${selectedTemplate?.name ?? ''}`);
    if (hasResumeData(data)) {
      setExtractedData(data);
      setUsedSampleLayout(false);
      handleGenerateFromWizard(toFormData(data));
    } else {
      setUsedSampleLayout(true);
      editedRef.current = false;
      setStep('editor');
    }
  };

  const handleOnboardingComplete = ({ extracted, jobTitle, goal }: OnboardingResult) => {
    const data: ExtractedResume | null = extracted
      ? extracted
      : jobTitle ? { personalInfo: { jobTitle } } : null;
    // Keep the uploaded resume's own title; only fill it in when missing.
    if (data && jobTitle && !data.personalInfo?.jobTitle) {
      data.personalInfo = { ...data.personalInfo, jobTitle };
    }
    setExtractedData(data);
    setResumeGoal(goal);
    setOnboardingDone(true);
    setStep('gallery');
  };

  const copyShareLink = (url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => setToast({ ok: true, text: 'Portfolio link copied to your clipboard.' }))
      .catch(() => setToast({ ok: true, text: 'Portfolio opened in a new tab. Copy the link from there.' }));
  };

  const handleSharePortfolio = async () => {
    if (selectedTemplate?.type === 'cover-letter') {
      setToast({ ok: false, text: 'Sharing is currently only supported for resumes.' });
      return;
    }

    if (activeWorkId) {
      const shareUrl = `${siteOrigin()}/portfolio/${activeWorkId}`;
      copyShareLink(shareUrl);
      window.open(shareUrl, '_blank');
      return;
    }

    const htmlContent = editorRef.current?.innerHTML || '';
    if (!htmlContent.trim()) return;

    const userStr = localStorage.getItem('cvmind_user');
    if (!userStr) {
      setToast({ ok: false, text: 'Please sign in to save and share your portfolio.' });
      return;
    }

    let userId: string;
    try {
      const user = JSON.parse(userStr);
      userId = user.id || user._id;
    } catch {
      setToast({ ok: false, text: 'Your session has expired. Please sign in again.' });
      return;
    }

    setSaving(true);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
      || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

    try {
      const response = await authFetch(`${baseUrl}/api/user/work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: activeWorkTitle.trim() || `Untitled Resume`,
          type: activeTab,
          templateId: selectedTemplate?.id || 'classic-pro',
          htmlContent,
          workId: activeWorkId
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save');

      if (data.data) {
        const newId = data.data.id || data.data._id;
        setActiveWorkId(newId);
        const shareUrl = `${siteOrigin()}/portfolio/${newId}`;
        copyShareLink(shareUrl);
        window.open(shareUrl, '_blank');
      }
    } catch (err) {
      setToast({ ok: false, text: getErrorMessage(err) || 'An error occurred while preparing your portfolio.' });
    } finally {
      setSaving(false);
    }
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    if (!savedRange.current) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(savedRange.current);
  };

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val ?? '');
    countWords();
  };

  const applyFontSize = (size: string) => {
    editorRef.current?.focus();
    document.execCommand('fontSize', false, '7');
    editorRef.current?.querySelectorAll('font[size="7"]').forEach(el => {
      const span = document.createElement('span');
      span.style.fontSize = size + 'pt';
      span.innerHTML = (el as HTMLElement).innerHTML;
      el.parentNode?.replaceChild(span, el);
    });
    setCurrentSize(size);
    countWords();
  };

  const applyFont = (f: string) => { exec('fontName', f); setCurrentFont(f); };

  const applyTextColor = (c: string) => { restoreSelection(); exec('foreColor', c); setShowTextColor(false); };
  const applyHighlight = (c: string) => {
    restoreSelection();
    if (c === 'transparent') exec('backColor', 'transparent');
    else exec('backColor', c);
    setShowHighlight(false);
  };

  const insertTableOfSize = (rows: number, cols: number) => {
    restoreSelection();
    editorRef.current?.focus();
    let html = '<br><table style="border-collapse:collapse;width:100%;margin:8px 0;">';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        const isH = r === 0;
        const st = `border:1px solid #ccc;padding:7px 10px;min-width:50px;${isH ? 'background:#f0f0f0;font-weight:700;' : ''}`;
        html += `<${isH ? 'th' : 'td'} style="${st}">${isH ? `Col ${c + 1}` : 'Cell'}</${isH ? 'th' : 'td'}>`;
      }
      html += '</tr>';
    }
    html += '</table><br>';
    document.execCommand('insertHTML', false, html);
    setShowTableDialog(false);
    setShowCustomTable(false);
    setHoveredRows(0);
    setHoveredCols(0);
    countWords();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editorRef.current?.innerText || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const content = editorRef.current?.innerHTML || '';
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resume – ${selectedTemplate?.name || 'CVMind'}</title>
    <link rel="stylesheet" href="${GOOGLE_FONTS_HREF}">
    <style>
      @page { size: ${paperSize === 'a4' ? 'A4' : 'Letter'}; margin: 0.6in; }
      body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      * { box-sizing: border-box; }
    </style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  const handleDownloadDOCX = (fileName?: string) => {
    const content = editorRef.current?.innerHTML || '';
    const wordDoc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Resume</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>body{font-family:Arial,sans-serif;margin:1in;}@page{margin:1in;}</style>
</head><body>${content}</body></html>`;
    const blob = new Blob(['\ufeff', wordDoc], { type: 'application/msword' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${fileName || `resume-${selectedTemplate?.id || 'draft'}`}.doc`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleRefine = async () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    if (!htmlContent.trim() || refining) return;
    setRefining(true);
    setRefineError('');
    try {
      setHistoryText(htmlContent);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
        || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await fetch(`${baseUrl}/api/cover-letter/refine`, {
        method: 'POST', headers,
        body: JSON.stringify({ coverLetterText: htmlContent, jobTitle: 'Professional', companyName: 'Target Company' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI refinement failed.');
      if (editorRef.current) { 
        editorRef.current.innerHTML = data.data.refinedLetter; 
        countWords(); 
      }
    } catch (err) {
      setRefineError(getErrorMessage(err) || 'Something went wrong.');
    } finally {
      setRefining(false);
    }
  };

  const handleRefineWithPrompt = async (override?: string) => {
    const instructions = typeof override === 'string' ? override : aiPrompt;
    const htmlContent = editorRef.current?.innerHTML || '';
    if (!htmlContent.trim() || refining) return;
    setRefining(true);
    setRefineError('');
    try {
      setHistoryText(htmlContent);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
        || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await fetch(`${baseUrl}/api/cover-letter/refine`, {
        method: 'POST', headers,
        body: JSON.stringify({ 
          coverLetterText: htmlContent, 
          jobTitle: 'Professional', 
          companyName: 'Target Company',
          instructions
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI refinement failed.');
      if (editorRef.current) { 
        editorRef.current.innerHTML = data.data.refinedLetter; 
        countWords(); 
      }
    } catch (err) {
      setRefineError(getErrorMessage(err) || 'Something went wrong.');
    } finally {
      setRefining(false);
    }
  };

  const handleGenerateFromScratch = async () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    if (!aiPrompt.trim() || refining) return;
    setRefining(true);
    setRefineError('');
    try {
      setHistoryText(htmlContent);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
        || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      
      const generationPrompt = `WRITE A COMPLETELY NEW COVER LETTER from scratch replacing the current content entirely. Do NOT use the existing content. Generate a fresh, professional cover letter according to this prompt: "${aiPrompt}". Keep the HTML structure, wrappers, fonts, and inline styles exactly as they are.`;

      const res = await fetch(`${baseUrl}/api/cover-letter/refine`, {
        method: 'POST', headers,
        body: JSON.stringify({ 
          coverLetterText: htmlContent, 
          jobTitle: 'Professional', 
          companyName: 'Target Company',
          instructions: generationPrompt
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed.');
      if (editorRef.current) { 
        editorRef.current.innerHTML = data.data.refinedLetter; 
        countWords(); 
      }
    } catch (err) {
      setRefineError(getErrorMessage(err) || 'Something went wrong.');
    } finally {
      setRefining(false);
    }
  };

  const handleRestoreVersion = () => {
    if (historyText && editorRef.current) {
      const current = editorRef.current.innerHTML;
      editorRef.current.innerHTML = historyText;
      setHistoryText(current); // toggle
      countWords();
    }
  };

  const handleGenerateFromWizard = async (formData: WizardFormData, template: Template | null = selectedTemplate) => {
    if (!template) return;
    setStep('loading');
    setRefineError('');
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
        || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;

      const res = await fetch(`${baseUrl}/api/resume/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          templateHtml: splitFooter(template.html).body,
          formData
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed.');

      // The locked CVMind footer is kept out of the AI call and re-attached afterwards.
      const generatedHtml = withFooter(data.data.generatedHtml, splitFooter(template.html).footer);

      // Instantly save to "My Works" to ensure 0% data loss risk
      const userStr = localStorage.getItem('cvmind_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const userId = user.id || user._id;
          if (userId) {
            const saveRes = await authFetch(`${baseUrl}/api/user/work`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                title: activeWorkTitle.trim() || `Resume - ${template.name}`,
                type: 'resume',
                templateId: template.id,
                htmlContent: generatedHtml,
                workId: activeWorkId,
                source: fromTailor ? 'resume-tailor' : undefined
              })
            });
            const saveData = await saveRes.json();
            if (saveRes.ok && saveData.data) {
              const newId = saveData.data.id || saveData.data._id;
              setActiveWorkId(newId);
            }
          }
        } catch (saveErr) {
          console.error("Wizard instant save error:", saveErr);
        }
      }

      editedRef.current = false;
      setDesign(DEFAULT_DESIGN);
      setStep('editor');
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = generatedHtml;
          countWords();
        }
      }, 100);
    } catch (err) {
      setRefineError(getErrorMessage(err) || 'Something went wrong.');
      setUsedSampleLayout(true);
      setStep('editor');
    }
  };

  const closeAllPopups = () => { setShowTextColor(false); setShowHighlight(false); setShowTableDialog(false); };

  // ── QUICK START (template picked on the home page) ──────────────────────
  if (step === 'quick' && selectedTemplate) {
    return <ResumeQuickStart templateName={selectedTemplate.name} customApiKey={customApiKey} onDone={handleQuickDone} />;
  }

  // ── GUIDED ONBOARDING (Leo) ─────────────────────────────────────────────
  if (step === 'onboarding') {
    return <ResumeOnboarding customApiKey={customApiKey} onComplete={handleOnboardingComplete} />;
  }

  // ── LINKEDIN IMPORT (step 6) ────────────────────────────────
  if (step === 'linkedin') {
    return <ResumeLinkedInStep customApiKey={customApiKey} onDone={handleLinkedInDone} />;
  }

  // ── LOADING SCREEN ──────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="cl-page animate-fade-in-up" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px', padding: '2.5rem 2rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)' }}>
          <Loader2 size={40} className="cl-spin" style={{ color: 'var(--blue)', marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.8rem' }}>AI is Crafting Your Resume</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.8rem' }}>
            CV Mind is optimizing your qualifications, experience points, and skillsets into an ATS-friendly layout. This will take up to 60 seconds...
          </p>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
            <div className="rw-progress-bar-fill" />
          </div>
        </div>
      </div>
    );
  }

  // ── GALLERY ─────────────────────────────────────────────────
  if (step === 'gallery' && activeTab === 'resume') {
    if (!onboardingDone) return <ResumeOnboarding customApiKey={customApiKey} onComplete={handleOnboardingComplete} />;
    // Float the templates that suit the user's goal (from onboarding) to the top.
    const goalFit = resumeGoal === 'ats' ? /ats|classic|minimal|clean|corporate|traditional/i
      : resumeGoal === 'recruiters' ? /creative|modern|bold|elegant|executive|design/i : null;
    const fit = (t: Template) => (goalFit && goalFit.test(`${t.id} ${t.name} ${t.tag}`) ? 0 : 1);
    const resumeTemplates = [...RESUME_TEMPLATES].sort((x, y) => fit(x) - fit(y));
    return (
      <ResumeTemplatePicker
        templates={resumeTemplates}
        goal={resumeGoal}
        onSelect={handleSelectTemplate}
        onBack={() => setOnboardingDone(false)}
      />
    );
  }

  // ── COVER LETTER GALLERY ────────────────────────────────────
  if (step === 'gallery') {
    const filteredTemplates = TEMPLATES.filter(t => t.type === 'cover-letter');

    return (
      <div className="cl-page animate-fade-in-up">
        <div className="cl-hero">
          <div className="cl-hero-badge"><Sparkles size={14} /> AI Cover Letter Builder</div>
          <h1 className="cl-hero-title">
            Choose Your <span className="cl-gradient-text">Cover Letter</span>
          </h1>
          <p className="cl-hero-sub">
            Select a premium cover letter layout and edit using our professional writing environment. Perfect format, zero guesswork.
          </p>
        </div>

        {/* Tab switcher inside UI */}
        <div className="cl-tabs">
          <button 
            className={`cl-tab ${activeTab === 'resume' ? 'active' : ''}`}
            onClick={() => { window.location.hash = '#resume'; setActiveTab('resume'); }}
          >
            <FileText size={14} /> ATS Resumes
          </button>
          <button 
            className={`cl-tab ${activeTab === 'cover-letter' ? 'active' : ''}`}
            onClick={() => { window.location.hash = '#cover-letter'; setActiveTab('cover-letter'); }}
          >
            <Sparkles size={14} /> Cover Letters
          </button>
        </div>
        <TemplateGallery templates={filteredTemplates} kind="cover-letter" onSelect={handleSelectTemplate} />
      </div>
    );
  }

  // ── EDITOR ───────────────────────────────────────────────────
  const isResume = selectedTemplate?.type !== 'cover-letter';

  const handleDesign = (next: Partial<DesignState>) => {
    const ed = editorRef.current;
    if (!ed || !selectedTemplate) return;
    recordStructural(() => {
      if (next.margin !== undefined) applyMargin(ed, next.margin);
      if (next.spacing !== undefined) applySpacing(ed, next.spacing);
      if (next.lineHeight !== undefined) applyLineHeight(ed, next.lineHeight);
      if (next.fontSize !== undefined) applyFontScale(ed, next.fontSize);
      if (next.font) applyFontFamily(ed, next.font);
      if (next.accent) ed.innerHTML = recolorHtml(ed.innerHTML, design.accent ?? selectedTemplate.color, next.accent);
    });
    setDesign(d => ({ ...d, ...next }));
  };

  const openArrange = () => {
    const ed = editorRef.current;
    if (ed) setArrange({ initial: collectColumns(ed), pageHeight: ed.scrollHeight });
  };

  // Move the user's content into another template. Untouched sample layouts are swapped directly;
  // otherwise the AI reads the page and re-fills the new template.
  const handleApplyTemplate = async (template: Template) => {
    const ed = editorRef.current;
    if (!ed || swapping) return;
    setRefineError('');
    if (usedSampleLayout && !editedRef.current) {
      ed.innerHTML = template.html;
      setSelectedTemplate(template);
      setDesign(DEFAULT_DESIGN);
      setDrawer(null);
      countWords();
      return;
    }
    setSwapping(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL
        || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const res = await fetch(`${baseUrl}/api/resume/parse-data`, { method: 'POST', headers, body: JSON.stringify({ resumeText: ed.innerText }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not read your resume.');
      setSelectedTemplate(template);
      setActiveWorkTitle(`Resume - ${template.name}`);
      setDrawer(null);
      await handleGenerateFromWizard(toFormData(body.data), template);
    } catch (err) {
      setRefineError(getErrorMessage(err) || 'Could not switch template.');
    } finally {
      setSwapping(false);
    }
  };

  const recordStructural = (mutate: () => void) => {
    const ed = editorRef.current;
    if (!ed) return;
    const before = ed.innerHTML;
    mutate();
    structHistory.current = [...structHistory.current.slice(-29), { before, after: ed.innerHTML }];
    editedRef.current = true;
    countWords();
  };

  /** Undo our own structural change if it was the last thing that happened, otherwise the browser's undo. */
  const handleUndo = () => {
    const ed = editorRef.current;
    const last = structHistory.current[structHistory.current.length - 1];
    if (ed && last && ed.innerHTML === last.after) {
      ed.innerHTML = last.before;
      structHistory.current = structHistory.current.slice(0, -1);
      countWords();
      return true;
    }
    exec('undo');
    return false;
  };

  const openPreview = () => { setPreviewHtml(editorRef.current?.innerHTML || ''); setShowPreview(true); };

  return (
    <div className={`cl-page animate-fade-in-up${isResume ? ' rs-page' : ''}`} onClick={closeAllPopups}>

      {isResume && (
        <StudioBar
          title={activeWorkTitle}
          onTitle={setActiveWorkTitle}
          signedIn={Boolean(localStorage.getItem('cvmind_user'))}
          saving={saving}
          refining={refining}
          panel={studioPanel}
          onPanel={setStudioPanel}
          drawer={drawer}
          onDrawer={setDrawer}
          onRearrange={openArrange}
          onFix={handleRefine}
          onExit={() => onExit?.()}
          onUndo={handleUndo}
          onRedo={() => exec('redo')}
          onDownload={() => setShowDownload(true)}
          hideAiTools={fromTailor}
        />
      )}

      {/* Top bar */}
      {!isResume && (
      <div className="cl-editor-topbar" onClick={e => e.stopPropagation()}>
        <div className="cl-editor-topbar-left">
          <button className="cl-back-btn" onClick={() => { setStep('gallery'); setActiveWorkId(null); }}><ArrowLeft size={14} /> Templates</button>
          <input 
            type="text" 
            className="cl-title-input" 
            value={activeWorkTitle} 
            onChange={e => setActiveWorkTitle(e.target.value)} 
            placeholder="Untitled Work" 
            title="Rename Work"
          />
          <div className="cl-template-pill" style={{ background: selectedTemplate?.accent, color: selectedTemplate?.color }}>
            {selectedTemplate?.icon} {selectedTemplate?.name}
          </div>
        </div>
        <div className="cl-editor-topbar-right">
          <span className="cl-word-badge">{wordCount} words</span>
          <button className="cl-top-btn" onClick={handleCopy}>
            {copied ? <><Check size={13} className="text-success" /> Copied</> : <><Copy size={13} /> Copy Text</>}
          </button>
          <button className="cl-top-btn" onClick={handleDownloadPDF}><Download size={13} /> PDF</button>
          <button className="cl-top-btn" onClick={() => handleDownloadDOCX()}><Download size={13} /> DOCX</button>
          {selectedTemplate?.type !== 'cover-letter' && (
            <button className="cl-top-btn" onClick={handleSharePortfolio}><Globe size={13} /> Share</button>
          )}
          {localStorage.getItem('cvmind_user') ? (
            <div className="cl-autosave-status" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.35rem 0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              {saving ? (
                <><Loader2 size={12} className="cl-spin text-blue" /> Saving...</>
              ) : (
                <><Check size={12} className="text-success" /> Saved automatically</>
              )}
            </div>
          ) : (
            <div className="cl-autosave-status" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-warning)', padding: '0.35rem 0.75rem', background: 'rgba(251,146,60,0.05)', borderRadius: '6px', border: '1px solid rgba(251,146,60,0.2)' }}>
              <AlertTriangle size={12} /> Sign in to save
            </div>
          )}
          <button className="cl-ai-btn" disabled={refining} onClick={handleRefine}
            style={{ '--ac': selectedTemplate?.color || '#2997ff' } as React.CSSProperties}>
            {refining ? <><Loader2 size={14} className="cl-spin" /> Refining…</> : <><Sparkles size={14} /> AI Refine</>}
          </button>
        </div>
      </div>
      )}

      {/* Error banner */}
      {refineError && <div className="cl-error-banner"><AlertTriangle size={15} /> {refineError}</div>}

      {/* ══ WORD TOOLBAR (cover letters) ══ */}
      {!isResume && (
      <div className="cl-word-toolbar" onClick={e => e.stopPropagation()}>

        {/* ROW 1 */}
        <div className="cl-tb-row">
          <button className="cl-tb-btn" title="Undo" onClick={() => exec('undo')}><Undo2 size={14} /></button>
          <button className="cl-tb-btn" title="Redo" onClick={() => exec('redo')}><Redo2 size={14} /></button>
          <div className="cl-tb-div" />

          <select className="cl-tb-select cl-font-sel" value={currentFont} title="Font Family"
            onChange={e => applyFont(e.target.value)}>
            {FONTS.map(f => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
          </select>

          <select className="cl-tb-select cl-size-sel" value={currentSize} title="Font Size"
            onChange={e => applyFontSize(e.target.value)}>
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="cl-tb-div" />

          <select className="cl-tb-select cl-style-sel" title="Paragraph Style"
            defaultValue="p" onChange={e => exec('formatBlock', e.target.value)}>
            <option value="p">Normal</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="pre">Preformatted</option>
          </select>

          <div className="cl-tb-div" />
          <button className="cl-tb-btn cl-tb-B" title="Bold" onClick={() => exec('bold')}><Bold size={14} /></button>
          <button className="cl-tb-btn cl-tb-I" title="Italic" onClick={() => exec('italic')}><Italic size={14} /></button>
          <button className="cl-tb-btn cl-tb-U" title="Underline" onClick={() => exec('underline')}><Underline size={14} /></button>
          <button className="cl-tb-btn" title="Strikethrough" onClick={() => exec('strikeThrough')}><Strikethrough size={14} /></button>
        </div>

        {/* ROW 2 */}
        <div className="cl-tb-row">
          {/* Text Color */}
          <div className="cl-tb-popup-wrap" onClick={e => e.stopPropagation()}>
            <button className="cl-tb-btn cl-tb-color-btn" title="Text Color"
              onMouseDown={e => { e.preventDefault(); saveSelection(); setShowTextColor(v => !v); setShowHighlight(false); setShowTableDialog(false); }}>
              <span className="cl-color-A">A</span><ChevronDown size={9} />
            </button>
            {showTextColor && (
              <div className="cl-color-popup">
                <div className="cl-color-grid">
                  {TEXT_COLORS.map(c => <button key={c} className="cl-swatch" style={{ background: c, border: c === '#ffffff' ? '1px solid #ccc' : undefined }} onMouseDown={e => { e.preventDefault(); applyTextColor(c); }} />)}
                </div>
                <label className="cl-custom-color">Custom: <input type="color" onInput={e => applyTextColor((e.target as HTMLInputElement).value)} /></label>
              </div>
            )}
          </div>

          {/* Highlight */}
          <div className="cl-tb-popup-wrap" onClick={e => e.stopPropagation()}>
            <button className="cl-tb-btn cl-tb-color-btn" title="Highlight"
              onMouseDown={e => { e.preventDefault(); saveSelection(); setShowHighlight(v => !v); setShowTextColor(false); setShowTableDialog(false); }}>
              <Highlighter size={14} /><ChevronDown size={9} />
            </button>
            {showHighlight && (
              <div className="cl-color-popup">
                <div className="cl-color-grid">
                  {HIGHLIGHT_COLORS.map(c => <button key={c} className="cl-swatch" style={{ background: c === 'transparent' ? 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJElEQVQYV2NkYGD4z8BQDwAEgAF/QualityFirst")' : c, border: '1px solid #ccc' }} onMouseDown={e => { e.preventDefault(); applyHighlight(c); }} />)}
                </div>
              </div>
            )}
          </div>

          <div className="cl-tb-div" />
          <button className="cl-tb-btn" title="Align Left" onClick={() => exec('justifyLeft')}><AlignLeft size={14} /></button>
          <button className="cl-tb-btn" title="Align Center" onClick={() => exec('justifyCenter')}><AlignCenter size={14} /></button>
          <button className="cl-tb-btn" title="Align Right" onClick={() => exec('justifyRight')}><AlignRight size={14} /></button>
          <button className="cl-tb-btn" title="Justify" onClick={() => exec('justifyFull')}><AlignJustify size={14} /></button>

          <div className="cl-tb-div" />
          <button className="cl-tb-btn" title="Bullet List" onClick={() => exec('insertUnorderedList')}><List size={14} /></button>
          <button className="cl-tb-btn" title="Numbered List" onClick={() => exec('insertOrderedList')}><ListOrdered size={14} /></button>
          <button className="cl-tb-btn" title="Indent" onClick={() => exec('indent')}><span className="cl-indent-icon">→|</span></button>
          <button className="cl-tb-btn" title="Outdent" onClick={() => exec('outdent')}><span className="cl-indent-icon">|←</span></button>

          <div className="cl-tb-div" />

          {/* Table */}
          <div className="cl-tb-popup-wrap" onClick={e => e.stopPropagation()}>
            <button className="cl-tb-btn" title="Insert Table"
              onMouseDown={e => { e.preventDefault(); saveSelection(); setShowTableDialog(v => !v); setShowTextColor(false); setShowHighlight(false); }}>
              <Table size={14} /><ChevronDown size={9} />
            </button>
            {showTableDialog && (
              <div className="cl-table-dialog" onClick={e => e.stopPropagation()}>
                <div className="cl-table-dlg-title">
                  {hoveredRows > 0 && hoveredCols > 0 
                    ? `Insert Table: ${hoveredCols} x ${hoveredRows}` 
                    : 'Insert Table'}
                </div>
                
                {/* 10x8 Interactive Hover Grid */}
                <div className="cl-table-grid-selector" onMouseLeave={() => { setHoveredRows(0); setHoveredCols(0); }}>
                  {Array.from({ length: 8 }).map((_, rIdx) => {
                    const r = rIdx + 1;
                    return (
                      <div key={rIdx} className="cl-table-grid-row">
                        {Array.from({ length: 10 }).map((_, cIdx) => {
                          const c = cIdx + 1;
                          const isActive = r <= hoveredRows && c <= hoveredCols;
                          return (
                            <div 
                              key={cIdx} 
                              className={`cl-table-grid-cell ${isActive ? 'active' : ''}`}
                              onMouseEnter={() => { setHoveredRows(r); setHoveredCols(c); }}
                              onClick={() => insertTableOfSize(r, c)}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                
                <div className="cl-table-divider" />
                
                {/* Microsoft Word action options */}
                {!showCustomTable ? (
                  <>
                    <button className="cl-table-action-link" onClick={() => setShowCustomTable(true)}>
                      <Table size={13} /> Insert Table...
                    </button>
                    <button className="cl-table-action-link" onClick={() => setToast({ ok: false, text: "Drawing tables isn't available in the web editor yet. Use Insert Table instead." })}>
                      <Pencil size={13} /> Draw Table
                    </button>
                  </>
                ) : (
                  <div className="cl-custom-table-form">
                    <div className="cl-table-dlg-row">
                      <label>Rows</label>
                      <input type="number" min={1} max={50} value={tableRows} onChange={e => setTableRows(+e.target.value)} className="cl-table-input" />
                    </div>
                    <div className="cl-table-dlg-row">
                      <label>Cols</label>
                      <input type="number" min={1} max={20} value={tableCols} onChange={e => setTableCols(+e.target.value)} className="cl-table-input" />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '6px' }}>
                      <button className="cl-table-insert-btn" onClick={() => insertTableOfSize(tableRows, tableCols)}>Insert</button>
                      <button className="cl-table-cancel-btn" onClick={() => setShowCustomTable(false)}>Back</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="cl-tb-btn" title="Horizontal Line" onClick={() => exec('insertHorizontalRule')}><Minus size={14} /></button>
          <button className="cl-tb-btn" title="Clear Formatting" onClick={() => exec('removeFormat')}><Eraser size={14} /></button>
          <div className="cl-tb-div" />
          <button className="cl-tb-btn" title="Insert Link" onMouseDown={e => { e.preventDefault(); saveSelection(); }} onClick={applyLink}><Link size={14} /></button>
          <button className="cl-tb-btn" title="Insert Image" onMouseDown={e => { e.preventDefault(); saveSelection(); }} onClick={triggerImageUploader}><Image size={14} /></button>
        </div>
      </div>
      )}

      {/* ══ EDITOR & AI SIDEBAR WORKSPACE ══ */}
      <div className={isResume ? 'rs-stage' : 'cl-workspace'}>
        
        {/* Left Side: Word Canvas */}
        {isResume && drawer === 'design' && selectedTemplate && (
          <DesignPanel
            design={design}
            accentFrom={design.accent ?? selectedTemplate.color}
            accentAvailable={design.accent !== null || hasColor(selectedTemplate.html, selectedTemplate.color)}
            onChange={handleDesign}
            onClose={() => setDrawer(null)}
          />
        )}
        {isResume && drawer === 'templates' && selectedTemplate && (
          <TemplatesPanel
            templates={RESUME_TEMPLATES}
            currentId={selectedTemplate.id}
            paper={paperSize}
            busy={swapping}
            onPaper={setPaperSize}
            onApply={handleApplyTemplate}
            onClose={() => setDrawer(null)}
          />
        )}

        <div className={isResume ? 'rs-canvas' : 'cl-editor-main'}>
          {isResume && usedSampleLayout && (
            <p className="rs-hint"><Sparkles size={15} /> This is a sample layout. Click any text to replace it with your own, or select text for quick formatting.</p>
          )}
          <div className="cl-paper-shell" style={isResume ? { '--rs-w': `${PAPER[paperSize].width}px`, '--rs-h': `${PAPER[paperSize].height}px` } as React.CSSProperties : undefined}>
            <div
              ref={editorRef}
              id="cl-resume-editor"
              className="cl-paper"
              contentEditable
              suppressContentEditableWarning
              spellCheck
              onInput={() => { editedRef.current = true; countWords(); }}
              onKeyDown={e => {
                const last = structHistory.current[structHistory.current.length - 1];
                if (isResume && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && last && editorRef.current?.innerHTML === last.after) {
                  e.preventDefault();
                  handleUndo();
                }
              }}
              onClick={e => { closeAllPopups(); handleEditorClick(e); }}
            />
            {/* Hidden image file uploader input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handleImageUpload} 
            />

            {/* ── Image Properties Modal ────────────────────────── */}
            {showImageModal && (
              <div className="img-modal-overlay" onMouseDown={e => e.stopPropagation()}>
                <div className="img-modal-card">
                  <div className="img-modal-header">
                    <span className="img-modal-title">
                      <Image size={15} /> {editingImageEl ? 'Edit Image' : 'Insert Image'}
                    </span>
                    <button className="img-modal-close" onClick={() => { setShowImageModal(false); setEditingImageEl(null); }}>✕</button>
                  </div>

                  {/* Preview */}
                  {pendingImageBase64 && (
                    <div className="img-modal-preview">
                      <img
                        src={pendingImageBase64}
                        alt="Preview of the image to insert"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '120px',
                          objectFit: 'contain',
                          borderRadius: imgShape === 'circle' ? '50%' : imgShape === 'rounded' ? '8px' : '0',
                          display: 'block',
                          margin: '0 auto'
                        }}
                      />
                    </div>
                  )}

                  {/* Size Controls */}
                  <div className="img-modal-row">
                    <label className="img-modal-label">Width (px)</label>
                    <input
                      className="img-modal-input"
                      type="number"
                      min="20"
                      max="720"
                      placeholder="e.g. 150"
                      value={imgWidth}
                      onChange={e => setImgWidth(e.target.value)}
                    />
                  </div>
                  <div className="img-modal-row">
                    <label className="img-modal-label">Height (px) <span className="img-modal-optional">optional</span></label>
                    <input
                      className="img-modal-input"
                      type="number"
                      min="20"
                      max="1000"
                      placeholder="Auto"
                      value={imgHeight}
                      onChange={e => setImgHeight(e.target.value)}
                    />
                  </div>

                  {/* Alignment */}
                  <div className="img-modal-row">
                    <label className="img-modal-label">Alignment</label>
                    <div className="img-modal-align-group">
                      {(['inline','left','center','right'] as const).map(a => (
                        <button
                          key={a}
                          className={`img-modal-align-btn${imgAlign === a ? ' active' : ''}`}
                          onClick={() => setImgAlign(a)}
                          title={a.charAt(0).toUpperCase() + a.slice(1)}
                        >
                          {a === 'inline' ? '⊡ Inline' : a === 'left' ? '◧ Left' : a === 'center' ? '◈ Center' : '◨ Right'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shape */}
                  <div className="img-modal-row">
                    <label className="img-modal-label">Shape</label>
                    <div className="img-modal-align-group">
                      {(['square','rounded','circle'] as const).map(s => (
                        <button
                          key={s}
                          className={`img-modal-align-btn${imgShape === s ? ' active' : ''}`}
                          onClick={() => setImgShape(s)}
                        >
                          {s === 'square' ? '□ Square' : s === 'rounded' ? '▢ Rounded' : '○ Circle'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="img-modal-actions">
                    {editingImageEl && (
                      <button
                        className="img-modal-btn-delete"
                        onClick={() => {
                          editingImageEl.remove();
                          setShowImageModal(false);
                          setEditingImageEl(null);
                          countWords();
                        }}
                      >
                        🗑 Remove
                      </button>
                    )}
                    <button className="img-modal-btn-cancel" onClick={() => { setShowImageModal(false); setEditingImageEl(null); }}>
                      Cancel
                    </button>
                    <button className="img-modal-btn-insert" onClick={insertImageFromModal}>
                      {editingImageEl ? '✓ Update Image' : '✓ Insert Image'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {isResume && (
          <StudioRail
            onPreview={openPreview}
            onDownload={() => setShowDownload(true)}
            onShare={handleSharePortfolio}
            onAssistant={() => setStudioPanel(studioPanel === 'assistant' ? null : 'assistant')}
            assistantOn={studioPanel === 'assistant'}
          />
        )}

        {isResume && studioPanel && (
          <StudioPanelView
            key={tailorSeed.n}
            initialJd={tailorSeed.jd}
            panel={studioPanel}
            refining={refining}
            prompt={aiPrompt}
            onPrompt={setAiPrompt}
            onTailor={jd => handleRefineWithPrompt(`Tailor this resume to the following job description. Adjust the summary, skills and bullet points toward its requirements and keywords. Do not invent experience.

Job description:
${jd}`)}
            onRefine={() => handleRefineWithPrompt(aiPrompt)}
            onRestore={historyText ? handleRestoreVersion : null}
            onClose={() => setStudioPanel(null)}
          />
        )}

        {/* Right Side: AI Refine Sidebar (cover letters) */}
        {!isResume && (
        <div className="cl-ai-sidebar" onClick={e => e.stopPropagation()}>
          <div className="cl-sidebar-header">
            <Sparkles size={16} className="text-blue" />
            <h3 className="cl-sidebar-title">AI Assistant</h3>
          </div>
          
          <div className="cl-sidebar-body">
            <div className="cl-sidebar-desc">
              Type instructions or details to refine your resume/cover letter or generate new sections tailored precisely.
            </div>

            <textarea
              className="cl-sidebar-textarea"
              placeholder={selectedTemplate?.type === 'cover-letter' 
                ? "e.g., Rewrite this to emphasize my remote team collaboration, or:\nGenerate a cover letter for a Product Designer role at Figma."
                : "e.g., Highlight my cloud scaling experience with AWS, or:\nRewrite my summary to sound more like a tech lead."}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
            />

            {/* Prompt Presets */}
            <div className="cl-sidebar-presets">
              <span className="cl-presets-title">Quick presets:</span>
              <div className="cl-presets-list">
                {[
                  "Make it more professional",
                  "Highlight leadership & achievements",
                  "Make it short & concise",
                  "Tailor it for a tech startup",
                ].map(preset => (
                  <button
                    key={preset}
                    className="cl-preset-chip"
                    onClick={() => setAiPrompt(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="cl-sidebar-actions">
              <button 
                className="cl-sidebar-btn cl-btn-refine"
                disabled={refining}
                onClick={() => handleRefineWithPrompt()}
              >
                {refining ? <Loader2 size={14} className="cl-spin" /> : <Sparkles size={14} />} Refine Copy
              </button>
              
              {selectedTemplate?.type === 'cover-letter' && (
                <button 
                  className="cl-sidebar-btn cl-btn-generate"
                  disabled={refining}
                  onClick={handleGenerateFromScratch}
                >
                  {refining ? <Loader2 size={14} className="cl-spin" /> : <Sparkles size={14} />} Write From Scratch
                </button>
              )}
            </div>

            {/* Undo option */}
            {historyText && (
              <button className="cl-sidebar-restore-btn" onClick={handleRestoreVersion}>
                <RotateCcw size={12} /> Undo / Compare Last AI Edit
              </button>
            )}
          </div>
        </div>
        )}

      </div>

      {isResume && <EntryToolbar editorRef={editorRef} exec={exec} onStructural={recordStructural} />}
      {isResume && <SelectionToolbar editorRef={editorRef} exec={exec} onLink={() => { saveSelection(); applyLink(); }} />}
      {isResume && arrange && (
        <RearrangeModal
          initial={arrange.initial}
          pageHeight={arrange.pageHeight}
          onApply={cols => { recordStructural(() => applyColumns(cols)); setArrange(null); }}
          onClose={() => setArrange(null)}
        />
      )}
      {isResume && showDownload && (
        <ResumeDownload
          defaultName={activeWorkTitle}
          paper={paperSize}
          getHtml={() => editorRef.current?.innerHTML || ''}
          getText={() => editorRef.current?.innerText || ''}
          customApiKey={customApiKey}
          onWord={handleDownloadDOCX}
          onScan={fromTailor ? undefined : jd => { setShowDownload(false); setTailorSeed(t => ({ jd, n: t.n + 1 })); setStudioPanel('tailor'); }}
          onClose={() => setShowDownload(false)}
        />
      )}
      {isResume && <PhotoHover editorRef={editorRef} onUpload={setPhotoTarget} onHide={img => recordStructural(() => img.remove())} />}
      {isResume && photoTarget && (
        <PhotoDialog
          currentSrc={photoTarget.src}
          onSave={src => { const img = photoTarget; recordStructural(() => { img.src = src; }); setPhotoTarget(null); }}
          onClose={() => setPhotoTarget(null)}
        />
      )}
      {isResume && showPreview && <StudioPreview html={previewHtml} onClose={() => setShowPreview(false)} />}

      {/* Footer */}
      {!isResume && (
      <div className="cl-editor-footer">
        <button className="btn-secondary" onClick={() => setStep('gallery')}><RotateCcw size={13} /> Change Template</button>
        <div className="cl-footer-right">
          <span className="cl-footer-hint">
            <Sparkles size={12} /> {selectedTemplate?.type === 'cover-letter' 
              ? 'AI Refine polishes your entire cover letter with CV Mind' 
              : 'AI Refine polishes your entire resume with CV Mind'}
          </span>
          <button className="cl-ai-btn-lg" disabled={refining} onClick={handleRefine}
            style={{ '--ac': selectedTemplate?.color || '#2997ff' } as React.CSSProperties}>
            {refining ? <><Loader2 size={15} className="cl-spin" /> Refining…</> : <><Sparkles size={15} /> AI Refine {selectedTemplate?.type === 'cover-letter' ? 'Letter' : 'Resume'}</>}
          </button>
        </div>
      </div>
      )}

      {toast && <div className={`cl-toast${toast.ok ? '' : ' cl-toast--error'}`} role={toast.ok ? 'status' : 'alert'}>{toast.text}</div>}
    </div>
  );
}
