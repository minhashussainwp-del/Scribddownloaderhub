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
  Layers
} from 'lucide-react';
import {
  CmsStoreState,
  DEFAULT_CMS_STATE,
  BlogPostItem,
  CustomPageItem,
  LanguageConfig,
  UIStringTranslations,
  SeoLanguageConfig,
  ContentSwitcherSectionItem
} from '../lib/cmsStore';
import WordPressEditor from './WordPressEditor';

interface AdminDashboardProps {
  cms: CmsStoreState;
  onUpdateCms: (next: CmsStoreState) => void;
  onExitAdmin: () => void;
  onPreviewBlogPost: (slug: string) => void;
  onPreviewCustomPage: (slug: string) => void;
}

type AdminSection =
  | 'ads'
  | 'homepage'
  | 'blog'
  | 'pages'
  | 'polylang'
  | 'seo';

export default function AdminDashboard({
  cms,
  onUpdateCms,
  onExitAdmin,
  onPreviewBlogPost,
  onPreviewCustomPage
}: AdminDashboardProps) {
  const [section, setSection] = useState<AdminSection>('homepage');
  const [editingLang, setEditingLang] = useState<string>(cms.activeLanguage || 'en');
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // Active Switcher Tab index inside Homepage Editor
  const [activeHomeSwitcherIdx, setActiveHomeSwitcherIdx] = useState<number>(0);

  // Blog Editor State
  const [editingPost, setEditingPost] = useState<BlogPostItem | null>(null);

  // Custom Page Editor State + Active Switcher Tab inside Page Editor
  const [editingPage, setEditingPage] = useState<CustomPageItem | null>(null);
  const [activePageSwitcherIdx, setActivePageSwitcherIdx] = useState<number>(0);

  // New Language Modal Form State
  const [newLangCode, setNewLangCode] = useState('');
  const [newLangName, setNewLangName] = useState('');
  const [newLangNative, setNewLangNative] = useState('');
  const [newLangFlag, setNewLangFlag] = useState('🌐');
  const [newLangDir, setNewLangDir] = useState<'ltr' | 'rtl'>('ltr');

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

  // Ads Manager Handlers
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

    const newLang: LanguageConfig = {
      code,
      name: newLangName.trim(),
      nativeName: newLangNative.trim() || newLangName.trim(),
      flag: newLangFlag.trim() || '🌐',
      dir: newLangDir,
      isDefault: false,
      enabled: true
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
    triggerSavedToast(`Added language: ${newLang.name} (${newLang.code})`);
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

  const currentHomeTab = homeSwitcherList[activeHomeSwitcherIdx] || null;

  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col md:flex-row bg-slate-100">
      {/* Admin Left Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-200 shrink-0 flex flex-col justify-between p-4">
        <div className="space-y-5">
          <div className="px-2 pt-1 flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="text-sm font-bold text-white font-display">
                WordPress CMS Admin
              </div>
              <div className="text-[11px] text-slate-400">
                Editor · Switcher · Ads · SEO
              </div>
            </div>
            <button
              type="button"
              onClick={onExitAdmin}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>View Site</span>
            </button>
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
                { id: 'homepage', label: 'Homepage & Content Switcher', icon: LayoutGrid },
                { id: 'pages', label: `Pages & Content Switcher (${cms.pages.length})`, icon: FileText },
                { id: 'blog', label: `Blog Posts Editor (${cms.blogPosts.length})`, icon: BookOpen },
                { id: 'ads', label: 'Ads Placement Manager', icon: Megaphone },
                { id: 'polylang', label: 'Polylang Languages', icon: Globe },
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

        <div className="pt-4 border-t border-slate-800 mt-6">
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
                  placeholder="Write additional SEO articles, tables, or custom blocks for the homepage..."
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
                    Pages Manager (WordPress Editor + Multi-Content Switcher)
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Edit existing pages or create new pages with the WordPress Visual/Code Editor and interactive Multi-Content Switcher tabs.
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
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-6">
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
                              minHeight="200px"
                            />
                          </div>
                        )}
                      </>
                    )}
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
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-4">Page Title & URL</th>
                        <th className="py-2.5 px-4">Lang</th>
                        <th className="py-2.5 px-4">Switcher Tabs</th>
                        <th className="py-2.5 px-4">Polylang Translations</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {cms.pages.map((pg) => {
                        const langObj = cms.languages.find((l) => l.code === pg.lang);
                        return (
                          <tr key={pg.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{pg.title}</div>
                              <div className="text-slate-400 font-mono text-[11px]">
                                /p/{pg.slug}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {langObj?.flag} {pg.lang.toUpperCase()}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              {(pg.switcherSections || []).length} Tabs
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
                            <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => onPreviewCustomPage(pg.slug)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer inline-flex items-center gap-1"
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
                                Edit in WP Editor
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
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-5">
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
                    minHeight="320px"
                  />

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
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-4">Title & Slug</th>
                        <th className="py-2.5 px-4">Lang</th>
                        <th className="py-2.5 px-4">Polylang Translations</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {cms.blogPosts.map((post) => {
                        const langObj = cms.languages.find((l) => l.code === post.lang);
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

        {/* 4. ADS PLACEMENT MANAGER */}
        {section === 'ads' && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-xl font-bold text-slate-900 font-display">
                Ad Placements & Custom Ad Code Manager
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Enable or disable ad slots across the website and paste your Google AdSense, Adsterra, or custom HTML banner code.
              </p>

              <div className="mt-6 space-y-5">
                {cms.ads.map((ad) => (
                  <div
                    key={ad.id}
                    className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {ad.name}
                          </h3>
                          <span className="text-xs font-mono text-slate-500">
                            ({ad.dimensions})
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ad.locationDescription}
                        </p>
                      </div>

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

        {/* 5. POLYLANG MULTI-LANGUAGE MANAGER */}
        {section === 'polylang' && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">
                  Polylang Multi-Language Manager
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Manage site languages, RTL/LTR text direction, default language, and add new languages.
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-2.5 px-4">Flag & Language Name</th>
                      <th className="py-2.5 px-4">Locale Code</th>
                      <th className="py-2.5 px-4">Direction</th>
                      <th className="py-2.5 px-4">Default</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
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
                        <td className="py-3 px-4 font-mono">{l.code}</td>
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
                        <td className="py-3 px-4 text-right">
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
                  Add New Language to Polylang
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
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
                  <span>Add Language</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 6. SEO SETTINGS */}
        {section === 'seo' && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display">
                    SEO Settings, OpenGraph & Schema.org JSON-LD ({editingLang.toUpperCase()})
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Configure per-language meta titles, descriptions, canonical URLs, robots directives, and structured JSON-LD schema.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerSavedToast('SEO & Schema settings saved!')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save SEO Config</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Document Title (<code className="font-mono">&lt;title&gt;</code>)
                  </label>
                  <input
                    type="text"
                    value={currentSeo.siteTitle}
                    onChange={(e) => handleSeoChange('siteTitle', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Meta Description (<code className="font-mono">meta[name="description"]</code>)
                  </label>
                  <textarea
                    rows={2}
                    value={currentSeo.metaDescription}
                    onChange={(e) => handleSeoChange('metaDescription', e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Focus Keywords
                  </label>
                  <input
                    type="text"
                    value={currentSeo.metaKeywords}
                    onChange={(e) => handleSeoChange('metaKeywords', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Robots Meta Directive
                  </label>
                  <select
                    value={currentSeo.robotsMeta}
                    onChange={(e) => handleSeoChange('robotsMeta', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="index, follow">index, follow</option>
                    <option value="noindex, follow">noindex, follow</option>
                    <option value="index, nofollow">index, nofollow</option>
                    <option value="noindex, nofollow">noindex, nofollow</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Schema.org Structured Data (JSON-LD)
                  </label>
                  <textarea
                    rows={6}
                    value={currentSeo.schemaJsonLd}
                    onChange={(e) => handleSeoChange('schemaJsonLd', e.target.value)}
                    className="w-full p-3 text-xs font-mono bg-slate-900 text-slate-100 border border-slate-700 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
