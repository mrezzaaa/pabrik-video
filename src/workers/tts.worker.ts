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

export class TTSWorker {
  private client: OpenAI;
  private voiceId: string;
  private model: string;
  private speed: number;

  constructor() {
    const baseURL =
      process.env.VOICESTUDIO_BASE_URL || "http://localhost:3900/v1";
    this.voiceId = process.env.VOICE_DEFAULT_ID || "aad77d68";
    this.model = "tts-1-hd";
    this.speed = 1.1;

    this.client = new OpenAI({
      baseURL,
      apiKey: "local",
    });
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
    const targetVoice = voiceId || this.voiceId;
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
