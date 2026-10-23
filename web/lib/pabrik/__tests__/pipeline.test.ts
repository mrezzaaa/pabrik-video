import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  ROLES,
  finalizePlan,
  validateResearch,
  validateScript,
} from "../validators.ts";
import { runJudge } from "../judge.ts";
import { produce } from "../orchestrator.ts";
import {
  parseHeadline,
  wrapHeadline,
  valueAt,
  seriesPoints,
  valueColor,
  formatNumber,
  buildSubtitles,
  stateReadout,
} from "../hud.ts";
import { buildHudMetricFromResearch } from "../adapters.ts";
import type { Beat, JudgeRaw, Plan, Research, SearchHit } from "../types.ts";

function makeValidResearch(): Research {
  return {
    topic: "Power bank",
    hook: {
      question: "Kenapa power bank 10.000 mAh cuma ngisi HP 6.500 mAh?",
      short_answer: "Tegangan sel 3,7V harus dinaikkan ke 5V USB dengan rugi konversi.",
    },
    facts: [
      {
        claim: "Sel baterai litium-ion di dalam power bank bekerja pada tegangan nominal 3,7V.",
        label: "RESMI",
        evidence: "Datasheet sel 18650/21700 menetapkan tegangan nominal 3,7V.",
        numbers: ["3,7V", "10.000 mAh"],
        source_index: [0],
        confidence: "tinggi",
      },
      {
        claim: "Rangkaian boost converter menaikkan tegangan dari 3,7V menjadi 5V untuk port USB.",
        label: "RESMI",
        evidence: "Spesifikasi USB PD dan modul step-up DC-DC.",
        numbers: ["5V", "90%"],
        source_index: [1],
        confidence: "tinggi",
      },
      {
        claim: "Kapasitas efektif di 5V hanya sekitar 6.660 mAh setelah efisiensi konversi 90 persen.",
        label: "DIMODELKAN",
        evidence: "Rumus Wh = 10.000 mAh * 3,7V / 5V * 0,90 = 6.660 mAh pada asumsi efisiensi 90%.",
        numbers: ["6.660 mAh", "37 Wh"],
        source_index: [],
        confidence: "tinggi",
      },
      {
        claim: "Power bank murah tanpa IC proteksi berisiko mengalami overheat saat arus tinggi.",
        label: "MEDIA",
        evidence: "Pengujian teardown lab independen pada unit harga Rp25 ribu.",
        numbers: ["Rp25 ribu", "85 derajat C"],
        source_index: [2],
        confidence: "tinggi",
      },
      {
        claim: "Batas aman kabin pesawat untuk power bank adalah kapasitas energi 100 Wh.",
        label: "RESMI",
        evidence: "Aturan penerbangan sipil dan standar keselamatan baterai.",
        numbers: ["100 Wh", "27.000 mAh"],
        source_index: [3],
        confidence: "tinggi",
      },
    ],
    anatomy: [
      {
        part: "casing plastik",
        material: "polikarbonat",
        function: "Melindungi komponen dalam dari benturan dan panas.",
        visual_accent: false,
        source_index: [0],
      },
      {
        part: "sel baterai",
        material: "litium-ion",
        function: "Menyimpan energi listrik pada tegangan 3,7 volt.",
        visual_accent: true,
        source_index: [0],
      },
      {
        part: "modul pcb",
        material: "fiberglass tembaga",
        function: "Menaikkan tegangan dari 3,7 volt menjadi 5 volt USB.",
        visual_accent: true,
        source_index: [1],
      },
      {
        part: "port usb",
        material: "kuningan berlapis nikel",
        function: "Menyalurkan arus keluar menuju kabel pengisi daya.",
        visual_accent: false,
        source_index: [1],
      },
    ],
    flow: [
      "Sel baterai mengeluarkan arus DC pada tegangan 3,7 volt",
      "Modul PCB menaikkan tegangan menjadi 5 volt lewat induktor",
      "IC proteksi memantau suhu dan arus sebelum keluar ke port USB",
    ],
    myths: [
      {
        myth: "Power bank 10.000 mAh palsu kalau tidak bisa mengisi baterai 5.000 mAh dua kali penuh.",
        origin: "Ulasan pembeli marketplace",
        fact: "Konversi tegangan 3,7V ke 5V memang memangkas kapasitas mAh keluaran sekitar sepertiga.",
        source_index: [1, 2],
      },
    ],
    anchor_numbers: [
      { value: "6.660", unit: "mAh", context: "KAPASITAS RIIL 5V" },
      { value: "3,7", unit: "VOLT", context: "TEGANGAN SEL ASLI" },
    ],
    gaps: [],
  };
}

function makeValidPlan(): Plan {
  const sfxCycle = [
    "click",
    "beep",
    "whoosh_soft",
    "metal_clank",
    "spark_zap",
    "pop",
    "hiss",
    "thud",
    "cash_register",
    "water_drip",
  ];
  const texts = [
    "Kenapa power bank sepuluh ribu mili ampere cuma ngisi enam ribu?",
    "Banyak orang mengira kapasitas berkurang karena sel baterai di dalamnya palsu.",
    "Faktanya kapasitas riil di lima volt memang enam ribu enam ratus.",
    "Di balik casing plastik terdapat sel baterai litium tiga koma tujuh volt.",
    "Modul pcb bekerja menaikkan tegangan tiga koma tujuh ke lima volt.",
    "Port usb menyalurkan energi setelah terpotong sepuluh persen panas konversi.",
    "Unit murah tanpa proteksi modul pcb bisa memicu panas delapan puluh derajat.",
    "Cek label kapasitas watt hour dan bobot sel baterai sebelum membeli.",
    "Pilih unit berstandar resmi di atas seratus ribu rupiah demi keamanan.",
    "Jadi kapasitas hilang karena konversi tegangan, tulis benda lain untuk dibedah.",
  ];
  const modes: ("assembled" | "cutaway" | "exploded")[] = [
    "assembled",
    "assembled",
    "cutaway",
    "exploded",
    "exploded",
    "exploded",
    "cutaway",
    "cutaway",
    "assembled",
    "assembled",
  ];
  const explodes = [0, 0, 20, 30, 60, 90, 50, 20, 0, 0];
  const parts = [
    "casing plastik",
    "casing plastik",
    "sel baterai",
    "casing plastik",
    "modul pcb",
    "port usb",
    "modul pcb",
    "sel baterai",
    "casing plastik",
    "casing plastik",
  ];
  const colors = ["hi", "red", "hi", "hi", "pcb", "green", "red", "hi", "green", "hi"];
  const labels = [
    "KOK CUMA 6660",
    "DIKIRA SEL PALSU",
    "RIIL 6660 MAH",
    "CASING PLASTIK LUAR",
    "MODUL PCB NAIK",
    "TEGANGAN 5 VOLT",
    "BAHAYA PANAS 85C",
    "CEK ANGKA WH",
    "PILIH 37 WH",
    "BEDAH BENDA LAIN",
  ];

  const beats: Beat[] = ROLES.map((role, i) => ({
    beat_number: i + 1,
    role,
    text: texts[i],
    visual: `HERO: power bank | MODE: ${modes[i]} | EXPLODE: ${explodes[i]}% | TAMPIL: casing plastik, sel baterai, modul pcb | AKSEN: ${parts[i]} (${colors[i]}) | DETAIL: sekrup sudut, jalur tembaga | KAMERA: full`,
    sfx_keyword: sfxCycle[i],
    tulisan_layar: labels[i],
    source_refs: i === 0 || i === 9 ? [] : ["facts[0]", "anatomy[1]"],
  }));

  return finalizePlan({ beats });
}

describe("Kitabedah Validators & Judge & Orchestrator", () => {
  it("validateScript menerima plan valid dan menolak pelanggaran kontrak", () => {
    const research = makeValidResearch();
    const validPlan = makeValidPlan();
    assert.deepEqual(validateScript(research)(validPlan), []);

    // 1. Bukan 10 beat
    const wrongCount = { beats: validPlan.beats.slice(0, 9) };
    assert.ok(
      validateScript(research)(wrongCount).some((e) => e.includes("harus tepat 10 beat")),
    );

    // 2. Role salah urutan
    const wrongRole = structuredClone(validPlan);
    wrongRole.beats[1].role = "HOOK";
    assert.ok(
      validateScript(research)(wrongRole).some((e) => e.includes("role harus MITOS")),
    );

    // 3. Format visual salah
    const badVisual = structuredClone(validPlan);
    badVisual.beats[2].visual = "Gambar power bank terbuka";
    assert.ok(
      validateScript(research)(badVisual).some((e) => e.includes("format visual salah")),
    );

    // 4. Hero berbeda antar beat
    const diffHero = structuredClone(validPlan);
    diffHero.beats[3].visual = diffHero.beats[3].visual.replace(
      "HERO: power bank",
      "HERO: charger laptop",
    );
    assert.ok(
      validateScript(research)(diffHero).some((e) => e.includes("HERO berbeda dari beat 1")),
    );

    // 5. source_refs tidak ada di riset atau kosong di beat 2..9
    const badRefs = structuredClone(validPlan);
    badRefs.beats[4].source_refs = ["facts[99]"];
    assert.ok(
      validateScript(research)(badRefs).some((e) => e.includes("tidak ada di data riset")),
    );

    // 6. Total kata di luar 95-130
    const tooShort = structuredClone(validPlan);
    tooShort.beats.forEach((b) => {
      b.text = "Enam kata saja untuk tes cepat.";
    });
    assert.ok(
      validateScript(research)(tooShort).some((e) => e.includes("harus 95-130")),
    );
  });

  it("validateResearch menolak fakta RESMI/MEDIA tanpa source_index atau di luar rentang", () => {
    const r1 = makeValidResearch();
    r1.facts[0].source_index = [];
    const errEmpty = validateResearch(5)(r1);
    assert.ok(errEmpty.some((e) => e.includes("source_index kosong")));

    const r2 = makeValidResearch();
    r2.facts[1].source_index = [9];
    const errRange = validateResearch(5)(r2);
    assert.ok(errRange.some((e) => e.includes("source_index harus array integer 0-4")));
  });

  it("runJudge: gate gagal -> REJECT walau skor tinggi; issue research -> fix_node research", async () => {
    const research = makeValidResearch();
    const plan = makeValidPlan();

    const mockJudgeGateFail = async () =>
      JSON.stringify({
        gates: {
          G1_faktual: false,
          G2_kepastian: true,
          G3_struktur: true,
          G4_hero_konsisten: true,
          G5_aman: true,
        },
        issues: [
          {
            beat: 3,
            dimension: "faktual",
            severity: "blocker",
            quote: "enam ribu enam ratus",
            fix: "Sesuaikan dengan angka di riset",
            node: "script",
          },
        ],
        scores: { hook: 9.5, logika: 9.5, tempo: 9.5, visual: 9.5, cerita: 9.5 },
        verdict: "REJECT",
        fix_node: "script",
        feedback: "Skor tinggi namun gagal G1 faktual.",
      } satisfies JudgeRaw);

    const resGateFail = await runJudge(mockJudgeGateFail, "{research_json}{plan_json}{metrics_json}", research, plan);
    assert.equal(resGateFail.status, "REJECT");

    const mockJudgeResearchIssue = async () =>
      JSON.stringify({
        gates: {
          G1_faktual: false,
          G2_kepastian: true,
          G3_struktur: true,
          G4_hero_konsisten: true,
          G5_aman: true,
        },
        issues: [
          {
            beat: 4,
            dimension: "logika",
            severity: "major",
            quote: "casing plastik",
            fix: "Perbaiki kalimat",
            node: "script",
          },
          {
            beat: 7,
            dimension: "faktual",
            severity: "blocker",
            quote: "delapan puluh derajat",
            fix: "Cari data suhu batas aman IC proteksi",
            node: "research",
          },
        ],
        scores: { hook: 6.0, logika: 6.0, tempo: 6.0, visual: 6.0, cerita: 6.0 },
        verdict: "REJECT",
        fix_node: "research",
        feedback: "Data suhu perlu riset ulang.",
      } satisfies JudgeRaw);

    const resResearchFix = await runJudge(
      mockJudgeResearchIssue,
      "{research_json}{plan_json}{metrics_json}",
      research,
      plan,
    );
    assert.equal(resResearchFix.status, "REJECT");
    assert.equal(resResearchFix.fix_node, "research");
  });

  it("produce() end-to-end dengan LLM & search tiruan menghasilkan APPROVED dan 10 file SVG", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kitabedah-test-"));
    const research = makeValidResearch();
    const plan = makeValidPlan();

    const mockSearch = async (q: string): Promise<SearchHit[]> =>
      Array.from({ length: 6 }, (_, i) => ({
        title: `Hasil ${i} untuk ${q}`,
        url: `https://example.com/${encodeURIComponent(q)}/${i}`,
        snippet: `Ringkasan teknis nomor ${i} untuk topik ${q}`,
      }));

    const mockGen = async ({ prompt }: { prompt: string }) => {
      if (prompt.includes("RESEARCH_PROMPT")) {
        return JSON.stringify(research);
      }
      if (prompt.includes("SCRIPT_PROMPT")) {
        return JSON.stringify({ beats: plan.beats });
      }
      if (prompt.includes("SVG_PROMPT")) {
        return `export default function SvgScene({ progress = 0 }: { progress?: number }) {
  return (
    <svg viewBox="0 0 1080 1920" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="1080" height="1920" fill="#F3F2EC" />
      <text x="90" y="260" fontSize="60" fontWeight="700" fill="#17171A">{String(progress)}</text>
    </svg>
  );
}`;
      }
      throw new Error("Unknown prompt");
    };

    const mockJudge = async () =>
      JSON.stringify({
        gates: {
          G1_faktual: true,
          G2_kepastian: true,
          G3_struktur: true,
          G4_hero_konsisten: true,
          G5_aman: true,
        },
        issues: [],
        scores: { hook: 8.5, logika: 8.5, tempo: 8.0, visual: 8.5, cerita: 8.0 },
        verdict: "APPROVED",
        fix_node: null,
        feedback: "Semua gerbang lolos dan struktur 10 beat solid.",
      } satisfies JudgeRaw);

    const result = await produce(
      "Power bank",
      {
        gen: mockGen,
        judge: mockJudge,
        search: mockSearch,
        prompts: {
          research: "RESEARCH_PROMPT {topic} {search_results}",
          script: "SCRIPT_PROMPT {research_json}",
          judge: "JUDGE_PROMPT {research_json} {plan_json} {metrics_json}",
          svg: "SVG_PROMPT {visual_description} {beat_number} {tulisan_layar}",
        },
      },
      tmpDir,
    );

    assert.equal(result.approved, true);
    assert.equal(result.needsManualReview, false);
    assert.equal(result.svgFiles.length, 10);
    assert.ok(fs.existsSync(path.join(tmpDir, "research.json")));
    assert.ok(fs.existsSync(path.join(tmpDir, "plan.json")));
    assert.ok(fs.existsSync(path.join(tmpDir, "judge.json")));
    assert.ok(fs.existsSync(path.join(tmpDir, "narration.txt")));
    assert.ok(fs.existsSync(path.join(tmpDir, "beat-01.tsx")));
    assert.ok(fs.existsSync(path.join(tmpDir, "beat-10.tsx")));
  });

  it("hud.ts: parseHeadline, wrapHeadline, valueAt, seriesPoints, dan buildSubtitles bekerja murni", () => {
    const segs = parseHeadline("Kenapa kapasitas *bocor* terus?");
    assert.deepEqual(segs, [
      { text: "Kenapa kapasitas ", hl: false },
      { text: "bocor", hl: true },
      { text: " terus?", hl: false },
    ]);

    const lines = wrapHeadline("Kenapa kapasitas *bocor* terus menerus saat panas?", 20);
    assert.ok(lines.length >= 2);
    assert.ok(lines.flat().some((s) => s.text === "bocor" && s.hl === true));

    const research = makeValidResearch();
    const plan = makeValidPlan();
    const metric = buildHudMetricFromResearch(research, plan);
    const timings = plan.beats.map((b, i) => ({
      beat: b.beat_number,
      start: i * 3,
      end: (i + 1) * 3,
    }));

    const vMid = valueAt(plan, metric, timings, 4.5);
    assert.ok(Number.isFinite(vMid) && vMid > 0);
    assert.equal(typeof valueColor(vMid, metric), "string");
    assert.ok(formatNumber(3.7, 1).includes("3,7"));
    assert.equal(stateReadout(metric, plan, 0), plan.beats[0].tulisan_layar);

    const pts = seriesPoints(plan, metric, timings, 7.5);
    assert.ok(pts.length >= 4);

    const subs = buildSubtitles(
      "Di balik casing plastik terdapat sel baterai litium tiga koma tujuh volt.",
      0,
      3.0,
    );
    assert.ok(subs.length >= 2);
    assert.equal(subs[0].start, 0);
    assert.equal(subs[subs.length - 1].end, 3.0);
  });
});
