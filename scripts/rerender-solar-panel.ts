import { runDeconstructorAgent } from "../src/services/agents/deconstructor.service";
import { runScriptwriterAgent } from "../src/services/agents/scriptwriter.service";
import { runTtsSynchronizerAgent } from "../src/services/agents/tts.service";
import { runVisualChoreographerAgent } from "../src/services/agents/visual.service";
import { runRemotionRenderAgent } from "../src/services/agents/renderer.service";
import { runQaPacing } from "./qa-pacing";

async function main() {
  const topic = "Bagaimana solar panel bekerja";
  const jobId = `solar-panel-revised-${Date.now().toString(36)}`;
  console.log(`\n🚀 [RERENDER] Memulai pipeline baru untuk topik: "${topic}"`);
  console.log(`🆔 Job ID: ${jobId}\n`);

  console.log("▶️ [1/5] Agent 1: Deconstructing topic into 4-act cutaway storyboard...");
  const { blueprint } = await runDeconstructorAgent(topic);
  console.log(`   ✅ Deconstructed: ${blueprint.components.length} components, unit=${blueprint.metricUnit}`);

  console.log("\n▶️ [2/5] Agent 2: Writing conversational spoken-word script & running Jury...");
  const { script } = await runScriptwriterAgent(blueprint);
  console.log(`   ✅ Script written & evaluated by Jury!`);
  if (script.juryEvaluation) {
    console.log(`      Jury Score: ${script.juryEvaluation.score}/100 (Passed: ${script.juryEvaluation.passed})`);
    console.log(`      Spoken Flow: ${script.juryEvaluation.spokenFlowScore}, Transitions: ${script.juryEvaluation.beatTransitionScore}, Pacing: ${script.juryEvaluation.pacingScore}`);
    console.log(`      Critique: ${script.juryEvaluation.critique}`);
  }
  script.segments.forEach((s, idx) => {
    console.log(`      Beat ${idx} (${s.narrationText.split(/\s+/).filter(Boolean).length} kata): "${s.narrationText}"`);
  });

  console.log("\n▶️ [3/5] Agent 3: Synthesizing TTS with silence trimming & 0.35s breathing tail...");
  const tts = await runTtsSynchronizerAgent({
    jobId,
    script,
    onSegmentProgress: async (idx, total, url, dur) => {
      console.log(`      Synthesized segment ${idx}/${total} -> ${dur.toFixed(2)}s (${url})`);
    },
  });
  console.log(`   ✅ Audio ready: total ${tts.totalDurationInSeconds}s (${tts.totalDurationInFrames} frames)`);

  console.log("\n▶️ [4/5] Agent 4: Choreographing freeform isometric SVG & word-synced callouts...");
  const compositionProps = await runVisualChoreographerAgent({
    jobId,
    blueprint,
    script,
    tts,
    aspectRatioMode: "SHORTS_9_16",
  });
  console.log(`   ✅ Visual scene choreographed: ${compositionProps.visualScene.parts.length} vector parts, ${compositionProps.pillCallouts.length} callouts`);

  console.log("\n▶️ [5/5] Agent 5: Rendering 1080x1920 60fps MP4 via Remotion...");
  const renderResult = await runRemotionRenderAgent({
    jobId,
    compositionProps,
    onProgress: async (pct) => {
      process.stdout.write(`   Rendering: ${pct}%\r`);
    },
  });
  console.log(`\n   ✅ Render complete! Output: ${renderResult.outputFilePath}`);

  console.log("\n=======================================================");
  console.log("🔍 MENJALANKAN QA PACING PADA VIDEO BARU:");
  console.log("=======================================================\n");

  const report = runQaPacing(jobId);
  console.log("📊 ANALISIS BEAT & PACING:");
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

  console.log("\n🔇 DAFTAR SILENCE DETEKSI (noise=-35dB, d>0.15s):");
  console.table(
    report.silences.map((s) => ({
      Kategori: s.category,
      Lokasi: s.boundaryPair || `Detik ${s.start.toFixed(2)} - ${s.end.toFixed(2)}`,
      Durasi: `${s.duration.toFixed(3)}s`,
      Batas: s.category === "DALAM BEAT" ? "<= 0.35s" : "<= 0.60s",
      Status: s.isViolation ? "❌ PELANGGARAN" : "✅ LULUS",
    }))
  );

  console.log("\n📋 STATUS KELULUSAN:");
  if (report.passed) {
    console.log("🎉 SEMUA KRITERIA QA PACING LULUS TANPA PELANGGARAN!");
  } else {
    console.log(`❌ DITEMUKAN ${report.violations.length} PELANGGARAN:`);
    report.violations.forEach((v, idx) => console.log(`   ${idx + 1}. ${v}`));
  }
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
