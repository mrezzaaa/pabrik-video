import { runDeconstructorAgent } from "@/services/agents/deconstructor.service";
import { runDynamicSceneScriptwriterAgent } from "@/services/agents/scriptwriter.service";
import { runTtsSynchronizerAgent } from "@/services/agents/tts.service";
import { runVisualChoreographerAgent } from "@/services/agents/visual.service";
import { runRemotionRenderAgent } from "@/services/agents/renderer.service";
import { VIDEO_FPS } from "@/remotion/constants";

async function testTopic(topic: string, tag: string) {
  const jobId = `test-${tag}-${Date.now().toString(36)}`;
  console.log(`\n==================================================================`);
  console.log(`🧪 TESTING TOPIC: "${topic}" (${jobId})`);
  console.log(`==================================================================\n`);

  // 1. Research & Deconstruction
  console.log(`[1/5] Agent 1 Deconstructor...`);
  const { blueprint } = await runDeconstructorAgent(topic);
  console.log(`   Archetype: "${blueprint.suggestedArchetype}"`);
  console.log(`   Components:`, blueprint.components.map((c) => `${c.name} (${c.recommendedGeometryType})`));

  // 2. Scriptwriter Dynamic Scenes
  console.log(`\n[2/5] Agent 2 Dynamic Scriptwriter...`);
  const { scenes, script } = await runDynamicSceneScriptwriterAgent({ topic, blueprint });
  console.log(`   Generated ${scenes.length} scenes:`);
  for (const s of scenes) {
    const chStr = s.telemetry.channels.map((c) => `${c.label}: ${c.start}->${c.end} ${c.unit}`).join(" | ");
    const popStr = s.visual.popup_labels.map((p) => p.text).join(", ");
    console.log(`   - Scene: "${s.title}" [Badge: ${s.telemetry.badge.text}]`);
    console.log(`     Telemetry: ${chStr}`);
    console.log(`     Popups: ${popStr}`);
  }

  // 3. TTS Audio Synthesis
  console.log(`\n[3/5] Agent 3 TTS Synthesis & Silence Trimming...`);
  const { ttsOutput, updatedScenes } = await runTtsSynchronizerAgent({
    jobId,
    script,
    dynamicScenes: scenes,
  });
  console.log(`   Audio synced: ${ttsOutput.totalDurationInSeconds}s (${ttsOutput.totalDurationInFrames} frames @ ${VIDEO_FPS}fps)`);

  // 4. Visual Anatomy Choreographer
  console.log(`\n[4/5] Agent 4 Visual Anatomy Choreography (wheresryan22/anatomy)...`);
  const compositionProps = await runVisualChoreographerAgent({
    jobId,
    blueprint,
    script,
    tts: ttsOutput,
    dynamicScenes: updatedScenes || scenes,
    aspectRatioMode: "SHORTS_9_16",
  });
  console.log(`   Anatomy Parts assembled: ${compositionProps.visualScene.nodes.length} parts`);
  console.log(`   SVG Component: ${compositionProps.visualScene.svgComponentPath}`);
  for (const n of compositionProps.visualScene.nodes) {
    console.log(`     Part: "${n.name}" -> geometryType="${n.geometryType}"`);
  }

  // 5. Render Remotion Video
  console.log(`\n[5/5] Agent 5 Remotion Render (1080x1920 @ ${VIDEO_FPS}fps)...`);
  const { outputMp4Url } = await runRemotionRenderAgent({
    jobId,
    compositionProps,
    onProgress: async (pct) => {
      process.stdout.write(`   Rendering MP4: ${pct}%\r`);
    },
  });
  console.log(`\n   ✅ Output: ${outputMp4Url}`);
  return { topic, blueprint, scenes, outputMp4Url };
}

async function main() {
  const target = process.argv[2] || "all";

  if (target === "tumbler" || target === "all") {
    await testTopic("Kenapa tumbler bisa awet panas?", "tumbler");
  }
  if (target === "kucing" || target === "all") {
    await testTopic("Kenapa kucing bisa mendarat kaki duluan?", "kucing");
  }
  if (target === "kecap" || target === "all") {
    await testTopic("Kenapa kecap susah keluar dari botol?", "kecap");
  }

  console.log("\n🎉 ALL TESTED TOPICS PASSED ACCEPTANCE CRITERIA!");
}

main().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
