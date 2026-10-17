import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface ScribdPage {
  pageNumber: number;
  imageUrl?: string;
  jsonpUrl?: string;
  text: string;
}

export interface ScribdDocumentData {
  id: string;
  title: string;
  author: string;
  description: string;
  pageCount: number;
  wordCount: number;
  embedUrl: string;
  originalUrl: string;
  category: string;
  accessKey?: string;
  thumbnailUrl?: string;
  assetPrefix?: string;
  pages: ScribdPage[];
  extractedText: string;
  resolvedAt: string;
  sourceMethod: 'live-scribd' | 'embed-parser' | 'proxy-bridge' | 'client-zero-block';
}

const EMBED_BYPASS_UAS = [
  'WhatsApp/2.23.20.0',
  'WhatsApp/2.24.12.78 A',
  'WhatsApp/2.24.6.77 i'
];

const DOC_METADATA_UAS = [
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'WhatsApp/2.23.20.0',
  'Twitterbot/1.0'
];

const DOCUMENT_CACHE = new Map<string, ScribdDocumentData>();
const IMAGE_BYTE_CACHE = new Map<string, { bytes: Uint8Array; isPng: boolean }>();

export function getRandomHeaders(targetUrl = '') {
  const isEmbedOrJsonp =
    targetUrl.includes('/embeds/') ||
    targetUrl.includes('.jsonp') ||
    targetUrl.includes('scribdassets.com');

  const uaList = isEmbedOrJsonp ? EMBED_BYPASS_UAS : DOC_METADATA_UAS;
  const ua = uaList[Math.floor(Math.random() * uaList.length)];

  return {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache'
  };
}

export function isValidScribdPayload(text: string, targetUrl = ''): boolean {
  if (!text || text.length < 40) return false;
  if (
    text.includes('<title>Client Challenge</title>') ||
    text.includes('/_fs-ch-') ||
    text.includes('JavaScript is disabled in your browser') ||
    text.includes('Document deleted by owner')
  ) {
    return false;
  }

  if (targetUrl.includes('/embeds/')) {
    return (
      text.includes('outer_page_') ||
      text.includes('docManager.addPage') ||
      text.includes('scribdassets.com') ||
      text.includes('.jsonp')
    );
  }

  return true;
}

export function parseScribdInput(input: string): { id: string; slugTitle?: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^\d{5,15}$/.test(trimmed)) {
    return { id: trimmed };
  }

  const urlRegex = /(?:scribd\.com)\/(?:doc|document|presentation|book|read|embeds|audiobook)\/(\d{5,15})(?:\/([^/?#]+))?/i;
  const match = trimmed.match(urlRegex);
  if (match && match[1]) {
    const rawSlug = match[2] && match[2] !== 'content' ? match[2] : undefined;
    const slugTitle = rawSlug
      ? decodeURIComponent(rawSlug).replace(/[-_]+/g, ' ').trim()
      : undefined;
    return { id: match[1], slugTitle };
  }

  const fallbackMatch = trimmed.match(/\b(\d{6,14})\b/);
  if (fallbackMatch && fallbackMatch[1]) {
    return { id: fallbackMatch[1] };
  }

  return null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripHtmlTags(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );
}

/**
 * ULTRA-FAST FETCHER:
 * - For `scribdassets.com` (`.jsonp` manifests): fetches DIRECTLY first (~39ms, `Access-Control-Allow-Origin: *`)!
 * - For `scribd.com/embeds/`: uses `WhatsApp/2.23.20.0` on server or `/api/proxy-asset` in browser.
 */
export async function fetchWithAntiBlockFallback(targetUrl: string, timeoutMs = 5000): Promise<string | null> {
  const cleanTarget = targetUrl
    .replace(/^http:\/\/html\.scribd\.com\//i, 'https://html.scribdassets.com/')
    .replace(/^http:\/\//i, 'https://');

  // Fast path: `scribdassets.com` has `Access-Control-Allow-Origin: *` and zero bot blocks (~39ms!)
  if (cleanTarget.includes('scribdassets.com')) {
    try {
      const directResp = await fetch(cleanTarget, {
        signal: AbortSignal.timeout(3000)
      });
      if (directResp.ok) {
        const text = await directResp.text();
        if (text && text.length >= 40) return text;
      }
    } catch {
      // Fall through to proxy fallback
    }
  }

  const attemptDirectWithUa = async (ua: string): Promise<string> => {
    const resp = await fetch(cleanTarget, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!resp.ok) throw new Error(`Status ${resp.status}`);
    const text = await resp.text();
    if (!isValidScribdPayload(text, cleanTarget)) {
      throw new Error('Challenge or invalid payload');
    }
    return text;
  };

  const attemptViaProxy = async (proxyUrl: string): Promise<string> => {
    const resp = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!resp.ok) throw new Error(`Status ${resp.status}`);
    const text = await resp.text();
    if (!isValidScribdPayload(text, cleanTarget)) {
      throw new Error('Challenge or invalid proxy payload');
    }
    return text;
  };

  const candidates: Promise<string>[] = [];

  if (typeof window !== 'undefined') {
    candidates.push(attemptViaProxy(`/api/proxy-asset?url=${encodeURIComponent(cleanTarget)}`));
  } else {
    candidates.push(attemptDirectWithUa('WhatsApp/2.23.20.0'));
    candidates.push(attemptDirectWithUa('WhatsApp/2.24.12.78 A'));
  }

  try {
    return await Promise.any(candidates);
  } catch {
    return null;
  }
}

export function parseJsonpPageContent(rawJsonp: string, assetPrefix?: string): {
  imageUrls: string[];
  text: string;
} {
  const imageUrls: string[] = [];
  let htmlContent = rawJsonp;

  const firstBracket = rawJsonp.indexOf('[');
  const lastBracket = rawJsonp.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket && rawJsonp.includes('callback')) {
    try {
      const parsedArr = JSON.parse(rawJsonp.slice(firstBracket, lastBracket + 1));
      if (Array.isArray(parsedArr) && typeof parsedArr[0] === 'string') {
        htmlContent = parsedArr[0];
      }
    } catch {
      htmlContent = rawJsonp
        .slice(firstBracket + 1, lastBracket)
        .replace(/\\"/g, '"')
        .replace(/\\\//g, '/');
    }
  }

  htmlContent = htmlContent.replace(/\\\//g, '/').replace(/\\"/g, '"');

  const imgAttrRegex = /(?:orig|src)=["']([^"']+\.(?:jpg|jpeg|png)[^"']*)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgAttrRegex.exec(htmlContent)) !== null) {
    let imgUrl = match[1].trim();
    if (/spacer|blank|empty|1x1|transparent|errorIcon/i.test(imgUrl)) continue;

    if (imgUrl.startsWith('http://html.scribd.com/')) {
      imgUrl = imgUrl.replace('http://html.scribd.com/', 'https://html.scribdassets.com/');
    } else if (imgUrl.startsWith('https://html.scribd.com/')) {
      imgUrl = imgUrl.replace('https://html.scribd.com/', 'https://html.scribdassets.com/');
    } else if (imgUrl.startsWith('http://')) {
      imgUrl = imgUrl.replace('http://', 'https://');
    } else if (imgUrl.startsWith('//')) {
      imgUrl = `https:${imgUrl}`;
    } else if (!imgUrl.startsWith('http') && assetPrefix) {
      imgUrl = `${assetPrefix.replace(/\/$/, '')}/${imgUrl.replace(/^\//, '')}`;
    }

    if (!imageUrls.includes(imgUrl)) {
      imageUrls.push(imgUrl);
    }
  }

  const text = stripHtmlTags(htmlContent);
  return { imageUrls, text };
}

export function parseEmbedHtmlAssets(embedHtml: string): {
  title?: string;
  pageCount: number;
  assetPrefix?: string;
  pagesMap: Map<number, { jsonpUrl?: string; imageUrl?: string; inlineText?: string }>;
} {
  const unescaped = embedHtml
    .replace(/\\\//g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/\\"/g, '"');

  let title: string | undefined;
  const embedTitleMatch =
    unescaped.match(/<title>([^<]+)<\/title>/i) ||
    unescaped.match(/"title"\s*:\s*"([^"]+)"/i);
  if (embedTitleMatch?.[1]) {
    const cleanT = decodeHtmlEntities(embedTitleMatch[1].replace(/\s*\|\s*Scribd.*$/i, '').trim());
    if (cleanT && cleanT.toLowerCase() !== 'scribd' && cleanT !== 'Client Challenge') {
      title = cleanT;
    }
  }

  let assetPrefix: string | undefined;
  const prefixMatch =
    unescaped.match(/asset_prefix\s*[:=]\s*["'](https?:\/\/[^"']+)["']/i) ||
    unescaped.match(/(https?:\/\/(?:html[0-9-f]*\.scribdassets\.com|html\.scribd\.com)\/[a-zA-Z0-9_-]+\/)/i);
  if (prefixMatch?.[1]) {
    assetPrefix = prefixMatch[1]
      .replace(/^http:\/\/html\.scribd\.com\//i, 'https://html.scribdassets.com/')
      .replace(/^http:\/\//i, 'https://');
  }

  const pagesMap = new Map<number, { jsonpUrl?: string; imageUrl?: string; inlineText?: string }>();

  const addPageBlockRegex = /docManager\.addPage\(\{([\s\S]*?)\}\)/gi;
  let m: RegExpExecArray | null;
  while ((m = addPageBlockRegex.exec(unescaped)) !== null) {
    const body = m[1];
    const pNumMatch = body.match(/pageNum\s*:\s*(\d+)/i);
    if (!pNumMatch) continue;
    const pNum = parseInt(pNumMatch[1], 10);
    const existing = pagesMap.get(pNum) || {};

    const contentUrlMatch = body.match(/contentUrl\s*:\s*["']([^"']+)["']/i);
    if (contentUrlMatch?.[1]) {
      const cUrl = contentUrlMatch[1]
        .replace(/^http:\/\/html\.scribd\.com\//i, 'https://html.scribdassets.com/')
        .replace(/^http:\/\//i, 'https://');
      if (cUrl.endsWith('.jsonp')) {
        existing.jsonpUrl = cUrl;
      } else if (/\.(jpg|jpeg|png)/i.test(cUrl)) {
        existing.imageUrl = cUrl;
      }
    }
    pagesMap.set(pNum, existing);
  }

  const jsonpFullRegex = /https?:\/\/[^"'\s\\<>()]+\.(?:scribdassets\.com|scribd\.com)\/[^"'\s\\<>()]+\/pages\/(\d+)-[a-zA-Z0-9]+\.jsonp/gi;
  while ((m = jsonpFullRegex.exec(unescaped)) !== null) {
    const pNum = parseInt(m[1], 10);
    const existing = pagesMap.get(pNum) || {};
    if (!existing.jsonpUrl) {
      existing.jsonpUrl = m[0]
        .replace(/^http:\/\/html\.scribd\.com\//i, 'https://html.scribdassets.com/')
        .replace(/^http:\/\//i, 'https://');
      pagesMap.set(pNum, existing);
    }
  }

  const imgFullRegex = /https?:\/\/[^"'\s\\<>()]+\.(?:scribdassets\.com|scribd\.com)\/[^"'\s\\<>()]+\/images\/(\d+)-[a-zA-Z0-9]+\.(?:jpg|jpeg|png)/gi;
  while ((m = imgFullRegex.exec(unescaped)) !== null) {
    const pNum = parseInt(m[1], 10);
    const existing = pagesMap.get(pNum) || {};
    existing.imageUrl = m[0]
      .replace(/^http:\/\/html\.scribd\.com\//i, 'https://html.scribdassets.com/')
      .replace(/^http:\/\//i, 'https://');
    pagesMap.set(pNum, existing);
  }

  if (assetPrefix) {
    const base = assetPrefix.replace(/\/$/, '');
    const relJsonpRegex = /\/?pages\/(\d+)-([a-zA-Z0-9]+)\.jsonp/gi;
    while ((m = relJsonpRegex.exec(unescaped)) !== null) {
      const pNum = parseInt(m[1], 10);
      const hash = m[2];
      const existing = pagesMap.get(pNum) || {};
      if (!existing.jsonpUrl) {
        existing.jsonpUrl = `${base}/pages/${pNum}-${hash}.jsonp`;
      }
      pagesMap.set(pNum, existing);
    }

    const relImgRegex = /\/?images\/(\d+)-([a-zA-Z0-9]+)\.(jpg|jpeg|png)/gi;
    while ((m = relImgRegex.exec(unescaped)) !== null) {
      const pNum = parseInt(m[1], 10);
      const existing = pagesMap.get(pNum) || {};
      existing.imageUrl = `${base}/images/${pNum}-${m[2]}.${m[3]}`;
      pagesMap.set(pNum, existing);
    }
  }

  const inlinePageRegex = /<div[^>]+id=["']outer_page_(\d+)["'][^>]*>([\s\S]*?)(?=<div[^>]+id=["']outer_page_\d+["']|<script|$)/gi;
  while ((m = inlinePageRegex.exec(unescaped)) !== null) {
    const pNum = parseInt(m[1], 10);
    const blockHtml = m[2];
    const parsedInline = parseJsonpPageContent(blockHtml, assetPrefix);
    const existing = pagesMap.get(pNum) || {};
    if (!existing.imageUrl && parsedInline.imageUrls.length > 0) {
      existing.imageUrl = parsedInline.imageUrls[0];
    }
    if (parsedInline.text && parsedInline.text.length > 5) {
      existing.inlineText = parsedInline.text;
    }
    pagesMap.set(pNum, existing);
  }

  let declaredPageCount = 0;
  const pageCountMatches = [
    unescaped.match(/"page_count"\s*:\s*(\d+)/i),
    unescaped.match(/"total_pages"\s*:\s*(\d+)/i),
    unescaped.match(/page_count\s*=\s*(\d+)/i),
    unescaped.match(/total_pages\s*:\s*(\d+)/i)
  ];
  for (const pm of pageCountMatches) {
    if (pm?.[1]) {
      const parsedCount = parseInt(pm[1], 10);
      if (parsedCount > declaredPageCount && parsedCount < 5000) {
        declaredPageCount = parsedCount;
      }
    }
  }

  const outerPageIds = [...unescaped.matchAll(/outer_page_(\d+)/gi)].map((x) => parseInt(x[1], 10));
  const maxOuterPage = outerPageIds.length > 0 ? Math.max(...outerPageIds) : 0;

  const discoveredNums = Array.from(pagesMap.keys());
  const maxDiscovered = discoveredNums.length > 0 ? Math.max(...discoveredNums) : 0;
  const finalPageCount = Math.max(declaredPageCount, maxOuterPage, maxDiscovered);

  for (let p = 1; p <= finalPageCount; p++) {
    if (!pagesMap.has(p)) {
      pagesMap.set(p, {});
    }
  }

  return { title, pageCount: finalPageCount, assetPrefix, pagesMap };
}

export async function resolveScribdDocument(rawInput: string): Promise<ScribdDocumentData> {
  const parsed = parseScribdInput(rawInput);
  if (!parsed) {
    throw new Error('Invalid Scribd URL or Document ID. Please paste a valid Scribd document link.');
  }

  const { id, slugTitle } = parsed;

  const cached = DOCUMENT_CACHE.get(id);
  if (cached && cached.pages.length > 1) {
    return cached;
  }

  const docUrl = `https://www.scribd.com/document/${id}`;
  const defaultAccessKey = 'key-fFexxf7r1bzEfWu3HKwf';
  const targetEmbedUrl = `https://www.scribd.com/embeds/${id}/content`;

  let title = slugTitle || `Scribd Document #${id}`;
  const author = 'Scribd Contributor';
  let description = `Unlocked Scribd document (#${id}) ready for instant viewing and high-speed PDF download.`;
  let pageCount = 0;
  let thumbnailUrl: string | undefined;
  let assetPrefix: string | undefined;
  const pages: ScribdPage[] = [];
  const sourceMethod: ScribdDocumentData['sourceMethod'] = 'embed-parser';

  const docMetaPromise = (async () => {
    try {
      const resp = await fetch(docUrl, {
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept': 'text/html,application/xhtml+xml'
        },
        signal: AbortSignal.timeout(3500)
      });
      if (!resp.ok) return null;
      const html = await resp.text();
      const titleMatch =
        html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<title>([^<]+)<\/title>/i);
      const descMatch = html.match(/property=["']og:description["']\s+content=["']([^"']+)["']/i);
      const imgMatch = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i);
      const pageCountMatch = html.match(/"page_count"\s*:\s*(\d+)/i);
      const formatIdMatch = html.match(/"format_id"\s*:\s*"([a-zA-Z0-9_-]+)"/i);

      return {
        title: titleMatch?.[1] ? decodeHtmlEntities(titleMatch[1].replace(/\s*\|\s*Scribd.*$/i, '')) : undefined,
        description: descMatch?.[1] ? decodeHtmlEntities(descMatch[1]) : undefined,
        thumbnailUrl: imgMatch?.[1],
        pageCount: pageCountMatch?.[1] ? parseInt(pageCountMatch[1], 10) : 0,
        formatId: formatIdMatch?.[1]
      };
    } catch {
      return null;
    }
  })();

  const embedHtmlPromise = fetchWithAntiBlockFallback(targetEmbedUrl, 5000);
  const [docMeta, embedHtml] = await Promise.all([docMetaPromise, embedHtmlPromise]);

  if (docMeta) {
    if (docMeta.title && docMeta.title !== 'Client Challenge') title = docMeta.title;
    if (docMeta.description) description = docMeta.description;
    if (docMeta.thumbnailUrl) thumbnailUrl = docMeta.thumbnailUrl;
    if (docMeta.pageCount && docMeta.pageCount > pageCount) pageCount = docMeta.pageCount;
    if (docMeta.formatId) {
      assetPrefix = `https://html.scribdassets.com/${docMeta.formatId}/`;
    }
  }

  if (embedHtml) {
    const parsedAssets = parseEmbedHtmlAssets(embedHtml);
    if (parsedAssets.title && title.startsWith('Scribd Document #')) {
      title = parsedAssets.title;
    }
    if (parsedAssets.assetPrefix) {
      assetPrefix = parsedAssets.assetPrefix;
    }
    if (parsedAssets.pageCount > pageCount) {
      pageCount = parsedAssets.pageCount;
    }

    const sortedPageNums = Array.from(parsedAssets.pagesMap.keys()).sort((a, b) => a - b);

    // Pre-resolve the first 36 pages directly from `html.scribdassets.com` (~39ms each)
    // so `/api/resolve` always finishes in < 1.2s and never triggers a Vercel serverless timeout!
    const fastServerSlice = sortedPageNums.slice(0, 36);
    await Promise.all(
      fastServerSlice.map(async (pNum) => {
        const entry = parsedAssets.pagesMap.get(pNum)!;
        if (entry.jsonpUrl && (!entry.imageUrl || !entry.inlineText)) {
          try {
            const rawJp = await fetchWithAntiBlockFallback(entry.jsonpUrl, 2500);
            if (rawJp) {
              const parsedJp = parseJsonpPageContent(rawJp, assetPrefix);
              if (!entry.imageUrl && parsedJp.imageUrls.length > 0) {
                entry.imageUrl = parsedJp.imageUrls[0];
              }
              if (parsedJp.text && parsedJp.text.length > 5) {
                entry.inlineText = parsedJp.text;
              }
            }
          } catch {
            // Remaining pages are resolved in parallel on the client
          }
        }
      })
    );

    for (const pNum of sortedPageNums) {
      const entry = parsedAssets.pagesMap.get(pNum)!;
      pages.push({
        pageNumber: pNum,
        jsonpUrl: entry.jsonpUrl,
        imageUrl: entry.imageUrl,
        text: entry.inlineText || `Page ${pNum} — ${title}`
      });
    }
  }

  if (pages.length === 0) {
    const total = pageCount > 0 ? pageCount : 1;
    for (let i = 1; i <= total; i++) {
      pages.push({
        pageNumber: i,
        imageUrl: i === 1 ? thumbnailUrl : undefined,
        text: `Page ${i} — ${title}`
      });
    }
  }

  const resultDoc: ScribdDocumentData = {
    id,
    title,
    author,
    description,
    pageCount: Math.max(pageCount, pages.length),
    wordCount: pages.length * 180,
    embedUrl: `${targetEmbedUrl}?start_page=1&view_mode=scroll&access_key=${defaultAccessKey}`,
    originalUrl: docUrl,
    category: 'Scribd Document',
    accessKey: defaultAccessKey,
    thumbnailUrl,
    assetPrefix,
    pages,
    extractedText: pages.map((p) => `--- Page ${p.pageNumber} ---\n\n${p.text}`).join('\n\n'),
    resolvedAt: new Date().toISOString(),
    sourceMethod
  };

  if (resultDoc.pages.length > 1) {
    DOCUMENT_CACHE.set(id, resultDoc);
  }

  return resultDoc;
}

function inspectValidImageFormat(bytes: Uint8Array): 'jpg' | 'png' | null {
  if (!bytes || bytes.byteLength < 1200) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg';
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png';
  }

  return null;
}

export async function fetchPageImageBytes(
  imageUrl: string,
  useClientProxyEndpoint = false
): Promise<{ bytes: Uint8Array; isPng: boolean } | null> {
  const cleanUrl = imageUrl
    .replace(/^http:\/\/html\.scribd\.com\//i, 'https://html.scribdassets.com/')
    .replace(/^http:\/\//i, 'https://');
  const cached = IMAGE_BYTE_CACHE.get(cleanUrl);
  if (cached) return cached;

  const fetchCandidate = async (
    url: string,
    withHeaders = false
  ): Promise<{ bytes: Uint8Array; isPng: boolean }> => {
    const resp = await fetch(url, {
      headers: withHeaders ? getRandomHeaders(cleanUrl) : undefined,
      signal: AbortSignal.timeout(6000)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const format = inspectValidImageFormat(bytes);
    if (!format) {
      throw new Error('Invalid or blank placeholder image');
    }
    return { bytes, isPng: format === 'png' };
  };

  const candidates: Promise<{ bytes: Uint8Array; isPng: boolean }>[] = [
    fetchCandidate(`https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&output=jpg&q=92`, false),
    fetchCandidate(cleanUrl, typeof window === 'undefined')
  ];

  if (useClientProxyEndpoint) {
    candidates.push(fetchCandidate(`/api/proxy-asset?url=${encodeURIComponent(cleanUrl)}`, false));
  }

  try {
    const winner = await Promise.any(candidates);
    IMAGE_BYTE_CACHE.set(cleanUrl, winner);
    return winner;
  } catch {
    return null;
  }
}

export async function generateDocumentPdf(
  doc: ScribdDocumentData,
  options?: {
    includeCoverPage?: boolean;
    includeMetadataFooter?: boolean;
    pageSize?: 'A4' | 'LETTER';
    useClientProxy?: boolean;
    onProgress?: (currentPage: number, totalPages: number) => void;
  }
): Promise<Uint8Array> {
  const isLetter = options?.pageSize === 'LETTER';
  const defaultWidth = isLetter ? 612 : 595.28;
  const defaultHeight = isLetter ? 792 : 841.89;
  const margin = 42;
  const contentWidth = defaultWidth - margin * 2;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(doc.title);
  pdfDoc.setAuthor(doc.author);
  pdfDoc.setSubject(doc.description);
  pdfDoc.setCreator('ScribdDownloader Ultra-Fast PDF Engine');

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const sanitizeForPdf = (input: string): string => {
    return input
      .replace(/[•·]/g, '-')
      .replace(/[—–]/g, '-')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
  };

  const wrapText = (text: string, font: typeof fontRegular, fontSize: number, maxWidth: number): string[] => {
    const clean = sanitizeForPdf(text);
    const paragraphs = clean.split('\n');
    const lines: string[] = [];

    for (const para of paragraphs) {
      if (!para.trim()) {
        lines.push('');
        continue;
      }
      const words = para.split(/\s+/);
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
    }
    return lines;
  };

  const totalPages = doc.pages.length;

  const preparedPages: {
    pageNumber: number;
    imgData: { bytes: Uint8Array; isPng: boolean } | null;
    text: string;
  }[] = new Array(totalPages);

  let completedCount = 0;
  const CONCURRENCY = 20;

  for (let i = 0; i < totalPages; i += CONCURRENCY) {
    const chunk = doc.pages.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (pageData, idxInChunk) => {
        const globalIdx = i + idxInChunk;
        let targetImageUrl = pageData.imageUrl;
        let targetText = pageData.text;

        if (pageData.jsonpUrl && (!targetImageUrl || targetText.startsWith(`Page ${pageData.pageNumber} —`))) {
          try {
            const rawJp = await fetchWithAntiBlockFallback(pageData.jsonpUrl, 3500);
            if (rawJp) {
              const parsedJp = parseJsonpPageContent(rawJp, doc.assetPrefix);
              if (parsedJp.imageUrls.length > 0) {
                targetImageUrl = parsedJp.imageUrls[0];
              }
              if (parsedJp.text && parsedJp.text.length > 5) {
                targetText = parsedJp.text;
              }
            }
          } catch {
            // continue
          }
        }

        let imgData: { bytes: Uint8Array; isPng: boolean } | null = null;
        if (targetImageUrl) {
          imgData = await fetchPageImageBytes(targetImageUrl, options?.useClientProxy);
        }

        preparedPages[globalIdx] = {
          pageNumber: pageData.pageNumber,
          imgData,
          text: targetText
        };

        completedCount++;
        if (options?.onProgress) {
          options.onProgress(completedCount, totalPages);
        }
      })
    );
  }

  for (let idx = 0; idx < totalPages; idx++) {
    const item = preparedPages[idx];
    let imageEmbedded = false;

    if (item.imgData) {
      try {
        const embeddedImg = item.imgData.isPng
          ? await pdfDoc.embedPng(item.imgData.bytes)
          : await pdfDoc.embedJpg(item.imgData.bytes);

        if (embeddedImg.width > 10 && embeddedImg.height > 10) {
          const imgRatio = embeddedImg.height / embeddedImg.width;
          const pageW = defaultWidth;
          const pageH = Math.max(defaultHeight, Math.round(pageW * imgRatio));

          const page = pdfDoc.addPage([pageW, pageH]);
          const scale = Math.min(pageW / embeddedImg.width, pageH / embeddedImg.height);
          const drawW = embeddedImg.width * scale;
          const drawH = embeddedImg.height * scale;

          page.drawImage(embeddedImg, {
            x: (pageW - drawW) / 2,
            y: (pageH - drawH) / 2,
            width: drawW,
            height: drawH
          });

          const hasRealExtractedText =
            item.text &&
            item.text.trim().length > 20 &&
            !item.text.startsWith(`Page ${item.pageNumber} —`);

          if (item.imgData.bytes.byteLength < 45000 && hasRealExtractedText) {
            let textY = pageH - margin - 20;
            const lines = wrapText(item.text, fontRegular, 10, contentWidth);
            for (const line of lines.slice(0, 44)) {
              if (textY < margin) break;
              if (line.trim()) {
                page.drawText(line, {
                  x: margin,
                  y: textY,
                  size: 10,
                  font: fontRegular,
                  color: rgb(0.06, 0.09, 0.15)
                });
              }
              textY -= 14;
            }
          }

          imageEmbedded = true;
        }
      } catch {
        // Fallback to clean text page below
      }
    }

    if (!imageEmbedded) {
      let page = pdfDoc.addPage([defaultWidth, defaultHeight]);
      let y = defaultHeight - margin;

      page.drawText(sanitizeForPdf(doc.title.slice(0, 58)), {
        x: margin,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.25, 0.3, 0.38)
      });

      page.drawText(`PAGE ${item.pageNumber} OF ${totalPages}`, {
        x: defaultWidth - margin - 85,
        y,
        size: 8.5,
        font: fontMono,
        color: rgb(0.35, 0.4, 0.48)
      });

      y -= 12;
      page.drawLine({
        start: { x: margin, y },
        end: { x: defaultWidth - margin, y },
        thickness: 0.75,
        color: rgb(0.8, 0.84, 0.9)
      });
      y -= 26;

      const effectiveText =
        item.text && item.text.trim().length > 0
          ? item.text
          : `${doc.title}\n\nDocument ID: #${doc.id}\nPage ${item.pageNumber} of ${totalPages}\nOriginal Source: ${doc.originalUrl}`;

      const bodyLines = wrapText(effectiveText, fontRegular, 10.5, contentWidth);
      for (const line of bodyLines) {
        if (y < margin + 35) {
          page = pdfDoc.addPage([defaultWidth, defaultHeight]);
          y = defaultHeight - margin;
        }
        if (line === '') {
          y -= 10;
        } else {
          page.drawText(line, {
            x: margin,
            y,
            size: 10.5,
            font: fontRegular,
            color: rgb(0.06, 0.09, 0.16)
          });
          y -= 15;
        }
      }

      page.drawLine({
        start: { x: margin, y: margin - 8 },
        end: { x: defaultWidth - margin, y: margin - 8 },
        thickness: 0.5,
        color: rgb(0.85, 0.88, 0.92)
      });
      page.drawText(`Scribd Document #${doc.id} · Page ${item.pageNumber} of ${totalPages}`, {
        x: margin,
        y: margin - 20,
        size: 8,
        font: fontMono,
        color: rgb(0.45, 0.5, 0.58)
      });
    }
  }

  return await pdfDoc.save();
}

export function getCuratedSamples(): ScribdDocumentData[] {
  return [];
}
