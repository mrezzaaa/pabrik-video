/**
 * Tes ujung-ke-ujung penilai gambar dengan SearXNG + OmniRoute palsu (server lokal).  npm run judge:test
 * Gambar asli dibuat dengan ffmpeg (warna berbeda per kandidat) supaya hasil pilihan bisa diverifikasi dari piksel.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const PORT = 18080;
process.env.SEARXNG_URL = `http://127.0.0.1:${PORT}`;
process.env.OMNIROUTE_BASE_URL = `http://127.0.0.1:${PORT}/v1`;
process.env.IMAGE_JUDGE_MODEL = "fake-vision";

const COLORS = ["red", "green", "blue", "yellow", "cyan", "magenta"];
const tmp = fs.mkdtempSync("/tmp/judge-");
COLORS.forEach((c, i) =>
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `color=c=${c}:s=900x1500,noise=alls=30:allf=t`, "-frames:v", "1", path.join(tmp, `${i}.jpg`)]),
);

const replies: Array<string | number> = []; // string = isi jawaban LLM; number = status HTTP error
let llmCalls = 0;
let lastImagesInCall = 0;
const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (url.pathname === "/search") {
    const results = COLORS.map((_, i) => ({ img_src: `http://127.0.0.1:${PORT}/img/${i}.jpg`, url: `http://127.0.0.1:${PORT}/p${i}`, title: `jet engine compressor blades photo ${i}` }));
    res.setHeader("content-type", "application/json");
    return void res.end(JSON.stringify({ results }));
  }
  if (url.pathname.startsWith("/img/")) {
    res.setHeader("content-type", "image/jpeg");
    return void res.end(fs.readFileSync(path.join(tmp, path.basename(url.pathname))));
  }
  if (url.pathname === "/v1/chat/completions") {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      llmCalls += 1;
      lastImagesInCall = (body.match(/"type":"image_url"/g) ?? []).length;
      const next = replies.shift();
      if (typeof next === "number") {
        res.statusCode = next;
        return void res.end(JSON.stringify({ error: { message: "tidak ada dukungan vision" } }));
      }
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ id: "x", object: "chat.completion", created: 0, model: "fake", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: next ?? '{"choice":0,"reason":"default"}' } }] }));
    });
    return;
  }
  res.statusCode = 404;
  res.end();
});

function centerColor(file: string): string {
  const out = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-vf", "crop=8:8:536:956,scale=1:1,format=rgb24", "-f", "rawvideo", "-"], { encoding: "buffer" });
  const [r, g, b] = [out[0], out[1], out[2]];
  if (r > 150 && g < 100 && b < 100) return "red";
  if (g > 100 && r < 100 && b < 100) return "green";
  if (b > 150 && r < 100 && g < 100) return "blue";
  if (r > 150 && g > 150 && b < 100) return "yellow";
  if (g > 150 && b > 150 && r < 100) return "cyan";
  if (r > 150 && b > 150 && g < 100) return "magenta";
  return `?(${r},${g},${b})`;
}

async function main() {
  await new Promise<void>((r) => server.listen(PORT, "127.0.0.1", r));
  const { downloadSceneImage } = await import("../src/lib/images");
  const { resetJudgeState } = await import("../src/lib/image-judge");
  const judge = { model: "fake-vision", topic: "mesin jet", narration: "udara dikompresi", avoid: ["piston"] };
  let failed = 0;
  const expect = (name: string, got: unknown, want: unknown) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failed++;
    console.log(`${ok ? "OK  " : "GAGAL"} ${name}: ${JSON.stringify(got)}${ok ? "" : ` (harusnya ${JSON.stringify(want)})`}`);
  };
  const run = async (project: string, j?: typeof judge) => {
    const url = await downloadSceneImage("jet engine compressor blades", project, 0, new Set(), undefined, undefined, j);
    return url ? centerColor(path.join(process.cwd(), "public", url)) : null;
  };

  resetJudgeState(); replies.length = 0; llmCalls = 0;
  replies.push('{"choice":1,"reason":"foto bersih"}');
  expect("A penilai memilih #1 -> hijau", await run("jt-a", judge), "green");
  expect("A thumbnail terkirim ke model (3 gambar)", lastImagesInCall, 3);

  resetJudgeState(); replies.length = 0; llmCalls = 0;
  replies.push('{"choice":null,"reason":"semua slide teks"}', '{"choice":0,"reason":"ok"}');
  expect("B putaran 1 ditolak, putaran 2 pilih #0 -> kuning (kandidat ke-4)", await run("jt-b", judge), "yellow");
  expect("B total 2 panggilan penilai", llmCalls, 2);

  resetJudgeState(); replies.length = 0; llmCalls = 0;
  replies.push('{"choice":null,"reason":"x"}', '{"choice":null,"reason":"y"}');
  expect("C kedua putaran ditolak -> tanpa gambar", await run("jt-c", judge), null);

  resetJudgeState(); replies.length = 0; llmCalls = 0;
  replies.push(500);
  expect("D penilai error -> fallback skor teks (merah)", await run("jt-d", judge), "red");

  resetJudgeState(); replies.length = 0; llmCalls = 0;
  replies.push('{"choice":7,"reason":"ngawur"}');
  expect("E indeks di luar rentang diperlakukan sebagai gagal -> fallback merah", await run("jt-e", judge), "red");

  resetJudgeState(); replies.length = 0; llmCalls = 0;
  expect("F tanpa penilai -> perilaku lama (merah)", await run("jt-f", undefined), "red");
  expect("F tanpa panggilan LLM", llmCalls, 0);

  // Dua gagal beruntun mematikan penilai: panggilan ke-3 tidak menyentuh LLM.
  resetJudgeState(); replies.length = 0; llmCalls = 0;
  replies.push(500, 500);
  await run("jt-g1", judge); await run("jt-g2", judge);
  const before = llmCalls;
  await run("jt-g3", judge);
  expect("G setelah 2 gagal, penilai dinonaktifkan (tanpa panggilan baru)", llmCalls - before, 0);

  for (const p of ["jt-a","jt-b","jt-c","jt-d","jt-e","jt-f","jt-g1","jt-g2","jt-g3"]) fs.rmSync(path.join(process.cwd(), "public/images", p), { recursive: true, force: true });
  server.close();
  process.exit(failed ? 1 : 0);
}
main();
