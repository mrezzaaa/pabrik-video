import { generateStructuredOmniroute } from "@/lib/omniroute";
import { env } from "@/config/env";
import {
  ScriptArchitectOutputSchema,
  type DeconstructionBlueprint,
  type ScriptArchitectOutput,
} from "@/schemas/video-blueprint";

const SCRIPTWRITER_SYSTEM_PROMPT = `You are Agent 2: Script & Telemetry Architect for "Pabrik Video" (kitabedah.id style).
Given an engineering deconstruction blueprint, write an analytical, engaging Indonesian voiceover script ("gaya bedah mekanisme") and synchronous telemetry + pop-up callout triggers.

CRITICAL REQUIREMENTS:
1. Language: Crisp, authoritative, scientific yet accessible Indonesian ("gaya kitabedah.id" — direct, zero fluff, dense with physical numbers and causal mechanisms).
2. Exactly 5 segments matching the 5 phases: HOOK, CORE_MECHANISM, COMPONENT_BREAKDOWN, TELEMETRY_DATA, SUMMARY.
3. Each segment's "narrationText" should be 22 to 35 words (ideal for 6-9 seconds at 1.1x speed).
4. Define 4 top HUD telemetry channels ("telemetryChannels"), e.g. Core Temp (°C), Chamber Pressure (Pa or Bar), Heat Flux Rate (W/m²K), Thermal Efficiency (%).
5. In each segment, provide a "telemetrySnapshot" array with values for every channelId so the HUD numbers tick dynamically across the video.
6. In each segment, provide 1 or 2 "callouts" referencing valid componentId values from the blueprint, with exact anchor coordinates, technical label, spec value, and physics formula/fact.
7. Output ONLY valid JSON conforming strictly to the schema.`;

export function buildFallbackScript(blueprint: DeconstructionBlueprint): ScriptArchitectOutput {
  const c0 = blueprint.components[0]?.id ?? "comp_outer_shell";
  const c1 = blueprint.components[1]?.id ?? "comp_vacuum_gap";
  const c2 = blueprint.components[2]?.id ?? "comp_copper_shield";
  const c3 = blueprint.components[3]?.id ?? "comp_inner_core";
  const c4 = blueprint.components[4]?.id ?? c0;

  const isThermal = blueprint.primaryArchetype === "THERMAL_VESSEL";

  const telemetryChannels = isThermal
    ? [
        {
          id: "ch_temp",
          label: "CORE FLUID TEMP",
          unit: "°C",
          minVal: 25,
          maxVal: 100,
          warnThreshold: 85,
          dangerThreshold: 95,
          decimals: 1,
          colorHex: "#38BDF8",
        },
        {
          id: "ch_pressure",
          label: "VACUUM ANNULUS",
          unit: "mPa",
          minVal: 0,
          maxVal: 100,
          warnThreshold: 50,
          dangerThreshold: 80,
          decimals: 2,
          colorHex: "#22D3EE",
        },
        {
          id: "ch_flux",
          label: "HEAT TRANSFER RATE",
          unit: "W/m²K",
          minVal: 0,
          maxVal: 15,
          warnThreshold: 5,
          dangerThreshold: 10,
          decimals: 2,
          colorHex: "#F59E0B",
        },
        {
          id: "ch_efficiency",
          label: "THERMAL RETENTION",
          unit: "%",
          minVal: 0,
          maxVal: 100,
          warnThreshold: 75,
          dangerThreshold: 60,
          decimals: 1,
          colorHex: "#10B981",
        },
      ]
    : [
        {
          id: "ch_temp",
          label: "CORE OPERATING TEMP",
          unit: "°C",
          minVal: 20,
          maxVal: 120,
          warnThreshold: 90,
          dangerThreshold: 105,
          decimals: 1,
          colorHex: "#38BDF8",
        },
        {
          id: "ch_pressure",
          label: "SYSTEM PRESSURE",
          unit: "Bar",
          minVal: 1,
          maxVal: 20,
          warnThreshold: 14,
          dangerThreshold: 17,
          decimals: 2,
          colorHex: "#22D3EE",
        },
        {
          id: "ch_flux",
          label: "ENERGY FLUX RATE",
          unit: "W/m²K",
          minVal: 10,
          maxVal: 250,
          warnThreshold: 180,
          dangerThreshold: 220,
          decimals: 1,
          colorHex: "#F59E0B",
        },
        {
          id: "ch_efficiency",
          label: "SYSTEM EFFICIENCY",
          unit: "%",
          minVal: 0,
          maxVal: 100,
          warnThreshold: 80,
          dangerThreshold: 92,
          decimals: 1,
          colorHex: "#10B981",
        },
      ];

  const segments: ScriptArchitectOutput["segments"] = isThermal
    ? [
        {
          segmentIndex: 0,
          phaseType: "HOOK",
          phaseTitle: "ANOMALI RETENSI TERMAL",
          onScreenHeadline: "DELTA SUHU EKSTREM: 92°C DI DALAM vs 26°C DI LUAR",
          narrationText:
            "Pernahkah kamu bertanya, kenapa air mendidih sembilan puluh dua derajat Celsius di dalam tumbler bisa tetap panas berjam-jam, padahal dinding luarnya terasa sejuk saat disentuh?",
          telemetrySnapshot: [
            {
              channelId: "ch_temp",
              startValue: 92.4,
              endValue: 92.1,
              sparklineHistory: [93.0, 92.8, 92.6, 92.5, 92.4, 92.1],
              status: "NOMINAL",
            },
            {
              channelId: "ch_pressure",
              startValue: 0.85,
              endValue: 0.82,
              sparklineHistory: [0.9, 0.88, 0.86, 0.85, 0.83, 0.82],
              status: "OPTIMAL",
            },
            {
              channelId: "ch_flux",
              startValue: 0.42,
              endValue: 0.38,
              sparklineHistory: [0.5, 0.48, 0.45, 0.43, 0.4, 0.38],
              status: "OPTIMAL",
            },
            {
              channelId: "ch_efficiency",
              startValue: 96.4,
              endValue: 96.8,
              sparklineHistory: [95.8, 96.0, 96.2, 96.4, 96.6, 96.8],
              status: "OPTIMAL",
            },
          ],
          callouts: [
            {
              id: "callout_hook_1",
              componentId: c0,
              relativeTriggerRatio: 0.18,
              durationSeconds: 4.5,
              label: "OUTER SHELL SS-304",
              value: "T_surface = 26.4 °C",
              formulaOrFact: "ΔT = 66.0 °C Isolated",
              subtext: "Dinding baja austenitik memutus kontak termal ke tangan",
              accentColor: "#38BDF8",
              anchor: blueprint.components[0]?.defaultAnchor ?? { x: 760, y: 560 },
              cardPosition: "TOP_LEFT",
            },
          ],
        },
        {
          segmentIndex: 1,
          phaseType: "CORE_MECHANISM",
          phaseTitle: "BLOKADE VAKUM KONDUKSI",
          onScreenHeadline: "ELIMINASI PARTIKEL UDARA: TEKANAN < 0.001 PASCAL",
          narrationText:
            "Rahasia utamanya terletak pada celah hampa udara di antara dua dinding baja. Tanpa molekul gas sebagai jembatan rambat, perpindahan panas lewat konduksi dan konveksi langsung lumpuh total.",
          telemetrySnapshot: [
            {
              channelId: "ch_temp",
              startValue: 92.1,
              endValue: 91.6,
              sparklineHistory: [92.5, 92.3, 92.1, 91.9, 91.7, 91.6],
              status: "NOMINAL",
            },
            {
              channelId: "ch_pressure",
              startValue: 0.82,
              endValue: 0.12,
              sparklineHistory: [0.82, 0.6, 0.4, 0.25, 0.15, 0.12],
              status: "OPTIMAL",
            },
            {
              channelId: "ch_flux",
              startValue: 0.38,
              endValue: 0.19,
              sparklineHistory: [0.42, 0.35, 0.3, 0.25, 0.21, 0.19],
              status: "OPTIMAL",
            },
            {
              channelId: "ch_efficiency",
              startValue: 96.8,
              endValue: 98.1,
              sparklineHistory: [96.5, 96.9, 97.3, 97.6, 97.9, 98.1],
              status: "OPTIMAL",
            },
          ],
          callouts: [
            {
              id: "callout_mech_1",
              componentId: c1,
              relativeTriggerRatio: 0.15,
              durationSeconds: 5.0,
              label: "VACUUM ANNULUS GAP",
              value: "P = 0.0008 Pa",
              formulaOrFact: "k_vacuum ≈ 0.000 W/m·K",
              subtext: "Zona hampa molekuler mematikan konduksi & konveksi",
              accentColor: "#22D3EE",
              anchor: blueprint.components[1]?.defaultAnchor ?? { x: 1120, y: 520 },
              cardPosition: "TOP_RIGHT",
            },
          ],
        },
        {
          segmentIndex: 2,
          phaseType: "COMPONENT_BREAKDOWN",
          phaseTitle: "PERISAI RADIASI TEMBAGA",
          onScreenHeadline: "CERMIN FOTON INFRAMERAH: REFLEKTIVITAS 98%",
          narrationText:
            "Namun kalor masih bisa kabur lewat pancaran radiasi gelombang inframerah menembus ruang hampa. Karena itu, sisi luar tabung dalam dilapisi mikro-tembaga yang memantulkan sembilan puluh delapan persen radiasi kembali ke air.",
          telemetrySnapshot: [
            {
              channelId: "ch_temp",
              startValue: 91.6,
              endValue: 90.8,
              sparklineHistory: [91.8, 91.6, 91.4, 91.2, 91.0, 90.8],
              status: "NOMINAL",
            },
            {
              channelId: "ch_pressure",
              startValue: 0.12,
              endValue: 0.1,
              sparklineHistory: [0.15, 0.14, 0.12, 0.11, 0.1, 0.1],
              status: "OPTIMAL",
            },
            {
              channelId: "ch_flux",
              startValue: 0.19,
              endValue: 0.14,
              sparklineHistory: [0.22, 0.19, 0.18, 0.16, 0.15, 0.14],
              status: "OPTIMAL",
            },
            {
              channelId: "ch_efficiency",
              startValue: 98.1,
              endValue: 98.6,
              sparklineHistory: [97.8, 98.1, 98.2, 98.4, 98.5, 98.6],
              status: "OPTIMAL",
            },
          ],
          callouts: [
            {
              id: "callout_comp_1",
              componentId: c2,
              relativeTriggerRatio: 0.14,
              durationSeconds: 4.5,
              label: "COPPER FOIL SHIELD",
              value: "Emissivity ε = 0.02",
              formulaOrFact: "q_rad = ε·σ·(T₁⁴ - T₂⁴)",
              subtext: "Memantulkan 98% foton inframerah kembali ke inti fluida",
              accentColor: "#F59E0B",
              anchor: blueprint.components[2]?.defaultAnchor ?? { x: 1160, y: 660 },
              cardPosition: "BOTTOM_RIGHT",
            },
            {
              id: "callout_comp_2",
              componentId: c3,
              relativeTriggerRatio: 0.52,
              durationSeconds: 3.8,
              label: "INNER CORE SS-316L",
              value: "Cp = 4.184 kJ/kg·K",
              formulaOrFact: "Electropolished Interior",
              subtext: "Permukaan mikro-halus meminimalkan nukleasi termal",
              accentColor: "#10B981",
              anchor: blueprint.components[3]?.defaultAnchor ?? { x: 820, y: 430 },
              cardPosition: "BOTTOM_LEFT",
            },
          ],
        },
        {
          segmentIndex: 3,
          phaseType: "TELEMETRY_DATA",
          phaseTitle: "ANALISIS KEBOCORAN LEHER TUTUP",
          onScreenHeadline: "BOTTLENECK TERMAL: 85% RUGI KALOR DI AREA TUTUP",
          narrationText:
            "Data telemetri mengungkap fakta menarik: delapan puluh lima persen kebocoran suhu justru terjadi di leher dan tutup polimer atas, tempat cincin silikon menahan rambatan uap mikro.",
          telemetrySnapshot: [
            {
              channelId: "ch_temp",
              startValue: 90.8,
              endValue: 88.2,
              sparklineHistory: [91.0, 90.5, 89.9, 89.2, 88.7, 88.2],
              status: "WARNING",
            },
            {
              channelId: "ch_pressure",
              startValue: 0.1,
              endValue: 0.45,
              sparklineHistory: [0.1, 0.18, 0.25, 0.32, 0.39, 0.45],
              status: "NOMINAL",
            },
            {
              channelId: "ch_flux",
              startValue: 0.14,
              endValue: 1.18,
              sparklineHistory: [0.14, 0.35, 0.62, 0.85, 1.04, 1.18],
              status: "WARNING",
            },
            {
              channelId: "ch_efficiency",
              startValue: 98.6,
              endValue: 94.2,
              sparklineHistory: [98.6, 97.8, 96.9, 95.8, 94.9, 94.2],
              status: "NOMINAL",
            },
          ],
          callouts: [
            {
              id: "callout_tel_1",
              componentId: c4,
              relativeTriggerRatio: 0.16,
              durationSeconds: 5.0,
              label: "NECK & SILICONE SEAL",
              value: "q_loss = 1.18 W/m²K",
              formulaOrFact: "85% Total Heat Bridge",
              subtext: "Jembatan konduksi padat pada pertemuan dinding dalam & luar",
              accentColor: "#F43F5E",
              anchor: blueprint.components[4]?.defaultAnchor ?? { x: 960, y: 290 },
              cardPosition: "TOP_RIGHT",
            },
          ],
        },
        {
          segmentIndex: 4,
          phaseType: "SUMMARY",
          phaseTitle: "SINTESIS ARSITEKTUR TERMAL",
          onScreenHeadline: "EFISIENSI RETENSI 94.2%: VAKUM + REFLEKTOR + SEAL",
          narrationText:
            "Perpaduan ruang hampa tanpa molekul, cermin tembaga penangkal radiasi, dan segel kedap uap menjadikan tumbler sebuah perangkap termodinamika presisi tinggi dalam genggaman tangan.",
          telemetrySnapshot: [
            {
              channelId: "ch_temp",
              startValue: 88.2,
              endValue: 87.5,
              sparklineHistory: [88.5, 88.2, 88.0, 87.8, 87.6, 87.5],
              status: "OPTIMAL",
            },
            {
              channelId: "ch_pressure",
              startValue: 0.45,
              endValue: 0.11,
              sparklineHistory: [0.45, 0.35, 0.25, 0.18, 0.13, 0.11],
              status: "OPTIMAL",
            },
            {
              channelId: "ch_flux",
              startValue: 1.18,
              endValue: 0.24,
              sparklineHistory: [1.18, 0.9, 0.65, 0.45, 0.31, 0.24],
              status: "OPTIMAL",
            },
            {
              channelId: "ch_efficiency",
              startValue: 94.2,
              endValue: 96.5,
              sparklineHistory: [94.2, 94.7, 95.2, 95.7, 96.1, 96.5],
              status: "OPTIMAL",
            },
          ],
          callouts: [
            {
              id: "callout_sum_1",
              componentId: c1,
              relativeTriggerRatio: 0.18,
              durationSeconds: 4.5,
              label: "THERMAL LOCK SYSTEM",
              value: "ΔT < 0.8 °C / Jam",
              formulaOrFact: "U-Value = 0.24 W/m²K",
              subtext: "Isolasi три-jalur menjaga suhu stabil hingga 18 jam",
              accentColor: "#10B981",
              anchor: blueprint.components[1]?.defaultAnchor ?? { x: 1120, y: 520 },
              cardPosition: "TOP_LEFT",
            },
          ],
        },
      ]
    : blueprint.phases.map((phase, idx) => {
        const comp = blueprint.components[idx % blueprint.components.length] ?? blueprint.components[0];
        const cardPositions = ["TOP_LEFT", "TOP_RIGHT", "BOTTOM_RIGHT", "BOTTOM_LEFT"] as const;
        return {
          segmentIndex: idx,
          phaseType: phase.phaseType,
          phaseTitle: phase.title,
          onScreenHeadline: `${phase.title} — ${phase.scientificPrinciple.toUpperCase()}`,
          narrationText: `${phase.keyMechanismSummary} Prinsip ${phase.scientificPrinciple} ini bekerja langsung pada komponen ${comp.name} secara sinkron.`,
          telemetrySnapshot: [
            {
              channelId: "ch_temp",
              startValue: 45 + idx * 12,
              endValue: 52 + idx * 12,
              sparklineHistory: [42, 48, 54, 61, 68, 52 + idx * 12],
              status: idx === 3 ? "WARNING" : "OPTIMAL",
            },
            {
              channelId: "ch_pressure",
              startValue: 4.2 + idx * 2.5,
              endValue: 5.8 + idx * 2.5,
              sparklineHistory: [4.2, 6.1, 8.4, 11.2, 13.5, 5.8 + idx * 2.5],
              status: "NOMINAL",
            },
            {
              channelId: "ch_flux",
              startValue: 65 + idx * 30,
              endValue: 85 + idx * 30,
              sparklineHistory: [60, 80, 110, 145, 175, 85 + idx * 30],
              status: idx === 3 ? "WARNING" : "OPTIMAL",
            },
            {
              channelId: "ch_efficiency",
              startValue: 88 + idx * 2,
              endValue: 90 + idx * 2,
              sparklineHistory: [86, 88, 90, 92, 94, 90 + idx * 2],
              status: "OPTIMAL",
            },
          ],
          callouts: [
            {
              id: `callout_${idx}_1`,
              componentId: comp.id,
              relativeTriggerRatio: 0.16,
              durationSeconds: 4.5,
              label: comp.name.toUpperCase(),
              value: comp.materialOrSpec,
              formulaOrFact: comp.physicsPrinciple,
              subtext: comp.roleInMechanism,
              accentColor: idx % 2 === 0 ? "#38BDF8" : "#F59E0B",
              anchor: comp.defaultAnchor,
              cardPosition: cardPositions[idx % cardPositions.length],
            },
          ],
        };
      });

  return {
    topic: blueprint.topic,
    totalSegments: 5,
    fullNarrationIndonesian: segments.map((s) => s.narrationText).join(" "),
    telemetryChannels,
    segments,
  };
}

export async function runScriptwriterAgent(blueprint: DeconstructionBlueprint): Promise<{
  script: ScriptArchitectOutput;
  modelUsed: string;
}> {
  const fallback = buildFallbackScript(blueprint);

  const userPrompt = `Generate the Indonesian narration script, synchronous telemetry metrics, and pop-up callout triggers for this engineering blueprint:

BLUEPRINT:
${JSON.stringify(blueprint, null, 2)}

Return ONLY valid JSON matching this exact structure and channel IDs:
${JSON.stringify(fallback, null, 2)}`;

  const { data, modelUsed } = await generateStructuredOmniroute({
    systemPrompt: SCRIPTWRITER_SYSTEM_PROMPT,
    userPrompt,
    schema: ScriptArchitectOutputSchema,
    preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
    temperature: 0.35,
    fallbackGenerator: () => fallback,
  });

  return { script: data, modelUsed };
}
