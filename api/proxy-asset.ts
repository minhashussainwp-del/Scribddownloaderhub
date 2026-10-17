import { getRandomHeaders } from '../src/lib/scribdCore';

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
    const parsedUrl = new URL(targetUrl);
    const allowedHosts = ['scribd.com', 'scribdassets.com', 'wsrv.nl'];
    const isAllowed = allowedHosts.some((host) => parsedUrl.hostname.endsWith(host));
    if (!isAllowed) {
      return res.status(403).json({ error: 'Host not permitted by asset proxy' });
    }

    const upstream = await fetch(targetUrl, {
      headers: getRandomHeaders('https://www.scribd.com/'),
      signal: AbortSignal.timeout(10000)
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream responded with ${upstream.status}` });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await upstream.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Proxy fetch failed' });
  }
}
