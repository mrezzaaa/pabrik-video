import { z } from "zod";
import type { SceneVisual } from "./types";
import { clipWords } from "./text";

const str = z.string().trim().min(1);

/** Bentuk yang diminta dari LLM. Longgar di sini, diketatkan oleh cleanVisual. */
export const sceneVisualSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("stat"), label: str }),
  z.object({
    kind: z.literal("compare"),
    left: z.object({ title: str, items: z.array(str).min(1) }),
    right: z.object({ title: str, items: z.array(str).min(1) }),
  }),
  z.object({
    kind: z.literal("stamp"),
    word: z.enum(["MITOS", "FAKTA", "BAHAYA", "AMAN"]),
    caption: z.string().optional().default(""),
  }),
  z.object({
    kind: z.literal("crosssection"),
    title: z.string().optional().default(""),
    layers: z
      .array(z.object({ label: str, note: z.string().optional().default("") }))
      .min(3),
  }),
  z.object({
    kind: z.literal("timeline"),
    steps: z
      .array(z.object({ label: str, detail: z.string().optional().default("") }))
      .min(2),
  }),
]);

const clip = (value: string, max: number) => clipWords(value, max, 6);

/**
 * Validasi + bersihkan visual dari LLM.
 * Guard akurasi: angka apa pun yang tampil harus ada di narasi kalimat itu.
 * Mengembalikan undefined kalau tidak lolos, scene jatuh ke background biasa.
 */
export function cleanVisual(
  raw: unknown,
  narration: string,
  number: { value: number; suffix: string } | null,
): SceneVisual | undefined {
  if (!raw) return undefined;
  const parsed = sceneVisualSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  const v = parsed.data;

  const allowed = new Set(narration.match(/\d+/g) ?? []);
  const ok = (text: string) =>
    (text.match(/\d+/g) ?? []).every((digits) => allowed.has(digits));
  const all = (texts: string[]) => texts.every(ok);

  switch (v.kind) {
    case "stat": {
      // Angka sumber kebenarannya narasi, bukan LLM.
      if (!number) return undefined;
      const label = clip(v.label, 28);
      if (!ok(label)) return undefined;
      return {
        kind: "stat",
        value: number.value,
        prefix: "",
        suffix: number.suffix.trim().slice(0, 10),
        label,
      };
    }
    case "compare": {
      const side = (s: { title: string; items: string[] }) => ({
        title: clip(s.title, 14),
        items: s.items.slice(0, 3).map((item) => clip(item, 22)),
      });
      const left = side(v.left);
      const right = side(v.right);
      if (!all([left.title, right.title, ...left.items, ...right.items])) {
        return undefined;
      }
      return { kind: "compare", left, right };
    }
    case "stamp": {
      const caption = clip(v.caption, 30);
      if (!ok(caption)) return undefined;
      return { kind: "stamp", word: v.word, caption };
    }
    case "crosssection": {
      const layers = v.layers.slice(0, 5).map((layer) => ({
        label: clip(layer.label, 18),
        note: clip(layer.note, 26),
      }));
      const title = clip(v.title, 28);
      if (!all([title, ...layers.flatMap((l) => [l.label, l.note])])) {
        return undefined;
      }
      return { kind: "crosssection", title, layers };
    }
    case "timeline": {
      const steps = v.steps.slice(0, 4).map((step) => ({
        label: clip(step.label, 18),
        detail: clip(step.detail, 28),
      }));
      if (!all(steps.flatMap((s) => [s.label, s.detail]))) return undefined;
      return { kind: "timeline", steps };
    }
  }
}
