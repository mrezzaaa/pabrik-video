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

### VISUAL ENTITY ACCURACY GUARDRAILS (STRICT ANTI-HALLUCINATION - CRITICAL):
Ketika skenario membahas komponen mikroelektronika, komputasi, atau semikonduktor (CPU, GPU, RAM, Microchip, Transistor, Circuit, Motherboard, Wafer, Silicon die, Integrated Circuit):
- DILARANG KERAS MENGALAMI HALUSINASI MEKANIKAL MAKRO: JANGAN PERNAH memvisualisasikan atau menyertakan analogi mekanik seperti roda gigi (gears), silinder mesin (cylinders/pistons), katup uap (steam valves), atau jam mekanik (clocks/clockwork).
- AI HARUS secara eksplisit memvisualisasikan: Arsitektur sirkuit semikonduktor mikro, silicon die-shot mikroskopis, pola fotolitografi sirkuit, nanometer transistor grid, packaging flip-chip, atau trace tembaga PCB multi-layer presisi tinggi.
- Search query untuk mainVisual/cutaway HARUS sangat spesifik ke semikonduktor nyata (misal: "detailed silicon die shot microarchitecture microscopic transistor circuit blueprint", bukan gambar roda gigi mekanik).

### STYLE IDENTITY PRESERVATION (NON-NEGOTIABLE):
Gaya estetika visual HARUS tetap konsisten:
- Gambar teknis engineering (technical engineering drawings).
- Blueprint arsitektur dengan latar belakang deep navy blue (#0B1D36) dan garis vektor cyan (#38BDF8) presisi tinggi.
- Diagram skematik analitis, visualisasi bergaya sinar-X (x-ray aesthetics), serta penunjuk callout CAD yang bersih dan akurat. Modifikasi hanya dilakukan pada akurasi objek intinya, BUKAN pada tema seninya.

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

export const COMPUTING_REGEX_PATTERNS = [
  /\bcpus?\b/i,
  /\bgpus?\b/i,
  /\bram\b/i,
  /\bmicrochips?\b/i,
  /\bmicroprocessors?\b/i,
  /\bmicroelectronics?\b/i,
  /\bprocessors?\b/i,
  /\btransistors?\b/i,
  /\bsemiconductors?\b/i,
  /\bsilicon\s+die\b/i,
  /\bdie[- ]shot\b/i,
  /\bsilicon\s+wafers?\b/i,
  /\bmotherboards?\b/i,
  /\bchipsets?\b/i,
  /\bintegrated\s+circuits?\b/i,
  /\bphotolithography\b/i,
  /\bsemiconductor\s+interconnects?\b/i,
  /\blogic\s+gates?\b/i,
  /\bnanometer\s+transistors?\b/i,
];

export const COMPUTING_KEYWORDS = [
  "cpu",
  "gpu",
  "microchip",
  "microprocessor",
  "transistor",
  "semiconductor",
  "silicon die",
  "die-shot",
  "photolithography",
];

export const COMPUTING_POSITIVE_GUARDRAILS =
  "semiconductor microcircuit architecture, high-resolution silicon die-shot, microscopic photolithography interconnects, nanometer transistor grid layout, cleanroom CAD blueprint, high-contrast engineering schematic, crisp vector technical lines, precision x-ray circuit inspection";

export const COMPUTING_NEGATIVE_PROMPTS =
  "gears, cogs, pistons, mechanical cylinders, wheels, clocks, steam, valves, mechanical engine, clockwork, pipes, industrial machinery, mechanical cogwheels, steampunk, brass gears";

export const ENGINEERING_AESTHETIC_SYSTEM =
  "technical engineering drawing, blueprint architectural aesthetic, deep navy blue background #0B1D36, sharp cyan CAD lines #38BDF8, isometric x-ray wireframe cutaway, crisp dimensional callout labels, cleanroom technical diagram, no artistic clutter";

/**
 * Mendeteksi apakah teks mengandung istilah teknis mikroelektronika/komputer
 * Menggunakan regex boundary (\b) agar kata seperti 'garam' atau 'program' tidak salah memicu 'ram'
 */
export function isComputingEntity(text: string): boolean {
  if (!text) return false;
  return COMPUTING_REGEX_PATTERNS.some((pat) => pat.test(text));
}

/**
 * Memberikan System Prompt Guardrails & Negative Prompts yang ketat
 * untuk generator gambar cepat (SDXL-Turbo / Flux.1 Schnell / SearXNG)
 */
export function applyVisualGuardrails(
  basePrompt: string,
  contextText: string = ""
): { prompt: string; negativePrompt: string; isComputing: boolean } {
  const combined = `${basePrompt} ${contextText}`;
  const computing = isComputingEntity(combined);

  let conditionedPrompt = basePrompt.trim();
  let negativePrompt = "blurry, low resolution, messy, cartoon, 3d render plastic, low contrast";

  if (computing) {
    conditionedPrompt = `${conditionedPrompt}, ${COMPUTING_POSITIVE_GUARDRAILS}, ${ENGINEERING_AESTHETIC_SYSTEM}`;
    negativePrompt = `${COMPUTING_NEGATIVE_PROMPTS}, ${negativePrompt}`;
  } else {
    conditionedPrompt = `${conditionedPrompt}, ${ENGINEERING_AESTHETIC_SYSTEM}`;
  }

  return {
    prompt: conditionedPrompt,
    negativePrompt,
    isComputing: computing,
  };
}
