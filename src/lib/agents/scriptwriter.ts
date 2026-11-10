import { alignWords } from "../alignment";
import { directScript } from "../engine/script-director";
import { wordCount } from "../text";
import { WORDS_PER_SECOND } from "../engine/script-checks";
import { asJson, completeStage, startStage } from "../pipeline";
import { prisma } from "../prisma";
import { resolveTopicStyle } from "../topic-style";
import type { FactItem, FullScript, ResearchData } from "../types";

/** Project lama belum punya factBank: ubah daftar fakta string menjadi fakta "soft". */
function legacyFacts(research: ResearchData): FactItem[] {
  return research.facts.map((claim, index) => ({
    id: `f${index + 1}`,
    claim,
    evidence: claim,
    sourceIndex: 0,
    kind: "fact" as const,
    confidence: "soft" as const,
  }));
}

export async function runScriptwriter(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`Project ${projectId} tidak ditemukan.`);
  if (!project.researchData) {
    throw new Error("Research data belum tersedia untuk scriptwriter.");
  }

  await startStage(projectId, "scriptwriting");

  const research = project.researchData as unknown as ResearchData;
  const facts = research.factBank?.length ? research.factBank : legacyFacts(research);

  const directed = await directScript({
    topic: project.topic,
    style: resolveTopicStyle(research.style),
    facts,
    uniqueAngles: research.uniqueAngles ?? [],
    controversy: research.controversy ?? "",
    extraSkills: research.skills?.extra ?? [],
    modelOverride: project.model,
  });

  const narration = directed.sentences.map((sentence) => sentence.text).join(" ");
  const words = wordCount(narration);
  const durationEstimate = Math.min(60, Math.max(20, words / WORDS_PER_SECOND));

  const provisional = alignWords(directed.sentences, durationEstimate);
  const fullScript: FullScript = {
    hook: directed.hook,
    hookOnScreen: directed.hookOnScreen,
    cta: directed.cta,
    qa: directed.qa,
    skillsUsed: directed.skillsUsed,
    script: narration,
    sentences: directed.sentences,
    captions: provisional.captions,
    durationEstimate: Math.round(durationEstimate * 10) / 10,
    generatedAt: new Date().toISOString(),
  };

  await prisma.project.update({
    where: { id: projectId },
    data: { hook: directed.hook, fullScript: asJson(fullScript) },
  });

  await completeStage(projectId, "scriptwriting", {
    hook: directed.hook,
    hookOnScreen: directed.hookOnScreen,
    cta: directed.cta,
    words,
    sentences: directed.sentences.length,
    durationEstimate: fullScript.durationEstimate,
    qaPassed: directed.qa.passed,
    qaRounds: directed.qa.rounds,
    qaIssues: directed.qa.issues,
    scores: directed.qa.scores,
  });

  return fullScript;
}
