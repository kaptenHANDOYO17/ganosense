"""Membuat data contoh (mode demo) untuk web: 1 blok ~1,2 ha, 168 pohon, ada klaster infeksi."""
import json
import os
from datetime import datetime, timedelta

import numpy as np

from ganosense_ml import simulate_tree_measurements

HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(2026)
ROWS, COLS = 12, 14
now = datetime(2026, 9, 28, 9, 0)

trees, meas = [], []
centers = [(4, 4), (8, 10), (2, 11)]
for r in range(ROWS):
    for c in range(COLS):
        d = min(np.hypot(r - a, c - b) for a, b in centers)
        p = [0.97, 0.03, 0, 0]
        if d < 0.5: p = [0, 0, 0.1, 0.9]
        elif d < 1.2: p = [0.2, 0.3, 0.3, 0.2]
        elif d < 2.3: p = [0.6, 0.3, 0.1, 0]
        elif d < 3.2: p = [0.88, 0.12, 0, 0]
        cls = int(rng.choice(4, p=p))
        tid = f"B1-{r+1:02d}-{c+1:02d}"
        x = c * 9.0 + (r % 2) * 4.5
        y = r * 9.0 * np.sqrt(3) / 2
        visual = None
        n = 0
        if cls > 0 or rng.random() < 0.55:
            n = int(rng.integers(1, 4))
        rows = simulate_tree_measurements(cls, max(n, 1), rng, tid)
        visual = rows[0]["visual_score"]
        trees.append(dict(id=tid, kode=tid, blok="B1", baris=r + 1, kolom=c + 1, x=round(x, 2), y=round(y, 2),
                          generasi=2, umur_th=16, visual_score=int(visual),
                          catatan="", _label_demo=cls))
        for k in range(n):
            raw = rows[k]
            raw.update(generasi=2, umur_th=16)
            ts = now - timedelta(days=int(rng.integers(3, 95)), hours=int(rng.integers(0, 8)))
            meas.append(dict(tree_id=tid, waktu=ts.isoformat(),
                             raw={kk: round(float(v), 4) for kk, v in raw.items() if kk not in ("tree_id", "label")}))

demo = {"kebun": {"id": "demo", "nama": "Kebun Contoh Kelompok Tani Maju Bersama",
                  "lokasi": "Contoh (data simulasi)", "luas_ha": round(ROWS * COLS / 143, 2)},
        "pohon": trees, "pengukuran": sorted(meas, key=lambda m: m["waktu"]), "tindakan": []}
out = os.path.join(HERE, "..", "src", "lib", "demoData.json")
json.dump(demo, open(out, "w"), separators=(",", ":"))
print(len(trees), "pohon,", len(meas), "pengukuran ->", out)
