/**
 * Pengecekan offline (tanpa LLM/TTS/Docker) untuk jalur tech-3D.
 * Jalankan: npm run check:tech
 */
import assert from "node:assert/strict";
import {
  ASSEMBLIES,
  ASSEMBLY_IDS,
} from "../src/remotion/tech3d/assemblies";
import { buildGeometry } from "../src/remotion/tech3d/materials";
import {
  MIN_BEATS,
  SAMPLE_PISTON_PROPS,
  TechStoryboardSchema,
  compileBeatsToSpec,
  totalFrames,
} from "../src/lib/tech-storyboard";
import { buildTechDirectorPrompt } from "../src/lib/prompts";

let passed = 0;
const t = (name: string, fn: () => void) => {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e: any) {
    console.error(`  FAIL ${name}\n       ${e.message}`);
    process.exitCode = 1;
  }
};

const beat = (o: Record<string, unknown> = {}) => ({
  narration: "Ini kalimat narasi yang cukup panjang untuk lolos validasi.",
  hudLabel: "label hud",
  ...o,
});

console.log("Skema storyboard");

t("output LLM berantakan dinormalisasi (huruf kecil, id salah dibuang)", () => {
  const sb = TechStoryboardSchema.parse({
    assemblyId: "  PISTON_ENGINE ",
    beats: [
      beat({ state: { look: "blueprint", explode: "utuh", section: "closed" } }),
      beat({ focusPartId: "PISTON", callouts: [{ partId: "ngawur", text: "x" }, { partId: "Rod", text: "batang" }] }),
      beat({ state: { section: "cut" }, callouts: [{ partId: "piston", text: "" }, { partId: "block", text: "a" }, { partId: "head", text: "b" }] }),
      beat({ state: { explode: "EXPLODED" } }),
      beat({}),
      beat({}),
    ],
  });
  assert.equal(sb.assemblyId, "piston_engine");
  assert.equal(sb.beats[1].focusPartId, "piston");
  assert.deepEqual(sb.beats[1].callouts, [{ partId: "rod", text: "BATANG" }]);
  assert.equal(sb.beats[2].callouts.length, 2, "callout dibatasi 2");
  assert.equal(sb.beats[2].callouts[0].text, "PISTON", "text kosong -> nama part");
  assert.equal(sb.beats[2].state.section, 1);
  assert.equal(sb.beats[3].state.explode, 1);
  assert.equal(sb.beats[5].state.explode, 1, "state mewarisi beat sebelumnya");
  assert.equal(sb.beats[5].state.section, 1, "section ikut diwarisi");
  assert.equal(sb.beats[0].hudLabel, "LABEL HUD");
});

t('assemblyId "NONE" lolos tanpa beat', () => {
  const sb = TechStoryboardSchema.parse({ assemblyId: "none", fitReason: "tidak ada assembly", beats: [] });
  assert.equal(sb.assemblyId, "NONE");
  assert.equal(sb.beats.length, 0);
});

t("assemblyId tidak dikenal ditolak dengan daftar katalog di pesan error", () => {
  const r = TechStoryboardSchema.safeParse({ assemblyId: "microwave", beats: [beat(), beat(), beat(), beat(), beat()] });
  assert.equal(r.success, false);
  if (!r.success) assert.match(r.error.issues[0].message, /piston_engine/);
});

t(`beat kurang dari ${MIN_BEATS} ditolak`, () => {
  const r = TechStoryboardSchema.safeParse({ assemblyId: "piston_engine", beats: [beat(), beat()] });
  assert.equal(r.success, false);
});

t("narasi terlalu pendek ditolak", () => {
  const r = TechStoryboardSchema.safeParse({ assemblyId: "piston_engine", beats: Array(6).fill({ narration: "hai" }) });
  assert.equal(r.success, false);
});

console.log("Compiler keyframe");

t("durasi total = jumlah durasi beat", () => {
  const spec = compileBeatsToSpec(SAMPLE_PISTON_PROPS);
  assert.equal(spec.durationInFrames, totalFrames(SAMPLE_PISTON_PROPS.beats));
});

t("keyframe monotonik naik & nilai 0..1", () => {
  const spec = compileBeatsToSpec(SAMPLE_PISTON_PROPS);
  for (const tr of [spec.reveal, spec.explode, spec.section]) {
    for (let i = 1; i < tr.length; i++) assert.ok(tr[i].frame > tr[i - 1].frame, "frame harus naik");
    for (const k of tr) assert.ok(k.value >= 0 && k.value <= 1);
  }
});

t("durasi beat pendek tidak membuat keyframe terbalik", () => {
  const props = { ...SAMPLE_PISTON_PROPS, beats: SAMPLE_PISTON_PROPS.beats.map((b, i) => ({ ...b, durationInFrames: i % 2 ? 20 : 61 })) };
  const spec = compileBeatsToSpec(props);
  for (const tr of [spec.reveal, spec.explode, spec.section])
    for (let i = 1; i < tr.length; i++) assert.ok(tr[i].frame > tr[i - 1].frame);
  for (const c of spec.callouts) assert.ok(c.to > c.from);
});

t("callout, highlight, dan fase terbentuk; sisi callout bergantian", () => {
  const spec = compileBeatsToSpec(SAMPLE_PISTON_PROPS);
  assert.equal(spec.phases.length, SAMPLE_PISTON_PROPS.beats.length);
  assert.ok(spec.highlights.length >= 4);
  assert.notEqual(spec.callouts[0].side, spec.callouts[1].side);
  const ids = new Set(spec.parts.map((p) => p.id));
  for (const c of spec.callouts) assert.ok(ids.has(c.partId));
  for (const h of spec.highlights) assert.ok(ids.has(h.partId));
});

console.log("Katalog assembly");

for (const id of ASSEMBLY_IDS) {
  t(`${id}: geometri semua part valid (vertex ada & tidak NaN)`, () => {
    for (const p of ASSEMBLIES[id].parts) {
      const g = buildGeometry(p);
      const pos = g.getAttribute("position");
      assert.ok(pos && pos.count > 0, `${p.id} kosong`);
      for (let i = 0; i < pos.array.length; i++) assert.ok(Number.isFinite(pos.array[i]), `${p.id} NaN`);
    }
  });
  t(`${id}: id part unik & punya nama + fungsi`, () => {
    const ids = ASSEMBLIES[id].parts.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const p of ASSEMBLIES[id].parts) assert.ok(p.nameId && p.role);
  });
}

console.log("Prompt");

t("prompt memuat semua assembly & part dari katalog", () => {
  const prompt = buildTechDirectorPrompt();
  for (const id of ASSEMBLY_IDS) {
    assert.ok(prompt.includes(`"${id}"`), `assembly ${id} tidak ada di prompt`);
    for (const p of ASSEMBLIES[id].parts) assert.ok(prompt.includes(`- ${p.id} =`), `part ${p.id} tidak ada`);
  }
  assert.ok(prompt.includes("NONE"));
});

console.log(`\n${passed} cek lolos${process.exitCode ? ", ADA YANG GAGAL" : ""}`);
