import { alignWords } from "../alignment";
import { chatJSON } from "../omniroute";
import { asJson, completeStage, startStage } from "../pipeline";
import { prisma } from "../prisma";
import { scriptSchema } from "../schemas";
import type { FullScript, ResearchData, ScriptSentence } from "../types";
import { HOOK_FORMULAS, VIRAL_SCRIPT_SYSTEM_PROMPT } from "../viral";

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function limitWords(value: string, max: number) {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= max) return words.join(" ");
  return words.slice(0, max).join(" ");
}

function normalizeSentence(
  raw: { text: string; emphasisWords: string[]; emotion: ScriptSentence["emotion"] },
  index: number,
): ScriptSentence {
  const text = cleanText(raw.text);
  const tokens = text.split(/\s+/);
  const normalizedEmphasis = raw.emphasisWords
    .map((word) => word.replace(/[^\p{L}\p{N}%]/gu, ""))
    .filter((word) => word.length > 1)
    .filter((word) => tokens.some((token) => token.toLowerCase().includes(word.toLowerCase())))
    .slice(0, 3);

  return {
    id: `s${index + 1}`,
    text,
    emphasisWords: [...new Set(normalizedEmphasis)],
    emotion: raw.emotion,
  };
}

export async function runScriptwriter(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`Project ${projectId} tidak ditemukan.`);
  if (!project.researchData) {
    throw new Error("Research data belum tersedia untuk scriptwriter.");
  }

  await startStage(projectId, "scriptwriting");

  const research = project.researchData as unknown as ResearchData;

  const script = await chatJSON({
    system: VIRAL_SCRIPT_SYSTEM_PROMPT,
    user: `TOPIK: ${project.topic}

FORMULA HOOK YANG BISA DIPAKAI (pilih satu, adaptasi):
${HOOK_FORMULAS.map((formula) => `- ${formula}`).join("\n")}

AMUNISI RISET:
Fakta:
${research.facts.map((fact) => `- ${fact}`).join("\n")}

Angle unik:
${research.uniqueAngles.map((angle) => `- ${angle}`).join("\n")}

Kontroversi: ${research.controversy || "-"}
Angka penting: ${(research.numbers ?? []).join(", ") || "-"}
Potensi viral: ${research.viralPotential}

Tulis naskah final 30-45 detik. Prioritaskan hook paling bikin berhenti scrolling.`,
    schema: scriptSchema,
    tier: "primary",
    temperature: 0.9,
    maxTokens: 3000,
  });

  const sentences = script.sentences.map(normalizeSentence);
  const narration = sentences.map((sentence) => sentence.text).join(" ");
  const wordCount = narration.split(/\s+/).filter(Boolean).length;

  const hook = limitWords(
    cleanText(script.hook.replace(/^(hook|judul)\s*:\s*/i, "").replace(/^["']|["']$/g, "")),
    12,
  );
  const durationEstimate =
    script.durationEstimate > 5
      ? Math.min(60, script.durationEstimate)
      : Math.min(60, Math.max(25, wordCount / 2.7));

  const provisional = alignWords(sentences, durationEstimate);
  const fullScript: FullScript = {
    hook,
    script: narration,
    sentences,
    captions: provisional.captions,
    durationEstimate: Math.round(durationEstimate * 10) / 10,
    generatedAt: new Date().toISOString(),
  };

  await prisma.project.update({
    where: { id: projectId },
    data: {
      hook,
      fullScript: asJson(fullScript),
    },
  });

  await completeStage(projectId, "scriptwriting", {
    hook,
    words: wordCount,
    sentences: sentences.length,
    durationEstimate: fullScript.durationEstimate,
  });

  return fullScript;
}
