"""
Simulasi sebaran Ganoderma pada kisi tanam segitiga 9 m (143 pohon/ha)
membandingkan skenario:
  A. Konvensional  : sensus visual 6 bulanan, hanya stadium sedang/berat yang terlihat
  B. GanoSense     : pemindaian bulanan terprioritas risiko + deteksi stadium awal

Kalibrasi: laju penularan (beta) dipilih agar skenario A mereproduksi data
lapangan Indonesia: insidensi 3,7% -> 42,2% dalam 8 tahun
(Wijayanti dkk., Warta PPKS 2024; dikutip Sawit Indonesia 2024).

Semua asumsi efek tindakan ditulis eksplisit & diuji sensitivitasnya.
"""
import json
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")

ROWS, COLS = 40, 36            # 1.440 pohon ~ 10 ha
S, E, M, B, D = 0, 1, 2, 3, 4   # sehat, awal, sedang, berat, mati/tumbang
YIELD = np.array([1.0, 0.9, 0.5, 0.2, 0.0])
INFECTIVITY = np.array([0.0, 0.3, 1.0, 1.0, 1.0])
P_PROG = {E: 1 / 12, M: 1 / 12, B: 1 / 10}   # peluang naik stadium per bulan

# ekonomi (Sep 2026)
TBS_T_HA = 15.0                 # t TBS/ha/th sawit rakyat (~3,27 t CPO/ha / OER ~21-22%)
TREES_HA = 143
PRICE = 3800                    # Rp/kg TBS (kisaran Rp3.300-4.070, InfoSAWIT Sep 2026)
CAP = float(os.environ.get("CAP", "0.20"))   # porsi pohon dipindai per bulan
KG_TREE_MONTH = TBS_T_HA * 1000 / TREES_HA / 12


def coords():
    r, c = np.meshgrid(np.arange(ROWS), np.arange(COLS), indexing="ij")
    x = c * 9.0 + (r % 2) * 4.5
    y = r * 9.0 * np.sqrt(3) / 2
    return np.stack([x.ravel(), y.ravel()], 1)


XY = coords()
N = len(XY)
DIST = np.sqrt(((XY[:, None, :] - XY[None, :, :]) ** 2).sum(-1))
W = np.where((DIST > 0) & (DIST < 10), 1.0, np.where((DIST >= 10) & (DIST < 19), 0.25, 0.0))


def run(beta, scenario, months, rng, init_inc=0.037, effect=0.6, b0=0.0006):
    state = np.zeros(N, int)
    seed = rng.choice(N, int(round(init_inc * N)), replace=False)
    state[seed] = rng.choice([E, M, B], size=len(seed), p=[0.4, 0.4, 0.2])
    inf_mult = np.ones(N)       # pengali daya tular akibat tindakan
    prog_mult = np.ones(N)      # pengali laju progresi akibat tindakan
    detected = np.zeros(N, bool)
    last_check = np.zeros(N)
    inc_hist, yield_hist, treat_count, fp_count = [], [], 0, 0
    for t in range(months):
        # --- penularan via kontak akar ---
        src = INFECTIVITY[state] * inf_mult
        pressure = W @ src
        p_inf = 1 - (1 - b0) * np.exp(-beta * pressure)
        new = (state == S) & (rng.random(N) < p_inf)
        # --- progresi penyakit ---
        for st in (B, M, E):
            prog = (state == st) & (rng.random(N) < P_PROG[st] * prog_mult)
            state[prog] = st + 1
        state[new] = E

        # --- tindakan ---
        if t % 6 == 5:   # sensus visual 6 bulanan tetap dilakukan di KEDUA skenario
            seen = ((state == M) & (rng.random(N) < 0.6)) | ((state >= B) & (rng.random(N) < 0.95))
            for i in np.where(seen & ~detected)[0]:
                detected[i] = True
                if scenario == "A":
                    treat_count += 1
                if state[i] == M:
                    inf_mult[i] = 0.7                      # pembumbunan saja
                else:
                    inf_mult[i] = 0.0 if rng.random() < 0.5 else 1.0   # tunggul sering ditinggal
        if scenario == "B":
            # prioritas = risiko tetangga x lama tidak dicek; kapasitas 35% pohon/bulan
            risk = 1 - np.exp(-beta * (W @ (INFECTIVITY[state] * inf_mult * detected + 0.3)))
            prio = risk * np.minimum(1, (t - last_check + 1) / 3) * (~detected)
            k = int(CAP * N)
            chk = np.argsort(-prio)[:k]
            last_check[chk] = t
            sens = np.where(state[chk] == E, 0.79, np.where(state[chk] >= M, 0.95, 0.0))
            hit = chk[rng.random(len(chk)) < sens]
            fp = chk[(state[chk] == S) & (rng.random(len(chk)) < 0.09)]
            fp_count += len(fp)              # positif palsu -> ukur ulang, bukan dibongkar
            for i in hit:
                detected[i] = True
                treat_count += 1
                if state[i] == E:
                    inf_mult[i] = 1 - effect; prog_mult[i] = 1 - effect * 0.6
                elif state[i] == M:
                    inf_mult[i] = 1 - effect * 0.8; prog_mult[i] = 0.8
                else:
                    inf_mult[i] = 0.0                       # eradikasi + sanitasi penuh
        inc_hist.append(float((state > S).mean()))
        yield_hist.append(float(YIELD[state].sum()))
    return np.array(inc_hist), np.array(yield_hist), (treat_count, fp_count)


def calibrate(rng_seed=1):
    best = None
    for beta in np.linspace(0.002, 0.03, 57):
        incs = [run(beta, "A", 96, np.random.default_rng(rng_seed + r))[0][-1] for r in range(6)]
        err = abs(np.mean(incs) - 0.422)
        if best is None or err < best[1]:
            best = (beta, err, np.mean(incs))
    return best


def main():
    os.makedirs(OUT, exist_ok=True)
    beta, err, inc8 = calibrate()
    print(f"beta terkalibrasi = {beta:.4f}; insidensi 8 th skenario A = {inc8:.3f} (target 0.422)")
    months, reps = 60, 30
    res = {}
    for name, sc, eff in [("A_konvensional", "A", 0.6), ("B_ganosense_pesimis", "B", 0.3),
                          ("B_ganosense_dasar", "B", 0.6), ("B_ganosense_optimis", "B", 0.75)]:
        incs, ylds, trs, fps = [], [], [], []
        for r in range(reps):
            i, yv, tc = run(beta, sc, months, np.random.default_rng(100 + r), effect=eff)
            incs.append(i); ylds.append(yv); trs.append(tc[0]); fps.append(tc[1])
        incs, ylds = np.array(incs), np.array(ylds)
        ha = N / TREES_HA
        rev = ylds.sum(1) * KG_TREE_MONTH * PRICE / ha       # Rp/ha selama 5 th
        res[name] = {"inc_mean": incs.mean(0).tolist(), "inc_p05": np.percentile(incs, 5, 0).tolist(),
                     "inc_p95": np.percentile(incs, 95, 0).tolist(),
                     "inc_60": float(incs[:, -1].mean()),
                     "pendapatan_5th_rp_ha": float(rev.mean()),
                     "tindakan_per_ha_5th": float(np.mean(trs) / ha),
                     "ukur_ulang_fp_per_ha_5th": float(np.mean(fps) / ha)}
        print(f"{name:24s} insidensi bln-60 = {res[name]['inc_60']*100:5.1f}%  "
              f"pendapatan 5 th = Rp{rev.mean()/1e6:6.1f} jt/ha  tindakan={np.mean(trs)/ha:.0f}/ha fp={np.mean(fps)/ha:.0f}/ha")
    base = res["A_konvensional"]["pendapatan_5th_rp_ha"]
    for k in res:
        res[k]["selisih_vs_A_rp_ha_th"] = (res[k]["pendapatan_5th_rp_ha"] - base) / 5
    res["_param"] = {"beta": float(beta), "n_pohon": N, "luas_ha": N / TREES_HA, "harga_tbs": PRICE,
                     "tbs_t_ha": TBS_T_HA, "reps": reps}
    json.dump(res, open(os.path.join(OUT, "simulasi.json"), "w"), indent=1)

    fig, ax = plt.subplots(figsize=(6.4, 3.4), dpi=200)
    t = np.arange(1, months + 1)
    for k, col, lab in [("A_konvensional", "#c62828", "Konvensional (sensus visual 6 bulanan)"),
                        ("B_ganosense_dasar", "#2e7d32", "GanoSense (asumsi efek dasar 60%)")]:
        ax.plot(t, np.array(res[k]["inc_mean"]) * 100, color=col, lw=2, label=lab)
        ax.fill_between(t, np.array(res[k]["inc_p05"]) * 100, np.array(res[k]["inc_p95"]) * 100, color=col, alpha=0.15)
    ax.plot(t, np.array(res["B_ganosense_pesimis"]["inc_mean"]) * 100, color="#2e7d32", lw=1, ls="--",
            label="GanoSense (asumsi pesimis 30%)")
    ax.set_xlabel("Bulan"); ax.set_ylabel("Pohon terinfeksi (%)")
    ax.spines[["top", "right"]].set_visible(False); ax.legend(fontsize=7, frameon=False)
    ax.set_title("Proyeksi insidensi Ganoderma, blok 10 ha generasi ke-2", fontsize=9)
    fig.tight_layout(); fig.savefig(os.path.join(OUT, "simulasi_sebaran.png")); plt.close(fig)


if __name__ == "__main__":
    main()
