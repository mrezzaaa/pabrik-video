import { chatJSON } from "../omniroute";
import { factBankSchema } from "../schemas";
import { buildPlaybook } from "../skills/playbook";
import type { FactItem, FactKind, GroundingReport, TopicStyle } from "../types";

/**
 * Fact bank berbasis bukti.
 *  1. LLM mengekstrak klaim + kutipan PERSIS dari teks sumber.
 *  2. Kode memeriksa kutipan benar-benar ada di sumber dan angka di klaim ada di kutipan.
 *  3. Hanya fakta yang lolos yang boleh dipakai scriptwriter.
 * Dengan begitu halusinasi dibuang di hulu, bukan diharapkan hilang lewat prompt.
 */

export interface SourcePack {
  title: string;
  url: string;
  /** Teks yang tersedia untuk diverifikasi (isi halaman, atau snippet bila fetch gagal). */
  text: string;
  /** true = isi halaman penuh; false = hanya snippet SearXNG. */
  full: boolean;
}

const KINDS: FactKind[] = ["fact", "number", "myth", "mechanism", "example"];

export function normForMatch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trigrams(tokens: string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + 2 < tokens.length; i += 1) {
    out.add(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  }
  return out;
}

/** Skor 0..1 seberapa mirip kutipan dengan teks sumber. 1 = ada persis. */
export function evidenceScore(evidence: string, sourceText: string): number {
  const ev = normForMatch(evidence);
  const src = normForMatch(sourceText);
  if (ev.length < 12 || src.length < 12) return 0;
  if (src.includes(ev)) return 1;

  const evTokens = ev.split(" ");
  if (evTokens.length < 4) return 0;
  const evTri = trigrams(evTokens);
  if (evTri.size === 0) return 0;
  const srcTri = trigrams(src.split(" "));
  let hit = 0;
  for (const tri of evTri) if (srcTri.has(tri)) hit += 1;
  return hit / evTri.size;
}

/** "3.000" -> "3000", "3,5" -> "35": cukup untuk membandingkan angka antara klaim dan kutipan. */
function canonicalNumbers(text: string): string[] {
  return (text.match(/\d[\d.,]*/g) ?? [])
    .map((token) => token.replace(/[.,]+$/, "").replace(/[.,]/g, ""))
    .filter(Boolean);
}

export function numbersSupported(claim: string, evidence: string): boolean {
  const claimNumbers = canonicalNumbers(claim);
  if (claimNumbers.length === 0) return true;
  const evidenceNumbers = new Set(canonicalNumbers(evidence));
  return claimNumbers.every((number) => evidenceNumbers.has(number));
}

export interface RawFact {
  claim: string;
  evidence: string;
  /** 0-based */
  sourceIndex: number;
  kind: string;
}

const VERIFIED_AT = 0.85;
const SOFT_AT = 0.6;

export function verifyFacts(
  raw: RawFact[],
  sources: SourcePack[],
): { kept: FactItem[]; dropped: GroundingReport["dropped"] } {
  const kept: FactItem[] = [];
  const dropped: GroundingReport["dropped"] = [];
  const seenClaims = new Set<string>();

  for (const item of raw) {
    const claim = item.claim.replace(/\s+/g, " ").trim();
    const evidence = item.evidence.replace(/\s+/g, " ").trim();
    const key = normForMatch(claim);
    if (!claim || seenClaims.has(key)) {
      dropped.push({ reason: "duplikat", claim });
      continue;
    }

    const source = sources[item.sourceIndex];
    if (!source) {
      dropped.push({ reason: "sumber tidak ada", claim });
      continue;
    }

    // Kutipan boleh berasal dari sumber yang disebut LLM, atau dari sumber lain bila LLM salah nomor.
    let bestIndex = item.sourceIndex;
    let best = evidenceScore(evidence, source.text);
    if (best < VERIFIED_AT) {
      sources.forEach((candidate, index) => {
        if (index === item.sourceIndex) return;
        const score = evidenceScore(evidence, candidate.text);
        if (score > best) {
          best = score;
          bestIndex = index;
        }
      });
    }

    if (best < SOFT_AT) {
      dropped.push({ reason: `kutipan tidak ditemukan di sumber (${best.toFixed(2)})`, claim });
      continue;
    }
    if (!numbersSupported(claim, evidence)) {
      dropped.push({ reason: "angka di klaim tidak ada di kutipan", claim });
      continue;
    }

    seenClaims.add(key);
    const kind = (KINDS as string[]).includes(item.kind) ? (item.kind as FactKind) : "fact";
    // Snippet pendek tidak cukup kuat untuk "verified" penuh.
    const confidence: FactItem["confidence"] =
      best >= VERIFIED_AT && sources[bestIndex].full ? "verified" : "soft";
    kept.push({
      id: `f${kept.length + 1}`,
      claim,
      evidence,
      sourceIndex: bestIndex,
      kind,
      confidence,
    });
  }

  return { kept, dropped };
}

function packContext(sources: SourcePack[], perSource = 2600): string {
  return sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title}\nURL: ${source.url}\nTEKS${source.full ? "" : " (hanya snippet)"}:\n${source.text.slice(0, perSource)}`,
    )
    .join("\n\n---\n\n");
}

export interface FactBankResult {
  facts: FactItem[];
  uniqueAngles: string[];
  controversy: string;
  viralPotential: string;
  report: Omit<GroundingReport, "pagesFetched" | "pagesTried">;
}

export async function extractFactBank(input: {
  topic: string;
  style: TopicStyle;
  sources: SourcePack[];
  modelOverride?: string | null;
}): Promise<FactBankResult> {
  const grounding = await buildPlaybook("grounding", input.style);

  const output = await chatJSON({
    system: `Kamu adalah peneliti fakta untuk video edukasi pendek berbahasa Indonesia.
Tugas: ekstrak fakta dari TEKS SUMBER yang diberikan. Jangan memakai pengetahuan di luar teks.

ATURAN KETAT:
- "evidence" adalah kutipan PERSIS (salin-tempel, bahasa asli sumber, 8-35 kata) dari teks sumber yang mendukung klaim. Dilarang memparafrase kutipan.
- "claim" adalah satu kalimat bahasa Indonesia yang isinya hanya yang didukung kutipan. Angka di claim HARUS ada di kutipan.
- "sourceIndex" adalah nomor [n] sumber asal kutipan.
- "kind": "fact" | "number" (angka/ukuran konkret) | "myth" (mitos yang disebut sumber beserta faktanya) | "mechanism" (cara kerja/sebab-akibat) | "example" (contoh nyata).
- Pilih fakta yang paling menarik untuk penonton awam dan beragam jenisnya. Maksimal 12 fakta. Lebih baik sedikit tapi benar.
- "uniqueAngles": 2-4 sudut pandang tidak biasa yang BISA dibuktikan dari fakta di atas.

${grounding.text}

Kembalikan HANYA JSON valid:
{ "facts": [ { "claim": "...", "evidence": "...", "sourceIndex": 1, "kind": "fact" } ], "uniqueAngles": ["..."], "controversy": "mitos/konflik utama bila ada (boleh kosong)", "viralPotential": "1-2 kalimat" }`,
    user: `TOPIK: ${input.topic}\nGAYA VIDEO: ${input.style}\n\nTEKS SUMBER:\n${packContext(input.sources)}`,
    schema: factBankSchema,
    tier: "primary",
    modelOverride: input.modelOverride,
    temperature: 0.2,
    maxTokens: 3600,
  });

  const raw: RawFact[] = output.facts.map((fact) => ({
    claim: fact.claim,
    evidence: fact.evidence,
    sourceIndex: Math.round(fact.sourceIndex) - 1,
    kind: fact.kind,
  }));
  const { kept, dropped } = verifyFacts(raw, input.sources);

  return {
    facts: kept.slice(0, 10).map((fact, index) => ({ ...fact, id: `f${index + 1}` })),
    uniqueAngles: output.uniqueAngles.filter(Boolean).slice(0, 4),
    controversy: output.controversy,
    viralPotential: output.viralPotential,
    report: {
      requested: raw.length,
      verified: kept.filter((fact) => fact.confidence === "verified").length,
      soft: kept.filter((fact) => fact.confidence === "soft").length,
      dropped: dropped.slice(0, 12),
    },
  };
}

/** Fakta cadangan dari snippet bila ekstraksi LLM gagal. Selalu "soft". */
export function snippetFallbackFacts(sources: SourcePack[]): FactItem[] {
  const facts: FactItem[] = [];
  sources.forEach((source, index) => {
    const sentence = source.text
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .find((part) => part.length >= 40 && part.length <= 260);
    if (!sentence || facts.length >= 6) return;
    facts.push({
      id: `f${facts.length + 1}`,
      claim: sentence,
      evidence: sentence,
      sourceIndex: index,
      kind: "fact",
      confidence: "soft",
    });
  });
  return facts;
}

/** Query pencarian tambahan per gaya topik. */
export function buildResearchQueries(
  topic: string,
  style: TopicStyle,
  searchTopic: string,
): string[] {
  const queries = [topic];
  if (searchTopic) {
    const angle =
      style === "engineering"
        ? "how it works explained"
        : style === "factcheck"
          ? "myth fact evidence study"
          : "facts research";
    queries.push(`${searchTopic} ${angle}`);
  }
  queries.push(
    style === "factcheck" ? `${topic} mitos atau fakta` : `${topic} penjelasan lengkap`,
  );
  return [...new Set(queries.map((query) => query.replace(/\s+/g, " ").trim()))];
}

const TRUSTED =
  /(wikipedia\.org|britannica\.com|\.go\.id|\.gov|\.edu|\.ac\.id|nasa\.gov|who\.int|nature\.com|sciencedirect\.com|nih\.gov|bmkg\.go\.id|howstuffworks\.com|nationalgeographic\.com|scientificamerican\.com|kompas\.com|detik\.com|tempo\.co|bbc\.com|cnnindonesia\.com|alodokter\.com|halodoc\.com|kemkes\.go\.id)/i;
const WEAK =
  /(pinterest\.|quora\.|facebook\.|instagram\.|tiktok\.|twitter\.|x\.com|youtube\.|youtu\.be|reddit\.|scribd\.|slideshare\.|shopee\.|tokopedia\.|lazada\.)/i;

export function scoreSource(url: string): number {
  if (WEAK.test(url)) return -5;
  if (TRUSTED.test(url)) return 3;
  return 0;
}

export function rankAndDedupe<T extends { url: string }>(results: T[], limit: number): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const result of results) {
    const key = result.url.replace(/^https?:\/\/(www\.)?/, "").replace(/[#?].*$/, "").replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(result);
  }
  return unique
    .map((result, index) => ({ result, score: scoreSource(result.url) - index * 0.05 }))
    .filter((entry) => entry.score > -4)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.result);
}
