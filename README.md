# KECOAKAZE: Teror dari Udara — Browser Edition (Level 1: Dapur)

Versi browser 3D WebGL (**Three.js + Vite + TypeScript**) dari **KECOAKAZE**, memfokuskan **Level 1: Dapur Huru-Hara** dengan mekanik *stealth*, fisika perayap 360°, terbang + updraft kompor, cerita prolog/reaksi/epilog, dan HUD hybrid Desktop & Mobile Touch.

## Fitur Level 1 yang Diimplementasikan
- **Dapur Diorama 3D Prosedural (`8m × 6.5m`)**: Kulkas, wastafel, kompor gas + tabung LPG 3kg, meja dapur + talenan sayur + rice cooker + rak piring, meja makan + tudung saji, dispenser galon, lemari gantung, jendela berteralis, tempat sampah, ember, jam dinding, kalender, lampu gantung.
- **Karakter Prosedural & Animasi**:
  - **Koko**: 6 kaki dengan *tripod gait*, sepasang sayap *tegmina* yang membuka & bergetar saat terbang, antena aktif, serta *blob shadow* dinamis.
  - **Ibu**: Daster teal bermotif, celemek krem, sandal merah, cepol + 3 rol rambut, ekspresi wajah reaktif, sapu lidi, dan animasi rutinitas memasak / mengelap / mengipas / mengomel.
- **Fisika 360° & Terbang**:
  - **Merayap 360°**: 5-point raycast probe untuk menempel di lantai, dinding 90°, perabot, hingga plafon terbalik.
  - **Terbang, Layang & Elak**: Stamina bar, mendarat otomatis saat menyentuh permukaan, serta *air dodge* dengan *i-frames*.
  - **Bahaya Lingkungan**: Lantai busa sabun licin di depan wastafel & arus udara panas (*thermal updraft*) di atas kompor gas.
- **Core Loop Stage 1**:
  1. `01 / CURI CEMILAN` — Makan bahan sayur di meja dapur (`MAKAN`)
  2. `02 / SABOTASE SUP` — Kotori wajan sup di kompor (`KOTORI`)
  3. `03 / PESTA DI MEJA` — Acak-acak hidangan di meja makan (`MAKAN`)
  - Sistem **Vision Cone + Line of Sight**, **Radius Dengar Sayap**, **5 Titik Sembunyi** (`Safe` vs `Risky`), **Momentum Teror + 3 Bintang**, **Finale Mengamuk**, dan **Layar Hasil + Epilog**.

## Kontrol
- **Desktop**: `WASD` / Panah (Gerak), `Seret Mouse` (Putar Kamera), `Spasi` (Terbang / Naik), `Shift` (Melayang), `Q` (Elak), `E` / `F` (Tahan Aksi), `Esc` / `P` (Pause), `M` (Mute).
- **Mobile Browser**: Virtual Joystick kiri bawah, seret layar untuk kamera, tombol sentuh `TERBANG`, `LAYANG`, `ELAK`, dan tombol kontekstual `AKSI`.

## Menjalankan & Build
```bash
npm install
npm run dev
```

Build produksi (otomatis dijalankan via GitHub Actions di `.github/workflows/deploy.yml` untuk GitHub Pages):
```bash
npm run build
```
