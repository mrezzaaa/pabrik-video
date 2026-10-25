import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface TTSResult {
  filePath: string;
  durationMs: number;
  engineUsed: "voicestudio-clone" | "edge-tts-neural";
}

export class TTSEngine {
  private voiceStudioBaseUrl: string;
  private voiceId: string;
  private voiceName: string;

  constructor() {
    this.voiceStudioBaseUrl =
      process.env.VOICESTUDIO_BASE_URL || "http://localhost:3900/v1";
    this.voiceId = process.env.VOICE_DEFAULT_ID || "aad77d68";
    this.voiceName = process.env.VOICESTUDIO_VOICE_NAME || "reza";
  }

  /**
   * Extract accurate audio duration in milliseconds using ffprobe
   */
  async getAudioDurationMs(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          return reject(err);
        }
        const durationSec = metadata.format.duration || 0;
        resolve(Math.round(durationSec * 1000));
      });
    });
  }

  /**
   * Convert audio to standard MP3 with 1.1x tempo and 44.1kHz stereo
   */
  async postProcessAudio(inputPath: string, outputPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters("atempo=1.1")
        .audioCodec("libmp3lame")
        .audioFrequency(44100)
        .output(outputPath)
        .on("end", () => {
          if (fs.existsSync(inputPath)) {
            try {
              fs.unlinkSync(inputPath);
            } catch (_) {}
          }
          resolve();
        })
        .on("error", (err) => {
          if (fs.existsSync(inputPath)) {
            try {
              fs.unlinkSync(inputPath);
            } catch (_) {}
          }
          reject(err);
        })
        .run();
    });
  }

  /**
   * Primary: VoiceStudio Cloned Voice (/v1/audio/speech)
   * Uses cloned voice ID configured in .env.local
   */
  async generateVoiceStudio(
    text: string,
    outputMp3Path: string
  ): Promise<boolean> {
    const tempRaw = outputMp3Path.replace(/\.mp3$/, "-vs-raw.mp3");

    try {
      console.log(
        `[TTS] Synthesizing via VoiceStudio Cloned Voice (${this.voiceName} - ${this.voiceId})...`
      );

      const endpoint = `${this.voiceStudioBaseUrl.replace(/\/+$/, "")}/audio/speech`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": "Bearer local",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          voice: this.voiceId,
          input: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `VoiceStudio returned status ${response.status}: ${errorText}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length < 1000) {
        throw new Error("VoiceStudio audio buffer is suspiciously small");
      }

      fs.writeFileSync(tempRaw, buffer);

      // Post-process with standard tempo and 44.1kHz formatting
      await this.postProcessAudio(tempRaw, outputMp3Path);

      console.log(
        `[TTS] Successfully synthesized VoiceStudio cloned voice: ${outputMp3Path}`
      );
      return true;
    } catch (err) {
      console.warn(
        `[TTS] VoiceStudio synthesis encountered an issue:`,
        err
      );
      if (fs.existsSync(tempRaw)) {
        try {
          fs.unlinkSync(tempRaw);
        } catch (_) {}
      }
      return false;
    }
  }

  /**
   * Real-time Memory Stream: VoiceStudio Cloned Voice (/v1/audio/speech)
   * Streams raw audio bytes directly into memory buffer without temporary files.
   */
  async streamVoiceStudioAudioChunk(
    text: string,
    onChunk?: (chunk: Uint8Array) => void
  ): Promise<Buffer> {
    const endpoint = `${this.voiceStudioBaseUrl.replace(/\/+$/, "")}/audio/speech`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": "Bearer local",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: this.voiceId,
        input: text,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`VoiceStudio stream failed with status ${response.status}: ${errorText}`);
    }

    if (!response.body) {
      const arrayBuffer = await response.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      if (onChunk) onChunk(new Uint8Array(buf));
      return buf;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.length > 0) {
        chunks.push(value);
        if (onChunk) onChunk(value);
      }
    }

    return Buffer.concat(chunks);
  }

  /**
   * Resilient Fallback: Microsoft Edge Neural TTS (Indonesian Male: id-ID-ArdiNeural)
   */
  async generateEdgeTTSFallback(
    text: string,
    outputMp3Path: string
  ): Promise<boolean> {
    const tempRaw = outputMp3Path.replace(/\.mp3$/, "-raw.mp3");

    try {
      console.log(
        `[TTS] Using Edge Neural Male voice fallback (id-ID-ArdiNeural) for: "${text.slice(0, 30)}..."`
      );

      // Clean text to avoid shell escaping issues
      const escapedText = text.replace(/"/g, '\\"');
      const cmd = `edge-tts --voice "id-ID-ArdiNeural" --rate="+10%" --text "${escapedText}" --write-media "${tempRaw}"`;

      await execAsync(cmd);

      if (!fs.existsSync(tempRaw) || fs.statSync(tempRaw).size < 1000) {
        throw new Error("edge-tts output file missing or empty");
      }

      // Standardize audio sample rate and format
      await this.postProcessAudio(tempRaw, outputMp3Path);
      return true;
    } catch (err) {
      console.error("[TTS] Edge-TTS Neural fallback failed:", err);
      if (fs.existsSync(tempRaw)) {
        try {
          fs.unlinkSync(tempRaw);
        } catch (_) {}
      }
      return false;
    }
  }

  /**
   * Main synthesis orchestrator
   * 1. VoiceStudio Cloned Voice (Local)
   * 2. Fallback: Edge-TTS Neural Male (id-ID-ArdiNeural)
   */
  async synthesizeNarration(
    text: string,
    outputFilePath: string
  ): Promise<TTSResult> {
    const dir = path.dirname(outputFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 1. Try VoiceStudio cloned voice
    const voiceStudioSuccess = await this.generateVoiceStudio(
      text,
      outputFilePath
    );
    if (
      voiceStudioSuccess &&
      fs.existsSync(outputFilePath) &&
      fs.statSync(outputFilePath).size > 2000
    ) {
      const durationMs = await this.getAudioDurationMs(outputFilePath);
      return {
        filePath: outputFilePath,
        durationMs,
        engineUsed: "voicestudio-clone",
      };
    }

    // 2. Fallback to Microsoft Edge Neural Male voice (id-ID-ArdiNeural)
    console.log(
      `[TTS] VoiceStudio unavailable; engaging Edge Neural Male Voice...`
    );
    const fallbackOk = await this.generateEdgeTTSFallback(
      text,
      outputFilePath
    );
    if (!fallbackOk || !fs.existsSync(outputFilePath)) {
      throw new Error(
        `Failed to synthesize speech for: "${text}" across all engines.`
      );
    }

    const durationMs = await this.getAudioDurationMs(outputFilePath);
    return {
      filePath: outputFilePath,
      durationMs,
      engineUsed: "edge-tts-neural",
    };
  }
}

export const ttsEngine = new TTSEngine();

