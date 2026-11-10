import { check, eq, finish, section } from "./lib/assert";
import { startMockLlm } from "./lib/mock-llm";

async function main() {
  const mock = await startMockLlm(({ system }) => {
    if (system.includes("peneliti fakta")) {
      return JSON.stringify({
        facts: [
          {
            claim: "Mesin jet modern mengompres udara hingga puluhan kali tekanan awalnya.",
            evidence: "Modern jet engines compress incoming air to more than 40 times its original pressure.",
            sourceIndex: 1,
            kind: "number",
          },
          {
            // Karangan: angka tidak ada di sumber.
            claim: "Turbin bekerja pada suhu 9000 derajat Celsius.",
            evidence: "The turbine section extracts energy from the hot gas flow.",
            sourceIndex: 1,
            kind: "number",
          },
          {
            // Karangan: kutipan tidak ada di sumber sama sekali.
            claim: "Mesin jet ditemukan oleh seorang tukang jam di Bandung.",
            evidence: "A watchmaker from Bandung invented the first turbofan in a garage.",
            sourceIndex: 1,
            kind: "fact",
          },
          {
            claim: "Gas panas memutar turbin yang menggerakkan kompresor.",
            evidence: "The turbine section extracts energy from the hot gas flow.",
            sourceIndex: 2,
            kind: "mechanism",
          },
        ],
        uniqueAngles: ["Mesin yang memakan udara sebanyak ruangan"],
        controversy: "",
        viralPotential: "Skala besar.",
      });
    }
    return "{}";
  });
  process.env.OMNIROUTE_BASE_URL = mock.baseUrl;

  const { htmlToText, isFetchableUrl } = await import("../src/lib/engine/fetch-page");
  const fb = await import("../src/lib/engine/factbank");

  section("fetch-page");
  const html = `<html><head><style>.x{}</style></head><body><nav>Menu Beranda Tentang</nav>
    <article><h1>Mesin jet</h1><p>Modern jet engines compress incoming air to more than 40 times its original pressure before combustion.</p>
    <p>The turbine section extracts energy from the hot gas flow &amp; drives the compressor through a shaft.</p>
    <p>Beli</p></article><footer>Hak cipta semua dilindungi</footer></body></html>`;
  const text = htmlToText(html);
  check("menu/footer/script terbuang", !text.includes("Menu Beranda") && !text.includes("Hak cipta"), text);
  check("entitas didecode", text.includes("hot gas flow & drives"), text);
  check("paragraf utama tersisa", text.includes("more than 40 times"), text);
  check("url internal ditolak", !isFetchableUrl("http://192.168.1.5/x") && !isFetchableUrl("http://localhost:3000"));
  check("url publik diterima", isFetchableUrl("https://en.wikipedia.org/wiki/Jet_engine"));
  check("pdf ditolak", !isFetchableUrl("https://a.com/file.pdf"));

  section("verifikasi kutipan dan angka");
  check("kutipan persis = 1", fb.evidenceScore("compress incoming air to more than 40 times", text) === 1);
  check(
    "parafrase ringan masih lolos soft",
    fb.evidenceScore("Modern jet engines compress the incoming air to more than 40 times its original pressure", text) >= 0.6,
  );
  check("kutipan karangan = rendah", fb.evidenceScore("A watchmaker from Bandung invented the turbofan", text) < 0.3);
  check("angka didukung", fb.numbersSupported("tekanan 40 kali lipat", "more than 40 times"));
  check("angka karangan ditolak", !fb.numbersSupported("suhu 9000 derajat", "hot gas flow"));
  check("pemisah ribuan dinormalkan", fb.numbersSupported("sebesar 3.000 meter", "about 3,000 meters"));

  section("extractFactBank dengan LLM tiruan");
  const sources = [
    { title: "Wiki", url: "https://en.wikipedia.org/wiki/Jet", text, full: true },
    { title: "Snippet", url: "https://x.com/a", text: "The turbine section extracts energy from the hot gas flow.", full: false },
  ];
  const bank = await fb.extractFactBank({ topic: "Cara kerja mesin jet", style: "engineering", sources });
  eq("hanya 2 fakta lolos", bank.facts.length, 2);
  check("fakta angka asli lolos", bank.facts.some((f) => f.claim.includes("puluhan kali")));
  check("angka karangan terbuang", !bank.facts.some((f) => f.claim.includes("9000")));
  check("kutipan karangan terbuang", !bank.facts.some((f) => f.claim.includes("Bandung")));
  check("fakta dari snippet = soft", bank.facts.find((f) => f.kind === "mechanism")?.confidence === "soft");
  check("fakta halaman penuh = verified", bank.facts.find((f) => f.kind === "number")?.confidence === "verified");
  eq("id berurutan", bank.facts.map((f) => f.id), ["f1", "f2"]);
  eq("laporan dropped", bank.report.dropped.length, 2);
  check(
    "alasan drop terekam",
    bank.report.dropped.some((d) => d.reason.includes("angka")) &&
      bank.report.dropped.some((d) => d.reason.includes("kutipan")),
    bank.report.dropped,
  );

  section("query dan ranking sumber");
  const queries = fb.buildResearchQueries("Gimana mesin jet bekerja?", "engineering", "turbofan jet engine");
  check("query Inggris ditambahkan", queries.some((q) => q.startsWith("turbofan jet engine")), queries);
  const ranked = fb.rankAndDedupe(
    [
      { url: "https://pinterest.com/pin/1" },
      { url: "https://example.com/a" },
      { url: "https://www.example.com/a#x" },
      { url: "https://en.wikipedia.org/wiki/Jet_engine" },
    ],
    3,
  );
  eq("duplikat dan pinterest dibuang, wikipedia di depan", ranked.map((r) => r.url), [
    "https://en.wikipedia.org/wiki/Jet_engine",
    "https://example.com/a",
  ]);

  await mock.close();
  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
