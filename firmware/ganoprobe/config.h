// =====================================================================
//  GanoProbe — konfigurasi. UBAH bagian ini sebelum upload ke ESP32.
// =====================================================================
#pragma once

// --- WiFi (boleh hotspot HP petani) ---
#define WIFI_SSID      "NamaHotspot"
#define WIFI_PASS      "KataSandiHotspot"

// --- Server GanoSense (alamat Vercel Anda, TANPA garis miring di akhir) ---
#define API_BASE       "https://ganosense-anda.vercel.app"

// --- Identitas perangkat (didapat dari menu Lainnya > Perangkat di web) ---
#define DEVICE_ID      "GP-XXXXX"
#define DEVICE_KEY     "KUNCIDARIWEB"

// --- Pin ---
#define PIN_BUTTON     27    // tombol ukur (ke GND, pakai INPUT_PULLUP)
#define PIN_BUZZER     26
#define PIN_FAN        25    // MOSFET kipas sungkup
#define PIN_DS18B20    4     // suhu tanah
#define PIN_SOIL       34    // sensor kelembapan tanah kapasitif (ADC internal)
#define PIN_SD_CS      5
#define GPS_RX         16
#define GPS_TX         17

// --- Rangkaian sensor gas (lihat README firmware) ---
#define VC_SENSOR      5.0f   // tegangan catu sensor MOS
#define DIV_RATIO      1.5f   // pembagi tegangan 10k/20k: Vout = Vadc * 1.5
#define RL_MQ138       1.0f   // kΩ, resistor beban modul MQ-138 (cek di modul!)
#define RL_MQ135       1.0f   // kΩ, resistor beban modul MQ-135
#define RL_TGS2602     10.0f  // kΩ, resistor beban TGS2602
// Kanal ADS1115
#define CH_MQ138       0
#define CH_MQ135       1
#define CH_TGS2602     2

// --- Protokol ukur (detik) ---
#define T_WARMUP       180   // pemanasan sensor MOS
#define T_BASELINE     60    // udara terbuka -> R0
#define T_EXPOSE       120   // sungkup menempel di pangkal batang -> Rs
#define SAMPLE_HZ      2

// --- Kalibrasi sensor tanah kapasitif (nilai ADC) ---
#define SOIL_DRY       3000  // di udara kering
#define SOIL_WET       1200  // di dalam air
