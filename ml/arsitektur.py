import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
fig, ax = plt.subplots(figsize=(8.2, 4.3), dpi=220); ax.set_xlim(0, 100); ax.set_ylim(0, 52); ax.axis("off")
G, Y, O, B, K = "#e8f3e6", "#fff5d6", "#fde7da", "#e3eefb", "#1b3a1b"
def box(x, y, w, h, title, lines, fc):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.4,rounding_size=1.5", fc=fc, ec="#6b7d6d", lw=0.8))
    ax.text(x + w/2, y + h - 2.2, title, ha="center", va="top", fontsize=7.6, fontweight="bold", color=K, family="DejaVu Sans")
    ax.text(x + w/2, y + h - 6.3, "\n".join(lines), ha="center", va="top", fontsize=6.1, color="#2c3b2e", linespacing=1.35)
def arr(x1, y1, x2, y2, t=""):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>", mutation_scale=9, color="#44604a", lw=1))
    if t and x1 == x2: ax.text(x1 + 1.2, (y1+y2)/2, t, ha="left", va="center", fontsize=5.6, color="#44604a")
    elif t: ax.text((x1+x2)/2, (y1+y2)/2 + 1.2, t, ha="center", fontsize=5.6, color="#44604a")
box(1, 27, 22, 23, "GanoProbe (IoT)", ["Sungkup pangkal batang", "MQ-138 · MQ-135 · TGS2602", "SHT31 · tanah · GPS", "ESP32 + ADS1115", "Baseline udara vs sungkup", "Antrean offline (SD)"], Y)
box(30, 27, 22, 23, "Server (Vercel + Supabase)", ["/api/sesi  /api/ingest", "Verifikasi kunci perangkat", "Ekstraksi fitur", "Inferensi AI (Random Forest)", "PostgreSQL + RLS"], B)
box(59, 38, 40, 12, "Lapisan 1 — AI Deteksi", ["15 fitur → P(sehat, awal, sedang, berat)", "latih ulang dengan label lapangan (sensus + GSM)"], G)
box(59, 21.5, 40, 13.5, "Lapisan 2 — AI Spasial", ["risiko 12 bln = 1 − (1−b₀)¹² · exp(−12β Σ w·s)", "kontak akar tetangga · Smart Scouting", "\"pohon mana dicek hari ini\""], G)
box(59, 4, 40, 14.5, "Lapisan 3 — Decision Support System", ["Tindakan PHT per pohon & urgensi", "Jadwal ukur ulang · catatan tindakan", "Nilai Rupiah terancam / diselamatkan"], O)
box(1, 2, 51, 19, "Aplikasi web di HP petani / kelompok tani", ["Peta kesehatan kebun · Cek hari ini · Tugas · Hitung Untung", "Cek visual tanpa alat · mode demo · ekspor data riset"], "#eef1ee")
arr(23.5, 38.5, 29.5, 38.5, "HTTPS/WiFi")
arr(52.5, 44, 58.5, 44)
arr(79, 37.6, 79, 35.6); arr(79, 21, 79, 19)
arr(58.5, 11, 52.5, 11, "rekomendasi")
arr(41, 26.5, 41, 21.5, "data")
arr(12, 21.5, 12, 26.5, "pilih pohon (sesi)")
fig.savefig("out/arsitektur.png", bbox_inches="tight"); print("ok")
