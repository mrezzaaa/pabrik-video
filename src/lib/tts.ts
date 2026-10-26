import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import { env } from "./env";

const execFileAsync = promisify(execFile);

export type SynthesisResult = {
  provider: "voicestudio" | "unlimitedtts";
  voice: string;
  bytes: number;
};

async function synthesizeWithVoiceStudio(text: string, outputPath: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300_000);

  try {
    const response = await fetch(`${env.voiceStudioBaseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.voiceStudioApiKey
          ? { Authorization: `Bearer ${env.voiceStudioApiKey}` }
          : {}),
      },
      body: JSON.stringify({
        model: env.voiceStudioModel,
        input: text,
        voice: env.voiceDefaultId,
        response_format: "mp3",
        speed: env.voiceStudioSpeed,
        language: "id-ID",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `VoiceStudio HTTP ${response.status}: ${errorBody.slice(0, 300)}`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!contentType.includes("audio") || buffer.byteLength < 1_000) {
      throw new Error(
        `VoiceStudio mengembalikan response tidak valid (${contentType || "no content-type"}, ${buffer.byteLength} bytes).`,
      );
    }

    await fs.writeFile(outputPath, buffer);
    return buffer.byteLength;
  } finally {
    clearTimeout(timeout);
  }
}

function resolveEdgeVoice() {
  const explicit = process.env.UNLIMITEDTTS_VOICE_ID;
  if (explicit) return explicit;

  const voice = env.unlimitedTtsVoice;
  if (voice.includes("-") && /Neural$/i.test(voice)) return voice;

  const language = env.unlimitedTtsLanguage.toLowerCase();
  const map: Record<string, string> = {
    "id-id": "id-ID-ArdiNeural",
    "en-us": "en-US-GuyNeural",
    "en-gb": "en-GB-RyanNeural",
    "ms-my": "ms-MY-OsmanNeural",
  };
  if (map[language]) return map[language];

  if (voice.toLowerCase() === "ethan") return "en-US-GuyNeural";
  return `${env.unlimitedTtsLanguage}-${voice}Neural`;
}

/**
 * Fallback engine. The local machine ships the `edge-tts` CLI (UnlimitedTTS
 * compatible), so we reuse it instead of hitting a paid API.
 */
async function synthesizeWithUnlimitedTts(text: string, outputPath: string) {
  const voice = resolveEdgeVoice();
  const ratePercent = Math.round((env.unlimitedTtsSpeed - 1) * 100);
  const rate = `${ratePercent >= 0 ? "+" : ""}${ratePercent}%`;

  try {
    await execFileAsync(
      "edge-tts",
      [
        "--voice",
        voice,
        `--rate=${rate}`,
        "--text",
        text,
        "--write-media",
        outputPath,
      ],
      { timeout: 300_000, maxBuffer: 4 * 1024 * 1024 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `UnlimitedTTS fallback gagal (edge-tts, voice ${voice}): ${message}`,
    );
  }

  const stat = await fs.stat(outputPath);
  if (stat.size < 1_000) {
    throw new Error("UnlimitedTTS menghasilkan file audio kosong.");
  }
  return stat.size;
}

export async function synthesizeToFile(
  text: string,
  outputPath: string,
): Promise<SynthesisResult> {
  if (!text.trim()) throw new Error("Teks TTS kosong.");

  let primaryError: unknown;
  try {
    const bytes = await synthesizeWithVoiceStudio(text, outputPath);
    return { provider: "voicestudio", voice: env.voiceDefaultId, bytes };
  } catch (error) {
    primaryError = error;
    console.warn(
      "[tts] VoiceStudio gagal, mencoba UnlimitedTTS:",
      error instanceof Error ? error.message : error,
    );
  }

  try {
    const bytes = await synthesizeWithUnlimitedTts(text, outputPath);
    return {
      provider: "unlimitedtts",
      voice: resolveEdgeVoice(),
      bytes,
    };
  } catch (fallbackError) {
    throw new Error(
      `Semua TTS gagal. VoiceStudio: ${
        primaryError instanceof Error ? primaryError.message : String(primaryError)
      } | UnlimitedTTS: ${
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError)
      }`,
    );
  }
}
