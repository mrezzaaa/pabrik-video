import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { env } from "./env";
import { speechChunks } from "./text";

const execFileAsync = promisify(execFile);

export type SynthesisResult = {
  provider: "voicestudio" | "unlimitedtts";
  voice: string;
  bytes: number;
};

export interface VoiceStudioVoice {
  voice_id: string;
  name: string;
  language: string | null;
}

let activeVoiceStudioBaseUrl: string | null = null;

export function getCandidateVoiceStudioUrls(): string[] {
  const configured = env.voiceStudioBaseUrl;
  const urls: string[] = [];

  if (activeVoiceStudioBaseUrl) {
    urls.push(activeVoiceStudioBaseUrl);
  }

  urls.push(configured);

  if (configured.includes("host.docker.internal")) {
    urls.push(configured.replace("host.docker.internal", "127.0.0.1"));
    urls.push(configured.replace("host.docker.internal", "localhost"));
  } else if (
    configured.includes("localhost") ||
    configured.includes("127.0.0.1")
  ) {
    urls.push(
      configured.replace(/localhost|127\.0\.0\.1/, "host.docker.internal"),
    );
  }

  return [...new Set(urls)];
}

export async function listVoiceStudioVoices(): Promise<VoiceStudioVoice[]> {
  const candidateUrls = getCandidateVoiceStudioUrls();
  let lastError: unknown;

  for (const baseUrl of candidateUrls) {
    try {
      const response = await fetch(`${baseUrl}/audio/voices`, {
        headers: {
          ...(env.voiceStudioApiKey
            ? { Authorization: `Bearer ${env.voiceStudioApiKey}` }
            : {}),
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      activeVoiceStudioBaseUrl = baseUrl;
      if (Array.isArray(data.voices)) {
        return data.voices.map(
          (v: { voice_id: string; name: string; language?: string | null }) => ({
            voice_id: v.voice_id,
            name: v.name,
            language: v.language ?? null,
          }),
        );
      }
      return [];
    } catch (error) {
      lastError = error;
    }
  }

  console.warn("[tts] Gagal mengambil daftar suara VoiceStudio:", lastError);
  return [];
}

async function synthesizeWithVoiceStudio(
  text: string,
  outputPath: string,
  voiceOverride?: string | null,
) {
  const candidateUrls = getCandidateVoiceStudioUrls();
  const voice = voiceOverride?.trim() || env.voiceDefaultId;
  let lastError: unknown;

  for (const baseUrl of candidateUrls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300_000);

    try {
      const response = await fetch(`${baseUrl}/audio/speech`, {
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
          voice,
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
      activeVoiceStudioBaseUrl = baseUrl;
      return buffer.byteLength;
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
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
  options?: { voice?: string | null },
): Promise<SynthesisResult> {
  if (!text.trim()) throw new Error("Teks TTS kosong.");

  const voice = options?.voice?.trim() || env.voiceDefaultId;
  let primaryError: unknown;
  try {
    const bytes = await synthesizeWithVoiceStudio(text, outputPath, voice);
    return { provider: "voicestudio", voice, bytes };
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

const CHUNK_GAP_SECONDS = 0.12;

async function encodeWav(input: string, output: string) {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    input,
    "-ar",
    "44100",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    output,
  ]);
}

/**
 * Synthesize complete clauses/full sentences separately, then concatenate with
 * a short natural gap. This prevents mid-word splicing (the old pipeline fed
 * short per-scene fragments to the engine and clipped plosives at 00:25).
 *
 * All chunks use the same provider so the voice never changes mid-video.
 */
export async function synthesizeChunkedToFile(
  text: string,
  outputPath: string,
  maxChars = 2500,
  options?: { voice?: string | null },
): Promise<SynthesisResult & { chunks: number }> {
  const chunks = speechChunks(text, maxChars);
  if (chunks.length <= 1) {
    const result = await synthesizeToFile(chunks[0] ?? text, outputPath, options);
    return { ...result, chunks: 1 };
  }

  const workDir = path.join(
    path.dirname(outputPath),
    `.tts-chunks-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
  );
  await fs.mkdir(workDir, { recursive: true });

  const chosenVoice = options?.voice?.trim() || env.voiceDefaultId;

  try {
    const files: string[] = [];
    let provider: SynthesisResult["provider"] = "voicestudio";
    let voice = chosenVoice;

    for (let index = 0; index < chunks.length; index += 1) {
      const chunkPath = path.join(
        workDir,
        `chunk-${String(index).padStart(2, "0")}.mp3`,
      );

      if (index === 0) {
        try {
          await synthesizeWithVoiceStudio(chunks[index], chunkPath, chosenVoice);
          provider = "voicestudio";
          voice = chosenVoice;
        } catch (error) {
          console.warn(
            "[tts] VoiceStudio gagal untuk chunk pertama, memakai UnlimitedTTS untuk semua chunk:",
            error instanceof Error ? error.message : error,
          );
          await synthesizeWithUnlimitedTts(chunks[index], chunkPath);
          provider = "unlimitedtts";
          voice = resolveEdgeVoice();
        }
      } else if (provider === "voicestudio") {
        await synthesizeWithVoiceStudio(chunks[index], chunkPath, chosenVoice);
      } else {
        await synthesizeWithUnlimitedTts(chunks[index], chunkPath);
      }

      files.push(chunkPath);
    }

    const gapPath = path.join(workDir, "gap.wav");
    await execFileAsync("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=44100:cl=mono",
      "-t",
      String(CHUNK_GAP_SECONDS),
      "-c:a",
      "pcm_s16le",
      gapPath,
    ]);

    const wavs: string[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const wavPath = path.join(workDir, `chunk-${String(index).padStart(2, "0")}.wav`);
      await encodeWav(files[index], wavPath);
      wavs.push(wavPath);
    }

    const listLines: string[] = [];
    wavs.forEach((wav, index) => {
      listLines.push(`file '${wav.replace(/'/g, "'\\''")}'`);
      if (index < wavs.length - 1) {
        listLines.push(`file '${gapPath.replace(/'/g, "'\\''")}'`);
      }
    });
    const listPath = path.join(workDir, "concat.txt");
    await fs.writeFile(listPath, `${listLines.join("\n")}\n`, "utf8");

    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-c:a",
        "libmp3lame",
        "-b:a",
        "192k",
        "-ar",
        "44100",
        "-ac",
        "1",
        outputPath,
      ],
      { maxBuffer: 8 * 1024 * 1024 },
    );

    const stat = await fs.stat(outputPath);
    if (stat.size < 1_000) {
      throw new Error("Hasil konkatenasi TTS kosong.");
    }

    return { provider, voice, bytes: stat.size, chunks: chunks.length };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
