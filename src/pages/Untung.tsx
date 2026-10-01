import type { Ringkasan } from '../lib/analysis'
import { KEHILANGAN, rupiah, type AsumsiEkonomi } from '../lib/dss'
import sim from '../lib/simSummary.json'

export function Untung({ rs, asumsi, setAsumsi, luasHa }: {
  rs: Ringkasan; asumsi: AsumsiEkonomi; setAsumsi: (a: AsumsiEkonomi) => void; luasHa: number
}) {
  const sk = sim.skenario
  const f = (k: keyof AsumsiEkonomi, l: string, step = 1) => (
    <div><label className="f">{l}</label>
      <input className="in" type="number" step={step} value={asumsi[k]} onChange={e => setAsumsi({ ...asumsi, [k]: Number(e.target.value) || 0 })} /></div>
  )
  const skala = (sk.B_ganosense_dasar.selisih_vs_A_rp_ha_th) * (asumsi.harga_tbs / sim.param.harga_tbs) * (asumsi.tbs_t_ha / sim.param.tbs_t_ha)
  return (
    <>
      <div className="card">
        <h2>Asumsi kebun Anda</h2>
        <div className="two">
          {f('harga_tbs', 'Harga TBS (Rp/kg)', 10)}
          {f('tbs_t_ha', 'Produksi TBS (ton/ha/tahun)', 0.5)}
          {f('pohon_ha', 'Jumlah pohon per ha')}
        </div>
        <p className="small muted">Harga TBS petani September 2026 berkisar Rp3.300–4.070/kg (penetapan Disbun provinsi). Produktivitas rata-rata sawit rakyat ≈ 3,27 ton CPO/ha/tahun ≈ 15 ton TBS/ha.</p>
      </div>

      <div className="grid stats" style={{ marginBottom: 12 }}>
        <div className="stat"><b>{rupiah(rs.nilaiPohon)}</b><span>nilai panen 1 pohon sehat per tahun</span></div>
        <div className="stat"><b style={{ color: 'var(--berat)' }}>{rupiah(rs.nilaiHilangTahun)}</b><span>panen yang hilang per tahun (pohon sakit saat ini)</span></div>
        <div className="stat"><b style={{ color: 'var(--risk)' }}>{rupiah(rs.nilaiTerancam12)}</b><span>tambahan nilai terancam 12 bulan bila dibiarkan</span></div>
      </div>

      <div className="card">
        <h2>Kenapa deteksi dini bernilai uang?</h2>
        <table className="t">
          <thead><tr><th>Stadium</th><th className="n">Hasil panen hilang</th><th className="n">Rugi/pohon/tahun</th></tr></thead>
          <tbody>
            {(['awal', 'sedang', 'berat'] as const).map(k => (
              <tr key={k}><td>{k[0].toUpperCase() + k.slice(1)}</td><td className="n">{KEHILANGAN[k] * 100}%</td><td className="n">{rupiah(KEHILANGAN[k] * rs.nilaiPohon)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">Pohon yang sudah berat tidak bisa disembuhkan dan menularkan ke tetangganya. Menangani saat masih <b>awal</b> berarti menjaga pohon itu <i>dan</i> 6 pohon di sekelilingnya.</p>
      </div>

      <div className="card">
        <h2>Proyeksi 5 tahun (simulasi model)</h2>
        <table className="t">
          <thead><tr><th>Skenario (blok generasi ke-2)</th><th className="n">Pohon terinfeksi th-5</th><th className="n">Tambahan pendapatan/ha/th</th></tr></thead>
          <tbody>
            <tr><td>Konvensional (sensus visual 6 bulanan)</td><td className="n">{(sk.A_konvensional.inc_60 * 100).toFixed(1)}%</td><td className="n">—</td></tr>
            <tr><td>GanoSense, asumsi pesimis</td><td className="n">{(sk.B_ganosense_pesimis.inc_60 * 100).toFixed(1)}%</td><td className="n">{rupiah(sk.B_ganosense_pesimis.selisih_vs_A_rp_ha_th)}</td></tr>
            <tr><td><b>GanoSense, asumsi dasar</b></td><td className="n"><b>{(sk.B_ganosense_dasar.inc_60 * 100).toFixed(1)}%</b></td><td className="n"><b>{rupiah(sk.B_ganosense_dasar.selisih_vs_A_rp_ha_th)}</b></td></tr>
            <tr><td>GanoSense, asumsi optimis</td><td className="n">{(sk.B_ganosense_optimis.inc_60 * 100).toFixed(1)}%</td><td className="n">{rupiah(sk.B_ganosense_optimis.selisih_vs_A_rp_ha_th)}</td></tr>
          </tbody>
        </table>
        <p className="small">Untuk kebun ini ({luasHa.toFixed(1)} ha) dengan asumsi Anda: ± <b>{rupiah(skala * luasHa)}</b> per tahun (skenario dasar).</p>
        <p className="small muted">Simulasi kisi tanam 10 ha, 30 ulangan, laju penularan dikalibrasi ke data lapangan (3,7% → 42,2% dalam 8 tahun). Ini proyeksi model, bukan jaminan — angka akan divalidasi dengan data riset.</p>
      </div>
    </>
  )
}
