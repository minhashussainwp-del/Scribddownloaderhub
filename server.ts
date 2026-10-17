import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  resolveScribdDocument,
  generateDocumentPdf,
  getCuratedSamples,
  getRandomHeaders,
  ScribdDocumentData
} from './src/lib/scribdCore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  app.get('/api/samples', (_req, res) => {
    res.json({ samples: getCuratedSamples() });
  });

  // Proxy Scribd CDN assets (page images & JSONP) to avoid browser CORS errors
  app.get('/api/proxy-asset', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      res.status(400).json({ error: 'Missing url parameter' });
      return;
    }

    try {
      const normalizedUrl = targetUrl.replace(
        /^http:\/\/html\.scribd\.com\//i,
        'https://html.scribdassets.com/'
      );
      const parsedUrl = new URL(normalizedUrl);
      const allowedHosts = ['scribd.com', 'scribdassets.com', 'wsrv.nl'];
      const isAllowed = allowedHosts.some((h) => parsedUrl.hostname.endsWith(h));
      if (!isAllowed) {
        res.status(403).json({ error: 'Domain not allowed' });
        return;
      }

      const upstream = await fetch(normalizedUrl, {
        headers: getRandomHeaders(normalizedUrl),
        signal: AbortSignal.timeout(12000)
      });

      if (!upstream.ok) {
        res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` });
        return;
      }

      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      const buffer = Buffer.from(await upstream.arrayBuffer());

      if (contentType.includes('text/html') && buffer.length < 6000) {
        const sampleText = buffer.toString('utf8');
        if (sampleText.includes('<title>Client Challenge</title>') || sampleText.includes('/_fs-ch-')) {
          res.status(503).json({ error: 'Fastly Client Challenge encountered' });
          return;
        }
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Asset proxy error';
      res.status(500).json({ error: msg });
    }
  });

  // Resolve Scribd URL or Document ID
  app.post('/api/resolve', async (req, res) => {
    try {
      const parsedBody =
        typeof req.body === 'string'
          ? JSON.parse(req.body || '{}')
          : req.body || {};
      const url = parsedBody.url || parsedBody.id || (req.query.url as string) || (req.query.id as string);
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'Please provide a valid Scribd URL or Document ID.' });
        return;
      }
      const doc = await resolveScribdDocument(url);
      res.json({ document: doc });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resolve Scribd document.';
      res.status(400).json({ error: message });
    }
  });

  app.get('/api/resolve', async (req, res) => {
    try {
      const url = (req.query.url as string) || (req.query.id as string);
      if (!url) {
        res.status(400).json({ error: 'Missing url or id query parameter.' });
        return;
      }
      const doc = await resolveScribdDocument(url);
      res.json({ document: doc });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resolve Scribd document.';
      res.status(400).json({ error: message });
    }
  });

  // Generate & Download Original High-Res PDF Binary
  app.post('/api/download-pdf', async (req, res) => {
    try {
      const {
        url,
        document: providedDoc,
        includeCoverPage = false,
        includeMetadataFooter = false,
        pageSize = 'A4'
      } = req.body as {
        url?: string;
        document?: ScribdDocumentData;
        includeCoverPage?: boolean;
        includeMetadataFooter?: boolean;
        pageSize?: 'A4' | 'LETTER';
      };

      const doc = providedDoc || (url ? await resolveScribdDocument(url) : null);
      if (!doc) {
        res.status(400).json({ error: 'Document data or Scribd URL is required to build PDF.' });
        return;
      }

      const pdfBytes = await generateDocumentPdf(doc, {
        includeCoverPage,
        includeMetadataFooter,
        pageSize
      });

      const safeFilename =
        doc.title
          .replace(/[^a-zA-Z0-9_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 60) || `scribd-${doc.id}`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.pdf"`);
      res.setHeader('Content-Length', pdfBytes.byteLength.toString());
      res.send(Buffer.from(pdfBytes));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ScribdFlow server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
