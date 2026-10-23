/**
 * Deterministic Cel-Shading Engine for Isometric Cutaways
 *
 * Konvensi Pencahayaan (Top-Left Sun Lighting):
 * - Top Face (+z): Terang (+12% brightness) - menerima pantulan cahaya langsung dari langit
 * - Left Face (+y): Warna dasar (0% / baseline) - menerima cahaya sekunder
 * - Right Face (+x): Bayangan lembut (-18% brightness) - bidang teduh
 * - Cut Face: Warna penampang hangat (#FB7185 / #FDA4AF) dengan pola arsir diagonal 45°
 *
 * Stroke: #1E293B (Dark Slate), tebal 2.5px, linejoin round.
 */

export type PaletteToken =
  | "shell"
  | "water"
  | "hot"
  | "metal"
  | "accent"
  | "leaf"
  | "purple"
  | "cut";

export type FaceRole = "top" | "left" | "right" | "cut";

export const PALETTE_BASE_COLORS: Record<PaletteToken, string> = {
  shell: "#94A3B8", // Casing luar / enclosure
  water: "#38BDF8", // Cairan / fluida / gelombang
  hot: "#EF4444",   // Energi panas / api / muatan aktif
  metal: "#64748B", // Komponen baja / mekanikal
  accent: "#FACC15", // Kuning emas penanda / chip
  leaf: "#22C55E",  // Hijau alam / bio / ramah lingkungan
  purple: "#A855F7", // Silikon p-type / magnetik
  cut: "#F43F5E",    // Dinding penampang melintang
};

/**
 * Menghitung kecerahan warna HEX secara akurat (RGB scale).
 */
export function adjustBrightness(hex: string, percent: number): string {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export interface FaceShadingStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeLinejoin: "round";
  fillOpacity: number;
  hatchPatternId?: string;
}

/**
 * Menghasilkan warna 3-tone konsisten untuk setiap face primitif
 */
export function getFaceShading(
  token: PaletteToken,
  role: FaceRole,
  material: "solid" | "glass" | "cut" = "solid"
): FaceShadingStyle {
  const base = PALETTE_BASE_COLORS[token] || PALETTE_BASE_COLORS.metal;

  if (role === "cut" || material === "cut") {
    return {
      fill: "#FDA4AF",
      stroke: "#1E293B",
      strokeWidth: 2.5,
      strokeLinejoin: "round",
      fillOpacity: 0.95,
      hatchPatternId: "iso-cut-hatch",
    };
  }

  let fill: string;
  switch (role) {
    case "top":
      fill = adjustBrightness(base, 14); // Lebih terang ~14%
      break;
    case "left":
      fill = base; // Warna dasar
      break;
    case "right":
      fill = adjustBrightness(base, -18); // Lebih gelap ~18%
      break;
    default:
      fill = base;
  }

  const fillOpacity = material === "glass" ? 0.35 : 1.0;

  return {
    fill,
    stroke: "#1E293B",
    strokeWidth: 2.5,
    strokeLinejoin: "round",
    fillOpacity,
  };
}

/**
 * Markup SVG Defs untuk pola arsir penampang potong cutaway
 */
export const ISO_CUTAWAY_DEFS = `
<defs>
  <pattern
    id="iso-cut-hatch"
    width="10"
    height="10"
    patternTransform="rotate(45 0 0)"
    patternUnits="userSpaceOnUse"
  >
    <line
      x1="0"
      y1="0"
      x2="0"
      y2="10"
      stroke="#1E293B"
      stroke-width="2"
      opacity="0.35"
    />
  </pattern>
</defs>
`;
