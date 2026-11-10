/**
 * Cek cepat: skill apa saja yang terbaca dan seberapa besar playbook tiap peran.
 *   npm run skills:check
 *   npm run skills:check -- engineering motion-figure
 */
import { buildPlaybook, type SkillRole } from "../src/lib/skills/playbook";
import { listSkills } from "../src/lib/skills/registry";
import type { TopicStyle } from "../src/lib/types";

async function main() {
  const [styleArg, ...extra] = process.argv.slice(2);
  const style = (["engineering", "factcheck", "lifestyle"].includes(styleArg)
    ? styleArg
    : "factcheck") as TopicStyle;

  const catalog = await listSkills();
  console.log(`Skill terbaca: ${catalog.length}`);
  console.log(`Skill pabrik : ${catalog.filter((s) => s.id.startsWith("pabrik/")).map((s) => s.id).join(", ")}`);
  console.log(`\nGaya: ${style}  extra: ${extra.join(", ") || "-"}\n`);

  const roles: SkillRole[] = ["hook", "narration", "cta", "grounding", "visual", "critic"];
  for (const role of roles) {
    const playbook = await buildPlaybook(role, style, extra);
    console.log(
      `${role.padEnd(10)} ${String(playbook.text.length).padStart(6)} char  skill: ${playbook.used.join(", ") || "(kosong!)"}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
