import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Search,
  Eye,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Maximize2,
  FileText,
  Copy,
  Check,
  Sliders,
  Layers,
  Zap,
  Globe,
  Settings,
  BookOpen,
  ArrowLeft,
  Calendar,
  User
} from 'lucide-react';
import {
  ScribdDocumentData,
  ScribdPage,
  parseScribdInput,
  parseEmbedHtmlAssets,
  parseJsonpPageContent,
  fetchPageImageBytes,
  generateDocumentPdf,
  isValidScribdPayload
} from './lib/scribdCore';
import {
  CmsStoreState,
  loadCmsState,
  saveCmsState,
  UIStringTranslations,
  SeoLanguageConfig,
  ContentSwitcherSectionItem
} from './lib/cmsStore';
import AdminDashboard from './components/AdminDashboard';

type ViewerTab = 'original-embed' | 'page-grid' | 'pdf-preview';
type RelayNode = 'auto' | 'direct-proxy' | 'allorigins' | 'codetabs' | 'corsproxy';
type ActiveRoute =
  | { view: 'home' }
  | { view: 'blog-list' }
  | { view: 'blog-post'; slug: string }
  | { view: 'custom-page'; slug: string }
  | { view: 'admin' };

/**
 * Reusable Interactive Multi-Content Switcher Component for Homepage & Custom Pages
 */
function MultiContentSwitcher({
  sections
}: {
  sections?: ContentSwitcherSectionItem[];
}) {
  const [activeIdx, setActiveIdx] = useState<number>(0);

  if (!sections || sections.length === 0) return null;
  const safeIdx = activeIdx < sections.length ? activeIdx : 0;
  const activeItem = sections[safeIdx];

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs no-print">
      {/* Top Interactive Content Switcher Tab Bar */}
      <div className="px-5 py-3.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {sections.map((sec, idx) => {
            const isSelected = idx === safeIdx;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{sec.tabLabel}</span>
              </button>
            );
          })}
        </div>

        <span className="text-[11px] font-mono text-slate-500">
          Section {safeIdx + 1} of {sections.length}
        </span>
      </div>

      {/* Active Switched Content Body */}
      <div className="p-6 sm:p-8 space-y-3">
        {activeItem.badgeText && (
          <div className="text-xs font-mono font-bold text-blue-600 uppercase">
            {activeItem.badgeText}
          </div>
        )}
        <h2 className="text-xl font-bold text-slate-900 font-display">
          {activeItem.title}
        </h2>
        <div
          className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed space-y-3 pt-1"
          dangerouslySetInnerHTML={{ __html: activeItem.contentHtml }}
        />
      </div>
    </section>
  );
}

export default function App() {
  const [cms, setCms] = useState<CmsStoreState>(() => loadCmsState());
  const [route, setRoute] = useState<ActiveRoute>({ view: 'home' });

  const [urlInput, setUrlInput] = useState<string>('');
  const [relayNode, setRelayNode] = useState<RelayNode>('auto');
  const [showAntiBlockPanel, setShowAntiBlockPanel] = useState<boolean>(false);

  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<{ scanned: number; total: number } | null>(null);
  const [fetchDurationMs, setFetchDurationMs] = useState<number | null>(null);
  const [allPagesReady, setAllPagesReady] = useState<boolean>(false);

  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [currentDoc, setCurrentDoc] = useState<ScribdDocumentData | null>(null);
  const [viewerTab, setViewerTab] = useState<ViewerTab>('original-embed');
  const [compiledPdfBlobUrl, setCompiledPdfBlobUrl] = useState<string | null>(null);
  const [compiledPdfSizeKb, setCompiledPdfSizeKb] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const handleUpdateCms = (next: CmsStoreState) => {
    setCms(next);
    saveCmsState(next);
  };

  const activeLangObj = useMemo(
    () =>
      cms.languages.find((l) => l.code === cms.activeLanguage) ||
      cms.languages[0],
    [cms.languages, cms.activeLanguage]
  );

  const t: UIStringTranslations = useMemo(
    () => cms.translations[cms.activeLanguage] || cms.translations.en,
    [cms.translations, cms.activeLanguage]
  );

  const currentSeo: SeoLanguageConfig = useMemo(
    () => cms.seo[cms.activeLanguage] || cms.seo.en,
    [cms.seo, cms.activeLanguage]
  );

  useEffect(() => {
    document.documentElement.lang = activeLangObj.code;
    document.documentElement.dir = activeLangObj.dir;

    let pageTitle = currentSeo.siteTitle;
    let pageDesc = currentSeo.metaDescription;

    if (route.view === 'blog-post') {
      const post = cms.blogPosts.find((p) => p.slug === route.slug);
      if (post) {
        pageTitle = post.seoTitle || `${post.title} — ScribdDownloader`;
        pageDesc = post.seoDescription || post.excerpt;
      }
    } else if (route.view === 'custom-page') {
      const pg = cms.pages.find((p) => p.slug === route.slug);
      if (pg) {
        pageTitle = pg.seoTitle || `${pg.title} — ScribdDownloader`;
        pageDesc = pg.seoDescription || currentSeo.metaDescription;
      }
    }

    document.title = pageTitle;

    const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMetaTag('meta[name="description"]', 'name', 'description', pageDesc);
    setMetaTag('meta[name="keywords"]', 'name', 'keywords', currentSeo.metaKeywords);
    setMetaTag('meta[name="robots"]', 'name', 'robots', currentSeo.robotsMeta);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', currentSeo.ogTitle || pageTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', currentSeo.ogDescription || pageDesc);

    let canonicalEl = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', currentSeo.canonicalUrl || window.location.href);

    let schemaEl = document.head.querySelector('#cms-json-ld') as HTMLScriptElement | null;
    if (currentSeo.schemaJsonLd) {
      if (!schemaEl) {
        schemaEl = document.createElement('script');
        schemaEl.id = 'cms-json-ld';
        schemaEl.type = 'application/ld+json';
        document.head.appendChild(schemaEl);
      }
      schemaEl.textContent = currentSeo.schemaJsonLd;
    } else if (schemaEl) {
      schemaEl.remove();
    }
  }, [activeLangObj, currentSeo, route, cms.blogPosts, cms.pages]);

  const renderAdSlot = (slotId: string) => {
    const slot = cms.ads.find((a) => a.id === slotId);
    if (!slot || !slot.enabled || !slot.htmlCode.trim()) return null;
    return (
      <div
        className="w-full my-4 overflow-hidden no-print"
        dangerouslySetInnerHTML={{ __html: slot.htmlCode }}
      />
    );
  };

  const handleSelectLanguage = (langCode: string) => {
    let nextRoute: ActiveRoute = route;

    if (route.view === 'blog-post') {
      const currentPost = cms.blogPosts.find((p) => p.slug === route.slug);
      if (currentPost) {
        const translatedPost = cms.blogPosts.find(
          (p) =>
            p.translationGroupId === currentPost.translationGroupId &&
            p.lang === langCode
        );
        if (translatedPost) {
          nextRoute = { view: 'blog-post', slug: translatedPost.slug };
        }
      }
    } else if (route.view === 'custom-page') {
      const currentPage = cms.pages.find((p) => p.slug === route.slug);
      if (currentPage) {
        const translatedPage = cms.pages.find(
          (p) =>
            p.translationGroupId === currentPage.translationGroupId &&
            p.lang === langCode
        );
        if (translatedPage) {
          nextRoute = { view: 'custom-page', slug: translatedPage.slug };
        }
      }
    }

    handleUpdateCms({ ...cms, activeLanguage: langCode });
    setRoute(nextRoute);
  };

  const raceViaRelayNodes = async (targetUrl: string, timeoutMs = 5500): Promise<string | null> => {
    const buildUrl = (node: RelayNode) => {
      if (node === 'direct-proxy') return `/api/proxy-asset?url=${encodeURIComponent(targetUrl)}`;
      if (node === 'allorigins') return `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      if (node === 'codetabs') return `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
      return `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    };

    const attempt = async (node: RelayNode): Promise<string> => {
      const resp = await fetch(buildUrl(node), { signal: AbortSignal.timeout(timeoutMs) });
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      const text = await resp.text();
      if (!isValidScribdPayload(text, targetUrl)) {
        throw new Error('Fastly challenge or invalid payload');
      }
      return text;
    };

    const nodes: RelayNode[] =
      relayNode === 'auto'
        ? ['direct-proxy', 'allorigins', 'codetabs', 'corsproxy']
        : [relayNode, 'direct-proxy', 'allorigins'];

    try {
      return await Promise.any(nodes.map((n) => attempt(n)));
    } catch {
      return null;
    }
  };

  const discoverAllPagesFastClient = async (
    docId: string,
    slugTitle?: string
  ): Promise<ScribdDocumentData> => {
    const cleanEmbedUrl = `https://www.scribd.com/embeds/${docId}/content`;
    const embedHtml = await raceViaRelayNodes(cleanEmbedUrl, 6000);

    if (!embedHtml) {
      throw new Error('Client relays could not bypass challenge');
    }

    const parsedAssets = parseEmbedHtmlAssets(embedHtml);
    if (parsedAssets.pagesMap.size === 0) {
      throw new Error('No pages discovered in client embed payload');
    }

    const pages: ScribdPage[] = [];
    const title = parsedAssets.title || slugTitle || `Scribd Document #${docId}`;
    const pageCount = Math.max(parsedAssets.pageCount, parsedAssets.pagesMap.size);
    const assetPrefix = parsedAssets.assetPrefix;

    const sortedNums = Array.from(parsedAssets.pagesMap.keys()).sort((a, b) => a - b);
    for (const pNum of sortedNums) {
      const item = parsedAssets.pagesMap.get(pNum)!;
      pages.push({
        pageNumber: pNum,
        jsonpUrl: item.jsonpUrl,
        imageUrl: item.imageUrl,
        text: item.inlineText || `Page ${pNum} — ${title}`
      });
    }

    return {
      id: docId,
      title,
      author: 'Scribd Contributor',
      description: `Complete unlocked Scribd document (#${docId})`,
      pageCount: Math.max(pageCount, pages.length),
      wordCount: pages.length * 180,
      embedUrl: `${cleanEmbedUrl}?start_page=1&view_mode=scroll&access_key=key-fFexxf7r1bzEfWu3HKwf`,
      originalUrl: `https://www.scribd.com/document/${docId}`,
      category: 'Scribd Document',
      assetPrefix,
      pages,
      extractedText: pages.map((p) => p.text).join('\n\n'),
      resolvedAt: new Date().toISOString(),
      sourceMethod: 'proxy-bridge'
    };
  };

  const handleFetchDocument = async (inputOverride?: string) => {
    const raw = (inputOverride ?? urlInput).trim();
    setErrorMsg(null);
    setCompiledPdfBlobUrl(null);
    setCompiledPdfSizeKb(null);
    setAllPagesReady(false);
    setFetchDurationMs(null);
    setScanProgress(null);

    if (!raw) {
      setErrorMsg('Please paste a valid Scribd document link or ID first.');
      return;
    }

    const parsed = parseScribdInput(raw);
    if (!parsed) {
      setErrorMsg(
        'Invalid Scribd URL. Please paste a link like https://www.scribd.com/document/991278283/2026-Grade-12-Investigation-Term-1'
      );
      return;
    }

    setIsFetching(true);
    const startTime = performance.now();

    try {
      const serverPromise = (async (): Promise<ScribdDocumentData> => {
        const response = await fetch('/api/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: raw }),
          signal: AbortSignal.timeout(9000)
        });
        if (!response.ok) throw new Error('Server error');
        const data = await response.json();
        if (!data?.document || !Array.isArray(data.document.pages) || data.document.pages.length === 0) {
          throw new Error('Incomplete server pages');
        }
        return data.document;
      })();

      const clientPromise = discoverAllPagesFastClient(parsed.id, parsed.slugTitle);

      // Prefer `/api/resolve` (which uses WhatsApp/Facebook crawler bypass on Vercel serverless)
      // or whichever resolves with valid multi-page manifest first
      let resolvedDoc: ScribdDocumentData;
      try {
        resolvedDoc = await Promise.any([
          serverPromise.then((doc) => {
            if (doc.pages.length <= 1 && !doc.pages[0]?.imageUrl && !doc.pages[0]?.jsonpUrl) {
              throw new Error('Server returned single unverified page');
            }
            return doc;
          }),
          clientPromise
        ]);
      } catch {
        resolvedDoc = await serverPromise;
      }

      const verifiedPages: ScribdPage[] = [...resolvedDoc.pages];
      const total = verifiedPages.length;
      setScanProgress({ scanned: 0, total });
      setCurrentDoc(resolvedDoc);

      const BATCH = 24;
      for (let i = 0; i < total; i += BATCH) {
        const chunk = verifiedPages.slice(i, i + BATCH);
        await Promise.all(
          chunk.map(async (p, idxInChunk) => {
            const globalIdx = i + idxInChunk;
            if (p.jsonpUrl && (!p.imageUrl || p.text.startsWith(`Page ${p.pageNumber} —`))) {
              const rawJp = await raceViaRelayNodes(p.jsonpUrl, 4000);
              if (rawJp) {
                const parsedJp = parseJsonpPageContent(rawJp, resolvedDoc.assetPrefix);
                verifiedPages[globalIdx] = {
                  ...p,
                  imageUrl: p.imageUrl || parsedJp.imageUrls[0],
                  text: parsedJp.text && parsedJp.text.length > 5 ? parsedJp.text : p.text
                };
              }
            }
          })
        );
        setScanProgress({ scanned: Math.min(i + BATCH, total), total });
      }

      const finalDoc: ScribdDocumentData = {
        ...resolvedDoc,
        pageCount: verifiedPages.length,
        pages: verifiedPages,
        extractedText: verifiedPages
          .map((p) => `--- Page ${p.pageNumber} ---\n\n${p.text}`)
          .join('\n\n')
      };

      const elapsed = Math.round(performance.now() - startTime);
      setFetchDurationMs(elapsed);
      setCurrentDoc(finalDoc);
      setAllPagesReady(true);

      setTimeout(() => {
        verifiedPages.slice(0, 30).forEach((p) => {
          if (p.imageUrl) {
            fetchPageImageBytes(p.imageUrl, true).catch(() => {});
          }
        });
      }, 40);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to fetch document pages. Try switching the Anti-Block Relay Node.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!currentDoc || isDownloading) return;

    setIsDownloading(true);
    setErrorMsg(null);
    setDownloadProgress({ current: 0, total: currentDoc.pages.length });

    const safeFilename =
      currentDoc.title
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || `scribd-document-${currentDoc.id}`;

    try {
      const pdfBytes = await generateDocumentPdf(currentDoc, {
        includeCoverPage: false,
        includeMetadataFooter: false,
        pageSize: 'A4',
        useClientProxy: true,
        onProgress: (curr, total) => setDownloadProgress({ current: curr, total })
      });

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const sizeKb = Math.round(blob.size / 1024);
      setCompiledPdfSizeKb(sizeKb);

      if (compiledPdfBlobUrl) {
        URL.revokeObjectURL(compiledPdfBlobUrl);
      }
      const newBlobUrl = URL.createObjectURL(blob);
      setCompiledPdfBlobUrl(newBlobUrl);

      const a = document.createElement('a');
      a.href = newBlobUrl;
      a.download = `${safeFilename}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to build PDF. You can also use the Open Fullscreen Reader button.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleCopyLink = () => {
    if (!currentDoc) return;
    navigator.clipboard.writeText(currentDoc.embedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const visibleBlogPosts = useMemo(() => {
    const byLang = cms.blogPosts.filter(
      (p) => p.lang === cms.activeLanguage && p.status === 'published'
    );
    return byLang.length > 0
      ? byLang
      : cms.blogPosts.filter((p) => p.status === 'published');
  }, [cms.blogPosts, cms.activeLanguage]);

  const headerCustomPages = useMemo(
    () =>
      cms.pages.filter(
        (p) =>
          p.showInHeader &&
          p.status === 'published' &&
          (p.lang === cms.activeLanguage || p.lang === 'en')
      ),
    [cms.pages, cms.activeLanguage]
  );

  const footerCustomPages = useMemo(
    () =>
      cms.pages.filter(
        (p) =>
          p.showInFooter &&
          p.status === 'published' &&
          (p.lang === cms.activeLanguage || p.lang === 'en')
      ),
    [cms.pages, cms.activeLanguage]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setRoute({ view: 'home' });
          }}
          className="text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0"
        >
          ScribdDownloader
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#downloader"
            onClick={(e) => {
              e.preventDefault();
              setRoute({ view: 'home' });
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              route.view === 'home' ? 'text-slate-900 font-semibold' : ''
            }`}
          >
            {t.navDownloader}
          </a>

          <a
            href="#blog"
            onClick={(e) => {
              e.preventDefault();
              setRoute({ view: 'blog-list' });
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              route.view === 'blog-list' || route.view === 'blog-post'
                ? 'text-slate-900 font-semibold'
                : ''
            }`}
          >
            {t.navBlog}
          </a>

          <a
            href="#tutorial"
            onClick={(e) => {
              e.preventDefault();
              setRoute({ view: 'home' });
              setTimeout(() => {
                document.getElementById('tutorial')?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            {t.navTutorial}
          </a>

          {headerCustomPages.slice(0, 2).map((pg) => (
            <a
              key={pg.id}
              href={`#page-${pg.slug}`}
              onClick={(e) => {
                e.preventDefault();
                setRoute({ view: 'custom-page', slug: pg.slug });
              }}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                route.view === 'custom-page' && route.slug === pg.slug
                  ? 'text-slate-900 font-semibold'
                  : ''
              }`}
            >
              {pg.title}
            </a>
          ))}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() =>
              setRoute(route.view === 'admin' ? { view: 'home' } : { view: 'admin' })
            }
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{route.view === 'admin' ? t.navDownloader : t.navAdmin}</span>
          </button>
        </div>
      </header>

      {/* Polylang Language Switcher Bar */}
      {route.view !== 'admin' && (
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 no-print">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 md:hidden">
              <button
                type="button"
                onClick={() => setRoute({ view: 'home' })}
                className="font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                {t.navDownloader}
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setRoute({ view: 'blog-list' })}
                className="font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                {t.navBlog}
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap ml-auto">
              <Globe className="w-3.5 h-3.5 text-slate-500 mr-1" />
              {cms.languages
                .filter((l) => l.enabled)
                .map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      cms.activeLanguage === lang.code
                        ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PANEL VIEW */}
      {route.view === 'admin' && (
        <AdminDashboard
          cms={cms}
          onUpdateCms={handleUpdateCms}
          onExitAdmin={() => setRoute({ view: 'home' })}
          onPreviewBlogPost={(slug) => setRoute({ view: 'blog-post', slug })}
          onPreviewCustomPage={(slug) => setRoute({ view: 'custom-page', slug })}
        />
      )}

      {/* PUBLIC VIEWS */}
      {route.view !== 'admin' && (
        <main id="top" className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
          {renderAdSlot('header-leaderboard')}

          {route.view === 'home' && (
            <>
              <section
                id="downloader"
                className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs no-print"
              >
                <div className="text-center max-w-2xl mx-auto">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">
                    {t.heroTitle}
                  </h1>
                  <p className="text-sm text-slate-600 mt-2">
                    {t.heroSubtitle}
                  </p>
                </div>

                {/* Primary Input + "Fetch" & "Download PDF" Buttons */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleFetchDocument();
                  }}
                  className="mt-6 flex flex-col sm:flex-row gap-3"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder={t.inputPlaceholder}
                      className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-mono"
                    />
                  </div>

                  {/* Button 1: Fetch */}
                  <button
                    type="submit"
                    disabled={isFetching || isDownloading}
                    className="px-6 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isFetching ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>
                          {scanProgress
                            ? `${t.fetchingBtn} (${scanProgress.scanned}/${scanProgress.total})`
                            : t.fetchingBtn}
                        </span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>{t.fetchBtn}</span>
                      </>
                    )}
                  </button>

                  {/* Button 2: Download PDF */}
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={!allPagesReady || isFetching || isDownloading}
                    className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isDownloading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>
                          {downloadProgress
                            ? `${t.downloadingBtn} (${downloadProgress.current}/${downloadProgress.total})`
                            : t.downloadingBtn}
                        </span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>{t.downloadPdfBtn}</span>
                      </>
                    )}
                  </button>
                </form>

                {errorMsg && (
                  <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Full Page Detection Progress Bar & Page Number Counter */}
                {(isFetching || allPagesReady) && currentDoc && (
                  <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        {allPagesReady ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                        )}
                        <span>
                          {allPagesReady
                            ? `All ${currentDoc.pages.length} of ${currentDoc.pages.length} Pages Verified${
                                fetchDurationMs ? ` in ${(fetchDurationMs / 1000).toFixed(2)}s` : ''
                              } — Non-Blank Original Content Ready`
                            : `Scanning & Verifying Pages: ${scanProgress?.scanned ?? 0} of ${
                                scanProgress?.total ?? currentDoc.pages.length
                              }`}
                        </span>
                      </div>

                      <div className="font-mono text-slate-600 tabular-nums">
                        Document ID: #{currentDoc.id} · Total Pages: {currentDoc.pages.length}
                        {compiledPdfSizeKb ? ` · Size: ${compiledPdfSizeKb.toLocaleString()} KB` : ''}
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-150 ${
                          allPagesReady ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}
                        style={{
                          width:
                            isDownloading && downloadProgress
                              ? `${Math.round((downloadProgress.current / downloadProgress.total) * 100)}%`
                              : scanProgress && scanProgress.total > 0
                              ? `${Math.round((scanProgress.scanned / scanProgress.total) * 100)}%`
                              : '100%'
                        }}
                      />
                    </div>

                    <div className="pt-1">
                      <div className="text-[11px] text-slate-500 mb-1.5 font-medium">
                        Detected Page Numbers (1 to {currentDoc.pages.length}):
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap max-h-28 overflow-y-auto p-1">
                        {currentDoc.pages.map((p) => (
                          <button
                            key={p.pageNumber}
                            type="button"
                            onClick={() => {
                              setViewerTab('page-grid');
                              const el = document.getElementById(`detected-page-${p.pageNumber}`);
                              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            className="px-2 py-1 text-[11px] font-mono tabular-nums rounded border bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            Page {p.pageNumber}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Example Links & Advanced Anti-IP-Block Toggle */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-700">Example Scribd links:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const link1 = 'https://www.scribd.com/document/436350615/Sample-PDF-Document';
                        setUrlInput(link1);
                        handleFetchDocument(link1);
                      }}
                      className="text-blue-600 hover:underline font-mono cursor-pointer"
                    >
                      scribd.com/document/436350615
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => {
                        const link2 = 'https://www.scribd.com/doc/254565028/Cheat-Sheet';
                        setUrlInput(link2);
                        handleFetchDocument(link2);
                      }}
                      className="text-blue-600 hover:underline font-mono cursor-pointer"
                    >
                      scribd.com/doc/254565028
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAntiBlockPanel((prev) => !prev)}
                    className="text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Advanced Anti-IP Block: {relayNode.toUpperCase()}</span>
                  </button>
                </div>

                {showAntiBlockPanel && (
                  <div className="mt-4 p-4 bg-slate-900 text-slate-100 rounded-lg space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-white">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Ultra-Fast Parallel Anti-IP-Block Engine (24x Concurrent Streams)</span>
                      </div>
                      <span className="text-emerald-400 font-mono text-[11px]">
                        Promise.any Multi-Gateway Racing Active
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {(
                        [
                          { id: 'auto', label: 'Auto-Race All Gateways (Fastest)' },
                          { id: 'direct-proxy', label: 'Gateway 1: Direct Stealth Proxy' },
                          { id: 'allorigins', label: 'Gateway 2: AllOrigins Relay' },
                          { id: 'codetabs', label: 'Gateway 3: CodeTabs Relay' },
                          { id: 'corsproxy', label: 'Gateway 4: CorsProxy Node' }
                        ] as const
                      ).map((node) => (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => setRelayNode(node.id)}
                          className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                            relayNode === node.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {node.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {renderAdSlot('below-downloader-banner')}

              {currentDoc && (
                <>
                  {renderAdSlot('above-viewer-banner')}
                  <section
                    id="viewer"
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
                  >
                    <div className="p-5 bg-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
                      <div className="space-y-1">
                        <div className="text-xs font-mono text-emerald-400 tabular-nums">
                          {currentDoc.pages.length} PAGES DETECTED · DOCUMENT #{currentDoc.id}
                        </div>
                        <h2 className="text-lg font-bold font-display leading-snug">
                          {currentDoc.title}
                        </h2>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          disabled={!allPagesReady || isDownloading}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            {isDownloading
                              ? `${t.downloadingBtn} (${downloadProgress?.current ?? 1}/${downloadProgress?.total ?? currentDoc.pages.length})`
                              : `${t.downloadPdfBtn} (${currentDoc.pages.length} Pages)`}
                          </span>
                        </button>

                        <a
                          href={currentDoc.embedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Open Fullscreen Reader (Ctrl+P → Save PDF)</span>
                        </a>

                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Direct Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
                      <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setViewerTab('original-embed')}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                            viewerTab === 'original-embed'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>PDF Viewer (Live Document)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewerTab('page-grid')}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                            viewerTab === 'page-grid'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Detected Pages List (1 to {currentDoc.pages.length})</span>
                        </button>

                        {compiledPdfBlobUrl && (
                          <button
                            type="button"
                            onClick={() => setViewerTab('pdf-preview')}
                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                              viewerTab === 'pdf-preview'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Downloaded PDF File Preview</span>
                          </button>
                        )}
                      </div>

                      <span className="text-xs text-slate-500 font-mono tabular-nums">
                        Showing Pages 1–{currentDoc.pages.length}
                      </span>
                    </div>

                    {viewerTab === 'original-embed' && (
                      <div className="w-full h-[740px] bg-slate-200">
                        <iframe
                          src={currentDoc.embedUrl}
                          title={`Scribd Document ${currentDoc.id}`}
                          className="w-full h-full border-0 bg-white"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {viewerTab === 'page-grid' && (
                      <div className="p-6 bg-slate-100 max-h-[740px] overflow-y-auto space-y-6">
                        {currentDoc.pages.map((page) => (
                          <div
                            key={page.pageNumber}
                            id={`detected-page-${page.pageNumber}`}
                            className="bg-white border border-slate-200 rounded-lg p-6 max-w-3xl mx-auto shadow-xs space-y-4"
                          >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs font-mono text-slate-500 tabular-nums">
                              <span className="font-semibold text-slate-800">
                                PAGE {page.pageNumber} OF {currentDoc.pages.length}
                              </span>
                              <span>
                                {page.imageUrl ? 'High-Res Original Page Scan' : 'Extracted Page Content'}
                              </span>
                            </div>

                            {page.imageUrl && (
                              <div className="flex justify-center">
                                <img
                                  src={`https://wsrv.nl/?url=${encodeURIComponent(page.imageUrl)}&output=jpg`}
                                  alt={`Page ${page.pageNumber} of ${currentDoc.pages.length}`}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  className="max-w-full h-auto border border-slate-100 rounded"
                                />
                              </div>
                            )}

                            {page.text && !page.text.startsWith(`Page ${page.pageNumber} —`) && (
                              <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                                {page.text}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {viewerTab === 'pdf-preview' && compiledPdfBlobUrl && (
                      <div className="w-full h-[740px] bg-slate-800">
                        <iframe
                          src={compiledPdfBlobUrl}
                          title="Downloaded PDF Preview"
                          className="w-full h-full border-0"
                        />
                      </div>
                    )}
                  </section>
                </>
              )}

              {renderAdSlot('in-article-tutorial')}

              {/* Step-by-Step Tutorial Section */}
              <section
                id="tutorial"
                className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 no-print"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display">
                    {t.tutorialHeading}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {t.tutorialSubheading}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="text-xs font-mono font-bold text-blue-600">
                      01. STEP 1
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {t.step1Title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t.step1Desc}
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="text-xs font-mono font-bold text-blue-600">
                      02. STEP 2
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {t.step2Title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t.step2Desc}
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="text-xs font-mono font-bold text-blue-600">
                      03. STEP 3
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {t.step3Title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t.step3Desc}
                    </p>
                  </div>
                </div>
              </section>

              {/* HOMEPAGE INTERACTIVE MULTI-CONTENT SWITCHER */}
              <MultiContentSwitcher sections={t.homeSwitcherSections} />

              {/* Additional Custom Homepage HTML Block (Configured in WordPress Editor) */}
              {t.customHomeHtml && (
                <section
                  className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 prose prose-slate max-w-none text-sm no-print"
                  dangerouslySetInnerHTML={{ __html: t.customHomeHtml }}
                />
              )}

              {/* Latest Blog Articles Preview on Homepage */}
              {visibleBlogPosts.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5 no-print">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>{t.navBlog} & Guides</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setRoute({ view: 'blog-list' })}
                      className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      View All Articles →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {visibleBlogPosts.slice(0, 2).map((post) => (
                      <article
                        key={post.id}
                        onClick={() => setRoute({ view: 'blog-post', slug: post.slug })}
                        className="p-5 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-400 transition-colors cursor-pointer space-y-2"
                      >
                        <div className="text-xs text-slate-500 font-mono">
                          {post.publishedAt} · {post.author}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {post.title}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {post.excerpt}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* VIEW B: BLOG LIST */}
          {route.view === 'blog-list' && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 font-display">
                    {t.navBlog} & Documentation ({activeLangObj.nativeName})
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Guides, tutorials, and technical articles managed via the WordPress Editor & Polylang engine.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRoute({ view: 'home' })}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t.navDownloader}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleBlogPosts.map((post) => (
                  <article
                    key={post.id}
                    onClick={() => setRoute({ view: 'blog-post', slug: post.slug })}
                    className="p-6 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-500 transition-colors cursor-pointer space-y-3"
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <span>{post.publishedAt}</span>
                      <span>·</span>
                      <span>{post.author}</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 font-display">
                      {post.title}
                    </h2>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {post.excerpt}
                    </p>
                    <div className="text-xs font-semibold text-blue-600 pt-1">
                      Read Full Article →
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* VIEW C: SINGLE BLOG POST */}
          {route.view === 'blog-post' && (() => {
            const post = cms.blogPosts.find((p) => p.slug === route.slug);
            if (!post) {
              return (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
                  <p className="text-sm text-slate-600">Article not found.</p>
                  <button
                    type="button"
                    onClick={() => setRoute({ view: 'blog-list' })}
                    className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg cursor-pointer"
                  >
                    Back to Blog
                  </button>
                </div>
              );
            }
            return (
              <article className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setRoute({ view: 'blog-list' })}
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to {t.navBlog}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {cms.languages
                      .filter((l) => l.enabled)
                      .map((l) => {
                        const trans = cms.blogPosts.find(
                          (p) =>
                            p.translationGroupId === post.translationGroupId &&
                            p.lang === l.code
                        );
                        if (!trans) return null;
                        return (
                          <button
                            key={l.code}
                            type="button"
                            onClick={() => {
                              handleUpdateCms({ ...cms, activeLanguage: l.code });
                              setRoute({ view: 'blog-post', slug: trans.slug });
                            }}
                            className={`px-2 py-1 text-xs rounded border cursor-pointer ${
                              post.lang === l.code
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {l.flag} {l.nativeName}
                          </button>
                        );
                      })}
                  </div>
                </div>

                <header className="space-y-2 border-b border-slate-200 pb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display leading-tight">
                    {post.title}
                  </h1>
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{post.publishedAt}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      <span>{post.author}</span>
                    </span>
                  </div>
                </header>

                <div
                  className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{ __html: post.contentHtml }}
                />
              </article>
            );
          })()}

          {/* VIEW D: CUSTOM PAGE + PAGE MULTI-CONTENT SWITCHER */}
          {route.view === 'custom-page' && (() => {
            const pg = cms.pages.find((p) => p.slug === route.slug);
            if (!pg) {
              return (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
                  <p className="text-sm text-slate-600">Page not found.</p>
                  <button
                    type="button"
                    onClick={() => setRoute({ view: 'home' })}
                    className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg cursor-pointer"
                  >
                    Back to Home
                  </button>
                </div>
              );
            }
            return (
              <div className="space-y-6">
                <article className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <h1 className="text-2xl font-bold text-slate-900 font-display">
                      {pg.title}
                    </h1>
                    <button
                      type="button"
                      onClick={() => setRoute({ view: 'home' })}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{t.navDownloader}</span>
                    </button>
                  </div>

                  <div
                    className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4"
                    dangerouslySetInnerHTML={{ __html: pg.contentHtml }}
                  />
                </article>

                {/* Render Interactive Multi-Content Switcher Tabs for this Page */}
                <MultiContentSwitcher sections={pg.switcherSections} />
              </div>
            );
          })()}

          {renderAdSlot('footer-sticky-banner')}
        </main>
      )}

      {/* Clean Footer */}
      <footer className="bg-white border-t border-slate-200 py-5 px-6 mt-auto no-print">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>ScribdDownloader — Free Online Document Viewer & PDF Extractor</span>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setRoute({ view: 'home' })}
              className="hover:text-slate-900 cursor-pointer"
            >
              {t.navDownloader}
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setRoute({ view: 'blog-list' })}
              className="hover:text-slate-900 cursor-pointer"
            >
              {t.navBlog}
            </button>
            {footerCustomPages.map((pg) => (
              <React.Fragment key={pg.id}>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setRoute({ view: 'custom-page', slug: pg.slug })}
                  className="hover:text-slate-900 cursor-pointer"
                >
                  {pg.title}
                </button>
              </React.Fragment>
            ))}
            <span>·</span>
            <button
              type="button"
              onClick={() => setRoute({ view: 'admin' })}
              className="hover:text-slate-900 font-medium cursor-pointer"
            >
              {t.navAdmin}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
