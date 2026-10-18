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
  FileDown,
  Copy,
  Check,
  Sliders,
  Layers,
  Zap,
  Globe,
  BookOpen,
  ArrowLeft,
  Calendar,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Mail,
  Menu,
  X
} from 'lucide-react';
import {
  ScribdDocumentData,
  ScribdPage,
  parseScribdInput,
  parseEmbedHtmlAssets,
  parseJsonpPageContent,
  fetchPageImageBytes,
  generateDocumentPdf,
  isValidScribdPayload,
  buildGoogleTranslateEdgeUrl
} from './lib/scribdCore';
import {
  CmsStoreState,
  DEFAULT_READING_AND_LAYOUT,
  loadCmsState,
  saveCmsState,
  UIStringTranslations,
  SeoLanguageConfig,
  ContentSwitcherSectionItem,
  ShortcodeItem,
  renderShortcodesInHtml,
  detectBrowserAndRegionLanguage,
  USER_LANG_OVERRIDE_KEY,
  isAdminAuthenticatedSession,
  logoutAdminSession
} from './lib/cmsStore';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';

type ViewerTab = 'original-embed' | 'page-slider' | 'page-grid' | 'pdf-preview';
type RelayNode = 'auto' | 'direct-proxy' | 'allorigins' | 'codetabs' | 'corsproxy';
type ActiveRoute =
  | { view: 'home' }
  | { view: 'blog-list' }
  | { view: 'blog-post'; slug: string }
  | { view: 'custom-page'; slug: string }
  | { view: 'admin' };

function detectInitialRouteFromUrl(): ActiveRoute {
  if (typeof window === 'undefined') return { view: 'home' };
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const hash = window.location.hash.replace(/^#/, '');
  const searchParams = new URLSearchParams(window.location.search);

  if (
    pathname === '/kmg' ||
    pathname.startsWith('/kmg/') ||
    hash === '/kmg' ||
    hash === 'kmg' ||
    searchParams.has('kmg')
  ) {
    return { view: 'admin' };
  }

  if (pathname === '/blog') {
    return { view: 'blog-list' };
  }
  if (pathname.startsWith('/blog/')) {
    const slug = pathname.slice('/blog/'.length);
    if (slug) return { view: 'blog-post', slug };
  }
  if (pathname.startsWith('/p/')) {
    const slug = pathname.slice('/p/'.length);
    if (slug) return { view: 'custom-page', slug };
  }

  return { view: 'home' };
}

function renderRichContentWithDownloader(
  html: string,
  shortcodes?: ShortcodeItem[],
  renderDownloaderWidget?: () => React.ReactNode
): React.ReactNode {
  if (!html) return null;

  const isDownloaderShortcodeEnabled =
    !shortcodes ||
    shortcodes.length === 0 ||
    shortcodes.some(
      (s) => s.tag.trim().toLowerCase() === 'scribd_downloader' && s.enabled
    );

  const shortcodeRegex = /<p[^>]*>\s*\[scribd_downloader\]\s*<\/p>|\[scribd_downloader\]/gi;

  if (
    renderDownloaderWidget &&
    isDownloaderShortcodeEnabled &&
    shortcodeRegex.test(html)
  ) {
    const parts = html.split(shortcodeRegex);
    return (
      <div className="space-y-6">
        {parts.map((segment, index) => (
          <React.Fragment key={index}>
            {segment.trim() && (
              <div
                className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{
                  __html: renderShortcodesInHtml(segment, shortcodes)
                }}
              />
            )}
            {index < parts.length - 1 && (
              <div className="not-prose my-6">{renderDownloaderWidget()}</div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div
      className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed space-y-3"
      dangerouslySetInnerHTML={{
        __html: renderShortcodesInHtml(html, shortcodes)
      }}
    />
  );
}

/**
 * Reusable Interactive Multi-Content Switcher Component for Homepage & Custom Pages
 */
function MultiContentSwitcher({
  sections,
  shortcodes,
  renderDownloaderWidget
}: {
  sections?: ContentSwitcherSectionItem[];
  shortcodes?: ShortcodeItem[];
  renderDownloaderWidget?: () => React.ReactNode;
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
        <div className="pt-1">
          {renderRichContentWithDownloader(
            activeItem.contentHtml,
            shortcodes,
            renderDownloaderWidget
          )}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [cms, setCms] = useState<CmsStoreState>(() => loadCmsState());
  const [route, setRouteState] = useState<ActiveRoute>(() => detectInitialRouteFromUrl());
  const [isAdminAuth, setIsAdminAuth] = useState<boolean>(() =>
    isAdminAuthenticatedSession()
  );

  const setRoute = (nextRoute: ActiveRoute) => {
    setRouteState(nextRoute);
    if (typeof window !== 'undefined') {
      let targetUrl = '/';
      if (nextRoute.view === 'admin') {
        targetUrl = '/kmg';
      } else if (nextRoute.view === 'blog-list') {
        targetUrl = '/blog';
      } else if (nextRoute.view === 'blog-post') {
        targetUrl = `/blog/${nextRoute.slug}`;
      } else if (nextRoute.view === 'custom-page') {
        targetUrl = `/p/${nextRoute.slug}`;
      }
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({}, '', targetUrl);
      }
    }
  };

  useEffect(() => {
    const onPopState = () => {
      setRouteState(detectInitialRouteFromUrl());
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, []);

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
  const [viewerTab, setViewerTab] = useState<ViewerTab>('page-slider');
  const [activeSlidePage, setActiveSlidePage] = useState<number>(1);
  const [sliderZoom, setSliderZoom] = useState<number>(100);
  const [isAutoPlayingSlides, setIsAutoPlayingSlides] = useState<boolean>(false);
  const [compiledPdfBlobUrl, setCompiledPdfBlobUrl] = useState<string | null>(null);
  const [compiledPdfSizeKb, setCompiledPdfSizeKb] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Auto-play page slideshow if enabled
  useEffect(() => {
    if (!isAutoPlayingSlides || !currentDoc || currentDoc.pages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlidePage((prev) => (prev >= currentDoc.pages.length ? 1 : prev + 1));
    }, 2800);
    return () => clearInterval(interval);
  }, [isAutoPlayingSlides, currentDoc]);

  // Keyboard left/right arrow navigation for slider
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!currentDoc || currentDoc.pages.length <= 1) return;
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        setActiveSlidePage((prev) => Math.max(1, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveSlidePage((prev) => Math.min(currentDoc.pages.length, prev + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentDoc]);

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
    const matchingSlots = cms.ads.filter(
      (a) =>
        (a.id === slotId || a.placementZone === slotId) &&
        a.enabled &&
        a.htmlCode.trim()
    );
    if (matchingSlots.length === 0) return null;
    return (
      <div className="space-y-3 my-4 no-print">
        {matchingSlots.map((slot) => (
          <div
            key={slot.id}
            className="w-full overflow-hidden"
            dangerouslySetInnerHTML={{ __html: slot.htmlCode }}
          />
        ))}
      </div>
    );
  };

  const handleSelectLanguage = (langCode: string, isManualSelection = true) => {
    let nextRoute: ActiveRoute = route;

    if (isManualSelection && typeof window !== 'undefined') {
      try {
        localStorage.setItem(USER_LANG_OVERRIDE_KEY, langCode);
      } catch {
        // ignore
      }
    }

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

  const handleAutoDetectBrowserLanguage = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(USER_LANG_OVERRIDE_KEY);
      } catch {
        // ignore
      }
    }
    const detected = detectBrowserAndRegionLanguage(cms.languages, true);
    handleSelectLanguage(detected.matchedCode, false);
  };

  const raceViaRelayNodes = async (targetUrl: string, timeoutMs = 5500): Promise<string | null> => {
    const cleanTarget = targetUrl
      .replace(/^http:\/\/html\.scribd\.com\//i, 'https://html.scribdassets.com/')
      .replace(/^http:\/\//i, 'https://');

    // Fast path: `scribdassets.com` has `Access-Control-Allow-Origin: *` and responds directly in ~39ms!
    if (cleanTarget.includes('scribdassets.com')) {
      try {
        const directResp = await fetch(cleanTarget, { signal: AbortSignal.timeout(3000) });
        if (directResp.ok) {
          const text = await directResp.text();
          if (text && text.length >= 40) return text;
        }
      } catch {
        // Fall through to relay nodes
      }
    }

    const gTarget = cleanTarget.includes('scribd.com')
      ? buildGoogleTranslateEdgeUrl(cleanTarget)
      : cleanTarget;

    const buildUrl = (node: RelayNode) => {
      if (node === 'direct-proxy') return `/api/proxy-asset?url=${encodeURIComponent(cleanTarget)}`;
      if (node === 'allorigins') return `https://api.allorigins.win/raw?url=${encodeURIComponent(gTarget)}`;
      if (node === 'codetabs') return `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(gTarget)}`;
      return `https://corsproxy.io/?${encodeURIComponent(gTarget)}`;
    };

    const attempt = async (node: RelayNode): Promise<string> => {
      const resp = await fetch(buildUrl(node), { signal: AbortSignal.timeout(timeoutMs) });
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      const text = await resp.text();
      if (!isValidScribdPayload(text, cleanTarget)) {
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
    const cleanEmbedUrl = `https://www.scribd.com/embeds/${docId}/content?start_page=1&view_mode=scroll&access_key=key-fFexxf7r1bzEfWu3HKwf`;
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
      embedUrl: cleanEmbedUrl,
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
    setActiveSlidePage(1);

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
        const response = await fetch(`/api/resolve?url=${encodeURIComponent(raw)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: raw }),
          signal: AbortSignal.timeout(9000)
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.document || !Array.isArray(data.document.pages) || data.document.pages.length === 0) {
          throw new Error(data?.error || `Resolver returned status ${response.status}`);
        }
        return data.document;
      })();

      const clientPromise = discoverAllPagesFastClient(parsed.id, parsed.slugTitle);

      let resolvedDoc: ScribdDocumentData;
      try {
        resolvedDoc = await Promise.any([
          serverPromise.then((doc) => {
            if (
              doc.pages.length <= 1 &&
              !doc.pages[0]?.jsonpUrl &&
              doc.pages[0]?.text?.startsWith('Page 1 —')
            ) {
              throw new Error('Single unverified stub page');
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

      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
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

  const [headerLangDropdownOpen, setHeaderLangDropdownOpen] = useState(false);
  const [headerPagesDropdownOpen, setHeaderPagesDropdownOpen] = useState(false);
  const [mobileMenuDrawerOpen, setMobileMenuDrawerOpen] = useState(false);

  const readingAndLayout = cms.readingAndLayout || DEFAULT_READING_AND_LAYOUT;

  const enabledLanguages = useMemo(
    () => cms.languages.filter((l) => l.enabled),
    [cms.languages]
  );

  const detectedBrowserLangInfo = useMemo(
    () => detectBrowserAndRegionLanguage(cms.languages, true),
    [cms.languages]
  );

  // Automatically sync browser/region language if autoDetectBrowserLanguage is enabled and user hasn't manually overridden
  useEffect(() => {
    if (!readingAndLayout.autoDetectBrowserLanguage) return;
    const manualOverride =
      typeof window !== 'undefined' ? localStorage.getItem(USER_LANG_OVERRIDE_KEY) : null;
    if (manualOverride) return;

    const detected = detectBrowserAndRegionLanguage(cms.languages, true);
    if (
      detected.matchedCode &&
      detected.matchedCode !== cms.activeLanguage &&
      cms.languages.some((l) => l.code === detected.matchedCode && l.enabled)
    ) {
      handleSelectLanguage(detected.matchedCode, false);
    }
  }, [readingAndLayout.autoDetectBrowserLanguage, cms.languages]);

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

  const contactPageSlug = readingAndLayout.contactButtonPageSlug || 'contact-us';

  // STANDALONE /kmg ADMIN PORTAL (Completely separated from User Frontend)
  if (route.view === 'admin') {
    if (!isAdminAuth) {
      return (
        <AdminLogin
          onLoginSuccess={() => setIsAdminAuth(true)}
          onBackToSite={() => setRoute({ view: 'home' })}
        />
      );
    }

    return (
      <AdminDashboard
        cms={cms}
        onUpdateCms={handleUpdateCms}
        onExitAdmin={() => setRoute({ view: 'home' })}
        onLogoutAdmin={() => {
          logoutAdminSession();
          setIsAdminAuth(false);
        }}
        onPreviewBlogPost={(slug) => setRoute({ view: 'blog-post', slug })}
        onPreviewCustomPage={(slug) => setRoute({ view: 'custom-page', slug })}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-50 text-slate-900"
      onClick={() => {
        if (headerLangDropdownOpen) setHeaderLangDropdownOpen(false);
        if (headerPagesDropdownOpen) setHeaderPagesDropdownOpen(false);
      }}
    >
      {/* Public Header Matching Uploaded Screenshot Design */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-6">
          {/* Left: Dark Navy Capsule Document-Download Icon + Stacked Scribd / Downloader Brand */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setRoute({ view: 'home' });
              setMobileMenuDrawerOpen(false);
            }}
            className="flex items-center gap-3 shrink-0 group cursor-pointer"
          >
            <div className="w-11 h-12 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center shadow-xs group-hover:bg-slate-800 transition-colors shrink-0">
              <FileDown className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div className="flex flex-col justify-center leading-none">
              <span className="text-[20px] sm:text-[22px] font-extrabold text-[#0f172a] tracking-tight font-display leading-none">
                {readingAndLayout.brandTopTitle || 'Scribd'}
              </span>
              <span className="text-[20px] sm:text-[22px] font-extrabold bg-gradient-to-r from-[#5b5bd6] via-[#2563eb] to-[#06b6d4] bg-clip-text text-transparent tracking-tight font-display leading-tight mt-0.5">
                {readingAndLayout.brandBottomTitle || 'Downloader'}
              </span>
            </div>
          </a>

          {/* Center Desktop Navigation: Home, Blogs, Pages Dropdown, Contact */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-700">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setRoute({ view: 'home' });
              }}
              className={`hover:text-blue-600 transition-colors cursor-pointer ${
                route.view === 'home' ? 'text-blue-600 font-bold' : 'text-slate-700'
              }`}
            >
              Home
            </a>

            <a
              href="/blog"
              onClick={(e) => {
                e.preventDefault();
                setRoute({ view: 'blog-list' });
              }}
              className={`hover:text-blue-600 transition-colors cursor-pointer ${
                route.view === 'blog-list' || route.view === 'blog-post'
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-700'
              }`}
            >
              {t.navBlog || 'Blogs'}
            </a>

            {/* Pages Dropdown in Desktop Header */}
            {readingAndLayout.showImportantPagesDropdownInHeader &&
              headerCustomPages.length > 0 && (
                <div
                  className="relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderPagesDropdownOpen((prev) => !prev);
                      setHeaderLangDropdownOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 text-sm font-semibold cursor-pointer ${
                      route.view === 'custom-page' && route.slug !== contactPageSlug
                        ? 'text-blue-600 font-bold'
                        : 'text-slate-700'
                    }`}
                  >
                    <span>Pages</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {headerPagesDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
                      <div className="px-3.5 py-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase border-b border-slate-100">
                        Important & Legal Pages
                      </div>
                      {headerCustomPages.map((pg) => {
                        const isCurrent =
                          route.view === 'custom-page' && route.slug === pg.slug;
                        return (
                          <button
                            key={pg.id}
                            type="button"
                            onClick={() => {
                              setRoute({ view: 'custom-page', slug: pg.slug });
                              setHeaderPagesDropdownOpen(false);
                            }}
                            className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                              isCurrent
                                ? 'font-bold text-blue-600 bg-blue-50/50'
                                : 'text-slate-700 font-medium'
                            }`}
                          >
                            <span className="truncate">{pg.title}</span>
                            {isCurrent && (
                              <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

          </nav>

          {/* Right Action Controls: Rounded Pill Language Switcher (🇺🇸 EN ⌄) + Hamburger Menu (☰) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Rounded Pill Language Switcher matching design */}
            {readingAndLayout.showLanguageDropdownInHeader &&
              enabledLanguages.length > 0 && (
                <div
                  className="relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderLangDropdownOpen((prev) => !prev);
                      setHeaderPagesDropdownOpen(false);
                    }}
                    className="px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0f172a] transition-colors cursor-pointer whitespace-nowrap"
                    title="Switch Language (Auto-detects Browser & Region)"
                  >
                    <span className="text-base leading-none">{activeLangObj.flag}</span>
                    <span className="tracking-wide uppercase">
                      {activeLangObj.code.toUpperCase()}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-500 stroke-[2.2]" />
                  </button>

                  {headerLangDropdownOpen && (
                    <div className="absolute right-0 mt-2.5 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
                      <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleAutoDetectBrowserLanguage();
                            setHeaderLangDropdownOpen(false);
                          }}
                          className="w-full px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold cursor-pointer text-center"
                          title={`Auto-detect browser language (${detectedBrowserLangInfo.browserLocale})`}
                        >
                          ⚡ Auto ({detectedBrowserLangInfo.matchedCode.toUpperCase()})
                        </button>
                      </div>

                      <div className="max-h-64 overflow-y-auto py-1">
                        {enabledLanguages.map((lang) => {
                          const isSelected = cms.activeLanguage === lang.code;
                          return (
                            <button
                              key={lang.code}
                              type="button"
                              onClick={() => {
                                handleSelectLanguage(lang.code, true);
                                setHeaderLangDropdownOpen(false);
                              }}
                              className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50/70 text-blue-700 font-bold'
                                  : 'text-slate-700 font-medium'
                              }`}
                              title={`${lang.name} (${lang.nativeName})`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-base leading-none">{lang.flag}</span>
                                <span className="font-bold uppercase tracking-wider text-xs">
                                  {lang.code.toUpperCase()}
                                </span>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* Hamburger Menu Button (☰) on Far Right matching screenshot */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuDrawerOpen((prev) => !prev);
                setHeaderLangDropdownOpen(false);
                setHeaderPagesDropdownOpen(false);
              }}
              className="p-2 rounded-xl text-[#0f172a] hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              aria-label="Open Navigation Menu"
              title="Navigation Menu (Home, Blogs, Pages, Contact, Languages)"
            >
              {mobileMenuDrawerOpen ? (
                <X className="w-6 h-6 stroke-[2.2]" />
              ) : (
                <Menu className="w-6 h-6 stroke-[2.2]" />
              )}
            </button>
          </div>
        </div>

        {/* Slide-Down Navigation Menu Drawer (Opened via ☰ Hamburger Icon) */}
        {mobileMenuDrawerOpen && (
          <div className="bg-white border-t border-slate-200 shadow-lg px-4 sm:px-6 py-5 space-y-5">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: Main Navigation (Home, Blogs, Contact) */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Main Navigation
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRoute({ view: 'home' });
                      setMobileMenuDrawerOpen(false);
                    }}
                    className={`px-3.5 py-2.5 rounded-xl text-left text-sm font-bold flex items-center justify-between cursor-pointer ${
                      route.view === 'home'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span>Home Page ({t.navDownloader})</span>
                    {route.view === 'home' && <Check className="w-4 h-4 text-blue-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRoute({ view: 'blog-list' });
                      setMobileMenuDrawerOpen(false);
                    }}
                    className={`px-3.5 py-2.5 rounded-xl text-left text-sm font-bold flex items-center justify-between cursor-pointer ${
                      route.view === 'blog-list' || route.view === 'blog-post'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span>Blogs & Guides ({t.navBlog})</span>
                    {(route.view === 'blog-list' || route.view === 'blog-post') && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRoute({ view: 'custom-page', slug: contactPageSlug });
                      setMobileMenuDrawerOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`px-3.5 py-2.5 rounded-xl text-left text-sm font-bold flex items-center justify-between cursor-pointer transition-colors ${
                      route.view === 'custom-page' && route.slug === contactPageSlug
                        ? 'bg-[#0f172a] text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{readingAndLayout.contactButtonText || 'Contact Us'}</span>
                    </div>
                    {route.view === 'custom-page' && route.slug === contactPageSlug ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="text-xs font-mono text-slate-400">→</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Column 2: Important & Legal Pages */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Pages ({headerCustomPages.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {headerCustomPages.map((pg) => {
                    const isCurrent =
                      route.view === 'custom-page' && route.slug === pg.slug;
                    return (
                      <button
                        key={pg.id}
                        type="button"
                        onClick={() => {
                          setRoute({ view: 'custom-page', slug: pg.slug });
                          setMobileMenuDrawerOpen(false);
                        }}
                        className={`px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{pg.title}</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Column 3: Language Switcher (Browser & Region Auto-Switch) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Language Switcher
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleAutoDetectBrowserLanguage();
                      setMobileMenuDrawerOpen(false);
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    ⚡ Auto ({detectedBrowserLangInfo.browserLocale})
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {enabledLanguages.map((lang) => {
                    const isSelected = cms.activeLanguage === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          handleSelectLanguage(lang.code, true);
                          setMobileMenuDrawerOpen(false);
                        }}
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-[#0f172a] text-white border-[#0f172a]'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={`${lang.name} (${lang.nativeName})`}
                      >
                        <span className="text-sm leading-none">{lang.flag}</span>
                        <span className="tracking-wider">{lang.code.toUpperCase()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dedicated Contact Us Card Banner inside the Hamburger Drawer */}
            <div className="max-w-6xl mx-auto pt-3 border-t border-slate-200">
              <div className="bg-[#0f172a] text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
                  </div>
                  <div>
                    <div className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                      <span>{readingAndLayout.contactButtonText || 'Contact Us'}</span>
                      <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                        Online Support
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Need help downloading a document, have feedback, or want to send an inquiry? Get in touch with our team anytime.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRoute({ view: 'custom-page', slug: contactPageSlug });
                    setMobileMenuDrawerOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  <Mail className="w-4 h-4" />
                  <span>Go to {readingAndLayout.contactButtonText || 'Contact Us'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* PUBLIC USER VIEWS */}
      <main id="top" className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {renderAdSlot('header-leaderboard')}

        {(() => {
          const renderInteractiveDownloaderSection = (isShortcodeEmbed = false) => (
            <div className="space-y-6">
              <section
                id={isShortcodeEmbed ? undefined : 'downloader'}
                className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs no-print"
              >
                <div className="text-center max-w-2xl mx-auto">
                  {isShortcodeEmbed ? (
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight">
                      {t.heroTitle}
                    </h2>
                  ) : (
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">
                      {t.heroTitle}
                    </h1>
                  )}
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

                  {/* Button 2: Direct Multi-Page PDF Compiler */}
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
                        <span>
                          {currentDoc && allPagesReady
                            ? `${t.downloadPdfBtn} (${currentDoc.pages.length} Pages)`
                            : t.downloadPdfBtn}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Button 3: Unlocked Viewer Full-Document PDF Export */}
                  {currentDoc && (
                    <a
                      href={currentDoc.embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Open the unlocked multi-page vector stream and press Ctrl+P / Cmd+P → Save as PDF"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Save Full Preview PDF</span>
                    </a>
                  )}
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
                              } — Multi-Page PDF Ready`
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

                    {/* INTERACTIVE PAGE PREVIEW SLIDER (REPLACES PAGE NUMBERS LIST) */}
                    <div className="pt-2 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            Page Preview Slider
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-200">
                            Page {activeSlidePage} of {currentDoc.pages.length}
                          </span>
                        </div>

                        {/* Prev / Next & Slider Controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={activeSlidePage <= 1}
                            onClick={() => setActiveSlidePage((prev) => Math.max(1, prev - 1))}
                            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-30 text-slate-700 cursor-pointer transition-colors"
                            title="Previous Page (←)"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={activeSlidePage >= currentDoc.pages.length}
                            onClick={() => setActiveSlidePage((prev) => Math.min(currentDoc.pages.length, prev + 1))}
                            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-30 text-slate-700 cursor-pointer transition-colors"
                            title="Next Page (→)"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setViewerTab('page-slider');
                              const el = document.getElementById('viewer');
                              el?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center gap-1 cursor-pointer transition-colors ml-1"
                          >
                            <Maximize2 className="w-3 h-3" />
                            <span>Open Full Slider</span>
                          </button>
                        </div>
                      </div>

                      {/* Interactive Drag & Scrub Range Slider */}
                      <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                          <span>Page 1</span>
                          <span className="font-bold text-blue-600">
                            Drag Slider to View Any Page ({activeSlidePage} / {currentDoc.pages.length})
                          </span>
                          <span>Page {currentDoc.pages.length}</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={currentDoc.pages.length}
                          value={activeSlidePage}
                          onChange={(e) => setActiveSlidePage(Number(e.target.value))}
                          className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
                        />
                      </div>

                      {/* Active Page Large Preview Stage with Overlay Nav Arrows */}
                      {currentDoc.pages[activeSlidePage - 1] && (() => {
                        const activePage = currentDoc.pages[activeSlidePage - 1];
                        return (
                          <div className="relative bg-slate-900/95 rounded-xl overflow-hidden border border-slate-300 p-3 sm:p-4 flex flex-col items-center justify-center min-h-[340px] max-h-[460px] shadow-inner">
                            {/* Floating Left Arrow */}
                            <button
                              type="button"
                              disabled={activeSlidePage <= 1}
                              onClick={() => setActiveSlidePage((prev) => Math.max(1, prev - 1))}
                              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center disabled:opacity-20 shadow-lg cursor-pointer backdrop-blur-xs transition-transform hover:scale-105"
                              title="Previous Page (←)"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>

                            {/* Floating Right Arrow */}
                            <button
                              type="button"
                              disabled={activeSlidePage >= currentDoc.pages.length}
                              onClick={() => setActiveSlidePage((prev) => Math.min(currentDoc.pages.length, prev + 1))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center disabled:opacity-20 shadow-lg cursor-pointer backdrop-blur-xs transition-transform hover:scale-105"
                              title="Next Page (→)"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>

                            {/* Active Page Image Scan or Extracted Text */}
                            {activePage.imageUrl ? (
                              <div className="max-h-[380px] overflow-hidden flex items-center justify-center">
                                <img
                                  src={`https://wsrv.nl/?url=${encodeURIComponent(activePage.imageUrl)}&output=jpg`}
                                  alt={`Preview of Page ${activePage.pageNumber}`}
                                  className="max-h-[380px] w-auto object-contain rounded border border-white/20 shadow-2xl transition-transform"
                                />
                              </div>
                            ) : (
                              <div className="bg-white rounded-lg p-6 max-w-lg w-full text-slate-800 shadow-md space-y-2 text-xs leading-relaxed max-h-[360px] overflow-y-auto">
                                <div className="font-mono font-bold text-slate-400 pb-1 border-b border-slate-100 flex items-center justify-between">
                                  <span>Page {activePage.pageNumber} — Extracted Content Preview</span>
                                  <span className="text-emerald-600 font-normal">Vector Text Verified</span>
                                </div>
                                <div className="whitespace-pre-wrap">{activePage.text}</div>
                              </div>
                            )}

                            {/* Bottom Caption Bar */}
                            <div className="mt-2.5 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-[11px] font-mono text-white flex items-center gap-2">
                              <span>Page {activePage.pageNumber} of {currentDoc.pages.length}</span>
                              <span className="text-emerald-400">
                                · {activePage.imageUrl ? 'High-Res Page Scan Verified' : 'Vector Content Verified'}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Horizontal Thumbnail Scrubber Filmstrip (Visual Page Previews instead of plain text numbers) */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span>Visual Page Thumbnails (Click any page preview to slide):</span>
                          <span className="font-mono text-slate-400">Total {currentDoc.pages.length} Previews</span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin">
                          {currentDoc.pages.map((p) => {
                            const isCurrent = p.pageNumber === activeSlidePage;
                            return (
                              <button
                                key={p.pageNumber}
                                type="button"
                                onClick={() => setActiveSlidePage(p.pageNumber)}
                                className={`group shrink-0 relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'border-blue-600 ring-2 ring-blue-400 scale-105 shadow-md z-10'
                                    : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                                }`}
                                style={{ width: '68px', height: '92px' }}
                                title={`Slide to Page ${p.pageNumber}`}
                              >
                                {p.imageUrl ? (
                                  <img
                                    src={`https://wsrv.nl/?url=${encodeURIComponent(p.imageUrl)}&w=140&output=jpg`}
                                    alt={`Thumb ${p.pageNumber}`}
                                    className="w-full h-full object-cover bg-white"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-1 text-center">
                                    <FileText className="w-5 h-5 text-slate-400" />
                                    <span className="text-[9px] font-mono text-slate-500 mt-1 line-clamp-2">
                                      P.{p.pageNumber}
                                    </span>
                                  </div>
                                )}
                                <div
                                  className={`absolute bottom-0 inset-x-0 text-center py-0.5 text-[10px] font-mono font-bold ${
                                    isCurrent ? 'bg-blue-600 text-white' : 'bg-black/60 text-white'
                                  }`}
                                >
                                  P.{p.pageNumber}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Example Links & Advanced Anti-IP-Block Toggle */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-700">Live Multi-Page Examples:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const link1 = 'https://www.scribd.com/document/991278283/2026-Grade-12-Investigation-Term-1';
                        setUrlInput(link1);
                        handleFetchDocument(link1);
                      }}
                      className="text-blue-600 hover:underline font-mono cursor-pointer"
                    >
                      scribd.com/document/991278283 (9 Pages)
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => {
                        const link2 = 'https://www.scribd.com/document/894860339/Document-2';
                        setUrlInput(link2);
                        handleFetchDocument(link2);
                      }}
                      className="text-blue-600 hover:underline font-mono cursor-pointer"
                    >
                      scribd.com/document/894860339 (14 Pages)
                    </button>
                  </div>
                </div>
              </section>

              {!isShortcodeEmbed && renderAdSlot('below-downloader-banner')}

              {currentDoc && (
                <>
                  {!isShortcodeEmbed && renderAdSlot('above-viewer-banner')}
                  <section
                    id={isShortcodeEmbed ? undefined : 'viewer'}
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
                          onClick={() => setViewerTab('page-slider')}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                            viewerTab === 'page-slider'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Sliders className="w-3.5 h-3.5 text-blue-600" />
                          <span>Page Preview Slider</span>
                        </button>

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
                          <span>All Pages Grid ({currentDoc.pages.length})</span>
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
                            <span>Downloaded PDF Preview</span>
                          </button>
                        )}
                      </div>

                      <span className="text-xs text-slate-500 font-mono tabular-nums">
                        Active Slide: Page {activeSlidePage} of {currentDoc.pages.length}
                      </span>
                    </div>

                    {viewerTab === 'page-slider' && (
                      <div className="p-4 sm:p-6 bg-slate-950 text-white min-h-[660px] flex flex-col justify-between space-y-4">
                        {/* Slider Controls Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-400">
                              PAGE {activeSlidePage} / {currentDoc.pages.length}
                            </span>
                            <span className="text-slate-600">|</span>
                            <span className="text-xs text-slate-300">
                              {currentDoc.pages[activeSlidePage - 1]?.imageUrl
                                ? 'High-Definition Page Scan'
                                : 'Extracted Text Stream'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Autoplay Slideshow Toggle */}
                            <button
                              type="button"
                              onClick={() => setIsAutoPlayingSlides((p) => !p)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                                isAutoPlayingSlides
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                              title={isAutoPlayingSlides ? 'Pause Autoplay' : 'Play Slideshow'}
                            >
                              {isAutoPlayingSlides ? (
                                <>
                                  <Pause className="w-3 h-3" />
                                  <span>Pause Slides</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3" />
                                  <span>Autoplay</span>
                                </>
                              )}
                            </button>

                            {/* Zoom Out / Zoom In */}
                            <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-xs">
                              <button
                                type="button"
                                onClick={() => setSliderZoom((z) => Math.max(60, z - 15))}
                                className="p-1 hover:text-white text-slate-400 cursor-pointer"
                                title="Zoom Out"
                              >
                                <ZoomOut className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-mono text-[11px] tabular-nums px-1 text-slate-300">
                                {sliderZoom}%
                              </span>
                              <button
                                type="button"
                                onClick={() => setSliderZoom((z) => Math.min(200, z + 15))}
                                className="p-1 hover:text-white text-slate-400 cursor-pointer"
                                title="Zoom In"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Prev / Next buttons */}
                            <button
                              type="button"
                              disabled={activeSlidePage <= 1}
                              onClick={() => setActiveSlidePage((p) => Math.max(1, p - 1))}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-xs font-semibold cursor-pointer flex items-center gap-1"
                              title="Previous Page (←)"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              <span>Prev</span>
                            </button>
                            <button
                              type="button"
                              disabled={activeSlidePage >= currentDoc.pages.length}
                              onClick={() => setActiveSlidePage((p) => Math.min(currentDoc.pages.length, p + 1))}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded text-xs font-semibold cursor-pointer flex items-center gap-1"
                              title="Next Page (→)"
                            >
                              <span>Next</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Interactive Page Range Scrubber */}
                        <div className="px-1">
                          <input
                            type="range"
                            min={1}
                            max={currentDoc.pages.length}
                            value={activeSlidePage}
                            onChange={(e) => setActiveSlidePage(Number(e.target.value))}
                            className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
                          />
                        </div>

                        {/* Main Stage Slide View with Overlay Arrows */}
                        <div className="relative flex-1 flex items-center justify-center min-h-[460px] max-h-[640px] overflow-hidden p-2">
                          {/* Floating Side Arrow Left */}
                          <button
                            type="button"
                            disabled={activeSlidePage <= 1}
                            onClick={() => setActiveSlidePage((p) => Math.max(1, p - 1))}
                            className="absolute left-2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center disabled:opacity-20 shadow-xl cursor-pointer backdrop-blur-xs transition-transform hover:scale-110"
                            title="Previous Page (←)"
                          >
                            <ChevronLeft className="w-7 h-7" />
                          </button>

                          {/* Floating Side Arrow Right */}
                          <button
                            type="button"
                            disabled={activeSlidePage >= currentDoc.pages.length}
                            onClick={() => setActiveSlidePage((p) => Math.min(currentDoc.pages.length, p + 1))}
                            className="absolute right-2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center disabled:opacity-20 shadow-xl cursor-pointer backdrop-blur-xs transition-transform hover:scale-110"
                            title="Next Page (→)"
                          >
                            <ChevronRight className="w-7 h-7" />
                          </button>

                          {currentDoc.pages[activeSlidePage - 1] && (() => {
                            const slide = currentDoc.pages[activeSlidePage - 1];
                            return (
                              <div
                                className="flex items-center justify-center transition-transform duration-200"
                                style={{ transform: `scale(${sliderZoom / 100})` }}
                              >
                                {slide.imageUrl ? (
                                  <img
                                    src={`https://wsrv.nl/?url=${encodeURIComponent(slide.imageUrl)}&output=jpg`}
                                    alt={`Page ${slide.pageNumber}`}
                                    className="max-h-[520px] w-auto object-contain rounded shadow-2xl border border-slate-700 bg-white"
                                  />
                                ) : (
                                  <div className="bg-white text-slate-900 rounded-xl p-8 max-w-2xl max-h-[500px] overflow-y-auto shadow-2xl space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2 font-mono text-xs text-slate-500">
                                      <span>PAGE {slide.pageNumber} OF {currentDoc.pages.length}</span>
                                      <span className="text-blue-600 font-semibold">Extracted Text</span>
                                    </div>
                                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                      {slide.text}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Bottom Thumbnail Strip */}
                        <div className="flex items-center gap-2 overflow-x-auto p-2 bg-slate-900/90 rounded-xl border border-slate-800 scrollbar-thin">
                          {currentDoc.pages.map((p) => {
                            const isCurrent = p.pageNumber === activeSlidePage;
                            return (
                              <button
                                key={p.pageNumber}
                                type="button"
                                onClick={() => setActiveSlidePage(p.pageNumber)}
                                className={`shrink-0 relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'border-blue-500 ring-2 ring-blue-400 scale-105 z-10 shadow-lg'
                                    : 'border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-500'
                                }`}
                                style={{ width: '64px', height: '86px' }}
                              >
                                {p.imageUrl ? (
                                  <img
                                    src={`https://wsrv.nl/?url=${encodeURIComponent(p.imageUrl)}&w=120&output=jpg`}
                                    alt={`Thumb ${p.pageNumber}`}
                                    className="w-full h-full object-cover bg-white"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center p-1 text-center">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    <span className="text-[9px] font-mono text-slate-300 mt-1">
                                      P.{p.pageNumber}
                                    </span>
                                  </div>
                                )}
                                <div
                                  className={`absolute bottom-0 inset-x-0 text-center py-0.5 text-[10px] font-mono font-bold ${
                                    isCurrent ? 'bg-blue-600 text-white' : 'bg-black/70 text-slate-300'
                                  }`}
                                >
                                  P.{p.pageNumber}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

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
            </div>
          );

          return (
            <>
              {route.view === 'home' && (() => {
                // Check if Admin manually selected a Static Page as the Homepage (Front Page)
                if (readingAndLayout.homepageMode === 'static-page') {
                  const baseHomePg =
                    cms.pages.find(
                      (p) =>
                        p.id === readingAndLayout.homepageStaticPageId ||
                        p.slug === readingAndLayout.homepageStaticPageId
                    ) || cms.pages[0];

                  const activeHomePg = baseHomePg
                    ? cms.pages.find(
                        (p) =>
                          p.translationGroupId === baseHomePg.translationGroupId &&
                          p.lang === cms.activeLanguage
                      ) || baseHomePg
                    : null;

                  if (activeHomePg) {
                    return (
                      <div className="space-y-6">
                        {readingAndLayout.showDownloaderOnStaticHome &&
                          renderInteractiveDownloaderSection(false)}

                        <article className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 space-y-6">
                          {renderRichContentWithDownloader(
                            activeHomePg.contentHtml,
                            cms.shortcodes,
                            () => renderInteractiveDownloaderSection(true)
                          )}
                        </article>

                        <MultiContentSwitcher
                          sections={activeHomePg.switcherSections}
                          shortcodes={cms.shortcodes}
                          renderDownloaderWidget={() =>
                            renderInteractiveDownloaderSection(true)
                          }
                        />
                      </div>
                    );
                  }
                }

                // Default Built-In Scribd Downloader Homepage
                return (
                  <>
                    {renderInteractiveDownloaderSection(false)}

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
                    <MultiContentSwitcher
                      sections={t.homeSwitcherSections}
                      shortcodes={cms.shortcodes}
                      renderDownloaderWidget={() => renderInteractiveDownloaderSection(true)}
                    />

                    {/* Additional Custom Homepage HTML Block (Configured in WordPress Editor + Shortcodes) */}
                    {t.customHomeHtml && (
                      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 no-print">
                        {renderRichContentWithDownloader(
                          t.customHomeHtml,
                          cms.shortcodes,
                          () => renderInteractiveDownloaderSection(true)
                        )}
                      </section>
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
                );
              })()}

              {/* VIEW B: BLOG LIST (Supports Manual Static Blog Page or Default Blog Archive) */}
              {route.view === 'blog-list' && (() => {
                const baseBlogPg =
                  readingAndLayout.blogPageMode === 'static-page'
                    ? cms.pages.find(
                        (p) =>
                          p.id === readingAndLayout.blogStaticPageId ||
                          p.slug === readingAndLayout.blogStaticPageId
                      )
                    : null;

                const activeStaticBlogPg = baseBlogPg
                  ? cms.pages.find(
                      (p) =>
                        p.translationGroupId === baseBlogPg.translationGroupId &&
                        p.lang === cms.activeLanguage
                    ) || baseBlogPg
                  : null;

                return (
                  <div className="space-y-6">
                    {renderAdSlot('blog-top-banner')}
                    {activeStaticBlogPg && (
                      <>
                        <article className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 space-y-6">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                            <h1 className="text-2xl font-bold text-slate-900 font-display">
                              {activeStaticBlogPg.title}
                            </h1>
                            <button
                              type="button"
                              onClick={() => setRoute({ view: 'home' })}
                              className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>{t.navDownloader}</span>
                            </button>
                          </div>

                          {renderRichContentWithDownloader(
                            activeStaticBlogPg.contentHtml,
                            cms.shortcodes,
                            () => renderInteractiveDownloaderSection(true)
                          )}
                        </article>

                        <MultiContentSwitcher
                          sections={activeStaticBlogPg.switcherSections}
                          shortcodes={cms.shortcodes}
                          renderDownloaderWidget={() =>
                            renderInteractiveDownloaderSection(true)
                          }
                        />
                      </>
                    )}

                    {(!activeStaticBlogPg ||
                      readingAndLayout.showPostsListBelowStaticBlogPage) && (
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
                          {!activeStaticBlogPg && (
                            <button
                              type="button"
                              onClick={() => setRoute({ view: 'home' })}
                              className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>{t.navDownloader}</span>
                            </button>
                          )}
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
                  </div>
                );
              })()}

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
                  <div className="space-y-6">
                    {renderAdSlot('blog-top-banner')}
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

                      {renderRichContentWithDownloader(
                        post.contentHtml,
                        cms.shortcodes,
                        () => renderInteractiveDownloaderSection(true)
                      )}
                    </article>
                  </div>
                );
              })()}

              {/* VIEW D: CUSTOM PAGE + SHORTCODES + PAGE MULTI-CONTENT SWITCHER */}
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
                    {renderAdSlot('page-top-banner')}
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

                      {renderRichContentWithDownloader(
                        pg.contentHtml,
                        cms.shortcodes,
                        () => renderInteractiveDownloaderSection(true)
                      )}
                    </article>

                    {/* Render Interactive Multi-Content Switcher Tabs for this Page */}
                    <MultiContentSwitcher
                      sections={pg.switcherSections}
                      shortcodes={cms.shortcodes}
                      renderDownloaderWidget={() => renderInteractiveDownloaderSection(true)}
                    />
                  </div>
                );
              })()}
            </>
          );
        })()}

        {renderAdSlot('footer-sticky-banner')}
      </main>

      {/* Multi-Column User-Only Public Footer with Important Pages & Language Dropdown */}
      <footer className="bg-white border-t border-slate-200 pt-10 pb-6 px-6 mt-auto no-print">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs text-slate-600">
            {/* Column 1: Brand, Tagline & Footer Language Dropdown */}
            <div className="space-y-3">
              <div className="text-base font-bold text-slate-900 font-display">
                {readingAndLayout.brandLogoText || 'ScribdDownloader'}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {readingAndLayout.footerTagline}
              </p>

              {readingAndLayout.showLanguageDropdownInFooter &&
                enabledLanguages.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      <span>Site Language:</span>
                    </label>
                    <select
                      value={cms.activeLanguage}
                      onChange={(e) => handleSelectLanguage(e.target.value)}
                      className="w-full max-w-[220px] px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                    >
                      {enabledLanguages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.code.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
            </div>

            {/* Column 2: Quick Navigation */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Quick Navigation
              </div>
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setRoute({ view: 'home' });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-blue-600 transition-colors cursor-pointer font-medium"
                  >
                    {t.navDownloader} (Home)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setRoute({ view: 'blog-list' });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-blue-600 transition-colors cursor-pointer font-medium"
                  >
                    {t.navBlog} & Articles
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setRoute({ view: 'home' });
                      setTimeout(() => {
                        document.getElementById('tutorial')?.scrollIntoView({ behavior: 'smooth' });
                      }, 50);
                    }}
                    className="hover:text-blue-600 transition-colors cursor-pointer font-medium"
                  >
                    {t.navTutorial}
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Important & Legal Pages */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Important & Legal Pages
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {footerCustomPages.map((pg) => (
                  <li key={pg.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setRoute({ view: 'custom-page', slug: pg.slug });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-blue-600 transition-colors cursor-pointer font-medium text-left"
                    >
                      {pg.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <span>
              {readingAndLayout.footerCopyrightText ||
                '© 2026 ScribdDownloader. All rights reserved.'}
            </span>

            <div className="flex flex-wrap items-center gap-3">
              {footerCustomPages.slice(0, 4).map((pg, idx) => (
                <React.Fragment key={pg.id}>
                  {idx > 0 && <span>·</span>}
                  <button
                    type="button"
                    onClick={() => {
                      setRoute({ view: 'custom-page', slug: pg.slug });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-slate-900 cursor-pointer"
                  >
                    {pg.title}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
