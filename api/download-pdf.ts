import { resolveScribdDocument, generateDocumentPdf } from '../src/lib/scribdCore';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = req.method === 'POST' ? req.body || {} : req.query || {};
    const {
      url,
      document: providedDoc,
      includeCoverPage = true,
      includeMetadataFooter = true,
      pageSize = 'A4'
    } = body;

    const doc = providedDoc || (url ? await resolveScribdDocument(String(url)) : null);
    if (!doc) {
      return res.status(400).json({
        error: 'Document payload or Scribd URL is required to generate PDF.'
      });
    }

    const pdfBytes = await generateDocumentPdf(doc, {
      includeCoverPage: Boolean(includeCoverPage),
      includeMetadataFooter: Boolean(includeMetadataFooter),
      pageSize: pageSize === 'LETTER' ? 'LETTER' : 'A4'
    });

    const safeFilename =
      String(doc.title || `scribd-${doc.id}`)
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || `scribd-${doc.id}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.byteLength.toString());
    res.setHeader('Cache-Control', 'public, max-age=3600');

    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Failed to generate PDF document.'
    });
  }
}
