import fs from "fs";
import path from "path";
import { chromium, Browser, BrowserContext } from "playwright";
import ffmpeg from "fluent-ffmpeg";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface TTSResult {
  filePath: string;
  durationMs: number;
  engineUsed: "unlimitedtts-ethan" | "edge-tts-neural";
}

export class TTSEngine {
  private voice: string;
  private speed: string;
  private browserInstance: Browser | null = null;
  private contextInstance: BrowserContext | null = null;

  constructor() {
    this.voice = process.env.UNLIMITEDTTS_VOICE || "Ethan";
    this.speed = process.env.UNLIMITEDTTS_SPEED || "1.1";
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
   * Convert WAV to standard MP3 with 1.1x tempo and 44.1kHz stereo
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
   * Primary: UnlimitedTTS Natural AI Voice (Ethan - Indonesian __ai_supertonic_voice__:M3)
   * Automated via Headless Playwright using client-side Supertonic ONNX runtime
   */
  async generateUnlimitedTTSEthan(
    text: string,
    outputMp3Path: string
  ): Promise<boolean> {
    let browser: Browser | null = null;
    const tempWav = outputMp3Path.replace(/\.mp3$/, "-temp.wav");

    try {
      console.log(`[TTS] Synthesizing via UnlimitedTTS Natural Voice (Ethan)...`);
      browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      const page = await browser.newPage();

      // Intercept audio blob created by Supertonic player in UnlimitedTTS
      await page.addInitScript(() => {
        const origCreateObjectURL = URL.createObjectURL;
        (window as any)._capturedAudioBlob = null;
        URL.createObjectURL = function (blob: Blob) {
          if (blob && (blob.type?.includes("audio") || blob.size > 1000)) {
            (window as any)._capturedAudioBlob = blob;
          }
          return origCreateObjectURL.apply(this, arguments as any);
        };
      });

      await page.goto("https://unlimitedtts.com", {
        waitUntil: "networkidle",
        timeout: 25000,
      });

      // Switch to Natural / AI Mode
      await page.click("#engine-ai-btn");
      await page.waitForTimeout(400);

      // Confirm preflight download modal
      const preflightBtn = await page.$("#ai-preflight-continue");
      if (preflightBtn) {
        await preflightBtn.click();
        await page.waitForTimeout(400);
      }

      // Configure Indonesian language and Ethan voice (Supertonic M3)
      const selects = await page.$$("select");
      if (selects.length >= 4) {
        await selects[1].selectOption("id");
        await page.waitForTimeout(300);
        await selects[3].selectOption("__ai_supertonic_voice__:M3");
        await page.waitForTimeout(300);
      }

      // Trigger client-side Natural AI Speech preview
      await page.evaluate(async (narrationText) => {
        const win = window as any;
        if (typeof win.playAiPreview === "function") {
          await win.playAiPreview(narrationText, "id", { voiceStyleJson: null });
        } else {
          throw new Error("window.playAiPreview not available");
        }
      }, text);

      // Retrieve audio blob
      const base64Data = await page.evaluate(async () => {
        const blob: Blob | null = (window as any)._capturedAudioBlob;
        if (!blob) return null;
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = (reader.result as string).split(",")[1];
            resolve(res);
          };
          reader.readAsDataURL(blob);
        });
      });

      if (!base64Data) {
        throw new Error("Failed to capture audio blob from UnlimitedTTS");
      }

      const audioBuffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(tempWav, audioBuffer);

      // Post-process tempo and normalize to standard MP3
      await this.postProcessAudio(tempWav, outputMp3Path);

      console.log(`[TTS] Successfully synthesized Ethan narration: ${outputMp3Path}`);
      return true;
    } catch (err) {
      console.warn("[TTS] UnlimitedTTS Ethan synthesis encountered an issue:", err);
      if (fs.existsSync(tempWav)) {
        try {
          fs.unlinkSync(tempWav);
        } catch (_) {}
      }
      return false;
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  /**
   * Resilient Fallback: Microsoft Edge Neural TTS (Indonesian Male: id-ID-ArdiNeural)
   * High-definition Neural Indonesian Male voice matching Ethan profile.
   */
  async generateEdgeTTSFallback(
    text: string,
    outputMp3Path: string
  ): Promise<boolean> {
    const tempRaw = outputMp3Path.replace(/\.mp3$/, "-raw.mp3");

    try {
      console.log(`[TTS] Using Edge Neural Male voice (id-ID-ArdiNeural) for: "${text.slice(0, 30)}..."`);
      
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
   * 1. UnlimitedTTS (Indonesian Ethan - Natural AI)
   * 2. Edge-TTS Neural Male (id-ID-ArdiNeural)
   */
  async synthesizeNarration(
    text: string,
    outputFilePath: string
  ): Promise<TTSResult> {
    const dir = path.dirname(outputFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 1. Try UnlimitedTTS Ethan
    const ethanSuccess = await this.generateUnlimitedTTSEthan(text, outputFilePath);
    if (ethanSuccess && fs.existsSync(outputFilePath) && fs.statSync(outputFilePath).size > 2000) {
      const durationMs = await this.getAudioDurationMs(outputFilePath);
      return {
        filePath: outputFilePath,
        durationMs,
        engineUsed: "unlimitedtts-ethan",
      };
    }

    // 2. Fallback to Microsoft Edge Neural Male voice (id-ID-ArdiNeural)
    console.log(`[TTS] UnlimitedTTS Ethan unavailable; engaging Edge Neural Male Voice...`);
    const fallbackOk = await this.generateEdgeTTSFallback(text, outputFilePath);
    if (!fallbackOk || !fs.existsSync(outputFilePath)) {
      throw new Error(`Failed to synthesize speech for: "${text}" across all engines.`);
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
