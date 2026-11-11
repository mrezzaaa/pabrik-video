import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { ExplainerShot, ObjectModel } from "../../../lib/explainer/model";
import type { VisualScene } from "../../../lib/types";
import { ANTON_FAMILY } from "../../fonts";
import {
  buildScene,
  fitViewport,
  flowPath,
  layoutCallouts,
  pointAlong,
  shade,
  toScreen,
  type Face,
  type P2,
} from "../../engine/iso";

/**
 * Stage penjelas (skill isometric-explainer / blueprint-figure / motion-figure):
 *  - ISO_ASSEMBLY  : benda isometrik ber-shading, cutaway + exploded + zoom ke bagian
 *  - MECHANISM_FLOW: benda + partikel yang mengalir melewati bagian, tahap proses aktif
 *  - BLUEPRINT     : garis kerja biru (wireframe), dimensi dan callout bernomor
 * Semua state = fungsi murni dari frame -> aman untuk render paralel.
 */

const W = 1080;
const H = 1920;
const GEO = { x: 150, y: 330, w: 780, h: 980 };
const INK = "#0F172A";
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';

const DEFAULT_SHOT: ExplainerShot = {
  focus: [],
  cutaway: 0.6,
  explode: 0,
  zoom: 1,
  labels: "all",
  yaw: 0,
};

const ease = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });

const MEDIUM_COLOR: Record<string, string> = {
  spark: "#FFE14D",
  water: "#4FC3F7",
  air: "#E0F7FA",
  heat: "#FF7043",
  light: "#FFF59D",
  particle: "#39FF14",
  money: "#81C784",
  people: "#FFB74D",
};

function polygonPath(points: P2[]) {
  return `M${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("L")}Z`;
}

export const ExplainerStage: React.FC<{
  scene: VisualScene;
  model: ObjectModel;
  index: number;
}> = ({ scene, model, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps + (scene.visualOffset ?? 0);
  const mode = scene.visualType ?? "ISO_ASSEMBLY";
  const blueprint = mode === "BLUEPRINT";
  const accent = scene.accentColor || "#39FF14";
  const shot: ExplainerShot = { ...DEFAULT_SHOT, ...(scene.shot ?? {}) };

  // Transisi masuk: dari tampilan lebih "utuh" ke target shot.
  const k = ease(t, 0.05, 1.1);
  const cutaway = shot.cutaway * (0.35 + 0.65 * k);
  const explode = shot.explode * k;
  const zoom = 1 + (shot.zoom - 1) * ease(t, 0.15, 1.4);
  const yaw = shot.yaw + Math.sin(t * 0.6) * 6 + t * 2;

  const focusSet = new Set(shot.focus);
  const built = buildScene(model, { t, yaw, cutaway, explode }, focusSet);
  const focusCenter = shot.focus.length ? built.centers[shot.focus[0]] : undefined;
  // Viewport dihitung dari kondisi akhir supaya kamera tidak "bernapas" saat explode.
  const settled = buildScene(model, { t: 0, yaw: shot.yaw, cutaway: shot.cutaway, explode: shot.explode }, focusSet);
  const vp = fitViewport(settled.faces, GEO, zoom, focusCenter);

  const dimmed = (id: string) => focusSet.size > 0 && !focusSet.has(id);

  const renderFace = (face: Face, i: number) => {
    const dim = dimmed(face.partId);
    if (face.kind === "tube") {
      const a = toScreen(face.pts[0], vp);
      const b = toScreen(face.pts[1], vp);
      const w = Math.max(3, (face.width ?? 3) * vp.scale);
      return (
        <g key={i} opacity={dim ? 0.35 : 1}>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={blueprint ? "#9FD8FF" : INK} strokeWidth={w + 5} strokeLinecap="round" />
          <line
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={blueprint ? "#0A2540" : shade(face.color, 1.05)}
            strokeWidth={w}
            strokeLinecap="round"
          />
        </g>
      );
    }
    const d = polygonPath(face.pts.map((p) => toScreen(p, vp)));
    if (blueprint) {
      return (
        <path
          key={i}
          d={d}
          fill={face.kind === "cut" ? "url(#bpHatch)" : `rgba(120,200,255,${0.05 + face.light * 0.08})`}
          stroke={focusSet.has(face.partId) ? accent : "#9FD8FF"}
          strokeOpacity={dim ? 0.35 : 0.95}
          strokeWidth={focusSet.has(face.partId) ? 3 : 1.6}
          strokeLinejoin="round"
        />
      );
    }
    return (
      <g key={i} opacity={dim ? 0.42 : 1}>
        <path d={d} fill={shade(face.color, face.light)} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
        {face.kind === "cut" ? <path d={d} fill="url(#isoHatch)" stroke="none" /> : null}
      </g>
    );
  };

  // Partikel aliran (MECHANISM_FLOW; juga tipis di ISO bila ada flowId).
  const flow = model.flows.find((f) => f.id === shot.flowId) ?? (mode === "MECHANISM_FLOW" ? model.flows[0] : undefined);
  const particles: React.ReactNode[] = [];
  if (flow) {
    const path = flowPath(flow, built.centers);
    if (path.length >= 2) {
      const color = flow.color ?? MEDIUM_COLOR[flow.medium] ?? accent;
      const line = path.map((p) => toScreen(p, vp));
      particles.push(
        <polyline
          key="flow-line"
          points={line.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={color}
          strokeOpacity={0.55}
          strokeWidth={6}
          strokeDasharray="4 18"
          strokeDashoffset={-t * 120}
          strokeLinecap="round"
        />,
      );
      const n = 14;
      for (let i = 0; i < n; i += 1) {
        const u = (t * 0.32 + i / n) % 1;
        const p = toScreen(pointAlong(path, u), vp);
        const r = flow.medium === "spark" ? 9 + Math.sin(t * 20 + i) * 3 : 8;
        particles.push(
          <g key={`pt-${i}`}>
            <circle cx={p.x} cy={p.y} r={r * 2.4} fill={color} opacity={0.18} />
            <circle cx={p.x} cy={p.y} r={r} fill={color} stroke={INK} strokeWidth={2} />
          </g>,
        );
      }
      const end = line[line.length - 1];
      particles.push(
        <g key="flow-tag" opacity={ease(t, 0.4, 0.9)}>
          <rect x={end.x - 120} y={end.y + 26} width={240} height={50} rx={25} fill={color} stroke={INK} strokeWidth={3} />
          <text x={end.x} y={end.y + 61} textAnchor="middle" fontFamily={ANTON_FAMILY} fontSize={30} fill={INK}>
            {flow.label}
          </text>
        </g>,
      );
    }
  }

  // Callout label menempel ke bagian 3D (tanpa tabrakan).
  const labelParts =
    shot.labels === "none"
      ? []
      : model.parts.filter((p) => (shot.labels === "all" || focusSet.has(p.id)) && built.centers[p.id]);
  const callouts = layoutCallouts(
    labelParts.slice(0, 6).map((p) => ({ id: p.id, text: p.label, anchor: toScreen(built.centers[p.id], vp) })),
    { w: W, top: 380, bottom: 1330 },
  );

  // Dimensi blueprint pada bagian fokus (atau bagian pertama).
  const dimPart = blueprint ? model.parts.find((p) => p.id === (shot.focus[0] ?? model.parts[0].id)) : undefined;

  const steps = model.steps ?? [];
  const activeStep = shot.step ?? -1;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <pattern id="isoHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke={INK} strokeOpacity="0.45" strokeWidth="3" />
          </pattern>
          <pattern id="bpHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#9FD8FF" strokeOpacity="0.6" strokeWidth="1.5" />
          </pattern>
          <radialGradient id="floorGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={blueprint ? "#1B4D7A" : "#ffffff"} stopOpacity={blueprint ? 0.5 : 0.12} />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx={W / 2} cy={GEO.y + GEO.h * 0.78} rx={460} ry={170} fill="url(#floorGlow)" />

        {built.faces.map(renderFace)}
        {particles}

        {dimPart && built.centers[dimPart.id]
          ? (() => {
              const c = built.centers[dimPart.id];
              const top = toScreen({ ...c, z: c.z + dimPart.size.z * 0.45 }, vp);
              const bot = toScreen({ ...c, z: c.z - dimPart.size.z * 0.55 }, vp);
              const x = Math.min(W - 70, Math.max(top.x, bot.x) + 90);
              return (
                <g opacity={ease(t, 0.3, 0.8)} fontFamily={MONO}>
                  <line x1={x} y1={top.y} x2={x} y2={bot.y} stroke={accent} strokeWidth={2.5} />
                  <line x1={x - 14} y1={top.y} x2={x + 14} y2={top.y} stroke={accent} strokeWidth={2.5} />
                  <line x1={x - 14} y1={bot.y} x2={x + 14} y2={bot.y} stroke={accent} strokeWidth={2.5} />
                  <line x1={top.x} y1={top.y} x2={x} y2={top.y} stroke={accent} strokeWidth={1} strokeDasharray="6 6" />
                  <line x1={bot.x} y1={bot.y} x2={x} y2={bot.y} stroke={accent} strokeWidth={1} strokeDasharray="6 6" />
                </g>
              );
            })()
          : null}

        {callouts.map((c, i) => {
          const p = ease(t, 0.35 + i * 0.12, 0.75 + i * 0.12);
          const focus = focusSet.has(c.id);
          const label = blueprint ? `${String(i + 1).padStart(2, "0")}  ${c.text}` : c.text;
          const w = Math.min(470, 40 + label.length * 21);
          const bx = c.side === "left" ? c.x : c.x - w;
          const edge = c.side === "left" ? c.x + w : c.x - w;
          return (
            <g key={c.id} opacity={p}>
              <polyline
                points={`${c.anchor.x},${c.anchor.y} ${(edge + c.anchor.x) / 2},${c.y} ${edge},${c.y}`}
                fill="none"
                stroke={focus ? accent : blueprint ? "#9FD8FF" : "#F8FAFC"}
                strokeWidth={3}
                strokeDasharray={`${1400 * p} 1400`}
              />
              <circle cx={c.anchor.x} cy={c.anchor.y} r={9} fill={focus ? accent : "#F8FAFC"} stroke={INK} strokeWidth={3} />
              <rect
                x={bx}
                y={c.y - 30}
                width={w}
                height={60}
                rx={blueprint ? 4 : 30}
                fill={blueprint ? "rgba(10,37,64,0.92)" : focus ? accent : "rgba(15,23,42,0.92)"}
                stroke={focus ? accent : blueprint ? "#9FD8FF" : "rgba(248,250,252,0.35)"}
                strokeWidth={2.5}
              />
              <text
                x={bx + w / 2}
                y={c.y + 12}
                textAnchor="middle"
                fontFamily={blueprint ? MONO : ANTON_FAMILY}
                fontSize={blueprint ? 26 : 34}
                letterSpacing={blueprint ? 2 : 1}
                fill={focus && !blueprint ? INK : "#F8FAFC"}
              >
                {label}
              </text>
            </g>
          );
        })}

        {mode === "MECHANISM_FLOW" && steps.length >= 2 ? (
          <g transform={`translate(0 1400)`} opacity={ease(t, 0.2, 0.6)}>
            {steps.map((s, i) => {
              const n = steps.length;
              const cell = (W - 120) / n;
              const x = 60 + i * cell;
              const on = i === activeStep;
              const done = i < activeStep;
              return (
                <g key={i}>
                  <rect
                    x={x + 6}
                    y={0}
                    width={cell - 12}
                    height={70}
                    rx={10}
                    fill={on ? accent : done ? "rgba(57,255,20,0.18)" : "rgba(15,23,42,0.85)"}
                    stroke={on ? accent : "rgba(248,250,252,0.3)"}
                    strokeWidth={2}
                  />
                  <text
                    x={x + cell / 2}
                    y={45}
                    textAnchor="middle"
                    fontFamily={ANTON_FAMILY}
                    fontSize={n > 4 ? 22 : 26}
                    fill={on ? INK : "#E2E8F0"}
                  >
                    {`${i + 1}. ${s}`.slice(0, n > 4 ? 16 : 22)}
                  </text>
                </g>
              );
            })}
          </g>
        ) : null}

        <g fontFamily={MONO} opacity={0.85}>
          <text x={60} y={300} fontSize={22} letterSpacing={5} fill={accent}>
            {`${blueprint ? "BLUEPRINT" : mode === "MECHANISM_FLOW" ? "MEKANISME" : "POTONGAN"} // FIG.${String(index + 1).padStart(2, "0")}`}
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** Latar untuk stage penjelas: grid blueprint gelap (bukan foto). */
export const ExplainerBackdrop: React.FC<{ blueprint: boolean }> = ({ blueprint }) => (
  <AbsoluteFill
    style={{
      background: blueprint
        ? "radial-gradient(ellipse at 50% 45%, #12395E 0%, #0A2540 55%, #061629 100%)"
        : "radial-gradient(ellipse at 50% 42%, #1E293B 0%, #0F172A 55%, #070B14 100%)",
    }}
  >
    <AbsoluteFill
      style={{
        opacity: blueprint ? 0.35 : 0.14,
        backgroundImage:
          "linear-gradient(rgba(159,216,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(159,216,255,0.5) 1px, transparent 1px)",
        backgroundSize: "54px 54px",
      }}
    />
  </AbsoluteFill>
);

