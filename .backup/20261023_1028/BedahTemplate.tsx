import React from 'react';
import {
  Sequence,
  useVideoConfig,
  Audio,
  interpolate,
  useCurrentFrame,
  spring
} from 'remotion';
import { IsometricRoom } from '../components/IsometricRoom';
import { FreonParticles } from '../components/FreonParticles';
import { KaraokeText, WordTiming } from '../components/KaraokeText';

export interface BeatItem {
  beat_number: number;
  text: string;
  visual: string;
  sfx_keyword?: string;
  tulisan_layar: string;
  durationInFrames?: number;
  svgCode?: string;
}

export interface BedahTemplateProps {
  topic?: string;
  beats?: BeatItem[];
  wordTimings?: WordTiming[];
  audioUrl?: string;
  sfxTracks?: { url: string; startFrame: number }[];
}

export const BedahTemplate: React.FC<BedahTemplateProps> = ({
  topic = "KENAPA FREON AC GAK HABIS",
  beats = [],
  wordTimings = [],
  audioUrl,
  sfxTracks = [],
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Fallback defaults if beats are empty
  const activeBeats = beats.length > 0 ? beats : [
    {
      beat_number: 1,
      text: "Freon AC kamu gak akan pernah berkurang atau habis!",
      visual: "Kompresor AC isometric bersirkulasi tertutup",
      tulisan_layar: "SISTEM TERTUTUP"
    }
  ];

  const totalFrames = durationInFrames || 900;
  const framesPerBeat = Math.floor(totalFrames / activeBeats.length);

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

        const rawWords = (beat.text || '').split(/\s+/).filter(Boolean);
        const relativeWords: WordTiming[] = rawWords.map((w, i, arr) => ({
          word: w,
          start: (i / Math.max(arr.length, 1)) * beatDurationSec,
          end: ((i + 1) / Math.max(arr.length, 1)) * beatDurationSec,
        }));

        return (
          <Sequence
            key={index}
            from={beatStartFrame}
            durationInFrames={beatDuration}
          >
            <BeatScene
              beat={beat}
              topic={topic}
              words={relativeWords}
            />
          </Sequence>
        );
      })}
    </div>
  );
};

const BeatScene: React.FC<{
  beat: BeatItem;
  topic: string;
  words: WordTiming[];
}> = ({ beat, topic, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 }
  });

  // Camera zoom effect constrained to max 1.2x
  const cameraZoom = interpolate(frame, [0, 90], [1.0, 1.08], {
    extrapolateRight: 'clamp'
  });

  return (
    <IsometricRoom title={beat.tulisan_layar} badge={`BEAT 0${beat.beat_number} // ${topic}`}>
      {/* Technical Freon Flow Particles */}
      <FreonParticles count={14} color={beat.beat_number % 2 === 0 ? "#FF3B30" : "#0A84FF"} />

      {/* Center Technical Isometric Rig */}
      <div 
        className="w-[880px] h-[880px] flex items-center justify-center relative"
        style={{
          transform: `scale(${cameraZoom * scale})`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        {beat.svgCode ? (
          <div 
            className="w-full h-full flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: beat.svgCode }} 
          />
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
          <feDropShadow dx="8" dy="8" stdDeviation="0" floodColor="#111111" floodOpacity="0.2" />
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
          <line x1="-30" y1="40" x2="30" y2="-10" stroke="#111111" strokeWidth="3" />
          <rect
            x="30"
            y="-40"
            width="180"
            height="48"
            rx="8"
            fill="#111111"
          />
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
