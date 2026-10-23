import { generateStructuredOmniroute } from "@/lib/omniroute";
import { env } from "@/config/env";
import {
  DeconstructionBlueprintSchema,
  type DeconstructionBlueprint,
} from "@/schemas/video-blueprint";

const DECONSTRUCTOR_SYSTEM_PROMPT = `You are Agent 1: Orchestrator & Topic Deconstructor for "Pabrik Video" (inspired by kitabedah.id).
Your task is to deconstruct a raw Indonesian engineering/scientific topic into a strict JSON engineering blueprint.

RULES:
1. Break the explanation into EXACTLY 5 logical phases in this exact order:
   - phaseIndex 0: "HOOK" (Counter-intuitive physical anomaly or intriguing engineering mystery)
   - phaseIndex 1: "CORE_MECHANISM" (Primary thermodynamic, fluid, mechanical, or electrical principle)
   - phaseIndex 2: "COMPONENT_BREAKDOWN" (Cross-section & exploded view of internal layers/parts)
   - phaseIndex 3: "TELEMETRY_DATA" (Quantitative metrics, efficiency curves, losses, and threshold behavior)
   - phaseIndex 4: "SUMMARY" (System synthesis and engineering takeaway)
2. Identify 4 to 5 concrete physical components ("components") with real materials, technical specifications, physics principles, and screen anchor coordinates within 1920x1080 (x between 620 and 1300, y between 300 and 820).
3. Choose the closest "primaryArchetype" from:
   - "THERMAL_VESSEL" (tumbler, vacuum flask, thermos, boiler, heat insulator, pipe)
   - "COOLING_COMPRESSOR" (AC, refrigerator, heat pump, freon, condenser, radiator)
   - "MECHANICAL_TURBINE" (engine, turbofan, motor, pump, gearbox, hydraulics)
   - "BATTERY_ELECTROCHEMICAL" (battery, EV cell, capacitor, solar panel, inverter)
   - "AERODYNAMIC_FLOW" (wing, spoiler, valve, nozzle, wind tunnel)
   - "MICROCHIP_ARCHITECTURE" (CPU, GPU, transistor, PCB, sensor, fiber optic)
4. Return ONLY valid JSON matching the exact schema requested. No markdown prose outside JSON.`;

export function buildFallbackBlueprint(topic: string): DeconstructionBlueprint {
  const lower = topic.toLowerCase();
  const isCooling = /ac\b|freon|kulkas|pendingin|kompresor|radiator/.test(lower);
  const isBattery = /baterai|listrik|ev\b|lithium|charger|surya/.test(lower);
  const isTurbine = /mesin|motor|turbin|jet|pesawat|mobil|rem/.test(lower);

  const primaryArchetype = isCooling
    ? "COOLING_COMPRESSOR"
    : isBattery
      ? "BATTERY_ELECTROCHEMICAL"
      : isTurbine
        ? "MECHANICAL_TURBINE"
        : "THERMAL_VESSEL";

  if (primaryArchetype === "THERMAL_VESSEL") {
    return {
      topic,
      normalizedTitle: topic.toUpperCase(),
      engineeringCategory: "THERMODYNAMICS & VACUUM INSULATION",
      coreEquationOrLaw: "q = -k · ∇T  &  q_rad = ε · σ · (T₁⁴ - T₂⁴)",
      primaryArchetype: "THERMAL_VESSEL",
      components: [
        {
          id: "comp_outer_shell",
          name: "Outer Austenitic Shell (SS-304)",
          materialOrSpec: "Stainless Steel 304 (t = 0.5 mm)",
          roleInMechanism: "Perisai struktural luar dan pemisah tekanan atmosfer 1.013 Bar",
          physicsPrinciple: "Mechanical Stress Containment & Ambient Isolation",
          defaultAnchor: { x: 760, y: 560 },
        },
        {
          id: "comp_vacuum_gap",
          name: "High-Vacuum Annulus Chamber",
          materialOrSpec: "Hampa Udara < 10⁻³ Pa (Zero Gas Molecules)",
          roleInMechanism: "Memutus rambatan kalor konduksi dan konveksi antar dinding",
          physicsPrinciple: "Knudsen Free-Molecular Thermal Resistance",
          defaultAnchor: { x: 1120, y: 520 },
        },
        {
          id: "comp_copper_shield",
          name: "Electrolytic Copper Radiation Shield",
          materialOrSpec: "Lapisan Tembaga Mikro (Emisivitas ε = 0.02)",
          roleInMechanism: "Memantulkan kembali 98% gelombang inframerah termal ke inti",
          physicsPrinciple: "Stefan-Boltzmann Infrared Photon Reflection",
          defaultAnchor: { x: 1160, y: 660 },
        },
        {
          id: "comp_inner_core",
          name: "Inner Thermal Core Vessel",
          materialOrSpec: "Stainless Steel 316L Electropolished",
          roleInMechanism: "Menampung fluida panas/dingin dengan kapasitas kalor spesifik tinggi",
          physicsPrinciple: "Enthalpy Retention (Q = m · c · ΔT)",
          defaultAnchor: { x: 820, y: 430 },
        },
        {
          id: "comp_seal_cap",
          name: "Elastomer Silicone & PP Seal Cap",
          materialOrSpec: "Food-Grade Polypropylene + Silicone O-Ring",
          roleInMechanism: "Titik kritis kebocoran mikro konveksi uap di leher wadah",
          physicsPrinciple: "Vapor Lock & Conductive Neck Bottleneck",
          defaultAnchor: { x: 960, y: 290 },
        },
      ],
      phases: [
        {
          phaseIndex: 0,
          phaseType: "HOOK",
          title: "ANOMALI RETENSI TERMAL",
          scientificPrinciple: "Isolasi Tiga Jalur Perpindahan Kalor (Konduksi, Konveksi, Radiasi)",
          keyMechanismSummary: `Mengapa suhu di dalam sistem "${topic}" mampu bertahan belasan jam padahal selisih suhu luar mencapai puluhan derajat Celsius.`,
          visualArchetype: "THERMAL_VESSEL",
          targetDurationSeconds: 6,
          focusComponentIds: ["comp_outer_shell", "comp_inner_core"],
        },
        {
          phaseIndex: 1,
          phaseType: "CORE_MECHANISM",
          title: "BLOKADE VAKUM KONDUKSI & KONVEKSI",
          scientificPrinciple: "Hukum Fourier & Eliminasi Medium Partikel Gas",
          keyMechanismSummary:
            "Rongga di antara dua dinding baja dikuras hingga tekanan vakum di bawah seperseribu Pascal sehingga getaran atom tidak memiliki jembatan rambat.",
          visualArchetype: "THERMAL_VESSEL",
          targetDurationSeconds: 7,
          focusComponentIds: ["comp_vacuum_gap", "comp_inner_core"],
        },
        {
          phaseIndex: 2,
          phaseType: "COMPONENT_BREAKDOWN",
          title: "BEDAH LAPISAN & CERMIN RADIASI TEMBAGA",
          scientificPrinciple: "Hukum Radiasi Stefan-Boltzmann (ε = 0.02)",
          keyMechanismSummary:
            "Meski tanpa udara, foton inframerah tetap menembus ruang hampa. Lapisan mikro tembaga di sisi dalam memantulkan 98% radiasi kembali ke cairan.",
          visualArchetype: "THERMAL_VESSEL",
          targetDurationSeconds: 8,
          focusComponentIds: ["comp_copper_shield", "comp_vacuum_gap", "comp_seal_cap"],
        },
        {
          phaseIndex: 3,
          phaseType: "TELEMETRY_DATA",
          title: "TELEMETRI LAJU BOCOR KALOR (W/m²K)",
          scientificPrinciple: "Analisis Koefisien Perpindahan Kalor Menyeluruh (U-Value)",
          keyMechanismSummary:
            "Data telemetri menunjukkan fluks kalor ditekan hingga di bawah 1.2 Watt, dengan 85% kebocoran termal justru terpusat pada celah tutup polimer atas.",
          visualArchetype: "THERMAL_VESSEL",
          targetDurationSeconds: 7,
          focusComponentIds: ["comp_seal_cap", "comp_inner_core"],
        },
        {
          phaseIndex: 4,
          phaseType: "SUMMARY",
          title: "SINTESIS REKAYASA TERMODINAMIKA",
          scientificPrinciple: "Kombinasi Ruang Hampa + Reflektor Foton Inframerah",
          keyMechanismSummary:
            "Sinergi dinding ganda baja tahan karat, ruang hampa molekuler, dan perisai tembaga menciptakan perangkap energi termal berdaya guna 94%.",
          visualArchetype: "THERMAL_VESSEL",
          targetDurationSeconds: 6,
          focusComponentIds: ["comp_outer_shell", "comp_vacuum_gap", "comp_copper_shield", "comp_inner_core"],
        },
      ],
    };
  }

  // Generic engineering fallback for other archetypes
  return {
    topic,
    normalizedTitle: topic.toUpperCase(),
    engineeringCategory: "APPLIED MECHANICAL & ENERGY SYSTEMS",
    coreEquationOrLaw: "η = W_out / Q_in  &  ΔE = Q - W",
    primaryArchetype,
    components: [
      {
        id: "comp_housing",
        name: "Primary Structural Casing",
        materialOrSpec: "Anodized Aerospace Alloy 6061-T6",
        roleInMechanism: "Menahan beban tekanan kerja dan menjaga presisi geometri internal",
        physicsPrinciple: "Structural Rigidity & Thermal Dissipation",
        defaultAnchor: { x: 740, y: 560 },
      },
      {
        id: "comp_chamber",
        name: "High-Pressure Reaction Chamber",
        materialOrSpec: "Reinforced Chamber (P_max = 18.5 Bar)",
        roleInMechanism: "Zona konversi energi primer dengan gradien tekanan terukur",
        physicsPrinciple: "Continuity & Pressure-Enthalpy Coupling",
        defaultAnchor: { x: 1120, y: 500 },
      },
      {
        id: "comp_transfer_matrix",
        name: "Conductive Exchange Matrix",
        materialOrSpec: "Micro-Fin Copper-Nickel Array",
        roleInMechanism: "Mempercepat pertukaran fluks energi antar fase kerja",
        physicsPrinciple: "High Surface-Area Flux Transfer",
        defaultAnchor: { x: 1150, y: 660 },
      },
      {
        id: "comp_core_actuator",
        name: "Core Rotor & Flow Actuator",
        materialOrSpec: "Brushless High-Torque Impeller",
        roleInMechanism: "Menggerakkan sirkulasi fluida/energi secara sinkron",
        physicsPrinciple: "Conservation of Angular Momentum",
        defaultAnchor: { x: 820, y: 420 },
      },
      {
        id: "comp_control_valve",
        name: "Precision Metering Valve & Sensor",
        materialOrSpec: "Piezo-Electric Expansion Valve",
        roleInMechanism: "Mengatur debit dan menjaga stabilitas titik kerja telemetri",
        physicsPrinciple: "Closed-Loop Feedback Modulation",
        defaultAnchor: { x: 960, y: 300 },
      },
    ],
    phases: [
      {
        phaseIndex: 0,
        phaseType: "HOOK",
        title: "PARADOKS MEKANISME SISTEM",
        scientificPrinciple: "Konversi Energi & Efisiensi Sistem Tertutup",
        keyMechanismSummary: `Membedah rahasia teknis di balik fenomena "${topic}" secara terukur.`,
        visualArchetype: primaryArchetype,
        targetDurationSeconds: 6,
        focusComponentIds: ["comp_housing", "comp_core_actuator"],
      },
      {
        phaseIndex: 1,
        phaseType: "CORE_MECHANISM",
        title: "PRINSIP FISIKA & GRADIEN ENERGI",
        scientificPrinciple: "Hukum Kekekalan Energi & Gradien Tekanan",
        keyMechanismSummary: "Bagaimana perbedaan potensial tekanan dan suhu menciptakan kerja mekanis berkesinambungan.",
        visualArchetype: primaryArchetype,
        targetDurationSeconds: 7,
        focusComponentIds: ["comp_chamber", "comp_core_actuator"],
      },
      {
        phaseIndex: 2,
        phaseType: "COMPONENT_BREAKDOWN",
        title: "ANATOMI KOMPONEN INTERNAL (EXPLODED VIEW)",
        scientificPrinciple: "Sinergi Material & Geometri Presisi",
        keyMechanismSummary: "Memisahkan lapisan pelindung, matriks penukar energi, dan katup kendali mikro.",
        visualArchetype: primaryArchetype,
        targetDurationSeconds: 8,
        focusComponentIds: ["comp_transfer_matrix", "comp_chamber", "comp_control_valve"],
      },
      {
        phaseIndex: 3,
        phaseType: "TELEMETRY_DATA",
        title: "ANALISIS TELEMETRI & KURVA EFISIENSI",
        scientificPrinciple: "Optimasi Parameter Operasional Real-Time",
        keyMechanismSummary: "Membaca lonjakan parameter suhu, tekanan, dan efisiensi pada beban puncak.",
        visualArchetype: primaryArchetype,
        targetDurationSeconds: 7,
        focusComponentIds: ["comp_control_valve", "comp_transfer_matrix"],
      },
      {
        phaseIndex: 4,
        phaseType: "SUMMARY",
        title: "KESIMPULAN ARSITEKTUR REKAYASA",
        scientificPrinciple: "Integrasi Sistem Terpadu",
        keyMechanismSummary: "Keseluruhan komponen bekerja serempak menjaga kinerja tetap stabil dan efisien.",
        visualArchetype: primaryArchetype,
        targetDurationSeconds: 6,
        focusComponentIds: ["comp_housing", "comp_chamber", "comp_transfer_matrix", "comp_core_actuator"],
      },
    ],
  };
}

export async function runDeconstructorAgent(topic: string): Promise<{
  blueprint: DeconstructionBlueprint;
  modelUsed: string;
}> {
  const fallback = buildFallbackBlueprint(topic);

  const userPrompt = `Deconstruct this topic into a 5-phase engineering video blueprint (kitabedah.id style):
TOPIC: "${topic}"

Respond with a JSON object matching this exact structure:
${JSON.stringify(fallback, null, 2)}`;

  const { data, modelUsed } = await generateStructuredOmniroute({
    systemPrompt: DECONSTRUCTOR_SYSTEM_PROMPT,
    userPrompt,
    schema: DeconstructionBlueprintSchema,
    preferredModel: env.OMNIROUTE_FAST_MODEL,
    temperature: 0.3,
    fallbackGenerator: () => fallback,
  });

  return { blueprint: data, modelUsed };
}
