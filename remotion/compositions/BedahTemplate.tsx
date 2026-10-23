import React from "react";
import {
  Sequence,
  useVideoConfig,
  Audio,
  interpolate,
  useCurrentFrame,
  spring,
} from "remotion";
import { IsometricRoom } from "../components/IsometricRoom";
import { FreonParticles } from "../components/FreonParticles";
import { KaraokeText, WordTiming } from "../components/KaraokeText";
import { renderDynamicSvgOrMarkup } from "../../web/lib/pabrik/svgRuntime";
import {
  buildSubtitles,
  wrapHeadline,
  valueAt,
  seriesPoints,
  valueColor,
  formatNumber,
  stateReadout,
  type BeatTiming,
} from "../../web/lib/pabrik/hud";
import type { Metric, Plan } from "../../web/lib/pabrik/types";

export interface BeatItem {
  beat_number: number;
  role?: string;
  text: string;
  visual: string;
  sfx_keyword?: string;
  tulisan_layar: string;
  hud?: { state: string };
  durationInFrames?: number;
  svgCode?: string;
}

export interface BedahTemplateProps {
  topic?: string;
  beats?: BeatItem[];
  metric?: Metric;
  wordTimings?: WordTiming[];
  audioUrl?: string;
  sfxTracks?: { url: string; startFrame: number }[];
}

export const BedahTemplate: React.FC<BedahTemplateProps> = ({
  topic = "KENAPA FREON AC GAK HABIS",
  beats = [],
  metric,
  wordTimings = [],
  audioUrl,
  sfxTracks = [],
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Fallback defaults if beats are empty
  const activeBeats =
    beats.length > 0
      ? beats
      : [
          {
            beat_number: 1,
            text: "Freon AC kamu gak akan pernah berkurang atau habis!",
            visual: "Kompresor AC isometric bersirkulasi tertutup",
            tulisan_layar: "SISTEM TERTUTUP",
          },
        ];

  const totalFrames = durationInFrames || 900;
  const framesPerBeat = Math.floor(totalFrames / activeBeats.length);
  const currentTimeSec = frame / fps;

  const timings: BeatTiming[] = activeBeats.map((b, idx) => ({
    beat: b.beat_number,
    start: (idx * framesPerBeat) / fps,
    end: ((idx + 1) * framesPerBeat) / fps,
  }));

  const activeMetric: Metric =
    metric && Array.isArray(metric.states) && metric.states.length > 0
      ? metric
      : {
          label: "TELEMETRI",
          unit: "%",
          decimals: 0,
          warn_at: 70,
          danger_at: 90,
          states: activeBeats.map((b, i) => ({
            id: b.hud?.state ?? `s${i + 1}`,
            value: Math.min(100, (i + 1) * 10),
            readout: b.tulisan_layar,
          })),
        };

  const planForHud: Plan = {
    beats: activeBeats.map((b, i) => ({
      beat_number: b.beat_number,
      role: (b.role as any) ?? "HOOK",
      text: b.text,
      visual: b.visual,
      sfx_keyword: b.sfx_keyword ?? "click",
      tulisan_layar: b.tulisan_layar,
      source_refs: [],
      hud: b.hud ?? {
        state: activeMetric.states[i]?.id ?? activeMetric.states[0].id,
      },
    })),
  };

  return (
    <div className="w-[1080px] h-[1920px] bg-[#F4F5F7] text-[#111111] overflow-hidden relative">
      {/* Background Narration Audio */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* SFX Audio Tracks (each constrained to 15 frames so only 1 SFX mounts at a time) */}
      {sfxTracks.map((sfx, idx) => (
        <Sequence key={idx} from={sfx.startFrame} durationInFrames={15}>
          <Audio src={sfx.url} volume={0.6} />
        </Sequence>
      ))}

      {/* Render 10 Beats in Sequence */}
      {activeBeats.map((beat, index) => {
        const beatStartFrame = index * framesPerBeat;
        const beatDuration = framesPerBeat;
        const beatDurationSec = beatDuration / fps;

        const subChunks = buildSubtitles(beat.text || "", 0, beatDurationSec);
        const relativeWords: WordTiming[] = subChunks.flatMap((c) =>
          c.words.map((w) => ({
            word: w.text,
            start: w.start,
            end: w.end,
          })),
        );

        return (
          <Sequence
            key={index}
            from={beatStartFrame}
            durationInFrames={beatDuration}
          >
            <BeatScene
              beat={beat}
              beatIndex={index}
              topic={topic}
              words={relativeWords}
              plan={planForHud}
              metric={activeMetric}
              timings={timings}
              globalTimeSec={currentTimeSec}
            />
          </Sequence>
        );
      })}
    </div>
  );
};

const BeatScene: React.FC<{
  beat: BeatItem;
  beatIndex: number;
  topic: string;
  words: WordTiming[];
  plan: Plan;
  metric: Metric;
  timings: BeatTiming[];
  globalTimeSec: number;
}> = ({
  beat,
  beatIndex,
  topic,
  words,
  plan,
  metric,
  timings,
  globalTimeSec,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    from: 0.92,
    to: 1,
    config: { damping: 14, stiffness: 120 },
  });

  // Camera zoom effect constrained to max 1.2x
  const cameraZoom = interpolate(frame, [0, 90], [1.0, 1.06], {
    extrapolateRight: "clamp",
  });

  const progress = Math.min(
    1,
    Math.max(0, frame / Math.max(durationInFrames - 1, 1)),
  );
  const isFullSvgScene = Boolean(
    beat.svgCode && beat.svgCode.includes("SvgScene"),
  );

  const currentVal = valueAt(plan, metric, timings, globalTimeSec);
  const valColor = valueColor(currentVal, metric);
  const formattedVal = formatNumber(currentVal, metric.decimals ?? 0);
  const readoutText = stateReadout(metric, plan, beatIndex);
  const roleBadge = beat.role || `TAHAP 0${beat.beat_number}`;
  const headlineLines = wrapHeadline(roleBadge, 22);
  const sparkPts = seriesPoints(plan, metric, timings, globalTimeSec);
  const totalDur = Math.max(1, timings[timings.length - 1]?.end ?? 30);
  const maxMetricVal = Math.max(1, ...metric.states.map((s) => s.value));
  const sparkPolyline = sparkPts
    .map(
      ([t, v]) =>
        `${Math.round((t / totalDur) * 160)},${Math.round(36 - (v / maxMetricVal) * 30)}`,
    )
    .join(" ");

  return (
    <IsometricRoom badge={`BEAT 0${beat.beat_number} // ${topic}`}>
      {/* HUD Telemetry Widget (from hud.ts) */}
      <div className="absolute top-24 right-8 z-30 bg-white/95 border-3 border-[#111111] rounded-xl px-4 py-3 shadow-[4px_4px_0px_#111111] flex items-center gap-4">
        <div>
          <div className="text-[11px] font-black uppercase tracking-wider text-[#8E8E93]">
            {metric.label ?? "TELEMETRI"} // {readoutText}
          </div>
          <div
            className="text-2xl font-black leading-tight"
            style={{ color: valColor }}
          >
            {formattedVal}{" "}
            <span className="text-sm font-bold">{metric.unit ?? ""}</span>
          </div>
        </div>
        {sparkPts.length > 1 && (
          <svg width="160" height="40" className="overflow-visible">
            <polyline
              fill="none"
              stroke={valColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={sparkPolyline}
            />
          </svg>
        )}
      </div>

      {/* Headline Highlighted Segments (wrapHeadline from hud.ts) */}
      {headlineLines.length > 0 && !isFullSvgScene && (
        <div className="absolute top-24 left-8 z-30 flex flex-col gap-1">
          {headlineLines.map((line, li) => (
            <div key={li} className="flex gap-2">
              {line.map((seg, si) => (
                <span
                  key={si}
                  className={`px-2 py-0.5 text-lg font-black uppercase border-2 border-[#111111] rounded ${
                    seg.hl
                      ? "bg-[#FF3B30] text-white"
                      : "bg-[#FFD60A] text-[#111111]"
                  }`}
                >
                  {seg.text}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Technical Freon Flow Particles */}
      {!isFullSvgScene && (
        <FreonParticles
          count={14}
          color={beat.beat_number % 2 === 0 ? "#FF3B30" : "#0A84FF"}
        />
      )}

      {/* Center Technical Isometric Rig */}
      <div
        className={
          isFullSvgScene
            ? "absolute inset-0 flex items-center justify-center"
            : "w-[880px] h-[880px] flex items-center justify-center relative"
        }
        style={{
          transform: isFullSvgScene
            ? undefined
            : `scale(${cameraZoom * scale})`,
          transition: "transform 0.1s ease-out",
        }}
      >
        {beat.svgCode ? (
          renderDynamicSvgOrMarkup({
            svgCode: beat.svgCode,
            visual: beat.visual,
            progress,
          })
        ) : (
          <DefaultIsometricSchematic beat={beat} />
        )}
      </div>

      {/* Bottom Subtitle Karaoke Word-by-word with 15% Safe Area */}
      <div className="absolute bottom-[16%] left-0 right-0 flex justify-center px-8 z-30">
        <KaraokeText words={words} label={beat.tulisan_layar} />
      </div>
    </IsometricRoom>
  );
};

// Default high-precision 30-degree isometric SVG blueprint
const DefaultIsometricSchematic: React.FC<{ beat: BeatItem }> = ({ beat }) => {
  return (
    <svg
      viewBox="0 0 800 800"
      className="w-full h-full drop-shadow-[12px_12px_0px_rgba(17,17,17,0.15)]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="solidShadow" x="0" y="0" width="120%" height="120%">
          <feDropShadow
            dx="8"
            dy="8"
            stdDeviation="0"
            floodColor="#111111"
            floodOpacity="0.2"
          />
        </filter>
      </defs>

      {/* Base Isometric Pedestal */}
      <g transform="translate(400, 480)">
        {/* Isometric Top */}
        <polygon
          points="0,-160 280,0 0,160 -280,0"
          fill="#FFFFFF"
          stroke="#111111"
          strokeWidth="4"
          filter="url(#solidShadow)"
        />
        {/* Isometric Left Side */}
        <polygon
          points="-280,0 0,160 0,220 -280,60"
          fill="#E5E5EA"
          stroke="#111111"
          strokeWidth="4"
        />
        {/* Isometric Right Side */}
        <polygon
          points="0,160 280,0 280,60 0,220"
          fill="#D1D1D6"
          stroke="#111111"
          strokeWidth="4"
        />

        {/* AC Compressor Component */}
        <g transform="translate(0, -70)">
          {/* Cylinder Base */}
          <path
            d="M -120,-60 C -120,-20 120,-20 120,-60 L 120,-180 C 120,-220 -120,-220 -120,-180 Z"
            fill="#FFFFFF"
            stroke="#111111"
            strokeWidth="4"
          />
          {/* Highlighting Active Zone */}
          <ellipse
            cx="0"
            cy="-180"
            rx="120"
            ry="40"
            fill="#FFD60A"
            stroke="#111111"
            strokeWidth="4"
          />

          {/* Copper Circulation Pipes (Closed-loop) */}
          <path
            d="M -90,-80 C -180,-60 -180,60 -60,80 C 60,100 180,40 120,-100"
            fill="none"
            stroke="#111111"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M -90,-80 C -180,-60 -180,60 -60,80 C 60,100 180,40 120,-100"
            fill="none"
            stroke="#0A84FF"
            strokeWidth="6"
            strokeDasharray="16 10"
            strokeLinecap="round"
          />
        </g>

        {/* Technical Callout Badge */}
        <g transform="translate(130, -260)">
          <line
            x1="-30"
            y1="40"
            x2="30"
            y2="-10"
            stroke="#111111"
            strokeWidth="3"
          />
          <rect x="30" y="-40" width="180" height="48" rx="8" fill="#111111" />
          <text
            x="120"
            y="-10"
            fill="#FFD60A"
            fontSize="18"
            fontWeight="900"
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
          >
            CLOSED SYSTEM
          </text>
        </g>
      </g>
    </svg>
  );
};
