import fs from "fs";
import path from "path";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import { VIDEO_FPS } from "../../remotion/constants";

export interface SynthesizeAudioOptions {
  jobId: string;
  text: string;
  outputFileName?: string;
  voiceId?: string;
  speed?: number;
}

export interface SynthesizedAudioResult {
  filePath: string;
  durationMs: number;
  durationInFrames: number;
}

export interface VoiceStudioVoice {
  /** Canonical id used by the speech endpoint. */
  id: string;
  name?: string;
  [key: string]: unknown;
}

/** VoiceStudio reports `voice_id`; normalise it to `id` for callers. */
function normaliseVoice(raw: Record<string, any>): VoiceStudioVoice {
  return {
    ...raw,
    id: String(raw.id ?? raw.voice_id ?? raw.name ?? ""),
    name: raw.name ?? raw.voice_name,
  };
}

export class TTSWorker {
  private client: OpenAI;
  private baseURL: string;
  private voiceId: string;
  private model: string;
  private speed: number;

  constructor() {
    this.baseURL =
      process.env.VOICESTUDIO_BASE_URL || "http://localhost:3900/v1";
    this.voiceId = process.env.VOICE_DEFAULT_ID || "aad77d68";
    this.model = "tts-1-hd";
    this.speed = 1.1;

    // VoiceStudio speaks the OpenAI audio API, which `openai` already wraps.
    this.client = new OpenAI({
      baseURL: this.baseURL,
      apiKey: "local",
    });
  }

  /**
   * Lists the cloned voices available on the local VoiceStudio server.
   *
   * VoiceStudio exposes them on `/v1/audio/voices` (not `/v1/voices`, which is
   * 404). Returns an empty list when the server is not running so callers can
   * fall back to the default voice id instead of throwing.
   */
  async listVoices(): Promise<VoiceStudioVoice[]> {
    const url = `${this.baseURL.replace(/\/+$/, "")}/audio/voices`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[TTS WORKER] ${url} -> HTTP ${res.status}`);
        return [];
      }
      const data = (await res.json()) as unknown;
      const rawList = Array.isArray(data)
        ? data
        : ((data as { voices?: unknown; data?: unknown }).voices ??
          (data as { data?: unknown }).data);
      if (!Array.isArray(rawList)) return [];
      return rawList
        .filter((voice) => voice && typeof voice === "object")
        .map((voice) => normaliseVoice(voice as Record<string, any>))
        .filter((voice) => voice.id.length > 0);
    } catch (err: any) {
      console.warn(`[TTS WORKER] VoiceStudio not reachable: ${err.message}`);
      return [];
    }
  }

  /** Resolves the requested voice, falling back to the default when unknown. */
  async resolveVoice(voiceId?: string): Promise<string> {
    const requested = voiceId || this.voiceId;
    const voices = await this.listVoices();
    if (!voices.length) return requested;
    const exists = voices.some((voice) => voice.id === requested);
    if (exists) return requested;
    console.warn(
      `[TTS WORKER] Voice "${requested}" not found; falling back to "${this.voiceId}".`
    );
    return voices.some((voice) => voice.id === this.voiceId)
      ? this.voiceId
      : voices[0].id;
  }

  /**
   * Post-processes audio with silence removal & normalization
   */
  private async processWithFfmpeg(
    rawPath: string,
    finalPath: string
  ): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      // ffmpeg silenceremove 1:0:-50dB:0:0.5 and normalize
      ffmpeg(rawPath)
        .audioFilters([
          "silenceremove=start_periods=1:start_duration=0:start_threshold=-50dB:stop_periods=1:stop_duration=0.5:stop_threshold=-50dB",
          "volume=1.2",
        ])
        .audioCodec("libmp3lame")
        .audioFrequency(44100)
        .output(finalPath)
        .on("end", () => {
          if (fs.existsSync(rawPath) && rawPath !== finalPath) {
            try {
              fs.unlinkSync(rawPath);
            } catch (_) {}
          }

          // Measure accurate duration with ffprobe
          ffmpeg.ffprobe(finalPath, (err, metadata) => {
            if (err) {
              return resolve(5000);
            }
            const sec = metadata.format.duration || 0;
            resolve(Math.round(sec * 1000));
          });
        })
        .on("error", (err) => {
          console.warn("[TTS WORKER] FFmpeg filter warning:", err.message);
          // Fallback to raw path if filtering had issues
          if (fs.existsSync(rawPath)) {
            ffmpeg.ffprobe(rawPath, (err2, meta) => {
              const sec = meta?.format?.duration || 5;
              resolve(Math.round(sec * 1000));
            });
          } else {
            resolve(5000);
          }
        })
        .run();
    });
  }

  /**
   * Synthesize narration using VoiceStudio local API (reza cloned voice aad77d68)
   */
  async synthesizeNarration({
    jobId,
    text,
    outputFileName = "audio.mp3",
    voiceId,
    speed,
  }: SynthesizeAudioOptions): Promise<SynthesizedAudioResult> {
    const outputDir = path.join(process.cwd(), "public", "assets", jobId);
    const finalPath = path.join(outputDir, outputFileName);
    const finalDir = path.dirname(finalPath);
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }

    const baseName = path.basename(outputFileName);
    const rawPath = path.join(finalDir, `raw_${Date.now()}_${baseName}`);
    const targetVoice = await this.resolveVoice(voiceId);
    const targetSpeed = speed || this.speed;

    console.log(
      `[TTS WORKER] Synthesizing via VoiceStudio local (${this.model}, voice=${targetVoice}, speed=${targetSpeed})...`
    );

    try {
      const response = await this.client.audio.speech.create({
        model: this.model,
        voice: targetVoice as any,
        input: text,
        speed: targetSpeed,
        response_format: "mp3",
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(rawPath, buffer);

      const durationMs = await this.processWithFfmpeg(rawPath, finalPath);
      const durationInFrames = Math.round((durationMs / 1000) * VIDEO_FPS);

      console.log(
        `[TTS WORKER] Audio ready: ${finalPath} (${durationMs}ms, ${durationInFrames} frames at ${VIDEO_FPS}fps)`
      );

      return {
        filePath: finalPath,
        durationMs,
        durationInFrames,
      };
    } catch (err: any) {
      console.warn(
        `[TTS WORKER] VoiceStudio error (${err.message}), falling back to EdgeTTS:`
      );

      try {
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execAsync = promisify(exec);
        const escapedText = text.replace(/"/g, '\\"');
        const cmd = `edge-tts --voice "id-ID-ArdiNeural" --rate="+10%" --text "${escapedText}" --write-media "${rawPath}"`;
        await execAsync(cmd);

        if (fs.existsSync(rawPath) && fs.statSync(rawPath).size > 500) {
          const durationMs = await this.processWithFfmpeg(rawPath, finalPath);
          const durationInFrames = Math.round((durationMs / 1000) * VIDEO_FPS);
          return {
            filePath: finalPath,
            durationMs,
            durationInFrames,
          };
        }
      } catch (edgeErr: any) {
        console.warn(`[TTS WORKER] EdgeTTS fallback failed:`, edgeErr.message);
      }

      // If all fails, create a clean silent audio so Remotion never 404s
      await new Promise<void>((resolve) => {
        ffmpeg()
          .input("anullsrc=r=44100:cl=stereo")
          .inputFormat("lavfi")
          .duration(5)
          .audioCodec("libmp3lame")
          .output(finalPath)
          .on("end", () => resolve())
          .on("error", () => resolve())
          .run();
      });

      return {
        filePath: finalPath,
        durationMs: 5000,
        durationInFrames: 5 * VIDEO_FPS,
      };
    }
  }
}

export const ttsWorker = new TTSWorker();
