import path from "node:path";
import { alignWithSentenceTimings, alignWords } from "../alignment";
import {
  buildSentenceTimings,
  hookGapSeconds,
} from "../engine/timeline";
import {
  ensureMediaDirs,
  ffprobeDuration,
  publicUrl,
  trimAudio,
  AUDIO_DIR,
} from "../media";
import { asJson, completeStage, startStage } from "../pipeline";
import { prisma } from "../prisma";
import { toSpokenIndonesian } from "../speech-prep";
import { synthesizeBeatsToFile, synthesizeChunkedToFile } from "../tts";
import type { CaptionPage, FullScript, ScriptSentence, WordTimestamp } from "../types";

/** Facebook Reels hard limit for this pipeline. */
const MAX_REELS_SECONDS = 60;
/** Hook harus selesai diucapkan kira-kira dalam 3 detik pertama. */
const HOOK_WARN_SECONDS = 3.4;

function groupByBeat(sentences: ScriptSentence[]): ScriptSentence[][] | null {
  if (!sentences.every((sentence) => typeof sentence.beat === "number")) return null;
  const groups: ScriptSentence[][] = [];
  let current: ScriptSentence[] = [];
  let beat = sentences[0]?.beat;
  for (const sentence of sentences) {
    if (sentence.beat !== beat && current.length) {
      groups.push(current);
      current = [];
      beat = sentence.beat;
    }
    current.push(sentence);
  }
  if (current.length) groups.push(current);
  return groups;
}

export async function runTts(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`Project ${projectId} tidak ditemukan.`);

  const fullScript = project.fullScript as unknown as FullScript | null;
  if (!fullScript || !Array.isArray(fullScript.sentences)) {
    throw new Error("Naskah belum tersedia untuk proses TTS.");
  }

  await startStage(projectId, "tts");
  await ensureMediaDirs();

  if (!fullScript.sentences.some((sentence) => sentence.text.trim())) {
    throw new Error("Naskah kosong, tidak ada yang bisa di-TTS.");
  }

  const audioPath = path.join(AUDIO_DIR, `${projectId}.mp3`);
  const groups = groupByBeat(fullScript.sentences);

  let provider: string;
  let voice: string;
  let bytes: number;
  let chunks: number;
  let words: WordTimestamp[];
  let captions: CaptionPage[];
  let sentences = fullScript.sentences;
  const extra: Record<string, unknown> = {};

  if (groups) {
    // Alur baru: sintesis per beat, timing kalimat diukur dari audio asli.
    const inputs = groups.map((group, index) => ({
      text: toSpokenIndonesian(group.map((sentence) => sentence.text).join(" ")),
      gapAfter: hookGapSeconds(index, groups),
    }));
    const synthesis = await synthesizeBeatsToFile(inputs, audioPath, {
      voice: project.voice,
    });
    provider = synthesis.provider;
    voice = synthesis.voice;
    bytes = synthesis.bytes;
    chunks = groups.length;

    const timeline = buildSentenceTimings(
      groups.map((group, index) => ({
        sentences: group,
        duration: synthesis.beats[index].duration,
        silences: synthesis.beats[index].silences,
        gapAfter: inputs[index].gapAfter,
      })),
    );

    let duration = await ffprobeDuration(audioPath);
    if (duration < 0.5) throw new Error("Audio TTS terlalu pendek / rusak.");
    if (duration > MAX_REELS_SECONDS + 0.05) {
      console.info(`[tts] audio ${duration.toFixed(2)}s > ${MAX_REELS_SECONDS}s, memangkas...`);
      await trimAudio(audioPath, MAX_REELS_SECONDS);
      duration = await ffprobeDuration(audioPath);
    }

    const aligned = alignWithSentenceTimings(fullScript.sentences, timeline.timings, duration);
    words = aligned.words;
    captions = aligned.captions;
    sentences = fullScript.sentences.map((sentence) => {
      const timing = timeline.timings.find((t) => t.id === sentence.id);
      return timing
        ? { ...sentence, start: Math.round(timing.start * 1000) / 1000, end: Math.round(timing.end * 1000) / 1000 }
        : sentence;
    });

    const hookEnd = timeline.timings[0]?.end ?? 0;
    extra.alignment = "measured";
    extra.hookSeconds = Math.round(hookEnd * 100) / 100;
    extra.boundariesFromAudio = `${timeline.snapped}/${timeline.boundaries}`;
    if (hookEnd > HOOK_WARN_SECONDS) {
      extra.warning = `Hook selesai di detik ${hookEnd.toFixed(1)} (target 3 detik). Pertimbangkan hook lebih pendek.`;
      console.warn(`[tts] ${extra.warning}`);
    }
    await finish(duration);
  } else {
    // Project lama tanpa beat: alur sebelumnya (satu paket teks, timing perkiraan).
    const narration = fullScript.sentences.map((sentence) => sentence.text).join(" ").trim();
    const synthesis = await synthesizeChunkedToFile(toSpokenIndonesian(narration), audioPath, 2500, {
      voice: project.voice,
    });
    provider = synthesis.provider;
    voice = synthesis.voice;
    bytes = synthesis.bytes;
    chunks = synthesis.chunks;

    let duration = await ffprobeDuration(audioPath);
    if (duration < 0.5) throw new Error("Audio TTS terlalu pendek / rusak.");
    if (duration > MAX_REELS_SECONDS + 0.05) {
      await trimAudio(audioPath, MAX_REELS_SECONDS);
      duration = await ffprobeDuration(audioPath);
    }
    const aligned = alignWords(fullScript.sentences, duration);
    words = aligned.words;
    captions = aligned.captions;
    extra.alignment = "estimated";
    await finish(duration);
  }

  async function finish(duration: number) {
    const updated: FullScript = {
      ...fullScript!,
      sentences,
      captions,
      durationEstimate: Math.round(duration * 10) / 10,
    };
    await prisma.project.update({
      where: { id: projectId },
      data: {
        audioUrl: publicUrl(audioPath),
        duration: Math.min(MAX_REELS_SECONDS, Math.round(duration * 100) / 100),
        wordTimestamps: asJson(words),
        fullScript: asJson(updated),
      },
    });
    extra.duration = Math.round(duration * 100) / 100;
  }

  await completeStage(projectId, "tts", {
    provider,
    voice,
    words: words.length,
    bytes,
    chunks,
    ...extra,
  });

  return { audioUrl: publicUrl(audioPath), words, captions };
}
