import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : req.body || req.query || {};

    const doc = body.document;
    if (!doc || !Array.isArray(doc.pages)) {
      return res.status(400).json({
        error: 'Document payload is required to generate PDF.'
      });
    }

    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(doc.title || `Scribd Document #${doc.id}`);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const p of doc.pages) {
      const page = pdfDoc.addPage([595.28, 841.89]);
      const cleanText = String(p.text || `Page ${p.pageNumber}`)
        .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
        .slice(0, 1800);
      page.drawText(cleanText, {
        x: 42,
        y: 780,
        size: 10,
        font: fontRegular,
        maxWidth: 510,
        lineHeight: 14,
        color: rgb(0.1, 0.1, 0.15)
      });
    }

    const pdfBytes = await pdfDoc.save();
    const safeFilename =
      String(doc.title || `scribd-${doc.id}`)
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || `scribd-${doc.id}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.byteLength.toString());
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Failed to generate PDF document.'
    });
  }
}
