import { AssemblyDef, AssemblyPart } from "./types";

/**
 * Katalog assembly. LLM director HANYA memilih id assembly dari sini
 * dan merujuk part lewat id. Geometri tidak pernah ditulis oleh LLM.
 * Semua objek berdiri tegak (sumbu Y) supaya pas dengan frame 9:16.
 */

const pistonEngine: AssemblyDef = {
  id: "piston_engine",
  title: "Mesin piston (motor bakar 4-tak satu silinder)",
  fits:
    "mesin motor/mobil, cara kerja mesin bensin 4-tak, siklus pembakaran, piston dan poros engkol, kenapa mesin panas, busi",
  parts: [
    {
      id: "block", nameId: "Blok silinder",
      role: "dinding silinder tempat piston bergerak dan menahan panas pembakaran",
      kind: "tube", position: [0, 1.2, 0],
      params: { rOuter: 1.0, rInner: 0.82, h: 2.4 },
      explodeDir: [0, 1, 0], explodeDistance: 0,
    },
    {
      id: "head", nameId: "Kepala silinder",
      role: "menutup silinder dari atas dan menampung busi serta katup",
      kind: "cylinder", position: [0, 2.65, 0],
      params: { r: 1.05, h: 0.5 },
      explodeDir: [0, 1, 0], explodeDistance: 1.3,
    },
    {
      id: "sparkplug", nameId: "Busi",
      role: "memercikkan api untuk membakar campuran bensin dan udara",
      kind: "cylinder", position: [0, 3.25, 0],
      params: { r: 0.13, h: 0.8 },
      explodeDir: [0, 1, 0], explodeDistance: 2.4,
    },
    {
      id: "intake", nameId: "Saluran masuk",
      role: "mengalirkan campuran bensin dan udara ke dalam silinder",
      kind: "cylinder", position: [1.2, 2.65, 0],
      params: { r: 0.2, h: 1.0, axis: "x" },
      explodeDir: [1, 0, 0], explodeDistance: 1.7,
    },
    {
      id: "piston", nameId: "Piston",
      role: "didorong ledakan pembakaran ke bawah, menekan campuran saat naik",
      kind: "cylinder", position: [0, 1.4, 0],
      params: { r: 0.78, h: 0.7 },
      explodeDir: [0, -1, 0], explodeDistance: 1.5,
      bob: { amp: 0.22, speed: 0.12 },
    },
    {
      id: "rod", nameId: "Batang penghubung",
      role: "meneruskan dorongan piston ke poros engkol",
      kind: "box", position: [0, 0.1, 0],
      params: { w: 0.2, h: 2.2, d: 0.32 },
      explodeDir: [0, -1, 0], explodeDistance: 2.7,
      bob: { amp: 0.22, speed: 0.12 },
    },
    {
      id: "crank", nameId: "Poros engkol",
      role: "mengubah gerak lurus piston menjadi putaran",
      kind: "cylinder", position: [0, -1.3, 0],
      params: { r: 0.95, h: 0.3, axis: "z" },
      explodeDir: [0, -1, 0], explodeDistance: 3.9, spinZ: 0.12,
    },
    {
      id: "flywheel", nameId: "Roda gila",
      role: "menyimpan momentum supaya putaran mesin halus di antara langkah tenaga",
      kind: "gear",
      position: [0, -1.3, 0.5],
      params: { rOuter: 1.25, rRoot: 1.08, teeth: 18, depth: 0.25, hole: 0.3 },
      explodeDir: [0, -1, 0], explodeDistance: 3.9, spinZ: 0.12,
    },
  ],
};

const turbofan: AssemblyDef = {
  id: "jet_turbofan",
  title: "Mesin jet turbofan",
  fits:
    "mesin pesawat, cara kerja jet engine, turbofan, kenapa pesawat bisa terbang dengan mesin jet, kompresor, turbin, thrust",
  parts: [
    {
      id: "nacelle", nameId: "Selubung mesin",
      role: "rumah luar mesin yang mengarahkan aliran udara masuk dan pendingin",
      kind: "tube", position: [0, 0, 0],
      params: { rOuter: 1.55, rInner: 1.45, h: 5.0 },
      explodeDir: [0, 0, 0], explodeDistance: 0,
    },
    {
      id: "fan", nameId: "Kipas depan",
      role: "menyedot udara dalam jumlah besar; sebagian besar udara melewati mesin dan menghasilkan dorongan",
      kind: "gear", position: [0, 2.0, 0],
      params: { rOuter: 1.4, rRoot: 0.55, teeth: 14, depth: 0.2, hole: 0.2 },
      explodeDir: [0, 1, 0], explodeDistance: 1.8, spinZ: 0.2,
    },
    {
      id: "compressor", nameId: "Kompresor",
      role: "memampatkan udara berkali-kali sampai tekanannya naik puluhan kali lipat",
      kind: "cone", position: [0, 0.8, 0],
      params: { rTop: 0.95, rBottom: 0.6, h: 1.4 },
      explodeDir: [0, 1, 0], explodeDistance: 0.9,
    },
    {
      id: "combustor", nameId: "Ruang bakar",
      role: "bahan bakar disemprot dan dibakar bersama udara bertekanan",
      kind: "tube", position: [0, -0.5, 0],
      params: { rOuter: 0.95, rInner: 0.7, h: 1.2 },
      explodeDir: [0, 1, 0], explodeDistance: 0,
    },
    {
      id: "turbine", nameId: "Turbin",
      role: "gas panas memutar turbin, yang menggerakkan kompresor dan kipas lewat poros",
      kind: "gear", position: [0, -1.5, 0],
      params: { rOuter: 0.9, rRoot: 0.45, teeth: 12, depth: 0.2, hole: 0.2 },
      explodeDir: [0, -1, 0], explodeDistance: 0.9, spinZ: 0.2,
    },
    {
      id: "nozzle", nameId: "Nosel buang",
      role: "mempercepat gas buang keluar sehingga mendorong pesawat ke depan",
      kind: "cone", position: [0, -2.4, 0],
      params: { rTop: 0.8, rBottom: 0.45, h: 1.0 },
      explodeDir: [0, -1, 0], explodeDistance: 1.9,
    },
    {
      id: "shaft", nameId: "Poros utama",
      role: "menyambung turbin ke kompresor dan kipas supaya berputar bersamaan",
      kind: "cylinder", position: [0, -0.1, 0],
      params: { r: 0.1, h: 4.6 },
      explodeDir: [0, 0, 0], explodeDistance: 0, spinZ: 0.2,
    },
  ],
};

const liIonCell: AssemblyDef = {
  id: "li_ion_cell",
  title: "Sel baterai lithium-ion (silindris)",
  fits:
    "baterai HP/laptop/mobil listrik, cara kerja baterai lithium-ion, kenapa baterai bisa meledak atau menggembung, kenapa baterai cepat drop, sel baterai 18650/21700",
  parts: [
    {
      id: "can", nameId: "Casing baja",
      role: "wadah logam yang menahan seluruh isi sel dan menjadi kutub negatif",
      kind: "tube", position: [0, 0, 0],
      params: { rOuter: 1.0, rInner: 0.95, h: 5.0 },
      explodeDir: [0, 0, 0], explodeDistance: 0,
    },
    {
      id: "jellyroll", nameId: "Gulungan elektroda",
      role: "lapisan anoda dan katoda yang digulung; di sinilah ion lithium bolak-balik menyimpan dan melepas energi",
      kind: "tube", position: [0, -0.1, 0],
      params: { rOuter: 0.9, rInner: 0.22, h: 4.2 },
      explodeDir: [0, 1, 0], explodeDistance: 1.2,
    },
    {
      id: "separator", nameId: "Separator",
      role: "selaput tipis pemisah anoda dan katoda; kalau rusak terjadi korsleting",
      kind: "tube", position: [0, -0.1, 0],
      params: { rOuter: 0.94, rInner: 0.9, h: 4.4 },
      explodeDir: [0, 1, 0], explodeDistance: 2.4,
    },
    {
      id: "centerpin", nameId: "Pin tengah",
      role: "menjaga gulungan tetap rapi dan memberi jalur keluar gas saat ada tekanan berlebih",
      kind: "cylinder", position: [0, -0.1, 0],
      params: { r: 0.15, h: 4.4 },
      explodeDir: [0, -1, 0], explodeDistance: 1.8,
    },
    {
      id: "vent", nameId: "Katup pengaman",
      role: "membuka otomatis melepas gas bila tekanan di dalam sel terlalu tinggi",
      kind: "cylinder", position: [0, 2.35, 0],
      params: { r: 0.8, h: 0.15 },
      explodeDir: [0, 1, 0], explodeDistance: 2.9,
    },
    {
      id: "cap", nameId: "Tutup atas",
      role: "menyegel sel dan menjadi kutub positif",
      kind: "cylinder", position: [0, 2.55, 0],
      params: { r: 0.95, h: 0.25 },
      explodeDir: [0, 1, 0], explodeDistance: 3.8,
    },
    {
      id: "terminal", nameId: "Kutub positif",
      role: "titik sambung ke rangkaian listrik di perangkat",
      kind: "cylinder", position: [0, 2.8, 0],
      params: { r: 0.38, h: 0.25 },
      explodeDir: [0, 1, 0], explodeDistance: 4.7,
    },
  ],
};

export const ASSEMBLIES: Record<string, AssemblyDef> = {
  [pistonEngine.id]: pistonEngine,
  [turbofan.id]: turbofan,
  [liIonCell.id]: liIonCell,
};

export const ASSEMBLY_IDS = Object.keys(ASSEMBLIES);

export function getAssembly(id: string): AssemblyDef {
  const a = ASSEMBLIES[id];
  if (!a) throw new Error(`Assembly tidak dikenal: "${id}". Tersedia: ${ASSEMBLY_IDS.join(", ")}`);
  return a;
}

export function findPart(a: AssemblyDef, raw: string): AssemblyPart | undefined {
  const k = raw.trim().toLowerCase();
  return a.parts.find((p) => p.id.toLowerCase() === k);
}

/** Teks katalog untuk disuntikkan ke prompt director. */
export function describeCatalogForPrompt(): string {
  return Object.values(ASSEMBLIES)
    .map((a) => {
      const parts = a.parts
        .map((p) => `    - ${p.id} = ${p.nameId}: ${p.role}`)
        .join("\n");
      return `* assemblyId: "${a.id}"  (${a.title})\n  Cocok untuk: ${a.fits}\n  Part yang boleh dirujuk:\n${parts}`;
    })
    .join("\n\n");
}
