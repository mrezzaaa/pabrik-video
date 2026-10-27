import { alignWords } from "../alignment";
import { chatJSON } from "../omniroute";
import { asJson, completeStage, startStage } from "../pipeline";
import { prisma } from "../prisma";
import { scriptSchema } from "../schemas";
import { normalizeSpeech, stripEmoji, wordCount } from "../text";
import type { FullScript, ResearchData, ScriptSentence } from "../types";
import { HOOK_FORMULAS, VIRAL_SCRIPT_SYSTEM_PROMPT } from "../viral";

/** Hard ban: the script must end with a reflection, never a CTA. */
const CTA_PATTERN =
  /\b(komen|komentar|comment|ketik|tulis|share|like|follow|subscribe|part\s*2|cek bio|link di bio)\b/i;

const REFLECTIVE_ENDING =
  "Sekarang coba ingat lagi, kapan terakhir kali kamu merasakan hal ini sendiri?";

function cleanText(value: string) {
  return normalizeSpeech(stripEmoji(value));
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
    .map((word) => stripEmoji(word).replace(/[^\p{L}\p{N}%]/gu, ""))
    .filter((word) => word.length > 1)
    .filter((word) =>
      tokens.some((token) => token.toLowerCase().includes(word.toLowerCase())),
    )
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

Tulis naskah final 30-45 detik. Prioritaskan hook paling bikin berhenti scrolling.
Tutup dengan refleksi natural dari topik. DILARANG memakai kata komen/comment/ketik/share/like/follow/part 2.`,
    schema: scriptSchema,
    tier: "primary",
    modelOverride: project.model,
    temperature: 0.9,
    maxTokens: 3000,
  });

  const cleaned = script.sentences
    .map((sentence) => normalizeSentence(sentence, 0))
    .filter((sentence) => sentence.text.length > 0);

  // Remove CTA sentences entirely. If the model still ended with one, replace
  // it with a topic-agnostic reflective open loop.
  let sentences = cleaned.filter((sentence) => !CTA_PATTERN.test(sentence.text));
  const removedCta = cleaned.length !== sentences.length;
  if (removedCta || sentences.length === 0) {
    sentences = [
      ...sentences,
      {
        id: `s${sentences.length + 1}`,
        text: REFLECTIVE_ENDING,
        emphasisWords: ["ingat"],
        emotion: "curious",
      },
    ];
  }

  sentences = sentences.map((sentence, index) => ({
    ...sentence,
    id: `s${index + 1}`,
  }));

  const narration = sentences.map((sentence) => sentence.text).join(" ");
  const words = wordCount(narration);

  const hook = limitWords(
    cleanText(
      script.hook
        .replace(/^(hook|judul)\s*:\s*/i, "")
        .replace(/^["']|["']$/g, ""),
    ),
    12,
  );
  const durationEstimate =
    script.durationEstimate > 5
      ? Math.min(60, script.durationEstimate)
      : Math.min(60, Math.max(25, words / 2.7));

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
    words,
    sentences: sentences.length,
    durationEstimate: fullScript.durationEstimate,
    removedCta,
  });

  return fullScript;
}
