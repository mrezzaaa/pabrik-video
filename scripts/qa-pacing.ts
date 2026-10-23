import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { chunkIntoNaturalPhrases } from "../src/remotion/components/SubtitleOverlay";
import type { RemotionCompositionProps } from "../src/schemas/video-blueprint";

interface SilenceEvent {
  start: number;
  end: number;
  duration: number;
  category: "DALAM BEAT" | "ANTAR BEAT";
  beatIndex?: number;
  boundaryPair?: string;
  isViolation: boolean;
  violationReason?: string;
}

interface BeatPacingReport {
  beatIndex: number;
  chapterTitle: string;
  durationSec: number;
  audioDurationSec: number;
  durationDiffSec: number;
  wordCount: number;
  speechDurationSec: number;
  speakingRateWordsPerSec: number;
  captionChunksCount: number;
  captionViolations: string[];
}

export function runQaPacing(targetDirOrFile: string): {
  passed: boolean;
  silences: SilenceEvent[];
  beats: BeatPacingReport[];
  violations: string[];
} {
  let videoPath = "";
  let propsPath = "";

  if (targetDirOrFile.endsWith(".mp4")) {
    videoPath = targetDirOrFile;
    const dir = path.dirname(videoPath);
    propsPath = path.join(dir, "composition-props.json");
  } else if (fs.existsSync(path.join(process.cwd(), "public", "renders", targetDirOrFile))) {
    const dir = path.join(process.cwd(), "public", "renders", targetDirOrFile);
    videoPath = path.join(dir, "output.mp4");
    propsPath = path.join(dir, "composition-props.json");
  } else if (fs.existsSync(targetDirOrFile) && fs.statSync(targetDirOrFile).isDirectory()) {
    videoPath = path.join(targetDirOrFile, "output.mp4");
    propsPath = path.join(targetDirOrFile, "composition-props.json");
  } else {
    throw new Error(`Target video or job directory not found: ${targetDirOrFile}`);
  }

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found at: ${videoPath}`);
  }
  if (!fs.existsSync(propsPath)) {
    throw new Error(`Props file not found at: ${propsPath}`);
  }

  const props: RemotionCompositionProps = JSON.parse(fs.readFileSync(propsPath, "utf8"));
  const fps = props.fps || 60;

  // 1. Run ffmpeg silencedetect (-35dB, min 0.15s)
  const cmd = `ffmpeg -i "${videoPath}" -af silencedetect=noise=-35dB:d=0.15 -f null - 2>&1`;
  const ffmpegOut = execSync(cmd).toString();

  const silenceLines = ffmpegOut
    .split("\n")
    .filter((l) => l.includes("silencedetect"));

  const rawSilences: { start: number; end: number; duration: number }[] = [];
  let currentStart: number | null = null;

  for (const line of silenceLines) {
    const startMatch = line.match(/silence_start:\s*([\d.]+)/);
    if (startMatch) {
      currentStart = parseFloat(startMatch[1]);
    }
    const endMatch = line.match(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/);
    if (endMatch && currentStart !== null) {
      const end = parseFloat(endMatch[1]);
      const duration = parseFloat(endMatch[2]);
      rawSilences.push({ start: currentStart, end, duration });
      currentStart = null;
    }
  }

  // 2. Classify silences & detect violations
  const violations: string[] = [];
  const beatBoundaries = props.phases.map((p, idx) => ({
    beatIndex: idx,
    startSec: Number((p.startFrame / fps).toFixed(3)),
    endSec: Number((p.endFrame / fps).toFixed(3)),
  }));

  const classifiedSilences: SilenceEvent[] = rawSilences.map((s) => {
    // Check if silence sits at/near a beat boundary (within 0.45s of beat transition)
    let isBoundary = false;
    let boundaryPair = "";

    for (let i = 0; i < beatBoundaries.length - 1; i++) {
      const boundarySec = beatBoundaries[i].endSec;
      if (Math.abs(s.start - boundarySec) <= 0.55 || Math.abs(s.end - boundarySec) <= 0.55) {
        isBoundary = true;
        boundaryPair = `Beat ${i} → Beat ${i + 1}`;
        break;
      }
    }

    const category: "DALAM BEAT" | "ANTAR BEAT" = isBoundary ? "ANTAR BEAT" : "DALAM BEAT";
    let isViolation = false;
    let violationReason = "";

    if (category === "DALAM BEAT") {
      if (s.duration > 0.35) {
        isViolation = true;
        violationReason = `Silence dalam beat (${s.duration.toFixed(3)}s) melebihi batas 0.35s`;
        violations.push(violationReason + ` pada ${s.start.toFixed(2)}s - ${s.end.toFixed(2)}s`);
      }
    } else {
      if (s.duration > 0.60) {
        isViolation = true;
        violationReason = `Silence antar beat (${s.duration.toFixed(3)}s di ${boundaryPair}) melebihi batas 0.60s`;
        violations.push(violationReason);
      }
    }

    return {
      ...s,
      category,
      boundaryPair: isBoundary ? boundaryPair : undefined,
      isViolation,
      violationReason: isViolation ? violationReason : undefined,
    };
  });

  // 3. Beat Pacing & Caption Chunk Analysis
  const beats: BeatPacingReport[] = props.phases.map((p, idx) => {
    const durSec = Number((p.durationInFrames / fps).toFixed(3));
    const words = p.narrationText.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Probe audio file duration if available
    let audioDurationSec = durSec;
    const audioLocalPath = path.join(process.cwd(), "public", p.audioUrl.replace(/^\/+/, ""));
    if (fs.existsSync(audioLocalPath)) {
      try {
        const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioLocalPath}"`).toString().trim();
        audioDurationSec = Number(parseFloat(out).toFixed(3));
      } catch {}
    }

    const durationDiffSec = Number(Math.abs(durSec - audioDurationSec).toFixed(3));
    if (durationDiffSec > 0.1) {
      violations.push(`Beat ${idx}: durasi beat (${durSec}s) tidak sesuai durasi audio (${audioDurationSec}s) > 0.1s`);
    }

    const speechDurationSec = Math.max(0.5, durSec - 0.35);
    const speakingRateWordsPerSec = Number((wordCount / speechDurationSec).toFixed(2));

    // Analyze caption chunks
    const captionChunks = chunkIntoNaturalPhrases(p.wordTimings, fps, 0.8, p.endFrame);
    const captionViolations: string[] = [];

    for (let cIdx = 0; cIdx < captionChunks.length; cIdx++) {
      const chunk = captionChunks[cIdx];
      const chunkDurSec = (chunk.displayEndFrame - chunk.displayStartFrame) / fps;
      const chunkWordCount = chunk.words.length;

      if (chunkDurSec < 0.78) {
        captionViolations.push(`Chunk ${cIdx} durasi ${chunkDurSec.toFixed(2)}s < 0.8s`);
      }
      if (chunkWordCount < 3 && wordCount >= 3) {
        captionViolations.push(`Chunk ${cIdx} hanya berisi ${chunkWordCount} kata ("${chunk.words.map(w => w.word).join(" ")}")`);
      }
    }

    if (captionViolations.length > 0) {
      violations.push(`Beat ${idx} caption: ${captionViolations.join("; ")}`);
    }

    return {
      beatIndex: idx,
      chapterTitle: p.chapterTitle.replace(/<[^>]+>/g, ""),
      durationSec: durSec,
      audioDurationSec,
      durationDiffSec,
      wordCount,
      speechDurationSec,
      speakingRateWordsPerSec,
      captionChunksCount: captionChunks.length,
      captionViolations,
    };
  });

  return {
    passed: violations.length === 0,
    silences: classifiedSilences,
    beats,
    violations,
  };
}

// CLI Execution
if (require.main === module) {
  const target = process.argv[2] || "job-mvky4jso-492q";
  try {
    const report = runQaPacing(target);
    console.log("\n=======================================================");
    console.log(`🎬 LAPORAN QA PACING VIDEO: ${target}`);
    console.log("=======================================================\n");

    console.log("📊 1. ANALISIS BEAT & PACING:");
    console.table(
      report.beats.map((b) => ({
        Beat: `Beat ${b.beatIndex}`,
        Durasi: `${b.durationSec}s`,
        AudioDur: `${b.audioDurationSec}s`,
        Kata: b.wordCount,
        "Tempo (kata/s)": b.speakingRateWordsPerSec,
        "Chunks Caption": b.captionChunksCount,
        Status: b.captionViolations.length === 0 && b.durationDiffSec <= 0.1 ? "✅ LULUS" : "⚠️ PERINGATAN",
      }))
    );

    console.log("\n🔇 2. DAFTAR SILENCE DETEKSI (noise=-35dB, d>0.15s):");
    console.table(
      report.silences.map((s) => ({
        Kategori: s.category,
        Lokasi: s.boundaryPair || `Detik ${s.start.toFixed(2)} - ${s.end.toFixed(2)}`,
        Durasi: `${s.duration.toFixed(3)}s`,
        Batas: s.category === "DALAM BEAT" ? "<= 0.35s" : "<= 0.60s",
        Status: s.isViolation ? "❌ PELANGGARAN" : "✅ LULUS",
      }))
    );

    console.log("\n📋 3. STATUS KELULUSAN:");
    if (report.passed) {
      console.log("🎉 SEMUA KRITERIA QA PACING LULUS TANPA PELANGGARAN!");
    } else {
      console.log(`❌ DITEMUKAN ${report.violations.length} PELANGGARAN:`);
      report.violations.forEach((v, idx) => console.log(`   ${idx + 1}. ${v}`));
    }
    console.log("\n=======================================================\n");
  } catch (err) {
    console.error("QA Pacing failed:", err);
    process.exit(1);
  }
}
