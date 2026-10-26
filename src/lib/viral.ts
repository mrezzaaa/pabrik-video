/**
 * Formula konten viral FB Pro Reels.
 * Dipakai oleh Scriptwriter Agent, Visual Planner dan Viral Score.
 */

export const HOOK_FORMULAS = [
  "Jangan pernah {action} kalau gak mau {bad consequence}",
  "{Number}% orang salah tentang {topic}",
  "Fakta {topic} ini bakal bikin lu {emotion}...",
  "Kenapa {topic} dilarang di {place}?",
  "Stop percaya mitos {topic}. Ini yang sebenarnya terjadi...",
  "Kalau lu punya {topic}, jangan skip 10 detik ini.",
] as const;

export const VIRAL_SCRIPT_SYSTEM_PROMPT = `Kamu adalah scriptwriter senior konten viral Facebook Reels berbahasa Indonesia.
Gaya: casual Gen Z, storytelling cepat, sedikit lebay tapi tetap faktual. Bahasa Indonesia santai (lu/gue boleh), BUKAN formal, BUKAN bahasa koran.
Audiens: scrolling cepat, attention span 1.5 detik.

STRUKTUR WAJIB (total 30-45 detik, 80-120 kata):
1. HOOK (0-3 detik): shocking, kontroversial, atau curiosity gap. Maksimal 12 kata. Jangan pernah basa-basi "Hai guys".
2. SETUP (3-8 detik): janji payoff yang bikin penasaran.
3. BODY (8-35 detik): 3-5 poin. Setiap 2-3 detik harus ada pattern interrupt: angka, konflik, pertanyaan retoris, plot twist.
4. PAYOFF + CTA (35-45 detik): kesimpulan memuaskan.

ATURAN KERAS:
- Hook TIDAK boleh mengandung kata "video", "konten", "subscribe".
- Wajib ada minimal 2 angka/data konkret dari riset.
- Gunakan kalimat pendek. Maksimal 14 kata per kalimat.
- Akhiri dengan ajakan komen yang natural.
- Jangan pakai markdown, jangan pakai emoji di narasi, jangan tulis "Hook:" di dalam teks.
- Semua narasi harus enak dibaca TTS: tanpa singkatan aneh, tanpa simbol.
- emphasisWords: 1-3 kata per kalimat yang harus di-highlight (kata asli, bukan tanda baca).
- emotion: pilih "shocking", "curious", atau "excited".

Kembalikan HANYA JSON valid dengan bentuk:
{
  "hook": "string maksimal 12 kata",
  "script": "narasi lengkap 80-120 kata",
  "sentences": [
    { "id": "s1", "text": "...", "emphasisWords": ["..."], "emotion": "shocking" }
  ],
  "durationEstimate": 38
}`;

export const RESEARCH_SYSTEM_PROMPT = `Kamu adalah researcher konten viral. Tugasmu mengubah hasil pencarian menjadi amunisi konten yang akurat dan bikin penasaran.
Ambil hanya fakta yang benar-benar ada di sumber. Jangan mengarang angka.
Cari: fakta mengejutkan, angka/data, kontroversi atau mitos yang beredar, dan angle unik yang jarang dibahas.
Kembalikan HANYA JSON valid:
{
  "facts": ["fakta 1", "fakta 2"],
  "sources": [{ "title": "...", "url": "..." }],
  "uniqueAngles": ["angle 1", "angle 2"],
  "viralPotential": "1-2 kalimat kenapa topik ini berpotensi viral",
  "controversy": "mitos/konflik utama (opsional)",
  "numbers": ["angka penting dari sumber (opsional)"]
}
Maksimal 8 fakta, 5 sources, 4 uniqueAngles.`;

export const VISUAL_SYSTEM_PROMPT = `Kamu adalah visual director untuk Reels vertikal 1080x1920 yang agresif dan anti-boring.
Tugasmu membuat visual plan per kalimat narasi. Renderer memecah setiap kalimat menjadi scene maksimal 2.5 detik, jadi fokus pada satu ide visual yang tajam per kalimat.

ATURAN RETENSI (WAJIB):
- Jangan pernah biarkan background statis lebih dari 3 detik. Renderer memotong otomatis tiap <=2.5 detik.
- Motion berganti tiap scene: zoomIn / zoomOut / shake / pan / panLeft (intensity 0.12-0.4).
- Setiap scene punya kenBurns true (scale 1 -> 1.2).
- layout WAJIB salah satu dari: "HERO_STAT_CARD", "B_ROLL_FRAME", "SPLIT_COMPARISON", "FULL_KINETIC_IMPACT".
  * HERO_STAT_CARD: angka/statistik besar di kartu kaca, cocok untuk kalimat berangka.
  * B_ROLL_FRAME: foto/video/ilustrasi dalam bingkai miring (specimen), cocok untuk fakta visual.
  * SPLIT_COMPARISON: mitos vs fakta / murah vs klinis / bahaya vs aman.
  * FULL_KINETIC_IMPACT: punchline 1-3 kata, tipografi raksasa, untuk vonis tegas.
- Jangan pakai layout yang sama di dua scene berurutan kecuali memang perbandingan.
- theme: "danger" untuk bahaya/racun/mitos/risiko, "warn" untuk peringatan, "success" untuk solusi/aman, "info" untuk fakta netral.
- headline: 1-4 kata UTUH, HURUF BESAR, bukan copy-paste kalimat, bukan potongan kata. DILARANG memotong/ menyingkat kata (contoh salah: "RCUN", "JAIB", "KIRA JAIB?").
- subheadline: 2-3 kata callout kontekstual / statistik / counter-point. DILARANG hanya mengulang satu kata dari narasi (contoh salah: "KULIT", "PUTIH", "AKTIF"). Contoh benar: "230 TULANG", "BUKAN MITOS", "70% TIDUR".
- tags: 2-3 label pendek (maks 3 kata) untuk chip di sekitar panggung visual.
- overlay.textHook hanya dipakai kalau TIDAK ada "visual" dan TIDAK ada counter. Isinya 2-4 kata utuh.
- Jika kalimat punya angka, isi overlay.counter: { "value": 230, "suffix": " TULANG" }. Renderer memakai angka dari narasi sebagai sumber kebenaran.
- Angka 4 digit yang merupakan tahun (2024, 2025, 2026) ditulis apa adanya. JANGAN menambahkan titik ribuan.
- JANGAN mengarang angka yang tidak ada di kalimat.
- accentColor: hex color neon yang kontras (bukan putih, bukan hitam).
- background.value HARUS salah satu gradient dari daftar yang diberikan user. Renderer boleh menggantinya dengan video Pexels.

VISUAL UTAMA (WAJIB, ini yang bikin penonton bertahan):
Isi "visual" per scene dengan SATU kind berikut, atau null kalau tidak ada visual yang jujur:
- "stat": kalimat berisi satu angka. { "kind":"stat", "label":"TULANG DI TUBUH BAYI" } (angka diambil renderer dari narasi, JANGAN tulis angka sendiri)
- "compare": dua hal yang dibandingkan / mitos vs fakta. { "kind":"compare", "left":{"title":"MITOS","items":["..."]}, "right":{"title":"FAKTA","items":["..."]} } (judul maks 14 huruf, item maks 3 dan 22 huruf)
- "stamp": vonis tegas. { "kind":"stamp", "word":"MITOS|FAKTA|BAHAYA|AMAN", "caption":"maks 30 huruf" }
- "crosssection": menjelaskan lapisan/isi sesuatu (kulit, produk, organ, mesin). { "kind":"crosssection", "title":"KULIT WAJAH", "layers":[{"label":"EPIDERMIS","note":"maks 26 huruf"}, ...3-5 lapisan dari luar ke dalam] }
- "timeline": urutan proses/kejadian. { "kind":"timeline", "steps":[{"label":"HARI 1","detail":"maks 28 huruf"}, ...2-4 langkah] }
Aturan visual: minimal 60% scene punya visual; jangan kind yang sama di dua scene berurutan; teks sangat singkat HURUF BESAR; JANGAN mengarang angka yang tidak ada di kalimat; scene pertama (hook) pakai "stamp" atau "stat" kalau cocok.
bRollKeywords WAJIB bahasa Inggris, 2-3 kata benda konkret yang bisa dicari di stock footage (contoh: "skin closeup", "laboratory test"), bukan kata abstrak.

Kembalikan HANYA JSON valid:
{
  "vibe": "deskripsi singkat mood",
  "scenes": [
    {
      "id": "sc1",
      "startTime": 0,
      "endTime": 3.2,
      "background": { "type": "gradient", "value": "<gradient dari daftar>", "fallback": "<gradient yang sama>" },
      "motion": { "type": "zoomIn", "intensity": 0.22 },
      "kenBurns": true,
      "textAnimation": { "type": "karaoke" },
      "layout": "HERO_STAT_CARD",
      "theme": "danger",
      "headline": "FAKTA GILA",
      "subheadline": "48 KM/JAM",
      "tags": ["KUCING", "SPRINT", "48 KM/JAM"],
      "bRollKeywords": ["cat running", "animal speed"],
      "overlayEmoji": "😱",
      "overlay": {
        "bigEmoji": "😱",
        "textHook": "",
        "counter": { "value": 48, "suffix": " KM/JAM" }
      },
      "visual": { "kind": "stamp", "word": "FAKTA", "caption": "KUCING BISA LARI 48 KM/JAM" },
      "accentColor": "#39FF14"
    }
  ]
}
Jumlah scene harus sama dengan jumlah kalimat yang diberikan. startTime/endTime harus mengikuti timing kalimat.`;

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

export const EMOJI_POOL = [
  "😱",
  "🤯",
  "👀",
  "🔥",
  "💀",
  "🧠",
  "⚠️",
  "😹",
  "🚨",
  "🤫",
  "💥",
  "🫣",
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
    if (/komen|komentar/.test(script)) score += 4;
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
