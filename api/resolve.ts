interface ScribdPage {
  pageNumber: number;
  imageUrl?: string;
  jsonpUrl?: string;
  text: string;
}

interface ScribdDocumentData {
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

function parseScribdInput(input: string): { id: string; slugTitle?: string } | null {
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

function parseJsonpPageContent(rawJsonp: string, assetPrefix?: string): {
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

function parseEmbedHtmlAssets(embedHtml: string): {
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

async function resolveScribdServerless(rawInput: string): Promise<ScribdDocumentData> {
  const parsed = parseScribdInput(rawInput);
  if (!parsed) {
    throw new Error('Invalid Scribd URL or Document ID.');
  }

  const { id, slugTitle } = parsed;
  const docUrl = `https://www.scribd.com/document/${id}`;
  const defaultAccessKey = 'key-fFexxf7r1bzEfWu3HKwf';
  const targetEmbedUrl = `https://www.scribd.com/embeds/${id}/content`;

  let title = slugTitle || `Scribd Document #${id}`;
  const author = 'Scribd Contributor';
  let description = `Unlocked Scribd document (#${id}) ready for viewing and PDF download.`;
  let pageCount = 0;
  let thumbnailUrl: string | undefined;
  let assetPrefix: string | undefined;
  const pages: ScribdPage[] = [];

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

  const embedHtmlPromise = (async () => {
    const uas = ['WhatsApp/2.23.20.0', 'WhatsApp/2.24.12.78 A'];
    for (const ua of uas) {
      try {
        const resp = await fetch(targetEmbedUrl, {
          headers: {
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          signal: AbortSignal.timeout(4500)
        });
        if (!resp.ok) continue;
        const text = await resp.text();
        if (
          text.length > 200 &&
          !text.includes('<title>Client Challenge</title>') &&
          !text.includes('Document deleted by owner') &&
          (text.includes('outer_page_') || text.includes('docManager.addPage') || text.includes('.jsonp'))
        ) {
          return text;
        }
      } catch {
        // try next UA
      }
    }
    return null;
  })();

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

    // Pre-fetch up to 36 JSONP manifests directly from `html.scribdassets.com` (~39ms each)
    const fastSlice = sortedPageNums.slice(0, 36);
    await Promise.all(
      fastSlice.map(async (pNum) => {
        const entry = parsedAssets.pagesMap.get(pNum)!;
        if (entry.jsonpUrl && (!entry.imageUrl || !entry.inlineText)) {
          try {
            const r = await fetch(entry.jsonpUrl, { signal: AbortSignal.timeout(2500) });
            if (r.ok) {
              const rawJp = await r.text();
              const parsedJp = parseJsonpPageContent(rawJp, assetPrefix);
              if (!entry.imageUrl && parsedJp.imageUrls.length > 0) {
                entry.imageUrl = parsedJp.imageUrls[0];
              }
              if (parsedJp.text && parsedJp.text.length > 5) {
                entry.inlineText = parsedJp.text;
              }
            }
          } catch {
            // Client also resolves any remaining JSONP directly from scribdassets.com
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

  return {
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
    sourceMethod: 'embed-parser'
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET' && req.query?.samples === 'true') {
      return res.status(200).json({ samples: [] });
    }

    let parsedBody: any = {};
    if (req.body) {
      if (typeof req.body === 'string') {
        try {
          parsedBody = JSON.parse(req.body);
        } catch {
          parsedBody = {};
        }
      } else {
        parsedBody = req.body;
      }
    }

    const inputUrl =
      parsedBody?.url ||
      parsedBody?.id ||
      req.query?.url ||
      req.query?.id;

    if (!inputUrl || typeof inputUrl !== 'string') {
      return res.status(400).json({
        error: 'Please provide a valid Scribd URL or Document ID.'
      });
    }

    const doc = await resolveScribdServerless(inputUrl);
    return res.status(200).json({ document: doc });
  } catch (err: any) {
    return res.status(400).json({
      error: err?.message || 'Unable to resolve Scribd document.'
    });
  }
}
