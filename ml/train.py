"""
Latih & evaluasi model GanoSense.

Pemakaian:
  python train.py                       # pakai data sintetis baseline
  python train.py --csv data/lapangan.csv   # pakai data lapangan berlabel

Format CSV lapangan: kolom RAW_COLUMNS + tree_id + label (0..3 atau nama kelas).
Hasil: ../src/lib/model/forest.json (langsung dipakai web & API Vercel)
"""
import argparse
import json
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score,
                             recall_score)
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from ganosense_ml import (CLASSES, FEATURES, compute_features, export_forest,
                          generate_dataset)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
MODEL_DIR = os.path.join(HERE, "..", "src", "lib", "model")


def rf():
    return RandomForestClassifier(n_estimators=60, max_depth=9, min_samples_leaf=4,
                                  class_weight="balanced_subsample", random_state=7, n_jobs=-1)


def threshold_baseline(train_x, train_y, test_x):
    """Meniru pendekatan ambang tunggal (satu sensor, tanpa AI) seperti
    Muhaimin dkk. (2023) / Hadary dkk. (2024): ambang dicari dari data latih."""
    s = train_x["resp_mq138"].values
    th = [np.median([np.percentile(s[train_y == k], 90), np.percentile(s[train_y == k + 1], 10)])
          for k in range(3)]
    th = np.maximum.accumulate(th)
    return np.digitize(test_x["resp_mq138"].values, th)


def visual_baseline(test_x):
    """Sensus visual konvensional: stadium awal tak terlihat."""
    v = test_x["visual_score"].values
    return np.select([v == 0, v <= 2, v >= 3], [0, 2, 3])


def summarize(y, p):
    inf_true, inf_pred = (y > 0).astype(int), (p > 0).astype(int)
    rec = recall_score(y, p, labels=[0, 1, 2, 3], average=None, zero_division=0)
    return {
        "akurasi": accuracy_score(y, p),
        "macro_f1": f1_score(y, p, average="macro"),
        "recall_sehat": rec[0], "recall_awal": rec[1], "recall_sedang": rec[2], "recall_berat": rec[3],
        "sensitivitas_terinfeksi": recall_score(inf_true, inf_pred),
        "spesifisitas": recall_score(1 - inf_true, 1 - inf_pred),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=None)
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    if args.csv:
        df = pd.read_csv(args.csv)
        if df["label"].dtype == object:
            df["label"] = df["label"].map({c: i for i, c in enumerate(CLASSES)})
        source = f"lapangan:{os.path.basename(args.csv)}"
    else:
        df = generate_dataset()
        df.to_csv(os.path.join(HERE, "data", "sintetis_baseline.csv"), index=False)
        source = "sintetis-berbasis-literatur (BUKAN data lapangan)"

    X, y, g = compute_features(df), df["label"].values, df["tree_id"].values
    print(f"Data: {len(df)} pengukuran, {df['tree_id'].nunique()} pohon, sumber={source}")

    # --- Validasi silang berbasis POHON (mencegah kebocoran data antar-pengukuran) ---
    gkf = GroupKFold(n_splits=5)
    preds = {"GanoSense RF (multisensor+fitur)": np.zeros_like(y),
             "Regresi logistik (multisensor)": np.zeros_like(y),
             "Ambang 1 sensor (tanpa AI)": np.zeros_like(y),
             "Sensus visual konvensional": np.zeros_like(y)}
    for tr, te in gkf.split(X, y, g):
        m = rf().fit(X.iloc[tr], y[tr])
        preds["GanoSense RF (multisensor+fitur)"][te] = m.predict(X.iloc[te])
        lr = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced"))
        preds["Regresi logistik (multisensor)"][te] = lr.fit(X.iloc[tr], y[tr]).predict(X.iloc[te])
        preds["Ambang 1 sensor (tanpa AI)"][te] = threshold_baseline(X.iloc[tr], y[tr], X.iloc[te])
        preds["Sensus visual konvensional"][te] = visual_baseline(X.iloc[te])

    table = {k: summarize(y, p) for k, p in preds.items()}
    res = pd.DataFrame(table).T
    print(res.round(3).to_string())

    cm = confusion_matrix(y, preds["GanoSense RF (multisensor+fitur)"])

    # --- Latih model final pada seluruh data & ekspor ---
    final = rf().fit(X, y)
    imp = sorted(zip(FEATURES, final.feature_importances_), key=lambda t: -t[1])
    meta = {"sumber_data": source, "n_pengukuran": int(len(df)), "n_pohon": int(df["tree_id"].nunique()),
            "cv": "GroupKFold 5 lipatan (per pohon)",
            "cv_metrics": {k: round(float(v), 4) for k, v in table["GanoSense RF (multisensor+fitur)"].items()},
            "feature_importance": {k: round(float(v), 4) for k, v in imp}}
    export_forest(final, os.path.join(MODEL_DIR, "forest.json"), meta)

    # vektor uji paritas Python <-> TypeScript
    idx = np.random.default_rng(0).choice(len(df), 50, replace=False)
    raw_cols = [c for c in df.columns if c not in ("tree_id", "label")]
    vec = [{"raw": {c: float(df.iloc[i][c]) for c in raw_cols},
            "proba": [round(float(p), 6) for p in final.predict_proba(X.iloc[[i]])[0]]} for i in idx]
    json.dump(vec, open(os.path.join(MODEL_DIR, "testvectors.json"), "w"))

    json.dump({"tabel_banding": {k: {kk: round(float(vv), 4) for kk, vv in v.items()} for k, v in table.items()},
               "confusion_matrix": cm.tolist(), "meta": meta},
              open(os.path.join(OUT, "metrics.json"), "w"), indent=2)

    # --- Gambar ---
    fig, ax = plt.subplots(figsize=(4.6, 3.9), dpi=200)
    cmn = cm / cm.sum(axis=1, keepdims=True)
    ax.imshow(cmn, cmap="Greens", vmin=0, vmax=1)
    for i in range(4):
        for j in range(4):
            ax.text(j, i, f"{cmn[i, j]*100:.0f}%", ha="center", va="center",
                    color="white" if cmn[i, j] > 0.55 else "#1b3a1b", fontsize=9)
    ax.set_xticks(range(4), [c.capitalize() for c in CLASSES]); ax.set_yticks(range(4), [c.capitalize() for c in CLASSES])
    ax.set_xlabel("Prediksi model"); ax.set_ylabel("Kondisi sebenarnya")
    ax.set_title("Matriks kebingungan (data sintetis)", fontsize=10)
    fig.tight_layout(); fig.savefig(os.path.join(OUT, "confusion_matrix.png")); plt.close(fig)

    fig, ax = plt.subplots(figsize=(6, 3.4), dpi=200)
    names = [k for k, _ in imp][:10][::-1]; vals = [v for _, v in imp][:10][::-1]
    ax.barh(names, vals, color="#2e7d32"); ax.set_xlabel("Kepentingan fitur (Gini)")
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout(); fig.savefig(os.path.join(OUT, "feature_importance.png")); plt.close(fig)
    print("Model diekspor ->", os.path.join(MODEL_DIR, "forest.json"))


if __name__ == "__main__":
    main()
