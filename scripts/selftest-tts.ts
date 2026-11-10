import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { check, eq, finish, section } from "./lib/assert";

/** Server tiruan Voice Studio: tiap kalimat = nada 0.28 dtk per kata, antar kalimat hening 0.3 dtk, ada hening di ujung. */
function mockVoiceStudio() {
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const { input } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const sentences = String(input).split(/(?<=[.!?])\s+/).filter(Boolean);
      const dir = os.tmpdir();
      const out = path.join(dir, `mock-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp3`);
      const inputs: string[] = [];
      const parts: string[] = [];
      let n = 0;
      const add = (src: string) => {
        inputs.push("-f", "lavfi", "-i", src);
        parts.push(`[${n}:a]`);
        n += 1;
      };
      add("anullsrc=r=44100:cl=mono:d=0.35");
      sentences.forEach((s, i) => {
        add(`sine=frequency=${300 + i * 90}:sample_rate=44100:duration=${(s.split(/\s+/).length * 0.28).toFixed(3)}`);
        if (i < sentences.length - 1) add("anullsrc=r=44100:cl=mono:d=0.3");
      });
      add("anullsrc=r=44100:cl=mono:d=0.5");
      execFileSync("ffmpeg", ["-y", ...inputs, "-filter_complex", `${parts.join("")}concat=n=${n}:v=0:a=1[o]`, "-map", "[o]", "-c:a", "libmp3lame", out], { stdio: "ignore" });
      fs.readFile(out).then((buf) => {
        res.setHeader("content-type", "audio/mpeg");
        res.end(buf);
        fs.rm(out).catch(() => undefined);
      });
    });
  });
  return new Promise<{ baseUrl: string; close: () => void }>((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      resolve({ baseUrl: `http://127.0.0.1:${port}/v1`, close: () => server.close() });
    }),
  );
}

async function main() {
  const mock = await mockVoiceStudio();
  process.env.VOICESTUDIO_BASE_URL = mock.baseUrl;

  const sp = await import("../src/lib/speech-prep");
  const tl = await import("../src/lib/engine/timeline");
  const { alignWithSentenceTimings } = await import("../src/lib/alignment");
  const { synthesizeBeatsToFile } = await import("../src/lib/tts");

  section("speech-prep");
  eq("angka + satuan", sp.toSpokenIndonesian("Pesawat melaju 900 km/jam."), "Pesawat melaju sembilan ratus kilometer per jam.");
  eq("ribuan", sp.toSpokenIndonesian("Melewati 1.500 derajat Celsius."), "Melewati seribu lima ratus derajat Celsius.");
  eq("persen + desimal", sp.toSpokenIndonesian("Sebesar 12,5% saja."), "Sebesar dua belas koma lima persen saja.");
  eq("tahun", sp.toSpokenIndonesian("Pada 2025 ini."), "Pada dua ribu dua puluh lima ini.");
  eq("rupiah", sp.toSpokenIndonesian("Harga Rp 5.000."), "Harga lima ribu rupiah.");
  eq("rentang", sp.toSpokenIndonesian("Tidur 5-10 jam."), "Tidur lima sampai sepuluh jam.");
  eq("kata biasa tak berubah", sp.toSpokenIndonesian("Mesin jet menelan udara."), "Mesin jet menelan udara.");

  section("timeline (murni)");
  const sil = tl.parseSilences("[silencedetect @ x] silence_start: 1.2\n[silencedetect @ x] silence_end: 1.6 | silence_duration: 0.4\nsilence_start: 3\nsilence_end: 3.5");
  eq("parse silence", sil, [{ start: 1.2, end: 1.6 }, { start: 3, end: 3.5 }]);
  eq("snap ke jeda terdekat", tl.snapBoundaries([1.3], [{ start: 1.2, end: 1.6 }], 4), [1.4]);
  eq("tanpa jeda cocok = proporsional", tl.snapBoundaries([2], [{ start: 0.4, end: 0.5 }], 4), [2]);
  const spans = tl.sentenceSpans(4, ["Satu dua tiga empat.", "Lima enam tujuh delapan."], [{ start: 1.9, end: 2.2 }]);
  check("batas kalimat ke tengah jeda", Math.abs(spans.spans[0].end - 2.05) < 0.01 && spans.snapped === 1, spans);

  section("sintesis beat dengan audio nyata");
  const beats = [
    { text: "Mesin jet menelan udara sebanyak satu ruang tamu.", gapAfter: 0.28 },
    { text: "Pertama kompresor menekan udara sampai empat puluh kali. Lalu udara masuk ruang bakar dan terbakar hebat. Gas panas memutar turbin besar.", gapAfter: 0.1 },
    { text: "Simpan videonya sekarang juga.", gapAfter: 0 },
  ];
  const out = path.join(os.tmpdir(), `beats-${Date.now()}.mp3`);
  const result = await synthesizeBeatsToFile(beats, out, { voice: "alloy" });
  eq("provider voicestudio", result.provider, "voicestudio");
  const expected = [8 * 0.28, 8 * 0.28 + 8 * 0.28 + 5 * 0.28 + 0.6, 4 * 0.28];
  result.beats.forEach((b, i) => check(`durasi beat ${i + 1} ~ ${expected[i].toFixed(2)}s (dapat ${b.duration.toFixed(2)})`, Math.abs(b.duration - expected[i]) < 0.2));
  const gapsTotal = 0.28 + 0.1;
  const sum = result.beats.reduce((n, b) => n + b.duration, 0) + gapsTotal;
  check(`total file ~ jumlah beat + jeda (${result.total.toFixed(2)} vs ${sum.toFixed(2)})`, Math.abs(result.total - sum) < 0.25);
  eq("beat 2 punya 2 jeda internal", result.beats[1].silences.length, 2);

  section("batas kalimat dari audio vs kebenaran");
  const beat2Sentences = ["Pertama kompresor menekan udara sampai empat puluh kali.", "Lalu udara masuk ruang bakar dan terbakar hebat.", "Gas panas memutar turbin besar."];
  const truth1 = 8 * 0.28 + 0.15;
  const truth2 = truth1 + 0.15 + 8 * 0.28 + 0.15; // hening 0.3 -> titik tengah 0.15 di tiap sisi
  const res2 = tl.sentenceSpans(result.beats[1].duration, beat2Sentences, result.beats[1].silences);
  eq("kedua batas ditarik ke jeda nyata (bukan proporsional)", res2.snapped, 2);
  check(`batas 1 ${res2.spans[0].end.toFixed(2)} ~ ${truth1.toFixed(2)}`, Math.abs(res2.spans[0].end - truth1) < 0.12);
  check(`batas 2 ${res2.spans[1].end.toFixed(2)} ~ ${truth2.toFixed(2)}`, Math.abs(res2.spans[1].end - truth2) < 0.15);

  section("caption dari timing terukur");
  const sentences = [
    { id: "s1", text: "Gas melewati 1.500 derajat.", emphasisWords: ["1.500"], emotion: "curious" as const },
    { id: "s2", text: "Lalu turbin berputar.", emphasisWords: [], emotion: "curious" as const },
  ];
  const aligned = alignWithSentenceTimings(sentences, [{ id: "s1", start: 0, end: 2 }, { id: "s2", start: 2.3, end: 3.5 }]);
  const s1 = aligned.words.filter((w) => w.sentenceId === "s1");
  const s2 = aligned.words.filter((w) => w.sentenceId === "s2");
  check("kata s1 di dalam [0,2]", s1[0].start === 0 && s1[s1.length - 1].end <= 2);
  check("kata s2 mulai tepat di 2.3", s2[0].start === 2.3, s2[0]);
  check("token berangka lebih panjang dari kata pendek", (s1[2].end - s1[2].start) > (s1[1].end - s1[1].start), s1);

  await fs.rm(out).catch(() => undefined);
  mock.close();
  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
