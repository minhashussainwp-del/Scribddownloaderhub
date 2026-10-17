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

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0'
];

// Ultra-Fast In-Memory Caches
const DOCUMENT_CACHE = new Map<string, ScribdDocumentData>();
const IMAGE_BYTE_CACHE = new Map<string, { bytes: Uint8Array; isPng: boolean }>();

export function getRandomHeaders(referer = 'https://www.google.com/') {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const randIp = `${Math.floor(Math.random() * 190) + 12}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  return {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Upgrade-Insecure-Requests': '1',
    'Referer': referer,
    'X-Forwarded-For': randIp,
    'X-Real-IP': randIp,
    'CF-Connecting-IP': randIp
  };
}

/**
 * Parses any Scribd URL or numeric ID to extract the numeric Document ID and title slug.
 */
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
    .replace(/\s+/g, ' ')
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
      .replace(/<[^>]+>/g, ' ')
  );
}

/**
 * ULTRA-FAST PARALLEL RACE FETCHER (`Promise.any`):
 * Fires requests across Direct + multiple Anti-Block Relays simultaneously
 * and returns the FIRST valid response in milliseconds.
 */
export async function fetchWithAntiBlockFallback(targetUrl: string, timeoutMs = 5000): Promise<string | null> {
  const attemptFetch = async (url: string, useCustomHeaders: boolean): Promise<string> => {
    const resp = await fetch(url, {
      headers: useCustomHeaders ? getRandomHeaders() : undefined,
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!resp.ok) throw new Error(`Status ${resp.status}`);
    const text = await resp.text();
    if (!text || text.length < 60) throw new Error('Empty payload');
    return text;
  };

  const candidates: Promise<string>[] = [];
  if (typeof window !== 'undefined') {
    candidates.push(attemptFetch(`/api/proxy-asset?url=${encodeURIComponent(targetUrl)}`, false));
  } else {
    candidates.push(attemptFetch(targetUrl, true));
  }
  candidates.push(
    attemptFetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`, false),
    attemptFetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, false),
    attemptFetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, false)
  );

  try {
    return await Promise.any(candidates);
  } catch {
    return null;
  }
}

/**
 * Note: We DO NOT blindly guess `/images/N-hash.jpg` from `/pages/N-hash.jsonp`
 * because on Scribd, JSONP hashes and Image hashes are COMPLETELY DIFFERENT!
 * Guessing `/images/N-jsonpHash.jpg` causes 404/blank white placeholder images.
 */
export function deriveImageUrlFromJsonp(_jsonpUrl?: string): string | undefined {
  return undefined;
}

/**
 * Parses a Scribd JSONP page payload (`window.page1_callback(["<div class=\"newpage\"..."])`)
 * to extract the REAL high-res background scan image URLs (with their true image hash!)
 * AND all structured text lines on that page.
 */
export function parseJsonpPageContent(rawJsonp: string, assetPrefix?: string): {
  imageUrls: string[];
  text: string;
} {
  const imageUrls: string[] = [];
  let htmlContent = rawJsonp;

  const firstBracket = rawJsonp.indexOf('[');
  const lastBracket = rawJsonp.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
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

  // Unescape any remaining escaped slashes or quotes
  htmlContent = htmlContent.replace(/\\\//g, '/').replace(/\\"/g, '"');

  const imgAttrRegex = /(?:orig|src)=["']([^"']+\.(?:jpg|jpeg|png)[^"']*)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgAttrRegex.exec(htmlContent)) !== null) {
    let imgUrl = match[1].trim();
    // Skip 1x1 blank spacer or transparent placeholder gifs/pngs
    if (/spacer|blank|empty|1x1|transparent/i.test(imgUrl)) continue;

    if (imgUrl.startsWith('http://html.scribd.com/')) {
      imgUrl = imgUrl.replace('http://html.scribd.com/', 'https://html.scribdassets.com/');
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

/**
 * Exhaustive Page Extractor for Scribd Embed HTML.
 * Extracts ALL pages with their real JSONP and direct image URLs.
 */
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
    if (cleanT) title = cleanT;
  }

  let assetPrefix: string | undefined;
  const prefixMatch =
    unescaped.match(/asset_prefix\s*[:=]\s*["'](https?:\/\/[^"']+)["']/i) ||
    unescaped.match(/(https?:\/\/html\.scribdassets\.com\/[a-zA-Z0-9_-]+\/)/i);
  if (prefixMatch?.[1]) {
    assetPrefix = prefixMatch[1].replace(/^http:\/\//i, 'https://');
  }

  const pagesMap = new Map<number, { jsonpUrl?: string; imageUrl?: string; inlineText?: string }>();

  // Pattern 1: Full JSONP URLs
  const jsonpFullRegex = /https?:\/\/[^"'\s\\<>()]+\.scribdassets\.com\/[^"'\s\\<>()]+\/pages\/(\d+)-[a-zA-Z0-9]+\.jsonp/gi;
  let m: RegExpExecArray | null;
  while ((m = jsonpFullRegex.exec(unescaped)) !== null) {
    const pNum = parseInt(m[1], 10);
    const existing = pagesMap.get(pNum) || {};
    if (!existing.jsonpUrl) {
      existing.jsonpUrl = m[0].replace(/^http:\/\//i, 'https://');
      pagesMap.set(pNum, existing);
    }
  }

  // Pattern 2: Full Image URLs explicitly present in the embed HTML
  const imgFullRegex = /https?:\/\/[^"'\s\\<>()]+\.scribdassets\.com\/[^"'\s\\<>()]+\/images\/(\d+)-[a-zA-Z0-9]+\.(?:jpg|jpeg|png)/gi;
  while ((m = imgFullRegex.exec(unescaped)) !== null) {
    const pNum = parseInt(m[1], 10);
    const existing = pagesMap.get(pNum) || {};
    existing.imageUrl = m[0].replace(/^http:\/\//i, 'https://');
    pagesMap.set(pNum, existing);
  }

  // Pattern 3: Relative paths when assetPrefix is known
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

  // Pattern 4: Extract inline page HTML for pages 1-3 that Scribd embeds directly in `<div id="page1">...</div>`
  const inlinePageRegex = /<div[^>]+id=["']outer_page_(\d+)["'][^>]*>([\s\S]*?)(?=<div[^>]+id=["']outer_page_\d+["']|<script|$)/gi;
  while ((m = inlinePageRegex.exec(unescaped)) !== null) {
    const pNum = parseInt(m[1], 10);
    const blockHtml = m[2];
    const parsedInline = parseJsonpPageContent(blockHtml, assetPrefix);
    const existing = pagesMap.get(pNum) || {};
    if (!existing.imageUrl && parsedInline.imageUrls.length > 0) {
      existing.imageUrl = parsedInline.imageUrls[0];
    }
    if (parsedInline.text && parsedInline.text.length > 10) {
      existing.inlineText = parsedInline.text;
    }
    pagesMap.set(pNum, existing);
  }

  // Pattern 5: Check explicit page count in Scribd JS config
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

  const discoveredNums = Array.from(pagesMap.keys());
  const maxDiscovered = discoveredNums.length > 0 ? Math.max(...discoveredNums) : 0;
  const finalPageCount = Math.max(declaredPageCount, maxDiscovered);

  for (let p = 1; p <= finalPageCount; p++) {
    if (!pagesMap.has(p)) {
      pagesMap.set(p, {});
    }
  }

  return { title, pageCount: finalPageCount, assetPrefix, pagesMap };
}

/**
 * Resolves a Scribd document by ID or URL AND inspects page JSONP streams in parallel
 * so every page has its REAL verified image URL and text!
 */
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
  const targetEmbedUrl = `https://www.scribd.com/embeds/${id}/content?start_page=1&view_mode=scroll&access_key=${defaultAccessKey}`;

  let title = slugTitle || `Scribd Document #${id}`;
  let author = 'Scribd Contributor';
  const description = `Unlocked Scribd document (#${id}) ready for instant viewing and high-speed PDF download.`;
  let pageCount = 0;
  let thumbnailUrl: string | undefined;
  let assetPrefix: string | undefined;
  const pages: ScribdPage[] = [];
  let sourceMethod: ScribdDocumentData['sourceMethod'] = 'embed-parser';

  const oembedPromise = (async () => {
    try {
      const oembedUrl = `https://www.scribd.com/services/oembed?format=json&url=${encodeURIComponent(docUrl)}`;
      const resp = await fetch(oembedUrl, {
        headers: getRandomHeaders(),
        signal: AbortSignal.timeout(3500)
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch {
      // ignore
    }
    return null;
  })();

  const embedHtmlPromise = fetchWithAntiBlockFallback(targetEmbedUrl, 5000);
  const [oembedData, embedHtml] = await Promise.all([oembedPromise, embedHtmlPromise]);

  if (oembedData) {
    if (oembedData.title) title = decodeHtmlEntities(String(oembedData.title));
    if (oembedData.author_name) author = decodeHtmlEntities(String(oembedData.author_name));
    if (oembedData.thumbnail_url) thumbnailUrl = String(oembedData.thumbnail_url);
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

    // Parallel-fetch JSONP manifests in high-speed chunks of 24 so we get the REAL image hash and REAL text for every page!
    const CHUNK = 24;
    for (let i = 0; i < sortedPageNums.length; i += CHUNK) {
      const slice = sortedPageNums.slice(i, i + CHUNK);
      await Promise.all(
        slice.map(async (pNum) => {
          const entry = parsedAssets.pagesMap.get(pNum)!;
          if (entry.jsonpUrl && (!entry.imageUrl || !entry.inlineText)) {
            try {
              const rawJp = await fetchWithAntiBlockFallback(entry.jsonpUrl, 3500);
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
              // Will retry on client if needed
            }
          }
        })
      );
    }

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
    embedUrl: targetEmbedUrl,
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

/**
 * Validates raw binary magic bytes to guarantee that a fetched image is a genuine, non-blank
 * JPEG (`FF D8 FF`) or PNG (`89 50 4E 47`) and NOT an HTML error page, WebP, or 1x1 blank spacer!
 */
function inspectValidImageFormat(bytes: Uint8Array): 'jpg' | 'png' | null {
  // Reject tiny 1x1 blank spacers or error stubs (< 1.2 KB)
  if (!bytes || bytes.byteLength < 1200) return null;

  // Check JPEG magic bytes: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg';
  }

  // Check PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
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

/**
 * ULTRA-FAST PARALLEL RACE IMAGE FETCHER (`Promise.any`) WITH MAGIC-BYTE VALIDATION:
 * Forces `output=jpg` on wsrv.nl so WebP is never returned, verifies real JPEG/PNG magic bytes,
 * and rejects blank 1x1 placeholder images!
 */
export async function fetchPageImageBytes(
  imageUrl: string,
  useClientProxyEndpoint = false
): Promise<{ bytes: Uint8Array; isPng: boolean } | null> {
  const cleanUrl = imageUrl.replace(/^http:\/\//i, 'https://');
  const cached = IMAGE_BYTE_CACHE.get(cleanUrl);
  if (cached) return cached;

  const fetchCandidate = async (
    url: string,
    withHeaders = false
  ): Promise<{ bytes: Uint8Array; isPng: boolean }> => {
    const resp = await fetch(url, {
      headers: withHeaders ? getRandomHeaders() : undefined,
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
    // Always force standard JPG output from wsrv.nl so pdf-lib never gets unsupported WebP!
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

/**
 * ULTRA-FAST CONCURRENT PDF COMPILER:
 * Fetches every page's real JSONP (to discover the true image hash + full text) and embeds
 * both the verified high-resolution page scan AND any extracted text so NO PAGE IS EVER BLANK!
 */
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

        // Always inspect the page's JSONP if we don't have a verified image or rich text yet!
        if (pageData.jsonpUrl && (!targetImageUrl || targetText.startsWith(`Page ${pageData.pageNumber} —`))) {
          try {
            const rawJp = await fetchWithAntiBlockFallback(pageData.jsonpUrl, 4500);
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

  // PHASE 2: Assemble Non-Blank PDF Pages in strict order (Page 1 .. Page N)
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

          // If this is a hybrid Scribd page where text sits on top of a background graphic,
          // and the image itself is relatively small in byte size (< 35KB, meaning a background template or diagram),
          // also overlay the extracted text so the page is never blank!
          const hasRealExtractedText =
            item.text &&
            item.text.trim().length > 20 &&
            !item.text.startsWith(`Page ${item.pageNumber} —`);

          if (item.imgData.bytes.byteLength < 35000 && hasRealExtractedText) {
            let textY = pageH - margin - 20;
            const lines = wrapText(item.text, fontRegular, 10, contentWidth);
            for (const line of lines.slice(0, 42)) {
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

      // Top Header Bar
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

      // Bottom Footer Rule
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
