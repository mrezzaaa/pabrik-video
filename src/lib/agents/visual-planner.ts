import { chatJSON } from "../omniroute";
import { searchPexelsVideos } from "../pexels";
import { asJson, completeStage, startStage } from "../pipeline";
import { prisma } from "../prisma";
import { visualPlanSchema, type VisualPlanOutput } from "../schemas";
import { cleanVisual } from "../visual-spec";
import type {
  FullScript,
  MotionType,
  ScriptSentence,
  TextAnimationType,
  VisualPlan,
  VisualScene,
  WordTimestamp,
} from "../types";
import {
  EMOJI_POOL,
  GRADIENT_PALETTES,
  VISUAL_SYSTEM_PROMPT,
} from "../viral";

const MOTIONS: MotionType[] = [
  "zoomIn",
  "zoomOut",
  "shake",
  "pan",
  "panLeft",
];
const ANIMATIONS: TextAnimationType[] = ["karaoke", "popIn", "typewriter"];
const ACCENTS = ["#39FF14", "#F5FF00", "#FF2E93", "#00D4FF", "#FF6A00"];

const STOPWORDS = new Set([
  "yang",
  "dan",
  "di",
  "ke",
  "dari",
  "ini",
  "itu",
  "untuk",
  "dengan",
  "adalah",
  "akan",
  "bisa",
  "gak",
  "nggak",
  "tidak",
  "kamu",
  "lu",
  "gue",
  "kita",
  "aku",
  "saya",
  "ada",
  "juga",
  "pada",
  "dalam",
  "atau",
  "karena",
  "jadi",
  "lebih",
  "paling",
  "sudah",
  "belum",
  "masih",
  "cuma",
  "banget",
]);

type Timing = { start: number; end: number };

function sentenceTimings(
  sentences: ScriptSentence[],
  words: WordTimestamp[],
  duration: number,
): Timing[] {
  const bySentence = new Map<string, WordTimestamp[]>();
  for (const word of words) {
    const list = bySentence.get(word.sentenceId) ?? [];
    list.push(word);
    bySentence.set(word.sentenceId, list);
  }

  const fallbackWeight = sentences.map((sentence) => sentence.text.length || 1);
  const totalWeight = fallbackWeight.reduce((sum, weight) => sum + weight, 0);
  let fallbackCursor = 0;

  return sentences.map((sentence, index) => {
    const list = bySentence.get(sentence.id) ?? [];
    if (list.length > 0) {
      return {
        start: list[0].start,
        end: Math.max(list[0].start + 0.2, list[list.length - 1].end),
      };
    }
    const slice = (fallbackWeight[index] / totalWeight) * duration;
    const timing = {
      start: fallbackCursor,
      end: fallbackCursor + slice,
    };
    fallbackCursor += slice;
    return timing;
  });
}

function cleanHeadline(value: string, fallback: string, sourceText = "") {
  const source = value.replace(/[^\p{L}\p{N}\s!?%]/gu, " ").replace(/\s+/g, " ").trim();
  const words = source.split(" ").filter(Boolean).slice(0, 5);

  // Accuracy guard: never show a number the narration does not mention.
  const sourceNumbers = new Set(sourceText.match(/\d+/g) ?? []);
  const hasBadNumber = words.some((word) => {
    const digits = word.match(/\d+/g);
    return Boolean(digits && digits.some((digit) => !sourceNumbers.has(digit)));
  });

  const picked = hasBadNumber
    ? fallback.split(" ").slice(0, 5)
    : words.length > 0
      ? words
      : fallback.split(" ").slice(0, 5);
  const headline = picked.join(" ").toUpperCase();
  return headline.slice(0, 34);
}

/**
 * Reject near-white / near-black / washed-out accent colors from the LLM.
 * They make the headline glow and hook card unreadable on bright gradients.
 */
function pickAccent(value: string, index: number) {
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    const r = Number.parseInt(value.slice(1, 3), 16) / 255;
    const g = Number.parseInt(value.slice(3, 5), 16) / 255;
    const b = Number.parseInt(value.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const saturation = max === 0 ? 0 : (max - min) / max;
    if (luminance > 0.12 && luminance < 0.86 && saturation > 0.35) {
      return value;
    }
  }
  return ACCENTS[index % ACCENTS.length];
}

function keywordsFor(sentence: ScriptSentence) {
  const words = sentence.text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
  return [...new Set(words)].slice(0, 3);
}

function pickBackground(value: string, index: number) {
  if (
    value &&
    (value.startsWith("linear-gradient") ||
      value.startsWith("radial-gradient") ||
      /^#[0-9a-f]{6}$/i.test(value))
  ) {
    return value;
  }
  return GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];
}

const MAX_SCENE_SECONDS = 2.5;

function parseNumber(text: string) {
  const match = text.match(
    /(\d+(?:[.,]\d+)?)\s*(%|km\/jam|km|cm|mm|kg|gram|tahun|detik|menit|ruas|tulang|derajat|kali|jam|persen)?/i,
  );
  if (!match) return null;

  const value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;

  let suffix = match[2] ?? "";
  if (!suffix) {
    const after = text
      .slice((match.index ?? 0) + match[0].length)
      .trim()
      .split(/\s+/)[0];
    if (after && /^[a-zA-Z%]{2,12}$/.test(after)) suffix = after;
  }

  const normalizedSuffix = suffix.toUpperCase();
  const displaySuffix =
    normalizedSuffix === "%"
      ? "%"
      : normalizedSuffix === "PERSEN"
        ? "%"
        : normalizedSuffix
          ? ` ${normalizedSuffix}`
          : "";

  return {
    value,
    suffix: displaySuffix,
    label: `${match[1]}${displaySuffix}`.slice(0, 24),
  };
}

function textHookFor(
  candidate: VisualPlanOutput["scenes"][number] | undefined,
  sentence: ScriptSentence,
  number: ReturnType<typeof parseNumber>,
  fallbackHeadline: string,
  chunkIndex: number,
) {
  if (chunkIndex === 0) {
    const explicit = (candidate?.overlay?.textHook ?? "").trim();
    if (explicit) return explicit.slice(0, 24).toUpperCase();
    if (number) return `${number.label}!!`.slice(0, 24);

    const headline = cleanHeadline(candidate?.headline ?? "", fallbackHeadline);
    if (headline) return headline.split(" ").slice(0, 4).join(" ");
  }

  const keywords = keywordsFor(sentence);
  if (keywords.length > 0) {
    return keywords[chunkIndex % keywords.length].toUpperCase().slice(0, 24);
  }
  return "";
}

function normalizeScenes(
  output: VisualPlanOutput,
  sentences: ScriptSentence[],
  timings: Timing[],
  duration: number,
): VisualScene[] {
  const scenes: VisualScene[] = [];
  let previousMotion: MotionType | null = null;
  let previousEmoji: string | null = null;

  sentences.forEach((sentence, sentenceIndex) => {
    const candidate = output.scenes[sentenceIndex];
    const isLastSentence = sentenceIndex === sentences.length - 1;

    const start = sentenceIndex === 0 ? 0 : timings[sentenceIndex].start;
    let end = isLastSentence
      ? duration
      : Math.max(
          timings[sentenceIndex].end,
          timings[sentenceIndex + 1].start,
        );

    // Keep the timeline monotonic, then cut the sentence into <=2.5s scenes.
    if (!isLastSentence) {
      end = Math.max(
        start + 0.5,
        Math.min(end, timings[sentenceIndex + 1].start),
      );
    } else {
      end = Math.max(start + 0.5, duration);
    }

    const span = Math.max(0.5, end - start);
    const chunkCount = Math.max(1, Math.ceil(span / MAX_SCENE_SECONDS));
    const chunkLength = span / chunkCount;
    const number = parseNumber(sentence.text);
    const fallbackHeadline = sentence.text.replace(/[^\p{L}\p{N}\s]/gu, "");
    // Visual bertipe: lolos hanya kalau semua angkanya ada di narasi kalimat ini.
    const visual = cleanVisual(candidate?.visual, sentence.text, number);

    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
      const chunkStart = start + chunkIndex * chunkLength;
      const chunkEnd =
        chunkIndex === chunkCount - 1 ? end : chunkStart + chunkLength;
      const sceneIndex = scenes.length;

      let motion =
        candidate?.motion.type ?? MOTIONS[sceneIndex % MOTIONS.length];
      if (motion === previousMotion) {
        motion = MOTIONS[(MOTIONS.indexOf(motion) + 1) % MOTIONS.length];
      }
      previousMotion = motion;

      let emoji = (
        candidate?.overlay?.bigEmoji ||
        candidate?.overlayEmoji ||
        ""
      )
        .trim()
        .slice(0, 8);
      if (!emoji || emoji === previousEmoji) {
        emoji = EMOJI_POOL[sceneIndex % EMOJI_POOL.length];
      }
      previousEmoji = emoji;

      const accent = candidate?.accentColor ?? "";
      const gradient = pickBackground(
        candidate?.background.value ?? "",
        sceneIndex,
      );
      const fallback =
        candidate?.background.fallback &&
        candidate.background.fallback.startsWith("linear-gradient")
          ? candidate.background.fallback
          : gradient;

      const candidateCounter = candidate?.overlay?.counter;
      let counter: { value: number; suffix: string; prefix: string } | undefined;
      if (chunkIndex === 0) {
        if (number) {
          // The narration number is the source of truth. The LLM may only
          // refine the suffix when it agrees on the value.
          const agrees =
            Boolean(candidateCounter) &&
            Math.abs((candidateCounter?.value ?? 0) - number.value) < 0.01;
          counter = {
            value: number.value,
            prefix: agrees ? (candidateCounter?.prefix ?? "") : "",
            suffix:
              agrees && candidateCounter?.suffix
                ? candidateCounter.suffix
                : number.suffix,
          };
        } else if (candidateCounter && candidateCounter.value >= 3) {
          // Ignore "part 2" style counters, they look like broken data.
          counter = {
            value: candidateCounter.value,
            suffix: candidateCounter.suffix ?? "",
            prefix: candidateCounter.prefix ?? "",
          };
        }
      }

      scenes.push({
        id: `sc${sceneIndex + 1}`,
        startTime: Math.round(Math.max(0, chunkStart) * 1000) / 1000,
        endTime: Math.round(Math.min(duration, chunkEnd) * 1000) / 1000,
        duration: Math.round(Math.max(0.4, chunkEnd - chunkStart) * 1000) / 1000,
        background: {
          type: "gradient",
          value: gradient,
          fallback,
        },
        motion: {
          type: motion,
          intensity: Math.min(
            0.5,
            Math.max(0.1, candidate?.motion.intensity ?? 0.2),
          ),
        },
        kenBurns: true,
        textAnimation: {
          type:
            candidate?.textAnimation.type ??
            ANIMATIONS[sceneIndex % ANIMATIONS.length],
        },
        bRollKeywords:
          candidate?.bRollKeywords?.slice(0, 4).filter(Boolean) ??
          keywordsFor(sentence),
        overlayEmoji: emoji,
        overlay: {
          bigEmoji: emoji,
          // Visual utama menggantikan textHook/counter (zona tengah sama).
          textHook: visual
            ? ""
            : textHookFor(
                candidate,
                sentence,
                number,
                fallbackHeadline,
                chunkIndex,
              ),
          counter: visual ? undefined : counter,
        },
        visual,
        visualOffset: visual
          ? Math.round((chunkStart - start) * 1000) / 1000
          : undefined,
        visualFinal: visual ? chunkIndex === chunkCount - 1 : undefined,
        headline: cleanHeadline(
          candidate?.headline ?? "",
          fallbackHeadline,
          sentence.text,
        ),
        accentColor: pickAccent(accent, sceneIndex),
      });
    }
  });

  return scenes;
}

function brollQuery(scene: VisualScene, topic: string) {
  const keywords = scene.bRollKeywords.slice(0, 2).join(" ").trim();
  return keywords || topic;
}

async function attachBRoll(scenes: VisualScene[], topic: string) {
  const queries = scenes.map((scene) => brollQuery(scene, topic));
  const matches = await searchPexelsVideos(queries);
  if (matches.size === 0) return scenes;

  let replaced = 0;
  const hydrated = scenes.map((scene) => {
    const url = matches.get(brollQuery(scene, topic));
    if (!url) return scene;
    replaced += 1;
    return {
      ...scene,
      background: {
        type: "video" as const,
        value: url,
        videoUrl: url,
        fallback: scene.background.fallback ?? scene.background.value,
      },
    };
  });

  if (replaced > 0) {
    console.info(`[visual-planner] ${replaced} scene memakai b-roll Pexels.`);
  }
  return hydrated;
}

function fallbackPlan(
  sentences: ScriptSentence[],
  timings: Timing[],
  duration: number,
): VisualPlan {
  return {
    vibe: "fast-cut, high contrast, gen-z viral",
    generatedAt: new Date().toISOString(),
    scenes: normalizeScenes(
      {
        vibe: "fallback",
        scenes: sentences.map((sentence, index) => ({
          id: `sc${index + 1}`,
          startTime: timings[index].start,
          endTime: timings[index].end,
          background: {
            type: "gradient" as const,
            value: GRADIENT_PALETTES[index % GRADIENT_PALETTES.length],
          },
          motion: {
            type: MOTIONS[index % MOTIONS.length],
            intensity: 0.18 + (index % 3) * 0.05,
          },
          kenBurns: true,
          textAnimation: {
            type: ANIMATIONS[index % ANIMATIONS.length],
          },
          bRollKeywords: keywordsFor(sentence),
          overlayEmoji: EMOJI_POOL[index % EMOJI_POOL.length],
          headline: "",
          accentColor: ACCENTS[index % ACCENTS.length],
        })),
      },
      sentences,
      timings,
      duration,
    ),
  };
}

export async function runVisualPlanner(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`Project ${projectId} tidak ditemukan.`);

  const fullScript = project.fullScript as unknown as FullScript | null;
  const words = project.wordTimestamps as unknown as WordTimestamp[] | null;
  if (!fullScript || !Array.isArray(fullScript.sentences)) {
    throw new Error("Naskah belum tersedia untuk visual planner.");
  }
  if (!project.audioUrl || !project.duration) {
    throw new Error("Audio belum tersedia untuk visual planner.");
  }

  await startStage(projectId, "visual-planning");

  const duration = project.duration;
  const timings = sentenceTimings(fullScript.sentences, words ?? [], duration);

  const sentenceTable = fullScript.sentences
    .map(
      (sentence, index) =>
        `${index + 1}. [${timings[index].start.toFixed(2)}s - ${timings[index].end.toFixed(2)}s] ${sentence.text}`,
    )
    .join("\n");

  const paletteTable = GRADIENT_PALETTES.map(
    (gradient, index) => `${index + 1}. ${gradient}`,
  ).join("\n");

  let plan: VisualPlan;
  try {
    const output = await chatJSON({
      system: VISUAL_SYSTEM_PROMPT,
      user: `TOPIK: ${project.topic}
DURASI AUDIO: ${duration.toFixed(2)} detik
JUMLAH KALIMAT: ${fullScript.sentences.length}

KALIMAT + TIMING (wajib jadi acuan scene):
${sentenceTable}

PILIHAN GRADIENT (background.value harus salah satu string ini):
${paletteTable}

FAKTA RISET:
${JSON.stringify(project.researchData ?? {}).slice(0, 2000)}

Buat tepat ${fullScript.sentences.length} scene, satu scene per kalimat. Jangan mengubah timing.`,
      schema: visualPlanSchema,
      tier: "primary",
      temperature: 0.8,
      maxTokens: 3200,
    });

    plan = {
      vibe: output.vibe,
      generatedAt: new Date().toISOString(),
      scenes: normalizeScenes(output, fullScript.sentences, timings, duration),
    };
  } catch (error) {
    console.warn(
      "[visual-planner] LLM gagal, memakai visual plan fallback:",
      error instanceof Error ? error.message : error,
    );
    plan = fallbackPlan(fullScript.sentences, timings, duration);
  }

  // Optional Pexels b-roll. Without PEXELS_API_KEY this keeps the animated
  // gradients generated above, so the pipeline never depends on the network.
  plan.scenes = await attachBRoll(plan.scenes, project.topic);

  await prisma.project.update({
    where: { id: projectId },
    data: { visualPlan: asJson(plan) },
  });

  await completeStage(projectId, "visual-planning", {
    scenes: plan.scenes.length,
    vibe: plan.vibe,
  });

  return plan;
}
