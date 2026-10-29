import { env } from "../env";
import { chatJSON } from "../omniroute";
import { completeStage, startStage } from "../pipeline";
import { asJson } from "../pipeline";
import { prisma } from "../prisma";
import { researchSchema } from "../schemas";
import { searchWeb, type SearchResult } from "../searxng";
import { classifyTopicStyle } from "../topic-style";
import type { ResearchData } from "../types";
import { RESEARCH_SYSTEM_PROMPT } from "../viral";

function trimSnippet(content: string, max = 520) {
  const flat = content.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max)}...`;
}

function buildSearchContext(results: SearchResult[]) {
  return results
    .map(
      (result, index) =>
        `[${index + 1}] ${result.title}\nURL: ${result.url}\nSnippet: ${trimSnippet(result.content)}`,
    )
    .join("\n\n");
}

function fallbackResearch(topic: string, results: SearchResult[]): ResearchData {
  const facts = results
    .map((result) => result.content.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 6);

  return {
    facts:
      facts.length > 0
        ? facts
        : [`Topik "${topic}" belum punya snippet yang cukup, gunakan angle umum.`],
    sources: results.slice(0, 5).map((result) => ({
      title: result.title,
      url: result.url,
    })),
    uniqueAngles: [
      `Bongkar mitos paling umum soal ${topic}`,
      `Angka dan fakta yang jarang dibahas soal ${topic}`,
    ],
    viralPotential: `Topik ${topic} punya rasa penasaran tinggi dan mudah dibungkus jadi hook kontroversial.`,
    controversy: "",
    numbers: [],
  };
}

export async function runResearch(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`Project ${projectId} tidak ditemukan.`);

  await startStage(projectId, "research");

  const results = await searchWeb(project.topic).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Research agent tidak bisa mengakses SearXNG (${env.searxngUrl}): ${message}`,
    );
  });

  if (results.length === 0) {
    throw new Error(
      `SearXNG tidak mengembalikan hasil untuk topik "${project.topic}". Coba topik lain.`,
    );
  }

  let research: ResearchData;
  try {
    research = await chatJSON({
      system: RESEARCH_SYSTEM_PROMPT,
      user: `TOPIK: ${project.topic}

HASIL PENCARIAN TERATAS:
${buildSearchContext(results)}

Ekstrak fakta, angka, kontroversi, dan angle unik. Sertakan URL sumber asli dari daftar di atas.`,
      schema: researchSchema,
      tier: "fast",
      modelOverride: project.model,
      temperature: 0.4,
      maxTokens: 2200,
    });
  } catch (error) {
    console.warn(
      "[research] LLM gagal, memakai fallback dari snippet SearXNG:",
      error instanceof Error ? error.message : error,
    );
    research = fallbackResearch(project.topic, results);
  }

  if (research.sources.length === 0) {
    research.sources = results.slice(0, 5).map((result) => ({
      title: result.title,
      url: result.url,
    }));
  }

  research.facts = research.facts.slice(0, 8).filter(Boolean);
  research.uniqueAngles = research.uniqueAngles.slice(0, 4).filter(Boolean);
  research.sources = research.sources
    .filter((source) => source.title && source.url)
    .slice(0, 5);

  if (research.facts.length === 0) {
    research.facts = fallbackResearch(project.topic, results).facts;
  }

  // Gaya video (engineering / factcheck / lifestyle) diputuskan sekali di sini,
  // lalu dibaca visual planner. Disimpan di researchData (JSON) tanpa migrasi DB.
  const { style, searchTopic, source: styleSource } = await classifyTopicStyle({
    topic: project.topic,
    facts: research.facts,
    modelOverride: project.model,
  });
  research.style = style;
  if (searchTopic) research.searchTopic = searchTopic;

  await prisma.project.update({
    where: { id: projectId },
    data: { researchData: asJson(research) },
  });

  await completeStage(projectId, "research", {
    facts: research.facts.length,
    sources: research.sources.length,
    style,
    searchTopic,
    styleSource,
  });

  return research;
}
