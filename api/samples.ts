import { getCuratedSamples } from '../src/lib/scribdCore';

export default async function handler(_req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json({ samples: getCuratedSamples() });
}
