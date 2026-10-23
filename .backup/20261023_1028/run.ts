import { readFile } from "node:fs/promises";
import { anthropicLLM } from "./llm";
import { produce } from "./orchestrator";
import type { SearchHit } from "./types";

const SEARXNG = process.env.SEARXNG_URL ?? "http://localhost:8080";

async function search(q: string): Promise<SearchHit[]> {
  const url = `${SEARXNG}/search?q=${encodeURIComponent(q)}&format=json&language=id`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SearXNG ${res.status}`);
  const data: any = await res.json();
  return (data.results ?? []).slice(0, 8).map((r: any) => ({
    title: String(r.title ?? ""),
    url: String(r.url ?? ""),
    snippet: String(r.content ?? ""),
  }));
}

// Pengambil teks halaman kasar. Ganti dengan readability/extractor pilihanmu kalau perlu.
async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const topic = process.argv.slice(2).join(" ").trim();
  if (!topic) throw new Error('Pakai: npm run produce -- "Stop kontak & kabel roll"');

  const load = (n: string) => readFile(new URL(`../prompts/${n}.md`, import.meta.url), "utf8");
  const [research, script, judge, svg] = await Promise.all(
    ["research", "script", "judge", "svg"].map(load),
  );

  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const result = await produce(
    topic,
    {
      gen: anthropicLLM(process.env.GEN_MODEL ?? "claude-sonnet-5-5"),
      judge: anthropicLLM(process.env.JUDGE_MODEL ?? "claude-opus-5-5"), // beda dari penulis
      search,
      fetchText,
      prompts: { research, script, judge, svg },
      onEvent: (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`),
      maxRounds: 2,
      renderOnReject: false,
    },
    `out/${slug}`,
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
