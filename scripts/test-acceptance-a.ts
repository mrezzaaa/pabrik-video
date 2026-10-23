import { runDeconstructorAgent } from "@/services/agents/deconstructor.service";
import { runDynamicSceneScriptwriterAgent } from "@/services/agents/scriptwriter.service";
import { runTtsSynchronizerAgent } from "@/services/agents/tts.service";
import { runVisualChoreographerAgent } from "@/services/agents/visual.service";
import { runRemotionRenderAgent } from "@/services/agents/renderer.service";
import { VIDEO_FPS, VIDEO_WIDTH, VIDEO_HEIGHT } from "@/remotion/constants";

async function main() {
  const topic = "Kenapa air di tumbler suhunya bisa awet 24 jam?";
  const jobId = `test-tumbler-${Date.now().toString(36)}`;

  console.log(`\n======================================================`);
  console.log(`🚀 RUNNING ACCEPTANCE TEST A`);
  console.log(`   Topic: "${topic}"`);
  console.log(`   JobId: ${jobId}`);
  console.log(`   Target: 1080x1920 @ ${VIDEO_FPS}fps`);
  console.log(`======================================================\n`);

  // 1. Agent 1: Deconstructor & Technical Research
  console.log(`▶️ [1/5] Agent 1: Researching & Deconstructing topic...`);
  const { blueprint, modelUsed: m1 } = await runDeconstructorAgent(topic);
  console.log(`   ✅ Deconstructed (${m1}): Archetype=${blueprint.suggestedArchetype}`);
  console.log(`      Components:`, blueprint.components.map((c) => c.name));

  // 2. Agent 2: Dynamic Scriptwriter
  console.log(`\n▶️ [2/5] Agent 2: Generating 6-8 dynamic scenes & telemetry...`);
  const { scenes, script, modelUsed: m2 } = await runDynamicSceneScriptwriterAgent({
    topic,
    blueprint,
  });
  console.log(`   ✅ Generated (${m2}): ${scenes.length} dynamic scenes`);

  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    console.log(`      Scene ${i + 1}: "${s.title}"`);
    console.log(`         VO: "${s.vo_text}"`);
    console.log(`         Telemetry:`, s.telemetry.channels.map((c) => `${c.label} (${c.start}->${c.end}${c.unit})`).join(", "), `| Badge: [${s.telemetry.badge.text}]`);
    console.log(`         Popups:`, s.visual.popup_labels.map((p) => p.text).join(", "));
  }

  // Check acceptance criteria for topic tumbler:
  const allPopups = scenes.flatMap((s) => s.visual.popup_labels.map((p) => p.text.toUpperCase())).join(" ");
  const allTelemetry = scenes.flatMap((s) => s.telemetry.channels.map((c) => c.label.toUpperCase())).join(" ");
  const allVO = scenes.map((s) => s.vo_text.toUpperCase()).join(" ");

  if (allPopups.includes("DURI") || allVO.includes("DURI") || allPopups.includes("PRESTO") || allVO.includes("PRESTO")) {
    throw new Error("❌ FAILED ACCEPTANCE: Found hardcoded 'DURI' or 'PRESTO' in tumbler output!");
  }
  console.log(`\n   🔍 Verification: Zero 'DURI' / 'PRESTO' found in blueprint.`);

  // 3. Agent 3: TTS Synchronization
  console.log(`\n▶️ [3/5] Agent 3: Synthesizing UnlimitedTTS & trimming silence...`);
  const { ttsOutput, updatedScenes } = await runTtsSynchronizerAgent({
    jobId,
    script,
    dynamicScenes: scenes,
    onSegmentProgress: async (idx, total, audioUrl, dur) => {
      console.log(`      Audio ${idx}/${total}: ${dur.toFixed(2)}s (${audioUrl})`);
    },
  });
  console.log(`   ✅ Audio timing synced: ${ttsOutput.totalDurationInSeconds}s (${ttsOutput.totalDurationInFrames} frames @ ${VIDEO_FPS}fps)`);

  const activeScenes = updatedScenes || scenes;

  // 4. Agent 4: Visual Choreographer
  console.log(`\n▶️ [4/5] Agent 4: Choreographing Three.js 3D isometric cutaway...`);
  const compositionProps = await runVisualChoreographerAgent({
    jobId,
    blueprint,
    script,
    tts: ttsOutput,
    dynamicScenes: activeScenes,
    aspectRatioMode: "SHORTS_9_16",
  });
  console.log(`   ✅ Visual props ready: ${compositionProps.scenes?.length} scenes, total ${compositionProps.durationInFrames} frames`);

  // 5. Agent 5: Remotion Render
  console.log(`\n▶️ [5/5] Agent 5: Rendering final 1080x1920 @ ${VIDEO_FPS}fps MP4 via Remotion...`);
  const { outputMp4Url, outputFilePath } = await runRemotionRenderAgent({
    jobId,
    compositionProps,
    onProgress: async (pct) => {
      process.stdout.write(`   Rendering: ${pct}%\r`);
    },
  });

  console.log(`\n\n🎉 ACCEPTANCE TEST A COMPLETED SUCCESSFULLY!`);
  console.log(`   Output MP4 URL: ${outputMp4Url}`);
  console.log(`   File Path: ${outputFilePath}`);
}

main().catch((err) => {
  console.error("❌ Acceptance Test A Failed:", err);
  process.exit(1);
});
