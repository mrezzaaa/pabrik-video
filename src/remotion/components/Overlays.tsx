import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ANTON_FAMILY } from "../fonts";

/**
 * Clean top bar: only a progress bar and a minimal topic pill.
 * No transcript, no FPS/resolution/timecode telemetry, no emojis.
 */
export const TopBar: React.FC<{ topic: string; accent: string }> = ({
  topic,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = Math.min(1, frame / Math.max(1, durationInFrames));

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 50 }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 10,
          backgroundColor: "rgba(255,255,255,0.12)",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            backgroundColor: accent,
            boxShadow: `0 0 20px ${accent}`,
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 58,
          left: 54,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 18px 8px 10px",
          borderRadius: 999,
          background: "rgba(5,8,14,0.62)",
          border: "2px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(8px)",
          maxWidth: 760,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            backgroundColor: accent,
            color: "#050505",
            fontFamily: ANTON_FAMILY,
            fontSize: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-6deg)",
          }}
        >
          PV
        </div>
        <div
          style={{
            fontFamily: "ui-monospace, Menlo, monospace",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 3,
            color: "rgba(255,255,255,0.88)",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {topic}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Kata terpanjang (atau yang berangka) diberi warna aksen sebagai titik fokus hook. */
function focusWordIndex(words: string[]): number {
  const numeric = words.findIndex((word) => /\d/.test(word));
  if (numeric !== -1) return numeric;
  let best = 0;
  words.forEach((word, index) => {
    if (word.length > words[best].length) best = index;
  });
  return best;
}

/**
 * Hook 3 detik pertama: judul bersih yang muncul kata demi kata (fade + naik + blur hilang),
 * garis aksen yang tergambar, lalu memudar halus. Tanpa strobe, tanpa kilatan warna.
 * Teks di sini adalah judul hook (2-6 kata) yang SENGAJA berbeda dari kalimat yang diucapkan,
 * karena caption bawah sudah menampilkan ucapan.
 * Dipasang di dalam <Sequence> sepanjang durasi hook.
 */
export const HookCard: React.FC<{
  text: string;
  kicker?: string;
  accent: string;
}> = ({ text, kicker, accent }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const words = text.trim().split(/\s+/).filter(Boolean);
  const focus = focusWordIndex(words);

  const exitStart = Math.max(10, durationInFrames - 12);
  const exit = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });
  const lift = interpolate(frame, [exitStart, durationInFrames], [0, -14], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scrim = interpolate(frame, [0, 10, exitStart, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const kickerIn = interpolate(frame, [2, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const barIn = interpolate(frame, [8 + words.length * 3, 24 + words.length * 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 46 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: scrim,
          background:
            "linear-gradient(180deg, rgba(5,8,14,0.82) 0%, rgba(5,8,14,0.55) 34%, rgba(5,8,14,0) 62%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 250,
          left: 70,
          right: 70,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: exit,
          transform: `translateY(${lift}px)`,
        }}
      >
        {kicker ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 26,
              opacity: kickerIn,
              transform: `translateY(${(1 - kickerIn) * 10}px)`,
            }}
          >
            <div style={{ width: 44, height: 3, borderRadius: 2, backgroundColor: accent }} />
            <div
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: 8,
                color: accent,
                textTransform: "uppercase",
              }}
            >
              {kicker}
            </div>
            <div style={{ width: 44, height: 3, borderRadius: 2, backgroundColor: accent }} />
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: 26,
            rowGap: 6,
            maxWidth: 940,
            textAlign: "center",
          }}
        >
          {words.map((word, index) => {
            const progress = spring({
              frame: frame - (4 + index * 3),
              fps,
              config: { damping: 200, mass: 0.6, stiffness: 120 },
            });
            return (
              <span
                key={`${word}-${index}`}
                style={{
                  fontFamily: ANTON_FAMILY,
                  fontSize: 112,
                  lineHeight: 1.06,
                  textTransform: "uppercase",
                  color: index === focus ? accent : "#FFFFFF",
                  opacity: progress,
                  transform: `translateY(${(1 - progress) * 30}px)`,
                  filter: `blur(${(1 - progress) * 14}px)`,
                  textShadow: "0 6px 28px rgba(0,0,0,0.55)",
                  display: "inline-block",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 30,
            height: 8,
            width: 360,
            borderRadius: 4,
            backgroundColor: accent,
            boxShadow: `0 0 24px ${accent}88`,
            transformOrigin: "center",
            transform: `scaleX(${barIn})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/** Pembuka halus: 8 frame pertama memudar dari gelap ke visual. Tidak ada kilatan warna atau logo. */
export const SoftOpen: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame > 8) return null;
  const opacity = interpolate(frame, [0, 8], [0.85, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  return (
    <AbsoluteFill
      style={{ zIndex: 100, pointerEvents: "none", backgroundColor: "#050505", opacity }}
    />
  );
};
