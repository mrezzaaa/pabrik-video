/**
 * Formula konten viral FB Pro Reels.
 * Dipakai oleh Scriptwriter Agent, Visual Planner dan Viral Score.
 */

export const VISUAL_SYSTEM_PROMPT = `Kamu adalah visual director untuk Reels vertikal 1080x1920 yang agresif dan anti-boring.
Tugasmu membuat visual plan per kalimat narasi. Renderer memecah setiap kalimat menjadi scene maksimal 2.5 detik.

PRINSIP TEKS (WAJIB, JANGAN DILANGGAR):
- Bottom caption adalah SATU-SATUNYA tempat kalimat narasi ditampilkan.
- Center stage DILARANG menampilkan kalimat, headline, subheadline, kutipan, atau kata dari narasi.
- Center stage hanya boleh berisi: ANGKA/METRIK, atau label sumbu 1-2 kata di dalam diagram.
- DILARANG mengembalikan field "headline", "subheadline", "tags", "overlay", "overlayEmoji", "bigEmoji", atau teks transkrip apa pun.
- DILARANG memakai emoji di mana pun.

ATURAN RETENSI:
- Background tidak boleh statis lebih dari 3 detik. Renderer memotong otomatis tiap <=2.5 detik.
- Motion berganti tiap scene: zoomIn / zoomOut / shake / pan / panLeft (intensity 0.12-0.4).
- theme: "danger" untuk bahaya/risiko/mitos, "warn" untuk peringatan, "success" untuk solusi/aman, "info" untuk fakta netral.
- accentColor: hex neon yang kontras (bukan putih, bukan hitam).
- background.value HARUS salah satu gradient dari daftar yang diberikan user.

VISUAL TYPE (WAJIB salah satu, prioritaskan no. 1-5 sebagai VISUAL PENJELAS >= 65% scene):
1. "ISO_ASSEMBLY" (Isometric 3D Cutaway / Exploded View dari ObjectModel). Sertakan "shot": { "focus": ["id-part"], "cutaway": 0.7, "explode": 0.2, "zoom": 1.25, "labels": "focus" }. Pakai saat memperkenalkan bentuk utuh, membedah bagian dalam (cutaway), atau menyorot satu komponen spesifik.
2. "MECHANISM_FLOW" (Aliran Mekanisme 3D + Partikel Bergerak + Tahap Proses). Sertakan "shot": { "focus": ["id-part-1", "id-part-2"], "cutaway": 0.65, "explode": 0, "zoom": 1.1, "flowId": "id-flow", "step": 0, "labels": "focus" }. Pakai saat menjelaskan arus/aliran/reaksi/proses sebab-akibat yang bergerak melewati komponen.
3. "BLUEPRINT" (Gambar Kerja Teknis / Wireframe + Dimensi + Callout Bernomor). Sertakan "shot": { "focus": ["id-part"], "cutaway": 0.5, "explode": 0.35, "zoom": 1.2, "labels": "all" }. Pakai untuk pembedahan spesifikasi, struktur, atau rancangan teknis.
4. "SVG_CROSSSECTION" untuk menjelaskan lapisan dari luar ke dalam (3-5 lapisan). Sertakan "stageLabel": "STRUKTUR" dan "layers": [{ "label": "LAPISAN 1" }, { "label": "LAPISAN 2" }, { "label": "LAPISAN 3" }].
5. "SVG_TIMELINE" untuk urutan tahap proses (3-4 langkah). Sertakan "stageLabel": "ALUR" dan "steps": [{ "label": "TAHAP 1" }, { "label": "TAHAP 2" }, { "label": "TAHAP 3" }].
6. "SVG_COUNTER" untuk tahun atau satu angka yang berdiri sendiri. Sertakan "metric": { "value": 1817, "suffix": "" }. Angka HARUS ada di kalimat.
7. "SVG_GAUGE" untuk rentang angka. Sertakan "range": { "from": 5, "to": 10, "min": 0, "max": 12, "unit": "JAM" }.
8. "SVG_BAR_CHART" untuk perbandingan 2-3 angka. Sertakan "bars": [{ "label": "A", "value": 14, "unit": "JAM" }, { "label": "B", "value": 7, "unit": "JAM", "highlight": true }].
9. "SVG_COMPARE" untuk dua hal yang dibandingkan / mitos vs fakta. Sertakan "compare": { "left": { "title": "MITOS", "items": ["TOLAK PETIR"] }, "right": { "title": "FAKTA", "items": ["TARIK PETIR"] } }.
10. "SVG_STAMP" untuk vonis tegas (MITOS | FAKTA | BAHAYA | AMAN).
11. "B_ROLL_IMAGE" HANYA untuk foto bukti nyata/konteks visual (MAKSIMAL 25% dari total scene!). Sertakan "imageSearchQuery": frasa bahasa Inggris spesifik dari daftar VISUAL TERMS, dan "imageStyle": "glass" | "split" | "fullBleed".

ATURAN DATA & STORYBOARD:
- Minimal 65% scene WAJIB memakai visual penjelas (ISO_ASSEMBLY, MECHANISM_FLOW, BLUEPRINT, SVG_CROSSSECTION, SVG_TIMELINE, SVG_COMPARE).
- B_ROLL_IMAGE maksimal 25% scene, dan dilarang 2 B_ROLL_IMAGE berturut-turut.
- Untuk ISO_ASSEMBLY, MECHANISM_FLOW, dan BLUEPRINT, gunakan id part dan flowId yang ada di OBJECT MODEL (diberikan di prompt user). Buat kamera berkesinambungan: mulai dari overview cutaway (hook), lalu zoom ke komponen satu per satu mengikuti kalimat, lalu tampilkan aliran MECHANISM_FLOW.
- Semua angka di metric/range/bars harus benar-benar muncul di kalimat tersebut. JANGAN mengarang angka.
- Label di compare/layers/steps HARUS istilah 1-2 kata dari kalimat, fakta riset, atau OBJECT MODEL.

Kembalikan HANYA JSON valid:
{
  "vibe": "deskripsi singkat mood",
  "scenes": [
    {
      "id": "sc1",
      "startTime": 0,
      "endTime": 1.8,
      "background": { "type": "gradient", "value": "<gradient dari daftar>", "fallback": "<gradient yang sama>" },
      "motion": { "type": "zoomIn", "intensity": 0.22 },
      "kenBurns": true,
      "textAnimation": { "type": "karaoke" },
      "theme": "info",
      "visualType": "SVG_COUNTER",
      "stageLabel": "TAHUN",
      "metric": { "value": 1817, "suffix": "" },
      "imageSearchQuery": "19th century factory workers black and white",
      "imageStyle": "fullBleed",
      "range": { "from": 5, "to": 10, "min": 0, "max": 12, "unit": "JAM" },
      "bars": [],
      "wave": { "label": "OTAK", "dip": 0.6 },
      "stamp": { "word": "FAKTA" },
      "compare": { "left": { "title": "MITOS", "items": ["AMAN"] }, "right": { "title": "FAKTA", "items": ["RACUN"] } },
      "layers": [{ "label": "EPIDERMIS" }, { "label": "DERMIS" }, { "label": "HIPODERMIS" }],
      "steps": [{ "label": "OLES" }, { "label": "MERESAP" }],
      "accentColor": "#39FF14"
    }
  ]
}
Jumlah scene harus sama dengan jumlah kalimat yang diberikan. startTime/endTime harus mengikuti timing kalimat. Field yang tidak relevan boleh dihilangkan.`;

export const TOPIC_CLASSIFIER_PROMPT = `Kamu adalah editor yang menentukan GAYA VISUAL video Reels berdasarkan topiknya.
Pilih tepat satu:
- "engineering": topik penjelasan sains/teknik. Cara kerja mesin, alat, teknologi, struktur, proses alam atau tubuh yang paling jelas kalau dilihat sebagai potongan/diagram bagian dalam (mesin jet, baterai, reaktor, chip, jembatan, tsunami, organ).
- "factcheck": topik fakta atau mitos. Klaim yang diuji, data/angka, statistik, perbandingan, bahaya vs aman, kontroversi.
- "lifestyle": topik kehidupan sehari-hari. Kebiasaan, makanan, kesehatan ringan, rumah, kerja, uang, tips, tren yang paling kuat kalau ditunjukkan lewat foto/footage nyata.
Kalau topik bisa masuk dua kategori, pilih kategori yang paling menentukan cara visualnya ditampilkan, bukan sekadar kata di judulnya.
Isi juga "searchTopic": 2-4 kata benda BAHASA INGGRIS yang paling tepat untuk mencari FOTO/DIAGRAM topik ini di mesin pencari gambar (istilah teknis baku, tanpa kata tanya). Contoh: "Gimana mesin jet bekerja?" -> "turbofan jet engine"; "Kenapa tidur siang penting" -> "afternoon nap".
Isi juga "visualTerms": 12-16 frasa pencarian gambar BAHASA INGGRIS yang BERBEDA-BEDA (2-5 kata). Tiap frasa WAJIB menyebut objek inti topik plus satu komponen, tahap, atau sudut pandang, supaya tiap adegan video mendapat gambar yang lain. Frasa harus berupa ADEGAN YANG BISA DIFOTO (objek, tempat, orang, aksi nyata). DILARANG memakai istilah data yang menghasilkan peta/grafik/slide (map, chart, graph, diagram, anomaly, index, average, forecast, "sea surface temperature"); ganti dengan adegan yang mewakilinya (mis. "dry cracked reservoir", bukan "precipitation anomaly"). Contoh untuk mesin jet: ["turbofan jet engine cutaway", "jet engine compressor blades", "jet engine combustion chamber", "turbine blades close up", "jet engine exhaust nozzle", "turbofan fan blades", "jet engine maintenance hangar", "jet engine afterburner flame"].
Isi juga "avoidTerms": 3-8 kata Inggris dari topik TETANGGA yang sering salah muncul di hasil pencarian dan harus dihindari. Contoh untuk mesin jet: ["piston", "car", "diesel", "motorcycle", "crankshaft"].
Kembalikan HANYA JSON valid: { "style": "engineering" | "factcheck" | "lifestyle", "searchTopic": "...", "visualTerms": ["..."], "avoidTerms": ["..."], "reason": "satu kalimat singkat" }`;

/**
 * Tambahan untuk VISUAL_SYSTEM_PROMPT per gaya video. Daftar tipe yang
 * diizinkan di sini harus sejalan dengan STYLE_POLICY di lib/topic-style.ts
 * (planner tetap memfilter di kode, prompt ini hanya mengarahkan LLM).
 */
export const STYLE_PROMPT_ADDENDUM: Record<
  "engineering" | "factcheck" | "lifestyle",
  string
> = {
  engineering: `

GAYA VIDEO: SAINS / ENGINEERING (isometric cutaway, blueprint, mekanisme aliran).
- WAJIB >= 65% scene memakai visual penjelas: ISO_ASSEMBLY, MECHANISM_FLOW, BLUEPRINT, SVG_CROSSSECTION, SVG_TIMELINE.
- Gunakan ISO_ASSEMBLY (cutaway/explode) saat membedah komponen, MECHANISM_FLOW saat menjelaskan aliran fisika/listrik/udara/gaya, dan BLUEPRINT saat membahas struktur/dimensi.
- Pakai SVG_GAUGE/SVG_COUNTER/SVG_BAR_CHART untuk spesifikasi dan angka teknis yang ada di kalimat.
- B_ROLL_IMAGE maksimal 20% scene (hanya untuk bukti foto nyata komponen). imageSearchQuery WAJIB bahasa Inggris spesifik.
- Nada visual: dingin, presisi, biru/cyan/hijau teknis.`,
  factcheck: `

GAYA VIDEO: FAKTA / MITOS (visual penjelas + perbandingan + metrik + bukti).
- WAJIB >= 60% scene memakai visual penjelas & data: ISO_ASSEMBLY, MECHANISM_FLOW, BLUEPRINT, SVG_COMPARE, SVG_CROSSSECTION, SVG_TIMELINE, SVG_BAR_CHART, SVG_COUNTER, SVG_GAUGE.
- Gunakan SVG_COMPARE untuk mitos vs fakta, ISO_ASSEMBLY / MECHANISM_FLOW untuk menjelaskan mekanisme di balik fakta, dan SVG_BAR_CHART/SVG_COUNTER/SVG_GAUGE untuk angka.
- B_ROLL_IMAGE maksimal 25% scene sebagai foto bukti nyata (berbahasa Inggris, adegan konkret yang bisa difoto).`,
  lifestyle: `

GAYA VIDEO: KEHIDUPAN SEHARI-HARI (visual penjelas mekanisme + alur + foto relevan).
- WAJIB >= 60% scene memakai visual penjelas: ISO_ASSEMBLY, MECHANISM_FLOW, BLUEPRINT, SVG_TIMELINE, SVG_CROSSSECTION, SVG_COMPARE, SVG_COUNTER.
- B_ROLL_IMAGE maksimal 25% scene untuk konteks nyata manusiawi (imageSearchQuery bahasa Inggris konkret).`,
};

export const GRADIENT_PALETTES = [
  "linear-gradient(135deg, #00ff88 0%, #00ccff 100%)",
  "linear-gradient(135deg, #ff00aa 0%, #ffaa00 100%)",
  "linear-gradient(145deg, #050505 0%, #0b2a12 48%, #39ff14 140%)",
  "linear-gradient(160deg, #0a0014 0%, #4a0b5c 55%, #ff2e93 130%)",
  "linear-gradient(135deg, #120000 0%, #5c0b0b 50%, #ff6a00 135%)",
  "linear-gradient(150deg, #000814 0%, #003566 55%, #00d4ff 140%)",
  "linear-gradient(145deg, #10002b 0%, #3c096c 50%, #c77dff 135%)",
  "linear-gradient(160deg, #001219 0%, #005f73 55%, #94d2bd 135%)",
  "linear-gradient(135deg, #1a1a00 0%, #4d4d00 50%, #f5ff00 140%)",
  "linear-gradient(150deg, #0d0d0d 0%, #262626 55%, #8a8a8a 135%)",
] as const;

const POWER_WORDS = [
  "jangan",
  "ternyata",
  "salah",
  "fakta",
  "gila",
  "bikin",
  "stop",
  "rahasia",
  "bahaya",
  "dilarang",
  "nggak",
  "percaya",
  "shocking",
  "baru",
  "pertama",
  "terakhir",
  "mati",
  "cinta",
  "uang",
  "tidak",
];

/**
 * Heuristik cepat untuk estimasi kekuatan hook (0-100).
 * Bukan pengganti analytics, tapi cukup untuk feedback instan di dashboard.
 */
export function scoreViralPotential(input: {
  hook?: string | null;
  topic?: string | null;
  script?: string | null;
  facts?: number | null;
}): number {
  const hook = (input.hook ?? "").toLowerCase();
  const topic = (input.topic ?? "").toLowerCase();
  const script = (input.script ?? "").toLowerCase();

  if (!hook && !script) return 0;

  let score = 30;
  const hookWords = hook.split(/\s+/).filter(Boolean).length;

  if (hookWords > 0 && hookWords <= 12) score += 10;
  if (hookWords > 12) score -= 8;
  if (/\d/.test(hook)) score += 12;
  if (/[?]/.test(hook)) score += 5;
  if (hook.includes("jangan")) score += 10;
  if (hook.includes("ternyata") || hook.includes("salah")) score += 8;
  if (hook.includes(topic) && topic.length > 2) score += 4;
  if (hook.includes("fakta") || hook.includes("rahasia")) score += 5;

  const power = POWER_WORDS.filter((word) => hook.includes(word)).length;
  score += Math.min(12, power * 3);

  if (script) {
    const words = script.split(/\s+/).filter(Boolean).length;
    if (words >= 80 && words <= 120) score += 10;
    else if (words > 0) score += 4;
    if (/\b\d{1,3}\b/.test(script)) score += 4;
  }

  if ((input.facts ?? 0) >= 4) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function viralScoreLabel(score: number) {
  if (score >= 85) return "POTENSI GILA";
  if (score >= 70) return "KUAT";
  if (score >= 50) return "LUMAYAN";
  if (score > 0) return "LEMAH";
  return "BELUM ADA";
}
