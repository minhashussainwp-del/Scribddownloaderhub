import React, { useState } from 'react';
import {
  LayoutGrid,
  Megaphone,
  FileText,
  BookOpen,
  Globe,
  Search,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Eye,
  Code,
  Check,
  ArrowLeft,
  Layers,
  LogOut,
  Copy,
  Braces,
  Sliders,
  Terminal
} from 'lucide-react';
import {
  CmsStoreState,
  DEFAULT_CMS_STATE,
  DEFAULT_READING_AND_LAYOUT,
  SiteReadingAndLayoutSettings,
  BlogPostItem,
  CustomPageItem,
  LanguageConfig,
  AdSlotConfig,
  UIStringTranslations,
  SeoLanguageConfig,
  ContentSwitcherSectionItem,
  ShortcodeItem,
  WORLD_LANGUAGE_PRESETS,
  detectBrowserAndRegionLanguage,
  ADMIN_AUTHORIZED_EMAIL,
  computeYoastSeoAnalysis
} from '../lib/cmsStore';
import WordPressEditor from './WordPressEditor';
import YoastSeoPanel from './YoastSeoPanel';
import LanguageVariationsSidebar from './LanguageVariationsSidebar';
import AdminApiAndDocsPanel from './AdminApiAndDocsPanel';

interface AdminDashboardProps {
  cms: CmsStoreState;
  onUpdateCms: (next: CmsStoreState) => void;
  onExitAdmin: () => void;
  onLogoutAdmin: () => void;
  onPreviewBlogPost: (slug: string) => void;
  onPreviewCustomPage: (slug: string) => void;
  onLoadDocumentInViewer?: (url: string) => void;
}

type AdminSection =
  | 'ads'
  | 'homepage'
  | 'reading'
  | 'blog'
  | 'pages'
  | 'shortcodes'
  | 'polylang'
  | 'seo'
  | 'api-docs';

export default function AdminDashboard({
  cms,
  onUpdateCms,
  onExitAdmin,
  onLogoutAdmin,
  onPreviewBlogPost,
  onPreviewCustomPage,
  onLoadDocumentInViewer
}: AdminDashboardProps) {
  const [section, setSection] = useState<AdminSection>('api-docs');
  const [editingLang, setEditingLang] = useState<string>(cms.activeLanguage || 'en');
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // Active Switcher Tab index inside Homepage Editor
  const [activeHomeSwitcherIdx, setActiveHomeSwitcherIdx] = useState<number>(0);

  // Blog Editor State
  const [editingPost, setEditingPost] = useState<BlogPostItem | null>(null);

  // Custom Page Editor State + Active Switcher Tab inside Page Editor
  const [editingPage, setEditingPage] = useState<CustomPageItem | null>(null);
  const [activePageSwitcherIdx, setActivePageSwitcherIdx] = useState<number>(0);

  // Custom Shortcode Builder State
  const [editingShortcode, setEditingShortcode] = useState<ShortcodeItem | null>(null);
  const [copiedShortcodeTag, setCopiedShortcodeTag] = useState<string | null>(null);

  // New Language Modal Form State
  const [newLangCode, setNewLangCode] = useState('');
  const [newLangName, setNewLangName] = useState('');
  const [newLangNative, setNewLangNative] = useState('');
  const [newLangFlag, setNewLangFlag] = useState('🌐');
  const [newLangDir, setNewLangDir] = useState<'ltr' | 'rtl'>('ltr');
  const [newLangRegions, setNewLangRegions] = useState('');

  // New Ad Slot Form State
  const [newAdName, setNewAdName] = useState('');
  const [newAdZone, setNewAdZone] = useState<NonNullable<AdSlotConfig['placementZone']>>(
    'header-leaderboard'
  );
  const [newAdDimensions, setNewAdDimensions] = useState('728×90 / Responsive');
  const [newAdHtml, setNewAdHtml] = useState(
    `<div style="background:#eff6ff;border:1px dashed #60a5fa;border-radius:10px;padding:16px;text-align:center;font-size:12px;color:#1e40af;">\n  <strong>Custom Ad Banner</strong> — Paste your Google AdSense, Adsterra, or custom HTML script here.\n</div>`
  );

  const detectedBrowserInfo = detectBrowserAndRegionLanguage(cms.languages, true);

  const triggerSavedToast = (msg: string) => {
    setSavedBanner(msg);
    setTimeout(() => setSavedBanner(null), 2200);
  };

  const currentStrings: UIStringTranslations =
    cms.translations[editingLang] || cms.translations.en;

  const handleStringChange = (key: keyof UIStringTranslations, val: any) => {
    const next: CmsStoreState = {
      ...cms,
      translations: {
        ...cms.translations,
        [editingLang]: {
          ...currentStrings,
          [key]: val
        }
      }
    };
    onUpdateCms(next);
  };

  // Homepage Multi-Content Switcher Handlers
  const homeSwitcherList: ContentSwitcherSectionItem[] =
    currentStrings.homeSwitcherSections || [];

  const handleAddHomeSwitcherTab = () => {
    const newTab: ContentSwitcherSectionItem = {
      id: `home-tab-${Date.now()}`,
      tabLabel: `New Content Tab ${homeSwitcherList.length + 1}`,
      badgeText: 'Featured',
      title: 'New Switchable Content Section Heading',
      contentHtml: `<p>Edit this tab content using the <strong>WordPress Visual or Code Editor</strong> below.</p>`
    };
    const updated = [...homeSwitcherList, newTab];
    handleStringChange('homeSwitcherSections', updated);
    setActiveHomeSwitcherIdx(updated.length - 1);
    triggerSavedToast('Added new Homepage Content Switcher tab.');
  };

  const handleUpdateHomeSwitcherTab = (
    idx: number,
    patch: Partial<ContentSwitcherSectionItem>
  ) => {
    const updated = homeSwitcherList.map((item, i) =>
      i === idx ? { ...item, ...patch } : item
    );
    handleStringChange('homeSwitcherSections', updated);
  };

  const handleDeleteHomeSwitcherTab = (idx: number) => {
    const updated = homeSwitcherList.filter((_, i) => i !== idx);
    handleStringChange('homeSwitcherSections', updated);
    setActiveHomeSwitcherIdx(0);
    triggerSavedToast('Removed Homepage Content Switcher tab.');
  };

  // Current language SEO helper
  const currentSeo: SeoLanguageConfig = cms.seo[editingLang] || cms.seo.en;

  const handleSeoChange = (key: keyof SeoLanguageConfig, val: string) => {
    const next: CmsStoreState = {
      ...cms,
      seo: {
        ...cms.seo,
        [editingLang]: {
          ...currentSeo,
          [key]: val
        }
      }
    };
    onUpdateCms(next);
  };

  // Ads Manager Handlers (Toggle, Edit, Add New Ad Slot, Delete Ad Slot)
  const handleToggleAd = (adId: string) => {
    const nextAds = cms.ads.map((a) =>
      a.id === adId ? { ...a, enabled: !a.enabled } : a
    );
    onUpdateCms({ ...cms, ads: nextAds });
    triggerSavedToast('Ad slot status updated.');
  };

  const handleAdHtmlChange = (adId: string, htmlCode: string) => {
    const nextAds = cms.ads.map((a) =>
      a.id === adId ? { ...a, htmlCode } : a
    );
    onUpdateCms({ ...cms, ads: nextAds });
  };

  const handleUpdateAdMeta = (adId: string, patch: Partial<AdSlotConfig>) => {
    const nextAds = cms.ads.map((a) =>
      a.id === adId ? { ...a, ...patch } : a
    );
    onUpdateCms({ ...cms, ads: nextAds });
  };

  const handleAddAdSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newAdName.trim() || `Custom Ad Banner #${cms.ads.length + 1}`;
    const zoneDescriptions: Record<string, string> = {
      'header-leaderboard': 'Displayed in the top header leaderboard area across pages',
      'below-downloader-banner': 'Displayed directly below the Fetch & Download PDF box',
      'above-viewer-banner': 'Displayed right above the unlocked PDF viewer',
      'in-article-tutorial': 'Displayed between the tutorial and blog section on Homepage',
      'blog-top-banner': 'Displayed at the top of Blog Archive & Blog Articles',
      'page-top-banner': 'Displayed inside Custom Static Pages',
      'footer-sticky-banner': 'Displayed above the website footer across all pages',
      'custom-shortcode': 'Embed anywhere using its shortcode tag in the WordPress Editor'
    };

    const newSlotId = `ad-slot-${Date.now().toString().slice(-5)}`;
    const newAd: AdSlotConfig = {
      id: newSlotId,
      name: cleanName,
      locationDescription: zoneDescriptions[newAdZone] || 'Custom Ad Placement',
      dimensions: newAdDimensions.trim() || 'Responsive',
      enabled: true,
      htmlCode: newAdHtml,
      placementZone: newAdZone
    };

    onUpdateCms({
      ...cms,
      ads: [newAd, ...cms.ads]
    });
    setNewAdName('');
    triggerSavedToast(`Added new Ad Slot: "${cleanName}"`);
  };

  const handleDeleteAdSlot = (adId: string) => {
    const target = cms.ads.find((a) => a.id === adId);
    const nextAds = cms.ads.filter((a) => a.id !== adId);
    onUpdateCms({
      ...cms,
      ads: nextAds
    });
    triggerSavedToast(`Deleted Ad Slot: "${target?.name || adId}"`);
  };

  // Blog Post Handlers
  const handleCreateNewPost = (langCode = editingLang, groupId?: string) => {
    const now = new Date().toISOString().slice(0, 10);
    const newId = `post-${Date.now()}`;
    const newPost: BlogPostItem = {
      id: newId,
      slug: `new-scribd-guide-${Date.now().toString().slice(-4)}`,
      lang: langCode,
      translationGroupId: groupId || `group-blog-${Date.now()}`,
      title: 'New Blog Article Title',
      excerpt: 'Short summary description of this article for blog cards and SEO...',
      contentHtml: `<h2>Article Subheading</h2><p>Write your blog post content here using the <strong>WordPress Visual & HTML Editor</strong>. You can format headings, insert comparison tables, FAQ accordions, images, or switch to the Code tab.</p>`,
      author: 'Admin',
      publishedAt: now,
      status: 'published',
      seoTitle: '',
      seoDescription: ''
    };
    setEditingPost(newPost);
  };

  const handleSaveBlogPost = () => {
    if (!editingPost) return;
    const exists = cms.blogPosts.some((p) => p.id === editingPost.id);
    const nextPosts = exists
      ? cms.blogPosts.map((p) => (p.id === editingPost.id ? editingPost : p))
      : [editingPost, ...cms.blogPosts];
    onUpdateCms({ ...cms, blogPosts: nextPosts });
    setEditingPost(null);
    triggerSavedToast('Blog post saved & published.');
  };

  const handleDeleteBlogPost = (postId: string) => {
    onUpdateCms({
      ...cms,
      blogPosts: cms.blogPosts.filter((p) => p.id !== postId)
    });
    triggerSavedToast('Blog post deleted.');
  };

  // Custom Page Handlers
  const handleCreateNewPage = (langCode = editingLang, groupId?: string) => {
    const newId = `page-${Date.now()}`;
    const newPage: CustomPageItem = {
      id: newId,
      slug: `custom-page-${Date.now().toString().slice(-4)}`,
      lang: langCode,
      translationGroupId: groupId || `group-page-${Date.now()}`,
      title: 'New Custom Page',
      contentHtml: `<h2>Main Page Introduction</h2>\n<p>Use the WordPress Visual Editor below to customize this page, and add Multiple Content Switcher tabs underneath.</p>`,
      switcherSections: [
        {
          id: `pg-tab-${Date.now()}-1`,
          tabLabel: 'Overview Tab',
          badgeText: 'Section 1',
          title: 'Overview & Key Information',
          contentHtml: `<p>First switchable content tab on this page.</p>`
        },
        {
          id: `pg-tab-${Date.now()}-2`,
          tabLabel: 'Details & Specifications',
          badgeText: 'Section 2',
          title: 'Detailed Breakdown',
          contentHtml: `<p>Second switchable content tab on this page.</p>`
        }
      ],
      showInHeader: true,
      showInFooter: true,
      status: 'published',
      seoTitle: '',
      seoDescription: ''
    };
    setEditingPage(newPage);
    setActivePageSwitcherIdx(0);
  };

  const handleSaveCustomPage = () => {
    if (!editingPage) return;
    const exists = cms.pages.some((p) => p.id === editingPage.id);
    const nextPages = exists
      ? cms.pages.map((p) => (p.id === editingPage.id ? editingPage : p))
      : [...cms.pages, editingPage];
    onUpdateCms({ ...cms, pages: nextPages });
    setEditingPage(null);
    triggerSavedToast('Custom page saved & published.');
  };

  const handleDeleteCustomPage = (pageId: string) => {
    onUpdateCms({
      ...cms,
      pages: cms.pages.filter((p) => p.id !== pageId)
    });
    triggerSavedToast('Custom page removed.');
  };

  // Language Variations Hub Handlers for Custom Pages
  const handleCreatePageVariation = (targetLangCode: string) => {
    if (!editingPage) return;
    const exists = cms.pages.some((p) => p.id === editingPage.id);
    const updatedPages = exists
      ? cms.pages.map((p) => (p.id === editingPage.id ? editingPage : p))
      : [...cms.pages, editingPage];

    const targetLangObj = cms.languages.find((l) => l.code === targetLangCode);
    const langSuffix = targetLangCode.toLowerCase();
    const baseSlug = editingPage.slug.replace(new RegExp(`-${editingPage.lang}$`), '');
    const newSlug = `${baseSlug}-${langSuffix}`;

    const newVariation: CustomPageItem = {
      ...editingPage,
      id: `page-${Date.now()}-${langSuffix}`,
      slug: newSlug,
      lang: targetLangCode,
      translationGroupId: editingPage.translationGroupId,
      title: `${editingPage.title} (${targetLangObj?.name || targetLangCode.toUpperCase()})`,
      seoTitle: editingPage.seoTitle ? `${editingPage.seoTitle} (${targetLangCode.toUpperCase()})` : '',
      seoDescription: editingPage.seoDescription || '',
      switcherSections: (editingPage.switcherSections || []).map((sec, i) => ({
        ...sec,
        id: `pg-tab-${Date.now()}-${i}`
      }))
    };

    const finalPages = [...updatedPages, newVariation];
    onUpdateCms({ ...cms, pages: finalPages });
    setEditingPage(newVariation);
    setActivePageSwitcherIdx(0);
    triggerSavedToast(`Created ${targetLangObj?.flag || ''} ${targetLangObj?.name || targetLangCode} variation! Switched editor.`);
  };

  const handleSwitchPageVariation = (targetPageId: string) => {
    if (!editingPage) return;
    const exists = cms.pages.some((p) => p.id === editingPage.id);
    const updatedPages = exists
      ? cms.pages.map((p) => (p.id === editingPage.id ? editingPage : p))
      : [...cms.pages, editingPage];

    const target = updatedPages.find((p) => p.id === targetPageId);
    if (target) {
      onUpdateCms({ ...cms, pages: updatedPages });
      setEditingPage(target);
      setActivePageSwitcherIdx(0);
      triggerSavedToast(`Switched to ${target.lang.toUpperCase()} variation: "${target.title}"`);
    }
  };

  const handleCloneAllMissingPageVariations = () => {
    if (!editingPage) return;
    const exists = cms.pages.some((p) => p.id === editingPage.id);
    const currentPagesList = exists
      ? cms.pages.map((p) => (p.id === editingPage.id ? editingPage : p))
      : [...cms.pages, editingPage];

    const existingLangs = new Set(
      currentPagesList
        .filter((p) => p.translationGroupId === editingPage.translationGroupId)
        .map((p) => p.lang.toLowerCase())
    );

    const missing = cms.languages.filter(
      (l) => l.enabled && !existingLangs.has(l.code.toLowerCase())
    );

    if (missing.length === 0) {
      triggerSavedToast('All enabled languages already have variations for this page!');
      return;
    }

    const newVariations: CustomPageItem[] = missing.map((lang, idx) => {
      const baseSlug = editingPage.slug.replace(new RegExp(`-${editingPage.lang}$`), '');
      return {
        ...editingPage,
        id: `page-${Date.now()}-${idx}-${lang.code}`,
        slug: `${baseSlug}-${lang.code}`,
        lang: lang.code,
        translationGroupId: editingPage.translationGroupId,
        title: `${editingPage.title} (${lang.name})`,
        switcherSections: (editingPage.switcherSections || []).map((sec, i) => ({
          ...sec,
          id: `pg-tab-${Date.now()}-${idx}-${i}`
        }))
      };
    });

    const finalPages = [...currentPagesList, ...newVariations];
    onUpdateCms({ ...cms, pages: finalPages });
    triggerSavedToast(`Cloned to ${missing.length} missing language variations!`);
  };

  // Language Variations Hub Handlers for Blog Posts
  const handleCreatePostVariation = (targetLangCode: string) => {
    if (!editingPost) return;
    const exists = cms.blogPosts.some((p) => p.id === editingPost.id);
    const updatedPosts = exists
      ? cms.blogPosts.map((p) => (p.id === editingPost.id ? editingPost : p))
      : [editingPost, ...cms.blogPosts];

    const targetLangObj = cms.languages.find((l) => l.code === targetLangCode);
    const langSuffix = targetLangCode.toLowerCase();
    const baseSlug = editingPost.slug.replace(new RegExp(`-${editingPost.lang}$`), '');
    const newSlug = `${baseSlug}-${langSuffix}`;

    const newVariation: BlogPostItem = {
      ...editingPost,
      id: `post-${Date.now()}-${langSuffix}`,
      slug: newSlug,
      lang: targetLangCode,
      translationGroupId: editingPost.translationGroupId,
      title: `${editingPost.title} (${targetLangObj?.name || targetLangCode.toUpperCase()})`,
      seoTitle: editingPost.seoTitle ? `${editingPost.seoTitle} (${targetLangCode.toUpperCase()})` : '',
      seoDescription: editingPost.seoDescription || ''
    };

    const finalPosts = [newVariation, ...updatedPosts];
    onUpdateCms({ ...cms, blogPosts: finalPosts });
    setEditingPost(newVariation);
    triggerSavedToast(`Created ${targetLangObj?.flag || ''} ${targetLangObj?.name || targetLangCode} blog variation!`);
  };

  const handleSwitchPostVariation = (targetPostId: string) => {
    if (!editingPost) return;
    const exists = cms.blogPosts.some((p) => p.id === editingPost.id);
    const updatedPosts = exists
      ? cms.blogPosts.map((p) => (p.id === editingPost.id ? editingPost : p))
      : [editingPost, ...cms.blogPosts];

    const target = updatedPosts.find((p) => p.id === targetPostId);
    if (target) {
      onUpdateCms({ ...cms, blogPosts: updatedPosts });
      setEditingPost(target);
      triggerSavedToast(`Switched to ${target.lang.toUpperCase()} blog post.`);
    }
  };

  const handleCloneAllMissingPostVariations = () => {
    if (!editingPost) return;
    const exists = cms.blogPosts.some((p) => p.id === editingPost.id);
    const currentPostsList = exists
      ? cms.blogPosts.map((p) => (p.id === editingPost.id ? editingPost : p))
      : [editingPost, ...cms.blogPosts];

    const existingLangs = new Set(
      currentPostsList
        .filter((p) => p.translationGroupId === editingPost.translationGroupId)
        .map((p) => p.lang.toLowerCase())
    );

    const missing = cms.languages.filter(
      (l) => l.enabled && !existingLangs.has(l.code.toLowerCase())
    );

    if (missing.length === 0) {
      triggerSavedToast('All enabled languages already have variations for this post!');
      return;
    }

    const newVariations: BlogPostItem[] = missing.map((lang, idx) => {
      const baseSlug = editingPost.slug.replace(new RegExp(`-${editingPost.lang}$`), '');
      return {
        ...editingPost,
        id: `post-${Date.now()}-${idx}-${lang.code}`,
        slug: `${baseSlug}-${lang.code}`,
        lang: lang.code,
        translationGroupId: editingPost.translationGroupId,
        title: `${editingPost.title} (${lang.name})`
      };
    });

    const finalPosts = [...newVariations, ...currentPostsList];
    onUpdateCms({ ...cms, blogPosts: finalPosts });
    triggerSavedToast(`Cloned to ${missing.length} missing language variations!`);
  };

  // Page Multi-Content Switcher Tab Helpers
  const handleAddPageSwitcherTab = () => {
    if (!editingPage) return;
    const list = editingPage.switcherSections || [];
    const newTab: ContentSwitcherSectionItem = {
      id: `pg-tab-${Date.now()}`,
      tabLabel: `Tab ${list.length + 1}`,
      badgeText: `Tab ${list.length + 1}`,
      title: `Switchable Content Section ${list.length + 1}`,
      contentHtml: `<p>Write content for this tab in the WordPress Editor...</p>`
    };
    const nextList = [...list, newTab];
    setEditingPage({ ...editingPage, switcherSections: nextList });
    setActivePageSwitcherIdx(nextList.length - 1);
  };

  const handleUpdatePageSwitcherTab = (
    idx: number,
    patch: Partial<ContentSwitcherSectionItem>
  ) => {
    if (!editingPage) return;
    const list = editingPage.switcherSections || [];
    const nextList = list.map((item, i) => (i === idx ? { ...item, ...patch } : item));
    setEditingPage({ ...editingPage, switcherSections: nextList });
  };

  const handleDeletePageSwitcherTab = (idx: number) => {
    if (!editingPage) return;
    const list = editingPage.switcherSections || [];
    const nextList = list.filter((_, i) => i !== idx);
    setEditingPage({ ...editingPage, switcherSections: nextList });
    setActivePageSwitcherIdx(0);
  };

  // Polylang Language Manager Handlers
  const handleAddLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newLangCode.trim().toLowerCase();
    if (!code || !newLangName.trim()) return;
    if (cms.languages.some((l) => l.code === code)) return;

    const parsedRegions = newLangRegions
      .split(',')
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);

    const newLang: LanguageConfig = {
      code,
      name: newLangName.trim(),
      nativeName: newLangNative.trim() || newLangName.trim(),
      flag: newLangFlag.trim() || '🌐',
      dir: newLangDir,
      isDefault: false,
      enabled: true,
      regions: parsedRegions.length > 0 ? parsedRegions : [code.toUpperCase()]
    };

    onUpdateCms({
      ...cms,
      languages: [...cms.languages, newLang],
      translations: {
        ...cms.translations,
        [code]: { ...cms.translations.en }
      },
      seo: {
        ...cms.seo,
        [code]: { ...cms.seo.en }
      }
    });

    setNewLangCode('');
    setNewLangName('');
    setNewLangNative('');
    setNewLangRegions('');
    triggerSavedToast(`Added language: ${newLang.name} (${newLang.code.toUpperCase()})`);
  };

  const handleQuickAddPresetLanguage = (preset: LanguageConfig) => {
    if (cms.languages.some((l) => l.code === preset.code)) {
      triggerSavedToast(`${preset.name} (${preset.code.toUpperCase()}) is already added.`);
      return;
    }
    const newLang: LanguageConfig = {
      ...preset,
      isDefault: false,
      enabled: true
    };
    onUpdateCms({
      ...cms,
      languages: [...cms.languages, newLang],
      translations: {
        ...cms.translations,
        [preset.code]: cms.translations[preset.code] || { ...cms.translations.en }
      },
      seo: {
        ...cms.seo,
        [preset.code]: cms.seo[preset.code] || { ...cms.seo.en }
      }
    });
    triggerSavedToast(`Added ${preset.flag} ${preset.name} (${preset.code.toUpperCase()})!`);
  };

  const handleUpdateLanguageRegions = (code: string, regionsCsv: string) => {
    const parsedRegions = regionsCsv
      .split(',')
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);
    const nextLangs = cms.languages.map((l) =>
      l.code === code ? { ...l, regions: parsedRegions } : l
    );
    onUpdateCms({ ...cms, languages: nextLangs });
  };

  const readingConfig: SiteReadingAndLayoutSettings =
    cms.readingAndLayout || DEFAULT_READING_AND_LAYOUT;

  const handleUpdateReadingAndLayout = (
    patch: Partial<SiteReadingAndLayoutSettings>,
    toastMsg?: string
  ) => {
    onUpdateCms({
      ...cms,
      readingAndLayout: {
        ...readingConfig,
        ...patch
      }
    });
    if (toastMsg) {
      triggerSavedToast(toastMsg);
    }
  };

  const handleSetDefaultLanguage = (code: string) => {
    const nextLangs = cms.languages.map((l) => ({
      ...l,
      isDefault: l.code === code,
      enabled: l.code === code ? true : l.enabled
    }));
    onUpdateCms({
      ...cms,
      activeLanguage: code,
      languages: nextLangs
    });
    triggerSavedToast(`Default language set to ${code.toUpperCase()}`);
  };

  const handleToggleLanguageEnabled = (code: string) => {
    const target = cms.languages.find((l) => l.code === code);
    if (!target || target.isDefault) return;
    const nextLangs = cms.languages.map((l) =>
      l.code === code ? { ...l, enabled: !l.enabled } : l
    );
    onUpdateCms({ ...cms, languages: nextLangs });
  };

  const handleDeleteLanguage = (code: string) => {
    if (cms.languages.length <= 1) {
      triggerSavedToast('At least one language must remain active.');
      return;
    }

    const remaining = cms.languages.filter((l) => l.code !== code);
    const hasDefault = remaining.some((l) => l.isDefault);
    const normalizedLangs = remaining.map((l, idx) =>
      !hasDefault && idx === 0
        ? { ...l, isDefault: true, enabled: true }
        : l
    );

    const fallbackCode =
      normalizedLangs.find((l) => l.isDefault)?.code ||
      normalizedLangs[0].code;

    const nextActive =
      cms.activeLanguage === code ? fallbackCode : cms.activeLanguage;

    if (editingLang === code) {
      setEditingLang(fallbackCode);
    }

    onUpdateCms({
      ...cms,
      activeLanguage: nextActive,
      languages: normalizedLangs
    });
    triggerSavedToast(`Language (${code.toUpperCase()}) deleted.`);
  };

  // Custom Shortcodes Builder Handlers
  const handleCreateNewShortcode = () => {
    const now = new Date().toISOString().slice(0, 10);
    const suffix = Date.now().toString().slice(-4);
    const newItem: ShortcodeItem = {
      id: `sc-${Date.now()}`,
      tag: `custom_design_${suffix}`,
      name: `Custom Design Block #${suffix}`,
      description: 'Custom HTML/CSS design block that can be embedded on any page or post using [shortcode].',
      enabled: true,
      updatedAt: now,
      htmlCode: `<div style="background:linear-gradient(135deg,#0f172a,#1e293b);color:#ffffff;padding:24px;border-radius:12px;margin:16px 0;border:1px solid #334155;">
  <h3 style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#38bdf8;">Custom Shortcode Design Block</h3>
  <p style="margin:0 0 14px 0;font-size:13px;color:#cbd5e1;line-height:1.6;">Design anything here with custom HTML, inline CSS, cards, tables, or call-to-action buttons and insert it into any page using its shortcode tag.</p>
  <a href="#top" style="display:inline-block;background:#2563eb;color:#ffffff;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">Action Button</a>
</div>`
    };
    setEditingShortcode(newItem);
  };

  const handleSaveShortcode = () => {
    if (!editingShortcode) return;
    const sanitizedTag = editingShortcode.tag
      .trim()
      .replace(/^\[|\]$/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();

    if (!sanitizedTag) return;

    const updatedItem: ShortcodeItem = {
      ...editingShortcode,
      tag: sanitizedTag,
      updatedAt: new Date().toISOString().slice(0, 10)
    };

    const list = cms.shortcodes || [];
    const exists = list.some((s) => s.id === updatedItem.id);
    const nextList = exists
      ? list.map((s) => (s.id === updatedItem.id ? updatedItem : s))
      : [updatedItem, ...list];

    onUpdateCms({ ...cms, shortcodes: nextList });
    setEditingShortcode(null);
    triggerSavedToast(`Shortcode [${sanitizedTag}] saved & ready to use on any page!`);
  };

  const handleDeleteShortcode = (id: string) => {
    const nextList = (cms.shortcodes || []).filter((s) => s.id !== id);
    onUpdateCms({ ...cms, shortcodes: nextList });
    triggerSavedToast('Shortcode deleted.');
  };

  const handleToggleShortcode = (id: string) => {
    const nextList = (cms.shortcodes || []).map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    onUpdateCms({ ...cms, shortcodes: nextList });
    triggerSavedToast('Shortcode status updated.');
  };

  const handleCopyShortcodeTag = (tag: string) => {
    const token = `[${tag}]`;
    navigator.clipboard.writeText(token);
    setCopiedShortcodeTag(tag);
    setTimeout(() => setCopiedShortcodeTag(null), 1800);
  };

  const currentHomeTab = homeSwitcherList[activeHomeSwitcherIdx] || null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100">
      {/* Admin Left Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-200 shrink-0 flex flex-col justify-between p-4">
        <div className="space-y-5">
          <div className="px-2 pt-1 space-y-3 border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white font-display">
                  KMG Admin Panel
                </div>
                <div className="text-[11px] text-emerald-400 font-mono truncate max-w-[160px]">
                  {ADMIN_AUTHORIZED_EMAIL}
                </div>
              </div>
              <button
                type="button"
                onClick={onExitAdmin}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded flex items-center gap-1 cursor-pointer"
                title="Open Public User Website (/)"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Public Site</span>
              </button>
            </div>

            <a
              href="/api/admin/download-wp-plugin?v=3.0.0"
              download="scribd-downloader-pro.zip"
              className="w-full px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <span>⬇ Download WP Plugin v3.0 (.zip)</span>
            </a>
          </div>

          {/* Global Editing Language Selector inside Admin (Polylang Switcher) */}
          <div className="px-2 space-y-1.5">
            <label className="text-[11px] font-medium text-slate-400 block">
              Editing Language (Polylang):
            </label>
            <select
              value={editingLang}
              onChange={(e) => {
                setEditingLang(e.target.value);
                setActiveHomeSwitcherIdx(0);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {cms.languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name} ({l.code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <nav className="space-y-1">
            {(
              [
                { id: 'api-docs', label: 'WP Plugin (.zip), API & Docs', icon: Terminal },
                { id: 'reading', label: 'Reading, Header & Footer', icon: Sliders },
                { id: 'homepage', label: 'Homepage & Content Switcher', icon: LayoutGrid },
                { id: 'pages', label: `Pages & Important Pages (${cms.pages.length})`, icon: FileText },
                { id: 'shortcodes', label: `Shortcodes Builder (${(cms.shortcodes || []).length})`, icon: Braces },
                { id: 'blog', label: `Blog Posts Editor (${cms.blogPosts.length})`, icon: BookOpen },
                { id: 'ads', label: 'Ads Placement Manager', icon: Megaphone },
                { id: 'polylang', label: `Languages (${cms.languages.length})`, icon: Globe },
                { id: 'seo', label: 'SEO & Schema Settings', icon: Search }
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSection(item.id);
                    setEditingPost(null);
                    setEditingPage(null);
                    setEditingShortcode(null);
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800 mt-6 space-y-2">
          <button
            type="button"
            onClick={() => {
              onUpdateCms(DEFAULT_CMS_STATE);
              triggerSavedToast('Reset all CMS settings to factory defaults.');
            }}
            className="w-full px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default CMS Data</span>
          </button>

          <button
            type="button"
            onClick={onLogoutAdmin}
            className="w-full px-3 py-2 text-xs font-semibold text-red-300 hover:text-white bg-red-950/50 hover:bg-red-600 border border-red-900/60 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out (/kmg)</span>
          </button>
        </div>
      </aside>

      {/* Admin Main Content Viewport */}
      <div className="flex-1 p-5 sm:p-8 overflow-y-auto space-y-6">
        {savedBanner && (
          <div className="p-3 bg-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{savedBanner}</span>
            </div>
          </div>
        )}

        {/* 0. READING SETTINGS (STATIC HOMEPAGE & BLOG PAGE SELECTION) + HEADER & FOOTER MENUS */}
        {section === 'reading' && (
          <div className="space-y-6 max-w-5xl">
            {/* WordPress Reading Settings: Manual Static Homepage & Blog Page Selection */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-blue-600" />
                    <span>Reading Settings — Manual Homepage & Blog Page Selection</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Just like WordPress Reading Settings: choose whether your Front Page and Blog Page use the default layout or any custom Static Page you created.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerSavedToast('Reading, Header & Footer settings saved!')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Settings</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Front Page / Homepage Selector Card */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="text-xs font-mono font-bold text-blue-600 uppercase">
                    1. Homepage (Front Page) Display
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <label className="flex items-start gap-2.5 cursor-pointer p-2.5 bg-white border border-slate-200 rounded-lg">
                      <input
                        type="radio"
                        name="homepageMode"
                        checked={readingConfig.homepageMode === 'default-downloader'}
                        onChange={() =>
                          handleUpdateReadingAndLayout(
                            { homepageMode: 'default-downloader' },
                            'Homepage set to Default Scribd Downloader.'
                          )
                        }
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-bold text-slate-900">
                          Default Built-in Scribd Downloader Homepage
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Shows the main Downloader hero, 3-Step Tutorial, Multi-Content Switcher, and Latest Blog Posts.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer p-2.5 bg-white border border-slate-200 rounded-lg">
                      <input
                        type="radio"
                        name="homepageMode"
                        checked={readingConfig.homepageMode === 'static-page'}
                        onChange={() =>
                          handleUpdateReadingAndLayout(
                            { homepageMode: 'static-page' },
                            'Homepage switched to Static Page mode!'
                          )
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-slate-900">
                          A Static Page (Select Manual Homepage Below)
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Use any Custom Page (with <code className="font-mono">[scribd_downloader]</code> or your own custom HTML/Shortcodes) as your main Front Page (<code className="font-mono">/</code>).
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Select Static Page for Homepage:
                      </label>
                      <select
                        value={readingConfig.homepageStaticPageId}
                        onChange={(e) =>
                          handleUpdateReadingAndLayout(
                            {
                              homepageMode: 'static-page',
                              homepageStaticPageId: e.target.value
                            },
                            'Selected Static Homepage updated!'
                          )
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                      >
                        {cms.pages.map((pg) => (
                          <option key={pg.id} value={pg.id}>
                            {pg.title} (/p/{pg.slug} · {pg.lang.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={readingConfig.showDownloaderOnStaticHome}
                        onChange={(e) =>
                          handleUpdateReadingAndLayout({
                            showDownloaderOnStaticHome: e.target.checked
                          })
                        }
                      />
                      <span>
                        Also pin the Scribd Downloader box above the Static Page (optional if page already uses <code className="font-mono">[scribd_downloader]</code>)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Blog Page / Posts Page Selector Card */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="text-xs font-mono font-bold text-indigo-600 uppercase">
                    2. Blog Page (Posts Page) Display
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <label className="flex items-start gap-2.5 cursor-pointer p-2.5 bg-white border border-slate-200 rounded-lg">
                      <input
                        type="radio"
                        name="blogPageMode"
                        checked={readingConfig.blogPageMode === 'default-blog'}
                        onChange={() =>
                          handleUpdateReadingAndLayout(
                            { blogPageMode: 'default-blog' },
                            'Blog Page set to Default Blog Grid.'
                          )
                        }
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-bold text-slate-900">
                          Default Blog Articles Grid
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Standard blog archive listing all published articles for the active Polylang language.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer p-2.5 bg-white border border-slate-200 rounded-lg">
                      <input
                        type="radio"
                        name="blogPageMode"
                        checked={readingConfig.blogPageMode === 'static-page'}
                        onChange={() =>
                          handleUpdateReadingAndLayout(
                            { blogPageMode: 'static-page' },
                            'Blog Page switched to Static Page mode!'
                          )
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-slate-900">
                          A Static Page (Select Manual Blog Page Below)
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Display a custom Static Page when users open the Blog menu (<code className="font-mono">/blog</code>).
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Select Static Page for Blog:
                      </label>
                      <select
                        value={readingConfig.blogStaticPageId}
                        onChange={(e) =>
                          handleUpdateReadingAndLayout(
                            {
                              blogPageMode: 'static-page',
                              blogStaticPageId: e.target.value
                            },
                            'Selected Static Blog Page updated!'
                          )
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                      >
                        {cms.pages.map((pg) => (
                          <option key={pg.id} value={pg.id}>
                            {pg.title} (/p/{pg.slug} · {pg.lang.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={readingConfig.showPostsListBelowStaticBlogPage}
                        onChange={(e) =>
                          handleUpdateReadingAndLayout({
                            showPostsListBelowStaticBlogPage: e.target.checked
                          })
                        }
                      />
                      <span>
                        Also display the Blog Articles Grid below the Static Page content
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Header & Footer Dropdowns, Important Pages, Auto Language Switcher & Branding Configuration */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">
                  Header & Footer Design, Auto Language Switcher & Important Pages
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Configure the stacked Brand Logo (Scribd / Downloader), Contact Us button, Browser & Region Auto-Switching Language Dropdown, and Header/Footer pages.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <label className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readingConfig.autoDetectBrowserLanguage}
                    onChange={(e) =>
                      handleUpdateReadingAndLayout(
                        { autoDetectBrowserLanguage: e.target.checked },
                        'Browser & Region language auto-switch updated.'
                      )
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-slate-900">
                      Auto-Switch by Browser & Region
                    </div>
                    <div className="text-slate-600 text-[11px] mt-0.5">
                      Automatically switches site language based on visitor browser locale & region ({detectedBrowserInfo.browserLocale} · {detectedBrowserInfo.detectedRegion} → {detectedBrowserInfo.matchedCode.toUpperCase()}).
                    </div>
                  </div>
                </label>

                <label className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readingConfig.showLanguageDropdownInHeader}
                    onChange={(e) =>
                      handleUpdateReadingAndLayout(
                        { showLanguageDropdownInHeader: e.target.checked },
                        'Header language dropdown updated.'
                      )
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-slate-900">
                      Header Language Pill (🇺🇸 EN ⌄)
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Show the rounded flag + language code pill in the top header bar.
                    </div>
                  </div>
                </label>

                <label className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readingConfig.showContactButtonInHeader}
                    onChange={(e) =>
                      handleUpdateReadingAndLayout(
                        { showContactButtonInHeader: e.target.checked },
                        'Header Contact Us button updated.'
                      )
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-slate-900">
                      Header "Contact Us" Dark Button
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Show the dark navy Contact Us pill button with mail icon in the header.
                    </div>
                  </div>
                </label>

                <label className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readingConfig.showLanguageDropdownInFooter}
                    onChange={(e) =>
                      handleUpdateReadingAndLayout(
                        { showLanguageDropdownInFooter: e.target.checked },
                        'Footer language dropdown updated.'
                      )
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-slate-900">
                      Footer Language Dropdown
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Show language dropdown selector and links in the site footer.
                    </div>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Logo Top Line (Dark Bold)
                  </label>
                  <input
                    type="text"
                    value={readingConfig.brandTopTitle || 'Scribd'}
                    onChange={(e) =>
                      handleUpdateReadingAndLayout({ brandTopTitle: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Logo Bottom Line (Blue-Cyan Gradient)
                  </label>
                  <input
                    type="text"
                    value={readingConfig.brandBottomTitle || 'Downloader'}
                    onChange={(e) =>
                      handleUpdateReadingAndLayout({ brandBottomTitle: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Header Contact Button Text
                  </label>
                  <input
                    type="text"
                    value={readingConfig.contactButtonText || 'Contact Us'}
                    onChange={(e) =>
                      handleUpdateReadingAndLayout({ contactButtonText: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Contact Button Target Page
                  </label>
                  <select
                    value={readingConfig.contactButtonPageSlug || 'contact-us'}
                    onChange={(e) =>
                      handleUpdateReadingAndLayout(
                        { contactButtonPageSlug: e.target.value },
                        'Updated Contact Us button target page!'
                      )
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {cms.pages.map((pg) => (
                      <option key={pg.id} value={pg.slug}>
                        {pg.title} (/p/{pg.slug})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Footer Description / Tagline
                  </label>
                  <input
                    type="text"
                    value={readingConfig.footerTagline}
                    onChange={(e) =>
                      handleUpdateReadingAndLayout({ footerTagline: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Footer Copyright Text
                  </label>
                  <input
                    type="text"
                    value={readingConfig.footerCopyrightText}
                    onChange={(e) =>
                      handleUpdateReadingAndLayout({ footerCopyrightText: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Quick Language Add & Delete Bar inside Header/Footer Settings */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase font-mono">
                      Added Header & Footer Switcher Languages ({cms.languages.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Add or delete languages from the Header & Footer switcher, or click any preset language below to add it in 1 click.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('polylang')}
                    className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Open Full Language & Region Settings →
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {cms.languages.map((lang) => (
                    <div
                      key={lang.code}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${
                        lang.enabled
                          ? 'bg-white border-slate-300 text-slate-800 shadow-2xs'
                          : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span className="font-bold uppercase">{lang.code}</span>
                      <span className="text-slate-500">({lang.nativeName})</span>
                      {lang.regions && lang.regions.length > 0 && (
                        <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          {lang.regions.slice(0, 2).join(',')}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={cms.languages.length <= 1}
                        onClick={() => handleDeleteLanguage(lang.code)}
                        className="text-red-500 hover:text-red-700 ml-1 cursor-pointer disabled:opacity-30"
                        title={`Delete ${lang.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-1 border-t border-slate-200/80 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">
                    + Quick Add Language:
                  </span>
                  {WORLD_LANGUAGE_PRESETS.filter(
                    (preset) => !cms.languages.some((l) => l.code === preset.code)
                  ).map((preset) => (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => handleQuickAddPresetLanguage(preset)}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-full text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>{preset.flag}</span>
                      <span>+ {preset.name} ({preset.code.toUpperCase()})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Assignment Matrix for Important Pages in Header, Footer, Homepage & Blog + Delete Option */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase font-mono">
                    Header & Footer Pages Manager (Add, Edit, Assign Home/Blog, or Delete Any Page)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setSection('pages');
                      handleCreateNewPage(editingLang);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add New Page</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-4">Page Title & Slug</th>
                        <th className="py-2.5 px-4 text-center">In Header</th>
                        <th className="py-2.5 px-4 text-center">In Footer</th>
                        <th className="py-2.5 px-4 text-right">Assign Home / Blog / Edit / Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {cms.pages.map((pg) => {
                        const isCurrentStaticHome =
                          readingConfig.homepageMode === 'static-page' &&
                          readingConfig.homepageStaticPageId === pg.id;
                        const isCurrentStaticBlog =
                          readingConfig.blogPageMode === 'static-page' &&
                          readingConfig.blogStaticPageId === pg.id;

                        return (
                          <tr key={pg.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-slate-900 flex items-center gap-2">
                                <span>{pg.title}</span>
                                {isCurrentStaticHome && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                                    ACTIVE HOMEPAGE
                                  </span>
                                )}
                                {isCurrentStaticBlog && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded">
                                    ACTIVE BLOG PAGE
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400">
                                /p/{pg.slug} ({pg.lang.toUpperCase()})
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={pg.showInHeader}
                                onChange={(e) => {
                                  const nextPages = cms.pages.map((item) =>
                                    item.id === pg.id
                                      ? { ...item, showInHeader: e.target.checked }
                                      : item
                                  );
                                  onUpdateCms({ ...cms, pages: nextPages });
                                  triggerSavedToast(`Updated Header visibility for "${pg.title}"`);
                                }}
                                className="cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={pg.showInFooter}
                                onChange={(e) => {
                                  const nextPages = cms.pages.map((item) =>
                                    item.id === pg.id
                                      ? { ...item, showInFooter: e.target.checked }
                                      : item
                                  );
                                  onUpdateCms({ ...cms, pages: nextPages });
                                  triggerSavedToast(`Updated Footer visibility for "${pg.title}"`);
                                }}
                                className="cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateReadingAndLayout(
                                    isCurrentStaticHome
                                      ? { homepageMode: 'default-downloader' }
                                      : {
                                          homepageMode: 'static-page',
                                          homepageStaticPageId: pg.id
                                        },
                                    isCurrentStaticHome
                                      ? 'Reverted to Default Downloader Homepage.'
                                      : `"${pg.title}" set as Static Homepage!`
                                  )
                                }
                                className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                                  isCurrentStaticHome
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {isCurrentStaticHome ? '★ Home' : 'Set Home'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateReadingAndLayout(
                                    isCurrentStaticBlog
                                      ? { blogPageMode: 'default-blog' }
                                      : {
                                          blogPageMode: 'static-page',
                                          blogStaticPageId: pg.id
                                        },
                                    isCurrentStaticBlog
                                      ? 'Reverted to Default Blog Page.'
                                      : `"${pg.title}" set as Static Blog Page!`
                                  )
                                }
                                className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                                  isCurrentStaticBlog
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {isCurrentStaticBlog ? '★ Blog' : 'Set Blog'}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSection('pages');
                                  setEditingPage(pg);
                                }}
                                className="px-2 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold cursor-pointer"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteCustomPage(pg.id)}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                title="Delete Page"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. HOMEPAGE EDITOR + MULTI-CONTENT SWITCHER MANAGER + WORDPRESS EDITOR */}
        {section === 'homepage' && (
          <div className="space-y-6 max-w-5xl">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display">
                    Homepage Editor & Multi-Content Switcher ({editingLang.toUpperCase()})
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Customize the homepage hero text, manage interactive Multi-Content Switcher tabs, and edit rich homepage sections with the WordPress Visual/Code Editor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerSavedToast('Homepage & Content Switcher saved!')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>

              {/* Hero & Buttons Text */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Hero Main Headline (H1)
                  </label>
                  <input
                    type="text"
                    value={currentStrings.heroTitle}
                    onChange={(e) => handleStringChange('heroTitle', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    URL Input Placeholder
                  </label>
                  <input
                    type="text"
                    value={currentStrings.inputPlaceholder}
                    onChange={(e) => handleStringChange('inputPlaceholder', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Hero Subtitle Description
                  </label>
                  <textarea
                    rows={2}
                    value={currentStrings.heroSubtitle}
                    onChange={(e) => handleStringChange('heroSubtitle', e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* HOMEPAGE MULTI-CONTENT SWITCHER TABS MANAGER */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>Homepage Multi-Content Switcher Tabs</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Add multiple switchable content tabs on the homepage so visitors can switch between Features, FAQs, Guides, or Comparison views with 1 click.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddHomeSwitcherTab}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Switcher Tab</span>
                  </button>
                </div>

                {/* Switcher Tabs Selector Bar */}
                <div className="flex items-center gap-1.5 flex-wrap border-b border-slate-200 pb-3">
                  {homeSwitcherList.map((tab, idx) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveHomeSwitcherIdx(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        activeHomeSwitcherIdx === idx
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {idx + 1}. {tab.tabLabel}
                    </button>
                  ))}
                </div>

                {/* Active Switcher Tab Editor */}
                {currentHomeTab && (
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Tab Button Label
                        </label>
                        <input
                          type="text"
                          value={currentHomeTab.tabLabel}
                          onChange={(e) =>
                            handleUpdateHomeSwitcherTab(activeHomeSwitcherIdx, {
                              tabLabel: e.target.value
                            })
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Section Title (H3)
                        </label>
                        <input
                          type="text"
                          value={currentHomeTab.title}
                          onChange={(e) =>
                            handleUpdateHomeSwitcherTab(activeHomeSwitcherIdx, {
                              title: e.target.value
                            })
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div className="flex items-end justify-between gap-2">
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Kicker Label
                          </label>
                          <input
                            type="text"
                            value={currentHomeTab.badgeText || ''}
                            onChange={(e) =>
                              handleUpdateHomeSwitcherTab(activeHomeSwitcherIdx, {
                                badgeText: e.target.value
                              })
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteHomeSwitcherTab(activeHomeSwitcherIdx)}
                          className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Tab</span>
                        </button>
                      </div>
                    </div>

                    <WordPressEditor
                      label={`WordPress Editor — Tab "${currentHomeTab.tabLabel}" Content`}
                      value={currentHomeTab.contentHtml}
                      onChange={(nextHtml) =>
                        handleUpdateHomeSwitcherTab(activeHomeSwitcherIdx, {
                          contentHtml: nextHtml
                        })
                      }
                      shortcodes={cms.shortcodes}
                      minHeight="240px"
                    />
                  </div>
                )}
              </div>

              {/* Additional Full-Width Homepage WordPress Editor Block */}
              <div className="space-y-2 pt-2">
                <WordPressEditor
                  label={`Additional Homepage Custom Content Block (${editingLang.toUpperCase()})`}
                  value={currentStrings.customHomeHtml}
                  onChange={(nextHtml) => handleStringChange('customHomeHtml', nextHtml)}
                  placeholder="Write additional SEO articles, tables, shortcodes like [custom_cta_banner], or custom blocks for the homepage..."
                  shortcodes={cms.shortcodes}
                  minHeight="250px"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. CUSTOM PAGES MANAGER WITH WORDPRESS EDITOR & MULTI-CONTENT SWITCHER */}
        {section === 'pages' && (
          <div className="space-y-6 max-w-5xl">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display">
                    Pages Manager (WordPress Editor + Shortcodes + Multi-Content Switcher)
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Edit existing pages or create new pages with the WordPress Visual/Code Editor, custom Shortcodes, and interactive Multi-Content Switcher tabs.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCreateNewPage(editingLang)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Page ({editingLang.toUpperCase()})</span>
                </button>
              </div>

              {editingPage ? (
                <div className="flex flex-col xl:flex-row gap-6 items-start">
                  {/* Left: Main Custom Page Editor */}
                  <div className="flex-1 min-w-0 p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-6 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Page Title
                      </label>
                      <input
                        type="text"
                        value={editingPage.title}
                        onChange={(e) =>
                          setEditingPage({ ...editingPage, title: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Page URL Slug
                      </label>
                      <input
                        type="text"
                        value={editingPage.slug}
                        onChange={(e) =>
                          setEditingPage({ ...editingPage, slug: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Language (Polylang)
                      </label>
                      <select
                        value={editingPage.lang}
                        onChange={(e) =>
                          setEditingPage({ ...editingPage, lang: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                      >
                        {cms.languages.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.flag} {l.name} ({l.code.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPage.showInHeader}
                        onChange={(e) =>
                          setEditingPage({ ...editingPage, showInHeader: e.target.checked })
                        }
                      />
                      <span>Show Link in Top Navigation Header</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPage.showInFooter}
                        onChange={(e) =>
                          setEditingPage({ ...editingPage, showInFooter: e.target.checked })
                        }
                      />
                      <span>Show Link in Website Footer</span>
                    </label>
                  </div>

                  {/* Primary Page Content in WordPress Editor */}
                  <WordPressEditor
                    label={`WordPress Page Editor — "${editingPage.title}" Main Content`}
                    value={editingPage.contentHtml}
                    onChange={(nextHtml) =>
                      setEditingPage({ ...editingPage, contentHtml: nextHtml })
                    }
                    shortcodes={cms.shortcodes}
                    minHeight="280px"
                  />

                  {/* Page Multi-Content Switcher Tabs Editor */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          <Layers className="w-4 h-4 text-blue-600" />
                          <span>Page Multi-Content Switcher Tabs (Switchable Sections on This Page)</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Users visiting this page can click these tabs to switch between multiple content views without leaving the page.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddPageSwitcherTab}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Switcher Tab</span>
                      </button>
                    </div>

                    {(editingPage.switcherSections || []).length > 0 && (
                      <>
                        <div className="flex items-center gap-1.5 flex-wrap border-b border-slate-200 pb-2.5">
                          {(editingPage.switcherSections || []).map((tab, idx) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setActivePageSwitcherIdx(idx)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                                activePageSwitcherIdx === idx
                                  ? 'bg-blue-600 text-white font-semibold'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {idx + 1}. {tab.tabLabel}
                            </button>
                          ))}
                        </div>

                        {editingPage.switcherSections?.[activePageSwitcherIdx] && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">
                                  Tab Button Label
                                </label>
                                <input
                                  type="text"
                                  value={
                                    editingPage.switcherSections[activePageSwitcherIdx].tabLabel
                                  }
                                  onChange={(e) =>
                                    handleUpdatePageSwitcherTab(activePageSwitcherIdx, {
                                      tabLabel: e.target.value
                                    })
                                  }
                                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">
                                  Tab Heading Title
                                </label>
                                <input
                                  type="text"
                                  value={
                                    editingPage.switcherSections[activePageSwitcherIdx].title
                                  }
                                  onChange={(e) =>
                                    handleUpdatePageSwitcherTab(activePageSwitcherIdx, {
                                      title: e.target.value
                                    })
                                  }
                                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                                />
                              </div>

                              <div className="flex items-end justify-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeletePageSwitcherTab(activePageSwitcherIdx)
                                  }
                                  className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove Tab</span>
                                </button>
                              </div>
                            </div>

                            <WordPressEditor
                              label={`Tab "${editingPage.switcherSections[activePageSwitcherIdx].tabLabel}" Content`}
                              value={
                                editingPage.switcherSections[activePageSwitcherIdx].contentHtml
                              }
                              onChange={(nextHtml) =>
                                handleUpdatePageSwitcherTab(activePageSwitcherIdx, {
                                  contentHtml: nextHtml
                                })
                              }
                              shortcodes={cms.shortcodes}
                              minHeight="200px"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* YOAST SEO EMBEDDED METABOX FOR PAGES */}
                  <div className="pt-2">
                    <YoastSeoPanel
                      title={editingPage.title}
                      slug={`p/${editingPage.slug}`}
                      contentHtml={editingPage.contentHtml}
                      siteName="ScribdDownloader"
                      seoData={{
                        focusKeyphrase: editingPage.focusKeyphrase,
                        seoTitle: editingPage.seoTitle,
                        seoDescription: editingPage.seoDescription,
                        canonicalUrl: editingPage.canonicalUrl,
                        robotsIndex: editingPage.robotsIndex,
                        robotsFollow: editingPage.robotsFollow,
                        ogTitle: editingPage.ogTitle,
                        ogDescription: editingPage.ogDescription,
                        ogImageUrl: editingPage.ogImageUrl,
                        twitterTitle: editingPage.twitterTitle,
                        twitterDescription: editingPage.twitterDescription,
                        schemaPageType: editingPage.schemaPageType || 'WebPage',
                        isCornerstone: editingPage.isCornerstone
                      }}
                      onChange={(updated) =>
                        setEditingPage({
                          ...editingPage,
                          ...updated
                        })
                      }
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingPage(null)}
                      className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCustomPage}
                      className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save & Publish Page</span>
                    </button>
                  </div>
                </div>

                {/* Right: Language Variations Sidebar Hub */}
                <div className="w-full xl:w-80 shrink-0 xl:sticky xl:top-6">
                  <LanguageVariationsSidebar
                    currentLang={editingPage.lang}
                    currentId={editingPage.id}
                    currentTitle={editingPage.title}
                    translationGroupId={editingPage.translationGroupId}
                    languages={cms.languages}
                    allGroupItems={cms.pages
                      .filter((p) => p.translationGroupId === editingPage.translationGroupId)
                      .map((p) => ({
                        id: p.id,
                        lang: p.lang,
                        title: p.title,
                        slug: p.slug,
                        contentHtml: p.contentHtml,
                        focusKeyphrase: p.focusKeyphrase,
                        seoTitle: p.seoTitle,
                        seoDescription: p.seoDescription
                      }))}
                    itemType="Page"
                    onSwitchItem={handleSwitchPageVariation}
                    onCreateVariation={handleCreatePageVariation}
                    onCloneAllMissing={handleCloneAllMissingPageVariations}
                  />
                </div>
              </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-4">Page Title, URL & Role</th>
                        <th className="py-2.5 px-4">Lang</th>
                        <th className="py-2.5 px-4">Menus</th>
                        <th className="py-2.5 px-4">Yoast SEO</th>
                        <th className="py-2.5 px-4">Polylang Translations</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {cms.pages.map((pg) => {
                        const langObj = cms.languages.find((l) => l.code === pg.lang);
                        const isStaticHome =
                          readingConfig.homepageMode === 'static-page' &&
                          readingConfig.homepageStaticPageId === pg.id;
                        const isStaticBlog =
                          readingConfig.blogPageMode === 'static-page' &&
                          readingConfig.blogStaticPageId === pg.id;
                        const yoastAnalysis = computeYoastSeoAnalysis(
                          pg.title,
                          pg.slug,
                          pg.contentHtml,
                          pg
                        );

                        return (
                          <tr key={pg.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                <span>{pg.title}</span>
                                {isStaticHome && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                                    HOMEPAGE
                                  </span>
                                )}
                                {isStaticBlog && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded">
                                    BLOG PAGE
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-400 font-mono text-[11px]">
                                /p/{pg.slug} · {(pg.switcherSections || []).length} Tabs
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {langObj?.flag} {pg.lang.toUpperCase()}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-[11px] space-x-1">
                              {pg.showInHeader && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-medium">
                                  Header
                                </span>
                              )}
                              {pg.showInFooter && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-medium">
                                  Footer
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                    yoastAnalysis.overallScore === 'good'
                                      ? 'bg-emerald-500'
                                      : yoastAnalysis.overallScore === 'ok'
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                  title={`Yoast SEO Score: ${yoastAnalysis.overallScore.toUpperCase()} (${yoastAnalysis.scorePercentage}%)`}
                                />
                                <span className="text-[11px] font-mono text-slate-600">
                                  {pg.focusKeyphrase ? (
                                    <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-semibold truncate max-w-[120px] inline-block">
                                      {pg.focusKeyphrase}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">No Keyphrase</span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {cms.languages
                                  .filter((l) => l.enabled)
                                  .map((l) => {
                                    const existingTrans = cms.pages.find(
                                      (p) =>
                                        p.translationGroupId === pg.translationGroupId &&
                                        p.lang === l.code
                                    );
                                    return (
                                      <button
                                        key={l.code}
                                        type="button"
                                        onClick={() => {
                                          if (existingTrans) {
                                            setEditingPage(existingTrans);
                                            setActivePageSwitcherIdx(0);
                                          } else {
                                            handleCreateNewPage(l.code, pg.translationGroupId);
                                          }
                                        }}
                                        className={`px-2 py-0.5 rounded border text-[11px] font-mono flex items-center gap-1 cursor-pointer ${
                                          existingTrans
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                                            : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                                        }`}
                                      >
                                        <span>{l.flag}</span>
                                        <span>{existingTrans ? '✓' : '+'}</span>
                                      </button>
                                    );
                                  })}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateReadingAndLayout(
                                    isStaticHome
                                      ? { homepageMode: 'default-downloader' }
                                      : {
                                          homepageMode: 'static-page',
                                          homepageStaticPageId: pg.id
                                        },
                                    isStaticHome
                                      ? 'Reverted to Default Downloader Homepage.'
                                      : `"${pg.title}" set as Static Homepage!`
                                  )
                                }
                                className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer ${
                                  isStaticHome
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                                title="Set this static page as the main Homepage"
                              >
                                {isStaticHome ? '★ Home' : 'Set Home'}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateReadingAndLayout(
                                    isStaticBlog
                                      ? { blogPageMode: 'default-blog' }
                                      : {
                                          blogPageMode: 'static-page',
                                          blogStaticPageId: pg.id
                                        },
                                    isStaticBlog
                                      ? 'Reverted to Default Blog Page.'
                                      : `"${pg.title}" set as Static Blog Page!`
                                  )
                                }
                                className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer ${
                                  isStaticBlog
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                                title="Set this static page as the Blog Page"
                              >
                                {isStaticBlog ? '★ Blog' : 'Set Blog'}
                              </button>
                              <button
                                type="button"
                                onClick={() => onPreviewCustomPage(pg.slug)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPage(pg);
                                  setActivePageSwitcherIdx(0);
                                }}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomPage(pg.id)}
                                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2.5 CUSTOM SHORTCODES BUILDER ([shortcode]) */}
        {section === 'shortcodes' && (
          <div className="space-y-6 max-w-5xl">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                    <Braces className="w-5 h-5 text-blue-600" />
                    <span>Custom Shortcodes Builder & Design Studio</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Create custom HTML, CSS, and visual designs once, then insert <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-semibold">[your_shortcode]</code> inside any Page, Blog Post, or Homepage section.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreateNewShortcode}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Shortcode</span>
                </button>
              </div>

              {editingShortcode ? (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Shortcode Tag (Used as <code className="font-mono text-indigo-600">[{editingShortcode.tag || 'my_tag'}]</code>)
                      </label>
                      <input
                        type="text"
                        value={editingShortcode.tag}
                        onChange={(e) =>
                          setEditingShortcode({
                            ...editingShortcode,
                            tag: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
                          })
                        }
                        placeholder="custom_promo_box"
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Design Name / Label
                      </label>
                      <input
                        type="text"
                        value={editingShortcode.name}
                        onChange={(e) =>
                          setEditingShortcode({ ...editingShortcode, name: e.target.value })
                        }
                        placeholder="Custom Pricing or Hero Card"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Short Description
                      </label>
                      <input
                        type="text"
                        value={editingShortcode.description}
                        onChange={(e) =>
                          setEditingShortcode({
                            ...editingShortcode,
                            description: e.target.value
                          })
                        }
                        placeholder="Where or how this shortcode is used..."
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Custom HTML/CSS/Visual Editor for Shortcode */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Custom HTML / CSS / Visual Design (Supports full HTML, inline CSS, <code className="font-mono">&lt;style&gt;</code> tags, tables, grids & buttons):
                    </label>
                    <WordPressEditor
                      label={`Shortcode Design Studio — [${editingShortcode.tag || 'shortcode'}]`}
                      value={editingShortcode.htmlCode}
                      onChange={(nextHtml) =>
                        setEditingShortcode({ ...editingShortcode, htmlCode: nextHtml })
                      }
                      shortcodes={cms.shortcodes}
                      minHeight="260px"
                    />
                  </div>

                  {/* Live Rendered Output Preview */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="text-xs font-mono font-semibold text-slate-500 uppercase">
                      Live Rendered Shortcode Preview (<code className="text-indigo-600">[{editingShortcode.tag}]</code>):
                    </div>
                    <div
                      className="prose prose-slate max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: editingShortcode.htmlCode }}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingShortcode(null)}
                      className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveShortcode}
                      className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Shortcode [{editingShortcode.tag}]</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                          <th className="py-2.5 px-4">Shortcode Tag (Click to Copy)</th>
                          <th className="py-2.5 px-4">Design Name & Description</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {(cms.shortcodes || []).map((sc) => (
                          <tr key={sc.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleCopyShortcodeTag(sc.tag)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md font-mono font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                                title="Click to copy shortcode"
                              >
                                <span>[{sc.tag}]</span>
                                {copiedShortcodeTag === sc.tag ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-indigo-500" />
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{sc.name}</div>
                              <div className="text-slate-500 text-[11px]">{sc.description}</div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleToggleShortcode(sc.id)}
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                                  sc.enabled
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {sc.enabled ? 'Active' : 'Disabled'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setEditingShortcode(sc)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded cursor-pointer"
                              >
                                Edit Design
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteShortcode(sc.id)}
                                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. BLOG POSTS MANAGER WITH WORDPRESS EDITOR */}
        {section === 'blog' && (
          <div className="space-y-6 max-w-5xl">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display">
                    WordPress Blog Posts Manager
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Write and format blog posts using the WordPress Gutenberg Visual & Code Editor and link translations with Polylang.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCreateNewPost(editingLang)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Post ({editingLang.toUpperCase()})</span>
                </button>
              </div>

              {editingPost ? (
                <div className="flex flex-col xl:flex-row gap-6 items-start">
                  {/* Left: Main Blog Post Editor */}
                  <div className="flex-1 min-w-0 p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-5 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Post Title
                      </label>
                      <input
                        type="text"
                        value={editingPost.title}
                        onChange={(e) =>
                          setEditingPost({ ...editingPost, title: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Language (Polylang)
                      </label>
                      <select
                        value={editingPost.lang}
                        onChange={(e) =>
                          setEditingPost({ ...editingPost, lang: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                      >
                        {cms.languages.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.flag} {l.name} ({l.code.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        URL Slug
                      </label>
                      <input
                        type="text"
                        value={editingPost.slug}
                        onChange={(e) =>
                          setEditingPost({ ...editingPost, slug: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Author Name
                      </label>
                      <input
                        type="text"
                        value={editingPost.author}
                        onChange={(e) =>
                          setEditingPost({ ...editingPost, author: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Publish Date
                      </label>
                      <input
                        type="date"
                        value={editingPost.publishedAt}
                        onChange={(e) =>
                          setEditingPost({ ...editingPost, publishedAt: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Short Excerpt / Card Summary
                    </label>
                    <textarea
                      rows={2}
                      value={editingPost.excerpt}
                      onChange={(e) =>
                        setEditingPost({ ...editingPost, excerpt: e.target.value })
                      }
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <WordPressEditor
                    label={`WordPress Post Editor — "${editingPost.title}"`}
                    value={editingPost.contentHtml}
                    onChange={(nextHtml) =>
                      setEditingPost({ ...editingPost, contentHtml: nextHtml })
                    }
                    shortcodes={cms.shortcodes}
                    minHeight="320px"
                  />

                  {/* YOAST SEO EMBEDDED METABOX FOR BLOG POSTS */}
                  <div className="pt-2">
                    <YoastSeoPanel
                      title={editingPost.title}
                      slug={`blog/${editingPost.slug}`}
                      contentHtml={editingPost.contentHtml}
                      siteName="ScribdDownloader"
                      seoData={{
                        focusKeyphrase: editingPost.focusKeyphrase,
                        seoTitle: editingPost.seoTitle,
                        seoDescription: editingPost.seoDescription,
                        canonicalUrl: editingPost.canonicalUrl,
                        robotsIndex: editingPost.robotsIndex,
                        robotsFollow: editingPost.robotsFollow,
                        ogTitle: editingPost.ogTitle,
                        ogDescription: editingPost.ogDescription,
                        ogImageUrl: editingPost.ogImageUrl,
                        twitterTitle: editingPost.twitterTitle,
                        twitterDescription: editingPost.twitterDescription,
                        schemaPageType: editingPost.schemaPageType || 'Article',
                        isCornerstone: editingPost.isCornerstone
                      }}
                      onChange={(updated) =>
                        setEditingPost({
                          ...editingPost,
                          ...updated
                        })
                      }
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingPost(null)}
                      className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBlogPost}
                      className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Publish Post</span>
                    </button>
                  </div>
                </div>

                {/* Right: Language Variations Sidebar Hub */}
                <div className="w-full xl:w-80 shrink-0 xl:sticky xl:top-6">
                  <LanguageVariationsSidebar
                    currentLang={editingPost.lang}
                    currentId={editingPost.id}
                    currentTitle={editingPost.title}
                    translationGroupId={editingPost.translationGroupId}
                    languages={cms.languages}
                    allGroupItems={cms.blogPosts
                      .filter((p) => p.translationGroupId === editingPost.translationGroupId)
                      .map((p) => ({
                        id: p.id,
                        lang: p.lang,
                        title: p.title,
                        slug: p.slug,
                        contentHtml: p.contentHtml,
                        focusKeyphrase: p.focusKeyphrase,
                        seoTitle: p.seoTitle,
                        seoDescription: p.seoDescription
                      }))}
                    itemType="Blog Post"
                    onSwitchItem={handleSwitchPostVariation}
                    onCreateVariation={handleCreatePostVariation}
                    onCloneAllMissing={handleCloneAllMissingPostVariations}
                  />
                </div>
              </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-4">Title & Slug</th>
                        <th className="py-2.5 px-4">Lang</th>
                        <th className="py-2.5 px-4">Yoast SEO</th>
                        <th className="py-2.5 px-4">Polylang Translations</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {cms.blogPosts.map((post) => {
                        const langObj = cms.languages.find((l) => l.code === post.lang);
                        const yoastAnalysis = computeYoastSeoAnalysis(
                          post.title,
                          post.slug,
                          post.contentHtml,
                          post
                        );

                        return (
                          <tr key={post.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{post.title}</div>
                              <div className="text-slate-400 font-mono text-[11px]">
                                /blog/{post.slug}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {langObj?.flag} {post.lang.toUpperCase()}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                    yoastAnalysis.overallScore === 'good'
                                      ? 'bg-emerald-500'
                                      : yoastAnalysis.overallScore === 'ok'
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                  title={`Yoast SEO Score: ${yoastAnalysis.overallScore.toUpperCase()} (${yoastAnalysis.scorePercentage}%)`}
                                />
                                <span className="text-[11px] font-mono text-slate-600">
                                  {post.focusKeyphrase ? (
                                    <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-semibold truncate max-w-[120px] inline-block">
                                      {post.focusKeyphrase}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">No Keyphrase</span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {cms.languages
                                  .filter((l) => l.enabled)
                                  .map((l) => {
                                    const existingTrans = cms.blogPosts.find(
                                      (p) =>
                                        p.translationGroupId === post.translationGroupId &&
                                        p.lang === l.code
                                    );
                                    return (
                                      <button
                                        key={l.code}
                                        type="button"
                                        onClick={() => {
                                          if (existingTrans) {
                                            setEditingPost(existingTrans);
                                          } else {
                                            handleCreateNewPost(l.code, post.translationGroupId);
                                          }
                                        }}
                                        className={`px-2 py-0.5 rounded border text-[11px] font-mono flex items-center gap-1 cursor-pointer ${
                                          existingTrans
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                                            : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                                        }`}
                                      >
                                        <span>{l.flag}</span>
                                        <span>{existingTrans ? '✓' : '+'}</span>
                                      </button>
                                    );
                                  })}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                              {post.publishedAt}
                            </td>
                            <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => onPreviewBlogPost(post.slug)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPost(post)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded cursor-pointer"
                              >
                                Edit in WP Editor
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBlogPost(post.id)}
                                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. ADS PLACEMENT MANAGER (WITH ADD NEW AD SLOT & DELETE AD SLOT) */}
        {section === 'ads' && (
          <div className="space-y-6 max-w-5xl">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">
                  Ad Placements & Custom Ad Code Manager (Add, Edit & Delete Ads)
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Add new ad slots, configure Direct Ad Links on the Fetch &amp; Download PDF buttons, toggle live visibility, and paste Google AdSense, Adsterra, or custom HTML banner scripts.
                </p>
              </div>

              {/* Direct Button Ads Configuration (Fetch Button & Download PDF Button) */}
              <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      💰 Button Click Ads (Fetch Button &amp; Download PDF Button Direct Ad URLs)
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Add a Direct Ad Link / Smartlink URL to open when a visitor clicks <strong>Fetch Document</strong> or <strong>Download PDF</strong>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Fetch Button Direct Ad URL (Smartlink / Popunder)
                    </label>
                    <input
                      type="url"
                      value={readingConfig.fetchButtonAdUrl || ''}
                      onChange={(e) =>
                        handleUpdateReadingAndLayout(
                          { fetchButtonAdUrl: e.target.value },
                          'Fetch Button Ad URL updated!'
                        )
                      }
                      placeholder="https://your-ad-network.com/fetch-smartlink"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Download PDF Button Direct Ad URL (Smartlink / Popunder)
                    </label>
                    <input
                      type="url"
                      value={readingConfig.downloadButtonAdUrl || ''}
                      onChange={(e) =>
                        handleUpdateReadingAndLayout(
                          { downloadButtonAdUrl: e.target.value },
                          'Download PDF Button Ad URL updated!'
                        )
                      }
                      placeholder="https://your-ad-network.com/download-smartlink"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Create / Add New Ad Slot Form */}
              <form
                onSubmit={handleAddAdSlot}
                className="p-5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span>Add New Ad Slot</span>
                  </h3>
                  <span className="text-[11px] font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    Supports AdSense / Adsterra / Custom HTML
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Ad Slot Title / Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sidebar / In-Page Banner Ad"
                      value={newAdName}
                      onChange={(e) => setNewAdName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Placement Zone on Website
                    </label>
                    <select
                      value={newAdZone}
                      onChange={(e) =>
                        setNewAdZone(
                          e.target.value as NonNullable<AdSlotConfig['placementZone']>
                        )
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="header-leaderboard">Top Header Leaderboard (All Pages)</option>
                      <option value="below-downloader-banner">Below Fetch & Download PDF Box</option>
                      <option value="above-viewer-banner">Above Unlocked PDF Viewer</option>
                      <option value="in-article-tutorial">Homepage Between Tutorial & Blog</option>
                      <option value="blog-top-banner">Blog Page & Articles Top Banner</option>
                      <option value="page-top-banner">Custom Static Pages Top Banner</option>
                      <option value="footer-sticky-banner">Footer Sticky / Bottom Banner</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Ad Dimensions Label
                    </label>
                    <input
                      type="text"
                      placeholder="728×90 / Responsive"
                      value={newAdDimensions}
                      onChange={(e) => setNewAdDimensions(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Ad HTML / Script Code
                  </label>
                  <textarea
                    rows={3}
                    value={newAdHtml}
                    onChange={(e) => setNewAdHtml(e.target.value)}
                    className="w-full p-3 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New Ad Slot</span>
                </button>
              </form>

              <div className="space-y-4">
                {cms.ads.map((ad) => (
                  <div
                    key={ad.id}
                    className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={ad.name}
                            onChange={(e) =>
                              handleUpdateAdMeta(ad.id, { name: e.target.value })
                            }
                            className="text-sm font-bold text-slate-900 bg-white border border-slate-200 rounded px-2 py-0.5"
                          />
                          <span className="text-xs font-mono text-slate-500">
                            ({ad.dimensions})
                          </span>
                          <span className="text-[11px] font-mono bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded">
                            ID: {ad.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {ad.locationDescription}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleAd(ad.id)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            ad.enabled
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {ad.enabled ? 'Enabled (Live on Site)' : 'Disabled (Hidden)'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAdSlot(ad.id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                          title="Delete this Ad Slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Ad</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5 text-slate-500" />
                        <span>Custom Ad HTML / Script Code:</span>
                      </label>
                      <textarea
                        rows={4}
                        value={ad.htmlCode}
                        onChange={(e) => handleAdHtmlChange(ad.id, e.target.value)}
                        className="w-full p-3 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. POLYLANG MULTI-LANGUAGE MANAGER + BROWSER & REGION AUTO-SWITCHER */}
        {section === 'polylang' && (
          <div className="space-y-6 max-w-5xl">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display">
                    Polylang Multi-Language & Region Auto-Switch Manager
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Add or delete languages, configure ISO region codes (e.g. PK, IN, US, SA), and auto-switch visitor language based on browser language & region.
                  </p>
                </div>

                <label className="px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-blue-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readingConfig.autoDetectBrowserLanguage}
                    onChange={(e) =>
                      handleUpdateReadingAndLayout(
                        { autoDetectBrowserLanguage: e.target.checked },
                        'Browser & Region language auto-switch updated!'
                      )
                    }
                  />
                  <span>
                    Auto-Switch by Browser & Region ({detectedBrowserInfo.browserLocale} · {detectedBrowserInfo.detectedRegion} → {detectedBrowserInfo.matchedCode.toUpperCase()})
                  </span>
                </label>
              </div>

              {/* 1-Click Preset World Languages Adder */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="text-xs font-bold text-slate-800 uppercase font-mono">
                  1-Click Add Popular World Languages (With Pre-Configured Region Codes)
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {WORLD_LANGUAGE_PRESETS.map((preset) => {
                    const alreadyAdded = cms.languages.some((l) => l.code === preset.code);
                    return (
                      <button
                        key={preset.code}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => handleQuickAddPresetLanguage(preset)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                          alreadyAdded
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 opacity-75 cursor-default'
                            : 'bg-white hover:bg-blue-50 border-slate-300 hover:border-blue-400 text-slate-800 cursor-pointer'
                        }`}
                      >
                        <span>{preset.flag}</span>
                        <span>{preset.name}</span>
                        <span className="font-mono text-[10px] opacity-75">
                          ({preset.code.toUpperCase()})
                        </span>
                        <span className="font-bold">
                          {alreadyAdded ? '✓ Added' : '+ Add'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-2.5 px-4">Flag & Language Name</th>
                      <th className="py-2.5 px-4">Code</th>
                      <th className="py-2.5 px-4">Auto-Switch Region Codes</th>
                      <th className="py-2.5 px-4">Direction</th>
                      <th className="py-2.5 px-4">Default</th>
                      <th className="py-2.5 px-4 text-right">Status & Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {cms.languages.map((l) => (
                      <tr key={l.code} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <span className="mr-2 text-base">{l.flag}</span>
                          <span>{l.name}</span>
                          <span className="text-slate-400 font-normal ml-1.5">
                            ({l.nativeName})
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold uppercase">{l.code}</td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={(l.regions || []).join(', ')}
                            onChange={(e) =>
                              handleUpdateLanguageRegions(l.code, e.target.value)
                            }
                            placeholder="US, GB"
                            className="w-36 px-2.5 py-1 text-xs font-mono bg-white border border-slate-300 rounded"
                            title="Comma-separated ISO country/region codes for automatic switching"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono uppercase">{l.dir}</td>
                        <td className="py-3 px-4">
                          {l.isDefault ? (
                            <span className="text-emerald-700 font-semibold">
                              ★ Default
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultLanguage(l.code)}
                              className="text-blue-600 hover:underline cursor-pointer"
                            >
                              Make Default
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={l.isDefault}
                            onClick={() => handleToggleLanguageEnabled(l.code)}
                            className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                              l.enabled
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            } disabled:opacity-50`}
                          >
                            {l.enabled ? 'Active' : 'Hidden'}
                          </button>

                          <button
                            type="button"
                            disabled={cms.languages.length <= 1}
                            onClick={() => handleDeleteLanguage(l.code)}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-xs font-medium inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                            title="Delete this language from Polylang"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form
                onSubmit={handleAddLanguage}
                className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4"
              >
                <h3 className="text-sm font-bold text-slate-900">
                  Add Custom Language & Region Mapping
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      ISO Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="fr"
                      value={newLangCode}
                      onChange={(e) => setNewLangCode(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      English Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="French"
                      value={newLangName}
                      onChange={(e) => setNewLangName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Native Name
                    </label>
                    <input
                      type="text"
                      placeholder="Français"
                      value={newLangNative}
                      onChange={(e) => setNewLangNative(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Region Codes
                    </label>
                    <input
                      type="text"
                      placeholder="FR, BE, CH"
                      value={newLangRegions}
                      onChange={(e) => setNewLangRegions(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Flag Emoji
                    </label>
                    <input
                      type="text"
                      placeholder="🇫🇷"
                      value={newLangFlag}
                      onChange={(e) => setNewLangFlag(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Direction
                    </label>
                    <select
                      value={newLangDir}
                      onChange={(e) => setNewLangDir(e.target.value as 'ltr' | 'rtl')}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="ltr">LTR</option>
                      <option value="rtl">RTL</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Language</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 6. YOAST SEO SETTINGS SUITE */}
        {section === 'seo' && (
          <div className="space-y-6 max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#5c2d91] text-amber-300 font-serif font-bold flex items-center justify-center text-sm">
                    Y
                  </span>
                  <span>Yoast SEO Global Site & Homepage Suite ({editingLang.toUpperCase()})</span>
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Configure search engine optimization, Google SERP snippets, focus keyphrases, and social share cards for the Homepage in {editingLang.toUpperCase()}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => triggerSavedToast('Yoast SEO settings saved successfully!')}
                className="px-5 py-2.5 bg-[#5c2d91] hover:bg-[#4b2377] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Yoast SEO Config</span>
              </button>
            </div>

            <YoastSeoPanel
              title={currentSeo.siteTitle}
              slug=""
              contentHtml="Scribd Downloader - Free online document downloader and multi-page preview tool with high-resolution page extraction and PDF conversion."
              siteName={cms.readingAndLayout?.brandLogoText || 'ScribdDownloader'}
              baseUrl="https://scribddownloader.org"
              isGlobalSiteConfig={true}
              seoData={{
                focusKeyphrase: currentSeo.focusKeyphrase || currentSeo.metaKeywords,
                seoTitle: currentSeo.siteTitle,
                seoDescription: currentSeo.metaDescription,
                canonicalUrl: currentSeo.canonicalUrl,
                robotsIndex: currentSeo.robotsMeta?.includes('noindex') ? 'noindex' : 'index',
                robotsFollow: currentSeo.robotsMeta?.includes('nofollow') ? 'nofollow' : 'follow',
                ogTitle: currentSeo.ogTitle,
                ogDescription: currentSeo.ogDescription,
                ogImageUrl: currentSeo.ogImageUrl,
                twitterTitle: currentSeo.twitterTitle,
                twitterDescription: currentSeo.twitterDescription,
                schemaPageType: 'WebApplication',
                isCornerstone: currentSeo.isCornerstone
              }}
              onChange={(updated) => {
                const langSeo = cms.seo[editingLang] || cms.seo.en;
                const nextRobots = `${updated.robotsIndex || 'index'}, ${updated.robotsFollow || 'follow'}`;
                const nextSeo: SeoLanguageConfig = {
                  ...langSeo,
                  siteTitle: updated.seoTitle || langSeo.siteTitle,
                  metaDescription: updated.seoDescription || langSeo.metaDescription,
                  focusKeyphrase: updated.focusKeyphrase,
                  metaKeywords: updated.focusKeyphrase || langSeo.metaKeywords,
                  canonicalUrl: updated.canonicalUrl || langSeo.canonicalUrl,
                  robotsMeta: nextRobots,
                  ogTitle: updated.ogTitle || langSeo.ogTitle,
                  ogDescription: updated.ogDescription || langSeo.ogDescription,
                  ogImageUrl: updated.ogImageUrl || langSeo.ogImageUrl,
                  twitterTitle: updated.twitterTitle || langSeo.twitterTitle,
                  twitterDescription: updated.twitterDescription || langSeo.twitterDescription,
                  isCornerstone: updated.isCornerstone
                };
                onUpdateCms({
                  ...cms,
                  seo: {
                    ...cms.seo,
                    [editingLang]: nextSeo
                  }
                });
              }}
            />

            {/* Custom Schema.org JSON-LD Editor */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <label className="text-xs font-bold text-slate-900 block font-mono uppercase">
                Custom Schema.org Structured Data (JSON-LD)
              </label>
              <textarea
                rows={6}
                value={currentSeo.schemaJsonLd}
                onChange={(e) => handleSeoChange('schemaJsonLd', e.target.value)}
                className="w-full p-3 text-xs font-mono bg-slate-900 text-slate-100 border border-slate-700 rounded-lg"
              />
            </div>
          </div>
        )}

        {/* 7. ADMIN-ONLY API & DOCUMENTS VAULT */}
        {section === 'api-docs' && (
          <AdminApiAndDocsPanel
            cms={cms}
            onUpdateCms={onUpdateCms}
            onLoadDocumentInViewer={onLoadDocumentInViewer}
            triggerSavedToast={triggerSavedToast}
          />
        )}
      </div>
    </div>
  );
}
