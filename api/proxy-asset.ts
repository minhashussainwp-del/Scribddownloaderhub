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

function getStealthHeaders(targetUrl = '') {
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
    const allowedHosts = ['scribd.com', 'scribdassets.com', 'wsrv.nl'];
    const isAllowed = allowedHosts.some((host) => parsedUrl.hostname.endsWith(host));
    if (!isAllowed) {
      return res.status(403).json({ error: 'Host not permitted by asset proxy' });
    }

    const upstream = await fetch(normalizedUrl, {
      headers: getStealthHeaders(normalizedUrl),
      signal: AbortSignal.timeout(8500)
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream responded with ${upstream.status}` });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await upstream.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    if (contentType.includes('text/html') && buf.length < 6000) {
      const sampleText = buf.toString('utf8');
      if (sampleText.includes('<title>Client Challenge</title>') || sampleText.includes('/_fs-ch-')) {
        return res.status(503).json({ error: 'Fastly Client Challenge encountered' });
      }
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(buf);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Proxy fetch failed' });
  }
}
