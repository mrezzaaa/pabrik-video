import { env } from "@/config/env";
import { computeWordTimings, synthesizeScriptSegment } from "@/lib/tts-client";
import {
  TtsSynchronizerOutputSchema,
  type AudioSegmentTimingSchema,
  type AudioSfxTrigger,
  type ScriptArchitectOutput,
  type TtsSynchronizerOutput,
} from "@/schemas/video-blueprint";
import type { z } from "zod";

type AudioSegmentTiming = z.infer<typeof AudioSegmentTimingSchema>;

export async function runTtsSynchronizerAgent(params: {
  jobId: string;
  script: ScriptArchitectOutput;
  onSegmentProgress?: (
    segmentIndex: number,
    total: number,
    audioUrl: string,
    durationSec: number
  ) => Promise<void>;
}): Promise<TtsSynchronizerOutput> {
  const { jobId, script, onSegmentProgress } = params;
  const fps = env.REMOTION_FPS || 60;
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

    // Exact frame calculation: durationInFrames = Math.ceil(audioDurationInSeconds * 60)
    const durationInFrames = Math.max(
      Math.ceil(synthResult.durationInSeconds * fps),
      180
    );
    const exactDurationSec = Number((durationInFrames / fps).toFixed(3));

    const startSec = Number(cumulativeSeconds.toFixed(3));
    const endSec = Number((cumulativeSeconds + exactDurationSec).toFixed(3));
    const startFrame = cumulativeFrames;
    const endFrame = cumulativeFrames + durationInFrames;

    const wordTimings = computeWordTimings(
      seg.narrationText,
      startSec,
      synthResult.durationInSeconds,
      fps
    );

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
    totalDurationInFrames: Math.max(cumulativeFrames, 300),
    segments: timedSegments,
    sfxTriggers,
  };

  return TtsSynchronizerOutputSchema.parse(output);
}
