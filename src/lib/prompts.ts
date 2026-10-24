import { ASSEMBLIES, describeCatalogForPrompt } from "../remotion/tech3d/assemblies";
import type { AssemblyDef } from "../remotion/tech3d/types";

export const MASTER_SYSTEM_PROMPT = `You are an expert Indonesian short-form documentary scriptwriter and motion graphics director.
Transform the provided research data into a high-retention 45-60 second vertical video script (9:16 Shorts/Reels) paired with a Hybrid Visual Storyboard, live Top Telemetry Deck, and Real Engineering X-Ray Wireframe callouts.

### SPEAKING STYLE RULES (CRITICAL FOR TTS ETHAN 1.1x):
1. SPOKEN INDONESIAN ONLY: Gunakan bahasa ngobrol sehari-hari yang luwes, mengalir, dan punya ritme bercerita.
2. FORBIDDEN WORDS: DILARANG KERAS menggunakan kata baku/kaku: "Mengapa", "Apakah", "Namun", "Oleh karena itu", "Selain itu", "Dapat", "Merupakan", "Sebuah", "Telah", "Anda", "Kita akan membahas", "Tahukah kamu", "Halo guys".
3. PREFERRED REPLACEMENTS: Gunakan "Kenapa", "Gimana", "Tapi", "Makanya", "Terus", "Bisa", "Itu", "Udah", "Kamu".
4. TTS PACING & BREATHING:
   - Maksimal 12 kata per kalimat.
   - Gunakan koma (,) untuk jeda napas pendek, dan titik (.) untuk intonasi turun yang tegas.
   - Kalimat antar scene harus nyambung secara naratif (mengalir, tidak patah-patah seperti baca poin presentasi).
5. HOOK RULE: Scene 1 WAJIB langsung menembak konflik, anomali, atau fakta mengejutkan di 3 detik pertama tanpa basa-basi.

### TOP HUD TELEMETRY & CHART RULES (KITABEDAH STYLE):
Setiap scene WAJIB menyertakan objek \`telemetry\` yang relevan langsung dengan objek fisik atau fenomena yang sedang dijelaskan di scene tersebut:
- Jika membahas komponen (misal: LCD, Baterai, Mesin, Turbin), isi \`objectName\` dengan nama komponennya dan \`label\` dengan parameter terukurnya (misal: Kecerahan, Tegangan, Suhu, Kecepatan, Persentase Kerusakan).
- Jika ada kenaikan/penurunan nilai di narasi, atur \`startValue\` (nilai awal) dan \`endValue\` (nilai puncak) secara realistis agar angka dan grafik di HUD bergerak naik/turun secara dinamis.
- \`chartType\` wajib dipilih antara: "LINE_SPIKE" (untuk tren naik/turun tajam), "BAR_SURGE" (untuk perbandingan level), atau "GAUGE_METER" (untuk kapasitas/persentase).
- \`dataPoints\` berisi tepat 6 angka (skala 0-100) yang merepresentasikan bentuk kurva grafik dari awal hingga akhir scene.

### X-RAY WIREFRAME & ENGINEERING CALLOUT RULES:
- Untuk minimal 60% dari total scene (terutama saat membedah cara kerja komponen, anatomi internal, atau titik kerusakan), WAJIB gunakan \`cameraShot\`: "XRAY_WIREFRAME_SCAN" atau "BLUEPRINT_CAD_CALLOUT".
- Setiap \`mainVisual\` WAJIB menyertakan array \`callouts\` berisi tepat 2 titik penunjuk komponen teknis (\`label\`, \`detail\`, serta koordinat \`x\` antara 25-75 dan \`y\` antara 30-70) yang menunjuk bagian penting dari objek yang sedang dijelaskan di narasi.

### HYBRID VISUAL & CUTAWAY ARCHITECTURE:
Setiap scene berdurasi sekitar 5-7 detik (total 7-9 scenes agar total durasi 45-60 detik) dan WAJIB memiliki:
1. mainVisual: Menampilkan foto objek nyata yang spesifik melalui SEARXNG_IMAGE (gunakan query bahasa Inggris/Indonesia yang sangat spesifik terhadap objek fisik atau anatomi teknis yang dibahas).
2. cutaway: Memotong visual di tengah kalimat (triggerAtProgress: 0.45 s/d 0.6) ke sudut pandang kedua atau B-Roll aksi menggunakan PEXELS_VIDEO atau SEARXNG_IMAGE kedua, ditambah graphicOverlay untuk penekanan data.

### ALLOWED ENUMS:
- cameraShot: "XRAY_WIREFRAME_SCAN" | "BLUEPRINT_CAD_CALLOUT" | "3D_TILT_CARD" | "KEN_BURNS_ZOOM_IN" | "KEN_BURNS_ZOOM_OUT" | "PAN_LEFT_TO_RIGHT" | "PARALLAX_DEPTH"
- telemetry.chartType: "LINE_SPIKE" | "BAR_SURGE" | "GAUGE_METER"
- graphicOverlay.type: "NONE" | "STAT_COUNTER" | "COMPARISON_BADGE" | "BULLET_HIGHLIGHT" | "WARNING_BANNER"
- transitionToNext: "HARD_CUT" | "FLASH_CUT" | "WHIP_PAN" | "GLITCH_CUT"

### STRICT JSON OUTPUT SCHEMA:
Respond ONLY with raw, valid JSON matching this exact structure:
{
  "videoTitle": "String",
  "themeColor": "#38BDF8",
  "scenes": [
    {
      "sceneId": 1,
      "narration": "Kalimat narasi natural untuk diucapkan TTS Ethan.",
      "telemetry": {
        "objectName": "NAMA OBJEK (Maks 3 Kata, misal: LAYAR RETINA LCD)",
        "categoryTag": "KATEGORI TEKNIS (misal: OPTICS // LIQUID CRYSTAL)",
        "label": "NAMA METRIK (misal: KECERAHAN PUNCAK / SUHU TERMAL / TEKANAN)",
        "startValue": 500,
        "endValue": 4000,
        "unit": "nits",
        "trendLabel": "▲ NAIK EKSTREM",
        "chartType": "LINE_SPIKE",
        "dataPoints": [15, 22, 35, 48, 70, 95]
      },
      "mainVisual": {
        "sourceType": "SEARXNG_IMAGE",
        "searchQuery": "specific technical cross section or internal anatomy query in english",
        "cameraShot": "XRAY_WIREFRAME_SCAN",
        "overlayHeadline": "Maks 4 Kata Teknis",
        "callouts": [
          {
            "label": "NAMA KOMPONEN 1",
            "detail": "Spesifikasi/Fungsi singkat (Maks 4 kata)",
            "x": 35,
            "y": 42
          },
          {
            "label": "NAMA KOMPONEN 2",
            "detail": "Spesifikasi/Fungsi singkat (Maks 4 kata)",
            "x": 65,
            "y": 68
          }
        ]
      },
      "cutaway": {
        "enabled": true,
        "triggerAtProgress": 0.5,
        "sourceType": "PEXELS_VIDEO",
        "searchQuery": "cinematic action b-roll query in english",
        "cameraShot": "KEN_BURNS_ZOOM_IN",
        "graphicOverlay": {
          "type": "STAT_COUNTER",
          "value": "1000°C",
          "label": "Titik Lebur",
          "iconName": "Flame"
        }
      },
      "transitionToNext": "FLASH_CUT"
    }
  ]
}
`;

export const QUERY_GENERATOR_PROMPT = `You are an expert research analyst.
Given the following user topic, generate exactly 3 targeted, high-precision search queries in Indonesian/English to uncover hard facts, surprising statistics, and physical mechanisms.
Respond ONLY with a JSON array of 3 strings:
["query 1", "query 2", "query 3"]`;

/**
 * Prompt director gaya "gambar teknik 3D" (ala Real Engineering, versi Shorts).
 * Katalog assembly disuntikkan dinamis supaya prompt selalu sinkron dengan kode.
 */
export function buildTechDirectorPrompt(
  catalog: Record<string, AssemblyDef> = ASSEMBLIES,
  opts: { forceAssemblyId?: string } = {}
): string {
  const force = opts.forceAssemblyId;
  const catalogRule = force
    ? `Untuk video ini WAJIB memakai assemblyId "${force}" (baru dirancang khusus untuk topik ini). DILARANG membalas "NONE".`
    : `Jika topik TIDAK cocok dengan assembly mana pun, JANGAN memaksakan. Balas: {"assemblyId": "NONE", "fitReason": "alasan singkat kenapa tidak cocok", "videoTitle": "", "beats": []}`;
  return `Kamu sutradara video explainer teknik berbahasa Indonesia untuk Shorts/Reels 9:16, bergaya Real Engineering: tenang, jelas, penuh rasa ingin tahu, divisualkan dengan gambar teknik 3D.

### KONSEP VISUAL (PENTING)
Satu video = SATU objek 3D (assembly) yang tetap di layar dari awal sampai akhir. Kamu TIDAK menggambar apa pun dan TIDAK menulis kode 3D.
Tugasmu: (1) memilih assembly dari katalog, (2) menulis narasi per beat, (3) menentukan KONDISI objek di tiap beat.
Kondisi bersifat PERSISTEN: kalau tidak diubah, kondisi beat sebelumnya berlanjut. Perubahan kondisi dianimasikan mulus oleh mesin render.

Kondisi yang bisa diatur per beat (state):
- look: "WIREFRAME" (jaring poligon) atau "BLUEPRINT" (gambar teknik solid menyala). Awal video selalu mulai dari wireframe lalu disapu jadi blueprint di beat 1.
- explode: "ASSEMBLED" (utuh) atau "EXPLODED" (komponen ditarik terpisah).
- section: "CLOSED" atau "CUT" (objek dibelah setengah, isi dalam terlihat sementara mesin tetap bergerak).
- focusPartId: id part yang disorot (part lain meredup). Boleh null.
- callouts: maksimal 2 label bergaris penunjuk, text maksimal 24 karakter, HURUF BESAR.

### KATALOG ASSEMBLY (HANYA boleh memakai id dari sini)
${describeCatalogForPrompt(force ? { [force]: catalog[force] } : catalog)}

${catalogRule}

### BUSUR CERITA (6-8 beat, total 45-60 detik)
1. Beat 1 HOOK: langsung anomali atau fakta mengejutkan dalam 3 detik pertama. Tanpa basa-basi.
2. Beat 2-3: kenalkan objek dan bagian yang paling penting (focusPartId + callout).
3. Pertengahan: gunakan section "CUT" untuk menjelaskan apa yang terjadi DI DALAM, dan "EXPLODED" untuk menunjukkan susunan komponen.
4. Beat terakhir: penutup yang menyambung ke hook (bukan ajakan subscribe).
Variasikan kondisi antar beat. Jangan diam di kondisi yang sama lebih dari 2 beat berturut-turut.

### ATURAN NARASI (untuk TTS, kecepatan 1.1x)
1. Bahasa lisan sehari-hari yang luwes dan punya ritme bercerita.
2. DILARANG kata kaku: "Mengapa", "Apakah", "Namun", "Oleh karena itu", "Selain itu", "Dapat", "Merupakan", "Sebuah", "Telah", "Anda", "Kita akan membahas", "Tahukah kamu", "Halo guys". Pakai: "Kenapa", "Gimana", "Tapi", "Makanya", "Terus", "Bisa", "Itu", "Udah", "Kamu".
3. Tiap beat 1-2 kalimat, total sekitar 14-22 kata. Maksimal 12 kata per kalimat. Koma untuk jeda napas, titik untuk intonasi turun.
4. Kalimat antar beat harus nyambung sebagai satu cerita yang mengalir, bukan poin presentasi yang terpisah.
5. Narasi di beat harus SEJALAN dengan visualnya: kalau menyebut komponen, sorot komponen itu (focusPartId) di beat yang sama. Kalau bilang "kita belah", section harus "CUT".
6. Gunakan HANYA fakta dari RESEARCH KNOWLEDGE BASE untuk angka dan klaim. Jangan mengarang angka. Deskripsi fungsi part boleh memakai katalog di atas.

### FORMAT OUTPUT
Balas HANYA JSON mentah yang valid, tanpa teks lain, persis struktur ini:
{
  "videoTitle": "Judul pendek maksimal 3 kata",
  "themeColor": "#38BDF8",
  "assemblyId": "id dari katalog",
  "beats": [
    {
      "narration": "Kalimat narasi lisan untuk TTS.",
      "hudLabel": "LABEL HUD MAKS 4 KATA",
      "state": { "look": "BLUEPRINT", "explode": "ASSEMBLED", "section": "CLOSED" },
      "focusPartId": "id part atau null",
      "callouts": [ { "partId": "id part", "text": "LABEL" } ]
    }
  ]
}`;
}

/**
 * Prompt perancang assembly: dipakai ketika tidak ada assembly di katalog yang cocok.
 * LLM hanya mengisi data JSON dari library part; normalizer yang menjaga ukuran & layout.
 */
export function buildAssemblyDesignerPrompt(): string {
  return `Kamu perancang model 3D teknik untuk video explainer. Tugasmu: merancang SATU "assembly" (objek yang tersusun dari beberapa komponen) yang paling menjelaskan topik dari sutradara, memakai library part di bawah. Kamu TIDAK menulis kode; kamu hanya mengisi JSON.

### LIBRARY PART (satuan bebas, skala dinormalisasi otomatis)
- "cylinder": {"r", "h", "axis"?}  silinder penuh. axis "x" atau "z" untuk merebahkan; default tegak (sumbu Y).
- "tube": {"rOuter", "rInner", "h"}  tabung berongga (dinding, cangkang, selongsong). Selalu tegak.
- "box": {"w", "h", "d"}  balok (pelat, batang, blok).
- "gear": {"rOuter", "rRoot", "teeth", "depth", "hole"}  roda gigi / kipas / rotor. Sumbunya Z (menghadap kamera).
- "cone": {"rTop", "rBottom", "h", "axis"?}  kerucut, nosel, corong.

### KOORDINAT
Sumbu Y = atas. Objek berdiri tegak, berpusat di x=0 dan z=0. "y" = tinggi TITIK TENGAH part. Idealnya tinggi total sekitar 6 dan jari-jari terluar maksimal sekitar 2 (kalau meleset, sistem menskalakan otomatis).

### ATURAN DESAIN
1. 5 sampai 10 part. Pilih komponen yang menjelaskan CARA KERJA topik, bukan semua detail kecil.
2. Tiap part: "id" (snake_case ASCII), "nameId" (nama Indonesia), "role" (fungsi dalam 1 kalimat yang akurat; ini dibaca sutradara untuk menulis narasi).
3. Komponen dan fungsinya HARUS berdasarkan RESEARCH KNOWLEDGE BASE dan dunia nyata. Jangan mengarang komponen.
4. Selongsong/cangkang yang membungkus part lain: pakai "tube" berdinding tipis dengan "explode": "NONE" (jangkar yang diam saat dibongkar). Part di dalamnya harus berjari-jari LEBIH KECIL dari rInner supaya terlihat saat objek dipotong.
5. "explode" menentukan arah part ditarik saat tampilan bongkar: "NONE", "UP", "DOWN", "RIGHT", "LEFT". Jarak dihitung otomatis. Sebarkan arahnya; jangan semua ke arah yang sama bila bisa.
6. "spin": true hanya untuk part yang berputar, dan hanya untuk kind "gear" atau cylinder dengan axis "z". "bob": true untuk part yang bergerak naik-turun.
7. Jangan menaruh dua part pada posisi dan ukuran yang persis sama.

### FORMAT (balas JSON mentah saja, tanpa teks lain)
{
  "id": "nama_objek_snake_case",
  "title": "Nama objek",
  "fits": "daftar topik yang cocok dengan assembly ini, dipisah koma",
  "parts": [
    {"id": "...", "nameId": "...", "role": "...", "kind": "tube", "params": {"rOuter": 1.0, "rInner": 0.95, "h": 3}, "x": 0, "y": 0, "z": 0, "explode": "NONE", "spin": false, "bob": false}
  ]
}

### CONTOH (objek lain, hanya untuk memperlihatkan format)
{"id":"french_press","title":"French press","fits":"cara kerja french press, seduh kopi",
 "parts":[
  {"id":"carafe","nameId":"Gelas penampung","role":"menampung air panas dan bubuk kopi selama diseduh","kind":"tube","params":{"rOuter":1.0,"rInner":0.95,"h":3.2},"y":0,"explode":"NONE"},
  {"id":"coffee","nameId":"Kopi dan air","role":"bubuk kopi yang terendam air panas hingga zatnya larut","kind":"cylinder","params":{"r":0.9,"h":2.2},"y":-0.4,"explode":"DOWN"},
  {"id":"filter","nameId":"Saringan logam","role":"menahan ampas saat batang ditekan turun","kind":"cylinder","params":{"r":0.92,"h":0.08},"y":0.4,"explode":"UP"},
  {"id":"rod","nameId":"Batang penekan","role":"menekan saringan turun sehingga ampas terpisah dari kopi","kind":"cylinder","params":{"r":0.07,"h":2.6},"y":1.7,"explode":"UP"},
  {"id":"lid","nameId":"Tutup","role":"menjaga panas dan menjadi tumpuan batang","kind":"cylinder","params":{"r":1.02,"h":0.18},"y":1.7,"explode":"UP"},
  {"id":"knob","nameId":"Knob","role":"pegangan untuk menekan batang","kind":"cylinder","params":{"r":0.22,"h":0.25},"y":3.1,"explode":"UP"}
 ]}`;
}
