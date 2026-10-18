export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  isDefault: boolean;
  enabled: boolean;
  regions?: string[];
}

export interface ContentSwitcherSectionItem {
  id: string;
  tabLabel: string;
  badgeText?: string;
  title: string;
  contentHtml: string;
}

export interface UIStringTranslations {
  heroTitle: string;
  heroSubtitle: string;
  inputPlaceholder: string;
  fetchBtn: string;
  fetchingBtn: string;
  downloadPdfBtn: string;
  downloadingBtn: string;
  tutorialHeading: string;
  tutorialSubheading: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  navDownloader: string;
  navBlog: string;
  navTutorial: string;
  navAdmin: string;
  customHomeHtml: string;
  homeSwitcherSections: ContentSwitcherSectionItem[];
}

export interface AdSlotConfig {
  id: string;
  name: string;
  locationDescription: string;
  dimensions: string;
  enabled: boolean;
  htmlCode: string;
  placementZone?:
    | 'header-leaderboard'
    | 'below-downloader-banner'
    | 'above-viewer-banner'
    | 'in-article-tutorial'
    | 'blog-top-banner'
    | 'page-top-banner'
    | 'footer-sticky-banner'
    | 'custom-shortcode';
}

export interface YoastItemSeoFields {
  focusKeyphrase?: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  robotsIndex?: 'index' | 'noindex';
  robotsFollow?: 'follow' | 'nofollow';
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  schemaPageType?: 'WebPage' | 'Article' | 'FAQPage' | 'AboutPage' | 'ContactPage' | 'WebApplication';
  isCornerstone?: boolean;
}

export interface YoastSeoCheckResult {
  id: string;
  label: string;
  status: 'good' | 'ok' | 'bad';
  detail: string;
}

export interface YoastSeoAnalysis {
  overallScore: 'good' | 'ok' | 'bad';
  scorePercentage: number;
  readabilityScore: 'good' | 'ok' | 'bad';
  checks: YoastSeoCheckResult[];
  readabilityChecks: YoastSeoCheckResult[];
}

export function computeYoastSeoAnalysis(
  title: string,
  slug: string,
  contentHtml: string,
  yoast?: YoastItemSeoFields
): YoastSeoAnalysis {
  const keyword = (yoast?.focusKeyphrase || '').trim().toLowerCase();
  const effectiveTitle = (yoast?.seoTitle || title || '').trim();
  const effectiveDesc = (yoast?.seoDescription || '').trim();
  const plainText = (contentHtml || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = plainText ? plainText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  const checks: YoastSeoCheckResult[] = [];

  // 1. Focus Keyphrase existence
  if (!keyword) {
    checks.push({
      id: 'focus-keyword-set',
      label: 'Focus Keyphrase',
      status: 'bad',
      detail: 'No focus keyphrase was set. Setting a keyphrase helps optimize search rankings.'
    });
  } else {
    checks.push({
      id: 'focus-keyword-set',
      label: 'Focus Keyphrase',
      status: 'good',
      detail: `Focus keyphrase is set to "${keyword}".`
    });

    // 2. Keyphrase in SEO Title
    if (effectiveTitle.toLowerCase().includes(keyword)) {
      checks.push({
        id: 'keyword-in-title',
        label: 'Keyphrase in SEO Title',
        status: 'good',
        detail: 'The focus keyphrase appears in the SEO title.'
      });
    } else {
      checks.push({
        id: 'keyword-in-title',
        label: 'Keyphrase in SEO Title',
        status: 'bad',
        detail: 'The focus keyphrase does not appear in the SEO title.'
      });
    }

    // 3. Keyphrase in Meta Description
    if (effectiveDesc.toLowerCase().includes(keyword)) {
      checks.push({
        id: 'keyword-in-desc',
        label: 'Keyphrase in Meta Description',
        status: 'good',
        detail: 'The meta description contains the focus keyphrase.'
      });
    } else {
      checks.push({
        id: 'keyword-in-desc',
        label: 'Keyphrase in Meta Description',
        status: 'ok',
        detail: 'The meta description does not contain the keyphrase. Consider including it to boost click-through rate.'
      });
    }

    // 4. Keyphrase in URL Slug
    const cleanSlug = (slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanKey = keyword.replace(/[^a-z0-9]/g, '');
    if (cleanKey && cleanSlug.includes(cleanKey)) {
      checks.push({
        id: 'keyword-in-slug',
        label: 'Keyphrase in Slug',
        status: 'good',
        detail: 'Keyphrase appears in the URL slug.'
      });
    } else {
      checks.push({
        id: 'keyword-in-slug',
        label: 'Keyphrase in Slug',
        status: 'ok',
        detail: 'Keyphrase is not in the URL slug.'
      });
    }

    // 5. Keyphrase Density in Content
    const keywordMatches = plainText
      ? (plainText.toLowerCase().match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
      : 0;
    const density = wordCount > 0 ? (keywordMatches / wordCount) * 100 : 0;
    if (keywordMatches >= 2 && density >= 0.5 && density <= 3.5) {
      checks.push({
        id: 'keyword-density',
        label: 'Keyphrase Density',
        status: 'good',
        detail: `The focus keyphrase was found ${keywordMatches} times (${density.toFixed(1)}% density). Great balance!`
      });
    } else if (keywordMatches === 1 || density < 0.5) {
      checks.push({
        id: 'keyword-density',
        label: 'Keyphrase Density',
        status: 'ok',
        detail: `The focus keyphrase was found ${keywordMatches} time(s). Try using it a bit more often in the content.`
      });
    } else {
      checks.push({
        id: 'keyword-density',
        label: 'Keyphrase Density',
        status: 'bad',
        detail: 'The focus keyphrase was not found in the text.'
      });
    }
  }

  // 6. SEO Title Length (optimal: 30 - 65 chars)
  const titleLen = effectiveTitle.length;
  if (titleLen >= 30 && titleLen <= 65) {
    checks.push({
      id: 'title-width',
      label: 'SEO Title Width',
      status: 'good',
      detail: `SEO title is ${titleLen} characters (optimal range: 30–65 characters).`
    });
  } else if (titleLen > 65) {
    checks.push({
      id: 'title-width',
      label: 'SEO Title Width',
      status: 'ok',
      detail: `SEO title is ${titleLen} characters. It may be truncated in search results.`
    });
  } else {
    checks.push({
      id: 'title-width',
      label: 'SEO Title Width',
      status: 'bad',
      detail: `SEO title is ${titleLen} characters. It is too short for search snippet visibility.`
    });
  }

  // 7. Meta Description Length (optimal: 120 - 160 chars)
  const descLen = effectiveDesc.length;
  if (descLen >= 120 && descLen <= 160) {
    checks.push({
      id: 'desc-length',
      label: 'Meta Description Length',
      status: 'good',
      detail: `Meta description is ${descLen} characters (optimal range: 120–160 characters).`
    });
  } else if (descLen > 160) {
    checks.push({
      id: 'desc-length',
      label: 'Meta Description Length',
      status: 'ok',
      detail: `Meta description is ${descLen} characters. Snippets over 160 characters may be truncated.`
    });
  } else if (descLen > 0) {
    checks.push({
      id: 'desc-length',
      label: 'Meta Description Length',
      status: 'ok',
      detail: `Meta description is ${descLen} characters. Recommended length is between 120 and 160 characters.`
    });
  } else {
    checks.push({
      id: 'desc-length',
      label: 'Meta Description Length',
      status: 'bad',
      detail: 'No meta description has been specified. Search engines will display copy from the page instead.'
    });
  }

  // 8. Text Length
  if (wordCount >= 300) {
    checks.push({
      id: 'text-length',
      label: 'Text Length',
      status: 'good',
      detail: `The text contains ${wordCount} words, which is above the recommended minimum of 300 words.`
    });
  } else if (wordCount >= 150) {
    checks.push({
      id: 'text-length',
      label: 'Text Length',
      status: 'ok',
      detail: `The text contains ${wordCount} words. Consider adding more valuable content to reach 300+ words.`
    });
  } else {
    checks.push({
      id: 'text-length',
      label: 'Text Length',
      status: 'bad',
      detail: `The text contains ${wordCount} words. This is below the minimum recommended of 300 words.`
    });
  }

  // Readability Checks
  const readabilityChecks: YoastSeoCheckResult[] = [];
  const sentences = plainText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0;

  if (avgWordsPerSentence <= 20) {
    readabilityChecks.push({
      id: 'sentence-length',
      label: 'Sentence Length',
      status: 'good',
      detail: `Average sentence length is ${avgWordsPerSentence.toFixed(1)} words (optimal: 20 words or fewer).`
    });
  } else {
    readabilityChecks.push({
      id: 'sentence-length',
      label: 'Sentence Length',
      status: 'ok',
      detail: `Average sentence length is ${avgWordsPerSentence.toFixed(1)} words. Try shortening some sentences.`
    });
  }

  // Subheadings check
  const hasHeadings = /<h[2-4][^>]*>/i.test(contentHtml || '');
  if (hasHeadings || wordCount < 300) {
    readabilityChecks.push({
      id: 'subheading-distribution',
      label: 'Subheading Distribution',
      status: 'good',
      detail: 'Your content uses subheadings (H2, H3, H4) to structure the text nicely.'
    });
  } else {
    readabilityChecks.push({
      id: 'subheading-distribution',
      label: 'Subheading Distribution',
      status: 'ok',
      detail: 'Consider adding subheadings (H2, H3) to break up longer sections of text.'
    });
  }

  // Paragraph length check
  const paragraphs = (contentHtml || '').split(/<\/p>/i).filter((p) => p.trim().length > 0);
  readabilityChecks.push({
    id: 'paragraph-length',
    label: 'Paragraph Length',
    status: paragraphs.length >= 2 || wordCount < 200 ? 'good' : 'ok',
    detail: 'Paragraphs are well spaced and readable on mobile screens.'
  });

  const goodCount = checks.filter((c) => c.status === 'good').length;
  const okCount = checks.filter((c) => c.status === 'ok').length;
  const total = checks.length;
  const scorePercentage = total > 0 ? Math.round(((goodCount * 1 + okCount * 0.5) / total) * 100) : 0;

  let overallScore: 'good' | 'ok' | 'bad' = 'bad';
  if (scorePercentage >= 75) overallScore = 'good';
  else if (scorePercentage >= 50) overallScore = 'ok';

  const readGood = readabilityChecks.filter((c) => c.status === 'good').length;
  const readabilityScore: 'good' | 'ok' | 'bad' =
    readGood >= 2 ? 'good' : readGood === 1 ? 'ok' : 'bad';

  return {
    overallScore,
    scorePercentage,
    readabilityScore,
    checks,
    readabilityChecks
  };
}

export interface BlogPostItem extends YoastItemSeoFields {
  id: string;
  slug: string;
  lang: string;
  translationGroupId: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  switcherSections?: ContentSwitcherSectionItem[];
  author: string;
  publishedAt: string;
  status: 'published' | 'draft';
}

export interface CustomPageItem extends YoastItemSeoFields {
  id: string;
  slug: string;
  lang: string;
  translationGroupId: string;
  title: string;
  contentHtml: string;
  switcherSections: ContentSwitcherSectionItem[];
  showInHeader: boolean;
  showInFooter: boolean;
  status: 'published' | 'draft';
}

export interface SeoLanguageConfig {
  siteTitle: string;
  metaDescription: string;
  metaKeywords: string;
  focusKeyphrase?: string;
  titleSeparator?: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterCardType?: 'summary_large_image' | 'summary';
  canonicalUrl: string;
  robotsMeta: string;
  schemaPageType?: 'WebApplication' | 'WebPage' | 'FAQPage';
  schemaJsonLd: string;
  customHeadHtml: string;
  isCornerstone?: boolean;
}

export interface ShortcodeItem {
  id: string;
  tag: string;
  name: string;
  description: string;
  htmlCode: string;
  enabled: boolean;
  updatedAt: string;
}

export interface SiteReadingAndLayoutSettings {
  homepageMode: 'default-downloader' | 'static-page';
  homepageStaticPageId: string;
  showDownloaderOnStaticHome: boolean;
  blogPageMode: 'default-blog' | 'static-page';
  blogStaticPageId: string;
  showPostsListBelowStaticBlogPage: boolean;
  showLanguageDropdownInHeader: boolean;
  showImportantPagesDropdownInHeader: boolean;
  showLanguageDropdownInFooter: boolean;
  autoDetectBrowserLanguage: boolean;
  brandTopTitle: string;
  brandBottomTitle: string;
  showContactButtonInHeader: boolean;
  contactButtonText: string;
  contactButtonPageSlug: string;
  brandLogoText: string;
  footerTagline: string;
  footerCopyrightText: string;
}

export interface CmsStoreState {
  activeLanguage: string;
  languages: LanguageConfig[];
  translations: Record<string, UIStringTranslations>;
  ads: AdSlotConfig[];
  blogPosts: BlogPostItem[];
  pages: CustomPageItem[];
  shortcodes: ShortcodeItem[];
  seo: Record<string, SeoLanguageConfig>;
  readingAndLayout: SiteReadingAndLayoutSettings;
  seededV4?: boolean;
}

export const DEFAULT_READING_AND_LAYOUT: SiteReadingAndLayoutSettings = {
  homepageMode: 'default-downloader',
  homepageStaticPageId: 'page-custom-home-en',
  showDownloaderOnStaticHome: false,
  blogPageMode: 'default-blog',
  blogStaticPageId: 'page-faq-en',
  showPostsListBelowStaticBlogPage: true,
  showLanguageDropdownInHeader: true,
  showImportantPagesDropdownInHeader: true,
  showLanguageDropdownInFooter: true,
  autoDetectBrowserLanguage: true,
  brandTopTitle: 'Scribd',
  brandBottomTitle: 'Downloader',
  showContactButtonInHeader: true,
  contactButtonText: 'Contact Us',
  contactButtonPageSlug: 'contact-us',
  brandLogoText: 'ScribdDownloader',
  footerTagline:
    'Free online Scribd PDF downloader & full-page document viewer powered by 24x parallel extraction.',
  footerCopyrightText: '© 2026 ScribdDownloader. All rights reserved.'
};

export const WORLD_LANGUAGE_PRESETS: LanguageConfig[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr', isDefault: false, enabled: true, regions: ['US', 'GB', 'CA', 'AU', 'NZ'] },
  { code: 'ur', name: 'Urdu / Roman Urdu', nativeName: 'اردو / Roman', flag: '🇵🇰', dir: 'ltr', isDefault: false, enabled: true, regions: ['PK'] },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr', isDefault: false, enabled: true, regions: ['IN'] },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr', isDefault: false, enabled: true, regions: ['ES', 'MX', 'AR', 'CO', 'CL', 'PE'] },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl', isDefault: false, enabled: true, regions: ['SA', 'AE', 'EG', 'QA', 'KW', 'MA'] },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', dir: 'ltr', isDefault: false, enabled: true, regions: ['BR', 'PT'] },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr', isDefault: false, enabled: true, regions: ['FR', 'BE', 'CH', 'SN'] },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr', isDefault: false, enabled: true, regions: ['ID'] },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', dir: 'ltr', isDefault: false, enabled: true, regions: ['TR'] },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr', isDefault: false, enabled: true, regions: ['DE', 'AT'] },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', dir: 'ltr', isDefault: false, enabled: true, regions: ['BD'] },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr', isDefault: false, enabled: true, regions: ['RU', 'KZ'] },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', dir: 'ltr', isDefault: false, enabled: true, regions: ['CN', 'TW', 'HK', 'SG'] },
  { code: 'fa', name: 'Persian / Farsi', nativeName: 'فارسی', flag: '🇮🇷', dir: 'rtl', isDefault: false, enabled: true, regions: ['IR', 'AF'] },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', dir: 'ltr', isDefault: false, enabled: true, regions: ['IT'] },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', dir: 'ltr', isDefault: false, enabled: true, regions: ['MY'] }
];

const TIMEZONE_TO_REGION_MAP: Record<string, { region: string; langCode: string }> = {
  'Asia/Karachi': { region: 'PK', langCode: 'ur' },
  'Asia/Kolkata': { region: 'IN', langCode: 'hi' },
  'Asia/Calcutta': { region: 'IN', langCode: 'hi' },
  'Asia/Dhaka': { region: 'BD', langCode: 'bn' },
  'Asia/Riyadh': { region: 'SA', langCode: 'ar' },
  'Asia/Dubai': { region: 'AE', langCode: 'ar' },
  'Asia/Qatar': { region: 'QA', langCode: 'ar' },
  'Asia/Kuwait': { region: 'KW', langCode: 'ar' },
  'Africa/Cairo': { region: 'EG', langCode: 'ar' },
  'Asia/Tehran': { region: 'IR', langCode: 'fa' },
  'Asia/Jakarta': { region: 'ID', langCode: 'id' },
  'Asia/Kuala_Lumpur': { region: 'MY', langCode: 'ms' },
  'Europe/Istanbul': { region: 'TR', langCode: 'tr' },
  'Europe/Madrid': { region: 'ES', langCode: 'es' },
  'America/Mexico_City': { region: 'MX', langCode: 'es' },
  'America/Bogota': { region: 'CO', langCode: 'es' },
  'America/Argentina/Buenos_Aires': { region: 'AR', langCode: 'es' },
  'America/Sao_Paulo': { region: 'BR', langCode: 'pt' },
  'Europe/Lisbon': { region: 'PT', langCode: 'pt' },
  'Europe/Paris': { region: 'FR', langCode: 'fr' },
  'Europe/Berlin': { region: 'DE', langCode: 'de' },
  'Europe/Rome': { region: 'IT', langCode: 'it' },
  'Europe/Moscow': { region: 'RU', langCode: 'ru' },
  'Asia/Shanghai': { region: 'CN', langCode: 'zh' }
};

export const USER_LANG_OVERRIDE_KEY = 'scribddownloader_user_lang_override_v1';

/**
 * Automatically detects the user's browser language and geographical region (via navigator.languages + timezone)
 * and matches it against the languages currently added & enabled in the Admin Panel.
 */
export function detectBrowserAndRegionLanguage(
  languages: LanguageConfig[],
  preferRegionOverGenericEnglish = true
): {
  matchedCode: string;
  browserLocale: string;
  detectedRegion: string;
  matchSource: 'browser-lang' | 'region-timezone' | 'locale-region' | 'default';
} {
  const enabled = languages.filter((l) => l.enabled);
  const fallbackDefault =
    enabled.find((l) => l.isDefault)?.code || enabled[0]?.code || 'en';

  if (typeof window === 'undefined' || enabled.length === 0) {
    return {
      matchedCode: fallbackDefault,
      browserLocale: 'en-US',
      detectedRegion: 'US',
      matchSource: 'default'
    };
  }

  const browserLocales =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language || 'en-US'];

  const primaryLocale = browserLocales[0] || 'en-US';
  const localeParts = primaryLocale.replace('_', '-').split('-');
  const primaryLangSubtag = (localeParts[0] || 'en').toLowerCase();
  let detectedRegion = (localeParts[1] || '').toUpperCase();

  let tzName = '';
  try {
    tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    tzName = '';
  }

  const tzInfo = TIMEZONE_TO_REGION_MAP[tzName];
  if (tzInfo && (!detectedRegion || detectedRegion === 'US' || detectedRegion === 'GB')) {
    detectedRegion = tzInfo.region;
  }

  // 1. If primary browser language is specific (not generic 'en') and is enabled in Admin Panel
  if (primaryLangSubtag !== 'en') {
    const directMatch = enabled.find((l) => l.code.toLowerCase() === primaryLangSubtag);
    if (directMatch) {
      return {
        matchedCode: directMatch.code,
        browserLocale: primaryLocale,
        detectedRegion: detectedRegion || 'GLOBAL',
        matchSource: 'browser-lang'
      };
    }
  }

  // 2. Check if any secondary browser language in navigator.languages is a non-English enabled language
  for (const loc of browserLocales) {
    const sub = (loc.split('-')[0] || '').toLowerCase();
    if (sub && sub !== 'en') {
      const found = enabled.find((l) => l.code.toLowerCase() === sub);
      if (found) {
        return {
          matchedCode: found.code,
          browserLocale: loc,
          detectedRegion: detectedRegion || 'GLOBAL',
          matchSource: 'browser-lang'
        };
      }
    }
  }

  // 3. Check if locale region (e.g. en-PK, en-IN, en-SA) or Timezone Region matches an enabled regional language
  if (preferRegionOverGenericEnglish && detectedRegion) {
    const regionLangMatch = enabled.find(
      (l) =>
        l.code !== 'en' &&
        Array.isArray(l.regions) &&
        l.regions.map((r) => r.toUpperCase()).includes(detectedRegion)
    );
    if (regionLangMatch) {
      return {
        matchedCode: regionLangMatch.code,
        browserLocale: primaryLocale,
        detectedRegion,
        matchSource: 'locale-region'
      };
    }

    if (tzInfo) {
      const tzLangMatch = enabled.find(
        (l) => l.code.toLowerCase() === tzInfo.langCode.toLowerCase()
      );
      if (tzLangMatch) {
        return {
          matchedCode: tzLangMatch.code,
          browserLocale: primaryLocale,
          detectedRegion: tzInfo.region,
          matchSource: 'region-timezone'
        };
      }
    }
  }

  // 4. Check if primary language ('en' or any other) is enabled
  const primaryMatch = enabled.find((l) => l.code.toLowerCase() === primaryLangSubtag);
  if (primaryMatch) {
    return {
      matchedCode: primaryMatch.code,
      browserLocale: primaryLocale,
      detectedRegion: detectedRegion || 'US',
      matchSource: 'browser-lang'
    };
  }

  return {
    matchedCode: fallbackDefault,
    browserLocale: primaryLocale,
    detectedRegion: detectedRegion || 'US',
    matchSource: 'default'
  };
}

export const CMS_STORAGE_KEY = 'scribddownloader_cms_v3';

export const DEFAULT_SHORTCODES: ShortcodeItem[] = [
  {
    id: 'sc-scribd-downloader',
    tag: 'scribd_downloader',
    name: 'Live Scribd PDF Downloader Tool (Interactive Widget)',
    description:
      'Embeds the complete interactive Scribd URL Fetcher, Multi-Page Detector, PDF Compiler & Live Document Viewer into any Custom Page, Blog Post, or Tab.',
    enabled: true,
    updatedAt: '2026-10-18',
    htmlCode: `<div data-scribd-downloader-widget="true" style="background:#ffffff;border:2px solid #2563eb;border-radius:14px;padding:24px;margin:20px 0;box-shadow:0 10px 25px -5px rgba(37,99,235,0.12);">
  <div style="text-align:center;max-width:600px;margin:0 auto 16px auto;">
    <span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">[scribd_downloader] · Live Interactive Tool</span>
    <h3 style="margin:0 0 6px 0;font-size:20px;font-weight:800;color:#0f172a;">Scribd Document &amp; PDF Downloader</h3>
    <p style="margin:0;font-size:13px;color:#475569;">Paste any Scribd document URL below to verify all pages (Page 1 to Page N), preview the document, and download the complete multi-page PDF.</p>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;background:#f8fafc;border:1px solid #e2e8f0;padding:14px;border-radius:10px;">
    <input type="text" readonly placeholder="https://www.scribd.com/document/991278283/..." style="flex:1;min-width:220px;padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;font-family:monospace;font-size:12px;background:#fff;color:#334155;" />
    <span style="background:#0f172a;color:#fff;font-size:12px;font-weight:700;padding:10px 18px;border-radius:8px;">⚡ Fetch All Pages</span>
    <span style="background:#2563eb;color:#fff;font-size:12px;font-weight:700;padding:10px 18px;border-radius:8px;">⬇ Download PDF (All Pages)</span>
  </div>
</div>`
  },
  {
    id: 'sc-cta-banner',
    tag: 'custom_cta_banner',
    name: 'High-Conversion Downloader CTA Banner',
    description: 'Dark slate & blue gradient promotional banner with action button.',
    enabled: true,
    updatedAt: '2026-10-18',
    htmlCode: `<div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%);color:#ffffff;padding:28px;border-radius:14px;margin:20px 0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;box-shadow:0 10px 25px -5px rgba(15,23,42,0.25);">
  <div style="max-width:540px;">
    <span style="display:inline-block;background:#2563eb;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">24x Parallel Engine</span>
    <h3 style="margin:0 0 6px 0;font-size:20px;font-weight:800;color:#ffffff;">Unlock &amp; Download Full Scribd PDFs Instantly</h3>
    <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.5;">Paste any document link at the top of the page, verify all pages (Page 1 to Page N), and save the complete original PDF file for offline reading.</p>
  </div>
  <a href="#top" style="background:#10b981;color:#ffffff;font-weight:700;font-size:13px;padding:12px 22px;border-radius:10px;text-decoration:none;white-space:nowrap;">Try Downloader Now ↑</a>
</div>`
  },
  {
    id: 'sc-feature-cards',
    tag: 'feature_cards_grid',
    name: '3-Column Custom Feature Cards Grid',
    description: 'Custom HTML/CSS 3-card feature highlight grid.',
    enabled: true,
    updatedAt: '2026-10-18',
    htmlCode: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:20px 0;">
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
    <div style="font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;margin-bottom:6px;">01 · Full Verification</div>
    <h4 style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0f172a;">All Pages Unlocked</h4>
    <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">Detects every single page number from Page 1 to Page N before compiling your PDF file.</p>
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
    <div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;margin-bottom:6px;">02 · High Resolution</div>
    <h4 style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0f172a;">Original Quality Scans</h4>
    <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">Extracts original raster images and digital text layers so no page is ever blurry or blank.</p>
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
    <div style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;margin-bottom:6px;">03 · Zero IP Blocks</div>
    <h4 style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0f172a;">Multi-Tunnel Edge Relay</h4>
    <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">Automatically routes requests through Google Translate Edge &amp; stealth relays for 100% uptime.</p>
  </div>
</div>`
  },
  {
    id: 'sc-support-box',
    tag: 'custom_notice_box',
    name: 'Custom Highlight Notice / Info Box',
    description: 'Clean emerald notice box for announcements or instructions.',
    enabled: true,
    updatedAt: '2026-10-18',
    htmlCode: `<div style="background:#ecfdf5;border-left:4px solid #10b981;border-radius:8px;padding:16px 20px;margin:16px 0;">
  <div style="font-size:14px;font-weight:700;color:#065f46;margin-bottom:4px;">Pro Tip: Dual PDF Download Modes</div>
  <div style="font-size:12px;color:#047857;line-height:1.5;">You can use both the direct <strong>Download PDF (N Pages)</strong> compiler button or click <strong>Save Full Preview PDF</strong> for native vector PDF export.</div>
</div>`
  }
];

/**
 * Replaces [shortcode_tag] tokens in any HTML string with the corresponding custom HTML design
 * configured in the Admin Panel Shortcodes Builder.
 */
export function renderShortcodesInHtml(html: string, shortcodes?: ShortcodeItem[]): string {
  if (!html) return '';
  const list = shortcodes && shortcodes.length > 0 ? shortcodes : DEFAULT_SHORTCODES;
  const activeMap = new Map<string, string>();
  for (const item of list) {
    if (item.enabled && item.tag.trim()) {
      activeMap.set(item.tag.trim().toLowerCase(), item.htmlCode);
    }
  }
  if (activeMap.size === 0) return html;

  let output = html;
  for (let pass = 0; pass < 2; pass++) {
    // First replace <p>[shortcode_tag]</p> so block elements inside shortcodes don't get trapped inside <p> tags
    output = output.replace(
      /<p[^>]*>\s*\[([a-zA-Z0-9_-]+)\]\s*<\/p>/gi,
      (fullMatch, rawTag: string) => {
        const key = rawTag.toLowerCase();
        return activeMap.has(key) ? activeMap.get(key)! : fullMatch;
      }
    );

    // Then replace inline [shortcode_tag] occurrences
    output = output.replace(/\[([a-zA-Z0-9_-]+)\]/g, (fullMatch, rawTag: string) => {
      const key = rawTag.toLowerCase();
      return activeMap.has(key) ? activeMap.get(key)! : fullMatch;
    });
  }

  return output;
}

const DEFAULT_HOME_SWITCHER_EN: ContentSwitcherSectionItem[] = [
  {
    id: 'tab-features',
    tabLabel: 'Why Use Our Downloader',
    badgeText: 'Core Features',
    title: '100% Original High-Resolution Scribd PDF Extraction',
    contentHtml: `<p>Unlike basic screenshot tools that only capture blurry previews, our engine parses the complete Scribd document manifest (<code class="font-mono">Page 1</code> to <code class="font-mono">Page N</code>) and extracts the original raster scans and text layers in parallel.</p>
<ul>
  <li><strong>Complete Page Number Verification:</strong> Every page number is detected and verified before PDF compilation starts.</li>
  <li><strong>24x Parallel Stream Compiler:</strong> Downloads up to 24 high-resolution page scans simultaneously for maximum speed.</li>
  <li><strong>5-Gateway Anti-IP-Block Relay:</strong> Automatically rotates across 5 global proxy gateways so downloads never fail.</li>
</ul>`
  },
  {
    id: 'tab-faq',
    tabLabel: 'Frequently Asked Questions (FAQ)',
    badgeText: 'Help & FAQ',
    title: 'Common Questions About Downloading Scribd PDFs',
    contentHtml: `<div class="space-y-3">
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-lg">
    <h4 class="font-bold text-slate-900 text-sm">1. Why were some PDFs showing blank on other websites?</h4>
    <p class="text-xs text-slate-600 mt-1">Scribd uses separate cryptographic hashes for JSONP page manifests and JPEG scan images. Our engine inspects each page's JSONP stream in parallel to retrieve the true image hash and validates JPEG/PNG magic bytes so no page is ever blank.</p>
  </div>
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-lg">
    <h4 class="font-bold text-slate-900 text-sm">2. Can I download 100+ page books and presentations?</h4>
    <p class="text-xs text-slate-600 mt-1">Yes! Both the direct 24x Parallel PDF Compiler and the Fullscreen Vector Reader support full-length books, academic papers, and slide decks.</p>
  </div>
</div>`
  },
  {
    id: 'tab-supported',
    tabLabel: 'Supported URL Formats',
    badgeText: 'Compatibility',
    title: 'All Supported Scribd Links & Document Types',
    contentHtml: `<p>You can paste any of the following Scribd URL formats or raw numeric IDs into the downloader box:</p>
<ul>
  <li><code class="font-mono">https://www.scribd.com/document/123456789/Document-Title</code></li>
  <li><code class="font-mono">https://www.scribd.com/doc/123456789/Study-Notes</code></li>
  <li><code class="font-mono">https://www.scribd.com/presentation/123456789/Slide-Deck</code></li>
  <li><code class="font-mono">https://www.scribd.com/embeds/123456789/content</code></li>
  <li>Direct Numeric ID: <code class="font-mono">436350615</code></li>
</ul>`
  }
];

const DEFAULT_HOME_SWITCHER_UR: ContentSwitcherSectionItem[] = [
  {
    id: 'tab-ur-features',
    tabLabel: 'ہمارے ڈاؤنلوڈر کی خصوصیات',
    badgeText: 'Features',
    title: '100% اوریجنل ہائی کوالٹی Scribd PDF ڈاؤنلوڈ',
    contentHtml: `<p>ہمارا سسٹم پہلے ڈاکومنٹ کے تمام صفحات (<code class="font-mono">Page 1</code> سے <code class="font-mono">Page N</code> تک) نمبر کے ساتھ ڈیٹیکٹ کرتا ہے اور پھر اوریجنل امیجز اور ٹیکسٹ کو ملا کر مکمل PDF فائل بناتا ہے تاکہ کوئی بھی صفحہ خالی نہ رہے۔</p>`
  },
  {
    id: 'tab-ur-faq',
    tabLabel: 'عام پوچھے گئے سوالات (FAQ)',
    badgeText: 'سوالات',
    title: 'ڈاؤنلوڈنگ کے متعلق اہم سوالات اور جوابات',
    contentHtml: `<p><strong>سوال: کیا بڑی کتابیں بھی ڈاؤنلوڈ ہو سکتی ہیں؟</strong><br/>جواب: جی ہاں! آپ جتنے مرضی صفحات کی کتاب یا نوٹس بالکل مفت ڈاؤنلوڈ کر سکتے ہیں۔</p>`
  }
];

export const DEFAULT_CMS_STATE: CmsStoreState = {
  activeLanguage: 'en',
  seededV4: true,
  languages: [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      dir: 'ltr',
      isDefault: true,
      enabled: true,
      regions: ['US', 'GB', 'CA', 'AU', 'NZ']
    },
    {
      code: 'ur',
      name: 'Urdu / Roman Urdu',
      nativeName: 'اردو / Roman',
      flag: '🇵🇰',
      dir: 'ltr',
      isDefault: false,
      enabled: true,
      regions: ['PK']
    },
    {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिन्दी',
      flag: '🇮🇳',
      dir: 'ltr',
      isDefault: false,
      enabled: true,
      regions: ['IN']
    },
    {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      flag: '🇪🇸',
      dir: 'ltr',
      isDefault: false,
      enabled: true,
      regions: ['ES', 'MX', 'AR', 'CO', 'CL']
    },
    {
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      flag: '🇸🇦',
      dir: 'rtl',
      isDefault: false,
      enabled: true,
      regions: ['SA', 'AE', 'EG', 'QA', 'KW']
    }
  ],
  translations: {
    en: {
      heroTitle: 'Free Scribd PDF Downloader',
      heroSubtitle:
        'Paste any Scribd document URL below, click Fetch for instant full-page detection, and click Download PDF for high-speed parallel PDF download.',
      inputPlaceholder: 'https://www.scribd.com/document/991278283/2026-Grade-12-Investigation-Term-1',
      fetchBtn: 'Fetch',
      fetchingBtn: 'Fetching Pages...',
      downloadPdfBtn: 'Download PDF',
      downloadingBtn: 'Downloading PDF...',
      tutorialHeading: 'How to Download Scribd PDF Documents (Step-by-Step Tutorial)',
      tutorialSubheading:
        'Follow these 3 easy steps to detect all pages and download the original PDF file at maximum speed:',
      step1Title: 'Copy & Paste Document Link',
      step1Desc:
        'Copy the link of any Scribd document, book, or presentation and paste it into the input box above.',
      step2Title: 'Instant Page Number Detection',
      step2Desc:
        'Click the Fetch button. Our engine races multiple gateways in parallel and detects all page numbers (Page 1 to Page N) in under a second.',
      step3Title: '24x Parallel PDF Download',
      step3Desc:
        'Click the blue Download PDF button to download 24 pages simultaneously and assemble the complete original PDF in seconds.',
      navDownloader: 'Downloader',
      navBlog: 'Blog',
      navTutorial: 'How to Download',
      navAdmin: 'Admin Panel',
      customHomeHtml: '',
      homeSwitcherSections: DEFAULT_HOME_SWITCHER_EN
    },
    ur: {
      heroTitle: 'مفت Scribd PDF ڈاؤنلوڈر (Free Scribd Downloader)',
      heroSubtitle:
        'اپنا Scribd لنک نیچے پیسٹ کریں، تمام صفحات نمبر کے ساتھ لوڈ کرنے کے لیے Fetch پر کلک کریں، اور اوریجنل فائل کے لیے Download PDF دبائیں۔',
      inputPlaceholder: 'https://www.scribd.com/document/991278283/2026-Grade-12-Investigation-Term-1',
      fetchBtn: 'Fetch (صفحات تلاش کریں)',
      fetchingBtn: 'صفحات لوڈ ہو رہے ہیں...',
      downloadPdfBtn: 'Download PDF',
      downloadingBtn: 'ڈاؤنلوڈ ہو رہا ہے...',
      tutorialHeading: 'Scribd سے اوریجنل PDF کیسے ڈاؤنلوڈ کریں؟ (مکمل طریقہ)',
      tutorialSubheading:
        'ان 3 آسان مراحل پر عمل کر کے کسی بھی Scribd ڈاکومنٹ کے تمام صفحات اوریجنل کوالٹی میں ڈاؤنلوڈ کریں:',
      step1Title: 'لنک کاپی اور پیسٹ کریں',
      step1Desc:
        'اپنے مطلوبہ Scribd ڈاکومنٹ یا کتاب کا لنک کاپی کر کے اوپر دیے گئے باکس میں پیسٹ کریں۔',
      step2Title: 'Fetch بٹن پر کلک کریں',
      step2Desc:
        'Fetch بٹن دباتے ہی تمام صفحات (Page 1 سے Page N تک) ایک سیکنڈ میں نمبر کے ساتھ شو ہو جائیں گے۔',
      step3Title: 'Download PDF پر کلک کریں',
      step3Desc:
        'اب نیلے رنگ کے Download PDF بٹن پر کلک کریں، آپ کی مکمل اوریجنل PDF فائل فوراً ڈاؤنلوڈ ہو جائے گی۔',
      navDownloader: 'ڈاؤنلوڈر',
      navBlog: 'بلاگ',
      navTutorial: 'ڈاؤنلوڈ کا طریقہ',
      navAdmin: 'ایڈمن پینل',
      customHomeHtml: '',
      homeSwitcherSections: DEFAULT_HOME_SWITCHER_UR
    },
    hi: {
      heroTitle: 'मुफ़्त Scribd PDF डाउनलोडर',
      heroSubtitle:
        'नीचे कोई भी Scribd दस्तावेज़ लिंक पेस्ट करें, सभी पेज नंबर डिटेक्ट करने के लिए Fetch पर क्लिक करें और ओरिजिनल फाइल के लिए Download PDF दबाएं।',
      inputPlaceholder: 'https://www.scribd.com/document/991278283/2026-Grade-12-Investigation-Term-1',
      fetchBtn: 'Fetch',
      fetchingBtn: 'पेज लोड हो रहे हैं...',
      downloadPdfBtn: 'Download PDF',
      downloadingBtn: 'डाउनलोड हो रहा है...',
      tutorialHeading: 'Scribd PDF दस्तावेज़ कैसे डाउनलोड करें (स्टेप-बाय-स्टेप ट्यूटोरियल)',
      tutorialSubheading:
        'सभी पेजों को डिटेक्ट करने और ओरिजिनल PDF फाइल को तेजी से डाउनलोड करने के लिए इन 3 आसान चरणों का पालन करें:',
      step1Title: 'दस्तावेज़ लिंक कॉपी और पेस्ट करें',
      step1Desc:
        'किसी भी Scribd दस्तावेज़ या पुस्तक का लिंक कॉपी करें और ऊपर दिए गए बॉक्स में पेस्ट करें।',
      step2Title: 'Fetch बटन पर क्लिक करें',
      step2Desc:
        'Fetch बटन पर क्लिक करें। हमारा इंजन 1 सेकंड से भी कम समय में सभी पेज नंबर (Page 1 से Page N) डिटेक्ट कर लेता है।',
      step3Title: 'Download PDF पर क्लिक करें',
      step3Desc:
        'पूरी ओरिजिनल मल्टी-पेज PDF फाइल को तुरंत सेव करने के लिए नीले Download PDF बटन पर क्लिक करें।',
      navDownloader: 'डाउनलोडर',
      navBlog: 'ब्लॉग',
      navTutorial: 'कैसे डाउनलोड करें',
      navAdmin: 'एडमिन पैनल',
      customHomeHtml: '',
      homeSwitcherSections: DEFAULT_HOME_SWITCHER_EN
    },
    es: {
      heroTitle: 'Descargador de PDF de Scribd Gratis',
      heroSubtitle:
        'Pegue cualquier enlace de documento de Scribd a continuación, haga clic en Fetch para detectar todas las páginas al instante y descargue el PDF original.',
      inputPlaceholder: 'https://www.scribd.com/document/991278283/2026-Grade-12-Investigation-Term-1',
      fetchBtn: 'Fetch',
      fetchingBtn: 'Buscando páginas...',
      downloadPdfBtn: 'Download PDF',
      downloadingBtn: 'Descargando PDF...',
      tutorialHeading: 'Cómo Descargar Documentos PDF de Scribd (Tutorial Paso a Paso)',
      tutorialSubheading:
        'Siga estos 3 sencillos pasos para detectar todas las páginas y descargar el archivo PDF original a máxima velocidad:',
      step1Title: 'Copiar y Pegar Enlace de Scribd',
      step1Desc:
        'Copie el enlace de cualquier documento, libro o presentación de Scribd y péguelo en el cuadro de búsqueda superior.',
      step2Title: 'Haga clic en Fetch (Detección Instantánea)',
      step2Desc:
        'Haga clic en el botón Fetch para detectar todos los números de página (Página 1 a Página N) en menos de un segundo.',
      step3Title: 'Haga clic en Download PDF',
      step3Desc:
        'Presione el botón azul Download PDF para ensamblar y guardar el documento completo en alta resolución.',
      navDownloader: 'Descargador',
      navBlog: 'Blog',
      navTutorial: 'Cómo Descargar',
      navAdmin: 'Panel Admin',
      customHomeHtml: '',
      homeSwitcherSections: DEFAULT_HOME_SWITCHER_EN
    },
    ar: {
      heroTitle: 'تحميل ملفات PDF من Scribd مجاناً',
      heroSubtitle:
        'الصق رابط مستند Scribd أدناه، واضغط على Fetch لاكتشاف جميع الصفحات فوراً، ثم اضغط على Download PDF لتحميل الملف الأصلي.',
      inputPlaceholder: 'https://www.scribd.com/document/991278283/2026-Grade-12-Investigation-Term-1',
      fetchBtn: 'Fetch',
      fetchingBtn: 'جاري فحص الصفحات...',
      downloadPdfBtn: 'Download PDF',
      downloadingBtn: 'جاري التحميل...',
      tutorialHeading: 'كيفية تحميل مستندات PDF من Scribd (شرح خطوة بخطوة)',
      tutorialSubheading:
        'اتبع هذه الخطوات الثلاث البسيطة لاكتشاف كافة الصفحات وتحميل ملف PDF الأصلي بأقصى سرعة:',
      step1Title: 'انسخ والصق رابط المستند',
      step1Desc: 'انسخ رابط أي مستند أو كتاب من موقع Scribd والصقه في مربع الإدخال أعلاه.',
      step2Title: 'اضغط على زر Fetch',
      step2Desc: 'سيقوم النظام باكتشاف جميع أرقام الصفحات من الصفحة الأولى وحتى الأخيرة في أقل من ثانية.',
      step3Title: 'اضغط على زر Download PDF',
      step3Desc: 'اضغط على الزر الأزرق لتحميل ملف PDF الأصلي كاملاً بدقة عالية فوراً.',
      navDownloader: 'التحميل',
      navBlog: 'المدونة',
      navTutorial: 'طريقة التحميل',
      navAdmin: 'لوحة التحكم',
      customHomeHtml: '',
      homeSwitcherSections: DEFAULT_HOME_SWITCHER_EN
    }
  },
  ads: [
    {
      id: 'header-leaderboard',
      name: 'Top Header Leaderboard (728×90)',
      locationDescription: 'Displayed above the main Scribd URL input box',
      dimensions: '728×90 / Responsive',
      enabled: false,
      htmlCode: `<div style="background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:8px;padding:16px;text-align:center;font-size:12px;color:#475569;">
  <strong>Advertisement Space (728×90 Top Leaderboard)</strong> — Paste your Google AdSense, Adsterra, or custom HTML banner code in Admin Panel → Ads Manager.
</div>`
    },
    {
      id: 'below-downloader-banner',
      name: 'Below Fetch & Download Buttons (Responsive Banner)',
      locationDescription: 'Displayed directly under the downloader box for maximum CTR',
      dimensions: 'Responsive 970×90 / 300×250',
      enabled: false,
      htmlCode: `<div style="background:#eff6ff;border:1px dashed #93c5fd;border-radius:8px;padding:18px;text-align:center;font-size:12px;color:#1e40af;">
  <strong>High-CTR Ad Placement (Below Downloader Bar)</strong> — Supports <ins class="adsbygoogle"></ins> or custom affiliate HTML.
</div>`
    },
    {
      id: 'above-viewer-banner',
      name: 'Above PDF Viewer Slot',
      locationDescription: 'Displayed right above the unlocked PDF viewer frame',
      dimensions: '728×90',
      enabled: false,
      htmlCode: `<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:14px;text-align:center;font-size:12px;color:#64748b;">
  <strong>Above PDF Viewer Ad Slot</strong> — Configurable via Admin Panel.
</div>`
    },
    {
      id: 'in-article-tutorial',
      name: 'Between Tutorial & Blog Section',
      locationDescription: 'Displayed above the step-by-step tutorial and blog cards',
      dimensions: 'Responsive In-Article',
      enabled: false,
      htmlCode: `<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:16px;text-align:center;font-size:12px;color:#64748b;">
  <strong>In-Article Native Ad Unit</strong> — Configurable via Admin Panel.
</div>`
    },
    {
      id: 'footer-sticky-banner',
      name: 'Footer Ad Slot',
      locationDescription: 'Displayed above the website footer across all pages',
      dimensions: '728×90',
      enabled: false,
      htmlCode: `<div style="background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:8px;padding:14px;text-align:center;font-size:12px;color:#475569;">
  <strong>Footer Banner Ad Placement</strong> — Configurable via Admin Panel.
</div>`
    }
  ],
  blogPosts: [
    {
      id: 'post-en-1',
      slug: 'how-to-download-scribd-documents-free-pdf',
      lang: 'en',
      translationGroupId: 'group-blog-1',
      title: 'How to Download Any Scribd Document as a High-Resolution PDF in 2026',
      excerpt:
        'Complete guide to unlocking full multi-page Scribd documents, academic papers, and scanned books in original PDF resolution.',
      contentHtml: `<p>Many students, researchers, and engineers rely on Scribd for technical manuals, sheet music, and academic monographs. With our <strong>24x Parallel PDF Compiler</strong>, you can fetch all page numbers instantly and export clean offline PDFs.</p>
<h3>Why Full Page Number Detection Matters</h3>
<p>Traditional tools only capture the first few preview pages. By parsing the complete embed manifest and verifying every JSONP page stream, every page from Page 1 to Page N is unlocked before compilation begins.</p>`,
      author: 'Editorial Team',
      publishedAt: '2026-10-15',
      status: 'published',
      seoTitle: 'How to Download Scribd PDF Free — Complete 2026 Guide',
      seoDescription: 'Learn how to fetch all pages and download original high-resolution PDF files from Scribd in seconds.'
    },
    {
      id: 'post-ur-1',
      slug: 'scribd-se-original-pdf-download-karne-ka-tarika',
      lang: 'ur',
      translationGroupId: 'group-blog-1',
      title: 'Scribd سے کوئی بھی کتاب یا ڈاکومنٹ اوریجنل PDF میں مفت کیسے ڈاؤنلوڈ کریں؟',
      excerpt:
        'مکمل گائیڈ: بغیر کسی بلاک کے Scribd کے تمام صفحات نمبر کے ساتھ لوڈ کریں اور ایک کلک میں ہائی کوالٹی PDF محفوظ کریں۔',
      contentHtml: `<p>اکثر طلباء اور ریسرچرز کو Scribd سے نوٹس اور کتابیں ڈاؤنلوڈ کرنے میں مشکل پیش آتی ہے۔ اس ٹول کی مدد سے آپ پہلے <strong>Fetch</strong> بٹن دبا کر تمام صفحات (Page 1 سے آخر تک) چیک کر سکتے ہیں اور پھر <strong>Download PDF</strong> سے پوری فائل سیو کر سکتے ہیں۔</p>`,
      author: 'Editorial Team',
      publishedAt: '2026-10-15',
      status: 'published',
      seoTitle: 'Scribd سے اوریجنل PDF ڈاؤنلوڈ کرنے کا طریقہ',
      seoDescription: 'بغیر کسی رکاوٹ کے Scribd ڈاکومنٹس کو مفت PDF میں ڈاؤنلوڈ کریں۔'
    },
    {
      id: 'post-en-2',
      slug: 'bypass-scribd-ip-blocks-multi-gateway-proxy',
      lang: 'en',
      translationGroupId: 'group-blog-2',
      title: 'Understanding Multi-Gateway Relay Racing for Zero-Block Document Extraction',
      excerpt:
        'How Promise.any parallel gateway racing eliminates server rate limits and speeds up PDF compilation by 10x.',
      contentHtml: `<p>When thousands of users request document assets simultaneously, single-IP servers often encounter rate limits. By racing 5 independent edge gateways simultaneously and caching high-resolution page scans in memory, document extraction completes in milliseconds.</p>`,
      author: 'Systems Architecture',
      publishedAt: '2026-10-16',
      status: 'published',
      seoTitle: 'Zero-Block Multi-Gateway PDF Extraction Architecture',
      seoDescription: 'Technical overview of parallel gateway racing and high-speed PDF assembly.'
    }
  ],
  pages: [
    {
      id: 'page-about-en',
      slug: 'about-us',
      lang: 'en',
      translationGroupId: 'group-page-about',
      title: 'About Us',
      contentHtml: `<h2>Fast, Clean & Accessible Document Archiving</h2>
<p>ScribdDownloader was engineered to provide students, educators, and professionals with an ultra-fast way to view and archive publicly shared documents for offline reading.</p>`,
      switcherSections: [
        {
          id: 'about-tab-1',
          tabLabel: 'Our Mission',
          badgeText: 'Overview',
          title: 'Built for Researchers, Students & Educators',
          contentHtml: `<p>We believe knowledge and study materials should be accessible offline without slow loading screens or broken layouts. Use the tabs above to explore our technical architecture and privacy standards.</p>`
        },
        {
          id: 'about-tab-2',
          tabLabel: '24x Parallel Engine',
          badgeText: 'Technology',
          title: 'How Our High-Speed PDF Compiler Works',
          contentHtml: `<p>Every document request is processed through our parallel JSONP & raster scan verifier, guaranteeing that both scanned image pages and digital typography are preserved in the exported PDF.</p>`
        },
        {
          id: 'about-tab-3',
          tabLabel: 'Contact & Support',
          badgeText: 'Support',
          title: 'Get in Touch With Our Team',
          contentHtml: `<p>Have feedback or need help with a specific document link? Reach out to our support desk anytime and we will gladly assist.</p>`
        }
      ],
      showInHeader: true,
      showInFooter: true,
      status: 'published',
      seoTitle: 'About Us — Free Scribd PDF Downloader',
      seoDescription: 'Learn more about our ultra-fast Scribd document viewer and PDF downloader.'
    },
    {
      id: 'page-contact-en',
      slug: 'contact-us',
      lang: 'en',
      translationGroupId: 'group-page-contact',
      title: 'Contact Us',
      contentHtml: `<h2>Contact Our Support & Technical Team</h2>
<p>Have questions about downloading a document, reporting an issue, or partnering with us? We respond to all inquiries within 24 hours.</p>
<ul>
  <li><strong>General Support:</strong> support@scribddownloader.app</li>
  <li><strong>Technical & API Inquiries:</strong> tech@scribddownloader.app</li>
  <li><strong>Copyright & DMCA Desk:</strong> dmca@scribddownloader.app</li>
</ul>`,
      switcherSections: [],
      showInHeader: true,
      showInFooter: true,
      status: 'published',
      seoTitle: 'Contact Us — ScribdDownloader Support',
      seoDescription: 'Contact our technical support team for help with Scribd PDF downloads.'
    },
    {
      id: 'page-privacy-en',
      slug: 'privacy-policy',
      lang: 'en',
      translationGroupId: 'group-page-privacy',
      title: 'Privacy Policy',
      contentHtml: `<h2>Privacy Policy & Data Protection</h2>
<p>We do not store personal data or copyrighted files on our servers. All document resolution and PDF compilation occurs dynamically in real-time using publicly accessible embed streams.</p>`,
      switcherSections: [
        {
          id: 'priv-tab-1',
          tabLabel: 'Privacy Policy',
          title: 'Zero Personal Data Retention',
          contentHtml: `<p>We do not require user registration, accounts, or personal data to fetch or download documents.</p>`
        },
        {
          id: 'priv-tab-2',
          tabLabel: 'Cookies & Analytics',
          title: 'Minimal Session Preferences',
          contentHtml: `<p>We only use local browser storage to remember your preferred language and interface settings.</p>`
        }
      ],
      showInHeader: true,
      showInFooter: true,
      status: 'published',
      seoTitle: 'Privacy Policy — ScribdDownloader',
      seoDescription: 'Read our privacy policy and zero-data-retention commitment.'
    },
    {
      id: 'page-terms-en',
      slug: 'terms-and-conditions',
      lang: 'en',
      translationGroupId: 'group-page-terms',
      title: 'Terms & Conditions',
      contentHtml: `<h2>Terms of Service & Acceptable Use</h2>
<p>By accessing and using ScribdDownloader, you agree to use this utility strictly for personal, educational, and archival purposes on publicly shared documents.</p>
<ul>
  <li>Users are responsible for complying with local copyright laws regarding downloaded study materials.</li>
  <li>Automated scraping or abuse of our proxy relay nodes is strictly prohibited.</li>
</ul>`,
      switcherSections: [],
      showInHeader: true,
      showInFooter: true,
      status: 'published',
      seoTitle: 'Terms & Conditions — ScribdDownloader',
      seoDescription: 'Terms of service and acceptable use policy for ScribdDownloader.'
    },
    {
      id: 'page-dmca-en',
      slug: 'dmca-disclaimer',
      lang: 'en',
      translationGroupId: 'group-page-dmca',
      title: 'DMCA Disclaimer',
      contentHtml: `<h2>DMCA Copyright Compliance Notice</h2>
<p>ScribdDownloader respects the intellectual property rights of authors and publishers. We do not host, store, or archive any PDF files on our servers. All content is fetched in real-time from publicly accessible URLs provided by the end user.</p>`,
      switcherSections: [],
      showInHeader: true,
      showInFooter: true,
      status: 'published',
      seoTitle: 'DMCA Notice & Copyright Disclaimer — ScribdDownloader',
      seoDescription: 'DMCA compliance and copyright notice for ScribdDownloader.'
    },
    {
      id: 'page-faq-en',
      slug: 'faq-help',
      lang: 'en',
      translationGroupId: 'group-page-faq',
      title: 'FAQ & Help',
      contentHtml: `<h2>Frequently Asked Questions & Troubleshooting</h2>
<p>Find instant answers to common questions about unlocking and downloading full multi-page Scribd PDF documents.</p>
[custom_notice_box]
[feature_cards_grid]`,
      switcherSections: DEFAULT_HOME_SWITCHER_EN,
      showInHeader: true,
      showInFooter: true,
      status: 'published',
      seoTitle: 'FAQ & Help Center — ScribdDownloader',
      seoDescription: 'Frequently asked questions and troubleshooting tips for downloading Scribd PDFs.'
    },
    {
      id: 'page-custom-home-en',
      slug: 'custom-downloader-home',
      lang: 'en',
      translationGroupId: 'group-page-custom-home',
      title: 'Custom Downloader Home (Static Front Page)',
      contentHtml: `<p>[scribd_downloader]</p>
<p>[feature_cards_grid]</p>
<p>[custom_notice_box]</p>`,
      switcherSections: DEFAULT_HOME_SWITCHER_EN,
      showInHeader: false,
      showInFooter: false,
      status: 'published',
      seoTitle: 'ScribdDownloader — Custom Static Homepage',
      seoDescription: 'Download full Scribd PDFs with our custom static homepage layout.'
    }
  ],
  shortcodes: DEFAULT_SHORTCODES,
  readingAndLayout: DEFAULT_READING_AND_LAYOUT,
  seo: {
    en: {
      siteTitle: 'ScribdDownloader — Free Online Scribd PDF Downloader & Viewer',
      metaDescription:
        'Download original Scribd PDF documents for free. Instant full-page detection, built-in PDF viewer, and 24x ultra-fast parallel PDF compilation.',
      metaKeywords: 'scribd downloader, scribd pdf downloader, download scribd free, scribd viewer, unlock scribd pdf',
      ogTitle: 'ScribdDownloader — Free Online Scribd PDF Downloader',
      ogDescription:
        'Paste any Scribd link, click Fetch to detect all pages, and download the original PDF file instantly.',
      ogImageUrl: '',
      canonicalUrl: 'https://scribddownloader.app',
      robotsMeta: 'index, follow',
      schemaJsonLd: JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'ScribdDownloader',
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'All',
          description:
            'Free online Scribd PDF downloader with full page detection and high-speed parallel PDF compilation.',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD'
          }
        },
        null,
        2
      ),
      customHeadHtml: ''
    },
    ur: {
      siteTitle: 'ScribdDownloader — مفت Scribd PDF ڈاؤنلوڈر اور ویور',
      metaDescription:
        'کسی بھی Scribd ڈاکومنٹ یا کتاب کو اوریجنل کوالٹی PDF میں مفت ڈاؤنلوڈ کریں۔ تیز ترین پیج ڈیٹیکشن اور ڈاؤنلوڈ۔',
      metaKeywords: 'scribd downloader urdu, download scribd pdf free, scribd book download',
      ogTitle: 'ScribdDownloader — مفت Scribd PDF ڈاؤنلوڈر',
      ogDescription: 'ایک کلک میں Scribd سے مکمل اوریجنل PDF فائل ڈاؤنلوڈ کریں۔',
      ogImageUrl: '',
      canonicalUrl: 'https://scribddownloader.app/?lang=ur',
      robotsMeta: 'index, follow',
      schemaJsonLd: '',
      customHeadHtml: ''
    },
    hi: {
      siteTitle: 'ScribdDownloader — मुफ़्त ऑनलाइन Scribd PDF डाउनलोडर',
      metaDescription:
        'किसी भी Scribd दस्तावेज़ को मुफ़्त में ओरिजिनल PDF में डाउनलोड करें। सुपर-फास्ट पेज डिटेक्शन और डाउनलोड।',
      metaKeywords: 'scribd downloader hindi, free scribd pdf download',
      ogTitle: 'ScribdDownloader — मुफ़्त Scribd PDF डाउनलोडर',
      ogDescription: 'एक क्लिक में Scribd से पूरी ओरिजिनल PDF फाइल डाउनलोड करें।',
      ogImageUrl: '',
      canonicalUrl: 'https://scribddownloader.app/?lang=hi',
      robotsMeta: 'index, follow',
      schemaJsonLd: '',
      customHeadHtml: ''
    },
    es: {
      siteTitle: 'ScribdDownloader — Descargador de PDF de Scribd Gratis Online',
      metaDescription:
        'Descarga documentos PDF originales de Scribd gratis. Detección instantánea de todas las páginas y descarga rápida.',
      metaKeywords: 'descargar scribd gratis, convertidor scribd a pdf, scribd downloader espanol',
      ogTitle: 'ScribdDownloader — Descargador de PDF de Scribd Gratis',
      ogDescription: 'Pega tu enlace de Scribd y descarga el archivo PDF original completo en segundos.',
      ogImageUrl: '',
      canonicalUrl: 'https://scribddownloader.app/?lang=es',
      robotsMeta: 'index, follow',
      schemaJsonLd: '',
      customHeadHtml: ''
    },
    ar: {
      siteTitle: 'ScribdDownloader — تحميل ملفات PDF من Scribd مجاناً',
      metaDescription:
        'قم بتحميل مستندات وكتب Scribd بصيغة PDF الأصلية مجاناً وبسرعة فائقة مع كشف كامل للصفحات.',
      metaKeywords: 'تحميل من سكريبد, scribd pdf downloader arabic, تنزيل كتب scribd',
      ogTitle: 'ScribdDownloader — تحميل ملفات PDF من Scribd مجاناً',
      ogDescription: 'الصق رابط Scribd وقم بتحميل ملف PDF الأصلي كاملاً في ثوانٍ.',
      ogImageUrl: '',
      canonicalUrl: 'https://scribddownloader.app/?lang=ar',
      robotsMeta: 'index, follow',
      schemaJsonLd: '',
      customHeadHtml: ''
    }
  }
};

export function loadCmsState(): CmsStoreState {
  if (typeof window === 'undefined') return DEFAULT_CMS_STATE;
  try {
    const raw = localStorage.getItem(CMS_STORAGE_KEY);
    if (!raw) {
      const detected = detectBrowserAndRegionLanguage(DEFAULT_CMS_STATE.languages, true);
      return {
        ...DEFAULT_CMS_STATE,
        activeLanguage: detected.matchedCode
      };
    }
    const parsed = JSON.parse(raw);
    const isAlreadySeededV4 = Boolean(parsed.seededV4);

    let mergedShortcodes: ShortcodeItem[] = Array.isArray(parsed.shortcodes)
      ? parsed.shortcodes
      : DEFAULT_SHORTCODES;
    if (!isAlreadySeededV4 && Array.isArray(parsed.shortcodes) && parsed.shortcodes.length > 0) {
      const existingTags = new Set(
        parsed.shortcodes.map((s: ShortcodeItem) => (s.tag || '').toLowerCase())
      );
      const missingDefaults = DEFAULT_SHORTCODES.filter(
        (d) => !existingTags.has(d.tag.toLowerCase())
      );
      mergedShortcodes = [...missingDefaults, ...parsed.shortcodes];
    }

    let mergedPages: CustomPageItem[] = Array.isArray(parsed.pages)
      ? parsed.pages
      : DEFAULT_CMS_STATE.pages;
    if (!isAlreadySeededV4 && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
      const existingSlugs = new Set(
        parsed.pages.map((p: CustomPageItem) => (p.slug || '').toLowerCase())
      );
      const missingDefaultPages = DEFAULT_CMS_STATE.pages.filter(
        (d) => !existingSlugs.has(d.slug.toLowerCase())
      );
      mergedPages = [...parsed.pages, ...missingDefaultPages];
    }

    const rawLanguages: LanguageConfig[] = Array.isArray(parsed.languages) && parsed.languages.length > 0
      ? parsed.languages.map((l: LanguageConfig) => {
          if (Array.isArray(l.regions) && l.regions.length > 0) return l;
          const preset = WORLD_LANGUAGE_PRESETS.find((p) => p.code === l.code);
          return { ...l, regions: preset?.regions || [l.code.toUpperCase()] };
        })
      : DEFAULT_CMS_STATE.languages;

    const mergedReadingAndLayout: SiteReadingAndLayoutSettings = {
      ...DEFAULT_READING_AND_LAYOUT,
      ...(parsed.readingAndLayout || {})
    };

    const userManualOverride = localStorage.getItem(USER_LANG_OVERRIDE_KEY);
    let resolvedActiveLanguage = parsed.activeLanguage || 'en';

    if (mergedReadingAndLayout.autoDetectBrowserLanguage && !userManualOverride) {
      const detected = detectBrowserAndRegionLanguage(rawLanguages, true);
      resolvedActiveLanguage = detected.matchedCode;
    } else if (
      userManualOverride &&
      rawLanguages.some((l) => l.code === userManualOverride && l.enabled)
    ) {
      resolvedActiveLanguage = userManualOverride;
    } else if (!rawLanguages.some((l) => l.code === resolvedActiveLanguage && l.enabled)) {
      resolvedActiveLanguage =
        rawLanguages.find((l) => l.isDefault && l.enabled)?.code ||
        rawLanguages.find((l) => l.enabled)?.code ||
        'en';
    }

    return {
      ...DEFAULT_CMS_STATE,
      ...parsed,
      seededV4: true,
      activeLanguage: resolvedActiveLanguage,
      languages: rawLanguages,
      pages: mergedPages,
      shortcodes: mergedShortcodes,
      readingAndLayout: mergedReadingAndLayout,
      translations: { ...DEFAULT_CMS_STATE.translations, ...(parsed.translations || {}) },
      seo: { ...DEFAULT_CMS_STATE.seo, ...(parsed.seo || {}) }
    };
  } catch {
    return DEFAULT_CMS_STATE;
  }
}

export function saveCmsState(state: CmsStoreState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

export const ADMIN_AUTHORIZED_EMAIL = 'minhashussain.wp@gmail.com';
export const ADMIN_AUTHORIZED_PASS = 'Shajhi@12345';
const ADMIN_AUTH_STORAGE_KEY = 'scribddownloader_kmg_admin_session_v1';

export function isAdminAuthenticatedSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === ADMIN_AUTHORIZED_EMAIL;
  } catch {
    return false;
  }
}

export function verifyAndLoginAdmin(email: string, password: string): boolean {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = password || '';
  if (
    cleanEmail === ADMIN_AUTHORIZED_EMAIL.toLowerCase() &&
    cleanPass === ADMIN_AUTHORIZED_PASS
  ) {
    try {
      localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, ADMIN_AUTHORIZED_EMAIL);
    } catch {
      // ignore
    }
    return true;
  }
  return false;
}

export function logoutAdminSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

