import { env } from "@/config/env";
import { computeWordTimings, synthesizeScriptSegment } from "@/lib/tts-client";
import { VIDEO_FPS } from "@/remotion/constants";
import {
  TtsSynchronizerOutputSchema,
  type AudioSegmentTimingSchema,
  type AudioSfxTrigger,
  type ScriptArchitectOutput,
  type TtsSynchronizerOutput,
  type VideoBlueprintScene,
} from "@/schemas/video-blueprint";
import type { z } from "zod";

type AudioSegmentTiming = z.infer<typeof AudioSegmentTimingSchema>;

export async function runTtsSynchronizerAgent(params: {
  jobId: string;
  script: ScriptArchitectOutput;
  dynamicScenes?: VideoBlueprintScene[];
  onSegmentProgress?: (
    segmentIndex: number,
    total: number,
    audioUrl: string,
    durationSec: number
  ) => Promise<void>;
}): Promise<{ ttsOutput: TtsSynchronizerOutput; updatedScenes?: VideoBlueprintScene[] }> {
  const { jobId, script, dynamicScenes, onSegmentProgress } = params;
  const fps = VIDEO_FPS;
  const voice = env.UNLIMITEDTTS_VOICE || "Ethan";
  const language = env.UNLIMITEDTTS_LANGUAGE || "id-ID";
  const speed = env.UNLIMITEDTTS_SPEED || 1.1;

  const timedSegments: AudioSegmentTiming[] = [];
  const sfxTriggers: AudioSfxTrigger[] = [];
  let cumulativeSeconds = 0;
  let cumulativeFrames = 0;
  let primaryEngineUsed = `unlimitedtts.com (${language}, Voice: ${voice}, Speed: ${speed}x)`;

  for (let i = 0; i < script.segments.length; i++) {
    const seg = script.segments[i];
    const synthResult = await synthesizeScriptSegment({
      jobId,
      segmentIndex: seg.segmentIndex,
      text: seg.narrationText,
      language,
      voice,
      speed,
    });

    primaryEngineUsed = synthResult.engineUsed;

    // Exact frame calculation directly from silence-trimmed & tail-padded audio:
    const durationInFrames = Math.max(
      Math.round(synthResult.durationInSeconds * fps),
      Math.round(1.5 * fps)
    );
    const exactDurationSec = Number((durationInFrames / fps).toFixed(3));

    const startSec = Number(cumulativeSeconds.toFixed(3));
    const endSec = Number((cumulativeSeconds + exactDurationSec).toFixed(3));
    const startFrame = cumulativeFrames;
    const endFrame = cumulativeFrames + durationInFrames;

    // Word timings are distributed strictly across speech duration (excluding 0.35s breathing tail)
    const wordTimings = computeWordTimings(
      seg.narrationText,
      startSec,
      synthResult.durationInSeconds,
      fps,
      0.35
    );

    // Update dynamicScenes scene if available
    if (dynamicScenes && dynamicScenes[i]) {
      dynamicScenes[i].durationInFrames = durationInFrames;
      dynamicScenes[i].audioUrl = synthResult.audioUrl;
      dynamicScenes[i].words = wordTimings.map((w) => ({
        text: w.word,
        startFrame: Math.max(0, w.startFrame - startFrame),
        endFrame: Math.max(0, w.endFrame - startFrame),
      }));
      dynamicScenes[i].caption.words = dynamicScenes[i].words;
    }

    timedSegments.push({
      segmentIndex: seg.segmentIndex,
      phaseType: seg.phaseType,
      audioUrl: synthResult.audioUrl,
      filePath: synthResult.filePath,
      durationInSeconds: synthResult.durationInSeconds,
      startSec,
      endSec,
      startFrame,
      endFrame,
      durationInFrames,
      wordTimings,
    });

    // Map SFX trigger timestamp matching visual sfxCue
    if (seg.sfxCue) {
      const sfxStartFrame =
        startFrame +
        Math.floor(durationInFrames * (seg.sfxCue.relativeTriggerRatio ?? 0.3));
      sfxTriggers.push({
        id: `sfx_${i}_${seg.sfxCue.soundEffectFile}`,
        soundEffectFile: seg.sfxCue.soundEffectFile,
        startFrame: sfxStartFrame,
        durationInFrames: 90,
        visualText: seg.sfxCue.text,
      });
    }

    cumulativeSeconds = endSec;
    cumulativeFrames = endFrame;

    if (onSegmentProgress) {
      await onSegmentProgress(
        i + 1,
        script.segments.length,
        synthResult.audioUrl,
        synthResult.durationInSeconds
      );
    }
  }

  const output: TtsSynchronizerOutput = {
    jobId,
    fps,
    voice,
    language,
    speed,
    engineUsed: primaryEngineUsed,
    totalDurationInSeconds: Number(cumulativeSeconds.toFixed(3)),
    totalDurationInFrames: Math.max(cumulativeFrames, 180),
    segments: timedSegments,
    sfxTriggers,
  };

  const parsedOutput = TtsSynchronizerOutputSchema.parse(output);
  return { ttsOutput: parsedOutput, updatedScenes: dynamicScenes };
}
