"""
Analisis kelayakan ekonomi GanoSense untuk satu kelompok tani 50 ha (5 tahun).
Manfaat = selisih nilai panen skenario GanoSense vs konvensional (simulasi terkalibrasi, 30 ulangan).
Semua asumsi biaya ditulis eksplisit di ASUMSI.
"""
import json
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

import simulate_spread as S

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
LUAS = 50                      # ha per kelompok tani
BETA = json.load(open(os.path.join(OUT, "simulasi.json")))["_param"]["beta"]

ASUMSI = {
    "harga_alat": 2_000_000,       # Rp/unit (komponen ±1,5 jt + casing/perakitan)
    "unit_alat": 2,                # unit per 50 ha
    "umur_alat_th": 3,
    "hok": 100_000,                # Rp/hari orang kerja (8 jam)
    "menit_per_pohon": 4,
    "porsi_pindai_bulan": S.CAP,   # 20% pohon per bulan
    "biaya_tindakan": 50_000,      # Rp per pohon (Trichoderma + tenaga) untuk tindakan tambahan
    "data_hp_th": 1_200_000,
    "sensor_perawatan_th": 900_000,
    "diskonto": 0.10,
}


def yearly(effect, reps=30):
    """Selisih nilai panen (Rp/ha) per tahun, B - A, serta jumlah tindakan & positif palsu per ha per tahun."""
    ha = S.N / S.TREES_HA
    diff, tr, fp = [], [], []
    for r in range(reps):
        _, ya, _ = S.run(BETA, "A", 60, np.random.default_rng(100 + r))
        _, yb, (t, f) = S.run(BETA, "B", 60, np.random.default_rng(100 + r), effect=effect)
        d = (yb - ya) * S.KG_TREE_MONTH * S.PRICE / ha
        diff.append(d.reshape(5, 12).sum(1)); tr.append(t / ha / 5); fp.append(f / ha / 5)
    return np.mean(diff, 0), float(np.mean(tr)), float(np.mean(fp))


def arus_kas(benefit_ha_th, tindakan_ha_th, fp_ha_th, harga_faktor=1.0):
    A = ASUMSI
    pohon = S.TREES_HA * LUAS
    jam_pindai = pohon * A["porsi_pindai_bulan"] * 12 * A["menit_per_pohon"] / 60
    jam_fp = fp_ha_th * LUAS * A["menit_per_pohon"] / 60
    biaya = {
        "Tenaga pemindaian": jam_pindai / 8 * A["hok"],
        "Tenaga ukur ulang (positif palsu)": jam_fp / 8 * A["hok"],
        "Penanganan tambahan (Trichoderma + tenaga)": tindakan_ha_th * LUAS * A["biaya_tindakan"],
        "Paket data & HP": A["data_hp_th"],
        "Penggantian sensor & perawatan": A["sensor_perawatan_th"],
    }
    capex = A["harga_alat"] * A["unit_alat"]
    kas = [-capex]
    manfaat = benefit_ha_th * LUAS * harga_faktor
    for y in range(5):
        c = sum(biaya.values()) + (capex if y == A["umur_alat_th"] else 0)   # ganti alat awal tahun ke-4
        kas.append(manfaat[y] - c)
    return biaya, capex, manfaat, np.array(kas)


def indikator(kas, manfaat, biaya_op, capex):
    r = ASUMSI["diskonto"]
    df = np.array([(1 + r) ** -t for t in range(6)])
    pv_manfaat = float((np.r_[0, manfaat] * df).sum())
    pv_biaya = float(capex + sum(biaya_op * df[1:]) + capex * df[4])
    npv = float((kas * df).sum())
    kum = np.cumsum(kas)
    payback = None
    for t in range(1, 6):
        if kum[t] >= 0:
            payback = t - 1 + (-kum[t - 1]) / (kum[t] - kum[t - 1]); break
    return {"npv": npv, "bcr": pv_manfaat / pv_biaya, "roi": (pv_manfaat - pv_biaya) / pv_biaya,
            "payback_th": payback, "pv_manfaat": pv_manfaat, "pv_biaya": pv_biaya, "kumulatif": kum.tolist()}


def main():
    hasil = {}
    for nama, eff in [("pesimis", 0.3), ("dasar", 0.6), ("optimis", 0.75)]:
        ben, tr, fp = yearly(eff)
        biaya, capex, manfaat, kas = arus_kas(ben, tr, fp)
        op = sum(biaya.values())
        hasil[nama] = {"manfaat_ha_th": ben.tolist(), "tindakan_ha_th": tr, "fp_ha_th": fp, "biaya": biaya,
                       "biaya_op_th": op, "capex": capex, "manfaat_50ha": manfaat.tolist(), "kas": kas.tolist(),
                       **indikator(kas, manfaat, op, capex)}
        print(f"{nama:8s} manfaat/ha/th={np.round(ben/1e3)} rb  op={op/1e6:.2f} jt  NPV={hasil[nama]['npv']/1e6:.1f} jt  "
              f"BCR={hasil[nama]['bcr']:.2f}  payback={hasil[nama]['payback_th']}")
    # sensitivitas harga TBS x efek (NPV, BCR)
    sens = {}
    for hp in (3300, 3800, 4300):
        for nama in ("pesimis", "dasar", "optimis"):
            h = hasil[nama]
            ben = np.array(h["manfaat_ha_th"])
            biaya, capex, manfaat, kas = arus_kas(ben, h["tindakan_ha_th"], h["fp_ha_th"], hp / S.PRICE)
            sens[f"{hp}_{nama}"] = indikator(kas, manfaat, sum(biaya.values()), capex)["bcr"]
    hasil["sensitivitas_bcr"] = sens
    hasil["asumsi"] = {**ASUMSI, "luas_ha": LUAS, "harga_tbs": S.PRICE, "tbs_t_ha": S.TBS_T_HA}
    json.dump(hasil, open(os.path.join(OUT, "ekonomi.json"), "w"), indent=1)

    # grafik arus kas kumulatif
    fig, ax = plt.subplots(figsize=(6.4, 3.3), dpi=220)
    col = {"pesimis": "#9bbf8a", "dasar": "#2e7d32", "optimis": "#1b4d20"}
    for nama in ("pesimis", "dasar", "optimis"):
        k = np.array(hasil[nama]["kumulatif"]) / 1e6
        ax.plot(range(6), k, color=col[nama], lw=2, marker="o", ms=4)
        ax.annotate(f"{nama}: {'−' if k[-1] < 0 else ''}Rp{abs(k[-1]):.1f} jt".replace(".", ","), (5, k[-1]), xytext=(6, 0), textcoords="offset points", va="center", fontsize=7.5, color="#243326")
    ax.axhline(0, color="#8a958c", lw=0.8)
    ax.set_xticks(range(6), ["Th-0\n(beli alat)", "Th-1", "Th-2", "Th-3", "Th-4\n(ganti alat)", "Th-5"], fontsize=7.5)
    ax.set_ylabel("Arus kas bersih kumulatif (juta Rp)", fontsize=8)
    ax.tick_params(labelsize=7.5); ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color="#e3e8e2", lw=0.6); ax.set_xlim(-0.2, 6.3)
    ax.set_title("Kelompok tani 50 ha: tambahan arus kas bersih kumulatif (tenaga kerja dihitung)", fontsize=8.5)
    fig.tight_layout(); fig.savefig(os.path.join(OUT, "ekonomi_kumulatif.png")); plt.close(fig)




def tunai():
    """BCR basis tunai: tenaga pemindaian dikerjakan anggota kelompok sendiri (tidak dibayar tunai)."""
    h = json.load(open(os.path.join(OUT, "ekonomi.json")))
    out = {}
    for nama in ("pesimis", "dasar", "optimis"):
        b = h[nama]["biaya"]
        op = sum(v for k, v in b.items() if not k.startswith("Tenaga"))
        man = np.array(h[nama]["manfaat_50ha"]); capex = h[nama]["capex"]
        kas = [-capex] + [man[y] - op - (capex if y == 3 else 0) for y in range(5)]
        out[nama] = indikator(np.array(kas), man, op, capex)["bcr"]
    h["bcr_tunai"] = out
    json.dump(h, open(os.path.join(OUT, "ekonomi.json"), "w"), indent=1)
    print("BCR tunai:", out)


if __name__ == "__main__":
    main()
    tunai()
