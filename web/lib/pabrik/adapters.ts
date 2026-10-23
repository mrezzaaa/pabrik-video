import { readFile } from "node:fs/promises";
import path from "node:path";
import type { LLM } from "./llm.ts";
import type { Result } from "./orchestrator.ts";
import type { Metric, Plan, Research, SearchHit } from "./types.ts";
import type { PipelineState } from "./graph.ts";

interface OpenAIChatResponse {
  choices?: { message?: { content?: string } }[];
}

interface SearxResponse {
  results?: { title?: string; url?: string; content?: string }[];
}

/**
 * Adapter OpenAI-compatible (Omniroute / NVIDIA NIM) yang memenuhi kontrak tipe `LLM`.
 * Otomatis fallback ke FALLBACK_MODEL bila model utama gagal.
 */
export function omnirouteLLM(
  modelName: string,
  opts: {
    baseUrl?: string;
    apiKey?: string;
    fallbackModel?: string;
  } = {},
): LLM {
  const baseUrl = (opts.baseUrl ?? process.env.OMNIROUTE_URL ?? "http://localhost:20128/v1").replace(/\/$/, "");
  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY ?? "free-key";
  const fallbackModel = opts.fallbackModel ?? process.env.FALLBACK_MODEL;

  async function requestModel(
    targetModel: string,
    prompt: string,
    temperature: number,
    maxTokens: number,
  ): Promise<string> {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) {
      throw new Error(`LLM ${targetModel} (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as OpenAIChatResponse;
    return data.choices?.[0]?.message?.content ?? "";
  }

  return async ({ prompt, temperature = 0.3, maxTokens = 8000 }) => {
    try {
      return await requestModel(modelName, prompt, temperature, maxTokens);
    } catch (err) {
      if (fallbackModel && fallbackModel !== modelName) {
        return await requestModel(fallbackModel, prompt, temperature, maxTokens);
      }
      throw err;
    }
  };
}

/**
 * Membuat pasangan { gen, judge } LLM yang merutekan tahap research, script, dan svg
 * ke model env masing-masing (RESEARCH_MODEL, SCRIPT_MODEL, SVG_MODEL) serta JURY_MODEL.
 */
export function createPipelineLLMs(onModelSwitch?: (stage: string, model: string) => void): {
  gen: LLM;
  judge: LLM;
} {
  const researchModel = process.env.RESEARCH_MODEL ?? "nvidia/moonshotai/kimi-k3";
  const scriptModel = process.env.SCRIPT_MODEL ?? "nvidia/meta/muse-glimmer-30b";
  const svgModel = process.env.SVG_MODEL ?? "nvidia/nvidia/nemotron-3.5-lightning-30b-a3b";
  const juryModel = process.env.JURY_MODEL ?? "nvidia/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

  const researchClient = omnirouteLLM(researchModel);
  const scriptClient = omnirouteLLM(scriptModel);
  const svgClient = omnirouteLLM(svgModel);
  const judgeClient = omnirouteLLM(juryModel);

  const gen: LLM = async (req) => {
    if (req.prompt.includes("Beat Visual Context:") || req.prompt.includes("export default function SvgScene")) {
      onModelSwitch?.("visual", svgModel);
      return svgClient(req);
    }
    if (req.prompt.includes("Search Results") || req.prompt.includes("source_index")) {
      onModelSwitch?.("research", researchModel);
      return researchClient(req);
    }
    onModelSwitch?.("script", scriptModel);
    return scriptClient(req);
  };

  const judge: LLM = async (req) => {
    onModelSwitch?.("jury", juryModel);
    return judgeClient(req);
  };

  return { gen, judge };
}

/**
 * Adapter pencarian SearXNG yang menormalisasi SEARXNG_URL dan mengembalikan SearchHit[].
 */
export async function searxngSearch(query: string): Promise<SearchHit[]> {
  const rawBase = process.env.SEARXNG_URL ?? "http://localhost:8080";
  let origin = "http://localhost:8080";
  try {
    origin = new URL(rawBase).origin;
  } catch {
    origin = rawBase.replace(/\/search.*$/, "").replace(/\/$/, "");
  }

  const url = `${origin}/search?q=${encodeURIComponent(query)}&format=json&language=id`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`SearXNG ${res.status}`);
  const data = (await res.json()) as SearxResponse;
  return (data.results ?? []).slice(0, 8).map((r) => ({
    title: String(r.title ?? ""),
    url: String(r.url ?? ""),
    snippet: String(r.content ?? ""),
  }));
}

/**
 * Pengambil teks halaman kasar untuk 3 hasil teratas.
 */
export async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Membaca keempat file prompt dari folder prompts/ monorepo.
 */
export async function loadPrompts(customDir?: string): Promise<{
  research: string;
  script: string;
  judge: string;
  svg: string;
}> {
  const candidates = [
    customDir,
    path.resolve(process.cwd(), "prompts"),
    path.resolve(process.cwd(), "../prompts"),
  ].filter((p): p is string => Boolean(p));

  let baseDir = candidates[0];
  for (const dir of candidates) {
    try {
      await readFile(path.join(dir, "01_research.md"), "utf8");
      baseDir = dir;
      break;
    } catch {
      // try next candidate
    }
  }

  const [research, script, svg, judge] = await Promise.all([
    readFile(path.join(baseDir, "01_research.md"), "utf8"),
    readFile(path.join(baseDir, "02_script.md"), "utf8"),
    readFile(path.join(baseDir, "03_svg.md"), "utf8"),
    readFile(path.join(baseDir, "04_jury.md"), "utf8"),
  ]);

  return { research, script, judge, svg };
}

/**
 * Membangun objek telemetri `Metric` default dari `research.anchor_numbers` & `plan.beats`
 * untuk dipakai oleh fungsi-fungsi di `hud.ts` (valueAt, seriesPoints, stateReadout).
 */
export function buildHudMetricFromResearch(research: Research, plan: Plan): Metric {
  if (plan.metric && Array.isArray(plan.metric.states) && plan.metric.states.length > 0) {
    return plan.metric;
  }

  const anchor = research?.anchor_numbers?.[0];
  const baseNum = anchor ? parseFloat(String(anchor.value).replace(/[^0-9.,-]/g, "").replace(",", ".")) : 100;
  const peak = Number.isFinite(baseNum) && baseNum > 0 ? baseNum : 100;
  const unit = anchor?.unit ?? "%";
  const label = anchor?.context ?? "TELEMETRI";

  const curve = [0.25, 0.35, 0.65, 0.45, 0.7, 0.85, 1.0, 0.6, 0.5, 0.8];
  const states = plan.beats.map((b, i) => {
    const id = b.hud?.state ?? `s${i + 1}`;
    b.hud = { state: id };
    return {
      id,
      value: Math.round(peak * (curve[i] ?? 0.5) * 10) / 10,
      readout: b.tulisan_layar,
    };
  });

  return {
    label,
    unit,
    decimals: Number.isInteger(peak) ? 0 : 1,
    warn_at: Math.round(peak * 0.7 * 10) / 10,
    danger_at: Math.round(peak * 0.9 * 10) / 10,
    states,
  };
}

/**
 * Memetakan Result dari orchestrator produce() ke PipelineState untuk Web UI & Remotion Player.
 */
export function mapResultToPipelineState(
  result: Result,
  svgByBeat: Record<number, string>,
): PipelineState {
  const totalWords = result.plan.total_words ?? 0;
  const narrationText =
    result.plan.narration_text ?? result.plan.beats.map((b) => b.text.trim()).join(" ");
  const hudMetric = buildHudMetricFromResearch(result.research, result.plan);

  return {
    topic: result.topic,
    researchData: result.research,
    scriptData: {
      total_words: totalWords,
      narration_text: narrationText,
      metric: hudMetric,
      beats: result.plan.beats.map((b) => ({
        beat_number: b.beat_number,
        role: b.role,
        text: b.text,
        visual: b.visual,
        sfx_keyword: b.sfx_keyword,
        tulisan_layar: b.tulisan_layar,
        source_refs: b.source_refs,
        hud: b.hud,
        svgCode: svgByBeat[b.beat_number],
      })),
    },
    svgComponents: svgByBeat,
    juryData: {
      scores: {
        hook: result.judge.scores.hook,
        tempo: result.judge.scores.tempo,
        sinkron: result.judge.scores.visual,
        overall: result.judge.overall,
        logika: result.judge.scores.logika,
        cerita: result.judge.scores.cerita,
        faktual: result.judge.faktual,
      },
      gates: result.judge.gates,
      issues: result.judge.issues,
      status: result.judge.status,
      fix_node: result.judge.fix_node,
      feedback: result.judge.feedback,
      needsManualReview: result.needsManualReview,
    },
    loopCount: result.judge.runs,
  };
}
