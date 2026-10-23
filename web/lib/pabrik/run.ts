import path from "node:path";
import { anthropicLLM } from "./llm.ts";
import { produce } from "./orchestrator.ts";
import {
  createPipelineLLMs,
  fetchPageText,
  loadPrompts,
  omnirouteLLM,
  searxngSearch,
} from "./adapters.ts";

async function main() {
  const topic = process.argv.slice(2).join(" ").trim();
  if (!topic) throw new Error('Pakai: npm run produce -- "Stop kontak & kabel roll"');

  const prompts = await loadPrompts();

  const useAnthropic = Boolean(process.env.ANTHROPIC_API_KEY && !process.env.OMNIROUTE_URL);
  const routed = createPipelineLLMs((stage, model) =>
    console.log(`[${new Date().toISOString().slice(11, 19)}] [${stage}] model=${model}`),
  );

  const gen = useAnthropic
    ? anthropicLLM(process.env.GEN_MODEL ?? "claude-sonnet-5-5")
    : process.env.GEN_MODEL
    ? omnirouteLLM(process.env.GEN_MODEL)
    : routed.gen;

  const judge = useAnthropic
    ? anthropicLLM(process.env.JUDGE_MODEL ?? "claude-opus-5-5")
    : process.env.JUDGE_MODEL
    ? omnirouteLLM(process.env.JUDGE_MODEL)
    : routed.judge;

  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const outRoot = path.resolve(process.cwd(), process.cwd().endsWith("/web") ? "../out" : "out");

  const result = await produce(
    topic,
    {
      gen,
      judge,
      search: searxngSearch,
      fetchText: fetchPageText,
      prompts,
      onEvent: (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`),
      maxRounds: 2,
      renderOnReject: false,
    },
    path.join(outRoot, slug),
  );

  console.log(
    `\nSelesai: ${result.approved ? "APPROVED" : "PERLU REVIEW MANUAL"} ` +
      `(overall ${result.judge.overall}, ${result.plan.total_words} kata, ${result.svgFiles.length} SVG)`,
  );
  if (!result.approved) console.log("Feedback juri:", result.judge.feedback);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
