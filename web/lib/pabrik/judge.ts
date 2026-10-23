import { callJSON, fill, type LLM } from "./llm";
import { computeMetrics } from "./validators";
import type { Gates, Issue, JudgeRaw, JudgeResult, Plan, Research, Scores } from "./types";

/**
 * INI tempat "kode yang menyertai prompt juri".
 * LLM hanya menemukan masalah dan memberi skor per dimensi.
 * Skor akhir, status, dan fix_node dihitung di sini supaya deterministik.
 */

const W = { hook: 0.2, logika: 0.2, tempo: 0.1, visual: 0.2, cerita: 0.1, faktual: 0.2 };
const APPROVE_OVERALL = 7.0; // kalibrasi dengan 15-20 video nyata, lalu geser
const APPROVE_MIN_DIM = 5.5;
const SCORE_KEYS: (keyof Scores)[] = ["hook", "logika", "tempo", "visual", "cerita"];
const GATE_KEYS: (keyof Gates)[] = [
  "G1_faktual", "G2_kepastian", "G3_struktur", "G4_hero_konsisten", "G5_aman",
];
const SEV = { blocker: 0, major: 1, minor: 2 } as const;

function validateJudge(x: any): string[] {
  const e: string[] = [];
  if (!x || typeof x !== "object") return ["root bukan objek"];
  GATE_KEYS.forEach((k) => {
    if (typeof x.gates?.[k] !== "boolean") e.push(`gates.${k} harus boolean`);
  });
  SCORE_KEYS.forEach((k) => {
    const v = x.scores?.[k];
    if (typeof v !== "number" || v < 0 || v > 10) e.push(`scores.${k} harus angka 0-10`);
  });
  if (!Array.isArray(x.issues)) e.push("issues harus array");
  else
    x.issues.forEach((i: any, n: number) => {
      if (!(i.severity in SEV)) e.push(`issues[${n}].severity tidak valid`);
      if (!["script", "visual", "research"].includes(i.node)) e.push(`issues[${n}].node tidak valid`);
      if (!i.fix) e.push(`issues[${n}].fix kosong`);
    });
  return e;
}

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function disagree(runs: JudgeRaw[]): boolean {
  for (const k of SCORE_KEYS) {
    const v = runs.map((r) => r.scores[k]);
    if (Math.max(...v) - Math.min(...v) > 1.5) return true;
  }
  return GATE_KEYS.some((k) => new Set(runs.map((r) => r.gates[k])).size > 1);
}

function aggregate(runs: JudgeRaw[]): JudgeResult {
  const scores = Object.fromEntries(
    SCORE_KEYS.map((k) => [k, Math.round(median(runs.map((r) => r.scores[k])) * 10) / 10]),
  ) as unknown as Scores;

  // gate lolos hanya jika MAYORITAS MUTLAK run meloloskannya (2 run: keduanya harus true)
  const gates = Object.fromEntries(
    GATE_KEYS.map((k) => [k, runs.filter((r) => r.gates[k]).length > runs.length / 2]),
  ) as unknown as Gates;

  // gabung issues, buang duplikat (beat + dimensi + node), urutkan blocker dulu, maksimal 8
  const seen = new Set<string>();
  const issues: Issue[] = [];
  for (const i of runs.flatMap((r) => r.issues)) {
    const key = `${i.beat}|${i.dimension}|${i.node}`;
    if (!seen.has(key)) {
      seen.add(key);
      issues.push(i);
    }
  }
  issues.sort((a, b) => SEV[a.severity] - SEV[b.severity]);
  const top = issues.slice(0, 8);

  const faktual = gates.G1_faktual && gates.G2_kepastian ? 10 : 0;
  const overall =
    Math.round(
      (scores.hook * W.hook +
        scores.logika * W.logika +
        scores.tempo * W.tempo +
        scores.visual * W.visual +
        scores.cerita * W.cerita +
        faktual * W.faktual) * 100,
    ) / 100;

  const gatesOk = GATE_KEYS.every((k) => gates[k]);
  const minDim = Math.min(...SCORE_KEYS.map((k) => scores[k]));
  const status = gatesOk && overall >= APPROVE_OVERALL && minDim >= APPROVE_MIN_DIM ? "APPROVED" : "REJECT";

  // fix_node dihitung dari issue blocker/major; research selalu menang
  let fix_node: JudgeResult["fix_node"] = null;
  if (status === "REJECT") {
    const serious = top.filter((i) => i.severity !== "minor");
    const pool = serious.length ? serious : top;
    if (pool.some((i) => i.node === "research")) fix_node = "research";
    else {
      const s = pool.filter((i) => i.node === "script").length;
      const v = pool.filter((i) => i.node === "visual").length;
      fix_node = s === 0 && v === 0 ? "script" : s > v ? "script" : v > s ? "visual" : "both";
    }
  }

  return {
    gates, scores, faktual, overall, status, fix_node,
    issues: top,
    feedback: runs[0].feedback,
    runs: runs.length,
  };
}

export async function runJudge(
  llm: LLM,
  template: string,
  research: Research,
  plan: Plan,
): Promise<JudgeResult> {
  const prompt = fill(template, {
    research_json: JSON.stringify(research),
    plan_json: JSON.stringify({ beats: plan.beats }),
    metrics_json: JSON.stringify(computeMetrics(plan)),
  });
  const once = () =>
    callJSON<JudgeRaw>(llm, prompt, validateJudge, { temperature: 0.3, label: "judge", retries: 1 });

  // 2 run paralel (temperature 0.3 supaya ada variasi); kalau tidak sepakat, run ketiga lalu median
  const runs = await Promise.all([once(), once()]);
  if (disagree(runs)) runs.push(await once());
  return aggregate(runs);
}
