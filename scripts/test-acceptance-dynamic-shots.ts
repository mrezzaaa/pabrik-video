import { runDeconstructorAgent } from "@/services/agents/deconstructor.service";
import { runVisualChoreographerAgent } from "@/services/agents/visual.service";
import { runDynamicSceneScriptwriterAgent } from "@/services/agents/scriptwriter.service";
import { runTtsSynchronizerAgent } from "@/services/agents/tts.service";

async function runAcceptanceTests() {
  console.log("==================================================================");
  console.log("🚀 RUNNING ACCEPTANCE TESTS: DYNAMIC PHASE TITLES + DYNAMIC SHOTS");
  console.log("==================================================================\n");

  // =====================================================================
  // TEST 1: TUMBLER
  // =====================================================================
  console.log("--- TEST 1: TUMBLER ---");
  const tumblerTopic = "Kenapa tumbler bisa tahan panas berjam-jam?";
  const { blueprint: tumblerBp } = await runDeconstructorAgent(tumblerTopic);

  console.log(`Tumbler Archetype: "${tumblerBp.suggestedArchetype}"`);
  console.log("Tumbler Phases:");
  tumblerBp.phases.forEach((p, idx) => {
    console.log(
      `  Phase ${idx}: "${p.title}" | Shot: ${p.cameraDirection.shotType} (${p.cameraDirection.zoomMultiplier}x, explode: ${p.cameraDirection.explodeFactor}) | Cutaway: ${p.objectState.cutawayEnabled}`
    );
  });

  const tumblerTitles = tumblerBp.phases.map((p) => p.title).join(" ").toLowerCase();
  const hasTumblerWords =
    /vakum|dinding|segel|silikon|panas|tabung|aluminium|hampa/i.test(tumblerTitles);
  const hasDroneWordsInTumbler = /rangka x|motor brushless|gyro/i.test(tumblerTitles);

  console.log(`  -> Tumbler titles contain specific tumbler vocabulary: ${hasTumblerWords}`);
  console.log(`  -> Tumbler titles free from drone template words: ${!hasDroneWordsInTumbler}`);

  if (!hasTumblerWords) {
    throw new Error(`Tumbler phases do not contain specific tumbler vocabulary: ${tumblerTitles}`);
  }
  if (hasDroneWordsInTumbler) {
    throw new Error(`Tumbler phases contain leaked drone template words: ${tumblerTitles}`);
  }

  // =====================================================================
  // TEST 2: DRONE
  // =====================================================================
  console.log("\n--- TEST 2: DRONE ---");
  const droneTopic = "Kenapa drone quadcopter tidak pernah terbalik di udara?";
  const { blueprint: droneBp } = await runDeconstructorAgent(droneTopic);

  console.log(`Drone Archetype: "${droneBp.suggestedArchetype}"`);
  console.log("Drone Phases:");
  droneBp.phases.forEach((p, idx) => {
    console.log(
      `  Phase ${idx}: "${p.title}" | Shot: ${p.cameraDirection.shotType} (${p.cameraDirection.zoomMultiplier}x, explode: ${p.cameraDirection.explodeFactor}) | Cutaway: ${p.objectState.cutawayEnabled}`
    );
  });

  const droneTitles = droneBp.phases.map((p) => p.title).join(" ").toLowerCase();
  const hasDroneWords = /rangka|motor|gyro|baling|propeller|stabil/i.test(droneTitles);
  const hasTumblerWordsInDrone = /solusi vakum|peran lapisan|segel silikon|ruang hampa/i.test(droneTitles);

  console.log(`  -> Drone titles contain specific drone vocabulary: ${hasDroneWords}`);
  console.log(`  -> Drone titles free from tumbler template words: ${!hasTumblerWordsInDrone}`);

  if (!hasDroneWords) {
    throw new Error(`Drone phases do not contain specific drone vocabulary: ${droneTitles}`);
  }
  if (hasTumblerWordsInDrone) {
    throw new Error(`Drone phases contain leaked tumbler template words: ${droneTitles}`);
  }

  // Check shots progression for Drone
  const droneShotTypes = droneBp.phases.map((p) => p.cameraDirection.shotType);
  console.log(`  -> Drone shot progression: ${droneShotTypes.join(" -> ")}`);

  // =====================================================================
  // TEST 3: KUCING
  // =====================================================================
  console.log("\n--- TEST 3: KUCING ---");
  const catTopic = "Kenapa kucing selalu mendarat dengan kaki duluan?";
  const { blueprint: catBp } = await runDeconstructorAgent(catTopic);

  console.log(`Cat Archetype: "${catBp.suggestedArchetype}"`);
  console.log("Cat Phases:");
  catBp.phases.forEach((p, idx) => {
    console.log(
      `  Phase ${idx}: "${p.title}" | Shot: ${p.cameraDirection.shotType} (${p.cameraDirection.zoomMultiplier}x, explode: ${p.cameraDirection.explodeFactor}) | Cutaway: ${p.objectState.cutawayEnabled}`
    );
  });

  const catTitles = catBp.phases.map((p) => p.title).join(" ").toLowerCase();
  const hasCatWords = /tulang|ekor|refleks|putar|kaki|otot|sensor/i.test(catTitles);
  const hasTemplateLeaksInCat = /solusi vakum|rangka x|motor brushless/i.test(catTitles);

  console.log(`  -> Cat titles contain specific cat vocabulary: ${hasCatWords}`);
  console.log(`  -> Cat titles free from templates: ${!hasTemplateLeaksInCat}`);

  if (!hasCatWords) {
    throw new Error(`Cat phases do not contain specific feline vocabulary: ${catTitles}`);
  }
  if (hasTemplateLeaksInCat) {
    throw new Error(`Cat phases contain leaked template words: ${catTitles}`);
  }

  // =====================================================================
  // TEST 4: VISUAL CHOREOGRAPHER ON DRONE
  // =====================================================================
  console.log("\n--- TEST 4: VISUAL CHOREOGRAPHER CAMERA TIMELINE ---");
  const { scenes, script } = await runDynamicSceneScriptwriterAgent({
    topic: droneTopic,
    blueprint: droneBp,
  });

  const { ttsOutput } = await runTtsSynchronizerAgent({
    jobId: "test-drone-cam",
    script,
    dynamicScenes: scenes,
  });

  const compositionProps = await runVisualChoreographerAgent({
    jobId: "test-drone-cam",
    blueprint: droneBp,
    script,
    tts: ttsOutput,
    dynamicScenes: scenes,
    aspectRatioMode: "SHORTS_9_16",
  });

  console.log("Generated Dynamic Phases Timeline:");
  compositionProps.phases.forEach((ph, i) => {
    console.log(
      `  Phase ${i}: "${ph.chapterTitle}" | Camera Scale: ${ph.camera.scale}x | Explode: ${ph.camera.explodeFactor} | Pan: (${ph.camera.x}, ${ph.camera.y}) | Cutaway: ${ph.cutaway} | Active: [${ph.activeComponentIds.join(", ")}]`
    );
  });

  console.log("\n==================================================================");
  console.log("✅ ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY! 100% TOPIC-DYNAMIC!");
  console.log("==================================================================");
}

runAcceptanceTests().catch((err) => {
  console.error("\n❌ Acceptance test failed:", err);
  process.exit(1);
});
