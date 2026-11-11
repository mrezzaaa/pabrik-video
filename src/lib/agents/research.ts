import { env } from "../env";
import { fetchPageText } from "../engine/fetch-page";
import {
  buildResearchQueries,
  extractFactBank,
  rankAndDedupe,
  snippetFallbackFacts,
  type FactBankResult,
  type SourcePack,
} from "../engine/factbank";
import { asJson, completeStage, startStage } from "../pipeline";
import { prisma } from "../prisma";
import { searchWeb, searchWebResilient, type SearchResult } from "../searxng";
import { routeSkills } from "../skills/router";
import { classifyTopicStyle } from "../topic-style";
import type { FactItem, ResearchData } from "../types";

const MAX_PAGES = 6;
const FETCH_CONCURRENCY = 3;
const MIN_FACTS = 3;

function flat(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

async function mapPool<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function buildSourcePacks(results: SearchResult[]): Promise<SourcePack[]> {
  const packs = await mapPool(results, FETCH_CONCURRENCY, async (result) => {
    const page = await fetchPageText(result.url);
    const snippet = flat(result.content);
    const full = page.length >= 500;
    return {
      title: result.title,
      url: result.url,
      text: full ? page : snippet,
      full,
    } satisfies SourcePack;
  });
  return packs.filter((pack) => pack.text.length >= 60);
}

function mergeFacts(primary: FactItem[], extra: FactItem[]): FactItem[] {
  const seen = new Set(primary.map((fact) => fact.claim.toLowerCase().slice(0, 60)));
  const merged = [...primary];
  for (const fact of extra) {
    const key = fact.claim.toLowerCase().slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(fact);
  }
  return merged.map((fact, index) => ({ ...fact, id: `f${index + 1}` }));
}

export async function runResearch(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`Project ${projectId} tidak ditemukan.`);

  await startStage(projectId, "research");

  const first = await searchWebResilient(project.topic).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Research agent tidak bisa mengakses SearXNG (${env.searxngUrl}): ${message}`,
    );
  });
  if (first.results.length === 0) {
    const engines = first.unresponsive.length
      ? first.unresponsive.join(", ")
      : "semua engine";
    throw new Error(
      `SearXNG tidak mengembalikan hasil untuk topik "${project.topic}" ` +
        `(engine bermasalah: ${engines}). Ini masalah koneksi/rate-limit ` +
        `SearXNG, bukan topiknya — cek container searxng lalu ulangi.`,
    );
  }
  if (first.viaWikipedia) {
    console.warn(
      `[research] SearXNG kosong; memakai Wikipedia untuk "${first.query}".`,
    );
  }

  // 1) Gaya video + skill yang relevan, diputuskan sekali dari topik dan snippet awal.
  const snippetFacts = first.results
    .slice(0, 4)
    .map((result: SearchResult) => flat(result.content))
    .filter(Boolean);
  const classification = await classifyTopicStyle({
    topic: project.topic,
    facts: snippetFacts,
    modelOverride: project.model,
  });
  const route = await routeSkills({
    topic: project.topic,
    facts: snippetFacts,
    style: classification.style,
    modelOverride: project.model,
  });

  // 2) Cari lebih luas memakai istilah baku, lalu ambil isi halaman sumber terbaik.
  const extraQueries = buildResearchQueries(
    project.topic,
    classification.style,
    classification.searchTopic,
  ).slice(1);
  const extra = (
    await Promise.all(extraQueries.map((query) => searchWeb(query).catch(() => [])))
  ).flat();
  const ranked = rankAndDedupe([...first.results, ...extra], MAX_PAGES);
  const packs = await buildSourcePacks(
    ranked.length ? ranked : first.results.slice(0, MAX_PAGES),
  );
  if (packs.length === 0) {
    throw new Error("Tidak ada halaman sumber yang bisa dibaca untuk topik ini.");
  }

  // 3) Ekstrak fakta berkutipan, lalu verifikasi terhadap teks sumber.
  let bank: FactBankResult | null = null;
  try {
    bank = await extractFactBank({
      topic: project.topic,
      style: classification.style,
      sources: packs,
      modelOverride: project.model,
    });
  } catch (error) {
    console.warn(
      "[research] ekstraksi fact bank gagal:",
      error instanceof Error ? error.message : error,
    );
  }

  let facts = bank?.facts ?? [];
  if (facts.length < MIN_FACTS) {
    facts = mergeFacts(facts, snippetFallbackFacts(packs));
  }
  if (facts.length < MIN_FACTS) {
    throw new Error(
      `Hanya ${facts.length} fakta yang bisa diverifikasi dari sumber. Coba topik yang lebih spesifik.`,
    );
  }

  const research: ResearchData = {
    style: classification.style,
    styleSource: classification.source,
    ...(classification.searchTopic ? { searchTopic: classification.searchTopic } : {}),
    ...(classification.visualTerms.length ? { visualTerms: classification.visualTerms } : {}),
    ...(classification.avoidTerms.length ? { avoidTerms: classification.avoidTerms } : {}),
    skills: route,
    factBank: facts,
    // Tetap diisi supaya UI lama (research-panel) dan project lama tidak rusak.
    facts: facts.map((fact) => fact.claim),
    sources: packs.map((pack) => ({ title: pack.title, url: pack.url })),
    uniqueAngles:
      bank?.uniqueAngles.length
        ? bank.uniqueAngles
        : [`Bongkar bagian paling jarang dibahas dari ${project.topic}`],
    viralPotential:
      bank?.viralPotential ||
      `Topik ${project.topic} punya rasa penasaran yang kuat bila dijelaskan dengan bukti.`,
    controversy: bank?.controversy ?? "",
    numbers: facts.filter((fact) => fact.kind === "number").map((fact) => fact.claim),
    grounding: {
      ...(bank?.report ?? { requested: 0, verified: 0, soft: facts.length, dropped: [] }),
      pagesFetched: packs.filter((pack) => pack.full).length,
      pagesTried: ranked.length,
    },
  };

  await prisma.project.update({
    where: { id: projectId },
    data: { researchData: asJson(research) },
  });

  await completeStage(projectId, "research", {
    style: research.style,
    styleSource: research.styleSource,
    searchTopic: research.searchTopic,
    skillsExtra: route.extra,
    facts: facts.length,
    verified: facts.filter((fact) => fact.confidence === "verified").length,
    soft: facts.filter((fact) => fact.confidence === "soft").length,
    dropped: research.grounding?.dropped.length ?? 0,
    pages: `${research.grounding?.pagesFetched}/${research.grounding?.pagesTried}`,
  });

  return research;
}
