# GanoProbe — perangkat IoT pengukur senyawa volatil pangkal batang

GanoProbe adalah alat genggam: **satu alat dipakai bergilir untuk banyak pohon** (bukan satu sensor per pohon). Ini yang membuatnya murah untuk sawit rakyat.

## Cara kerja (singkat)
Jamur *Ganoderma boninense* mengurai lignin batang dan melepaskan senyawa volatil khas (turunan benzena seperti etilbenzena, xilena, benzaldehida; senyawa C8 seperti 1-okten-3-ol; amonia naik). Sungkup (corong) ditempelkan ke pangkal batang, kipas kecil mengalirkan udara di dalam sungkup ke tiga sensor gas. Alat membandingkan **udara di pangkal batang** dengan **udara sekitar** (baseline) sehingga gangguan cuaca, kelembapan, dan penuaan sensor ikut terkoreksi.

## Daftar komponen (1 unit)
| Komponen | Fungsi | Jml |
|---|---|---|
| ESP32 DevKit V1 (WROOM-32) | otak + WiFi | 1 |
| Modul MQ-138 | VOC aromatik/aldehida/keton | 1 |
| Modul MQ-135 | amonia (NH₃) & benzena — juga penanda pengganggu (bahan organik busuk) | 1 |
| Figaro TGS2602 + resistor 10 kΩ | VOC & bau dekomposisi (toluena, NH₃, H₂S) | 1 |
| ADS1115 16-bit | pembacaan analog presisi (ADC internal ESP32 tidak linier) | 1 |
| Resistor 10 kΩ & 20 kΩ (3 pasang) | pembagi tegangan 5 V → 3,3 V untuk tiap keluaran sensor gas | 3 |
| SHT31 | suhu & kelembapan di dalam sungkup (kompensasi) | 1 |
| Sensor kelembapan tanah kapasitif v2 | kelembapan tanah piringan | 1 |
| DS18B20 tahan air | suhu tanah | 1 |
| GPS NEO-6M | geotag pengukuran (audit posisi) | 1 |
| OLED 0,96" I2C | tampilan kode pohon & hasil | 1 |
| Modul microSD + kartu 16 GB | log & antrean offline | 1 |
| Kipas mini 5 V + MOSFET (IRLZ44N) | aliran udara sungkup | 1–2 |
| 2× 18650 + BMS 2S + step-down 5 V | catu daya ± 5–6 jam kerja | 1 set |
| Tombol, buzzer, kotak IP65 | antarmuka | 1 |
| Sungkup cetak 3D PETG + gasket silikon | ruang ukur di pangkal batang | 1 |

## Sambungan
| Perangkat | Pin ESP32 |
|---|---|
| I2C (ADS1115, SHT31, OLED) | SDA 21, SCL 22 |
| ADS1115 A0/A1/A2 | keluaran MQ-138 / MQ-135 / TGS2602 **lewat pembagi 10k/20k** |
| GPS TX/RX | GPIO16 / GPIO17 |
| microSD CS, SCK, MISO, MOSI | 5, 18, 19, 23 |
| DS18B20 data (+4,7 kΩ pull-up) | GPIO4 |
| Sensor tanah kapasitif | GPIO34 |
| Tombol (ke GND) | GPIO27 |
| Buzzer | GPIO26 |
| Gate MOSFET kipas | GPIO25 |

Sensor gas & kipas dicatu 5 V; ESP32 dan modul I2C 3,3 V.

## Upload firmware
1. Pasang Arduino IDE 2 → Board Manager: pasang **esp32 by Espressif**.
2. Library Manager: pasang *Adafruit ADS1X15, Adafruit SHT31, Adafruit SSD1306, Adafruit GFX, TinyGPSPlus, OneWire, DallasTemperature, ArduinoJson*.
3. Buka `ganoprobe/ganoprobe.ino`, isi `config.h` (WiFi, alamat Vercel, DEVICE_ID & DEVICE_KEY dari menu **Lainnya → Perangkat** di web).
4. Pilih board **ESP32 Dev Module**, port USB, klik **Upload**.

## Kalibrasi wajib sebelum ke kebun
1. **Burn-in** sensor MOS 24–48 jam (nyalakan terus) saat pertama kali dipakai.
2. Cek `RL_MQ138`, `RL_MQ135` di `config.h` sesuai resistor beban yang tertera di modul.
3. Uji respons dengan uap **benzaldehida** & **etanol** encer di dalam kotak tertutup: nilai `rs` harus turun jelas dibanding udara bersih.
4. Kalibrasi sensor tanah: catat nilai ADC di udara (`SOIL_DRY`) dan di air (`SOIL_WET`).

## Tips pengukuran yang benar
- Ukur pagi (07.00–10.00), bukan tepat setelah hujan.
- Bersihkan piringan dari tumpukan pelepah/janjang busuk (bisa membuat hasil "palsu").
- Tempelkan sungkup rapat di pangkal batang (10–30 cm dari tanah).
- Jangan merokok / menyalakan motor di dekat alat saat mengukur.
