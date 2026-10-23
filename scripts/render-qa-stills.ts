import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const QA_DIR = path.resolve(process.cwd(), "public/renders/qa");
if (!fs.existsSync(QA_DIR)) {
  fs.mkdirSync(QA_DIR, { recursive: true });
}

interface StillJob {
  compositionId: string;
  frame: number;
  filename: string;
  description: string;
}

const jobs: StillJob[] = [
  // Solar Panel 4 Phases
  {
    compositionId: "SolarPanelShorts",
    frame: 210,
    filename: "solar_panel_phase0.png",
    description: "Solar Panel Phase 0: Everyday Hook / Assembled",
  },
  {
    compositionId: "SolarPanelShorts",
    frame: 720,
    filename: "solar_panel_phase1.png",
    description: "Solar Panel Phase 1: Cutaway Reveal / Frame Shifts Up",
  },
  {
    compositionId: "SolarPanelShorts",
    frame: 1290,
    filename: "solar_panel_phase2.png",
    description: "Solar Panel Phase 2: Component Zoom-In & Isolation (Busbar)",
  },
  {
    compositionId: "SolarPanelShorts",
    frame: 1800,
    filename: "solar_panel_phase3.png",
    description: "Solar Panel Phase 3: Practical Takeaway Checklist",
  },

  // Tsunami 4 Phases
  {
    compositionId: "TsunamiShorts",
    frame: 210,
    filename: "tsunami_phase0.png",
    description: "Tsunami Phase 0: Everyday Hook / Oceanic Plate Tension",
  },
  {
    compositionId: "TsunamiShorts",
    frame: 720,
    filename: "tsunami_phase1.png",
    description: "Tsunami Phase 1: Core Mechanism Cutaway / Fault Thrust Slip",
  },
  {
    compositionId: "TsunamiShorts",
    frame: 1320,
    filename: "tsunami_phase2.png",
    description: "Tsunami Phase 2: Component Zoom-In / Water Column Surge",
  },
  {
    compositionId: "TsunamiShorts",
    frame: 1860,
    filename: "tsunami_phase3.png",
    description: "Tsunami Phase 3: Practical Evacuation Checklist",
  },
];

console.log(`[QA_STILLS] Rendering ${jobs.length} QA stills to ${QA_DIR}...`);

for (const job of jobs) {
  const outPath = path.join(QA_DIR, job.filename);
  console.log(`\n📸 Rendering ${job.description} (Frame: ${job.frame})...`);
  const cmd = `npx remotion still src/remotion/index.ts ${job.compositionId} --port=4500 --frame=${job.frame} "${outPath}"`;
  execSync(cmd, { stdio: "inherit" });
  console.log(`✅ Saved: ${job.filename}`);
}

console.log("\n🎉 All QA still renders completed successfully!");
