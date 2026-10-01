"""
GanoSense ML core
=================
Satu file berisi:
  1. Definisi fitur (HARUS identik dengan src/lib/model/features.ts)
  2. Generator data sintetis berbasis literatur (dipakai HANYA untuk model baseline
     sebelum data lapangan tersedia)
  3. Utilitas ekspor Random Forest ke JSON agar bisa dijalankan di browser / Vercel

Dasar parameter generator (lihat proposal Bab II):
  - Senyawa penanda infeksi: turunan benzena (etilbenzena, xilena, benzaldehida),
    C8 (1-okten-3-ol, 3-oktanon), NH3 meningkat, CO2 menurun
    (Kresnawaty dkk., 2024; Zainol Hilmi dkk., 2019)
  - Respons sensor gas naik bertahap sehat < sedang < sakit
    (Muhaimin dkk., 2023; Hadary dkk., 2024)
  - E-nose mampu membedakan 4 tingkat infeksi dengan akurasi 89,6-97,1%
    (Kresnawaty dkk., 2020) -> generator dibuat TUMPANG TINDIH agar model
    tidak terlihat "terlalu sempurna".
  - Sensor MOS sensitif terhadap kelembapan & suhu -> disimulasikan sebagai
    gangguan (confounder) yang harus dikompensasi fitur rasio.

PENTING: angka akurasi dari data sintetis BUKAN klaim performa lapangan.
Riset BPDP justru bertujuan mengganti data ini dengan data lapangan berlabel
(sensus stadium + isolasi media selektif Ganoderma/GSM).
"""
from __future__ import annotations

import json
import numpy as np
import pandas as pd

CLASSES = ["sehat", "awal", "sedang", "berat"]

# Input mentah yang dikirim perangkat / diisi manual
RAW_COLUMNS = [
    "r0_mq138", "rs_mq138", "r0_mq135", "rs_mq135", "r0_tgs2602", "rs_tgs2602",
    "slope_mq138", "slope_tgs2602", "temp_c", "rh_pct", "rh_ambient",
    "soil_moist", "soil_temp", "visual_score", "generasi", "umur_th",
]

FEATURES = [
    "resp_mq138", "resp_mq135", "resp_tgs2602",
    "slope_mq138", "slope_tgs2602",
    "ratio_138_135", "ratio_2602_135",
    "temp_c", "rh_pct", "d_rh",
    "soil_moist", "soil_temp",
    "visual_score", "generasi", "umur_th",
]


def compute_features(raw: pd.DataFrame) -> pd.DataFrame:
    """Resistansi -> respons relatif. Rumus sama persis dengan features.ts."""
    f = pd.DataFrame(index=raw.index)
    f["resp_mq138"] = raw["r0_mq138"] / raw["rs_mq138"] - 1.0
    f["resp_mq135"] = raw["r0_mq135"] / raw["rs_mq135"] - 1.0
    f["resp_tgs2602"] = raw["r0_tgs2602"] / raw["rs_tgs2602"] - 1.0
    f["slope_mq138"] = raw["slope_mq138"]
    f["slope_tgs2602"] = raw["slope_tgs2602"]
    f["ratio_138_135"] = f["resp_mq138"] / (f["resp_mq135"].abs() + 0.05)
    f["ratio_2602_135"] = f["resp_tgs2602"] / (f["resp_mq135"].abs() + 0.05)
    f["temp_c"] = raw["temp_c"]
    f["rh_pct"] = raw["rh_pct"]
    f["d_rh"] = raw["rh_pct"] - raw["rh_ambient"]
    f["soil_moist"] = raw["soil_moist"]
    f["soil_temp"] = raw["soil_temp"]
    f["visual_score"] = raw["visual_score"]
    f["generasi"] = raw["generasi"]
    f["umur_th"] = raw["umur_th"]
    return f[FEATURES]


# ----------------------------------------------------------------------------
# Generator data sintetis
# ----------------------------------------------------------------------------
VOC_LOGMEAN = {0: np.log(0.06), 1: np.log(0.20), 2: np.log(0.50), 3: np.log(0.90)}
VOC_LOGSD = {0: 0.55, 1: 0.50, 2: 0.42, 3: 0.38}
NH3_EXTRA = {0: 0.00, 1: 0.04, 2: 0.12, 3: 0.22}   # NH3 naik saat infeksi
VISUAL_P = {
    0: ([0, 1], [0.90, 0.10]),          # 10% sehat tampak kuning (defisiensi hara)
    1: ([0, 1], [0.78, 0.22]),          # stadium awal: umumnya belum bergejala
    2: ([1, 2, 3], [0.35, 0.45, 0.20]),
    3: ([2, 3, 4], [0.15, 0.45, 0.40]),
}


def simulate_tree_measurements(cls: int, n_meas: int, rng: np.random.Generator,
                               tree_id: str) -> list[dict]:
    """Satu pohon diukur berulang; ada efek acak per-pohon (klon, umur, tanah)."""
    tree_offset = rng.normal(0, 0.25)            # efek acak pohon (log-scale)
    generasi = int(rng.choice([1, 2, 3], p=[0.25, 0.5, 0.25] if cls == 0 else [0.1, 0.5, 0.4]))
    umur = float(np.clip(rng.normal(14 if cls < 2 else 17, 4), 4, 28))
    vis_vals, vis_p = VISUAL_P[cls]
    visual = int(rng.choice(vis_vals, p=vis_p))
    decay_site = rng.random() < (0.15 if cls == 0 else 0.08)   # tumpukan pelepah/janjang busuk
    rows = []
    for m in range(n_meas):
        voc = float(np.exp(rng.normal(VOC_LOGMEAN[cls] + tree_offset, VOC_LOGSD[cls])))
        temp = float(rng.uniform(24, 34))
        rh_amb = float(rng.uniform(60, 92))
        d_rh = float(np.clip(rng.normal(5, 3.5), -3, 18))
        rh = float(min(99.0, rh_amb + d_rh))
        f_t = 1.0 - 0.012 * (temp - 28)
        hum = d_rh / 10.0
        # respons dasar tiap sensor (selektivitas berbeda)
        r138 = 1.00 * voc * f_t + 0.030 * hum
        r135 = 0.55 * voc * f_t + NH3_EXTRA[cls] * rng.uniform(0.5, 1.5) + 0.060 * hum
        r2602 = 0.85 * voc * f_t + 0.5 * NH3_EXTRA[cls] + 0.045 * hum
        if decay_site and rng.random() < 0.7:
            dec = float(np.exp(rng.normal(np.log(0.22), 0.45)))
            r135 += dec
            r2602 += 0.65 * dec
            r138 += 0.22 * dec
        # derau sensor
        r138 = max(-0.05, r138 * rng.normal(1, 0.12) + rng.normal(0, 0.02))
        r135 = max(-0.05, r135 * rng.normal(1, 0.12) + rng.normal(0, 0.02))
        r2602 = max(-0.05, r2602 * rng.normal(1, 0.12) + rng.normal(0, 0.02))
        rise = rng.uniform(1.2, 2.2) / (1 + 0.15 * cls)
        s138 = max(0.0, r138 / rise * rng.normal(1, 0.15))
        s2602 = max(0.0, r2602 / rise * rng.normal(1, 0.15))
        r0 = rng.uniform(20, 80, size=3)
        rows.append(dict(
            tree_id=tree_id, label=cls,
            r0_mq138=r0[0], rs_mq138=r0[0] / (1 + r138),
            r0_mq135=r0[1], rs_mq135=r0[1] / (1 + r135),
            r0_tgs2602=r0[2], rs_tgs2602=r0[2] / (1 + r2602),
            slope_mq138=s138, slope_tgs2602=s2602,
            temp_c=temp, rh_pct=rh, rh_ambient=rh_amb,
            soil_moist=float(np.clip(rng.normal(32 + 2 * (cls > 0), 6), 12, 55)),
            soil_temp=float(rng.uniform(25.5, 30.5)),
            visual_score=visual, generasi=generasi, umur_th=round(umur, 1),
        ))
    return rows


def generate_dataset(n_trees: int = 400, n_meas: int = 8, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    props = [0.45, 0.20, 0.20, 0.15]
    labels = rng.choice(4, size=n_trees, p=props)
    rows = []
    for i, c in enumerate(labels):
        rows += simulate_tree_measurements(int(c), n_meas, rng, f"T{i:04d}")
    return pd.DataFrame(rows)


# ----------------------------------------------------------------------------
# Ekspor Random Forest -> JSON ringkas
# ----------------------------------------------------------------------------
def export_forest(model, path: str, meta: dict) -> None:
    trees = []
    for est in model.estimators_:
        t = est.tree_
        values = t.value[:, 0, :]
        values = values / values.sum(axis=1, keepdims=True)
        trees.append({
            "f": t.feature.astype(int).tolist(),
            "t": [round(float(x), 5) for x in t.threshold],
            "l": t.children_left.astype(int).tolist(),
            "r": t.children_right.astype(int).tolist(),
            "v": [[round(float(p), 4) for p in row] for row in values],
        })
    out = {"type": "random_forest", "classes": CLASSES, "features": FEATURES,
           "meta": meta, "trees": trees}
    with open(path, "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
