/*
 * GanoProbe v1.0 — alat ukur senyawa volatil pangkal batang sawit untuk deteksi dini Ganoderma
 * Bagian dari sistem GanoSense (IoT + AI spasial + DSS).
 *
 * Alur kerja:
 *   1. Nyala -> pemanasan sensor 3 menit -> "SIAP"
 *   2. Petani memilih pohon di HP -> tekan tombol -> alat menanyakan /api/sesi -> tampil kode pohon
 *   3. BASELINE 60 dtk di udara terbuka (R0 & RH luar)
 *   4. Bip -> tempel sungkup ke pangkal batang -> tekan tombol -> PAPAR 120 dtk (Rs & laju naik)
 *   5. Baca sensor tanah -> kirim ke /api/ingest -> tampil hasil AI (SEHAT / AWAL / SEDANG / BERAT)
 *   6. Semua data juga disimpan ke kartu SD; bila tak ada sinyal, dikirim ulang otomatis nanti.
 *
 * Library (Arduino Library Manager): Adafruit ADS1X15, Adafruit SHT31, Adafruit SSD1306, Adafruit GFX,
 *   TinyGPSPlus, OneWire, DallasTemperature, ArduinoJson (v7)
 * Board: "ESP32 Dev Module"
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <SPI.h>
#include <SD.h>
#include <Adafruit_ADS1X15.h>
#include <Adafruit_SHT31.h>
#include <Adafruit_SSD1306.h>
#include <TinyGPSPlus.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>
#include "config.h"

Adafruit_ADS1115 ads;
Adafruit_SHT31 sht;
Adafruit_SSD1306 oled(128, 64, &Wire, -1);
TinyGPSPlus gps;
HardwareSerial GPSSerial(2);
OneWire ow(PIN_DS18B20);
DallasTemperature soilT(&ow);
bool sdOk = false;

// ------------------------------------------------------------------ utilitas
void show(const String& a, const String& b = "", const String& c = "") {
  oled.clearDisplay(); oled.setTextColor(SSD1306_WHITE);
  oled.setTextSize(1); oled.setCursor(0, 0); oled.println("GanoProbe " DEVICE_ID);
  oled.setTextSize(2); oled.setCursor(0, 16); oled.println(a);
  oled.setTextSize(1); oled.setCursor(0, 40); oled.println(b); oled.setCursor(0, 52); oled.println(c);
  oled.display();
}
void beep(int n = 1, int ms = 120) { for (int i = 0; i < n; i++) { digitalWrite(PIN_BUZZER, HIGH); delay(ms); digitalWrite(PIN_BUZZER, LOW); delay(ms); } }
void feedGps(uint32_t ms) { uint32_t t = millis(); while (millis() - t < ms) while (GPSSerial.available()) gps.encode(GPSSerial.read()); }
bool waitButton(uint32_t timeoutMs) {
  uint32_t t = millis();
  while (millis() - t < timeoutMs) { feedGps(20); if (digitalRead(PIN_BUTTON) == LOW) { delay(40); while (digitalRead(PIN_BUTTON) == LOW) delay(10); return true; } }
  return false;
}

/** Resistansi sensor MOS (kΩ) dari kanal ADS1115. Rs = RL*(Vc - Vout)/Vout */
float readRs(uint8_t ch, float rl) {
  float v = ads.computeVolts(ads.readADC_SingleEnded(ch)) * DIV_RATIO;
  v = constrain(v, 0.01f, VC_SENSOR - 0.01f);
  return rl * (VC_SENSOR - v) / v;
}

struct Rs3 { float a, b, c; };
Rs3 readAll() { return { readRs(CH_MQ138, RL_MQ138), readRs(CH_MQ135, RL_MQ135), readRs(CH_TGS2602, RL_TGS2602) }; }

float median(float* x, int n) {  // insertion sort kecil
  for (int i = 1; i < n; i++) { float k = x[i]; int j = i - 1; while (j >= 0 && x[j] > k) { x[j + 1] = x[j]; j--; } x[j + 1] = k; }
  return n % 2 ? x[n / 2] : 0.5f * (x[n / 2 - 1] + x[n / 2]);
}

bool wifiOn() {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID, WIFI_PASS);
  for (int i = 0; i < 30 && WiFi.status() != WL_CONNECTED; i++) delay(500);
  return WiFi.status() == WL_CONNECTED;
}

int httpJson(const String& method, const String& url, const String& body, JsonDocument& out) {
  if (!wifiOn()) return -1;
  WiFiClientSecure cli; cli.setInsecure();   // catatan: untuk produksi pasang sertifikat root CA
  HTTPClient http; http.begin(cli, url); http.setTimeout(15000);
  http.addHeader("Content-Type", "application/json");
  int code = method == "POST" ? http.POST(body) : http.GET();
  if (code > 0) deserializeJson(out, http.getString());
  http.end();
  return code;
}

void sdAppend(const char* path, const String& line) {
  if (!sdOk) return;
  File f = SD.open(path, FILE_APPEND); if (f) { f.println(line); f.close(); }
}

/** Kirim ulang data yang tertunda (tanpa sinyal) dari kartu SD. */
void flushQueue() {
  if (!sdOk || !SD.exists("/antrian.jsonl") || !wifiOn()) return;
  File f = SD.open("/antrian.jsonl"); String gagal;
  while (f.available()) {
    String line = f.readStringUntil('\n'); line.trim(); if (!line.length()) continue;
    JsonDocument r; int c = httpJson("POST", String(API_BASE) + "/api/ingest", line, r);
    if (c != 200) gagal += line + "\n";
  }
  f.close(); SD.remove("/antrian.jsonl");
  if (gagal.length()) { File g = SD.open("/antrian.jsonl", FILE_WRITE); g.print(gagal); g.close(); }
}

// ------------------------------------------------------------------ setup
void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUTTON, INPUT_PULLUP); pinMode(PIN_BUZZER, OUTPUT); pinMode(PIN_FAN, OUTPUT);
  Wire.begin();
  oled.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (!ads.begin()) show("ADS ERR", "Cek kabel ADS1115");
  ads.setGain(GAIN_ONE);                   // ±4,096 V
  sht.begin(0x44);
  soilT.begin();
  GPSSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  sdOk = SD.begin(PIN_SD_CS);
  if (sdOk && !SD.exists("/log.csv"))
    sdAppend("/log.csv", "waktu_ms,pohon,r0_138,rs_138,r0_135,rs_135,r0_2602,rs_2602,slope138,slope2602,t,rh,rh_luar,soil,soil_t,lat,lon");
  digitalWrite(PIN_FAN, HIGH);
  for (int s = T_WARMUP; s > 0; s--) { show("PANASKAN", String(s) + " detik lagi", sdOk ? "SD: ok" : "SD: tidak ada"); feedGps(1000); }
  digitalWrite(PIN_FAN, LOW);
  flushQueue();
  beep(2);
}

// ------------------------------------------------------------------ loop
void loop() {
  show("SIAP", "Pilih pohon di HP,", "lalu tekan tombol");
  waitButton(UINT32_MAX);

  // 1) Tanya pohon aktif
  show("CEK SESI..");
  JsonDocument ses;
  int code = httpJson("GET", String(API_BASE) + "/api/sesi?device_id=" DEVICE_ID "&key=" DEVICE_KEY, "", ses);
  String pohonId = "", kode = "OFFLINE";
  if (code == 200 && ses["aktif"] == true) { pohonId = ses["pohon_id"].as<String>(); kode = ses["kode"].as<String>(); }
  else if (code == 200) { show("BELUM ADA", "Pilih pohon di HP", "lalu tekan lagi"); beep(3, 60); delay(2500); return; }
  show(kode, "Benar pohon ini?", "Tekan = lanjut");
  if (!waitButton(60000)) return;

  // 2) Baseline udara terbuka
  const int NB = T_BASELINE * SAMPLE_HZ;
  static float b1[240], b2[240], b3[240];
  float rhLuar = 0;
  digitalWrite(PIN_FAN, HIGH);
  for (int i = 0; i < NB; i++) {
    Rs3 r = readAll(); b1[i] = r.a; b2[i] = r.b; b3[i] = r.c;
    if (i % SAMPLE_HZ == 0) show("UDARA", "Jauhkan dari batang", String((NB - i) / SAMPLE_HZ) + " dtk");
    feedGps(1000 / SAMPLE_HZ);
  }
  rhLuar = sht.readHumidity();
  int nTail = NB / 3;   // median sepertiga akhir = R0 yang stabil
  float r0a = median(b1 + NB - nTail, nTail), r0b = median(b2 + NB - nTail, nTail), r0c = median(b3 + NB - nTail, nTail);
  beep(1, 300);
  show("TEMPEL", "Sungkup ke pangkal", "batang, tekan tombol");
  if (!waitButton(120000)) { digitalWrite(PIN_FAN, LOW); return; }

  // 3) Paparan di pangkal batang
  const int NE = T_EXPOSE * SAMPLE_HZ;
  static float e1[480], e3[480];
  float minA = 1e9, minB = 1e9, minC = 1e9;
  for (int i = 0; i < NE; i++) {
    Rs3 r = readAll(); e1[i] = r0a / r.a - 1; e3[i] = r0c / r.c - 1;
    minA = min(minA, r.a); minB = min(minB, r.b); minC = min(minC, r.c);
    if (i % SAMPLE_HZ == 0) show("UKUR", kode, String((NE - i) / SAMPLE_HZ) + " dtk");
    feedGps(1000 / SAMPLE_HZ);
  }
  digitalWrite(PIN_FAN, LOW);
  // laju naik maksimum (respons per menit) memakai jendela 30 dtk
  int w = 30 * SAMPLE_HZ; float s1 = 0, s3 = 0;
  for (int i = w; i < NE; i++) { s1 = max(s1, (e1[i] - e1[i - w]) * 2.0f); s3 = max(s3, (e3[i] - e3[i - w]) * 2.0f); }
  float t = sht.readTemperature(), rh = sht.readHumidity();
  soilT.requestTemperatures(); float tsoil = soilT.getTempCByIndex(0);
  int adc = analogRead(PIN_SOIL);
  float soil = constrain(map(adc, SOIL_DRY, SOIL_WET, 0, 100), 0, 100);

  // 4) Susun & kirim
  JsonDocument doc;
  doc["device_id"] = DEVICE_ID; doc["key"] = DEVICE_KEY;
  if (pohonId.length()) doc["pohon_id"] = pohonId;
  if (gps.location.isValid()) { doc["lat"] = gps.location.lat(); doc["lon"] = gps.location.lng(); }
  JsonObject raw = doc["raw"].to<JsonObject>();
  raw["r0_mq138"] = r0a; raw["rs_mq138"] = minA; raw["r0_mq135"] = r0b; raw["rs_mq135"] = minB;
  raw["r0_tgs2602"] = r0c; raw["rs_tgs2602"] = minC; raw["slope_mq138"] = s1; raw["slope_tgs2602"] = s3;
  raw["temp_c"] = t; raw["rh_pct"] = rh; raw["rh_ambient"] = rhLuar; raw["soil_moist"] = soil; raw["soil_temp"] = tsoil;
  String body; serializeJson(doc, body);
  sdAppend("/log.csv", String(millis()) + "," + kode + "," + r0a + "," + minA + "," + r0b + "," + minB + "," + r0c + "," + minC + "," +
           s1 + "," + s3 + "," + t + "," + rh + "," + rhLuar + "," + soil + "," + tsoil + "," +
           String(gps.location.lat(), 6) + "," + String(gps.location.lng(), 6));

  show("KIRIM..");
  JsonDocument res;
  code = pohonId.length() ? httpJson("POST", String(API_BASE) + "/api/ingest", body, res) : -1;
  if (code == 200) {
    beep(2);
    show(res["pesan"].as<String>(), "Kode " + kode, "Lihat saran di HP");
  } else {
    sdAppend("/antrian.jsonl", body);
    beep(1, 500);
    show("TERSIMPAN", "Tak ada sinyal.", "Dikirim otomatis nanti");
  }
  waitButton(30000);
  flushQueue();
}
