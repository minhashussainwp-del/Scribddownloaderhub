import { resolveScribdDocument, getCuratedSamples } from '../src/lib/scribdCore';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET' && req.query?.samples === 'true') {
      return res.status(200).json({ samples: getCuratedSamples() });
    }

    const inputUrl =
      req.method === 'POST'
        ? req.body?.url || req.body?.id
        : req.query?.url || req.query?.id;

    if (!inputUrl || typeof inputUrl !== 'string') {
      return res.status(400).json({
        error: 'Please provide a valid Scribd URL or Document ID.'
      });
    }

    const doc = await resolveScribdDocument(inputUrl);
    return res.status(200).json({ document: doc });
  } catch (err: any) {
    return res.status(400).json({
      error: err?.message || 'Unable to resolve Scribd document.'
    });
  }
}
