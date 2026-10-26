#!/usr/bin/env tsx
/**
 * Deconstructor CLI — verifies the universal blueprint generator without the
 * whole BullMQ/Prisma pipeline.
 *
 *   npm run worker:deconstructor -- topic="jalan tol"
 *   npm run worker:deconstructor -- topic="turbo" --script
 *   npm run worker:deconstructor -- topic="laptop" --model=zc/glm-5.3-flash
 *
 * stdout = raw validated JSON blueprint (safe to pipe into jq).
 * stderr = human summary.
 */
import "dotenv/config";
import { BlueprintSchema } from "../lib/schemas/blueprint.schema";
import { deconstructTopicToBlueprint } from "./deconstructor.worker";
import { generateScriptForBlueprint } from "./scriptwriter.worker";

function readFlag(name: string): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === `--${name}`) return args[i + 1];
    if (arg.startsWith(`--${name}=`)) return arg.slice(name.length + 3);
    if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
  }
  return undefined;
}

async function main() {
  const topic = (
    readFlag("topic") ||
    readFlag("t") ||
    process.argv.slice(2).filter((arg) => !arg.startsWith("--")).join(" ") ||
    "jalan tol"
  ).trim();

  const model = readFlag("model");
  const withScript = process.argv.includes("--script");

  console.error(`[deconstructor] topic="${topic}" model=${model || "(default)"}`);

  const blueprint = await deconstructTopicToBlueprint(topic, "", model);

  // Prove the contract holds, not just that the LLM answered.
  const validation = BlueprintSchema.safeParse(blueprint);
  if (!validation.success) {
    console.error("[deconstructor] ZOD VALIDATION FAILED:");
    console.error(JSON.stringify(validation.error.issues, null, 2));
    process.exitCode = 1;
  }

  const output: Record<string, unknown> = { ...blueprint };
  if (withScript) {
    output.script = await generateScriptForBlueprint(topic, "", blueprint, model);
  }

  console.log(JSON.stringify(output, null, 2));

  console.error(
    `[deconstructor] phases=${blueprint.phases?.length ?? 0} components=${
      blueprint.components?.length ?? 0
    } zod=${validation.success ? "PASS" : "FAIL"}`
  );
  (blueprint.phases || []).forEach((phase, index) => {
    console.error(
      `  ${index + 1}. ${phase.title} | telemetry: ${(phase.telemetryChannels || [])
        .map((channel) => channel.name)
        .join(", ")}`
    );
  });
  console.error(
    `  components: ${(blueprint.components || [])
      .map((component) => `${component.id}:${component.geometryType}/${component.style}`)
      .join(", ")}`
  );
}

main().catch((error) => {
  console.error("[deconstructor] FATAL:", error);
  process.exitCode = 1;
});
