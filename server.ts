import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  resolveScribdDocument,
  generateDocumentPdf,
  getCuratedSamples,
  getRandomHeaders,
  buildGoogleTranslateEdgeUrl,
  ScribdDocumentData
} from './src/lib/scribdCore';
import {
  generateWordPressPluginZip,
  DEFAULT_WP_PLUGIN_CONFIG,
  WpPluginBuildConfig
} from './src/lib/wpPluginBuilder';

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
      const allowedHosts = ['scribd.com', 'scribdassets.com', 'wsrv.nl', 'translate.goog'];
      const isAllowed = allowedHosts.some((h) => parsedUrl.hostname.endsWith(h));
      if (!isAllowed) {
        res.status(403).json({ error: 'Domain not allowed' });
        return;
      }

      const fetchUpstream = async (urlToFetch: string) => {
        const upstream = await fetch(urlToFetch, {
          headers: getRandomHeaders(urlToFetch),
          signal: AbortSignal.timeout(8000)
        });
        if (!upstream.ok) {
          throw new Error(`Upstream returned ${upstream.status}`);
        }
        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        const buffer = Buffer.from(await upstream.arrayBuffer());
        if (contentType.includes('text/html') && buffer.length < 6000) {
          const sampleText = buffer.toString('utf8');
          if (sampleText.includes('<title>Client Challenge</title>') || sampleText.includes('/_fs-ch-')) {
            throw new Error('Fastly Client Challenge encountered');
          }
        }
        return { contentType, buffer };
      };

      let result: { contentType: string; buffer: Buffer };
      if (parsedUrl.hostname.endsWith('scribd.com')) {
        const gEdgeUrl = buildGoogleTranslateEdgeUrl(normalizedUrl);
        result = await Promise.any([fetchUpstream(normalizedUrl), fetchUpstream(gEdgeUrl)]);
      } else {
        result = await fetchUpstream(normalizedUrl);
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(result.buffer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Asset proxy error';
      res.status(503).json({ error: msg });
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

  // ============================================================================
  // ADMIN-ONLY REST API v1 (/api/v1/*) — Accessible ONLY with Admin Panel API Key
  // ============================================================================
  let serverApiConfig = {
    enabled: true,
    masterApiKey: 'sk_admin_scribd_live_9f8e7d6c5b4a3f2e1d0c',
    requireApiKey: true,
    rateLimitPerMinute: 120,
    validKeys: new Set<string>([
      'sk_admin_scribd_live_9f8e7d6c5b4a3f2e1d0c',
      'sk_admin_primary_7a6b5c4d3e2f1a0b9c8d'
    ])
  };

  const serverDocsVault: Array<{
    id: string;
    docId: string;
    title: string;
    pageCount: number;
    originalUrl: string;
    embedUrl: string;
    fetchedAt: string;
    source: string;
  }> = [
    {
      id: 'doc-rec-1',
      docId: '991278283',
      title: '2026 Grade 12 Investigation Term 1 Mathematics',
      pageCount: 9,
      originalUrl: 'https://www.scribd.com/document/991278283/2026-Grade-12-Investigation-Term-1',
      embedUrl: 'https://www.scribd.com/embeds/991278283/content?start_page=1&view_mode=scroll&access_key=key-fFexxf7r1bzEfWu3HKwf',
      fetchedAt: new Date().toISOString(),
      source: 'admin'
    },
    {
      id: 'doc-rec-2',
      docId: '894860339',
      title: 'Technical Engineering Reference & Study Manual',
      pageCount: 14,
      originalUrl: 'https://www.scribd.com/document/894860339/Document-2',
      embedUrl: 'https://www.scribd.com/embeds/894860339/content?start_page=1&view_mode=scroll&access_key=key-fFexxf7r1bzEfWu3HKwf',
      fetchedAt: new Date().toISOString(),
      source: 'api'
    }
  ];

  // Sync API keys & settings from Admin Panel
  app.post('/api/admin/sync-api-config', (req, res) => {
    try {
      const body = req.body || {};
      const keys = new Set<string>();
      if (body.masterApiKey) keys.add(String(body.masterApiKey));
      if (Array.isArray(body.apiKeys)) {
        for (const k of body.apiKeys) {
          if (k && k.active && k.key) {
            keys.add(String(k.key));
          }
        }
      }
      serverApiConfig = {
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : true,
        masterApiKey: body.masterApiKey || serverApiConfig.masterApiKey,
        requireApiKey: body.requireApiKey !== undefined ? Boolean(body.requireApiKey) : true,
        rateLimitPerMinute: Number(body.rateLimitPerMinute) || 120,
        validKeys: keys.size > 0 ? keys : serverApiConfig.validKeys
      };
      res.json({ ok: true, activeKeyCount: serverApiConfig.validKeys.size });
    } catch (err) {
      res.status(400).json({ error: 'Invalid API config payload' });
    }
  });

  // Helper middleware to enforce Admin Panel API Key
  const verifyAdminApiKey = (req: express.Request, res: express.Response): boolean => {
    if (!serverApiConfig.enabled) {
      res.status(503).json({
        success: false,
        error: 'API access is currently disabled by Administrator in the Admin Panel.'
      });
      return false;
    }

    if (!serverApiConfig.requireApiKey) {
      return true;
    }

    const headerKey =
      (req.headers['x-api-key'] as string) ||
      (req.headers['authorization']?.replace(/^Bearer\s+/i, '') as string) ||
      (req.query.api_key as string) ||
      (req.body?.api_key as string);

    if (!headerKey || !serverApiConfig.validKeys.has(headerKey.trim())) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Valid Admin Panel API Key required (provide x-api-key header, Authorization: Bearer <key>, or ?api_key=). Accessible only from Admin Panel.'
      });
      return false;
    }
    return true;
  };

  // 1. GET /api/v1/status
  app.get('/api/v1/status', (req, res) => {
    if (!verifyAdminApiKey(req, res)) return;
    res.json({
      success: true,
      service: 'ScribdDownloader Admin REST API',
      version: '1.0.0',
      accessScope: 'admin-panel-only',
      rateLimitPerMinute: serverApiConfig.rateLimitPerMinute,
      documentsInVault: serverDocsVault.length,
      timestamp: new Date().toISOString()
    });
  });

  // 2. GET & POST /api/v1/resolve
  const handleApiV1Resolve = async (req: express.Request, res: express.Response) => {
    if (!verifyAdminApiKey(req, res)) return;
    try {
      const url =
        (req.body?.url as string) ||
        (req.body?.id as string) ||
        (req.query.url as string) ||
        (req.query.id as string);

      if (!url) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: "url" or "id" (Scribd Document URL or numeric ID).'
        });
        return;
      }

      const startMs = Date.now();
      const doc = await resolveScribdDocument(url);
      const elapsedMs = Date.now() - startMs;

      // Record in Admin Documents Vault
      if (!serverDocsVault.some((d) => d.docId === doc.id)) {
        serverDocsVault.unshift({
          id: `doc-${Date.now()}`,
          docId: doc.id,
          title: doc.title,
          pageCount: doc.pages.length,
          originalUrl: doc.originalUrl,
          embedUrl: doc.embedUrl,
          fetchedAt: new Date().toISOString(),
          source: 'api'
        });
      }

      res.json({
        success: true,
        elapsedMs,
        document: {
          id: doc.id,
          title: doc.title,
          pageCount: doc.pages.length,
          originalUrl: doc.originalUrl,
          embedUrl: doc.embedUrl,
          pages: doc.pages.map((p) => ({
            pageNumber: p.pageNumber,
            imageUrl: p.imageUrl || null,
            jsonpUrl: p.jsonpUrl || null,
            textPreview: (p.text || '').slice(0, 300)
          }))
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resolve Scribd document.';
      res.status(400).json({ success: false, error: message });
    }
  };

  app.get('/api/v1/resolve', handleApiV1Resolve);
  app.post('/api/v1/resolve', handleApiV1Resolve);

  // 3. GET & POST /api/v1/download-pdf
  const handleApiV1DownloadPdf = async (req: express.Request, res: express.Response) => {
    if (!verifyAdminApiKey(req, res)) return;
    try {
      const url =
        (req.body?.url as string) ||
        (req.body?.id as string) ||
        (req.query.url as string) ||
        (req.query.id as string);
      const pageSize = ((req.body?.pageSize || req.query.pageSize || 'A4') as string).toUpperCase() === 'LETTER'
        ? 'LETTER'
        : 'A4';

      if (!url) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: "url" or "id".'
        });
        return;
      }

      const doc = await resolveScribdDocument(url);
      const pdfBytes = await generateDocumentPdf(doc, {
        includeCoverPage: false,
        includeMetadataFooter: false,
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
      const message = err instanceof Error ? err.message : 'Failed to compile PDF via API.';
      res.status(500).json({ success: false, error: message });
    }
  };

  app.get('/api/v1/download-pdf', handleApiV1DownloadPdf);
  app.post('/api/v1/download-pdf', handleApiV1DownloadPdf);

  // 4. GET /api/v1/documents (Admin Documents Vault list)
  app.get('/api/v1/documents', (req, res) => {
    if (!verifyAdminApiKey(req, res)) return;
    res.json({
      success: true,
      total: serverDocsVault.length,
      documents: serverDocsVault
    });
  });

  // 5. GET & POST /api/admin/download-wp-plugin (Download Installable WordPress Plugin .zip)
  const handleDownloadWpPlugin = (req: express.Request, res: express.Response) => {
    try {
      const customCfg: Partial<WpPluginBuildConfig> =
        req.method === 'POST' && req.body && typeof req.body === 'object' ? req.body : {};
      const mergedCfg: WpPluginBuildConfig = {
        ...DEFAULT_WP_PLUGIN_CONFIG,
        remoteApiKey: serverApiConfig.masterApiKey,
        ...customCfg
      };
      const zipBytes = generateWordPressPluginZip(mergedCfg);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="scribd-downloader-pro.zip"');
      res.setHeader('Content-Length', zipBytes.byteLength.toString());
      res.send(Buffer.from(zipBytes));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to build WordPress plugin zip';
      res.status(500).json({ error: msg });
    }
  };

  app.get('/api/admin/download-wp-plugin', handleDownloadWpPlugin);
  app.post('/api/admin/download-wp-plugin', handleDownloadWpPlugin);

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
