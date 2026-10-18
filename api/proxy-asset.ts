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

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function buildGoogleTranslateEdgeUrl(scribdUrl: string): string {
  try {
    const u = new URL(scribdUrl);
    const gHost = u.hostname.replace(/\./g, '-') + '.translate.goog';
    const sep = u.search ? '&' : '?';
    return `https://${gHost}${u.pathname}${u.search}${sep}_x_tr_sl=auto&_x_tr_tl=en&_x_tr_hl=en`;
  } catch {
    return scribdUrl;
  }
}

function getStealthHeaders(targetUrl = ''): Record<string, string> {
  if (targetUrl.includes('translate.goog')) {
    return {
      'User-Agent': BROWSER_UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    };
  }

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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query?.url as string;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  try {
    const normalizedUrl = targetUrl.replace(
      /^http:\/\/html\.scribd\.com\//i,
      'https://html.scribdassets.com/'
    );
    const parsedUrl = new URL(normalizedUrl);
    const allowedHosts = ['scribd.com', 'scribdassets.com', 'wsrv.nl', 'translate.goog'];
    const isAllowed = allowedHosts.some((host) => parsedUrl.hostname.endsWith(host));
    if (!isAllowed) {
      return res.status(403).json({ error: 'Host not permitted by asset proxy' });
    }

    const fetchUpstream = async (urlToFetch: string) => {
      const r = await fetch(urlToFetch, {
        headers: getStealthHeaders(urlToFetch),
        signal: AbortSignal.timeout(7000)
      });
      if (!r.ok) throw new Error(`Status ${r.status}`);
      const contentType = r.headers.get('content-type') || 'application/octet-stream';
      const buf = Buffer.from(await r.arrayBuffer());
      if (contentType.includes('text/html') && buf.length < 6000) {
        const sampleText = buf.toString('utf8');
        if (sampleText.includes('<title>Client Challenge</title>') || sampleText.includes('/_fs-ch-')) {
          throw new Error('Fastly Client Challenge encountered');
        }
      }
      return { contentType, buf };
    };

    let result: { contentType: string; buf: Buffer };
    if (parsedUrl.hostname.endsWith('scribd.com')) {
      const gEdgeUrl = buildGoogleTranslateEdgeUrl(normalizedUrl);
      result = await Promise.any([fetchUpstream(normalizedUrl), fetchUpstream(gEdgeUrl)]);
    } else {
      result = await fetchUpstream(normalizedUrl);
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(result.buf);
  } catch (err: any) {
    return res.status(503).json({ error: err?.message || 'Proxy fetch failed' });
  }
}
