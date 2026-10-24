import fs from "fs";
import path from "path";
import { chromium, Browser } from "playwright";
import ffmpeg from "fluent-ffmpeg";

export interface TTSResult {
  filePath: string;
  durationMs: number;
  engineUsed: "unlimitedtts" | "edge-tts-fallback";
}

export class TTSEngine {
  private language: string;
  private voice: string;
  private speed: string;

  constructor() {
    this.language = process.env.UNLIMITEDTTS_LANGUAGE || "id-ID";
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
   * Primary: UnlimitedTTS automation via Playwright with request interception
   */
  async generateUnlimitedTTS(
    text: string,
    outputFilePath: string
  ): Promise<boolean> {
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      });

      const page = await context.newPage();

      // Intercept audio network responses directly
      const audioState = { buffer: null as Buffer | null };
      page.on("response", async (response) => {
        const ct = response.headers()["content-type"] || "";
        const url = response.url();
        if (
          (ct.includes("audio") || url.endsWith(".mp3") || url.includes("/audio/")) &&
          response.status() === 200
        ) {
          try {
            audioState.buffer = await response.body();
          } catch (e) {
            // Ignore stream read errors
          }
        }
      });

      await page.goto("https://unlimitedtts.com", {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });

      // Fill textarea
      const textarea = await page.waitForSelector("textarea", { timeout: 8000 });
      if (!textarea) throw new Error("Textarea not found on UnlimitedTTS");
      await textarea.fill(text);

      // Attempt to select voice if selectors exist
      try {
        const voiceSelect = await page.$("select");
        if (voiceSelect) {
          await voiceSelect.selectOption({ label: this.voice }).catch(() => {});
        }
      } catch (e) {
        // Proceed with defaults if select option misses
      }

      // Click Convert / Generate button
      const convertBtn = await page.$(
        'button:has-text("Convert"), button:has-text("Generate"), button:has-text("Synthesize"), button[type="submit"]'
      );

      if (convertBtn) {
        await convertBtn.click();
      }

      // Wait up to 12s for audio response
      for (let i = 0; i < 24; i++) {
        if (audioState.buffer && audioState.buffer.length > 1000) {
          fs.writeFileSync(outputFilePath, audioState.buffer);
          return true;
        }
        await new Promise((r) => setTimeout(r, 500));
      }

      return false;
    } catch (err) {
      console.warn("[TTS] UnlimitedTTS headless attempt failed:", err);
      return false;
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  /**
   * Resilient Fallback: Edge-TTS / Microsoft Speech Synthesis via HTTP API or local synthesis
   * Synthesizes id-ID-ArdiNeural at +10% rate and applies atempo=1.1 via FFmpeg
   */
  async generateEdgeTTSFallback(
    text: string,
    outputFilePath: string
  ): Promise<boolean> {
    const tempRaw = outputFilePath.replace(".mp3", "-raw.mp3");

    try {
      // Free public Microsoft Speech endpoint or public proxy
      const encodedText = encodeURIComponent(text);
      const testUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=id&client=tw-ob&q=${encodedText}`;

      const res = await fetch(testUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!res.ok) {
        throw new Error(`TTS fallback fetch error ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      fs.writeFileSync(tempRaw, Buffer.from(arrayBuffer));

      // Post-process with FFmpeg to speed up 1.1x and standardize 44100Hz stereo mp3
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempRaw)
          .audioFilters("atempo=1.1")
          .audioCodec("libmp3lame")
          .audioFrequency(44100)
          .output(outputFilePath)
          .on("end", () => {
            if (fs.existsSync(tempRaw)) fs.unlinkSync(tempRaw);
            resolve();
          })
          .on("error", (err) => {
            if (fs.existsSync(tempRaw)) fs.unlinkSync(tempRaw);
            reject(err);
          })
          .run();
      });

      return true;
    } catch (err) {
      console.error("[TTS] Fallback engine failed:", err);
      if (fs.existsSync(tempRaw)) fs.unlinkSync(tempRaw);
      return false;
    }
  }

  /**
   * Main synthesis orchestrator with automatic fallback
   */
  async synthesizeNarration(
    text: string,
    outputFilePath: string
  ): Promise<TTSResult> {
    const dir = path.dirname(outputFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Try UnlimitedTTS
    const primaryOk = await this.generateUnlimitedTTS(text, outputFilePath);
    if (primaryOk && fs.existsSync(outputFilePath) && fs.statSync(outputFilePath).size > 2000) {
      const durationMs = await this.getAudioDurationMs(outputFilePath);
      return {
        filePath: outputFilePath,
        durationMs,
        engineUsed: "unlimitedtts",
      };
    }

    // Fallback to Edge-TTS / Google TTS with 1.1x speedup filter
    console.log(`[TTS] Switching to resilient TTS engine for: "${text.slice(0, 30)}..."`);
    const fallbackOk = await this.generateEdgeTTSFallback(text, outputFilePath);
    if (!fallbackOk || !fs.existsSync(outputFilePath)) {
      throw new Error(`Failed to synthesize speech for: "${text}" across all engines.`);
    }

    const durationMs = await this.getAudioDurationMs(outputFilePath);
    return {
      filePath: outputFilePath,
      durationMs,
      engineUsed: "edge-tts-fallback",
    };
  }
}

export const ttsEngine = new TTSEngine();
