import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MODEL_META } from '../src/lib/model/inference'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true, layanan: 'GanoSense API', waktu: new Date().toISOString(),
    supabase_terhubung: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
    model: { sumber_data: MODEL_META.sumber_data, n_pohon: MODEL_META.n_pohon },
  })
}
