import { mkdir, writeFile } from "node:fs/promises";
import { callChecked, callJSON, fill, type LLM } from "./llm";
import { runJudge } from "./judge";
import {
  cleanSvgCode, finalizePlan, validateResearch, validateScript, validateSvg,
} from "./validators";
import type { Issue, JudgeResult, Plan, Research, SearchHit } from "./types";

export interface Deps {
  /** model penulis (research, script, svg) */
  gen: LLM;
  /** model juri: sebaiknya BEDA dari gen */
  judge: LLM;
  /** satu query -> daftar hasil (SearXNG) */
  search: (query: string) => Promise<SearchHit[]>;
  /** opsional: ambil teks halaman penuh untuk 3 hasil teratas */
  fetchText?: (url: string) => Promise<string>;
  prompts: { research: string; script: string; judge: string; svg: string };
  onEvent?: (msg: string) => void;
  maxRounds?: number; // putaran perbaikan setelah juri pertama
  renderOnReject?: boolean;
}

export interface Candidate {
  research: Research;
  plan: Plan;
  judge: JudgeResult;
}

export interface Result extends Candidate {
  topic: string;
  approved: boolean;
  needsManualReview: boolean;
  svgFiles: string[];
}

const formatResults = (hits: SearchHit[]) =>
  hits.map((h, i) => `[${i}] ${h.title} | ${h.url} | ${h.snippet}`).join("\n");

const formatIssues = (issues: Issue[]) =>
  issues
    .map((i) => `- Beat ${i.beat} [${i.dimension}/${i.severity}] "${i.quote}" -> ${i.fix}`)
    .join("\n");

export async function produce(topic: string, deps: Deps, outDir?: string): Promise<Result> {
  const log = deps.onEvent ?? (() => {});
  const maxRounds = deps.maxRounds ?? 2;

  /* ---------------------------- 1. RESEARCH ---------------------------- */
  async function doResearch(extraQueries: string[] = [], feedback = ""): Promise<Research> {
    const queries = [
      `${topic} cara kerja`,
      `${topic} SNI standar`,
      `${topic} teardown komponen internal`,
      `${topic} mitos`,
      ...extraQueries,
    ];
    const all = (await Promise.all(queries.map((q) => deps.search(q).catch(() => [] as SearchHit[])))).flat();
    const seen = new Set<string>();
    const hits = all.filter((h) => (seen.has(h.url) ? false : (seen.add(h.url), true))).slice(0, 24);
    if (hits.length < 5) throw new Error(`hasil pencarian terlalu sedikit (${hits.length}) untuk "${topic}"`);

    if (deps.fetchText) {
      await Promise.all(
        hits.slice(0, 3).map(async (h) => {
          try {
            h.snippet = (await deps.fetchText!(h.url)).slice(0, 2500) || h.snippet;
          } catch {
            /* pakai snippet asli */
          }
        }),
      );
    }

    let prompt = fill(deps.prompts.research, { topic, search_results: formatResults(hits) });
    if (feedback) prompt += `\n\nCATATAN REVISI DARI JURI (perbaiki dalam riset ini):\n${feedback}`;
    log(`research: ${hits.length} hasil pencarian`);
    return callJSON<Research>(deps.gen, prompt, validateResearch(hits.length), { label: "research" });
  }

  /* ----------------------------- 2. SCRIPT ----------------------------- */
  async function doScript(research: Research, prev?: Plan, issues: Issue[] = []): Promise<Plan> {
    let prompt = fill(deps.prompts.script, { research_json: JSON.stringify(research) });
    if (prev && issues.length) {
      prompt +=
        `\n\nREVISI\nRencana sebelumnya:\n${JSON.stringify({ beats: prev.beats })}\n\n` +
        `Masalah dari juri. Perbaiki masalah ini; beat lain jangan diubah kecuali perlu demi konsistensi. ` +
        `Tetap 10 beat dengan format output yang sama.\n${formatIssues(issues)}`;
    }
    const plan = await callJSON<Plan>(deps.gen, prompt, validateScript(research), { label: "script" });
    return finalizePlan(plan);
  }

  /* ------------------------ 3. JUDGE + RETRY LOOP ----------------------- */
  let research = await doResearch();
  let plan = await doScript(research);
  let best: Candidate | null = null;

  for (let round = 0; round <= maxRounds; round++) {
    const judge = await runJudge(deps.judge, deps.prompts.judge, research, plan);
    log(`juri putaran ${round}: overall=${judge.overall} status=${judge.status} fix=${judge.fix_node}`);
    if (!best || judge.overall > best.judge.overall) best = { research, plan, judge };
    if (judge.status === "APPROVED" || round === maxRounds) break;

    if (judge.fix_node === "research") {
      const rIssues = judge.issues.filter((i) => i.node === "research");
      const extra = rIssues.map((i) => `${topic} ${i.fix}`.slice(0, 120));
      research = await doResearch(extra, formatIssues(rIssues));
      plan = await doScript(research);
    } else {
      // script / visual / both: kirim semua issue non-research ke penulis naskah
      plan = await doScript(research, plan, judge.issues.filter((i) => i.node !== "research"));
    }
  }

  const final = best!;
  const approved = final.judge.status === "APPROVED";
  const svgFiles: string[] = [];

  /* ---------------------------- 4. SVG PER BEAT ---------------------------- */
  if (outDir && (approved || deps.renderOnReject)) {
    await mkdir(outDir, { recursive: true });
    svgFiles.push(...(await renderBeats(final.plan, deps, outDir, log)));
  }
  if (outDir) {
    await writeFile(`${outDir}/research.json`, JSON.stringify(final.research, null, 2));
    await writeFile(`${outDir}/plan.json`, JSON.stringify(final.plan, null, 2));
    await writeFile(`${outDir}/judge.json`, JSON.stringify(final.judge, null, 2));
    await writeFile(`${outDir}/narration.txt`, final.plan.narration_text ?? "");
  }

  return { topic, ...final, approved, needsManualReview: !approved, svgFiles };
}

async function renderBeats(
  plan: Plan,
  deps: Deps,
  outDir: string,
  log: (m: string) => void,
): Promise<string[]> {
  const files: string[] = [];
  const queue = [...plan.beats];
  const worker = async () => {
    for (let b = queue.shift(); b; b = queue.shift()) {
      const prompt = fill(deps.prompts.svg, {
        visual_description: b.visual,
        beat_number: String(b.beat_number),
        tulisan_layar: b.tulisan_layar,
      });
      const code = await callChecked<string>(
        deps.gen,
        prompt,
        (raw) => {
          const c = cleanSvgCode(raw);
          const errors = validateSvg(c);
          return errors.length ? { ok: false, errors } : { ok: true, value: c };
        },
        { label: `svg beat ${b.beat_number}`, maxTokens: 16000, temperature: 0.5 },
      );
      const file = `${outDir}/beat-${String(b.beat_number).padStart(2, "0")}.tsx`;
      await writeFile(file, code);
      files.push(file);
      log(`svg beat ${b.beat_number} ok`);
    }
  };
  await Promise.all([worker(), worker(), worker()]); // 3 paralel
  return files.sort();
}
