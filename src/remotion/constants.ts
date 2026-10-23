/**
 * Video composition constants for Kitabedah style.
 * FINAL FORMAT: 1080x1920, 30fps.
 */
export const VIDEO_FPS = 30;
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;

export const COLORS = {
  bg: "#F2F2F2",
  yellow: "#FFE500",
  green: "#00C950",
  red: "#FF2D2D",
  orange: "#FF8A00",
  black: "#111",
  outline: "#1E293B",
  white: "#FFFFFF",
  card: "#FFFFFF",
  textMuted: "#64748B",
  textDark: "#0F172A",
} as const;

export type ColorKey = keyof typeof COLORS;
