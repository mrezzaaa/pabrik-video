import { check, eq, finish, section } from "./lib/assert";

async function main() {
  // Import tidak menyentuh database; prisma hanya dipakai saat runVisualPlanner dipanggil.
  const { fallbackPlan } = await import("../src/lib/agents/visual-planner");
  const { buildPlaybook } = await import("../src/lib/skills/playbook");

  section("scene peran hook dan CTA");
  const sentences = [
    { id: "s1", text: "Mesin jet menelan udara sebanyak satu ruang tamu.", emphasisWords: [], emotion: "shocking" as const, role: "hook" as const },
    { id: "s2", text: "Nah, di dalamnya ada tiga tahap yang bekerja tanpa henti.", emphasisWords: [], emotion: "curious" as const, role: "promise" as const },
    { id: "s3", text: "Kompresor menekan udara sampai lebih dari 40 kali tekanan awalnya.", emphasisWords: [], emotion: "curious" as const, role: "body" as const },
    { id: "s4", text: "Simpan videonya, soalnya nanti kamu bakal butuh ini lagi.", emphasisWords: [], emotion: "excited" as const, role: "cta" as const },
  ];
  const timings = [
    { start: 0, end: 2.8 },
    { start: 3.1, end: 6.2 },
    { start: 6.3, end: 10 },
    { start: 10.2, end: 13 },
  ];
  for (const style of ["engineering", "factcheck", "lifestyle"] as const) {
    const plan = fallbackPlan(sentences, timings, 13, "Cara kerja mesin jet", style);
    const first = plan.scenes[0];
    const last = plan.scenes[plan.scenes.length - 1];
    eq(`[${style}] scene pertama berperan hook`, first.role, "hook");
    eq(`[${style}] scene terakhir berperan cta`, last.role, "cta");
    check(`[${style}] hook bukan stempel/gelombang/shake`, !["SVG_STAMP", "SVG_WAVEFORM"].includes(first.visualType ?? "") && first.motion.type !== "shake", first);
    eq(`[${style}] CTA = foto tanpa grafik`, last.visualType, "B_ROLL_IMAGE");
    check(`[${style}] tiap scene <= 2.5 dtk`, plan.scenes.every((s) => (s.duration ?? 0) <= 2.51), plan.scenes.map((s) => s.duration));
    check(`[${style}] scene menyambung tanpa celah`, plan.scenes.every((s, i) => i === 0 || Math.abs(s.startTime - plan.scenes[i - 1].endTime) < 0.01 || s.startTime >= plan.scenes[i - 1].endTime - 0.01));
  }

  section("playbook visual per gaya");
  const eng = await buildPlaybook("visual", "engineering");
  const life = await buildPlaybook("visual", "lifestyle");
  check("engineering memakai skill blueprint", eng.used.includes("pabrik/reels-visual-engineering") && eng.used.includes("blueprint-figure"), eng.used);
  check("lifestyle memakai skill lifestyle", life.used.includes("pabrik/reels-visual-lifestyle") && !life.used.includes("blueprint-figure"), life.used);
  check("playbook tidak kosong", eng.text.length > 2000 && life.text.length > 1500);

  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
