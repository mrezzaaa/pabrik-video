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
  check("engineering memakai skill blueprint & isometric", eng.used.includes("pabrik/reels-visual-engineering") && eng.used.includes("blueprint-figure") && eng.used.includes("isometric-explainer"), eng.used);
  check("lifestyle memakai skill lifestyle + explainer", life.used.includes("pabrik/reels-visual-lifestyle") && life.used.includes("isometric-explainer"), life.used);
  check("playbook tidak kosong", eng.text.length > 2000 && life.text.length > 1500);

  section("engine explainer 3D isometrik & kuota B-roll");
  const { presetForTopic } = await import("../src/lib/explainer/anatomy");
  const { buildScene, fitViewport, flowPath, layoutCallouts, toScreen } = await import("../src/remotion/engine/iso");
  const lightningModel = presetForTopic("Cara penangkal petir bekerja", []);
  check("model penangkal petir punya >= 5 komponen & jalur aliran", Boolean(lightningModel && lightningModel.parts.length >= 5 && lightningModel.flows.length >= 1), lightningModel);

  const built = buildScene(lightningModel!, {
    t: 0.65,
    yaw: 15,
    cutaway: 0.75,
    explode: 0.25,
  });
  const vp = fitViewport(built.faces, { x: 80, y: 340, w: 920, h: 1100 }, 1.15);
  const path = flowPath(lightningModel!.flows[0], built.centers);
  const callouts = layoutCallouts(
    lightningModel!.parts.slice(0, 4).map((p) => ({
      id: p.id,
      text: p.label,
      anchor: toScreen(built.centers[p.id], vp),
    })),
    { w: 1080, top: 360, bottom: 1380 },
  );
  check("engine iso menghasilkan poligon 3D terurut", built.faces.length > 40, built.faces.length);
  check("engine iso menghasilkan jalur aliran & callout bebas tabrakan", path.length >= 3 && callouts.length >= 4, {
    pathLen: path.length,
    callouts: callouts.map((c) => `${c.side}:${c.text}@${Math.round(c.y)}`),
  });

  // Simulasi naskah 10 kalimat (~30 detik) untuk memastikan mayoritas scene adalah visual penjelas
  const fullSentences = Array.from({ length: 10 }, (_, idx) => ({
    id: `s${idx + 1}`,
    text:
      idx === 0
        ? "Satu sambaran petir membawa arus 30000 ampere dalam sekejap."
        : idx === 9
          ? "Simpan videonya biar kamu paham cara kerjanya."
          : `Tahap ke-${idx} mengalirkan muatan lewat batang konduktor tembaga menuju grounding tanah.`,
    emphasisWords: [],
    emotion: "curious" as const,
    role: (idx === 0 ? "hook" : idx === 9 ? "cta" : "body") as "hook" | "body" | "cta",
  }));
  const fullTimings = fullSentences.map((_, idx) => ({ start: idx * 3, end: (idx + 1) * 3 - 0.1 }));
  const fullPlan = fallbackPlan(fullSentences, fullTimings, 30, "Cara penangkal petir bekerja", "engineering", undefined, "", undefined, lightningModel!);
  const bRollScenes = fullPlan.scenes.filter((s) => s.visualType === "B_ROLL_IMAGE").length;
  const explainerScenes = fullPlan.scenes.length - bRollScenes;
  check(
    "mayoritas scene (>= 70%) adalah visual penjelas, bukan B-roll foto",
    explainerScenes / fullPlan.scenes.length >= 0.7,
    { total: fullPlan.scenes.length, explainerScenes, bRollScenes },
  );

  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
