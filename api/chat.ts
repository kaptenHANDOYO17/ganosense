/**
 * POST /api/chat — otak AI GanoBot (model bahasa Claude).
 * Aktif otomatis bila ANTHROPIC_API_KEY diisi di Vercel > Settings > Environment Variables.
 * Tanpa kunci, GanoBot tetap bekerja penuh memakai jawaban lokal (data kebun + basis pengetahuan).
 *
 * Body: { pertanyaan: string, konteks: object, rujukan?: string, riwayat?: {role, content}[] }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

const SISTEM = `Anda adalah GanoBot, asisten di aplikasi GanoSense untuk petani dan kelompok tani sawit di Indonesia.
GanoSense mendeteksi dini penyakit busuk pangkal batang (Ganoderma boninense) dengan alat GanoProbe (sensor gas di pangkal batang),
AI deteksi (status: sehat, infeksi awal, sedang, berat), peta risiko tertular dari pohon tetangga (kontak akar), dan daftar tugas.

Aturan menjawab:
- Bahasa Indonesia sederhana, ramah, seperti penyuluh yang sabar. Maksimal ±150 kata. Boleh daftar bernomor pendek.
- Bila menyangkut kebun pengguna, pakai HANYA angka dari "Data kebun". Jangan mengarang kode pohon atau angka.
- Pengendalian mengikuti PHT Ganoderma: deteksi dini, sanitasi (bongkar & cacah batang sakit, jangan ditinggal utuh),
  Trichoderma, pembumbunan, parit isolasi. Dosis/ukuran teknis: sarankan mengikuti label produk dan penyuluh/PPKS setempat.
- Jika "Rujukan" diberikan, jadikan dasar jawaban dan boleh dijelaskan lebih lengkap.
- Jangan memberi saran yang berbahaya; untuk keputusan membongkar pohon yang tampak sehat, sarankan konfirmasi penyuluh/uji lab.
- Di luar topik sawit/aplikasi: jawab singkat dengan sopan lalu arahkan kembali ke topik kebun.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ jawaban: null })
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(501).json({ jawaban: null, pesan: 'AI belum diaktifkan (ANTHROPIC_API_KEY kosong)' })
  let body: { pertanyaan?: unknown; konteks?: unknown; rujukan?: unknown; riwayat?: unknown }
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {} } catch { return res.status(400).json({ jawaban: null }) }
  const q = typeof body.pertanyaan === 'string' ? body.pertanyaan.trim() : ''
  if (!q || q.length > 600) return res.status(400).json({ jawaban: null, pesan: 'Pertanyaan kosong atau terlalu panjang' })

  const riwayat = Array.isArray(body.riwayat) ? body.riwayat : []
  const messages: { role: 'user' | 'assistant'; content: string }[] = []
  for (const m of riwayat.slice(-6)) {
    const r = m as { role?: string; content?: string }
    if ((r.role === 'user' || r.role === 'assistant') && typeof r.content === 'string' && r.content.trim()) {
      if (messages.length === 0 && r.role === 'assistant') continue          // harus diawali user
      if (messages.length && messages[messages.length - 1].role === r.role) continue
      messages.push({ role: r.role, content: r.content.slice(0, 800) })
    }
  }
  if (messages.length && messages[messages.length - 1].role === 'user') messages.pop()
  const ctx = JSON.stringify(body.konteks ?? {}).slice(0, 3500)
  const rujukan = typeof body.rujukan === 'string' ? `\n\nRujukan: ${body.rujukan.slice(0, 1200)}` : ''
  messages.push({ role: 'user', content: `Data kebun (JSON): ${ctx}${rujukan}\n\nPertanyaan: ${q}` })

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.CHAT_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 600, system: SISTEM, messages }),
    })
    if (!r.ok) return res.status(502).json({ jawaban: null, pesan: `Layanan AI menolak (${r.status})` })
    const j = await r.json() as { content?: { type: string; text?: string }[] }
    const teks = (j.content ?? []).filter(c => c.type === 'text').map(c => c.text ?? '').join('\n').trim()
    return res.status(200).json({ jawaban: teks || null })
  } catch {
    return res.status(502).json({ jawaban: null, pesan: 'Tidak bisa menghubungi layanan AI' })
  }
}
