import fs from "fs";
import path from "path";
import { z } from "zod";
import * as k from "./anatomy-kit";
import { generateStructuredOmniroute } from "./omniroute";
import { env } from "@/config/env";
import type { DeconstructionBlueprint } from "@/schemas/video-blueprint";

export interface AnatomyPartItem {
  id: string;
  name: string;
  layer: "BASE" | "OUTER_CUTAWAY_SHELL" | "INTERNAL_CHAMBER" | "CORE_MECHANISM" | "ZOOM_SUBPART";
  shape: "cylinder" | "slab" | "box" | "capsule" | "tube" | "hollow-cylinder" | "ring" | "coil" | "lathe";
  color: string;
  tone: "hi" | "mid" | "lo" | "faint";
  position3D: [number, number, number];
  dimensions: {
    w?: number;
    d?: number;
    h?: number;
    r?: number;
    cutawayAngle?: number;
  };
  explodeOffset: [number, number, number];
  paths: {
    fill: string;
    outline: string;
    crease: string;
    top: string;
    shades: string[];
    halo?: string;
  };
  depth: number;
}

export interface AnatomyFigureResult {
  topic: string;
  kebabCase: string;
  reactComponentPath: string;
  svgPath: string;
  htmlPath: string;
  svgContent: string;
  parts: Array<{
    id: string;
    name: string;
    fillColor: string;
    path: string;
    position3D: [number, number, number];
    tone: "hi" | "mid" | "lo" | "faint";
  }>;
  readout: string;
}

const AnatomyPartDesignSchema = z.object({
  id: z.string(),
  name: z.string(),
  layer: z.enum(["BASE", "OUTER_CUTAWAY_SHELL", "INTERNAL_CHAMBER", "CORE_MECHANISM", "ZOOM_SUBPART"]),
  shape: z.enum(["cylinder", "slab", "box", "capsule", "tube", "hollow-cylinder", "ring", "coil", "lathe"]),
  color: z.string(),
  tone: z.enum(["hi", "mid", "lo", "faint"]).default("mid"),
  position: z.tuple([z.number(), z.number(), z.number()]),
  dimensions: z.object({
    w: z.number().optional(),
    d: z.number().optional(),
    h: z.number().optional(),
    r: z.number().optional(),
    cutawayAngle: z.number().optional(),
  }),
  explodeOffset: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
});

const AnatomyDesignOutputSchema = z.object({
  plateTitle: z.string(),
  figNumber: z.string().default("Fig 1"),
  readout: z.string(),
  hint: z.string().default("Isometric 4-tone cutaway · Painter's depth order"),
  parts: z.array(AnatomyPartDesignSchema).min(4).max(12),
});

export type AnatomyDesignOutput = z.infer<typeof AnatomyDesignOutputSchema>;

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 45);
}

/**
 * Parses user or pipeline prompt to extract topic, coreTruth, and component names.
 */
function parseAnatomyPrompt(prompt: string): {
  topic: string;
  coreTruth: string;
  components: string[];
} {
  let topic = "Universal Mechanism";
  let coreTruth = "Physical cause and effect explained via mechanical cutaway anatomy.";
  const components: string[] = [];

  const explainMatch = prompt.match(/\/anatomy\s+explain\s+([^-|\n]+)(?:\s*-\s*([^\n]+))?/i);
  if (explainMatch) {
    topic = explainMatch[1]?.trim() || topic;
    if (explainMatch[2]) coreTruth = explainMatch[2].trim();
  } else {
    const rawLines = prompt.split("\n");
    if (rawLines[0]) topic = rawLines[0].replace(/^[#\s]+/, "").trim();
  }

  const compMatch = prompt.match(/Show components:\s*([^\n]+)/i);
  if (compMatch && compMatch[1]) {
    compMatch[1].split(",").forEach((c) => {
      const trimmed = c.trim();
      if (trimmed) components.push(trimmed);
    });
  }

  return { topic, coreTruth, components };
}

/**
 * Fallback geometry generator when LLM is offline or in quick test mode.
 */
function createProceduralAnatomyDesign(
  topic: string,
  coreTruth: string,
  components: string[]
): AnatomyDesignOutput {
  const isCat = /kucing|cat|feline/i.test(topic);
  const isKecap = /kecap|sauce|viscous|cairan/i.test(topic);
  const isTumbler = /tumbler|thermos|panas|vakum|vacuum/i.test(topic);

  if (isCat) {
    return {
      plateTitle: "Feline Righting Reflex",
      figNumber: "Fig 1",
      readout: "14.2 rad/s · 120 ms reaction · 180° rotation",
      hint: "Front/back axial counter-rotation without external torque",
      parts: [
        {
          id: "part_base_pad",
          name: "Landasan Kontak Bawah",
          layer: "BASE",
          shape: "slab",
          color: "#E2E8F0",
          tone: "lo",
          position: [0, 0, -30],
          dimensions: { w: 180, d: 120, h: 8, r: 8 },
          explodeOffset: [0, 0, -20],
        },
        {
          id: "part_outer_fur",
          name: "Kulit & Bulu Luar (90° Cutaway)",
          layer: "OUTER_CUTAWAY_SHELL",
          shape: "hollow-cylinder",
          color: "#F1F5F9",
          tone: "hi",
          position: [0, 0, 0],
          dimensions: { r: 38, h: 90, cutawayAngle: 270 },
          explodeOffset: [0, -35, 15],
        },
        {
          id: "part_spine_axis",
          name: "Kolom Tulang Belakang Fleksibel",
          layer: "INTERNAL_CHAMBER",
          shape: "cylinder",
          color: "#93C5FD",
          tone: "mid",
          position: [0, 0, 8],
          dimensions: { r: 14, h: 74 },
          explodeOffset: [0, 0, 0],
        },
        {
          id: "part_core_muscles",
          name: "Mekanisme Otot Rotasi Aksial",
          layer: "CORE_MECHANISM",
          shape: "ring",
          color: "#FACC15",
          tone: "hi",
          position: [0, 0, 36],
          dimensions: { r: 24, h: 18 },
          explodeOffset: [0, 25, 0],
        },
        {
          id: "part_vestibular",
          name: "Sensor Keseimbangan Vestibular",
          layer: "ZOOM_SUBPART",
          shape: "capsule",
          color: "#F87171",
          tone: "hi",
          position: [0, 0, 72],
          dimensions: { r: 12, h: 22 },
          explodeOffset: [0, 0, 30],
        },
      ],
    };
  }

  if (isKecap) {
    return {
      plateTitle: "Viscous Fluid Dynamics (Kecap)",
      figNumber: "Fig 1",
      readout: "6,200 cP viskositas · 0.05 ml/s flow · shear thinning",
      hint: "Adhesion boundary layer & air lock resistance",
      parts: [
        {
          id: "part_base_stand",
          name: "Dudukan Alas Botol",
          layer: "BASE",
          shape: "slab",
          color: "#E2E8F0",
          tone: "lo",
          position: [0, 0, -25],
          dimensions: { w: 160, d: 110, h: 8, r: 6 },
          explodeOffset: [0, 0, -20],
        },
        {
          id: "part_bottle_casing",
          name: "Badan Kaca Botol (Cutaway)",
          layer: "OUTER_CUTAWAY_SHELL",
          shape: "hollow-cylinder",
          color: "#F8FAFC",
          tone: "hi",
          position: [0, 0, 0],
          dimensions: { r: 36, h: 80, cutawayAngle: 270 },
          explodeOffset: [0, -30, 10],
        },
        {
          id: "part_neck_nozzle",
          name: "Leher Botol Sempit",
          layer: "INTERNAL_CHAMBER",
          shape: "cylinder",
          color: "#94A3B8",
          tone: "mid",
          position: [0, 0, 75],
          dimensions: { r: 16, h: 32 },
          explodeOffset: [0, 0, 25],
        },
        {
          id: "part_viscous_fluid",
          name: "Cairan Kental Non-Newtonian",
          layer: "CORE_MECHANISM",
          shape: "cylinder",
          color: "#451A03",
          tone: "hi",
          position: [0, 0, 8],
          dimensions: { r: 26, h: 62 },
          explodeOffset: [0, 20, 0],
        },
        {
          id: "part_meniscus",
          name: "Meniscus & Lapisan Adherensi",
          layer: "ZOOM_SUBPART",
          shape: "capsule",
          color: "#F59E0B",
          tone: "hi",
          position: [0, 0, 70],
          dimensions: { r: 13, h: 18 },
          explodeOffset: [0, 0, 20],
        },
      ],
    };
  }

  // Tumbler / Universal fallback
  return {
    plateTitle: isTumbler ? "Vacuum Insulation Dynamics" : topic.slice(0, 32),
    figNumber: "Fig 1",
    readout: isTumbler ? "0.005 Pa vakum · 0.001 W/mK · 95°C retensi" : "Mechanical Cutaway · 100% Dynamic",
    hint: "Dual-wall heat transfer elimination",
    parts: [
      {
        id: "part_base_stand",
        name: "Landasan Insulasi Bawah",
        layer: "BASE",
        shape: "slab",
        color: "#E2E8F0",
        tone: "lo",
        position: [0, 0, -25],
        dimensions: { w: 160, d: 110, h: 8, r: 6 },
        explodeOffset: [0, 0, -20],
      },
      {
        id: "part_outer_shell",
        name: "Dinding Luar Stainless (90° Cutaway)",
        layer: "OUTER_CUTAWAY_SHELL",
        shape: "hollow-cylinder",
        color: "#E2E8F0",
        tone: "hi",
        position: [0, 0, 0],
        dimensions: { r: 36, h: 88, cutawayAngle: 270 },
        explodeOffset: [0, -35, 10],
      },
      {
        id: "part_vacuum_chamber",
        name: "Lapisan Vakum Termal (Hampa Udara)",
        layer: "INTERNAL_CHAMBER",
        shape: "cylinder",
        color: "#38BDF8",
        tone: "mid",
        position: [0, 0, 4],
        dimensions: { r: 30, h: 78 },
        explodeOffset: [0, 0, 0],
      },
      {
        id: "part_inner_flask",
        name: "Tabung Dalam Reflektif",
        layer: "CORE_MECHANISM",
        shape: "cylinder",
        color: "#FACC15",
        tone: "hi",
        position: [0, 0, 8],
        dimensions: { r: 24, h: 70 },
        explodeOffset: [0, 25, 0],
      },
      {
        id: "part_stopper_seal",
        name: "Tutup Seal Silikon Kedap Panas",
        layer: "ZOOM_SUBPART",
        shape: "capsule",
        color: "#F87171",
        tone: "hi",
        position: [0, 0, 78],
        dimensions: { r: 18, h: 22 },
        explodeOffset: [0, 0, 30],
      },
    ],
  };
}

/**
 * Computes exact 4-tone shaded isometric SVG paths for every part using anatomy-kit.
 */
function buildComputedAnatomyParts(
  design: AnatomyDesignOutput,
  projection: k.Projection
): AnatomyPartItem[] {
  const P = projection;

  const computed = design.parts.map((p) => {
    const [px, py, pz] = p.position;
    const dims = p.dimensions;
    let paths: {
      fill: string;
      outline: string;
      crease: string;
      top: string;
      shades: string[];
      halo?: string;
    };

    if (p.shape === "slab") {
      const w = dims.w ?? 140;
      const d = dims.d ?? 90;
      const h = dims.h ?? 8;
      const r = dims.r ?? 6;
      const plan: k.Plan = { x: px - w / 2, y: py - d / 2, w, d, r };
      const slab = k.slabOf(plan, pz, h, P, 6, 1.2);
      paths = {
        fill: slab.fill,
        outline: slab.outline,
        crease: slab.crease,
        top: slab.top,
        shades: slab.shades,
      };
    } else if (p.shape === "hollow-cylinder" || p.layer === "OUTER_CUTAWAY_SHELL") {
      // 90° or 270° cutaway cylinder showing inside
      const r = dims.r ?? 34;
      const h = dims.h ?? 80;
      const cutawayAngle = dims.cutawayAngle ?? 270;
      const steps = 36;
      const arcSteps = Math.round((steps * cutawayAngle) / 360);
      const ringPoints: k.Plane[] = [];

      for (let s = 0; s <= arcSteps; s++) {
        const rad = (s / steps) * Math.PI * 2;
        ringPoints.push([px + r * Math.cos(rad), py + r * Math.sin(rad)]);
      }
      ringPoints.push([px, py]); // Center notch cutaway

      const extr = k.extrude(ringPoints, pz, h, P, { convex: false, bevel: 1.0 });
      paths = {
        fill: extr.fill,
        outline: extr.outline,
        crease: extr.crease,
        top: extr.top,
        shades: extr.shades,
      };
    } else {
      // Standard solid cylinder, capsule, or core
      const r = dims.r ?? 24;
      const h = dims.h ?? 60;
      const cyl = k.cylinder(px, py, r, pz, h, P, 28, 0.8);
      paths = {
        fill: cyl.fill,
        outline: cyl.outline,
        crease: cyl.crease,
        top: cyl.top,
        shades: cyl.shades,
      };
    }

    const depth = k.depthOf([px, py, pz], P);

    return {
      id: p.id,
      name: p.name,
      layer: p.layer,
      shape: p.shape,
      color: p.color,
      tone: p.tone,
      position3D: p.position,
      dimensions: p.dimensions,
      explodeOffset: p.explodeOffset,
      paths,
      depth,
    };
  });

  // Painter's order: sort strictly by depth back-to-front
  return computed.sort((a, b) => a.depth - b.depth);
}

/**
 * Generates the clean standalone SVG markup.
 */
function renderStandaloneSvg(
  design: AnatomyDesignOutput,
  parts: AnatomyPartItem[],
  width = 1080,
  height = 1080
): string {
  const partsMarkup = parts
    .map((p) => {
      const shades = p.paths.shades
        .map((s, idx) => (s ? `<path class="iso-shade" data-shade="${idx}" d="${s}" />` : ""))
        .join("");

      return `
    <!-- PART: ${p.name} (${p.layer}) -->
    <g class="iso-solid" id="${p.id}" data-tone="${p.tone}">
      <path class="iso-fill" fill="${p.color}" d="${p.paths.fill}" />
      ${shades}
      ${p.paths.top ? `<path class="iso-top" d="${p.paths.top}" />` : ""}
      ${p.paths.crease ? `<path class="iso-line iso-crease" stroke="#64748B" d="${p.paths.crease}" />` : ""}
      <path class="iso-line iso-edge" stroke="#1E293B" stroke-width="1.8" d="${p.paths.outline}" />
    </g>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="iso" data-theme="light">
  <defs>
    <style>
      .iso {
        --anatomy-paper: #FBFBFA;
        --anatomy-face: #FFFFFF;
        --anatomy-top: #FFFFFF;
        --anatomy-shade-0: #DCDCD9;
        --anatomy-shade-1: #E5E5E2;
        --anatomy-shade-2: #EDEDEA;
        --anatomy-shade-3: #F4F4F1;
        --anatomy-edge: #1E293B;
        --anatomy-crease: #64748B;
        --anatomy-text: #1E293B;
        --anatomy-muted: #64748B;
      }
      .iso-fill { stroke: none; }
      .iso-shade[data-shade="0"] { fill: var(--anatomy-shade-0); opacity: 0.35; }
      .iso-shade[data-shade="1"] { fill: var(--anatomy-shade-1); opacity: 0.28; }
      .iso-shade[data-shade="2"] { fill: var(--anatomy-shade-2); opacity: 0.20; }
      .iso-shade[data-shade="3"] { fill: var(--anatomy-shade-3); opacity: 0.12; }
      .iso-top { fill: rgba(255, 255, 255, 0.45); }
      .iso-line { fill: none; stroke-linecap: round; stroke-linejoin: round; }
      .iso-crease { stroke: var(--anatomy-crease); stroke-width: 1.2px; stroke-dasharray: 2 3; }
      .iso-edge { stroke: var(--anatomy-edge); stroke-width: 1.8px; }
      .plate-card { fill: #FFFFFF; stroke: #CBD5E1; stroke-width: 1.5; rx: 16; }
      .plate-text { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 14px; fill: #64748B; }
      .plate-title { font-weight: 700; fill: #0F172A; text-transform: uppercase; letter-spacing: 0.08em; }
    </style>
  </defs>

  <!-- Ambient shadow pool -->
  <ellipse cx="${width / 2}" cy="${height / 2 + 190}" rx="280" ry="85" fill="#0F172A" opacity="0.08" filter="blur(20px)" />

  <!-- Isometric Parts Group -->
  <g transform="translate(0, -30)">
    ${partsMarkup}
  </g>

  <!-- Framed Card Overlay -->
  <g class="plate-frame" opacity="0.85">
    <text x="60" y="${height - 40}" class="plate-text">ANATOMY SKILL · 4-TONE ISO</text>
    <text x="${width - 60}" y="${height - 40}" class="plate-text" text-anchor="end" font-weight="600" fill="#0F172A">${design.readout}</text>
  </g>
</svg>`;
}

/**
 * Generates the clean React/Next.js component markup (`figure.tsx`).
 */
function renderReactComponent(
  design: AnatomyDesignOutput,
  parts: AnatomyPartItem[]
): string {
  const partsCode = parts
    .map((p) => {
      const [ox, oy, oz] = p.explodeOffset;
      const shadesCode = p.paths.shades
        .map((s, idx) =>
          s ? `            <path className="iso-shade" data-shade="${idx}" d="${s}" />` : ""
        )
        .filter(Boolean)
        .join("\n");

      return `      {/* PART: ${p.name} */}
      <g
        id="${p.id}"
        style={{
          transform: isExploded ? "translate3d(${ox * 1.5}px, ${oy * 1.5 - oz}px, 0)" : "none",
          transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <path fill="${p.color}" d="${p.paths.fill}" />
${shadesCode}
        ${p.paths.top ? `<path className="iso-top" d="${p.paths.top}" fill="rgba(255,255,255,0.4)" />` : ""}
        ${p.paths.crease ? `<path className="iso-line iso-crease" stroke="#64748B" strokeWidth={1.2} strokeDasharray="2 3" d="${p.paths.crease}" fill="none" />` : ""}
        <path className="iso-line iso-edge" stroke="#1E293B" strokeWidth={1.8} d="${p.paths.outline}" fill="none" />
      </g>`;
    })
    .join("\n\n");

  return `"use client";

import React from "react";

export interface AnatomyFigureProps {
  isExploded?: boolean;
  activePhase?: number;
  showReadout?: boolean;
  frame?: number;
  style?: React.CSSProperties;
}

export default function Figure({
  isExploded = false,
  activePhase = 0,
  showReadout = true,
  frame = 0,
  style,
}: AnatomyFigureProps) {
  return (
    <div
      className="iso"
      data-theme="light"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        ...style,
      }}
    >
      <svg
        viewBox="0 0 1080 1080"
        width="100%"
        height="100%"
        style={{ overflow: "visible" }}
      >
        {/* Ambient Contact Shadow */}
        <ellipse
          cx={540}
          cy={730}
          rx={280}
          ry={85}
          fill="#0F172A"
          opacity={0.08}
          style={{ filter: "blur(20px)" }}
        />

        {/* 3D Isometric Anatomical Assembly */}
        <g transform="translate(0, -30)">
${partsCode}
        </g>

        {/* Card Header & Footer Overlay */}
        {showReadout && (
          <g style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, opacity: 0.85 }}>
            <text x={60} y={1040} fill="#64748B">
              ANATOMY SKILL · 4-TONE ISO
            </text>
            <text x={1020} y={1040} fill="#0F172A" textAnchor="end" fontWeight="600">
              ${design.readout}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
`;
}

/**
 * Generates the clean standalone HTML preview page (`index.html`).
 */
function renderHtmlPreview(
  design: AnatomyDesignOutput,
  svgContent: string
): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${design.figNumber}: ${design.plateTitle} - Anatomy Skill</title>
  <style>
    body {
      margin: 0;
      padding: 32px 16px;
      background: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .container {
      width: 100%;
      max-width: 720px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
      padding: 24px;
      box-sizing: border-box;
    }
    h1 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #0F172A;
    }
    p {
      margin: 0 0 16px 0;
      color: #64748B;
      font-size: 14px;
    }
    .svg-wrapper {
      width: 100%;
      border: 1px solid #F1F5F9;
      border-radius: 12px;
      background: #FAFAFA;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${design.figNumber}: ${design.plateTitle}</h1>
    <p>${design.hint} — <em>${design.readout}</em></p>
    <div class="svg-wrapper">
      ${svgContent}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Main entry point: Generates an Anatomy Figure for any topic.
 */
export async function generateAnatomyFigure(
  promptOrParams:
    | string
    | {
        topic: string;
        coreSimpleTruth?: string;
        components?: string[];
        blueprint?: DeconstructionBlueprint;
      }
): Promise<AnatomyFigureResult> {
  let topic = "Universal Mechanism";
  let coreTruth = "Physical mechanical cutaway.";
  let components: string[] = [];

  if (typeof promptOrParams === "string") {
    const parsed = parseAnatomyPrompt(promptOrParams);
    topic = parsed.topic;
    coreTruth = parsed.coreTruth;
    components = parsed.components;
  } else {
    topic = promptOrParams.topic;
    coreTruth = promptOrParams.coreSimpleTruth || promptOrParams.blueprint?.coreSimpleTruth || coreTruth;
    components =
      promptOrParams.components ||
      promptOrParams.blueprint?.components?.map((c) => c.name) ||
      [];
  }

  const kebabCase = toKebabCase(topic) || "universal-cutaway";

  // 1. Generate design via LLM with procedural fallback
  let design: AnatomyDesignOutput;
  try {
    const systemPrompt = `You are the Anatomy Skill CAD Designer (wheresryan22/anatomy).
Your job is to deconstruct ANY physical, technical, or biological Indonesian topic into an isometric 4-tone cutaway assembly with real solid parts.

RULES:
1. "The object IS the explanation". No abstract slabs or floating boxes.
2. 4 physical layers: BASE, OUTER_CUTAWAY_SHELL (with 90° or 270° cutaway), INTERNAL_CHAMBER, CORE_MECHANISM, ZOOM_SUBPART.
3. Return 5 to 8 distinct physical parts tailored to "${topic}".
4. All parts must sit on other parts or be coaxially nested.
5. Provide a realistic technical readout and title for the card frame.`;

    const userPrompt = `Deconstruct this exact Indonesian topic into an Anatomy Figure Parts Design:
TOPIC: "${topic}"
CORE TRUTH: "${coreTruth}"
KEY COMPONENTS: ${JSON.stringify(components)}

Output valid JSON matching this schema:
{
  "plateTitle": "Short English/Indonesian Title",
  "figNumber": "Fig 1",
  "readout": "e.g. 14.2 rad/s · 120 ms reaction · 180° rotation",
  "hint": "Technical mechanism summary",
  "parts": [
    {
      "id": "part_1",
      "name": "Component Name",
      "layer": "BASE | OUTER_CUTAWAY_SHELL | INTERNAL_CHAMBER | CORE_MECHANISM | ZOOM_SUBPART",
      "shape": "cylinder | slab | box | capsule | tube | hollow-cylinder | ring",
      "color": "#HEX",
      "tone": "hi | mid | lo | faint",
      "position": [0, 0, 0],
      "dimensions": { "w": 120, "d": 80, "h": 60, "r": 30, "cutawayAngle": 270 },
      "explodeOffset": [0, -30, 20]
    }
  ]
}`;

    const { data } = await generateStructuredOmniroute({
      systemPrompt,
      userPrompt,
      schema: AnatomyDesignOutputSchema,
      preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
      temperature: 0.25,
    });
    design = data;
  } catch (err) {
    console.warn(`[AnatomyWrapper] LLM design fallback to procedural for "${topic}":`, err instanceof Error ? err.message : String(err));
    design = createProceduralAnatomyDesign(topic, coreTruth, components);
  }

  // 2. Set up isometric projection
  // Centers drawing nicely inside 1080x1080 viewport
  const projection: k.Projection = {
    origin: [540, 520],
    scale: 3.2,
    azimuth: 42,
    elevation: 30,
  };

  // 3. Compute 4-tone shaded isometric geometry
  const computedParts = buildComputedAnatomyParts(design, projection);

  // 4. Generate SVG, React TSX, and HTML preview
  const svgContent = renderStandaloneSvg(design, computedParts, 1080, 1080);
  const tsxContent = renderReactComponent(design, computedParts);
  const htmlContent = renderHtmlPreview(design, svgContent);

  // 5. Write to target directories:
  // Root: examples/${kebabCase}/
  // Source: src/examples/${kebabCase}/
  // Public: public/figures/${kebabCase}/
  const cwd = process.cwd();
  const rootExampleDir = path.join(cwd, "examples", kebabCase);
  const srcExampleDir = path.join(cwd, "src", "examples", kebabCase);
  const publicFigureDir = path.join(cwd, "public", "figures", kebabCase);

  for (const dir of [rootExampleDir, srcExampleDir, publicFigureDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save files
  fs.writeFileSync(path.join(rootExampleDir, "figure.svg"), svgContent, "utf-8");
  fs.writeFileSync(path.join(rootExampleDir, "figure.tsx"), tsxContent, "utf-8");
  fs.writeFileSync(path.join(rootExampleDir, "index.html"), htmlContent, "utf-8");

  fs.writeFileSync(path.join(srcExampleDir, "figure.svg"), svgContent, "utf-8");
  fs.writeFileSync(path.join(srcExampleDir, "figure.tsx"), tsxContent, "utf-8");
  fs.writeFileSync(path.join(srcExampleDir, "index.html"), htmlContent, "utf-8");

  fs.writeFileSync(path.join(publicFigureDir, "figure.svg"), svgContent, "utf-8");
  fs.writeFileSync(path.join(publicFigureDir, "index.html"), htmlContent, "utf-8");

  console.log(`[AnatomyWrapper] ✅ Generated Anatomy Figure for "${topic}" in examples/${kebabCase}/`);

  return {
    topic,
    kebabCase,
    reactComponentPath: `@/examples/${kebabCase}/figure`,
    svgPath: `/figures/${kebabCase}/figure.svg`,
    htmlPath: `examples/${kebabCase}/index.html`,
    svgContent,
    parts: computedParts.map((p) => ({
      id: p.id,
      name: p.name,
      fillColor: p.color,
      path: p.paths.fill,
      position3D: p.position3D,
      tone: p.tone,
    })),
    readout: design.readout,
  };
}
