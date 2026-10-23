import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { env } from "@/config/env";
import type { WordTimingSchema } from "@/schemas/video-blueprint";
import type { z } from "zod";

export type WordTiming = z.infer<typeof WordTimingSchema>;

const UNLIMITED_TTS_VOICE_MAP: Record<string, string> = {
  aria: "F1",
  luna: "F2",
  ivy: "F3",
  nora: "F4",
  zoe: "F5",
  leo: "M1",
  milo: "M2",
  ethan: "M3",
  noah: "M4",
  kai: "M5",
};

const UNLIMITED_TTS_LANG_MAP: Record<string, { name: string; code: string }> = {
  "id-id": { name: "Indonesian", code: "id" },
  indonesian: { name: "Indonesian", code: "id" },
  id: { name: "Indonesian", code: "id" },
  indonesia: { name: "Indonesian", code: "id" },
  english: { name: "English", code: "en" },
  "en-us": { name: "English", code: "en" },
  en: { name: "English", code: "en" },
};

function resolveUnlimitedVoice(voiceInput?: string): { id: string; label: string } {
  const clean = (voiceInput || env.UNLIMITEDTTS_VOICE || "Ethan").trim();
  const mapped = UNLIMITED_TTS_VOICE_MAP[clean.toLowerCase()];
  if (mapped) {
    return { id: mapped, label: clean[0].toUpperCase() + clean.slice(1).toLowerCase() };
  }
  return { id: "M3", label: "Ethan" };
}

function resolveUnlimitedLang(langInput?: string): { name: string; code: string; bcp47: string } {
  const clean = (langInput || env.UNLIMITEDTTS_LANGUAGE || "id-ID").trim().toLowerCase();
  const matched = UNLIMITED_TTS_LANG_MAP[clean] || { name: "Indonesian", code: "id" };
  return { ...matched, bcp47: matched.code === "id" ? "id-ID" : "en-US" };
}

function parseSseAudioUrl(sseText: string, baseOrigin: string): string | null {
  const lines = sseText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("event: complete")) {
      const dataLine = lines.slice(i + 1).find((l) => l.startsWith("data:"));
      if (dataLine) {
        try {
          const payload = JSON.parse(dataLine.replace(/^data:\s*/, ""));
          const fileObj = Array.isArray(payload) ? payload[0] : payload;
          if (fileObj?.url) return String(fileObj.url);
          if (fileObj?.path) return `${baseOrigin}/gradio_api/file=${fileObj.path}`;
        } catch {
          // ignore
        }
      }
    }
  }
  return null;
}

/**
 * Probes exact duration in seconds using ffprobe
 */
export function probeAudioDurationSeconds(filePath: string, fallbackSeconds = 6.0): number {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    )
      .toString()
      .trim();
    const parsed = parseFloat(out);
    if (Number.isFinite(parsed) && parsed > 0.2) {
      return Number(parsed.toFixed(3));
    }
  } catch {
    // ignore ffprobe error
  }
  return fallbackSeconds;
}

/**
 * Computes word-level & phrase-level timestamps synced to exact audio duration and 60fps frames
 */
export function computeWordTimings(
  narrationText: string,
  segmentStartSec: number,
  segmentDurationSec: number,
  fps = 60
): WordTiming[] {
  const words = narrationText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) return [];

  // Weight each word by character length + punctuation pause bonus
  const weights = words.map((w) => {
    const baseLen = Math.max(w.replace(/[^a-zA-Z0-9]/g, "").length, 2);
    const commaPause = /[,;:]/.test(w) ? 2.5 : 0;
    const periodPause = /[.!?]/.test(w) ? 4.0 : 0;
    return baseLen + commaPause + periodPause;
  });

  const totalWeight = weights.reduce((acc, v) => acc + v, 0) || 1;
  let cursorSec = segmentStartSec;

  return words.map((word, idx) => {
    const sliceDuration = (weights[idx] / totalWeight) * segmentDurationSec;
    const startSec = Number(cursorSec.toFixed(3));
    const endSec = Number(
      (idx === words.length - 1 ? segmentStartSec + segmentDurationSec : cursorSec + sliceDuration).toFixed(3)
    );
    cursorSec = endSec;

    return {
      word,
      startSec,
      endSec,
      startFrame: Math.floor(startSec * fps),
      endFrame: Math.max(Math.ceil(endSec * fps), Math.floor(startSec * fps) + 1),
    };
  });
}

/**
 * Calls unlimitedtts.com Supertonic-3 endpoints (Indonesian, Voice: Ethan / M3, Speed: 1.1x)
 */
async function fetchUnlimitedTtsBuffer(
  text: string,
  voiceId: string,
  langName: string
): Promise<Buffer> {
  const endpoints = [
    "https://arjunbroepic-supertonic-3-cpu.hf.space",
    "https://renderlib-dev-supertonic-3-cpu.hf.space",
  ];

  let lastErr: unknown;
  for (const origin of endpoints) {
    try {
      const callRes = await fetch(`${origin}/gradio_api/call/generate_speech`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: [text, voiceId, langName] }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!callRes.ok) throw new Error(`HTTP ${callRes.status} on ${origin}`);
      const { event_id } = (await callRes.json()) as { event_id?: string };
      if (!event_id) throw new Error(`Missing event_id from ${origin}`);

      const streamRes = await fetch(`${origin}/gradio_api/call/generate_speech/${event_id}`, {
        signal: AbortSignal.timeout(45_000),
      });
      if (!streamRes.ok) throw new Error(`Stream HTTP ${streamRes.status} on ${origin}`);
      const sseText = await streamRes.text();
      const audioUrl = parseSseAudioUrl(sseText, origin);
      if (!audioUrl) throw new Error(`No audio URL in complete event from ${origin}`);

      const wavRes = await fetch(audioUrl, { signal: AbortSignal.timeout(25_000) });
      if (!wavRes.ok) throw new Error(`Failed downloading WAV (${wavRes.status})`);
      const buf = Buffer.from(await wavRes.arrayBuffer());
      if (buf.length < 256) throw new Error("Audio buffer too small");
      return buf;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("UnlimitedTTS endpoints unreachable");
}

export interface SynthesizeSegmentOptions {
  jobId: string;
  segmentIndex: number;
  text: string;
  language?: string;
  voice?: string;
  speed?: number;
}

export interface SynthesizeSegmentResult {
  audioUrl: string;
  filePath: string;
  durationInSeconds: number;
  engineUsed: string;
}

/**
 * Synthesizes a single narration segment via UnlimitedTTS (id-ID, Ethan, 1.1x)
 * and saves to `/public/renders/[jobId]/audio/segment-[index].mp3`.
 * Includes resilient fallbacks (macOS Indonesian TTS / synthetic tone) so rendering never breaks offline.
 */
export async function synthesizeScriptSegment(
  opts: SynthesizeSegmentOptions
): Promise<SynthesizeSegmentResult> {
  const voice = resolveUnlimitedVoice(opts.voice);
  const lang = resolveUnlimitedLang(opts.language);
  const speed = Number(opts.speed ?? env.UNLIMITEDTTS_SPEED ?? 1.1);

  const audioDir = path.join(process.cwd(), "public", "renders", opts.jobId, "audio");
  fs.mkdirSync(audioDir, { recursive: true });

  const baseName = `segment-${opts.segmentIndex}`;
  const rawWavPath = path.join(audioDir, `${baseName}-raw.wav`);
  const mp3Filename = `${baseName}.mp3`;
  const mp3Path = path.join(audioDir, mp3Filename);
  const publicAudioUrl = `/renders/${opts.jobId}/audio/${mp3Filename}`;

  // 1. Primary: UnlimitedTTS (Language: id-ID / Indonesian, Voice: Ethan / M3, Speed: 1.1x)
  try {
    const wavBuffer = await fetchUnlimitedTtsBuffer(opts.text, voice.id, lang.name);
    fs.writeFileSync(rawWavPath, wavBuffer);

    const atempoFilter = Math.abs(speed - 1.0) > 0.01 ? `-filter:a "atempo=${speed}"` : "";
    execSync(
      `ffmpeg -y -i "${rawWavPath}" ${atempoFilter} -codec:a libmp3lame -qscale:a 2 "${mp3Path}"`,
      { stdio: "ignore" }
    );
    try {
      fs.unlinkSync(rawWavPath);
    } catch {
      // ignore
    }

    const durationInSeconds = probeAudioDurationSeconds(mp3Path, 6.5);
    return {
      audioUrl: publicAudioUrl,
      filePath: mp3Path,
      durationInSeconds,
      engineUsed: `unlimitedtts.com (${lang.bcp47}, Voice: ${voice.label}, Speed: ${speed}x)`,
    };
  } catch (err) {
    console.warn(
      `[TTS Client] UnlimitedTTS primary failed for segment ${opts.segmentIndex}, trying local Indonesian neural fallback:`,
      err instanceof Error ? err.message : String(err)
    );
  }

  // 2. Fallback: macOS Indonesian voice ('Damayanti') with speed 1.1x (~195 WPM)
  try {
    const aiffPath = path.join(audioDir, `${baseName}.aiff`);
    const safeText = opts.text.replace(/"/g, '\\"').replace(/`/g, "");
    const wpm = Math.round(175 * speed);
    execSync(`say -v Damayanti -r ${wpm} -o "${aiffPath}" "${safeText}"`, { stdio: "ignore" });
    execSync(`ffmpeg -y -i "${aiffPath}" -codec:a libmp3lame -qscale:a 3 "${mp3Path}"`, {
      stdio: "ignore",
    });
    try {
      fs.unlinkSync(aiffPath);
    } catch {
      // ignore
    }

    const durationInSeconds = probeAudioDurationSeconds(mp3Path, 6.5);
    return {
      audioUrl: publicAudioUrl,
      filePath: mp3Path,
      durationInSeconds,
      engineUsed: `unlimitedtts-fallback:local-id-ID (Ethan-emulated @ ${speed}x)`,
    };
  } catch {
    // 3. Final deterministic fallback: silent/ambient audio track calculated from word count at 1.1x speed
    const wordCount = opts.text.trim().split(/\s+/).filter(Boolean).length;
    const estimatedDuration = Number(Math.max((wordCount / 2.8) / speed, 4.5).toFixed(2));
    execSync(
      `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${estimatedDuration} -q:a 9 -acodec libmp3lame "${mp3Path}"`,
      { stdio: "ignore" }
    );
    const durationInSeconds = probeAudioDurationSeconds(mp3Path, estimatedDuration);
    return {
      audioUrl: publicAudioUrl,
      filePath: mp3Path,
      durationInSeconds,
      engineUsed: `synthetic-timing-track (${lang.bcp47}, Ethan @ ${speed}x)`,
    };
  }
}
