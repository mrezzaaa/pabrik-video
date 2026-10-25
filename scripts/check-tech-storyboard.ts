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
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeGeneratedAssembly } from "../src/lib/assembly-gen";
import {
  getCatalog,
  loadSavedAssemblies,
  saveAssembly,
} from "../src/lib/assembly-store";
import { makeTechStoryboardSchema } from "../src/lib/tech-storyboard";
import { sceneBounds } from "../src/remotion/tech3d/geometry";

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

console.log("Generator assembly baru (LLM -> normalizer)");

// Keluaran LLM yang sengaja berantakan: satuan mm, huruf campur, angka berupa string.
const PEN = {
  id: "Ballpoint Pen!",
  title: "Pulpen",
  fits: "cara kerja pulpen",
  parts: [
    { id: "Barrel", nameId: "Badan", role: "rumah semua komponen", kind: "TUBE", params: { rOuter: "5", rInner: 4, h: "140" }, y: 0, explode: "none" },
    { id: "ink_tube", nameId: "Tabung tinta", role: "menyimpan tinta", kind: "cylinder", params: { r: 1.5, h: 120 }, y: 5, explode: "up", spin: true },
    { id: "spring", nameId: "Pegas", role: "mengembalikan mata pena", kind: "tube", params: { rOuter: 3, rInner: 2.6, h: 40 }, y: 30, explode: "UP" },
    { id: "tip", nameId: "Ujung pena", role: "menahan bola penulis", kind: "cone", params: { rTop: 0.6, rBottom: 4, h: 15 }, y: -77, explode: "DOWN" },
    { id: "clip", nameId: "Klip", role: "menjepit ke saku", kind: "box", params: { w: 2, h: 50, d: 1 }, x: 5.5, y: 50, explode: "RIGHT" },
    { id: "button", nameId: "Tombol", role: "mendorong mata pena keluar", kind: "cylinder", params: { r: 3, h: 6 }, y: 73, explode: "UP", bob: true },
  ],
};

const gen = normalizeGeneratedAssembly(PEN, ["piston_engine"]);

t("satuan mm diskalakan ke ~tinggi 6 tanpa merusak proporsi", () => {
  const b = sceneBounds(gen.assembly.parts, false);
  const H = b.max[1] - b.min[1];
  assert.ok(H > 4.5 && H < 7.5, `tinggi ${H}`);
  const barrel = gen.assembly.parts.find((p) => p.id === "barrel")!;
  const ink = gen.assembly.parts.find((p) => p.id === "ink_tube")!;
  const ratio = (barrel.params.h as number) / (ink.params.h as number);
  assert.ok(Math.abs(ratio - 140 / 120) < 0.06, `rasio ${ratio} (harus ~1.17, skala dulu baru clamp)`);
  assert.ok(gen.warnings.some((w) => /diskalakan/.test(w)));
});

t("objek terlalu ramping (pulpen 23:1) dikompres ke <= ~5:1 supaya terbaca", () => {
  const b = sceneBounds(gen.assembly.parts, false);
  const H = b.max[1] - b.min[1];
  const R = Math.max(Math.abs(b.min[0]), Math.abs(b.max[0]), Math.abs(b.min[2]), Math.abs(b.max[2]));
  assert.ok(H / R <= 5.3, `aspek ${H / R}`);
  assert.ok(gen.warnings.some((w) => /terlalu ramping/.test(w)));
});

t("id snake_case unik, diawali gen_, string numerik dikonversi", () => {
  assert.match(gen.assembly.id, /^gen_[a-z0-9_]+$/);
  const ids = gen.assembly.parts.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of gen.assembly.parts) for (const v of Object.values(p.params)) if (typeof v !== "string") assert.ok(Number.isFinite(v));
});

t("geometri semua part hasil generator bisa dibangun (tidak NaN)", () => {
  for (const p of gen.assembly.parts) {
    const pos = buildGeometry(p).getAttribute("position");
    assert.ok(pos.count > 0);
    for (let i = 0; i < pos.array.length; i++) assert.ok(Number.isFinite(pos.array[i]), p.id);
  }
});

t("exploded: part searah tidak saling menumpuk & melewati jangkar", () => {
  const parts = gen.assembly.parts;
  const half = (p: (typeof parts)[0]) => sceneBounds([{ ...p, explodeDistance: 0 }], false);
  const anchorTop = Math.max(...parts.filter((p) => p.explodeDistance === 0 && p.explodeDir[1] === 0).map((p) => half(p).max[1]));
  const ups = parts
    .filter((p) => p.explodeDir[1] === 1)
    .map((p) => sceneBounds([p], true))
    .sort((a, b) => a.min[1] - b.min[1]);
  assert.ok(ups.length >= 3);
  assert.ok(ups[0].min[1] >= anchorTop - 1e-6, "part UP pertama harus di atas jangkar");
  for (let i = 1; i < ups.length; i++) assert.ok(ups[i].min[1] >= ups[i - 1].max[1] - 1e-6, "UP saling menumpuk");
  const clip = parts.find((p) => p.id === "clip")!;
  assert.deepEqual(clip.explodeDir, [1, 0, 0]);
  assert.ok(clip.explodeDistance > 0);
});

t("spin pada cylinder sumbu-Y diabaikan (akan miring), bob diterapkan", () => {
  assert.equal(gen.assembly.parts.find((p) => p.id === "ink_tube")!.spinZ, undefined);
  assert.ok(gen.warnings.some((w) => /spin diabaikan/.test(w)));
  assert.ok(gen.assembly.parts.find((p) => p.id === "button")!.bob);
});

t("tabrakan id dengan katalog diberi akhiran", () => {
  const again = normalizeGeneratedAssembly(PEN, [gen.assembly.id]);
  assert.equal(again.assembly.id, `${gen.assembly.id}_2`);
});

t("input rusak ditolak dengan pesan yang bisa dipakai LLM untuk memperbaiki", () => {
  const base = (parts: unknown[]) => ({ id: "x", parts });
  const okPart = (i: number) => ({ id: `p${i}`, kind: "cylinder", params: { r: 1, h: 1 }, y: i });
  assert.throws(() => normalizeGeneratedAssembly(base([okPart(0), okPart(1), okPart(2)])), /4-12/);
  assert.throws(() => normalizeGeneratedAssembly(base([{ ...okPart(0), kind: "pyramid" }, okPart(1), okPart(2), okPart(3)])), /pyramid.*didukung/);
  assert.throws(() => normalizeGeneratedAssembly(base([{ id: "t", kind: "tube", params: { rOuter: 1, h: 2 }, y: 0 }, okPart(1), okPart(2), okPart(3)])), /rInner.*wajib/);
  assert.throws(() => normalizeGeneratedAssembly(base([okPart(0), { ...okPart(0) }, okPart(2), okPart(3)])), /dobel/);
  assert.throws(() => normalizeGeneratedAssembly({ id: "x" }));
});

t("tube dengan rInner >= rOuter dan gear tanpa lubang dikoreksi, bukan gagal", () => {
  const r = normalizeGeneratedAssembly({
    id: "koreksi",
    parts: [
      { id: "a", kind: "tube", params: { rOuter: 1, rInner: 1.5, h: 3 }, y: 0 },
      { id: "b", kind: "gear", params: { rOuter: 1, rRoot: 1.2 }, y: 2, spin: true },
      { id: "c", kind: "box", params: { w: 1, h: 1, d: 1 }, y: -2 },
      { id: "d", kind: "cone", params: { rTop: 0.2, rBottom: 1, h: 1 }, y: 3 },
    ],
  });
  const a = r.assembly.parts[0];
  assert.ok((a.params.rInner as number) < (a.params.rOuter as number));
  const g = r.assembly.parts[1];
  assert.ok((g.params.rRoot as number) < (g.params.rOuter as number));
  assert.ok((g.params.hole as number) < (g.params.rRoot as number));
  assert.ok(g.spinZ);
});

console.log("Katalog dinamis & penyimpanan");

t("skema dengan katalog dinamis menerima assembly baru; force menolak NONE", () => {
  const cat = { ...ASSEMBLIES, [gen.assembly.id]: gen.assembly };
  const beats = Array.from({ length: 6 }, (_, i) =>
    beat(i === 1 ? { focusPartId: "SPRING", callouts: [{ partId: "tip", text: "ujung" }, { partId: "ngawur", text: "x" }] } : {})
  );
  const sb = makeTechStoryboardSchema(cat, { forceAssemblyId: gen.assembly.id }).parse({ assemblyId: gen.assembly.id, beats });
  assert.equal(sb.assemblyId, gen.assembly.id);
  assert.equal(sb.beats[1].focusPartId, "spring");
  assert.deepEqual(sb.beats[1].callouts, [{ partId: "tip", text: "UJUNG" }]);
  assert.equal(makeTechStoryboardSchema(cat, { forceAssemblyId: gen.assembly.id }).safeParse({ assemblyId: "none", beats: [] }).success, false);
  assert.equal(makeTechStoryboardSchema(cat, { forceAssemblyId: gen.assembly.id }).safeParse({ assemblyId: "piston_engine", beats }).success, false);
  assert.equal(TechStoryboardSchema.safeParse({ assemblyId: gen.assembly.id, beats }).success, false, "skema bawaan tidak mengenal assembly baru");
});

t("compiler memakai props.assembly (assembly yang tidak ada di katalog bawaan)", () => {
  const props = { ...SAMPLE_PISTON_PROPS, assemblyId: gen.assembly.id, assembly: gen.assembly, beats: SAMPLE_PISTON_PROPS.beats.map((b) => ({ ...b, focusPartId: undefined, callouts: [{ partId: "tip", text: "UJUNG" }] })) };
  const spec = compileBeatsToSpec(props);
  assert.equal(spec.parts.length, gen.assembly.parts.length);
  assert.throws(() => compileBeatsToSpec({ ...props, assembly: undefined }), /tidak ada di katalog/);
});

t("simpan -> muat ulang; file rusak dilewati; katalog bawaan menang atas file tersimpan", () => {
  const cwd = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "asm-"));
  try {
    process.chdir(tmp);
    saveAssembly(gen.assembly);
    const dir = path.join(tmp, "public", "assets", "_assemblies");
    fs.writeFileSync(path.join(dir, "rusak.json"), "{ bukan json");
    fs.writeFileSync(path.join(dir, "aneh.json"), JSON.stringify({ id: "aneh", title: "x", fits: "", parts: [] }));
    const fake = { ...gen.assembly, id: "piston_engine", parts: gen.assembly.parts.slice(0, 1) };
    saveAssembly(fake);
    const loaded = loadSavedAssemblies();
    assert.ok(loaded[gen.assembly.id]);
    assert.equal(loaded["aneh"], undefined);
    assert.deepEqual(loaded[gen.assembly.id].parts.map((p) => p.id), gen.assembly.parts.map((p) => p.id));
    const cat = getCatalog();
    assert.ok(cat[gen.assembly.id], "assembly tersimpan masuk katalog");
    assert.equal(cat["piston_engine"].parts.length, ASSEMBLIES["piston_engine"].parts.length);
  } finally {
    process.chdir(cwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

t("prompt director mode force hanya memuat satu assembly & melarang NONE", () => {
  const cat = { ...ASSEMBLIES, [gen.assembly.id]: gen.assembly };
  const prompt = buildTechDirectorPrompt(cat, { forceAssemblyId: gen.assembly.id });
  assert.ok(prompt.includes(`WAJIB memakai assemblyId "${gen.assembly.id}"`));
  assert.ok(prompt.includes("- spring ="));
  assert.ok(!prompt.includes('assemblyId: "piston_engine"'));
});

console.log(`\n${passed} cek lolos${process.exitCode ? ", ADA YANG GAGAL" : ""}`);
