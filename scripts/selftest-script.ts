import { check, eq, finish, section } from "./lib/assert";
import { startMockLlm } from "./lib/mock-llm";

const FACTS = [
  { id: "f1", claim: "Mesin jet modern mengompres udara hingga lebih dari 40 kali tekanan awalnya.", evidence: "compress incoming air to more than 40 times its original pressure", sourceIndex: 0, kind: "number", confidence: "verified" },
  { id: "f2", claim: "Gas panas memutar turbin yang menggerakkan kompresor.", evidence: "hot gas drives the turbine which drives the compressor", sourceIndex: 0, kind: "mechanism", confidence: "verified" },
  { id: "f3", claim: "Suhu gas di ruang bakar bisa melewati 1.500 derajat Celsius.", evidence: "gas temperatures can exceed 1,500 degrees Celsius", sourceIndex: 1, kind: "number", confidence: "verified" },
] as const;

const GOOD = [
  ["hook", [], "Mesin jet menelan udara sebanyak satu ruang tamu."],
  ["promise", [], "Nah, di dalamnya ada tiga tahap yang bekerja tanpa henti, kita bongkar satu per satu."],
  ["body", ["f1"], "Pertama, kompresor menekan udara sampai lebih dari 40 kali tekanan awalnya, jadi udara padat dan siap dibakar."],
  ["body", ["f3"], "Lalu udara padat itu masuk ruang bakar, tempat gas bisa melewati 1.500 derajat Celsius."],
  ["body", ["f2"], "Gas panas itu memutar turbin, dan turbin itulah yang menggerakkan kompresor di depan."],
  ["body", [], "Jadi mesin ini seperti lingkaran yang memberi tenaga untuk dirinya sendiri."],
  ["body", [], "Sisa gas yang keluar dari belakang itulah yang mendorong pesawat maju."],
  ["payoff", [], "Makanya satu mesin sanggup menggerakkan pesawat seberat ratusan ton tanpa kehabisan napas."],
  ["payoff", [], "Semua itu berawal dari udara biasa yang ditekan, dibakar, lalu dilepas dengan cepat."],
  ["cta", [], "Bagian berikutnya kita bongkar turbinnya, ikuti biar nggak kelewat."],
] as const;

function asJson(rows: readonly (readonly [string, readonly string[], string])[]) {
  return {
    hookOnScreen: "ISI MESIN JET",
    ctaType: "follow",
    sentences: rows.map(([role, factIds, text]) => ({ text, role, factIds, emphasisWords: [], emotion: "curious" })),
  };
}

async function main() {
  let writeCalls = 0;
  let sawIssuesInRevision = false;
  const mock = await startMockLlm(({ system, user }) => {
    if (system.includes("hook writer")) {
      return JSON.stringify({
        hooks: [
          { spoken: "Tahukah kamu bagaimana mesin jet bekerja sebenarnya?", onScreen: "CARA KERJA", type: "question" },
          { spoken: "Mesin jet menelan udara sebanyak satu ruang tamu.", onScreen: "ISI MESIN JET", type: "number" },
          { spoken: "Mesin jet menekan udara sampai 9999 kali lipat setiap detik.", onScreen: "GILA", type: "number", factId: "f1" },
          { spoken: "Di dalam mesin jet ada api yang tidak pernah padam.", onScreen: "API ABADI", type: "curiosity" },
        ],
      });
    }
    if (system.includes("juri hook")) return JSON.stringify({ pick: 1, reason: "paling konkret" });
    if (system.includes("scriptwriter Reels")) {
      writeCalls += 1;
      if (user.includes("MASALAH YANG HARUS DIPERBAIKI")) {
        sawIssuesInRevision = user.includes("9000") || user.includes("angka tidak ada") || user.includes("menumpuk");
        return JSON.stringify(asJson(GOOD));
      }
      // Draft pertama sengaja bermasalah: angka karangan + CTA menumpuk.
      const bad = GOOD.map((row) => [...row]) as unknown as [string, string[], string][];
      bad[3] = ["body", ["f3"], "Lalu udara padat itu masuk ruang bakar, tempat gas bisa melewati 9000 derajat Celsius."];
      bad[9] = ["cta", [], "Jangan lupa like, komen, share, dan subscribe ya!"];
      return JSON.stringify(asJson(bad));
    }
    if (system.includes("editor naskah")) {
      return JSON.stringify({ scores: { hook: 8, flow: 8, grounding: 9, cta: 8, naturalness: 8 }, issues: [] });
    }
    return "{}";
  });
  process.env.OMNIROUTE_BASE_URL = mock.baseUrl;

  const checks = await import("../src/lib/engine/script-checks");
  const { directScript } = await import("../src/lib/engine/script-director");
  const facts = FACTS as unknown as import("../src/lib/types").FactItem[];

  section("validator hook");
  const bad = checks.checkHook({ spoken: "Tahukah kamu bagaimana mesin jet bekerja sebenarnya?", onScreen: "CARA KERJA", type: "" }, facts);
  check("hook klise ditolak", bad.some((i) => i.includes("klise")), bad);
  check("angka hook tak berdasar ditolak", checks.checkHook({ spoken: "Udara ditekan 9999 kali lipat.", onScreen: "GILA SKALA", type: "" }, facts).some((i) => i.includes("angka")));
  eq("hook bagus lolos", checks.checkHook({ spoken: "Mesin jet menelan udara sebanyak satu ruang tamu.", onScreen: "ISI MESIN JET", type: "" }, facts), []);
  check("teks layar salinan ucapan ditolak", checks.checkHook({ spoken: "Mesin jet menelan udara banyak.", onScreen: "mesin jet menelan udara", type: "" }, facts).some((i) => i.includes("menyalin")));

  section("normalizeSpeech menjaga angka");
  const { normalizeSpeech } = await import("../src/lib/text");
  eq("ribuan utuh", normalizeSpeech("Suhu 1.500 derajat,lalu 3,5 kali.Selesai"), "Suhu 1.500 derajat, lalu 3,5 kali. Selesai");

  section("validator CTA");
  eq("CTA menumpuk ditolak", checks.checkCta("Jangan lupa like, komen, share, dan subscribe ya!").length > 0, true);
  eq("CTA satu aksi lolos", checks.checkCta("Simpan videonya, soalnya nanti kamu butuh ini lagi."), []);
  eq("CTA tanya konkret lolos", checks.checkCta("Menurutmu, kamu lebih sering A atau B?"), []);
  eq("tipe CTA", checks.inferCtaType("Kirim ke temanmu yang masih percaya."), "share");

  section("director dengan LLM tiruan");
  const result = await directScript({
    topic: "Cara kerja mesin jet",
    style: "engineering",
    facts,
    uniqueAngles: [],
    controversy: "",
    extraSkills: [],
  });
  eq("hook terpilih = kandidat valid pertama (klise ditolak)", result.hook, "Mesin jet menelan udara sebanyak satu ruang tamu.");
  eq("teks layar", result.hookOnScreen, "ISI MESIN JET");
  eq("draft buruk memicu 1 putaran revisi", result.qa.rounds, 1);
  check("masalah dikirim ke revisi", sawIssuesInRevision);
  check("qa lulus", result.qa.passed, result.qa.issues);
  eq("CTA follow", result.cta.type, "follow");
  eq("peran urut", [result.sentences[0].role, result.sentences[1].role, result.sentences.at(-1)?.role], ["hook", "promise", "cta"]);
  const total = result.sentences.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
  check(`total kata ${total} dalam 90-125`, total >= 90 && total <= 125);
  check("tidak ada angka karangan", !result.sentences.some((s) => s.text.includes("9000")));
  const beats = result.sentences.map((s) => s.beat);
  check("hook dan CTA beat sendiri", beats[0] === 0 && beats.filter((b) => b === beats[0]).length === 1 && beats.filter((b) => b === beats.at(-1)).length === 1, beats);
  check("beat naik monoton", beats.every((b, i) => i === 0 || (b as number) >= (beats[i - 1] as number)));
  check("skill terpakai tercatat", (result.skillsUsed.hook ?? []).includes("pabrik/reels-hook-3s") && (result.skillsUsed.cta ?? []).includes("pabrik/reels-cta-natural"), result.skillsUsed);
  check("writeScript dipanggil 2x", writeCalls === 2, writeCalls);

  section("perbaikan deterministik");
  const { repairScript } = await import("../src/lib/engine/script-director");
  const broken = asJson(GOOD).sentences.map((s, i) => ({ id: `s${i + 1}`, text: s.text, role: s.role as never, factIds: [...s.factIds] as string[], emphasisWords: [], emotion: "curious" as const }));
  broken[3] = { ...broken[3], text: "Lalu gas melewati 9000 derajat.", factIds: ["f3"] };
  broken[9] = { ...broken[9], text: "Tolong like dan subscribe." };
  const repaired = repairScript(broken, facts, "engineering", { spoken: "Mesin jet menelan udara sebanyak satu ruang tamu.", onScreen: "ISI MESIN JET", type: "" });
  check("kalimat berangka karangan dibuang", !repaired.some((s) => s.text.includes("9000")));
  check("CTA diganti cadangan valid", checks.checkCta(repaired.at(-1)!.text).length === 0 && repaired.at(-1)!.role === "cta");

  await mock.close();
  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
