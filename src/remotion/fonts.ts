import { loadFont } from "@remotion/google-fonts/Anton";

export const anton = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin", "latin-ext"],
});

export const ANTON_FAMILY = `${anton.fontFamily}, Impact, "Arial Black", sans-serif`;
