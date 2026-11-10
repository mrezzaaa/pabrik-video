import { chatJSON } from "../omniroute";
import {
  critiqueSchema,
  directedScriptSchema,
  hookCandidatesSchema,
  hookPickSchema,
} from "../schemas";
import { buildPlaybook, type SkillRole } from "../skills/playbook";
import { normalizeSpeech, stripEmoji } from "../text";
import type {
  CtaType,
  FactItem,
  ScriptEmotion,
  ScriptQa,
  ScriptSentence,
  SentenceRole,
  TopicStyle,
} from "../types";
import {
  assignBeats,
  checkCta,
  checkHook,
  checkScript,
  fallbackCta,
  HOOK_MAX_WORDS,
  inferCtaType,
  words,
  type HookCandidate,
  type ScriptIssue,
} from "./script-checks";

export interface DirectorInput {
  topic: string;
  style: TopicStyle;
  facts: FactItem[];
  uniqueAngles: string[];
  controversy: string;
  extraSkills: string[];
  modelOverride?: string | null;
}

export interface DirectedScript {
  hook: string;
  hookOnScreen: string;
  cta: { type: CtaType; text: string };
  sentences: ScriptSentence[];
  qa: ScriptQa;
  skillsUsed: Record<string, string[]>;
}

const MAX_REVISIONS = 2;
const MIN_SCORE = 7;

function clean(value: string) {
  return normalizeSpeech(stripEmoji(value));
}

function ensureEnd(text: string) {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function factTable(facts: FactItem[]) {
  return facts
    .map(
      (fact) =>
        `${fact.id} [${fact.kind}${fact.confidence === "soft" ? ", soft: pakai bahasa hati-hati" : ""}] ${fact.claim}`,
    )
    .join("\n");
}

function briefBlock(input: DirectorInput) {
  return `TOPIK: ${input.topic}
GAYA VIDEO: ${input.style}

FACT BANK (satu-satunya sumber klaim dan angka):
${factTable(input.facts)}

SUDUT UNIK: ${input.uniqueAngles.join(" | ") || "-"}
MITOS/KONFLIK: ${input.controversy || "-"}`;
}

async function playbooks(input: DirectorInput, roles: SkillRole[]) {
  const built = await Promise.all(
    roles.map((role) => buildPlaybook(role, input.style, input.extraSkills)),
  );
  return {
    text: built.map((b) => b.text).filter(Boolean).join("\n\n"),
    used: Object.fromEntries(built.map((b) => [b.role, b.used])) as Record<string, string[]>,
  };
}

function normalizeHook(raw: {
  spoken: string;
  onScreen: string;
  type: string;
  factId: string;
  visual: string;
}): HookCandidate {
  return {
    spoken: ensureEnd(clean(raw.spoken).replace(/^["']|["']$/g, "")),
    onScreen: clean(raw.onScreen).replace(/[.!]+$/, "").toUpperCase(),
    type: raw.type,
    factId: raw.factId,
    visual: raw.visual,
  };
}

async function generateHooks(
  input: DirectorInput,
  playbook: string,
): Promise<{ valid: HookCandidate[]; all: HookCandidate[] }> {
  const all: HookCandidate[] = [];
  let rejected = "";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const output = await chatJSON({
      system: `Kamu adalah hook writer senior untuk Reels/Shorts berbahasa Indonesia.
Buat 6 kandidat hook dengan BENTUK PEMBUKA YANG BERBEDA-BEDA (celah penasaran, klaim berani yang bisa dibuktikan, kontras, situasi POV, pertanyaan yang diketik orang, angka/skala konkret).
Tiap hook = ucapan (maksimal ${HOOK_MAX_WORDS} kata) + teks layar (2-6 kata HURUF BESAR, tidak menyalin ucapan) + gambaran visual detik 0-1.
Angka/klaim hanya dari FACT BANK; isi factId bila hook memakainya.

${playbook}

Kembalikan HANYA JSON: { "hooks": [ { "spoken": "...", "onScreen": "...", "type": "curiosity|claim|contrast|pov|question|number", "factId": "f1 atau kosong", "visual": "..." } ] }`,
      user: `${briefBlock(input)}${rejected ? `\n\nPERCOBAAN SEBELUMNYA DITOLAK, perbaiki:\n${rejected}` : ""}`,
      schema: hookCandidatesSchema,
      tier: "primary",
      modelOverride: input.modelOverride,
      temperature: 0.9,
      maxTokens: 1600,
    });

    const candidates = output.hooks.map(normalizeHook);
    all.push(...candidates);
    const valid = all.filter((hook) => checkHook(hook, input.facts).length === 0);
    if (valid.length >= 2 || (attempt === 1 && valid.length >= 1)) return { valid, all };

    rejected = candidates
      .map((hook) => `- "${hook.spoken}": ${checkHook(hook, input.facts).join("; ") || "ok"}`)
      .join("\n");
  }
  return { valid: [], all };
}

async function pickHook(input: DirectorInput, valid: HookCandidate[]) {
  if (valid.length === 1) return { hook: valid[0], reason: "satu-satunya yang lolos validasi" };
  try {
    const result = await chatJSON({
      system: `Kamu juri hook Reels. Pilih SATU hook yang paling kuat menghentikan scroll di 3 detik pertama.
Kriteria berurutan: (1) konkret dan visual, (2) celah penasaran yang bisa dijawab oleh fakta, (3) tidak klise, (4) enak diucapkan.
Kembalikan HANYA JSON: { "pick": nomor 1-${valid.length}, "reason": "satu kalimat" }`,
      user: `${briefBlock(input)}\n\nKANDIDAT:\n${valid
        .map((hook, i) => `${i + 1}. "${hook.spoken}" | layar: ${hook.onScreen} | visual: ${hook.visual ?? "-"}`)
        .join("\n")}`,
      schema: hookPickSchema,
      tier: "fast",
      modelOverride: input.modelOverride,
      temperature: 0.2,
      maxTokens: 300,
      retries: 1,
    });
    const index = Math.min(valid.length, Math.max(1, Math.round(result.pick))) - 1;
    return { hook: valid[index], reason: result.reason };
  } catch {
    return { hook: valid[0], reason: "juri gagal, memakai kandidat pertama yang lolos" };
  }
}

function truncateHook(hook: HookCandidate): HookCandidate {
  const trimmed = words(hook.spoken).slice(0, HOOK_MAX_WORDS).join(" ").replace(/[,;:]$/, "");
  return {
    ...hook,
    spoken: ensureEnd(trimmed),
    onScreen: hook.onScreen || "SIMAK INI",
  };
}

const ROLE_MAP: Record<string, SentenceRole> = {
  hook: "hook",
  promise: "promise",
  janji: "promise",
  body: "body",
  isi: "body",
  payoff: "payoff",
  cta: "cta",
};

function toSentences(
  raw: { text: string; role: string; factIds: string[]; emphasisWords: string[]; emotion: ScriptEmotion }[],
  validIds: Set<string>,
): ScriptSentence[] {
  const items = raw
    .map((item) => ({ ...item, text: ensureEnd(clean(item.text)) }))
    .filter((item) => item.text.length > 1);

  return items.map((item, index) => {
    const last = index === items.length - 1;
    let role = ROLE_MAP[item.role.toLowerCase()] ?? "body";
    if (index === 0) role = "hook";
    else if (index === 1 && role !== "cta") role = "promise";
    else if (last) role = "cta";
    else if (role === "hook" || role === "cta") role = "body";

    const tokens = item.text.split(/\s+/);
    const emphasis = item.emphasisWords
      .map((word) => stripEmoji(word).replace(/[^\p{L}\p{N}%]/gu, ""))
      .filter((word) => word.length > 1)
      .filter((word) => tokens.some((token) => token.toLowerCase().includes(word.toLowerCase())))
      .slice(0, 3);

    return {
      id: `s${index + 1}`,
      text: item.text,
      emphasisWords: [...new Set(emphasis)],
      emotion: item.emotion,
      role,
      factIds: item.factIds.filter((id) => validIds.has(id)),
    };
  });
}

function scriptListing(sentences: ScriptSentence[]) {
  return sentences
    .map((s, i) => `${i + 1}. [${s.role}] [${(s.factIds ?? []).join(",") || "-"}] ${s.text}`)
    .join("\n");
}

async function writeScript(
  input: DirectorInput,
  playbook: string,
  hook: HookCandidate,
  previous?: { sentences: ScriptSentence[]; issues: string[] },
) {
  const system = `Kamu adalah scriptwriter Reels berbahasa Indonesia. Tulis narasi 90-125 kata (sekitar 33-46 detik) yang mengalir, hangat, dan enak dibaca TTS.

STRUKTUR WAJIB, satu objek per kalimat berurutan:
1. role "hook": PERSIS "${hook.spoken}"
2. role "promise": janji spesifik apa yang akan dibongkar
3. role "body": 3-5 beat, tiap beat 1-3 kalimat, saling tersambung sebab-akibat
4. role "payoff": 1-2 kalimat jawaban dari janji hook
5. role "cta": SATU kalimat CTA natural, kalimat terakhir, ctaType salah satu: save | share | follow | comment

Isi factIds (ID dari FACT BANK) pada setiap kalimat yang memuat klaim atau angka. Kalimat lain: factIds [].
"hookOnScreen": "${hook.onScreen}" (salin).

${playbook}

Kembalikan HANYA JSON:
{ "hookOnScreen": "...", "ctaType": "save", "sentences": [ { "text": "...", "role": "hook", "factIds": [], "emphasisWords": ["..."], "emotion": "shocking|curious|excited" } ] }`;

  const user = previous
    ? `${briefBlock(input)}\n\nNASKAH SAAT INI:\n${scriptListing(previous.sentences)}\n\nMASALAH YANG HARUS DIPERBAIKI (ubah hanya yang perlu, pertahankan yang sudah bagus, hook tetap sama):\n${previous.issues.map((i) => `- ${i}`).join("\n")}\n\nKeluarkan naskah lengkap hasil revisi.`
    : briefBlock(input);

  const output = await chatJSON({
    system,
    user,
    schema: directedScriptSchema,
    tier: "primary",
    modelOverride: input.modelOverride,
    temperature: previous ? 0.5 : 0.7,
    maxTokens: 3200,
  });

  const sentences = toSentences(output.sentences, new Set(input.facts.map((f) => f.id)));
  if (sentences[0]) sentences[0] = { ...sentences[0], text: hook.spoken };
  return sentences;
}

async function critique(input: DirectorInput, playbook: string, sentences: ScriptSentence[]) {
  try {
    const result = await chatJSON({
      system: `Kamu editor naskah Reels yang kritis dan jujur. Nilai naskah, jangan memuji berlebihan.
Beri skor 1-10 untuk: hook (berhenti scroll?), flow (mengalir antar kalimat, tidak seperti daftar fakta?), grounding (semua klaim didukung FACT BANK?), cta (natural, satu aksi?), naturalness (bahasa lisan, bebas klise AI?).
Tulis issues hanya untuk masalah nyata: sentence (nomor 1-based, 0 bila umum), problem, fix (saran konkret), severity "major" atau "minor".

${playbook}

Kembalikan HANYA JSON: { "scores": { "hook": 8, "flow": 7, "grounding": 9, "cta": 8, "naturalness": 7 }, "issues": [ { "sentence": 3, "problem": "...", "fix": "...", "severity": "major" } ] }`,
      user: `${briefBlock(input)}\n\nNASKAH:\n${scriptListing(sentences)}`,
      schema: critiqueSchema,
      tier: "primary",
      modelOverride: input.modelOverride,
      temperature: 0.2,
      maxTokens: 1200,
      retries: 1,
    });
    return result;
  } catch (error) {
    console.warn("[script] kritik LLM gagal, hanya validator kode:", error instanceof Error ? error.message : error);
    return null;
  }
}

function formatIssue(issue: ScriptIssue) {
  return issue.sentence > 0 ? `Kalimat ${issue.sentence}: ${issue.problem}` : `Umum: ${issue.problem}`;
}

/** Perbaikan deterministik bila LLM tetap gagal setelah semua putaran revisi. */
export function repairScript(
  sentences: ScriptSentence[],
  facts: FactItem[],
  style: TopicStyle,
  hook: HookCandidate,
): ScriptSentence[] {
  let out = sentences.map((s) => ({ ...s }));
  if (out.length === 0) return out;
  out[0] = { ...out[0], role: "hook", text: hook.spoken };

  // CTA tidak valid -> pakai CTA cadangan sesuai gaya.
  const last = out.length - 1;
  if (out[last].role !== "cta" || checkCta(out[last].text).length > 0) {
    const fallback = fallbackCta(style);
    const replacement: ScriptSentence = {
      id: out[last].id,
      text: fallback.text,
      emphasisWords: [],
      emotion: "excited",
      role: "cta",
      factIds: [],
    };
    out = out[last].role === "cta" ? [...out.slice(0, last), replacement] : [...out, replacement];
  }

  // Buang kalimat isi yang angkanya tidak terdukung (bukan hook/CTA).
  const bad = new Set(
    checkScript(out, facts)
      .filter((i) => /angka tidak ada|memuat angka tetapi/.test(i.problem))
      .map((i) => i.sentence - 1),
  );
  out = out.filter((s, index) => !bad.has(index) || s.role === "hook" || s.role === "cta");
  return out.map((s, index) => ({ ...s, id: `s${index + 1}` }));
}

export async function directScript(input: DirectorInput): Promise<DirectedScript> {
  const hookBook = await playbooks(input, ["hook", "grounding"]);
  const writeBook = await playbooks(input, ["narration", "cta", "grounding"]);
  const criticBook = await playbooks(input, ["critic"]);

  const { valid, all } = await generateHooks(input, hookBook.text);
  let chosen: HookCandidate;
  let pickReason: string;
  if (valid.length > 0) {
    const picked = await pickHook(input, valid);
    chosen = picked.hook;
    pickReason = picked.reason;
  } else {
    chosen = truncateHook(all[0] ?? { spoken: `${input.topic}.`, onScreen: "SIMAK INI", type: "" });
    pickReason = "tidak ada kandidat lolos validasi, hook dipotong paksa";
  }

  let sentences = await writeScript(input, writeBook.text, chosen);
  let rounds = 0;
  let scores: Record<string, number> | undefined;
  let remaining: string[] = [];

  for (;;) {
    const codeIssues = checkScript(sentences, input.facts).map(formatIssue);
    const review = await critique(input, criticBook.text, sentences);
    scores = review?.scores;
    const lowScores = Object.entries(scores ?? {}).filter(([, v]) => v < MIN_SCORE);
    const llmIssues = (review?.issues ?? [])
      .filter((i) => i.problem && (i.severity === "major" || lowScores.length > 0))
      .map((i) => `${i.sentence > 0 ? `Kalimat ${i.sentence}` : "Umum"}: ${i.problem}${i.fix ? ` (saran: ${i.fix})` : ""}`);

    remaining = codeIssues;
    const problems = [...codeIssues, ...llmIssues];
    if (problems.length === 0 || rounds >= MAX_REVISIONS) break;

    rounds += 1;
    sentences = await writeScript(input, writeBook.text, chosen, { sentences, issues: problems });
  }

  if (remaining.length > 0) {
    sentences = repairScript(sentences, input.facts, input.style, chosen);
    remaining = checkScript(sentences, input.facts).map(formatIssue);
  }

  const final = assignBeats(sentences.map((s, index) => ({ ...s, id: `s${index + 1}` })));
  const ctaSentence = final[final.length - 1];
  return {
    hook: final[0]?.text ?? chosen.spoken,
    hookOnScreen: chosen.onScreen,
    cta: { type: inferCtaType(ctaSentence?.text ?? ""), text: ctaSentence?.text ?? "" },
    sentences: final,
    qa: {
      rounds,
      passed: remaining.length === 0,
      issues: remaining,
      scores,
      hookCandidates: all.slice(0, 8).map((h) => ({ spoken: h.spoken, onScreen: h.onScreen, type: h.type })),
      hookPickReason: pickReason,
    },
    skillsUsed: { ...hookBook.used, ...writeBook.used, ...criticBook.used },
  };
}
